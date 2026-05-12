import { NextResponse } from "next/server";
import {
  buildLibraryLookupIndex,
  collectBrowseDependencyArtifacts,
  resolvePracticeWithLibraryIndex,
  resolveMethodWithLibraryIndex,
  methodNeedsLibraryResolution,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { classifyLibraryRoot } from "@/lib/library/classify";

function normalizePracticeDoc(doc: unknown): unknown {
  if (!doc || typeof doc !== "object") return doc;
  const o = doc as Record<string, unknown>;

  const isPractice = typeof o.baselinePracticeName === "string" || Array.isArray(o.practiceDependencyNames);
  if (!isPractice) {
    if (Array.isArray(o.practices)) {
      return {
        ...o,
        practices: o.practices.map((p) => normalizePracticeDoc(p)),
      };
    }
    return doc;
  }

  return {
    ...o,
    alphas: Array.isArray(o.alphas) ? o.alphas : [],
    activitySpaces: Array.isArray(o.activitySpaces) ? o.activitySpaces : [],
    activities: Array.isArray(o.activities) ? o.activities : [],
    workProducts: Array.isArray(o.workProducts) ? o.workProducts : [],
    personas: Array.isArray(o.personas) ? o.personas : [],
    personaGroups: Array.isArray(o.personaGroups) ? o.personaGroups : [],
  };
}

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
  doc = normalizePracticeDoc(doc);

  try {
    const bodies = await loadAllLibraryDocumentBodies();
    const index = buildLibraryLookupIndex(bodies);
    const rootKind = classifyLibraryRoot(doc);

    if (rootKind === "method" && methodNeedsLibraryResolution(doc)) {
      const resolved = resolveMethodWithLibraryIndex(doc, index);
      return NextResponse.json({ resolved, dependencyArtifacts: [] });
    }

    const dependencyArtifacts = collectBrowseDependencyArtifacts(doc, index);
    const resolved = resolvePracticeWithLibraryIndex(doc, index);
    return NextResponse.json({ resolved, dependencyArtifacts });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Resolution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
