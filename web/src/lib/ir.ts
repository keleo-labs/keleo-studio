import type {
  Method,
  Pattern,
  PracticeActivity,
  PracticeBaseline,
  PracticeElement,
  PracticeElementAlias,
  ReadablePracticePreviewDoc,
  RefIssue,
  WorkBreakdown,
  WorkProduct,
} from "@/lib/types";
import {
  isSynthesizedPracticeElementTags,
  synthesizedPracticeElementTags,
} from "@/lib/practiceElementTags";

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
  if (typeof doc.baselinePracticeName === "string") {
    return {
      name: doc.name,
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
    } as PracticeBaseline;
  }
  if (Array.isArray(doc.alphas) && Array.isArray(doc.focuses)) {
    return doc as PracticeBaseline;
  }
  return null;
}

/** Overlay practice-root arrays onto an enriched baseline for alternate readable previews. */
export function readablePracticePreviewFromEnriched(
  doc: unknown,
  enrichedBaseline: PracticeBaseline,
): ReadablePracticePreviewDoc {
  if (!doc || typeof doc !== "object") return enrichedBaseline as ReadablePracticePreviewDoc;
  const d = doc as Record<string, unknown>;
  return {
    ...enrichedBaseline,
    ...(Array.isArray(d.patterns) ? { patterns: d.patterns as Pattern[] } : {}),
    ...(Array.isArray(d.activities) ? { activities: d.activities as PracticeActivity[] } : {}),
    ...(Array.isArray(d.workProducts) ? { workProducts: d.workProducts as WorkProduct[] } : {}),
    ...(Array.isArray(d.workBreakdowns) ? { workBreakdowns: d.workBreakdowns as WorkBreakdown[] } : {}),
    ...(Array.isArray(d.practiceElementAliases)
      ? { practiceElementAliases: d.practiceElementAliases as PracticeElementAlias[] }
      : {}),
  };
}

