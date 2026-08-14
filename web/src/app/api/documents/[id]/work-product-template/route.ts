import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import {
  buildLibraryLookupIndex,
  resolveDocumentWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import {
  buildReportRenderableDoc,
  buildDisplayAliasLookup,
} from "@/lib/practiceReport/generatePracticeReport";
import { generateWorkProductTemplate } from "@/lib/documentTemplate";
import { slugify } from "@/lib/staticSiteExport/slugs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const url = new URL(req.url);
  const wpName = url.searchParams.get("wp");
  if (!wpName) {
    return NextResponse.json(
      { error: "Missing 'wp' query parameter (work product name)" },
      { status: 400 },
    );
  }

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

    const renderable = buildReportRenderableDoc(doc);
    if (!renderable) {
      return NextResponse.json(
        { error: "Could not resolve document for rendering" },
        { status: 500 },
      );
    }

    const wp = renderable.workProducts?.find((w) => w.name === wpName);
    if (!wp) {
      return NextResponse.json(
        { error: `Work product "${wpName}" not found in resolved document` },
        { status: 404 },
      );
    }

    const display = buildDisplayAliasLookup(
      (renderable as any).practiceElementAliases,
    );
    const markdown = generateWorkProductTemplate(wp, renderable, display);

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slugify(wpName)}-template.md"`,
      },
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Template generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
