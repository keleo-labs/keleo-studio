import { getJsonDocumentStore } from "@/lib/storage/getStore";
import { normalizePracticeBody } from "@/lib/core/normalizePractice";

/** Full JSON bodies for all stored library documents (for dependency / baseline resolution). */
export async function loadAllLibraryDocumentBodies(): Promise<Record<string, unknown>[]> {
  const store = await getJsonDocumentStore();
  const metas = await store.list();
  const chunks = await Promise.all(metas.map((m) => store.get(m.id)));
  return chunks
    .map((c) => normalizePracticeBody(c?.body ?? null))
    .filter((b): b is Record<string, unknown> => b != null && typeof b === "object");
}
