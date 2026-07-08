import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import {
  buildLibraryLookupIndex,
  resolvePracticeWithLibraryIndex,
  resolveMethodWithLibraryIndex,
  methodNeedsLibraryResolution,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { asBaselineDocument } from "@/lib/ir";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * GET /api/documents/:id/alphas
 *
 * Return just the alphas from a practice/method, optionally resolved with library.
 *
 * Query parameters:
 * - resolve: boolean (default: true) - Whether to resolve with library dependencies
 *
 * Response:
 * {
 *   alphas: Array<{
 *     name: string,
 *     description?: string,
 *     focusName?: string,
 *     contributesTo?: string,
 *     stateCount: number,
 *     states?: Array<{ name, description, checklist }>
 *   }>,
 *   metadata: {
 *     documentId: string,
 *     resolved: boolean,
 *     cached: boolean
 *   }
 * }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Missing document ID" },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const resolve = url.searchParams.get("resolve") !== "false";

    // Check cache
    const cacheKey = serverCache.getCacheKey(id, { type: 'alphas', resolve });
    const cached = serverCache.get<any>(cacheKey, CACHE_TTL.METADATA);

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
    const docRecord = await store.get(id);

    if (!docRecord) {
      return NextResponse.json(
        { error: `Document ${id} not found` },
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

    // Normalize
    doc = normalizePracticeBody(doc);

    // Resolve with library if requested
    let resolvedDoc = doc;
    if (resolve) {
      const bodies = await loadAllLibraryDocumentBodies();
      const index = buildLibraryLookupIndex(bodies);
      const rootKind = classifyLibraryRoot(doc);

      if (rootKind === "method" && methodNeedsLibraryResolution(doc)) {
        resolvedDoc = resolveMethodWithLibraryIndex(doc, index);
      } else {
        resolvedDoc = resolvePracticeWithLibraryIndex(doc, index);
      }
    }

    // Extract baseline and get alphas
    const baseline = asBaselineDocument(resolvedDoc);
    if (!baseline) {
      return NextResponse.json(
        { error: "Failed to extract baseline from resolved document" },
        { status: 400 }
      );
    }
    const alphas = Array.isArray(baseline.alphas) ? baseline.alphas : [];

    // Transform to simplified format
    const simplifiedAlphas = alphas.map((alpha: any) => ({
      name: alpha.name,
      description: alpha.description,
      focusName: alpha.focusName,
      contributesTo: alpha.contributesTo,
      stateCount: Array.isArray(alpha.states) ? alpha.states.length : 0,
      ...(Array.isArray(alpha.states) ? {
        states: alpha.states.map((state: any) => ({
          name: state.name,
          description: state.description,
          checklist: state.checklist
        }))
      } : {})
    }));

    const response = {
      alphas: simplifiedAlphas,
      metadata: {
        documentId: id,
        resolved: resolve,
        cached: false
      }
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch alphas";
    console.error("Alphas fetch error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
