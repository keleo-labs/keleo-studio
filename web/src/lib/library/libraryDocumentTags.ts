import { classifyLibraryRoot } from "@/lib/library/classify";
import { mergePracticeElementTags, normalizePracticeElementTags } from "@/lib/display/elementDisplay";

export type LibraryDocumentTags = {
  domainTags: string[];
  lifecycleTags: string[];
  organizationalTags: string[];
};

function emptyBuckets(): LibraryDocumentTags {
  return { domainTags: [], lifecycleTags: [], organizationalTags: [] };
}

/** Structured practice tags for library filtering (method merges wrapper + baselinePractice tags). */
export function libraryDocumentTags(body: unknown): LibraryDocumentTags {
  if (!body || typeof body !== "object") return emptyBuckets();
  const o = body as Record<string, unknown>;
  const root = classifyLibraryRoot(body);
  let merged = normalizePracticeElementTags(o.tags);
  if (root === "method") {
    const bp = o.baselinePractice;
    const bpTags =
      bp && typeof bp === "object" ? normalizePracticeElementTags((bp as Record<string, unknown>).tags) : undefined;
    merged = mergePracticeElementTags(merged, bpTags);
  }
  if (!merged) return emptyBuckets();
  return {
    domainTags: [...(merged.domainTags ?? [])],
    lifecycleTags: [...(merged.lifecycleTags ?? [])],
    organizationalTags: [...(merged.organizationalTags ?? [])],
  };
}
