import { NextResponse } from "next/server";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * GET /api/library/practices/by-tags
 *
 * Filter library by tags without fetching all document bodies.
 * Returns metadata only.
 *
 * Query parameters:
 * - tags: comma-separated tag values (e.g., "agile,testing")
 * - kind: filter by kind ("practice" | "method" | "baseline")
 * - matchMode: "any" (OR) or "all" (AND) - default: "any"
 *
 * Response:
 * {
 *   practices: Array<{
 *     id: string,
 *     title: string,
 *     kind: string,
 *     tags: Record<string, string[]>,
 *     baselineName?: string,
 *     createdAt?: string,
 *     updatedAt?: string
 *   }>,
 *   metadata: {
 *     matchCount: number,
 *     cached: boolean
 *   }
 * }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tagsParam = url.searchParams.get("tags");
  const kindFilter = url.searchParams.get("kind");
  const matchMode = url.searchParams.get("matchMode") || "any";

  if (!tagsParam) {
    return NextResponse.json(
      { error: "Missing 'tags' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Check cache
    const cacheKey = serverCache.getCacheKey("library-by-tags", {
      tags: tagsParam,
      kind: kindFilter,
      matchMode
    });
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

    // Load all library documents with bodies
    const allDocs = await loadAllLibraryDocumentBodies();

    // Parse tag filter
    const filterTags = tagsParam.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);

    // Helper to check if document matches tag filter
    function matchesTags(doc: any): boolean {
      if (!doc || !doc.body || typeof doc.body !== "object") return false;

      const bodyObj = doc.body as Record<string, unknown>;
      const tags = bodyObj.tags;

      if (!tags || typeof tags !== "object" || Array.isArray(tags)) return false;

      // Extract all tag values from all buckets
      const docTagValues: string[] = [];
      Object.values(tags as Record<string, unknown>).forEach(bucketValue => {
        if (Array.isArray(bucketValue)) {
          docTagValues.push(...bucketValue.map(v => String(v).trim().toLowerCase()));
        }
      });

      // Match mode: "any" (OR) or "all" (AND)
      if (matchMode === "all") {
        return filterTags.every(filterTag => docTagValues.includes(filterTag));
      } else {
        return filterTags.some(filterTag => docTagValues.includes(filterTag));
      }
    }

    // Filter documents
    let filtered = allDocs.filter(doc => {
      // Kind filter
      if (kindFilter && doc.kind !== kindFilter) {
        return false;
      }

      // Tag filter
      return matchesTags(doc);
    });

    // Transform to metadata-only format
    const practices = filtered.map(doc => {
      const bodyObj = doc.body as Record<string, unknown>;
      const result: any = {
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        tags: bodyObj.tags || {},
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };

      // Extract baseline name if practice
      if (doc.kind === "practice") {
        const baselineName = bodyObj.baselinePracticeName;
        if (typeof baselineName === "string") {
          result.baselineName = baselineName;
        }
      }

      return result;
    });

    const response = {
      practices,
      metadata: {
        matchCount: practices.length,
        cached: false
      }
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to filter by tags";
    console.error("Filter by tags error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
