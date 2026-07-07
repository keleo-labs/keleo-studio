import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * GET /api/documents/:id/metadata
 *
 * Return enriched metadata without document body.
 * Useful for document lists and previews.
 *
 * Response:
 * {
 *   id: string,
 *   title: string,
 *   kind: string,
 *   libraryRootKind: string,
 *   displayName: string,
 *   virtualFileCount?: number,
 *   baselineName?: string,
 *   practiceDependencies?: string[],
 *   tags?: Record<string, string[]>,
 *   createdAt?: string,
 *   updatedAt?: string,
 *   metadata: {
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
    // Check cache
    const cacheKey = serverCache.getCacheKey(id, { type: 'metadata' });
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

    const body = docRecord.body;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid document body" },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    // Classify library root kind
    const libraryRootKind = classifyLibraryRoot(body);

    // Extract enriched metadata
    const response: any = {
      id: docRecord.id,
      title: docRecord.title,
      kind: docRecord.kind,
      libraryRootKind,
      displayName: String(bodyObj.name ?? docRecord.title),
      createdAt: docRecord.createdAt,
      updatedAt: docRecord.updatedAt,
    };

    // Count virtual files (arrays of named elements)
    let virtualFileCount = 0;
    const countableArrays = [
      "alphas", "activitySpaces", "competencies", "workProducts",
      "patterns", "personaGroups", "narratives"
    ];
    for (const key of countableArrays) {
      if (Array.isArray(bodyObj[key])) {
        virtualFileCount += (bodyObj[key] as unknown[]).length;
      }
    }
    if (virtualFileCount > 0) {
      response.virtualFileCount = virtualFileCount;
    }

    // Extract baseline name for practices
    if (libraryRootKind === "practice") {
      const baselineName = bodyObj.baselinePracticeName;
      if (typeof baselineName === "string") {
        response.baselineName = baselineName;
      }
    }

    // Extract practice dependencies
    const practiceDependencies = bodyObj.practiceDependencyNames;
    if (Array.isArray(practiceDependencies) && practiceDependencies.length > 0) {
      response.practiceDependencies = practiceDependencies.map(d => String(d));
    }

    // Extract tags
    const tags = bodyObj.tags;
    if (tags && typeof tags === "object" && !Array.isArray(tags)) {
      response.tags = tags;
    }

    response.metadata = {
      cached: false
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch metadata";
    console.error("Metadata fetch error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
