import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import {
  buildLibraryLookupIndex,
  resolveDocumentWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";
import { generateStaticSite } from "@/lib/staticSiteExport";
import { slugify } from "@/lib/staticSiteExport/slugs";
import { zipSync, strToU8 } from "fflate";

/**
 * Generate a static site ZIP from a bundle document.
 *
 * GET /api/library/static-site?bundle=<slug>&path=<documentPath>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bundleSlug = url.searchParams.get("bundle");
  const documentPath = url.searchParams.get("path");

  if (!bundleSlug || !documentPath) {
    return NextResponse.json({ error: "Missing bundle or path parameter" }, { status: 400 });
  }

  const store = await getBundleStore();
  const body = await store.getDocument(bundleSlug, documentPath);
  if (!body) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    let doc: unknown = normalizePracticeBody(body);

    const bodies = await loadAllLibraryDocumentBodies();
    const index = buildLibraryLookupIndex(bodies);
    const originalDoc = doc;
    doc = resolveDocumentWithLibraryIndex(doc, index);

    const { files, practiceName } = generateStaticSite(doc, originalDoc, index);

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
