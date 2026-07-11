import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import {
  buildLibraryLookupIndex,
  resolveDocumentWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * POST /api/library/batch-resolve
 *
 * Batch resolve multiple practice/method IDs in single request.
 * Optimizes library loading (loads library index once, not per document).
 *
 * Request body:
 * {
 *   documentIds: string[],
 *   resolveLibrary?: boolean  // Default: true
 * }
 *
 * Response:
 * {
 *   documents: Array<{
 *     id: string,
 *     resolved: any,          // Resolved/merged practice
 *     original: any,          // Original document body
 *     error?: string          // Error message if resolution failed
 *   }>,
 *   metadata: {
 *     successCount: number,
 *     errorCount: number,
 *     cached: boolean
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

  const { documentIds, resolveLibrary = true } = body as {
    documentIds?: string[];
    resolveLibrary?: boolean;
  };

  if (!Array.isArray(documentIds)) {
    return NextResponse.json(
      { error: "documentIds must be an array" },
      { status: 400 }
    );
  }

  if (documentIds.length === 0) {
    return NextResponse.json(
      { error: "documentIds array is empty" },
      { status: 400 }
    );
  }

  if (documentIds.length > 100) {
    return NextResponse.json(
      { error: "Maximum 100 documents per batch request" },
      { status: 400 }
    );
  }

  try {
    // Check cache
    const sortedIds = [...documentIds].sort();
    const cacheKey = serverCache.getCacheKey("batch-resolve", {
      ids: sortedIds.join(","),
      resolveLibrary
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

    // Load library index once for all resolutions
    let index: any = null;
    if (resolveLibrary) {
      const bodies = await loadAllLibraryDocumentBodies();
      index = buildLibraryLookupIndex(bodies);
    }

    // Resolve each document
    const documents: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const id of documentIds) {
      try {
        // Fetch document
        const docRecord = await store.get(id);

        if (!docRecord) {
          documents.push({
            id,
            error: "Document not found"
          });
          errorCount++;
          continue;
        }

        let doc = docRecord.body;
        if (!doc || typeof doc !== "object") {
          documents.push({
            id,
            original: doc,
            error: "Invalid document body"
          });
          errorCount++;
          continue;
        }

        // Normalize
        doc = normalizePracticeBody(doc);
        const original = doc;

        // Resolve with library if requested
        let resolved = doc;
        if (resolveLibrary && index) {
          resolved = resolveDocumentWithLibraryIndex(doc, index);
        }

        documents.push({
          id,
          original,
          resolved
        });
        successCount++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Resolution failed";
        documents.push({
          id,
          error: message
        });
        errorCount++;
      }
    }

    const response = {
      documents,
      metadata: {
        successCount,
        errorCount,
        cached: false
      }
    };

    // Only cache if all resolutions succeeded
    if (errorCount === 0) {
      serverCache.set(cacheKey, response);
    }

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Batch resolution failed";
    console.error("Batch resolve error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
