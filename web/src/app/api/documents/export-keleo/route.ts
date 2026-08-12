import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { buildKeleoPackage, buildKeleoPackageBundle } from "@/lib/library/buildKeleoPackage";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  let ids: string[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "Request body must include a non-empty 'ids' array" }, { status: 400 });
    }
    ids = body.ids.filter((id: unknown) => typeof id === "string" && id.trim());
    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid document IDs provided" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const store = await getJsonDocumentStore();
  const allBodies = await loadAllLibraryDocumentBodies();

  const docs: Array<{ body: Record<string, unknown>; displayName: string }> = [];
  const missing: string[] = [];

  for (const id of ids) {
    const record = await store.get(id);
    if (!record?.body || typeof record.body !== "object") {
      missing.push(id);
      continue;
    }
    const normalized = normalizePracticeBody(record.body);
    if (!normalized || typeof normalized !== "object") {
      missing.push(id);
      continue;
    }
    const name = typeof (normalized as Record<string, unknown>).name === "string"
      ? ((normalized as Record<string, unknown>).name as string).trim()
      : record.title || "Untitled";
    docs.push({ body: normalized as Record<string, unknown>, displayName: name });
  }

  if (docs.length === 0) {
    return NextResponse.json(
      { error: missing.length > 0 ? `Documents not found: ${missing.join(", ")}` : "No valid documents to export" },
      { status: 404 },
    );
  }

  try {
    if (docs.length === 1) {
      const zip = buildKeleoPackage(docs[0].body, allBodies);
      const filename = `${slugify(docs[0].displayName) || "package"}.keleo`;
      return new Response(Buffer.from(zip), {
        headers: {
          "Content-Type": "application/vnd.keleo.package+zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const bundleZip = buildKeleoPackageBundle(docs, allBodies);
    const filename = `keleo-export-${docs.length}-packages.zip`;
    return new Response(Buffer.from(bundleZip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Package export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
