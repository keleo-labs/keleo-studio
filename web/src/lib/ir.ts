import type {
  Method,
  Narrative,
  NarrativeType,
  PracticeActivity,
  PracticeBaseline,
  PracticeElement,
  RefIssue,
} from "@/lib/types";
import {
  isSynthesizedPracticeElementTags,
  synthesizedPracticeElementTags,
} from "@/lib/display/elementDisplay";

type Indexes = {
  focusByName: Map<string, PracticeElement>;
  alphaByName: Map<string, PracticeBaseline["alphas"][number]>;
  /** Keys are {@link activitySpaceIdentityKey}(name), values use canonical `ActivitySpace.name` casing. */
  activitySpaceByName: Map<string, PracticeBaseline["activitySpaces"][number]>;
  competencyByName: Map<string, PracticeBaseline["competencies"][number]>;
};

/** Baseline-shaped slice used for rendering and ref checks (Method baseline, PracticeBaseline doc, or optional Practice overlay). */
export function asBaselineDocument(doc: any): PracticeBaseline | null {
  if (!doc || typeof doc !== "object") return null;
  if (doc.baselinePractice && typeof doc.baselinePractice === "object") {
    return (doc as Method).baselinePractice;
  }
  // Kernel-shaped documents with their own alphas + focuses and no practice
  // dependencies are baselines in their own right — preserve the document name
  // even when baselinePracticeName references a parent baseline.
  const hasKernelShape = Array.isArray(doc.alphas) && doc.alphas.length > 0 &&
    Array.isArray(doc.focuses) && doc.focuses.length > 0;
  const hasPracticeDeps = Array.isArray(doc.practiceDependencyNames) &&
    doc.practiceDependencyNames.some((x: any) => typeof x === "string" && String(x).trim());
  if (hasKernelShape && !hasPracticeDeps) {
    return doc as PracticeBaseline;
  }
  if (typeof doc.baselinePracticeName === "string") {
    const bn = String(doc.baselinePracticeName).trim();
    if (!bn) return null;
    return {
      name: bn,
      description: doc.description,
      ...(doc.tags !== undefined ? { tags: doc.tags } : {}),
      focuses: Array.isArray(doc.focuses) ? doc.focuses : [],
      alphas: Array.isArray(doc.alphas) ? doc.alphas : [],
      activitySpaces: Array.isArray(doc.activitySpaces) ? doc.activitySpaces : [],
      competencies: Array.isArray(doc.competencies) ? doc.competencies : [],
      authors: Array.isArray(doc.authors) ? doc.authors : [],
      createdAt: typeof doc.createdAt === "string" ? doc.createdAt : "",
      updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : "",
      version: typeof doc.version === "string" ? doc.version : "",
      keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
      narrativeTypes: Array.isArray((doc as { narrativeTypes?: unknown }).narrativeTypes)
        ? ((doc as { narrativeTypes?: unknown }).narrativeTypes as NarrativeType[])
        : [],
      citations: Array.isArray((doc as { citations?: unknown }).citations)
        ? ((doc as { citations?: unknown }).citations as Citation[])
        : [],
    } as PracticeBaseline;
  }
  // Fallback for merged composites where baselinePracticeName was stripped
  if (Array.isArray(doc.alphas) && Array.isArray(doc.focuses)) {
    return doc as PracticeBaseline;
  }
  return null;
}

/**
 * Canonical activity layout: each ActivitySpace row carries optional `activities`;
 * legacy Practice.activities and legacy Activity rows mixed into `activitySpaces` are folded in.
 */
export function baselineWithPracticeActivities(doc: unknown, baseline: PracticeBaseline): PracticeBaseline {
  if (!doc || typeof doc !== "object") return baseline;
  const d = doc as Record<string, any>;
  const flat = Array.isArray(d.activities) ? d.activities : [];
  const mixed = baseline.activitySpaces ?? [];
  if (!flat.length && !mixed.some((s) => isPracticeActivityNode(s) || (Array.isArray((s as any).activities) && (s as any).activities.length)))
    return baseline;
  const next: PracticeBaseline = { ...baseline, activitySpaces: canonicalizeActivitySpaces(mixed, flat) };
  propagateDerivedFocusNames(next as { alphas?: any[]; activitySpaces?: any[]; activities?: any[] });
  finalizeImplicitFocusPlaceholders(next);
  return next;
}

/** Placeholder focus used only when a stub element cannot be tied to a real focus after inference. */
export const IMPLICIT_FOCUS_NAME = "Implicit focus";

/** Case-folded key so `activitySpaceName` matches `ActivitySpace.name` even when casing differs. */
export function activitySpaceIdentityKey(name: unknown): string {
  return String(name ?? "").trim().toLowerCase();
}

/**
 * Canonical practice element name for merges and lookups: case-insensitive, whitespace-normalized (Section 9 of merge spec).
 * Used as the map key for element matching; the original casing is preserved on the element itself.
 */
export function canonicalPracticeElementName(raw: unknown): string | null {
  const k = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return k || null;
}

/**
 * Prefer a concrete focus over empty, {@link IMPLICIT_FOCUS_NAME}, or other unresolved placeholders.
 * When neither side names a real focus, returns `""` (still unresolved). Callers should run
 * {@link finalizeImplicitFocusPlaceholders} after merges so only true hangers get {@link IMPLICIT_FOCUS_NAME}.
 */
export function mergeFocusNamePreferNonImplicit(prev: string | undefined, next: string | undefined): string {
  const p = String(prev ?? "").trim();
  const n = String(next ?? "").trim();
  const implicit = (x: string) => !x || x === IMPLICIT_FOCUS_NAME;
  if (!implicit(n)) return n;
  if (!implicit(p)) return p;
  return "";
}

/** True when focus is not yet a concrete swimlane name (empty, implicit sentinel, or whitespace-only). */
export function isUnresolvedFocusName(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s === IMPLICIT_FOCUS_NAME;
}

/**
 * After activity-space / alpha merges, stamp {@link IMPLICIT_FOCUS_NAME} only where focus is still unresolved.
 * Keeps `"Implicit focus"` out of intermediate merge data so extension stubs cannot drive merge outcomes.
 */
