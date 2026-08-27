import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import { buildBundleLibraryIndexFromMeta, serializeBundleLibraryIndex } from "@/lib/library/bundleIndex";
import { serverCache, CACHE_TTL } from "@/lib/cache/serverCache";
import type { SerializedBundleLibraryIndex } from "@/lib/library/bundleIndex";

const CACHE_KEY = "bundle-library-index";

export async function GET() {
  const cached = serverCache.get<SerializedBundleLibraryIndex>(CACHE_KEY, CACHE_TTL.LIBRARY_INDEX);
  if (cached) {
    return NextResponse.json(cached);
  }

  const store = await getBundleStore();

  // Process inbox on cache miss (picks up files dropped into data/inbox/)
  try {
    const processed = await store.processInbox();
    if (processed > 0) {
      console.log(`[library/index] Processed ${processed} file(s) from inbox`);
    }
  } catch {
    // Inbox processing is best-effort
  }

  const [allDocMeta, bundleInfos] = await Promise.all([
    store.listAllDocumentMeta(),
    store.listBundles(),
  ]);

  const index = buildBundleLibraryIndexFromMeta(allDocMeta, bundleInfos);
  const serialized = serializeBundleLibraryIndex(index);

  serverCache.set(CACHE_KEY, serialized);
  return NextResponse.json(serialized);
}
