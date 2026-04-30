import type { PracticeElementAlias } from "@/lib/types";

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
