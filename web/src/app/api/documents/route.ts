import { NextResponse } from "next/server";
import { classifyLibraryRoot, displayNameForBody, baselineNameForPracticeLink, practiceNameForDependencyLink, associatedBaselineName } from "@/lib/library/classify";
import { libraryDocumentTags } from "@/lib/library/libraryDocumentTags";
import { listVirtualElementFiles } from "@/lib/library/virtualElementFiles";
import { extractAndPersistEmbeddedPractices } from "@/lib/library/extractEmbeddedPractices";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import type { JsonDocumentCreateInput, JsonDocumentKind } from "@/lib/storage/types";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { validateAgainstSchemaServer } from "@/lib/core/validateServer";
import { serverCache } from "@/lib/cache/serverCache";

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
      const description = body && typeof body === 'object' && 'description' in body
        ? String(body.description)
        : undefined;
      return {
        ...m,
        ...(withBody ? { body } : {}),
        libraryRootKind: classifyLibraryRoot(body),
        displayName: displayNameForBody(body, m.title),
        description,
        virtualFileCount: listVirtualElementFiles(body).length,
        baselineNameForPracticeLink: baselineNameForPracticeLink(body),
        practiceNameForDependencyLink: practiceNameForDependencyLink(body),
        associatedBaselineName: associatedBaselineName(body),
        libraryTags: libraryDocumentTags(body),
      };
    }),
  );
  return NextResponse.json({ documents });
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
  // Normalize the body before validation
  const normalizedBody = o.kind === "dashboard-config"
    ? o.body
    : (o.body === undefined ? null : normalizePracticeBody(o.body));

  // Validate practice/method bodies against schema before persistence
  if (o.kind === "practice" || o.kind === "method") {
    if (normalizedBody !== null && normalizedBody !== undefined) {
      const validation = validateAgainstSchemaServer(normalizedBody);
      // Use relaxed validation (allows partial/draft documents)
      if (!validation.relaxedOk) {
        return NextResponse.json(
          {
            error: "Schema validation failed",
            issues: validation.relaxedIssues,
          },
          { status: 400 }
        );
      }
    }
  }

  try {
    const store = await getJsonDocumentStore();

    // For methods with embedded practices, extract and persist them separately
    let finalBody = normalizedBody;
    if (o.kind === "method" && normalizedBody) {
      finalBody = await extractAndPersistEmbeddedPractices(normalizedBody, store);
    }

    const input: JsonDocumentCreateInput = {
      title,
      kind: o.kind,
      body: finalBody,
    };

    const doc = await store.create(input);

    // Clear library-wide cache entries when new practice/method is created
    // This invalidates batch-resolve, by-tags, and other library-wide caches
    if (o.kind === "practice" || o.kind === "method") {
      serverCache.clear();
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Storage error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
