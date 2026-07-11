import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage";
import { asBaselineDocument } from "@/lib/ir";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";

/**
 * GET /api/baselines/:baselineId/narrative-types
 *
 * Returns narrative type names and their narrative elements from a baseline practice.
 * Used to populate dropdowns in the method builder narratives editor.
 *
 * Response:
 * {
 *   narrativeTypes: Array<{
 *     name: string,
 *     narrativeElements: Array<{ name: string, description?: string }>
 *   }>,
 *   metadata: {
 *     baselineId: string,
 *     cached: boolean
 *   }
 * }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ baselineId: string }> }
) {
  const { baselineId } = await params;

  if (!baselineId || typeof baselineId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid baselineId" },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cacheKey = serverCache.getCacheKey(baselineId, {
      type: 'narrative-types'
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

    // Fetch baseline document
    const store = await getJsonDocumentStore();
    const docRecord = await store.get(baselineId);

    if (!docRecord) {
      return NextResponse.json(
        { error: `Baseline ${baselineId} not found` },
        { status: 404 }
      );
    }

    const doc = docRecord.body;
    if (!doc || typeof doc !== "object") {
      return NextResponse.json(
        { error: "Invalid document body" },
        { status: 400 }
      );
    }

    // Extract baseline
    const baseline = asBaselineDocument(doc);
    if (!baseline) {
      return NextResponse.json(
        { error: "Document is not a valid baseline practice" },
        { status: 400 }
      );
    }

    // Extract narrative types with their narrative elements
    const narrativeTypes = (baseline.narrativeTypes || []).map(nt => ({
      name: nt.name || '',
      narrativeElements: (nt.narrativeElements || []).map(el => ({
        name: el.name || '',
        description: el.description
      }))
    }));

    const response = {
      narrativeTypes,
      metadata: {
        baselineId,
        cached: false
      }
    };

    // Cache the result
    serverCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch narrative types";
    console.error("Narrative types fetch error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
