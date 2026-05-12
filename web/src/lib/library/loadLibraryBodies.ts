import { getJsonDocumentStore } from "@/lib/storage/getStore";

function normalizePracticeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const o = body as Record<string, unknown>;

  const isPractice = typeof o.baselinePracticeName === "string" || Array.isArray(o.practiceDependencyNames);
  if (!isPractice) {
    if (Array.isArray(o.practices)) {
      return {
        ...o,
        practices: o.practices.map((p) => normalizePracticeBody(p)),
      };
    }
    return body;
  }

  return {
    ...o,
    alphas: Array.isArray(o.alphas) ? o.alphas : [],
    activitySpaces: Array.isArray(o.activitySpaces) ? o.activitySpaces : [],
    activities: Array.isArray(o.activities) ? o.activities : [],
    workProducts: Array.isArray(o.workProducts) ? o.workProducts : [],
    personas: Array.isArray(o.personas) ? o.personas : [],
    personaGroups: Array.isArray(o.personaGroups) ? o.personaGroups : [],
  };
}

/** Full JSON bodies for all stored library documents (for dependency / baseline resolution). */
export async function loadAllLibraryDocumentBodies(): Promise<Record<string, unknown>[]> {
  const store = await getJsonDocumentStore();
  const metas = await store.list();
  const chunks = await Promise.all(metas.map((m) => store.get(m.id)));
  return chunks
    .map((c) => normalizePracticeBody(c?.body ?? null))
    .filter((b): b is Record<string, unknown> => b != null && typeof b === "object");
}
