import { NextResponse } from "next/server";
import {
  buildLibraryLookupIndex,
  collectBrowseDependencyArtifacts,
  resolveDocumentWithLibraryIndex,
  methodNeedsLibraryResolution,
  baselineNeedsLibraryResolution,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { checkSchemaCompatibility } from "@/lib/core/schemaVersion";
import { collectDependencyVersionWarnings } from "@/lib/library/dependencyVersionCheck";
import { buildDependencyTree, computeDependencyLayout } from "@/lib/diagrams/dependencyTree";

/**
 * POST JSON `{ doc }` — for Practice documents with `baselinePracticeName` and/or `practiceDependencyNames`,
 * or Method documents with `baselinePracticeName` or practices with `practiceNames`,
 * merges matching baseline practice (head of hierarchy), dependency practices (`practiceDependencyNames` order),
 * then the document itself ({@link resolvePracticeWithLibraryIndex} → {@link compositePracticeFromMethod}),
 * respecting baseline-first rules for identical practice elements (including immutability of `description` on earlier layers).
 * Same-named practice elements (alphas, activity spaces and nested activities, etc.) are merged **additively** into
 * the baseline row (`description` stays from the baseline; other fields accumulate per composite rules). Output is then
 * pruned to elements referenced by `doc` for documentation-sized output.
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
  let doc = (body as Record<string, unknown>).doc;
  if (!doc || typeof doc !== "object") {
    return NextResponse.json({ error: "Missing doc" }, { status: 400 });
  }

  // Normalize practice bodies to ensure all expected arrays exist
  doc = normalizePracticeBody(doc);

  try {
    const bodies = await loadAllLibraryDocumentBodies();
    const index = buildLibraryLookupIndex(bodies);
    const rootKind = classifyLibraryRoot(doc);

    const docObj = doc as Record<string, unknown>;
    const schemaCheck = checkSchemaCompatibility(docObj.schemaVersion as string | undefined);
    const versionWarnings = collectDependencyVersionWarnings(doc, index);
    const depTree = buildDependencyTree(docObj, index);
    const dependencyDiagramLayout = computeDependencyLayout(depTree);

    if (rootKind === "method" && methodNeedsLibraryResolution(doc)) {
      const resolved = resolveDocumentWithLibraryIndex(doc, index);
      return NextResponse.json({
        resolved,
        dependencyArtifacts: [],
        versionWarnings,
        schemaWarning: schemaCheck.warning,
        dependencyDiagramLayout,
      });
    }

    const dependencyArtifacts = collectBrowseDependencyArtifacts(doc, index);
    const resolved = resolveDocumentWithLibraryIndex(doc, index);
    return NextResponse.json({
      resolved,
      dependencyArtifacts,
      versionWarnings,
      schemaWarning: schemaCheck.warning,
      dependencyDiagramLayout,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Resolution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
