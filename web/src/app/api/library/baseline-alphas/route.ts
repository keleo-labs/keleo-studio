import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { asBaselineDocument } from "@/lib/ir";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * GET /api/library/baseline-alphas
 *
 * Get just the alpha names from a baseline practice by name.
 * Useful for validation and dropdowns without fetching entire baseline.
 *
 * Query parameters:
 * - name: string (required) - Baseline practice name
 *
 * Response:
 * {
 *   baselineName: string,
 *   alphaNames: string[],
 *   metadata: {
 *     baselineId: string,
 *     cached: boolean
 *   }
 * }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baselineName = url.searchParams.get("name");

  if (!baselineName) {
    return NextResponse.json(
      { error: "Missing 'name' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Check cache
    const cacheKey = serverCache.getCacheKey(baselineName, { type: 'baseline-alphas' });
    const cached = serverCache.get<any>(cacheKey, CACHE_TTL.LIBRARY_INDEX);

    if (cached) {
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
        }
      });
    }

    // Find baseline by name
    const store = await getJsonDocumentStore();
    const allDocsResponse = await store.list();
    const allDocs = await store.list();

    const trimmed = baselineName.trim();
    const candidates = allDocs.filter(doc => {
      if (!doc.body || typeof doc.body !== "object") return false;
      const bodyObj = doc.body as Record<string, unknown>;
      const docName = String(bodyObj.name ?? "").trim();
      const kind = bodyObj.kind;
      return (kind === "baselinePractice" || kind === "baseline") && docName === trimmed;
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: `Baseline "${baselineName}" not found` },
        { status: 404 }
      );
    }

    // If multiple matches, prefer most recent
    if (candidates.length > 1) {
      candidates.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || "";
        const bTime = b.updatedAt || b.createdAt || "";
        return String(bTime).localeCompare(String(aTime));
      });
    }

    const baselineDoc = candidates[0]!;
    let doc = baselineDoc.body;

    if (!doc || typeof doc !== "object") {
      return NextResponse.json(
        { error: "Invalid baseline document body" },
        { status: 400 }
      );
    }

    // Normalize and extract alphas
    doc = normalizePracticeBody(doc);
    const baseline = asBaselineDocument(doc);
    const alphas = Array.isArray(baseline.alphas) ? baseline.alphas : [];
    const alphaNames = alphas.map((alpha: any) => String(alpha.name ?? "")).filter(Boolean);

    const response = {
      baselineName: trimmed,
      alphaNames,
      metadata: {
        baselineId: baselineDoc.id,
        cached: false
      }
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch baseline alphas";
    console.error("Baseline alphas fetch error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