export function finalizeImplicitFocusPlaceholders(doc: {
  activitySpaces?: any[];
  alphas?: any[];
  activities?: any[];
}): void {
  for (const a of doc.alphas ?? []) {
    if (a && typeof a === "object" && isUnresolvedFocusName(a.focusName)) {
      a.focusName = IMPLICIT_FOCUS_NAME;
    }
  }
  for (const row of doc.activitySpaces ?? []) {
    if (!row || typeof row !== "object") continue;
    if (isPracticeActivityNode(row)) {
      if (isUnresolvedFocusName(row.focusName)) row.focusName = IMPLICIT_FOCUS_NAME;
      continue;
    }
    if (isUnresolvedFocusName(row.focusName)) row.focusName = IMPLICIT_FOCUS_NAME;
    for (const act of row.activities ?? []) {
      if (act && typeof act === "object" && isUnresolvedFocusName(act.focusName)) {
        act.focusName = IMPLICIT_FOCUS_NAME;
      }
    }
  }
  for (const act of doc.activities ?? []) {
    if (act && typeof act === "object" && isUnresolvedFocusName(act.focusName)) {
      act.focusName = IMPLICIT_FOCUS_NAME;
    }
  }
}

/**
 * Copy concrete `focusName` from rollup alphas onto contributor alphas that still lack one but declare string
 * `contributesTo` → parent name. Runs to a fixpoint for chains (e.g. A→B→C with C resolved first).
 */
export function propagateAlphaFocusFromContributesToParents(doc: { alphas?: any[] }): void {
  const alphas = doc.alphas ?? [];
  let changed = true;
  while (changed) {
    changed = false;
    const byName = new Map<string, any>();
    for (const a of alphas) {
      const n = String(a?.name ?? "").trim();
      if (n) byName.set(n, a);
    }
    for (const a of alphas) {
      if (!a?.name || !isUnresolvedFocusName(a.focusName)) continue;
      const parentName = typeof a.contributesTo === "string" ? a.contributesTo.trim()
        : typeof (a as any).mapsTo === "string" ? String((a as any).mapsTo).trim()
        : "";
      if (!parentName || parentName === String(a.name)) continue;
      const parent = byName.get(parentName);
      if (!parent || isUnresolvedFocusName(parent.focusName)) continue;
      a.focusName = parent.focusName;
      changed = true;
    }
  }
}

/** True when an element was auto-created for extension-practice rendering (lifecycleTags / legacy array contains `"synthesized"`). */
export function isSynthesizedPracticeElement(el: { tags?: unknown } | null | undefined): boolean {
  return isSynthesizedPracticeElementTags(el?.tags);
}

/**
 * Plain-text description for UI/PDF.
 * If `description` is non-empty (including after baseline + extension merge), it is shown even when the element
 * still carries the `synthesized` tag — otherwise merged views would hide real text. When synthesized and
 * description is empty, returns "" so bare stubs stay visually quiet.
 */
export function practiceElementDescriptionForDisplay(
  el: { description?: unknown; tags?: unknown } | null | undefined,
): string {
  const text = String(el?.description ?? "").trim();
  if (text) return text;
  if (isSynthesizedPracticeElement(el)) return "";
  return "";
}

/** Symbolic spine element reference on `NarrativeContext` (language.schema.json). */
export function narrativeContextElementName(contextRow: unknown): string {
  if (!contextRow || typeof contextRow !== "object") return "";
  const nm = (contextRow as { narrativeElementName?: unknown }).narrativeElementName;
  return typeof nm === "string" ? nm.trim() : "";
}

/**
 * Visible prose for one `narrativeContexts` row. Canonical field is {@link NarrativeContext.context};
 * interchange may omit it and use `narrativeContext`, `description`, `body`, or `text`.
 */
export function narrativeContextRowDisplayText(contextRow: unknown): string {
  if (contextRow == null) return "";
  if (typeof contextRow === "string" || typeof contextRow === "number" || typeof contextRow === "boolean") {
    return String(contextRow).trim();
  }
  if (typeof contextRow !== "object") return "";
  const o = contextRow as Record<string, unknown>;
  // Canonical: `context` (language.schema.json). Interchange includes `content` (e.g. kernel authoring prompts), plus other prose keys.
  for (const k of ["context", "content", "narrativeContext", "body", "text", "description"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** One bullet line for reports — use context prose only; do not emit narrativeElementName as the bullet body. */
export function narrativeContextBulletLine(contextRow: unknown): string | null {
  if (contextRow == null) return null;
  const body = narrativeContextRowDisplayText(contextRow);
  return body.trim() !== "" ? body : null;
}

/**
 * Context prose strings for `PatternView.narrativeContexts`, ordered by `seq` ascending.
 * Each entry uses {@link narrativeContextRowDisplayText} (no symbolic element names).
 */
export function patternViewNarrativeContextProseTexts(pv: unknown): string[] {
  if (!pv || typeof pv !== "object") return [];
  const raw = (pv as Record<string, unknown>).narrativeContexts;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const rows = [...raw].sort(
    (a, b) =>
      (Number((a as { seq?: unknown }).seq ?? 0) || 0) -
      (Number((b as { seq?: unknown }).seq ?? 0) || 0),
  );
  const out: string[] = [];
  for (const c of rows) {
    const t = narrativeContextRowDisplayText(c);
    if (t.trim()) out.push(t.trim());
  }
  return out;
}

/** True when this object is a legacy flat Activity row (Practice.activities or mixed into activitySpaces). */
export function isPracticeActivityNode(s: any): boolean {
  return s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";
}

function buildAlphaByNameForFocus(doc: { alphas?: any[] }): Map<string, any> {
  const m = new Map<string, any>();
  for (const a of doc.alphas ?? []) {
    const n = String(a?.name ?? "").trim();
    if (n) m.set(n, a);
  }
  return m;
}

/** Single contributesTo entry: alpha name string or { alphaName }. */
function contributesToEntryAlphaNames(entry: unknown): string[] {
  if (typeof entry === "string") {
    const t = entry.trim();
    return t ? [t] : [];
  }
  if (entry && typeof entry === "object" && typeof (entry as { alphaName?: unknown }).alphaName === "string") {
    const t = String((entry as { alphaName: string }).alphaName).trim();
    return t ? [t] : [];
  }
  return [];
}

/**
 * Activity spaces still missing focus: copy from the first alpha referenced in `contributesTo` that already has a
 * concrete focus (merged baseline + extensions).
 */
export function propagateActivitySpaceFocusFromContributesTo(doc: { alphas?: any[]; activitySpaces?: any[] }): void {
  const byAlpha = buildAlphaByNameForFocus(doc);
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) continue;
    if (!row || typeof row !== "object") continue;
    if (!isUnresolvedFocusName(row.focusName)) continue;
    outer: for (const c of row.contributesTo ?? []) {
      for (const an of contributesToEntryAlphaNames(c)) {
        const a = byAlpha.get(an);
        if (a && !isUnresolvedFocusName(a.focusName)) {
          row.focusName = a.focusName;
          break outer;
        }
      }
    }
  }
}

/**
 * Activities (flat, nested, or practice-activity nodes): unresolved focus → first alpha in `contributesTo` with a
 * concrete focus (supports string[] legacy symbolic refs).
 */
export function propagateActivityFocusFromContributesTo(doc: {
  alphas?: any[];
  activities?: any[];
  activitySpaces?: any[];
}): void {
  const byAlpha = buildAlphaByNameForFocus(doc);
  const walk = (act: any) => {
    if (!act || typeof act !== "object") return;
    if (!isUnresolvedFocusName(act.focusName)) return;
    for (const c of act.contributesTo ?? []) {
      for (const an of contributesToEntryAlphaNames(c)) {
        const a = byAlpha.get(an);
        if (a && !isUnresolvedFocusName(a.focusName)) {
          act.focusName = a.focusName;
          return;
        }
      }
    }
  };
  for (const act of doc.activities ?? []) walk(act);
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) {
      walk(row);
      continue;
    }
    for (const act of row.activities ?? []) walk(act);
  }
}

