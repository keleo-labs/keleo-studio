import type { PracticeElementTags } from "@/lib/types";

function uniqStrings(xs: string[]): string[] {
  return [...new Set(xs.map((s) => String(s).trim()).filter(Boolean))];
}

/** Marker stored under lifecycleTags (or legacy string array) for auto-generated stubs. */
export const SYNTHESIZED_TAG = "synthesized";

export function synthesizedPracticeElementTags(): PracticeElementTags {
  return { lifecycleTags: [SYNTHESIZED_TAG] };
}

/** Normalize unknown input into bucket form (legacy arrays → lifecycleTags only). */
export function normalizePracticeElementTags(tags: unknown): PracticeElementTags | undefined {
  if (tags === undefined || tags === null) return undefined;
  if (Array.isArray(tags)) {
    const lifecycleTags = uniqStrings(tags.filter((x): x is string => typeof x === "string"));
    return lifecycleTags.length ? { lifecycleTags } : undefined;
  }
  if (typeof tags !== "object") return undefined;
  const o = tags as Record<string, unknown>;
  const domainTags = Array.isArray(o.domainTags)
    ? uniqStrings(o.domainTags.filter((x): x is string => typeof x === "string"))
    : [];
  const lifecycleTags = Array.isArray(o.lifecycleTags)
    ? uniqStrings(o.lifecycleTags.filter((x): x is string => typeof x === "string"))
    : [];
  const organizationalTags = Array.isArray(o.organizationalTags)
    ? uniqStrings(o.organizationalTags.filter((x): x is string => typeof x === "string"))
    : [];
  if (!domainTags.length && !lifecycleTags.length && !organizationalTags.length) return undefined;
  const out: PracticeElementTags = {};
  if (domainTags.length) out.domainTags = domainTags;
  if (lifecycleTags.length) out.lifecycleTags = lifecycleTags;
  if (organizationalTags.length) out.organizationalTags = organizationalTags;
  return out;
}

export function mergePracticeElementTags(a: unknown, b: unknown): PracticeElementTags | undefined {
  const A = normalizePracticeElementTags(a);
  const B = normalizePracticeElementTags(b);
  const domainTags = uniqStrings([...(A?.domainTags ?? []), ...(B?.domainTags ?? [])]);
  const lifecycleTags = uniqStrings([...(A?.lifecycleTags ?? []), ...(B?.lifecycleTags ?? [])]);
  const organizationalTags = uniqStrings([...(A?.organizationalTags ?? []), ...(B?.organizationalTags ?? [])]);
  if (!domainTags.length && !lifecycleTags.length && !organizationalTags.length) return undefined;
  const out: PracticeElementTags = {};
  if (domainTags.length) out.domainTags = domainTags;
  if (lifecycleTags.length) out.lifecycleTags = lifecycleTags;
  if (organizationalTags.length) out.organizationalTags = organizationalTags;
  return out;
}

/** Flatten tags for display, PDF, or legacy single-field editors (order: domain, lifecycle, organizational). */
export function flattenPracticeElementTags(tags: unknown): string[] {
  const n = normalizePracticeElementTags(tags);
  if (!n) return [];
  return [...(n.domainTags ?? []), ...(n.lifecycleTags ?? []), ...(n.organizationalTags ?? [])];
}

export function isSynthesizedPracticeElementTags(tags: unknown): boolean {
  return flattenPracticeElementTags(tags).includes(SYNTHESIZED_TAG);
}

/** Lines per bucket for multi-textarea editors (legacy array → lifecycle lines only). */
export function practiceTagsBucketLines(tags: unknown): { domain: string; lifecycle: string; organizational: string } {
  if (Array.isArray(tags)) {
    const lines = tags.filter((x): x is string => typeof x === "string").join("\n");
    return { domain: "", lifecycle: lines, organizational: "" };
  }
  const n = normalizePracticeElementTags(tags);
  return {
    domain: (n?.domainTags ?? []).join("\n"),
    lifecycle: (n?.lifecycleTags ?? []).join("\n"),
    organizational: (n?.organizationalTags ?? []).join("\n"),
  };
}

export function practiceTagsFromBucketLines(domain: string, lifecycle: string, organizational: string): PracticeElementTags | undefined {
  const domainTags = strArrFromLines(domain);
  const lifecycleTags = strArrFromLines(lifecycle);
  const organizationalTags = strArrFromLines(organizational);
  return normalizePracticeElementTags({ domainTags, lifecycleTags, organizationalTags });
}

function strArrFromLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
