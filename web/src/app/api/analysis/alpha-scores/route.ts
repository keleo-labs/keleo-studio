import { NextResponse } from "next/server";
import {
  buildLibraryLookupIndex,
  resolvePracticeWithLibraryIndex,
  resolveMethodWithLibraryIndex,
  methodNeedsLibraryResolution,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { calculateAlphaScores } from "@/lib/analysis/methodFocus";
import { groupByFocus, asBaselineDocument } from "@/lib/ir";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";
import { getJsonDocumentStore } from "@/lib/storage";

/**
 * POST /api/analysis/alpha-scores
 *
 * Calculate alpha coverage scores for a practice or method.
 * Returns pre-calculated scores grouped by focus.
 *
 * Request body:
 * {
 *   documentId: string,
 *   resolveLibrary?: boolean  // Default: true
 * }
 *
 * Response:
 * {
 *   scoresByFocus: {
 *     [focusName: string]: {
 *       focusObj: any,
 *       alphas: Array<{
 *         alpha: any,
 *         focusName: string,
 *         score: number,
 *         newAlphas?: Array<{ alpha: any, score: number }>
 *       }>
 *     }
 *   },
 *   metadata: {
 *     documentId: string,
 *     resolved: boolean,
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

  const { documentId, resolveLibrary = true } = body as {
    documentId?: string;
    resolveLibrary?: boolean;
  };

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid documentId" },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cacheKey = serverCache.getCacheKey(documentId, { resolveLibrary });
    const cached = serverCache.get<any>(cacheKey, CACHE_TTL.SCORING);

    if (cached) {
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
        }
      });
    }

    // Fetch document
    const store = await getJsonDocumentStore();
    const docRecord = await store.get(documentId);

    if (!docRecord) {
      return NextResponse.json(
        { error: `Document ${documentId} not found` },
        { status: 404 }
      );
    }

    let doc = docRecord.body;
    if (!doc || typeof doc !== "object") {
      return NextResponse.json(
        { error: "Invalid document body" },
        { status: 400 }
      );
    }

    // Normalize practice body
    doc = normalizePracticeBody(doc);

    // Resolve with library if requested
    let resolvedDoc = doc;
    if (resolveLibrary) {
      const bodies = await loadAllLibraryDocumentBodies();
      const index = buildLibraryLookupIndex(bodies);
      const rootKind = classifyLibraryRoot(doc);

      if (rootKind === "method" && methodNeedsLibraryResolution(doc)) {
        resolvedDoc = resolveMethodWithLibraryIndex(doc, index);
      } else {
        resolvedDoc = resolvePracticeWithLibraryIndex(doc, index);
      }
    }

    // Extract baseline and group by focus
    const baseline = asBaselineDocument(resolvedDoc);
    const grouped = groupByFocus(baseline);

    // Calculate alpha scores
    const alphaScoresMap = calculateAlphaScores(doc, baseline, grouped);

    // Convert Map to plain object for JSON serialization
    const scoresByFocus: Record<string, any> = {};
    alphaScoresMap.forEach((value, key) => {
      scoresByFocus[key] = value;
    });

    const response = {
      scoresByFocus,
      metadata: {
        documentId,
        resolved: resolveLibrary,
        cached: false,
        cachedAt: new Date().toISOString()
      }
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Alpha score calculation failed";
    console.error("Alpha scores error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