/** Unresolved activity focus → parent activity space `focusName` when concrete. */
export function propagateActivityFocusFromParentSpace(doc: { activitySpaces?: any[]; activities?: any[] }): void {
  const spaceByKey = new Map<string, any>();
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) continue;
    const sn = String(row?.name ?? "").trim();
    if (sn) spaceByKey.set(activitySpaceIdentityKey(sn), row);
  }
  const walk = (act: any) => {
    if (!act || typeof act !== "object") return;
    if (!isUnresolvedFocusName(act.focusName)) return;
    const parent = String(act.activitySpaceName ?? "").trim();
    if (!parent) return;
    const sp = spaceByKey.get(activitySpaceIdentityKey(parent));
    if (sp && !isUnresolvedFocusName(sp.focusName)) act.focusName = sp.focusName;
  };
  for (const act of doc.activities ?? []) walk(act);
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) {
      walk(row);
      continue;
    }
    for (const act of row.activities ?? []) walk(act);
  }
}

/** Activity space row: if the space still has no concrete focus, copy from the first nested activity that does. */
export function propagateActivitySpaceFocusFromNestedActivities(doc: { activitySpaces?: any[] }): void {
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) continue;
    if (!row || typeof row !== "object") continue;
    if (!isUnresolvedFocusName(row.focusName)) continue;
    for (const act of row.activities ?? []) {
      if (!act || typeof act !== "object") continue;
      if (!isUnresolvedFocusName(act.focusName)) {
        row.focusName = act.focusName;
        break;
      }
    }
  }
}

/**
 * After baseline + dependency merge, infer missing swimlane foci: alpha rollup edges, then activity spaces and
 * activities from contributesTo / parent space. Multiple rounds cover cross-dependencies.
 */
export function propagateDerivedFocusNames(doc: { alphas?: any[]; activitySpaces?: any[]; activities?: any[] }): void {
  for (let i = 0; i < 10; i++) {
    propagateAlphaFocusFromContributesToParents(doc);
    propagateActivitySpaceFocusFromContributesTo(doc);
    propagateActivityFocusFromContributesTo(doc);
    propagateActivitySpaceFocusFromNestedActivities(doc);
    propagateActivityFocusFromParentSpace(doc);
  }
}

function deepClone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

/**
 * Returns only ActivitySpace-shaped rows (no legacy Activity entries at the top level).
 * Activities live under each space's `activities` array.
 */
export function canonicalizeActivitySpaces(mixed: any[], flatActivities: any[] = []): any[] {
  const byKey = new Map<string, { space: any; activities: Map<string, any> }>();

  const ensureSlot = (spaceName: string, hint?: any) => {
    const key = activitySpaceIdentityKey(spaceName);
    if (byKey.has(key)) return byKey.get(key)!;
    const focusName =
      typeof hint?.focusName === "string" && String(hint.focusName).trim()
        ? String(hint.focusName).trim()
        : "";
    const displayName = String(spaceName).trim() || String(spaceName);
    const stub = stubActivitySpace(displayName, focusName);
    const slot = { space: stub, activities: new Map<string, any>() };
    byKey.set(key, slot);
    return slot;
  };

  for (const item of mixed ?? []) {
    if (!item?.name) continue;
    if (isPracticeActivityNode(item)) continue;
    const key = activitySpaceIdentityKey(item.name);
    const nested = Array.isArray(item.activities) ? (item.activities as any[]).map((a) => deepClone(a)) : [];
    const { activities: _drop, ...rest } = item;
    if (!byKey.has(key)) {
      byKey.set(key, { space: deepClone(rest), activities: new Map() });
    } else {
      const slot = byKey.get(key)!;
      const preservedName = String(slot.space?.name ?? "").trim();
      const prevDesc = String(slot.space?.description ?? "");
      slot.space = { ...slot.space, ...deepClone(rest) };
      if (preservedName) slot.space.name = preservedName;
      /** Matches composite merge semantics: baseline (first-seen row) prose wins over later rows. */
      slot.space.description = prevDesc;
    }
    const slot = byKey.get(key)!;
    const canonSpaceName = String(slot.space.name ?? "").trim();
    for (const a of nested) {
      const actKey = canonicalPracticeElementName(a?.name);
      if (!actKey) continue;
      const ac = deepClone(a);
      if (canonSpaceName) ac.activitySpaceName = canonSpaceName;
      const existing = slot.activities.get(actKey);
      if (existing) slot.activities.set(actKey, { ...ac, description: existing.description });
      else slot.activities.set(actKey, ac);
    }
  }

  const attach = (act: any) => {
    const parent = String(act?.activitySpaceName ?? "").trim();
    const actKey = canonicalPracticeElementName(act?.name);
    if (!parent || !actKey) return;
    const slot = ensureSlot(parent, act);
    const canonName = String(slot.space.name ?? "").trim() || parent;
    const actClone = deepClone(act);
    actClone.activitySpaceName = canonName;
    const existing = slot.activities.get(actKey);
    if (!existing) slot.activities.set(actKey, actClone);
    else slot.activities.set(actKey, { ...actClone, description: existing.description });
  };

  for (const item of mixed ?? []) {
    if (!item?.name) continue;
    if (isPracticeActivityNode(item)) attach(item);
  }
  for (const act of flatActivities ?? []) attach(act);

  return [...byKey.values()].map(({ space, activities }) => {
    const list = [...activities.values()];
    return list.length ? { ...space, activities: list } : { ...space };
  });
}

