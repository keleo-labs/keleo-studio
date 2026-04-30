import { NextResponse } from "next/server";
import { buildLibraryLookupIndex, resolvePracticeWithLibraryIndex } from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";

/**
 * POST JSON `{ doc }` — for Practice documents with `baselinePracticeName` and/or `practiceDependencyNames`,
 * merges matching baseline and dependency practices from the library (same as method merge), then prunes to
 * elements referenced by `doc` for documentation-sized output.
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
  const doc = (body as Record<string, unknown>).doc;
  if (!doc || typeof doc !== "object") {
    return NextResponse.json({ error: "Missing doc" }, { status: 400 });
  }

  try {
    const bodies = await loadAllLibraryDocumentBodies();
    const index = buildLibraryLookupIndex(bodies);
    const resolved = resolvePracticeWithLibraryIndex(doc, index);
    return NextResponse.json({ resolved });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Resolution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
