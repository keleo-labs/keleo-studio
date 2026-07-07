import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import type { Practice, PracticeBaseline } from "@/lib/types";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * POST /api/method-builder/compose
 *
 * Batch compose a method from baseline + practice names.
 * Replaces N+1 sequential client-side API calls with single server query.
 *
 * Request body:
 * {
 *   baselineName: string,           // Baseline practice name to lookup
 *   practiceNames?: string[],       // Extension practice names to lookup
 *   includeMetadata?: boolean       // Include document metadata (default: false)
 * }
 *
 * Response:
 * {
 *   baseline: {
 *     libraryId: string,
 *     body: PracticeBaseline,
 *     metadata?: { id, title, kind, createdAt, updatedAt }
 *   },
 *   practices: Array<{
 *     libraryId: string,
 *     name: string,
 *     body: Practice,
 *     metadata?: { id, title, kind, createdAt, updatedAt }
 *   }>,
 *   validation: {
 *     valid: boolean,
 *     errors: string[]
 *   },
 *   metadata: {
 *     cached: boolean,
 *     cachedAt?: string
 *   }
 * }
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const {
    baselineName,
    practiceNames = [],
    includeMetadata = false
  } = body as {
    baselineName?: string;
    practiceNames?: string[];
    includeMetadata?: boolean;
  };

  if (!baselineName || typeof baselineName !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid baselineName" },
      { status: 400 }
    );
  }

  if (!Array.isArray(practiceNames)) {
    return NextResponse.json(
      { error: "practiceNames must be an array" },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cacheKey = serverCache.getCacheKey(baselineName, {
      type: 'method-compose',
      practiceNames: practiceNames.sort(), // Sort for cache consistency
      includeMetadata
    });
    const cached = serverCache.get<any>(cacheKey, CACHE_TTL.RESOLVED);

    if (cached) {
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
        }
      });
    }

    const store = await getJsonDocumentStore();
    const errors: string[] = [];

    // Fetch all library document metadata
    const allMetas = await store.list();

    // Fetch full documents as needed
    const fullDocsCache = new Map<string, any>();
    async function getFullDoc(id: string) {
      if (!fullDocsCache.has(id)) {
        const doc = await store.get(id);
        fullDocsCache.set(id, doc);
      }
      return fullDocsCache.get(id);
    }

    // Helper to find baseline by name
    async function findBaselineByName(name: string) {
      const trimmed = name.trim();
      const candidates: any[] = [];

      for (const meta of allMetas) {
        const doc = await getFullDoc(meta.id);
        if (!doc || !doc.body || typeof doc.body !== "object") continue;

        const bodyObj = doc.body as Record<string, unknown>;
        const docName = String(bodyObj.name ?? "").trim();
        const kind = bodyObj.kind;

        if ((kind === "baselinePractice" || kind === "baseline") && docName === trimmed) {
          candidates.push(doc);
        }
      }

      if (candidates.length === 0) return null;

      // If multiple matches, prefer most recent
      if (candidates.length > 1) {
        candidates.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || "";
          const bTime = b.updatedAt || b.createdAt || "";
          return String(bTime).localeCompare(String(aTime));
        });
      }

      return candidates[0];
    }

    // Helper to find practice by name
    async function findPracticeByName(name: string) {
      const trimmed = name.trim();
      const candidates: any[] = [];

      for (const meta of allMetas) {
        const doc = await getFullDoc(meta.id);
        if (!doc || !doc.body || typeof doc.body !== "object") continue;

        const bodyObj = doc.body as Record<string, unknown>;
        const docName = String(bodyObj.name ?? "").trim();
        const kind = bodyObj.kind;

        if (kind === "practice" && docName === trimmed) {
          candidates.push(doc);
        }
      }

      if (candidates.length === 0) return null;

      // If multiple matches, prefer most recent
      if (candidates.length > 1) {
        candidates.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || "";
          const bTime = b.updatedAt || b.createdAt || "";
          return String(bTime).localeCompare(String(aTime));
        });
      }

      return candidates[0];
    }

    // Find baseline
    const baselineDoc = await findBaselineByName(baselineName);
    if (!baselineDoc) {
      return NextResponse.json(
        {
          validation: {
            valid: false,
            errors: [`Baseline "${baselineName}" not found in library`]
          }
        },
        { status: 404 }
      );
    }

    // Normalize baseline body
    const baselineBody = normalizePracticeBody(baselineDoc.body);

    // Find all practices
    const practices: Array<{
      libraryId: string;
      name: string;
      body: Practice;
      metadata?: any;
    }> = [];

    for (const practiceName of practiceNames) {
      const trimmed = practiceName.trim();
      if (!trimmed) {
        errors.push(`Empty practice name in practiceNames array`);
        continue;
      }

      const practiceDoc = await findPracticeByName(trimmed);
      if (!practiceDoc) {
        errors.push(`Extension practice "${trimmed}" not found in library`);
        continue;
      }

      // Normalize practice body
      const practiceBody = normalizePracticeBody(practiceDoc.body);

      // Validate that practice has the expected structure
      if (typeof practiceBody !== "object" || !practiceBody) {
        errors.push(`Practice "${trimmed}" has invalid body`);
        continue;
      }

      const practiceEntry: any = {
        libraryId: practiceDoc.id,
        name: trimmed,
        body: practiceBody as Practice,
      };

      if (includeMetadata) {
        practiceEntry.metadata = {
          id: practiceDoc.id,
          title: practiceDoc.title,
          kind: practiceDoc.kind,
          createdAt: practiceDoc.createdAt,
          updatedAt: practiceDoc.updatedAt
        };
      }

      practices.push(practiceEntry);
    }

    const response = {
      baseline: {
        libraryId: baselineDoc.id,
        body: baselineBody as PracticeBaseline,
        ...(includeMetadata ? {
          metadata: {
            id: baselineDoc.id,
            title: baselineDoc.title,
            kind: baselineDoc.kind,
            createdAt: baselineDoc.createdAt,
            updatedAt: baselineDoc.updatedAt
          }
        } : {})
      },
      practices,
      validation: {
        valid: errors.length === 0,
        errors
      },
      metadata: {
        cached: false,
        cachedAt: new Date().toISOString()
      }
    };

    // Only cache if valid (no errors)
    if (errors.length === 0) {
      serverCache.set(cacheKey, response);
    }

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Method composition failed";
    console.error("Method builder compose error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