function stubPracticeElement(name: string, description: string, synthesized = false) {
  return synthesized ? { name, description, tags: synthesizedPracticeElementTags() } : { name, description };
}

function stubActivitySpace(name: string, focusName: string): PracticeBaseline["activitySpaces"][number] {
  return {
    ...stubPracticeElement(name, "", true),
    focusName,
    contributesTo: [],
    requiredCompetencies: [],
  };
}

function stubCompetency(name: string): PracticeBaseline["competencies"][number] {
  return {
    ...stubPracticeElement(name, "", true),
    levels: [
      {
        ...stubPracticeElement("Referenced", "", true),
        level: 1,
        competencyName: name,
      },
    ],
  };
}

function stubState(name: string, seq: number): PracticeBaseline["alphas"][number]["states"][number] {
  return {
    ...stubPracticeElement(name, "", true),
    seq,
    checklist: [],
  };
}

function stubAlpha(name: string, focusName: string, stateNames: string[]): PracticeBaseline["alphas"][number] {
  const names = stateNames.length ? [...new Set(stateNames)].sort((a, b) => a.localeCompare(b)) : ["Referenced"];
  return {
    ...stubPracticeElement(name, "", true),
    focusName,
    states: names.map((nm, i) => stubState(nm, i + 1)),
  };
}

/**
 * For {@link Practice} documents with `baselinePracticeName` and no embedded full baseline,
 * add minimal Focus / Alpha / ActivitySpace / Competency nodes for every name referenced on the
 * practice so swimlane diagrams and ref indexing have something to attach to.
 */
