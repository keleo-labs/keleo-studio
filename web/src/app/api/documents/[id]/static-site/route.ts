import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import {
  buildLibraryLookupIndex,
  resolveDocumentWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { generateStaticSite } from "@/lib/staticSiteExport";
import { slugify } from "@/lib/staticSiteExport/slugs";
import { zipSync, strToU8 } from "fflate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const store = await getJsonDocumentStore();
  const record = await store.get(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let doc: unknown = record.body;
  if (!doc || typeof doc !== "object") {
    return NextResponse.json({ error: "Document body is empty" }, { status: 400 });
  }

  try {
    doc = normalizePracticeBody(doc);

    const bodies = await loadAllLibraryDocumentBodies();
    const index = buildLibraryLookupIndex(bodies);
    doc = resolveDocumentWithLibraryIndex(doc, index);

    const { files, practiceName } = generateStaticSite(doc);

    const zipData: Record<string, Uint8Array> = {};
    for (const [path, content] of files) {
      zipData[path] = strToU8(content);
    }
    const zipped = zipSync(zipData, { level: 6 });

    return new Response(zipped, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slugify(practiceName)}-site.zip"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Static site generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
