/**
 * Display utilities for practice elements: aliases and tags.
 * Merged from practiceElementAliasDisplay.ts and practiceElementTags.ts
 */

import type { PracticeElementAlias, PracticeElementTags } from "@/lib/types";

// ============================================
// ALIAS DISPLAY
// ============================================

export type PracticeElementAliasLookup = Map<string, { aliasName: string }>;

const KEY_SEP = "\0";

function lookupKey(kind: string, canonicalName: string): string {
  return `${String(kind).trim().toLowerCase()}${KEY_SEP}${String(canonicalName ?? "").trim()}`;
}

/** Empty map — default context value. */
export const EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP: PracticeElementAliasLookup = new Map();

export function buildPracticeElementAliasLookup(
  aliases: PracticeElementAlias[] | undefined | null,
): PracticeElementAliasLookup {
  const m = new Map<string, { aliasName: string }>();
  if (!Array.isArray(aliases)) return m;
  for (const a of aliases) {
    if (!a || typeof a !== "object") continue;
    const t = String((a as PracticeElementAlias).practiceElementType ?? "").trim();
    const n = String((a as PracticeElementAlias).practiceElementName ?? "").trim();
    const alias = String((a as PracticeElementAlias).aliasName ?? "").trim();
    if (!t || !n || !alias) continue;
    m.set(lookupKey(t, n), { aliasName: alias });
  }
  return m;
}

export function getAliasedDisplay(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
): { primary: string; showCanonical: boolean; canonical: string } {
  const canonical = String(canonicalName ?? "").trim();
  if (!canonical) return { primary: canonical, showCanonical: false, canonical };
  const hit = lookup.get(lookupKey(kind, canonical));
  if (!hit) return { primary: canonical, showCanonical: false, canonical };
  const primary = String(hit.aliasName ?? "").trim() || canonical;
  if (primary === canonical) return { primary: canonical, showCanonical: false, canonical };
  return { primary, showCanonical: true, canonical };
}

/** Single-line width hint for SVG/layout (primary + bracket). */
export function diagramMeasureName(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
): string {
  const { primary, showCanonical, canonical } = getAliasedDisplay(lookup, kind, canonicalName);
  if (!showCanonical) return primary;
  return `${primary} (${canonical})`;
}

export function formatAliasedNameHtml(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
  esc: (u: unknown) => string,
): string {
  const { primary, showCanonical, canonical } = getAliasedDisplay(lookup, kind, canonicalName);
  if (!showCanonical) return esc(primary);
  return `${esc(primary)} <span style="font-size:0.88em;font-style:italic;font-weight:500;opacity:0.92">(${esc(canonical)})</span>`;
}

// ============================================
// TAG UTILITIES
// ============================================

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