/** Same enrichment pipeline as readable panels; returns null when the document has no baseline slice. */
export function buildReadablePracticePreviewDoc(doc: unknown): ReadablePracticePreviewDoc | null {
  const baseline = asBaselineDocument(doc);
  if (!baseline) return null;
  const enriched = enrichBaselineWithReferencedWrappers(doc, baselineWithPracticeActivities(doc, baseline));
  return readablePracticePreviewFromEnriched(doc, enriched);
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
      const parentName = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
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

/** True when this object is a legacy flat Activity row (Practice.activities or mixed into activitySpaces). */
export function isPracticeActivityNode(s: any): boolean {
  return s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";
}

export type DeliveryViewActivitySpaceSection = {
  key: string;
  /** Activity-space metadata when defined on the baseline; synthetic stub when only activities reference the space. */
  space: PracticeBaseline["activitySpaces"][number];
  activities: PracticeActivity[];
};

const DELIVERY_VIEW_UNSCOPED_BUCKET = "__delivery_unscoped__";

/**
 * Builds ordered sections for the practitioner delivery view: each ActivitySpace-shaped row frames its bucket;
 * nested `activities`, practice-level `activities`, and legacy activity-shaped rows are merged by space name.
 * Spaces referenced only from activities appear after known rows; activities without `activitySpaceName` appear last.
 */
export function buildDeliveryViewActivitySections(doc: ReadablePracticePreviewDoc): DeliveryViewActivitySpaceSection[] {
  type SpaceRow = PracticeBaseline["activitySpaces"][number];
  type Bucket = { meta: SpaceRow | null; acts: Map<string, PracticeActivity> };
  const buckets = new Map<string, Bucket>();
  const sk = activitySpaceIdentityKey;

  const ensureBucket = (spaceName: string): Bucket => {
    const key = sk(spaceName);
    if (!buckets.has(key)) buckets.set(key, { meta: null, acts: new Map() });
    return buckets.get(key)!;
  };

  const putAct = (spaceName: string | undefined, raw: PracticeActivity) => {
    const an = String(raw?.name ?? "").trim();
    if (!an) return;
    const sn = String(spaceName ?? "").trim();
    if (!sn) {
      let b = buckets.get(DELIVERY_VIEW_UNSCOPED_BUCKET);
      if (!b) {
        b = { meta: null, acts: new Map() };
        buckets.set(DELIVERY_VIEW_UNSCOPED_BUCKET, b);
      }
      if (!b.acts.has(sk(an))) b.acts.set(sk(an), raw);
      return;
    }
    const b = ensureBucket(sn);
    const merged = {
      ...raw,
      activitySpaceName: String(raw.activitySpaceName ?? "").trim() || sn,
    } as PracticeActivity;
    if (!b.acts.has(sk(an))) b.acts.set(sk(an), merged);
  };

  for (const row of doc.activitySpaces ?? []) {
    if (!row || typeof row !== "object") continue;
    if (isPracticeActivityNode(row)) continue;
    const space = row as SpaceRow;
    const n = String(space.name ?? "").trim();
    if (!n) continue;
    const b = ensureBucket(n);
    b.meta = space;
    for (const raw of space.activities ?? []) putAct(n, raw as PracticeActivity);
  }

  for (const row of doc.activitySpaces ?? []) {
    if (!row || typeof row !== "object") continue;
    if (!isPracticeActivityNode(row)) continue;
    putAct(String((row as PracticeActivity).activitySpaceName ?? "").trim(), row as PracticeActivity);
  }

  for (const act of doc.activities ?? []) putAct(String(act.activitySpaceName ?? "").trim(), act);

  const sections: DeliveryViewActivitySpaceSection[] = [];
  let i = 0;
  const emittedBucketKeys = new Set<string>();

  for (const row of doc.activitySpaces ?? []) {
    if (!row || typeof row !== "object") continue;
    if (isPracticeActivityNode(row)) continue;
    const space = row as SpaceRow;
    const n = String(space.name ?? "").trim();
    if (!n) continue;
    emittedBucketKeys.add(sk(n));
    const b = ensureBucket(n);
    const activities = [...b.acts.values()].sort((a, x) => String(a.name).localeCompare(String(x.name)));
    sections.push({ key: `space-${i++}`, space: b.meta ?? space, activities });
  }

  for (const [bk, b] of buckets) {
    if (bk === DELIVERY_VIEW_UNSCOPED_BUCKET) continue;
    if (emittedBucketKeys.has(bk)) continue;
    if (b.acts.size === 0) continue;
    const first = [...b.acts.values()][0];
    const recoveredName = String(b.meta?.name ?? first?.activitySpaceName ?? "").trim();
    const stub = (b.meta ??
      ({
        name: recoveredName,
        description: "",
        focusName: "",
        contributesTo: [],
        requiredCompetencies: [],
      } as SpaceRow)) as SpaceRow;
    const activities = [...b.acts.values()].sort((a, x) => String(a.name).localeCompare(String(x.name)));
    sections.push({ key: `orphan-${i++}`, space: stub, activities });
  }

  const ub = buckets.get(DELIVERY_VIEW_UNSCOPED_BUCKET);
  if (ub && ub.acts.size > 0) {
    sections.push({
      key: `unscoped-${i++}`,
      space: {
        name: "",
        description: "",
        focusName: "",
        contributesTo: [],
        requiredCompetencies: [],
      } as SpaceRow,
      activities: [...ub.acts.values()].sort((a, x) => String(a.name).localeCompare(String(x.name))),
    });
  }

  return sections;
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
      slot.space = { ...slot.space, ...deepClone(rest) };
      if (preservedName) slot.space.name = preservedName;
    }
    const slot = byKey.get(key)!;
    const canonSpaceName = String(slot.space.name ?? "").trim();
    for (const a of nested) {
      if (a?.name) {
        const ac = deepClone(a);
        if (canonSpaceName) ac.activitySpaceName = canonSpaceName;
        slot.activities.set(String(a.name), ac);
      }
    }
  }

  const attach = (act: any) => {
    const parent = String(act?.activitySpaceName ?? "").trim();
    if (!parent || !act?.name) return;
    const slot = ensureSlot(parent, act);
    const canonName = String(slot.space.name ?? "").trim() || parent;
    const actClone = deepClone(act);
    actClone.activitySpaceName = canonName;
    slot.activities.set(String(act.name), actClone);
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
  for (const wb of d.workBreakdowns ?? []) {
    const cx = wb.complexity;
    if (cx && typeof cx === "object") {
      if (cx.valueRisk) walkContrib(cx.valueRisk);
      if (cx.technicalRisk) walkContrib(cx.technicalRisk);
      if (cx.stakeholderEngagement) walkContrib(cx.stakeholderEngagement);
      for (const c of cx.productRisks ?? []) walkContrib(c);
      for (const c of cx.projectRisks ?? []) walkContrib(c);
    }
    for (const task of wb.task ?? []) {
      for (const c of task.contributesTo ?? []) walkContrib(c);
    }
  }

  const rollupAlphaTargets = new Set<string>();
  for (const a of d.alphas ?? []) {
    const r = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (r) rollupAlphaTargets.add(r);
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
  for (const wb of d.workBreakdowns ?? []) {
    for (const task of wb.task ?? []) {
      for (const ap of task.applies ?? []) {
        const n = String(ap?.activitySpaceName ?? "").trim();
        if (n) activitySpaceNames.add(n);
      }
    }
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
    alphaByName.set(a.name, {
      ...a,
      states: (a.states ?? []).map((st) => ({ ...st, checklist: [...(st.checklist ?? [])] })),
    });
    alphaOrder.push(a.name);
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

export function buildIndexes(baseline: PracticeBaseline): { indexes: Indexes; issues: RefIssue[] } {
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

  // basic ref checks
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

