import { getJsonDocumentStore, getBundleStore } from "@/lib/storage/getStore";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";

/** Full JSON bodies for all stored library documents (for dependency / baseline resolution). */
export async function loadAllLibraryDocumentBodies(): Promise<Record<string, unknown>[]> {
  const bodies: Record<string, unknown>[] = [];

  // Source 1: legacy flat document store
  const store = await getJsonDocumentStore();
  const metas = await store.list();
  const chunks = await Promise.all(metas.map((m) => store.get(m.id)));
  for (const c of chunks) {
    const b = normalizePracticeBody(c?.body ?? null);
    if (b != null && typeof b === "object") bodies.push(b);
  }

  // Source 2: bundle store
  try {
    const bundleStore = await getBundleStore();
    const docs = await bundleStore.listAllDocuments();
    for (const doc of docs) {
      const b = normalizePracticeBody(doc.body);
      if (b != null && typeof b === "object") bodies.push(b);
    }
  } catch {
    // Bundle store may not be available (e.g., no bundles directory yet)
  }

  return bodies;
}
