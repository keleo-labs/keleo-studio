import { NextResponse } from "next/server";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
} from "@/lib/ir";
import {
  buildLibraryLookupIndex,
  practiceNeedsLibraryResolution,
  methodNeedsLibraryResolution,
  resolvePracticeWithLibraryIndex,
  resolveMethodWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";
import type { Method } from "@/lib/types";

type Ctx = { params: Promise<{ libraryId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { libraryId } = await ctx.params;

    // Load the document from the library
    const store = await getJsonDocumentStore();
    const doc = await store.get(libraryId);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { title, body } = doc;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Document has no valid body" },
        { status: 404 }
      );
    }

    const rootKind = classifyLibraryRoot(body);

    // Determine if we need to merge with library dependencies
    const needsLibraryMerge =
      (rootKind === "practice" && practiceNeedsLibraryResolution(body)) ||
      (rootKind === "method" && methodNeedsLibraryResolution(body));

    let mergedDoc: unknown = body;
    let methodComposition: Method | null = null;

    if (needsLibraryMerge) {
      // Load all library documents for resolution
      const bodies = await loadAllLibraryDocumentBodies();
      const index = buildLibraryLookupIndex(bodies);

      // Resolve dependencies based on document type
      if (rootKind === "method") {
        // For methods, save the original method structure before resolution
        // resolveMethodWithLibraryIndex returns a composite practice, not a method
        methodComposition = body as Method;
        mergedDoc = resolveMethodWithLibraryIndex(body, index);
      } else {
        mergedDoc = resolvePracticeWithLibraryIndex(body, index);
      }
    } else if (rootKind === "method") {
      // Method that doesn't need library merge - still save it and create composite
      methodComposition = body as Method;
      try {
        mergedDoc = compositePracticeFromMethod(body as Method);
      } catch (compositeError) {
        console.warn("Failed to create composite practice from method:", compositeError);
        mergedDoc = (body as Method).baselinePractice ?? body;
      }
    }

    return NextResponse.json({
      title,
      original: body,
      merged: mergedDoc,
      metadata: {
        kind: rootKind,
        needsLibraryMerge,
        methodComposition,
      },
    });
  } catch (error) {
    console.error("Error in library browse API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load document" },
      { status: 500 }
    );
  }
}