export function enrichBaselineWithReferencedWrappers(doc: unknown, baseline: PracticeBaseline): PracticeBaseline {
  if (!doc || typeof doc !== "object") return baseline;
  const d = doc as Record<string, any>;
  if (typeof d.baselinePracticeName !== "string" || !String(d.baselinePracticeName).trim()) {
    return baseline;
  }

  const alphaToStates = new Map<string, Set<string>>();
  const addAlphaState = (alphaName: string, stateName: string | undefined) => {
    const an = String(alphaName ?? "").trim();
    if (!an) return;
    let set = alphaToStates.get(an);
    if (!set) {
      set = new Set();
      alphaToStates.set(an, set);
    }
    const sn = String(stateName ?? "").trim();
    if (sn) set.add(sn);
  };

  const walkContrib = (c: any) => {
    if (c && typeof c.alphaName === "string") addAlphaState(c.alphaName, c.stateName);
  };

  for (const act of d.activities ?? []) {
    for (const c of act.contributesTo ?? []) walkContrib(c);
  }
  for (const s of d.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      for (const c of s.contributesTo ?? []) walkContrib(c);
      continue;
    }
    for (const c of s.contributesTo ?? []) walkContrib(c);
    for (const act of s.activities ?? []) {
      for (const c of act.contributesTo ?? []) walkContrib(c);
    }
  }
  for (const a of d.alphas ?? []) {
    for (const st of a.states ?? []) {
      for (const c of st.contributesTo ?? []) walkContrib(c);
    }
  }
  for (const wp of d.workProducts ?? []) {
    for (const lod of wp.levelsOfDetail ?? []) {
      for (const c of lod.contributesTo ?? []) walkContrib(c);
    }
  }

  const rollupAlphaTargets = new Set<string>();
  for (const a of d.alphas ?? []) {
    const r = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (r) rollupAlphaTargets.add(r);
    const mt = typeof a.mapsTo === "string" ? a.mapsTo.trim() : "";
    if (mt) rollupAlphaTargets.add(mt);
    const parent = String(a.name ?? "").trim();
    if (!parent || !Array.isArray(a.supportingAlphas) || !a.supportingAlphas.length) continue;
    rollupAlphaTargets.add(parent);
    for (const raw of a.supportingAlphas) {
      const cn = String(raw ?? "").trim();
      if (!cn) continue;
      if (!alphaToStates.has(cn)) alphaToStates.set(cn, new Set());
    }
  }

  const activitySpaceNames = new Set<string>();
  for (const act of d.activities ?? []) {
    const p = String(act.activitySpaceName ?? "").trim();
    if (p) activitySpaceNames.add(p);
  }
  for (const s of d.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) continue;
    const n = String(s.name ?? "").trim();
    if (n) activitySpaceNames.add(n);
  }

  const competencyNames = new Set<string>();
  for (const act of d.activities ?? []) {
    for (const c of act.requiredCompetencies ?? []) {
      const n = String(c ?? "").trim();
      if (n) competencyNames.add(n);
    }
    for (const r of act.recommendedCompetencyLevels ?? []) {
      const n = String(r?.competencyName ?? "").trim();
      if (n) competencyNames.add(n);
    }
  }
  for (const s of d.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      for (const c of s.requiredCompetencies ?? []) {
        const n = String(c ?? "").trim();
        if (n) competencyNames.add(n);
      }
      for (const r of s.recommendedCompetencyLevels ?? []) {
        const n = String(r?.competencyName ?? "").trim();
        if (n) competencyNames.add(n);
      }
      continue;
    }
    for (const c of s.requiredCompetencies ?? []) {
      const n = String(c ?? "").trim();
      if (n) competencyNames.add(n);
    }
    for (const act of s.activities ?? []) {
      for (const c of act.requiredCompetencies ?? []) {
        const n = String(c ?? "").trim();
        if (n) competencyNames.add(n);
      }
      for (const r of act.recommendedCompetencyLevels ?? []) {
        const n = String(r?.competencyName ?? "").trim();
        if (n) competencyNames.add(n);
      }
    }
  }

  const focusNamesFromDoc = new Set<string>();
  for (const a of d.alphas ?? []) {
    const fn = String(a.focusName ?? "").trim();
    if (fn) focusNamesFromDoc.add(fn);
  }
  for (const s of d.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) continue;
    const fn = String(s.focusName ?? "").trim();
    if (fn) focusNamesFromDoc.add(fn);
  }

  const focusByName = new Map<string, PracticeBaseline["focuses"][number]>();
  for (const f of baseline.focuses ?? []) focusByName.set(f.name, f);
  const ensureFocus = (fn: string) => {
    if (!fn) return;
    if (!focusByName.has(fn)) {
      focusByName.set(fn, stubPracticeElement(fn, "", true));
    }
  };
  for (const fn of focusNamesFromDoc) ensureFocus(fn);

  const activitySpaceByName = new Map<string, PracticeBaseline["activitySpaces"][number]>();
  for (const s of baseline.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) continue;
    activitySpaceByName.set(activitySpaceIdentityKey(s.name), s);
  }

  const inferFocusNameForSpaceFromDoc = (spaceName: string): string | undefined => {
    const sn = String(spaceName ?? "").trim();
    if (!sn) return undefined;
    const snKey = activitySpaceIdentityKey(sn);
    for (const act of d.activities ?? []) {
      if (activitySpaceIdentityKey(act.activitySpaceName) !== snKey) continue;
      const fn = String(act.focusName ?? "").trim();
      if (fn) return fn;
    }
    for (const s of d.activitySpaces ?? []) {
      if (isPracticeActivityNode(s)) continue;
      if (activitySpaceIdentityKey(s.name) !== snKey) continue;
      const fn = String(s.focusName ?? "").trim();
      if (fn) return fn;
      for (const act of s.activities ?? []) {
        const fn2 = String(act.focusName ?? "").trim();
        if (fn2) return fn2;
      }
    }
    return undefined;
  };

  const focusNameForStubSpace = (spaceName: string): string =>
    inferFocusNameForSpaceFromDoc(spaceName) ?? IMPLICIT_FOCUS_NAME;

  const pendingImplicitActivitySpaces: string[] = [];

  for (const name of activitySpaceNames) {
    const existing = activitySpaceByName.get(activitySpaceIdentityKey(name));
    if (existing && !isPracticeActivityNode(existing)) continue;
    if (existing && isPracticeActivityNode(existing)) continue;
    const focusName = focusNameForStubSpace(name);
    if (isUnresolvedFocusName(focusName)) {
      pendingImplicitActivitySpaces.push(name);
      continue;
    }
    ensureFocus(focusName);
    if (!existing) {
      activitySpaceByName.set(activitySpaceIdentityKey(name), stubActivitySpace(name, focusName));
    }
  }

  const alphaByName = new Map<string, PracticeBaseline["alphas"][number]>();
  const alphaOrder: string[] = [];
  for (const a of baseline.alphas ?? []) {
    const nk = canonicalPracticeElementName(a.name);
    if (!nk) continue;
    alphaByName.set(nk, {
      ...a,
      states: (a.states ?? []).map((st) => ({ ...st, checklist: [...(st.checklist ?? [])] })),
    });
    alphaOrder.push(nk);
  }

  for (const target of rollupAlphaTargets) {
    if (!alphaToStates.has(target)) alphaToStates.set(target, new Set());
  }

  const focusNameForStubAlpha = (alphaName: string): string => {
    for (const a of d.alphas ?? []) {
      if (String(a.name ?? "").trim() === alphaName) {
        const fn = String(a.focusName ?? "").trim();
        if (fn) return fn;
      }
    }
    return IMPLICIT_FOCUS_NAME;
  };

  const pendingImplicitAlphas: { alphaName: string; stateSet: Set<string> }[] = [];

  for (const [alphaName, stateSet] of alphaToStates) {
    const focusName = focusNameForStubAlpha(alphaName);

    const existing = alphaByName.get(alphaName);
    const stateNames = [...stateSet];
    if (existing) {
      ensureFocus(focusName);
      const have = new Set((existing.states ?? []).map((st) => st.name));
      let nextSeq =
        (existing.states ?? []).reduce((m, st) => Math.max(m, typeof st.seq === "number" ? st.seq : 0), 0) + 1;
      for (const sn of stateNames) {
        if (!have.has(sn)) {
          existing.states.push(stubState(sn, nextSeq++));
          have.add(sn);
        }
      }
      continue;
    }
    if (isUnresolvedFocusName(focusName)) {
      pendingImplicitAlphas.push({ alphaName, stateSet: new Set(stateSet) });
      continue;
    }
    ensureFocus(focusName);
    alphaByName.set(alphaName, stubAlpha(alphaName, focusName, stateNames));
    alphaOrder.push(alphaName);
  }

  if (pendingImplicitActivitySpaces.length > 0) {
    const stillImplicit: string[] = [];
    for (const name of pendingImplicitActivitySpaces) {
      const existing = activitySpaceByName.get(activitySpaceIdentityKey(name));
      if (existing && !isPracticeActivityNode(existing)) continue;
      const resolved = inferFocusNameForSpaceFromDoc(name);
      if (resolved) {
        ensureFocus(resolved);
        if (!existing) activitySpaceByName.set(activitySpaceIdentityKey(name), stubActivitySpace(name, resolved));
        continue;
      }
      stillImplicit.push(name);
    }
    if (stillImplicit.length > 0) {
      ensureFocus(IMPLICIT_FOCUS_NAME);
      for (const name of stillImplicit) {
        const existing = activitySpaceByName.get(activitySpaceIdentityKey(name));
        if (existing && !isPracticeActivityNode(existing)) continue;
        if (!existing) activitySpaceByName.set(activitySpaceIdentityKey(name), stubActivitySpace(name, IMPLICIT_FOCUS_NAME));
      }
    }
  }

  if (pendingImplicitAlphas.length > 0) {
    ensureFocus(IMPLICIT_FOCUS_NAME);
    for (const { alphaName, stateSet } of pendingImplicitAlphas) {
      const stateNames = [...stateSet];
      alphaByName.set(alphaName, stubAlpha(alphaName, IMPLICIT_FOCUS_NAME, stateNames));
      alphaOrder.push(alphaName);
    }
  }

  const competencyByName = new Map<string, PracticeBaseline["competencies"][number]>();
  for (const c of baseline.competencies ?? []) competencyByName.set(c.name, c);
  for (const cn of competencyNames) {
    if (!competencyByName.has(cn)) competencyByName.set(cn, stubCompetency(cn));
  }

  const newAlphaKeys = [...alphaByName.keys()].filter((n) => !alphaOrder.includes(n)).sort((a, b) => a.localeCompare(b));
  const finalAlphaOrder = [...alphaOrder.filter((n) => alphaByName.has(n)), ...newAlphaKeys];
  const finalAlphas = finalAlphaOrder.map((n) => alphaByName.get(n)!);

  const focusOrder = (baseline.focuses ?? []).map((f) => f.name);
  const addedFocusNames = [...focusByName.keys()].filter((n) => !focusOrder.includes(n)).sort((a, b) => a.localeCompare(b));
  const finalFocusNames = [...focusOrder.filter((n) => focusByName.has(n)), ...addedFocusNames];
  const finalFocuses = finalFocusNames.map((n) => focusByName.get(n)!);

  const compOrder = (baseline.competencies ?? []).map((c) => c.name);
  const addedCompNames = [...competencyByName.keys()].filter((n) => !compOrder.includes(n)).sort((a, b) => a.localeCompare(b));
  const finalCompetencies = [
    ...compOrder.filter((n) => competencyByName.has(n)).map((n) => competencyByName.get(n)!),
    ...addedCompNames.map((n) => competencyByName.get(n)!),
  ];

  const enriched: PracticeBaseline = {
    ...baseline,
    focuses: finalFocuses,
    alphas: finalAlphas,
    activitySpaces: [...activitySpaceByName.values()],
    competencies: finalCompetencies,
  };
  finalizeImplicitFocusPlaceholders(enriched);
  return enriched;
}

