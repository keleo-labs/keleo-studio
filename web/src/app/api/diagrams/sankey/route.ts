import { NextResponse } from "next/server";
import {
  buildLibraryLookupIndex,
  resolveDocumentWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { extractSankeyFlowData, calculateFlowStats } from "@/lib/diagrams/sankey/data";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";
import { getJsonDocumentStore } from "@/lib/storage";

/**
 * POST /api/diagrams/sankey
 *
 * Generate Sankey diagram data for a practice or method.
 * Returns pre-computed nodes, links, and statistics.
 *
 * Request body:
 * {
 *   documentId: string,
 *   resolveLibrary?: boolean  // Default: true
 * }
 *
 * Response:
 * {
 *   nodes: Array<{ id, name, category, description?, parentName?, assetNames? }>,
 *   links: Array<{ source, target, value }>,
 *   statistics: {
 *     totalFlow: number,
 *     activityCount: number,
 *     workProductCount: number,
 *     alphaStateCount: number,
 *     linkCount: number
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
    const cacheKey = serverCache.getCacheKey(documentId, {
      type: 'sankey',
      resolveLibrary
    });
    const cached = serverCache.get<any>(cacheKey, CACHE_TTL.VISUALIZATION);

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
      resolvedDoc = resolveDocumentWithLibraryIndex(doc, index);
    }

    // Extract Sankey flow data
    const flowData = extractSankeyFlowData(resolvedDoc);
    const statistics = calculateFlowStats(flowData);

    const response = {
      nodes: flowData.nodes,
      links: flowData.links,
      statistics,
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
    const message = e instanceof Error ? e.message : "Sankey data extraction failed";
    console.error("Sankey diagram error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
