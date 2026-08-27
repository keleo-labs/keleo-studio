import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import { serverCache } from "@/lib/cache/serverCache";
import { WORKSPACE_BUNDLE_SLUG } from "@/lib/storage/bundleStoreTypes";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const store = await getBundleStore();
  const manifest = await store.getBundleManifest(slug);
  if (!manifest) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }
  return NextResponse.json({ slug, manifest });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { slug } = await params;

  if (slug === WORKSPACE_BUNDLE_SLUG) {
    return NextResponse.json({ error: "Cannot delete the workspace bundle" }, { status: 403 });
  }

  const store = await getBundleStore();
  const removed = await store.removeBundle(slug);
  if (!removed) {
    return NextResponse.json({ error: "Bundle not found or could not be removed" }, { status: 404 });
  }

  serverCache.clear();
  return NextResponse.json({ removed: true });
}
