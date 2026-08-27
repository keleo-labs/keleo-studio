import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import { classifyLibraryRoot, displayNameForBody } from "@/lib/library/classify";
import { listVirtualElementFiles } from "@/lib/library/virtualElementFiles";
import { libraryDocumentTags } from "@/lib/library/libraryDocumentTags";

/**
 * Load a document from a bundle by slug + path.
 * Returns a shape compatible with the flat-store GET /api/documents/:id response.
 *
 * GET /api/library/document?bundle=<slug>&path=<documentPath>
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

  const kind = classifyLibraryRoot(body);
  const name = displayNameForBody(body, documentPath);
  const tags = libraryDocumentTags(body);
  const elements = listVirtualElementFiles(body);

  return NextResponse.json({
    id: `bundle:${bundleSlug}/${documentPath}`,
    title: name,
    kind,
    body,
    libraryRootKind: kind,
    displayName: name,
    virtualFileCount: elements.length,
    libraryTags: tags,
    createdAt: "",
    updatedAt: "",
  });
}
