import { NextResponse } from "next/server";
import { classifyLibraryRoot, displayNameForBody, baselineNameForPracticeLink, practiceNameForDependencyLink } from "@/lib/library/classify";
import { libraryDocumentTags } from "@/lib/library/libraryDocumentTags";
import { listVirtualElementFiles } from "@/lib/library/virtualElementFiles";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import type { JsonDocumentCreateInput, JsonDocumentKind } from "@/lib/storage/types";

function isKind(v: unknown): v is JsonDocumentKind {
  return v === "practice" || v === "method" || v === "upload" || v === "dashboard-config";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (kind && !isKind(kind)) {
    return NextResponse.json({ error: "Invalid kind filter" }, { status: 400 });
  }
  const filter = kind && isKind(kind) ? { kind } : undefined;
  const withBody = url.searchParams.get("withBody") === "1";
  const enrich = url.searchParams.get("details") === "1" || withBody;
  const store = await getJsonDocumentStore();
  const metas = await store.list(filter);
  if (!enrich) {
    return NextResponse.json({ documents: metas });
  }
  const documents = await Promise.all(
    metas.map(async (m) => {
      const full = await store.get(m.id);
      // Don't normalize or enrich dashboard-config documents
      if (m.kind === "dashboard-config") {
        return {
          ...m,
          ...(withBody ? { body: full?.body } : {}),
        };
      }
      const body = normalizePracticeBody(full?.body);
      return {
        ...m,
        ...(withBody ? { body } : {}),
        libraryRootKind: classifyLibraryRoot(body),
        displayName: displayNameForBody(body, m.title),
        virtualFileCount: listVirtualElementFiles(body).length,
        baselineNameForPracticeLink: baselineNameForPracticeLink(body),
        practiceNameForDependencyLink: practiceNameForDependencyLink(body),
        libraryTags: libraryDocumentTags(body),
      };
    }),
  );
  return NextResponse.json({ documents });
}

function normalizePracticeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const o = body as Record<string, unknown>;

  // For practices with dependencies but no local elements, ensure arrays exist
  const isPractice = typeof o.baselinePracticeName === "string" || Array.isArray(o.practiceDependencyNames);
  if (!isPractice) {
    // Check if this is a Method with embedded practices
    if (Array.isArray(o.practices)) {
      return {
        ...o,
        practices: o.practices.map((p) => normalizePracticeBody(p)),
      };
    }
    return body;
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
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!isKind(o.kind)) {
    return NextResponse.json({ error: "kind must be practice | method | upload | dashboard-config" }, { status: 400 });
  }
  const input: JsonDocumentCreateInput = {
    title,
    kind: o.kind,
    // Only normalize practice/method bodies, not dashboard-config
    body: o.kind === "dashboard-config"
      ? o.body
      : (o.body === undefined ? null : normalizePracticeBody(o.body)),
  };
  try {
    const store = await getJsonDocumentStore();
    const doc = await store.create(input);
    return NextResponse.json(doc, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Storage error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