/** PersonaGroup.name values declared on a Practice/METHOD root (`personaGroups`) or nested on `Method.practices[]`. */
export function collectPersonaGroupNamesFromPracticeDoc(doc: unknown): Set<string> {
  const out = new Set<string>();
  if (!doc || typeof doc !== "object") return out;
  const d = doc as Record<string, unknown>;

  const addFrom = (list: unknown) => {
    for (const pg of Array.isArray(list) ? list : []) {
      if (!pg || typeof pg !== "object") continue;
      const n = String((pg as { name?: unknown }).name ?? "").trim();
      if (n) out.add(n);
    }
  };

  addFrom(d.personaGroups);
  for (const pr of Array.isArray(d.practices) ? d.practices : []) {
    if (pr && typeof pr === "object") addFrom((pr as Record<string, unknown>).personaGroups);
  }

  return out;
}

/** Citation.name values declared in a Practice/Method document or baseline. */
export function collectCitationNames(doc: Record<string, unknown>): string[] {
  const names = new Set<string>();
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  for (const citation of citations) {
    if (!citation || typeof citation !== 'object') continue;
    const name = String((citation as Record<string, unknown>).name ?? '').trim();
    if (name) names.add(name);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Display rows for Persona → competency linkage (canonical `competencies`; interchange: string names; optional `recommendedCompetencyLevels` like Activities). */
export type PersonaCompetencyDisplayRef = {
  competencyName: string;
  competencyLevelName: string | null;
};

export function personaCompetencyDisplayRefs(persona: unknown): PersonaCompetencyDisplayRef[] {
  if (!persona || typeof persona !== "object") return [];
  const o = persona as Record<string, unknown>;
  const rows: PersonaCompetencyDisplayRef[] = [];
  const push = (competencyName: string, levelName: string | null) => {
    const cn = String(competencyName ?? "").trim();
    const ln = levelName != null && String(levelName).trim() !== "" ? String(levelName).trim() : null;
    if (!cn && !ln) return;
    rows.push({ competencyName: cn, competencyLevelName: ln });
  };
  const scan = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (typeof item === "string") {
        const s = item.trim();
        if (s) push(s, null);
        continue;
      }
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        const cn = String(r.competencyName ?? "").trim();
        const lnRaw = r.competencyLevelName != null ? String(r.competencyLevelName).trim() : "";
        if (cn) push(cn, lnRaw || null);
      }
    }
  };
  scan(o.competencies);
  scan(o.recommendedCompetencyLevels);
  return rows;
}

/** `Competency.name` strings referenced by a persona (documentation closure / pruning). */
export function personaReferencedCompetencyNames(persona: unknown): string[] {
  const s = new Set<string>();
  for (const r of personaCompetencyDisplayRefs(persona)) {
    const n = String(r.competencyName ?? "").trim();
    if (n) s.add(n);
  }
  return [...s];
}

