import type { AlphaContribution } from "@/lib/types";

/** Parse a PatternView.alphaStates entry into alpha + state names. */
export function parsePatternViewAlphaState(x: unknown): { alphaName: string; stateName: string } | null {
  if (x && typeof x === "object" && x !== null && "alphaName" in x) {
    const o = x as AlphaContribution;
    const a = String((o as { alphaName?: string }).alphaName ?? "").trim();
    const s = String((o as { stateName?: string }).stateName ?? "").trim();
    if (!a || !s) return null;
    return { alphaName: a, stateName: s };
  }
  const raw = String(x ?? "").trim();
  if (!raw) return null;
  for (const sep of ["→", "->", "=>"] as const) {
    const i = raw.indexOf(sep);
    if (i > 0) {
      const a = raw.slice(0, i).trim();
      const s = raw.slice(i + sep.length).trim();
      if (a && s) return { alphaName: a, stateName: s };
    }
  }
  return null;
}

/** Human-readable summary of one `PatternView.alphaInstances[]` row. */
export function formatPatternViewAlphaInstance(x: unknown): string {
  if (!x || typeof x !== "object") return String(x ?? "");
  const o = x as Record<string, unknown>;
  const label = String(o.instanceName ?? o.name ?? "").trim();
  const a = String(o.alphaName ?? "").trim();
  const s = String(o.stateName ?? "").trim();
  if (label && a && s) return `${label}: ${a}→${s}`;
  if (a && s) return `${a}→${s}`;
  return JSON.stringify(o);
}

/** Display one PatternView.alphaStates entry (embedded contribution or legacy string token). */
export function formatPatternViewAlphaState(x: unknown): string {
  if (x && typeof x === "object" && x !== null && "alphaName" in x) {
    const o = x as AlphaContribution;
    return `${String(o.alphaName ?? "")}→${String(o.stateName ?? "")}`;
  }
  return String(x ?? "");
}

function patternViewAlphaStateMergeKey(x: unknown): string {
  if (x && typeof x === "object" && x !== null && "alphaName" in x) {
    const o = x as AlphaContribution;
    return `obj:${String(o.alphaName ?? "").trim()}::${String(o.stateName ?? "").trim()}`;
  }
  return `str:${String(x ?? "").trim()}`;
}

/** Deduped union merge for PatternView.alphaStates (strings and/or AlphaContribution objects). */
export function mergePatternViewAlphaStates(a: unknown[] | undefined, b: unknown[] | undefined): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const x of [...(a ?? []), ...(b ?? [])]) {
    const k = patternViewAlphaStateMergeKey(x);
    if (k === "str:" || k === "obj::") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

/** Which PatternView JSON array a swimlane ref came from (matrices show both lists in order). */
export type PatternViewLaneListOrigin = "activitySpaces" | "activities";

/**
 * Ordered swimlane refs: every `activitySpaces` entry first (deduped within that array), then every `activities` entry
 * (deduped within that array). The same name may appear once per list so both can be shown in the pattern matrix.
 */
export function patternViewLaneRefsWithOrigin(
  pv: unknown,
): Array<{ name: string; listOrigin: PatternViewLaneListOrigin }> {
  if (!pv || typeof pv !== "object") return [];
  const o = pv as { activitySpaces?: unknown; activities?: unknown };
  const out: Array<{ name: string; listOrigin: PatternViewLaneListOrigin }> = [];
  const seenSpaces = new Set<string>();
  for (const raw of Array.isArray(o.activitySpaces) ? o.activitySpaces : []) {
    const s = String(raw ?? "").trim();
    if (!s || seenSpaces.has(s)) continue;
    seenSpaces.add(s);
    out.push({ name: s, listOrigin: "activitySpaces" });
  }
  const seenActs = new Set<string>();
  for (const raw of Array.isArray(o.activities) ? o.activities : []) {
    const s = String(raw ?? "").trim();
    if (!s || seenActs.has(s)) continue;
    seenActs.add(s);
    out.push({ name: s, listOrigin: "activities" });
  }
  return out;
}

/**
 * Swimlane names for dependency closure / merges: union of both lists, deduped by name (order not preserved).
 * Legacy documents may list Activity names only under `activitySpaces`.
 */
export function patternViewLaneRefStrings(pv: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { name } of patternViewLaneRefsWithOrigin(pv)) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}