export function buildIndexes(
  baseline: PracticeBaseline,
  practiceDoc?: unknown,
): { indexes: Indexes; issues: RefIssue[] } {
  const issues: RefIssue[] = [];

  const focusByName = new Map<string, PracticeBaseline["focuses"][number]>();
  for (const f of baseline.focuses ?? []) focusByName.set(f.name, f);

  const alphaByName = new Map<string, PracticeBaseline["alphas"][number]>();
  for (const a of baseline.alphas ?? []) alphaByName.set(a.name, a);

  const activitySpaceByName = new Map<string, PracticeBaseline["activitySpaces"][number]>();
  for (const s of baseline.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) continue;
    activitySpaceByName.set(activitySpaceIdentityKey(s.name), s);
  }

  const competencyByName = new Map<string, PracticeBaseline["competencies"][number]>();
  for (const c of baseline.competencies ?? []) competencyByName.set(c.name, c);

  const personaGroupsInDoc =
    practiceDoc !== undefined && practiceDoc !== null ? collectPersonaGroupNamesFromPracticeDoc(practiceDoc) : null;
  for (const a of baseline.alphas ?? []) {
    if (!focusByName.has(a.focusName)) {
      issues.push({ kind: "missing", type: "Focus", ref: a.focusName, context: `Alpha:${a.name}` });
    }
    const rollup = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (rollup) {
      if (rollup === a.name) {
        issues.push({
          kind: "missing",
          type: "Alpha",
          ref: rollup,
          context: `Alpha:${a.name}(contributesTo: cannot reference self)`,
        });
      } else if (!alphaByName.has(rollup)) {
        issues.push({ kind: "missing", type: "Alpha", ref: rollup, context: `Alpha:${a.name}(contributesTo)` });
      }
    }
    const mapsTo = typeof (a as any).mapsTo === "string" ? String((a as any).mapsTo).trim() : "";
    if (mapsTo) {
      if (mapsTo === a.name) {
        issues.push({
          kind: "missing",
          type: "Alpha",
          ref: mapsTo,
          context: `Alpha:${a.name}(mapsTo: cannot reference self)`,
        });
      } else if (!alphaByName.has(mapsTo)) {
        issues.push({ kind: "missing", type: "Alpha", ref: mapsTo, context: `Alpha:${a.name}(mapsTo)` });
      }
    }
    for (const raw of a.supportingAlphas ?? []) {
      const child = String(raw ?? "").trim();
      if (!child) continue;
      if (child === a.name) {
        issues.push({
          kind: "missing",
          type: "Alpha",
          ref: child,
          context: `Alpha:${a.name}(supportingAlphas: cannot reference self)`,
        });
        continue;
      }
      if (!alphaByName.has(child)) {
        issues.push({ kind: "missing", type: "Alpha", ref: child, context: `Alpha:${a.name}(supportingAlphas)` });
      }
    }
  }
  const checkActivityContribs = (act: any, ctx: string) => {
    for (const comp of act.requiredCompetencies ?? []) {
      if (!competencyByName.has(comp)) {
        issues.push({ kind: "missing", type: "Competency", ref: comp, context: ctx });
      }
    }
    for (const c of act.contributesTo ?? []) {
      const alpha = alphaByName.get(c.alphaName);
      if (!alpha) {
        issues.push({ kind: "missing", type: "Alpha", ref: c.alphaName, context: ctx });
        continue;
      }
      const state = alpha.states.find((st) => st.name === c.stateName);
      if (!state) {
        issues.push({
          kind: "missing",
          type: "AlphaState",
          ref: `${c.alphaName}→${c.stateName}`,
          context: ctx,
        });
      }
    }
  };

  for (const s of baseline.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      checkActivityContribs(s, `Activity:${s.name}`);
      continue;
    }
    if (!focusByName.has(s.focusName)) {
      issues.push({ kind: "missing", type: "Focus", ref: s.focusName, context: `ActivitySpace:${s.name}` });
    }
    for (const comp of s.requiredCompetencies ?? []) {
      if (!competencyByName.has(comp)) {
        issues.push({ kind: "missing", type: "Competency", ref: comp, context: `ActivitySpace:${s.name}` });
      }
    }
    for (const c of s.contributesTo ?? []) {
      const alpha = alphaByName.get(c.alphaName);
      if (!alpha) {
        issues.push({ kind: "missing", type: "Alpha", ref: c.alphaName, context: `ActivitySpace:${s.name}` });
        continue;
      }
      const state = alpha.states.find((st) => st.name === c.stateName);
      if (!state) {
        issues.push({
          kind: "missing",
          type: "AlphaState",
          ref: `${c.alphaName}→${c.stateName}`,
          context: `ActivitySpace:${s.name}`,
        });
      }
    }
    if (personaGroupsInDoc) {
      const inv = (s as { involves?: unknown }).involves;
      for (const raw of Array.isArray(inv) ? inv : []) {
        const g = String(raw ?? "").trim();
        if (!g) continue;
        if (!personaGroupsInDoc.has(g)) {
          issues.push({
            kind: "missing",
            type: "PersonaGroup",
            ref: g,
            context: `ActivitySpace:${s.name}(involves)`,
          });
        }
      }
    }
    for (const act of (s as any).activities ?? []) {
      checkActivityContribs(act, `Activity:${act.name} (under ${s.name})`);
    }
  }

  return { indexes: { focusByName, alphaByName, activitySpaceByName, competencyByName }, issues };
}

export function groupByFocus(baseline: PracticeBaseline) {
  const focusByName = new Map<string, PracticeBaseline["focuses"][number]>();
  for (const f of baseline.focuses ?? []) focusByName.set(f.name, f);

  const byFocus = new Map<
    string,
    { focusName: string; focus: PracticeBaseline["focuses"][number] | null; alphas: any[]; activitySpaces: any[] }
  >();
  for (const a of baseline.alphas ?? []) {
    const key = a.focusName;
    const entry = byFocus.get(key) ?? { focusName: key, focus: focusByName.get(key) ?? null, alphas: [], activitySpaces: [] };
    entry.alphas.push(a);
    byFocus.set(key, entry);
  }
  for (const s of baseline.activitySpaces ?? []) {
    const key = s.focusName;
    const entry = byFocus.get(key) ?? { focusName: key, focus: focusByName.get(key) ?? null, alphas: [], activitySpaces: [] };
    entry.activitySpaces.push(s);
    byFocus.set(key, entry);
  }

  const list = Array.from(byFocus.values()).filter((g) => {
    if (g.focusName !== IMPLICIT_FOCUS_NAME) return true;
    return (g.alphas ?? []).length > 0 || (g.activitySpaces ?? []).length > 0;
  });
  const focusOrder = new Map((baseline.focuses ?? []).map((f, i) => [f.name, i] as const));
  list.sort((a, b) => {
    const oa = focusOrder.has(a.focusName) ? (focusOrder.get(a.focusName) as number) : 1000;
    const ob = focusOrder.has(b.focusName) ? (focusOrder.get(b.focusName) as number) : 1000;
    if (oa !== ob) return oa - ob;
    return a.focusName.localeCompare(b.focusName);
  });
  return list;
}

/** Locations of {@link PracticeElement.narratives} trees for readable / PDF summaries. */
export type EmbeddedNarrativeSite = {
  /** Display path such as “Alpha / Adoption / State / Planned”. */
  elementPath: string;
  narratives: Narrative[];
};

function pushEmbeddedNarrativeSite(el: unknown, elementPath: string, out: EmbeddedNarrativeSite[]) {
  if (!el || typeof el !== "object") return;
  const raw = (el as Record<string, unknown>).narratives;
  if (!Array.isArray(raw) || raw.length === 0) return;
  out.push({ elementPath, narratives: raw as Narrative[] });
}

/**
 * Collects {@link Narrative} subtrees embedded on baseline and practice-overlay elements so they can render
 * in a consolidated report section. Uses only structural checks — missing optional fields are fine.
 */
export function collectEmbeddedNarrativesForReadableReport(
  baseline: PracticeBaseline,
  sourceDoc: Record<string, unknown> | null | undefined,
  /** Merged spine types may include overlays not yet on {@link baseline}. */
  mergedNarrativeTypes?: NarrativeType[] | null,
): EmbeddedNarrativeSite[] {
  const out: EmbeddedNarrativeSite[] = [];

  for (const f of baseline.focuses ?? []) pushEmbeddedNarrativeSite(f, `Focus / ${String(f?.name ?? "—")}`, out);

  for (const a of baseline.alphas ?? []) {
    pushEmbeddedNarrativeSite(a, `Alpha / ${String(a?.name ?? "—")}`, out);
    for (const st of a.states ?? []) {
      pushEmbeddedNarrativeSite(st, `Alpha / ${String(a?.name ?? "—")} / State / ${String(st?.name ?? "—")}`, out);
      for (const ch of st.checklist ?? []) {
        pushEmbeddedNarrativeSite(ch, `Alpha / ${String(a?.name ?? "—")} / State / ${String(st?.name ?? "—")} / Checklist / ${String(ch?.name ?? "—")}`, out);
      }
    }
  }

  for (const s of baseline.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      pushEmbeddedNarrativeSite(s, `Activity / ${String((s as { name?: unknown }).name ?? "—")}`, out);
      continue;
    }
    const sn = String((s as { name?: unknown }).name ?? "—");
    pushEmbeddedNarrativeSite(s, `Activity space / ${sn}`, out);
    for (const act of (s as { activities?: PracticeActivity[] }).activities ?? []) {
      pushEmbeddedNarrativeSite(act, `Activity space / ${sn} / Activity / ${String(act?.name ?? "—")}`, out);
    }
  }

  for (const c of baseline.competencies ?? []) {
    pushEmbeddedNarrativeSite(c, `Competency / ${String(c?.name ?? "—")}`, out);
    for (const lvl of c.levels ?? []) {
      pushEmbeddedNarrativeSite(lvl, `Competency / ${String(c?.name ?? "—")} / Level / ${String(lvl?.name ?? "—")}`, out);
    }
  }

  const spineTypes =
    mergedNarrativeTypes && mergedNarrativeTypes.length ? mergedNarrativeTypes : (baseline.narrativeTypes ?? []);
  for (const nt of spineTypes ?? []) {
    pushEmbeddedNarrativeSite(nt, `Narrative type / ${String(nt?.name ?? "—")}`, out);
    for (const gel of nt.narrativeElements ?? []) {
      pushEmbeddedNarrativeSite(gel, `Narrative type / ${String(nt?.name ?? "—")} / Element / ${String(gel?.name ?? "—")}`, out);
    }
  }

  if (!sourceDoc || typeof sourceDoc !== "object") return out;

  for (const p of (sourceDoc.patterns as any[]) ?? []) {
    pushEmbeddedNarrativeSite(p, `Pattern / ${String(p?.name ?? "—")}`, out);
    for (const pv of p.patternViews ?? []) {
      pushEmbeddedNarrativeSite(pv, `Pattern / ${String(p?.name ?? "—")} / Pattern view / ${String(pv?.name ?? "—")}`, out);
      for (const inst of Array.isArray((pv as { alphaInstances?: unknown }).alphaInstances)
        ? ((pv as { alphaInstances?: unknown[] }).alphaInstances ?? [])
        : []) {
        if (!inst || typeof inst !== "object") continue;
        pushEmbeddedNarrativeSite(
          inst,
          `Pattern / ${String(p?.name ?? "—")} / Pattern view / ${String(pv?.name ?? "—")} / Alpha instance / ${String((inst as { name?: unknown }).name ?? "—")}`,
          out,
        );
        for (const ev of Array.isArray((inst as { evidenceBy?: unknown }).evidenceBy)
          ? ((inst as { evidenceBy?: unknown[] }).evidenceBy ?? [])
          : []) {
          if (!ev || typeof ev !== "object") continue;
          pushEmbeddedNarrativeSite(
            ev,
            `Pattern / ${String(p?.name ?? "—")} / Pattern view / ${String(pv?.name ?? "—")} / Evidence / ${String((ev as { name?: unknown }).name ?? "—")}`,
            out,
          );
        }
      }
    }
  }

  for (const act of (sourceDoc.activities as any[]) ?? []) {
    pushEmbeddedNarrativeSite(act, `Activity / ${String(act?.name ?? "—")}`, out);
  }

  for (const wp of (sourceDoc.workProducts as any[]) ?? []) {
    pushEmbeddedNarrativeSite(wp, `Work product / ${String(wp?.name ?? "—")}`, out);
    for (const lod of wp.levelsOfDetail ?? []) {
      pushEmbeddedNarrativeSite(lod, `Work product / ${String(wp?.name ?? "—")} / Level of detail / ${String(lod?.name ?? "—")}`, out);
      for (const ch of lod.checklist ?? []) {
        pushEmbeddedNarrativeSite(
          ch,
          `Work product / ${String(wp?.name ?? "—")} / Level of detail / ${String(lod?.name ?? "—")} / Checklist / ${String(ch?.name ?? "—")}`,
          out,
        );
      }
    }
  }

  for (const per of (sourceDoc.personas as any[]) ?? []) {
    pushEmbeddedNarrativeSite(per, `Persona / ${String(per?.name ?? "—")}`, out);
  }
  for (const pg of (sourceDoc.personaGroups as any[]) ?? []) {
    pushEmbeddedNarrativeSite(pg, `Persona group / ${String(pg?.name ?? "—")}`, out);
  }

  pushEmbeddedNarrativeSite(sourceDoc, `Practice`, out);

  return out;
}