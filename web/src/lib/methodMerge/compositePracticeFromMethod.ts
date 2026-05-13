import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import { mergePracticeElementTags } from "@/lib/practiceElementTags";
import {
  activitySpaceIdentityKey,
  canonicalPracticeElementName,
  canonicalizeActivitySpaces,
  finalizeImplicitFocusPlaceholders,
  isPracticeActivityNode,
  mergeFocusNamePreferNonImplicit,
  propagateDerivedFocusNames,
} from "@/lib/ir";
import { mergePatternViewAlphaStates } from "@/lib/patternView";
import type { LibraryLookupIndex } from "@/lib/library/practiceDependencyResolution";
import { findBaselineInLibrary, findPracticeInLibrary } from "@/lib/library/practiceDependencyResolution";

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

function uniqStrings(xs: string[]): string[] {
  return [...new Set(xs.map((s) => String(s).trim()).filter(Boolean))];
}

function clonedRowWithCanonicalName(row: Record<string, unknown>, key: string): any {
  const c = clone(row);
  if (typeof c.name === "string") c.name = key;
  return c;
}

function mergeDescriptions(a: string, b: string): string {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!y) return x;
  if (!x) return y;
  if (y === x) return x;
  return `${x}\n\n${y}`;
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeKernelPracticeName(name: unknown): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * doc-gen-spec **MergePracticeArray**: a row is an embedded {@link Method} when it carries an object
 * `baselinePractice` (vs extension {@link Practice} using `baselinePracticeName` only).
 */
export function isEmbeddedMethodAggregate(v: unknown): v is Method {
  if (!isPlainRecord(v)) return false;
  const bp = v.baselinePractice;
  return bp !== null && typeof bp === "object" && !Array.isArray(bp);
}

/** Scalar / nullable “no value”: overlay may fill without clobbering an existing baseline value. */
function isVacantScalar(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function isContributionsArray(xs: unknown[]): boolean {
  if (xs.length === 0) return true;
  const s = xs[0];
  return isPlainRecord(s) && typeof s.alphaName === "string";
}

/** Key for {@link NarrativeContext} rows (canonical + interchange keys). */
function narrativeContextMergeKey(raw: unknown): string | null {
  if (!isPlainRecord(raw)) return null;
  const nm =
    typeof raw.narrativeElementName === "string"
      ? raw.narrativeElementName.trim()
      : typeof (raw as { narrativeElement?: unknown }).narrativeElement === "string"
        ? String((raw as { narrativeElement: unknown }).narrativeElement).trim()
        : "";
  if (!nm) return null;
  const seq = Number(raw.seq ?? 0) || 0;
  return `${nm}::${seq}`;
}

function narrativeContextMergeProse(prev: Record<string, unknown>, next: Record<string, unknown>): string {
  const pick = (o: Record<string, unknown>): string =>
    typeof o.context === "string" && o.context.trim()
      ? o.context.trim()
      : typeof o.content === "string" && o.content.trim()
        ? o.content.trim()
        : typeof o.narrativeContext === "string" && o.narrativeContext.trim()
          ? String(o.narrativeContext).trim()
          : typeof o.body === "string" && o.body.trim()
            ? String(o.body).trim()
            : typeof o.text === "string" && o.text.trim()
              ? String(o.text).trim()
              : typeof o.description === "string" && o.description.trim()
                ? String(o.description).trim()
                : "";
  return mergeDescriptions(pick(prev), pick(next));
}

function mergeNarrativeContextsAdditive(base: any[], overlay: any[]): any[] {
  const byKey = new Map<string, Record<string, unknown>>();
  const put = (x: unknown, initial: boolean) => {
    if (!isPlainRecord(x)) return;
    const k = narrativeContextMergeKey(x);
    if (!k) return;
    if (initial) {
      byKey.set(k, clone(x) as Record<string, unknown>);
      return;
    }
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, clone(x) as Record<string, unknown>);
      return;
    }
    byKey.set(k, mergeNarrativeContextRows(prev, x as Record<string, unknown>));
  };
  for (const x of base ?? []) put(x, true);
  for (const x of overlay ?? []) put(x, false);
  return [...byKey.values()].sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

function mergeNarrativeContextRows(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const stripProse = (o: Record<string, unknown>) => {
    const c = clone(o) as Record<string, unknown>;
    delete c.context;
    delete c.content;
    delete c.narrativeContext;
    delete c.body;
    delete c.text;
    delete c.description;
    return c;
  };
  const merged = mergePracticeElementRecords(stripProse(prev), stripProse(next));
  merged.context = narrativeContextMergeProse(prev, next);
  return merged;
}

function narrativeTreeKey(raw: unknown): string | null {
  if (!isPlainRecord(raw)) return null;
  const nn = typeof raw.narrativeName === "string" ? raw.narrativeName.trim() : "";
  if (nn) return nn;
  const nm = typeof raw.name === "string" ? raw.name.trim() : "";
  return nm || null;
}

/** Exported for method builder: merge narrative arrays by key, combining same-named narratives. */
export function mergeNarrativesAdditive(base: any[], overlay: any[]): any[] {
  const byKey = new Map<string, any>();
  for (const x of base ?? []) {
    const k = narrativeTreeKey(x);
    if (k) byKey.set(k, clone(x));
  }
  for (const x of overlay ?? []) {
    const k = narrativeTreeKey(x);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, clone(x));
    else {
      const prev = byKey.get(k);
      byKey.set(
        k,
        mergePracticeElementRecords(prev as Record<string, unknown>, x as Record<string, unknown>),
      );
    }
  }
  return [...byKey.values()];
}

function concatArraysDedupePrimitives(base: unknown[], overlay: unknown[]): unknown[] {
  const out: unknown[] = [...base, ...overlay];
  const allPrimitive = out.every(
    (x) => x === null || x === undefined || ["string", "number", "boolean"].includes(typeof x),
  );
  if (allPrimitive) {
    const seen = new Set<string>();
    const acc: unknown[] = [];
    for (const x of out) {
      const k =
        typeof x === "string" ? `s:${String(x)}` : x === undefined ? "undef" : x === null ? "null" : `p:${typeof x}:${String(x)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      acc.push(x);
    }
    return acc;
  }
  const jsonSeen = new Set<string>();
  return out.filter((x) => {
    const k = JSON.stringify(x);
    if (jsonSeen.has(k)) return false;
    jsonSeen.add(k);
    return true;
  });
}

/** When every entry has `.name`, merge rows by name with {@link mergePracticeElementRecords}; else concat+dedupe. */
function mergeArrayFieldValues(base: unknown[], overlay: unknown[], fieldKey: string): unknown[] {
  if (!overlay.length) return base.map((x) => clone(x));
  if (!base.length) return overlay.map((x) => clone(x));
  if ((fieldKey === "contributesTo" || fieldKey.endsWith("Contributes")) && isContributionsArray(base) && isContributionsArray(overlay)) {
    return mergeContribs(base as { alphaName: string; stateName: string }[], overlay as { alphaName: string; stateName: string }[]);
  }
  const sampleBase = base.find(isPlainRecord) as Record<string, unknown> | undefined;
  const sampleOver = overlay.find(isPlainRecord) as Record<string, unknown> | undefined;
  const canNameKey =
    isPlainRecord(sampleBase) &&
    typeof sampleBase.name === "string" &&
    String(sampleBase.name).trim() !== "" &&
    isPlainRecord(sampleOver) &&
    typeof sampleOver.name === "string" &&
    String(sampleOver.name).trim() !== "";
  if (canNameKey) {
    const byName = new Map<string, any>();
    for (const row of base) {
      if (!isPlainRecord(row) || typeof row.name !== "string" || !row.name.trim()) continue;
      const k = canonicalPracticeElementName(row.name);
      if (!k) continue;
      byName.set(k, clonedRowWithCanonicalName(row, k));
    }
    for (const row of overlay) {
      if (!isPlainRecord(row) || typeof row.name !== "string" || !row.name.trim()) continue;
      const k = canonicalPracticeElementName(row.name);
      if (!k) continue;
      if (byName.has(k)) {
        const mergedRow = mergePracticeElementRecords(byName.get(k) as Record<string, unknown>, row as Record<string, unknown>);
        mergedRow.name = k;
        byName.set(k, mergedRow);
      } else {
        byName.set(k, clonedRowWithCanonicalName(row as Record<string, unknown>, k));
      }
    }
    return [...byName.values()];
  }
  const workProductShape = (xs: unknown[]) =>
    xs.some((x) => isPlainRecord(x) && typeof (x as Record<string, unknown>).workProductName === "string");
  if (
    fieldKey === "worksOn" &&
    workProductShape(base) &&
    workProductShape(overlay) &&
    base.every(isPlainRecord) &&
    overlay.every(isPlainRecord)
  ) {
    const key = (r: Record<string, unknown>) =>
      `${String(r.workProductName ?? "").trim()}::${String(r.levelOfDetailName ?? "").trim()}`;
    const map = new Map<string, Record<string, unknown>>();
    for (const x of base) map.set(key(x as Record<string, unknown>), clone(x) as Record<string, unknown>);
    for (const x of overlay as Record<string, unknown>[]) {
      const kk = key(x);
      if (kk === "::") continue;
      if (!map.has(kk)) map.set(kk, clone(x) as Record<string, unknown>);
      else map.set(kk, mergePracticeElementRecords(map.get(kk)!, x));
    }
    return [...map.values()];
  }
  const levelShape = (xs: unknown[]) =>
    xs.some((x) => isPlainRecord(x) && typeof (x as Record<string, unknown>).competencyName === "string");
  if (
    fieldKey === "recommendedCompetencyLevels" &&
    levelShape(base) &&
    levelShape(overlay) &&
    base.every(isPlainRecord) &&
    overlay.every(isPlainRecord)
  ) {
    const keyRef = (r: Record<string, unknown>) =>
      `${String(r.competencyName ?? "").trim()}::${String(r.competencyLevelName ?? "").trim()}`;
    const map = new Map<string, Record<string, unknown>>();
    for (const x of base) map.set(keyRef(x as Record<string, unknown>), clone(x) as Record<string, unknown>);
    for (const x of overlay as Record<string, unknown>[]) {
      const kk = keyRef(x);
      if (kk === "::") continue;
      if (!map.has(kk)) map.set(kk, clone(x) as Record<string, unknown>);
      else map.set(kk, mergePracticeElementRecords(map.get(kk)!, x));
    }
    return [...map.values()];
  }
  return concatArraysDedupePrimitives(base, overlay).map((x) => clone(x));
}

/**
 * Overlay merges into the accumulating document: **`base`** is the merged state of all strictly **earlier**
 * practice layers (**{@link PracticeBaseline}** first, then each {@link Practice} extension in hierarchical order —
 * nearest baseline first through to the leaf). The overlay’s `description` is **never adopted** where the same-named
 * element already exists under `base`; other fields union or fill vacuums per keyed merge rules below.
 *
 * NarrativeContexts are the exception — those rows merge prose additively; see {@link mergeNarrativeContextsAdditive}.
 *
 * Nested named arrays (states, checklist, narrative elements, …) recurse with the same **`base`/overlay** rule on
 * each row.
 *
 * Tags merge via {@link mergePracticeElementTags}. Scalars remain except where `isVacantScalar` permits overlay filling.
 */
function mergePracticeElementRecords(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const out = clone(base);

  const mergedTags = mergePracticeElementTags(base.tags, overlay.tags);
  const baseDesc = String(base.description ?? "");

  for (const key of Object.keys(overlay)) {
    if (key === "name") continue;
    if (key === "description" || key === "tags") continue;
    const bv = out[key];
    const ov = overlay[key];

    if (key === "narratives") {
      if (!Array.isArray(ov)) continue;
      out.narratives = mergeNarrativesIncoming(bv, ov);
      continue;
    }
    if (key === "narrativeContexts") {
      if (!Array.isArray(ov)) continue;
      const bArr = Array.isArray(bv) ? bv : [];
      out[key] = mergeNarrativeContextsAdditive(bArr, ov);
      continue;
    }

    const mergedVal = mergeFieldValue(key, bv, ov);
    out[key] = mergedVal as never;
  }

  out.description = baseDesc;
  if (mergedTags !== undefined) out.tags = mergedTags as never;
  else delete out.tags;
  if (typeof out.name === "string") out.name = String(base.name ?? out.name ?? "");
  return out;
}

function mergeNarrativesIncoming(bv: unknown, ov: unknown[]): unknown[] {
  if (!Array.isArray(bv)) return mergeNarrativesAdditive([], ov);
  return mergeNarrativesAdditive(bv, ov);
}

function mergeFieldValue(key: string, bv: unknown, ov: unknown): unknown {
  if (ov === undefined) return bv === undefined ? undefined : clone(bv);

  if (Array.isArray(ov)) {
    const bArr = Array.isArray(bv) ? bv : [];
    return mergeArrayFieldValues(bArr, ov, key);
  }

  if (isPlainRecord(bv) && isPlainRecord(ov)) {
    return mergePracticeElementRecords(bv, ov);
  }

  if (bv === undefined || bv === null) return clone(ov);
  if (isVacantScalar(bv)) return clone(ov);
  /** Keep baseline scalar/object when extension only duplicates type with a substantive baseline value. */
  return clone(bv);
}

function mergePracticeElements<T extends { name: string; description?: string; tags?: unknown }>(base: T, overlay: T): T {
  return mergePracticeElementRecords(base as Record<string, unknown>, overlay as Record<string, unknown>) as T;
}

function mergePracticeElementAliasLists(
  lists: (Practice["practiceElementAliases"] | undefined)[],
): NonNullable<Practice["practiceElementAliases"]> {
  const seen = new Set<string>();
  const out: NonNullable<Practice["practiceElementAliases"]> = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const practiceElementType = String((raw as { practiceElementType?: unknown }).practiceElementType ?? "").trim();
      const practiceElementName = String((raw as { practiceElementName?: unknown }).practiceElementName ?? "").trim();
      const aliasName = String((raw as { aliasName?: unknown }).aliasName ?? "").trim();
      if (!practiceElementType || !practiceElementName || !aliasName) continue;
      const k = `${practiceElementType}\0${practiceElementName}\0${aliasName}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ practiceElementType, practiceElementName, aliasName });
    }
  }
  return out;
}

function mergeChecklists(base: any[], over: any[]): any[] {
  const byName = new Map<string, any>();
  for (const ch of base ?? []) {
    const k = canonicalPracticeElementName(ch?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(ch as Record<string, unknown>, k));
  }
  for (const ch of over ?? []) {
    const k = canonicalPracticeElementName(ch?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const merged = mergePracticeElements(byName.get(k), ch);
      merged.name = k;
      byName.set(k, merged);
    } else {
      byName.set(k, clonedRowWithCanonicalName(ch as Record<string, unknown>, k));
    }
  }
  return [...byName.values()].sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

function mergeStates(
  base: PracticeBaseline["alphas"][number]["states"],
  over: PracticeBaseline["alphas"][number]["states"],
): PracticeBaseline["alphas"][number]["states"] {
  const byName = new Map<string, any>();
  for (const s of base ?? []) {
    const k = canonicalPracticeElementName(s?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(s as Record<string, unknown>, k));
  }
  for (const s of over ?? []) {
    const k = canonicalPracticeElementName(s?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, s),
        name: k,
        seq: s.seq ?? prev.seq,
        checklist: mergeChecklists(prev.checklist ?? [], s.checklist ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(s as Record<string, unknown>, k));
    }
  }
  return [...byName.values()].sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

function contribKey(c: { alphaName: string; stateName: string }) {
  return `${c.alphaName}::${c.stateName}`;
}

function mergeContribs(
  base: { alphaName: string; stateName: string }[],
  over: { alphaName: string; stateName: string }[],
): { alphaName: string; stateName: string }[] {
  const seen = new Set<string>();
  const out: { alphaName: string; stateName: string }[] = [];
  for (const c of [...(base ?? []), ...(over ?? [])]) {
    if (!c?.alphaName) continue;
    const k = contribKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ alphaName: String(c.alphaName), stateName: String(c.stateName ?? "") });
  }
  return out;
}

function mergeAlphas(
  base: PracticeBaseline["alphas"],
  over: PracticeBaseline["alphas"],
): PracticeBaseline["alphas"] {
  const byName = new Map<string, any>();
  for (const a of base ?? []) {
    const k = canonicalPracticeElementName(a?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(a as Record<string, unknown>, k));
  }
  for (const a of over ?? []) {
    const k = canonicalPracticeElementName(a?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      const mergedSupporting = uniqStrings([...(prev.supportingAlphas ?? []), ...(a.supportingAlphas ?? [])]);
      const baselineCt = String(prev.contributesTo ?? "").trim();
      const overlayCt = String(a.contributesTo ?? "").trim();
      const merged: Record<string, unknown> = {
        ...mergePracticeElements(prev, a),
        name: k,
        focusName: mergeFocusNamePreferNonImplicit(prev.focusName, a.focusName),
        contributesTo: baselineCt || overlayCt || undefined,
        states: mergeStates(prev.states ?? [], a.states ?? []),
      };
      if (!merged.contributesTo) delete merged.contributesTo;
      if (mergedSupporting.length) merged.supportingAlphas = mergedSupporting;
      else delete merged.supportingAlphas;
      byName.set(k, merged as PracticeBaseline["alphas"][number]);
    } else {
      byName.set(k, clonedRowWithCanonicalName(a as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

/**
 * After name-wise merge, every alpha with {@link PracticeBaseline}[`alphas`].`contributesTo` is listed
 * on that target rollup alpha's `supportingAlphas` (union with any explicit supportingAlphas).
 */
function aggregateSupportingAlphasFromContributesTo(
  alphas: PracticeBaseline["alphas"],
): PracticeBaseline["alphas"] {
  const list = (alphas ?? []).map((a) => clone(a));
  const byName = new Map<string, (typeof list)[number]>();
  for (const a of list) {
    if (a?.name) byName.set(String(a.name), a);
  }

  const contributorsByParent = new Map<string, string[]>();
  for (const a of list) {
    if (!a?.name) continue;
    const parent = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    const child = String(a.name);
    if (!parent || parent === child) continue;
    if (!byName.has(parent)) continue;
    const arr = contributorsByParent.get(parent) ?? [];
    if (!arr.includes(child)) arr.push(child);
    contributorsByParent.set(parent, arr);
  }

  for (const [parentName, children] of contributorsByParent) {
    const rollup = byName.get(parentName);
    if (!rollup) continue;
    const merged = uniqStrings([...(rollup.supportingAlphas ?? []), ...children]);
    if (merged.length) rollup.supportingAlphas = merged;
    else delete rollup.supportingAlphas;
  }

  return list;
}

function mergeFocuses(base: PracticeBaseline["focuses"], over: PracticeBaseline["focuses"]): PracticeBaseline["focuses"] {
  const byName = new Map<string, any>();
  for (const f of base ?? []) {
    const k = canonicalPracticeElementName(f?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(f as Record<string, unknown>, k));
  }
  for (const f of over ?? []) {
    const k = canonicalPracticeElementName(f?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const merged = mergePracticeElements(byName.get(k), f);
      merged.name = k;
      byName.set(k, merged);
    } else {
      byName.set(k, clonedRowWithCanonicalName(f as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

/** Merge keyed {@link PracticeElement} overlay rows (`name` discriminant), e.g. `AlphaInstanceName` instances. */
function mergeKeyedPracticeOverlayRows(base: any[] | undefined, over: any[] | undefined): any[] {
  const byName = new Map<string, any>();
  for (const row of base ?? []) {
    const k = canonicalPracticeElementName(row?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(row as Record<string, unknown>, k));
  }
  for (const row of over ?? []) {
    const k = canonicalPracticeElementName(row?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const merged = mergePracticeElements(byName.get(k), row);
      merged.name = k;
      byName.set(k, merged);
    } else {
      byName.set(k, clonedRowWithCanonicalName(row as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

type ActSlot = Map<string, any>;

type SpaceSlot = { space: any; activities: ActSlot };

function toSpaceSlotMap(rows: any[], flat: any[]): Map<string, SpaceSlot> {
  const canonical = canonicalizeActivitySpaces(rows, flat);
  const m = new Map<string, SpaceSlot>();
  for (const row of canonical) {
    const nm = activitySpaceIdentityKey(row.name);
    const actMap = new Map<string, any>();
    for (const a of row.activities ?? []) {
      const ak = canonicalPracticeElementName(a?.name);
      if (!ak) continue;
      actMap.set(ak, clonedRowWithCanonicalName(a as Record<string, unknown>, ak));
    }
    const { activities: _a, ...sp } = row;
    m.set(nm, { space: sp, activities: actMap });
  }
  return m;
}

function mergeActivityElements(base: any, over: any): any {
  return {
    ...mergePracticeElements(base, over),
    activitySpaceName: over.activitySpaceName || base.activitySpaceName,
    // Do not use `||`: "Implicit focus" is truthy and would clobber a real focus from the baseline.
    focusName: mergeFocusNamePreferNonImplicit(base.focusName, over.focusName),
    contributesTo: mergeContribs(base.contributesTo ?? [], over.contributesTo ?? []),
    requiredCompetencies: uniqStrings([...(base.requiredCompetencies ?? []), ...(over.requiredCompetencies ?? [])]),
    worksOn: [...(base.worksOn ?? []), ...(over.worksOn ?? [])],
    recommendedCompetencyLevels: [...(base.recommendedCompetencyLevels ?? []), ...(over.recommendedCompetencyLevels ?? [])],
  };
}

function mergeSpaceSlots(prev: SpaceSlot, next: SpaceSlot): SpaceSlot {
  const space = {
    ...mergePracticeElements(prev.space, next.space),
    contributesTo: mergeContribs(prev.space.contributesTo ?? [], next.space.contributesTo ?? []),
    requiredCompetencies: uniqStrings([
      ...(prev.space.requiredCompetencies ?? []),
      ...(next.space.requiredCompetencies ?? []),
    ]),
    involves: uniqStrings([...(prev.space.involves ?? []), ...(next.space.involves ?? [])]),
    focusName: mergeFocusNamePreferNonImplicit(prev.space.focusName, next.space.focusName),
  };
  const activities = new Map(prev.activities);
  for (const [k, v] of next.activities) {
    if (!activities.has(k)) activities.set(k, clonedRowWithCanonicalName(v as Record<string, unknown>, k));
    else {
      const mergedAct = mergeActivityElements(activities.get(k)!, v);
      mergedAct.name = k;
      activities.set(k, mergedAct);
    }
  }
  return { space, activities };
}

function mergeSpaceSlotMaps(base: Map<string, SpaceSlot>, over: Map<string, SpaceSlot>): Map<string, SpaceSlot> {
  const out = new Map(base);
  for (const [k, v] of over) {
    if (!out.has(k)) out.set(k, { space: clone(v.space), activities: new Map(v.activities) });
    else out.set(k, mergeSpaceSlots(out.get(k)!, v));
  }
  return out;
}

function collectSpaceKeyOrder(prefixRows: any[], overlays: Practice[]): string[] {
  const order: string[] = [];
  const dedupe = new Set<string>();
  const pushNames = (rows: any[]) => {
    for (const r of rows ?? []) {
      if (!r?.name || isPracticeActivityNode(r)) continue;
      const k = activitySpaceIdentityKey(r.name);
      if (dedupe.has(k)) continue;
      dedupe.add(k);
      order.push(k);
    }
  };
  pushNames(prefixRows);
  for (const p of overlays ?? []) pushNames(p.activitySpaces ?? []);
  return order;
}

function slotMapToRows(m: Map<string, SpaceSlot>, keyOrder: string[]): any[] {
  const seen = new Set(keyOrder);
  const tail = [...m.keys()].filter((k) => !seen.has(k)).sort((a, b) => a.localeCompare(b));
  const keys = [...keyOrder.filter((k) => m.has(k)), ...tail];
  return keys.map((k) => {
    const { space, activities } = m.get(k)!;
    const list = [...activities.values()];
    return list.length ? { ...space, activities: list } : { ...space };
  });
}

function mergeCompetencies(
  base: PracticeBaseline["competencies"],
  over: PracticeBaseline["competencies"],
): PracticeBaseline["competencies"] {
  const byName = new Map<string, any>();
  const levelKey = (lv: any) => `${Number(lv.level) || 0}:${String(lv.name ?? "").trim()}`;
  for (const c of base ?? []) {
    const k = canonicalPracticeElementName(c?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(c as Record<string, unknown>, k));
  }
  for (const c of over ?? []) {
    const k = canonicalPracticeElementName(c?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      const levelMap = new Map<string, any>();
      for (const lv of prev.levels ?? []) {
        const lk = levelKey(lv);
        const lkName = canonicalPracticeElementName(lv?.name);
        if (!lkName) continue;
        levelMap.set(lk, clonedRowWithCanonicalName(lv as Record<string, unknown>, lkName));
      }
      for (const lv of c.levels ?? []) {
        const lk = levelKey(lv);
        const lkName = canonicalPracticeElementName(lv?.name);
        if (!lkName) continue;
        if (levelMap.has(lk)) {
          const mergedLv = mergePracticeElements(levelMap.get(lk), lv);
          mergedLv.name = lkName;
          levelMap.set(lk, mergedLv);
        } else {
          levelMap.set(lk, clonedRowWithCanonicalName(lv as Record<string, unknown>, lkName));
        }
      }
      const mergedRow = mergePracticeElements(prev, c) as Record<string, unknown>;
      mergedRow.name = k;
      mergedRow.levels = [...levelMap.values()].sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
      byName.set(k, mergedRow);
    } else {
      byName.set(k, clonedRowWithCanonicalName(c as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mergeLevelsOfDetail(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const x of a ?? []) {
    const k = canonicalPracticeElementName(x?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(x as Record<string, unknown>, k));
  }
  for (const x of b ?? []) {
    const k = canonicalPracticeElementName(x?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, x),
        name: k,
        seq: x.seq ?? prev.seq,
        contributesTo: mergeContribs(prev.contributesTo ?? [], x.contributesTo ?? []),
        checklist: mergeChecklists(prev.checklist ?? [], x.checklist ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(x as Record<string, unknown>, k));
    }
  }
  return [...byName.values()].sort((p, q) => (Number(p.seq) || 0) - (Number(q.seq) || 0));
}

function mergeWorkProducts(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const wp of a ?? []) {
    const k = canonicalPracticeElementName(wp?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(wp as Record<string, unknown>, k));
  }
  for (const wp of b ?? []) {
    const k = canonicalPracticeElementName(wp?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, wp),
        name: k,
        levelsOfDetail: mergeLevelsOfDetail(prev.levelsOfDetail ?? [], wp.levelsOfDetail ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(wp as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mergeNarrativeElements(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const item of a ?? []) {
    const k = canonicalPracticeElementName(item?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(item as Record<string, unknown>, k));
  }
  for (const item of b ?? []) {
    const k = canonicalPracticeElementName(item?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const merged = mergePracticeElements(byName.get(k), item);
      merged.name = k;
      byName.set(k, merged);
    } else {
      byName.set(k, clonedRowWithCanonicalName(item as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

/** Merge spine type lists keyed by {@link NarrativeType.name}; used by composites and readable panels. */
export function mergeNarrativeTypes(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const nt of a ?? []) {
    const k = canonicalPracticeElementName(nt?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(nt as Record<string, unknown>, k));
  }
  for (const nt of b ?? []) {
    const k = canonicalPracticeElementName(nt?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, nt),
        name: k,
        narrativeElements: mergeNarrativeElements(prev.narrativeElements ?? [], nt.narrativeElements ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(nt as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mergePersonas(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const p of a ?? []) {
    const k = canonicalPracticeElementName(p?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(p as Record<string, unknown>, k));
  }
  for (const p of b ?? []) {
    const k = canonicalPracticeElementName(p?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, p),
        name: k,
        competencies: [...(prev.competencies ?? []), ...(p.competencies ?? [])],
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(p as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mergePersonaGroups(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pg of a ?? []) {
    const k = canonicalPracticeElementName(pg?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(pg as Record<string, unknown>, k));
  }
  for (const pg of b ?? []) {
    const k = canonicalPracticeElementName(pg?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, pg),
        name: k,
        personaNames: uniqStrings([...(prev.personaNames ?? []), ...(pg.personaNames ?? [])]),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(pg as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mergePatternViewAlphaInstances(a: any[] | undefined, b: any[] | undefined): any[] {
  const ident = (row: any): string =>
    canonicalPracticeElementName(row?.instanceName) || canonicalPracticeElementName(row?.name) || "";

  const mergeEvidenceRows = (
    prevRow: Record<string, unknown> | undefined,
    nextRow: Record<string, unknown> | undefined,
  ): unknown[] => {
    const seen = new Set<string>();
    const out: unknown[] = [];
    const consider = (x: unknown) => {
      if (!x || typeof x !== "object") return;
      const o = x as Record<string, unknown>;
      const i1 = String(o.instanceName ?? "").trim();
      const i2 = String(o.workProductName ?? "").trim();
      const i3 = String(o.levelOfDetailName ?? "").trim();
      if (!i1 && !i2 && !i3) return;
      const k = `${i1}::${i2}::${i3}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(x);
    };
    for (const x of (prevRow?.evidenceBy as unknown[]) ?? []) consider(x);
    for (const x of (nextRow?.evidenceBy as unknown[]) ?? []) consider(x);
    return out;
  };

  const byKey = new Map<string, any>();
  for (const row of a ?? []) {
    const k = ident(row);
    if (!k) continue;
    byKey.set(k, clonedRowWithCanonicalName(row as Record<string, unknown>, canonicalPracticeElementName(row?.name) || k));
  }
  for (const row of b ?? []) {
    const k = ident(row);
    if (!k) continue;
    if (byKey.has(k)) {
      const prev = byKey.get(k);
      const merged = mergePracticeElements(prev, row);
      merged.instanceName = String(row.instanceName ?? prev.instanceName ?? k).trim() || k;
      merged.name = canonicalPracticeElementName(merged.name) || k;
      const ev = mergeEvidenceRows(prev as Record<string, unknown>, row as Record<string, unknown>);
      if (ev.length) merged.evidenceBy = ev;
      else delete merged.evidenceBy;
      byKey.set(k, merged);
    } else {
      byKey.set(k, clonedRowWithCanonicalName(row as Record<string, unknown>, canonicalPracticeElementName(row?.name) || k));
    }
  }
  return [...byKey.values()];
}

function mergePatternViews(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pv of a ?? []) {
    const k = canonicalPracticeElementName(pv?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(pv as Record<string, unknown>, k));
  }
  for (const pv of b ?? []) {
    const k = canonicalPracticeElementName(pv?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      const prevNe = String(prev.narrativeElementName ?? "").trim();
      const overlayNe = String(pv.narrativeElementName ?? "").trim();
      byName.set(k, {
        ...mergePracticeElements(prev, pv),
        name: k,
        seq: pv.seq ?? prev.seq,
        ...(prevNe || overlayNe ? { narrativeElementName: prevNe || overlayNe } : {}),
        activitySpaces: uniqStrings([...(prev.activitySpaces ?? []), ...(pv.activitySpaces ?? [])]),
        activities: uniqStrings([...(prev.activities ?? []), ...(pv.activities ?? [])]),
        alphaStates: mergePatternViewAlphaStates(prev.alphaStates ?? [], pv.alphaStates ?? []),
        alphaInstances: mergePatternViewAlphaInstances(prev.alphaInstances ?? [], pv.alphaInstances ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(pv as Record<string, unknown>, k));
    }
  }
  return [...byName.values()].sort((p, q) => (Number(p.seq) || 0) - (Number(q.seq) || 0));
}

function mergePatterns(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pat of a ?? []) {
    const k = canonicalPracticeElementName(pat?.name);
    if (!k) continue;
    byName.set(k, clonedRowWithCanonicalName(pat as Record<string, unknown>, k));
  }
  for (const pat of b ?? []) {
    const k = canonicalPracticeElementName(pat?.name);
    if (!k) continue;
    if (byName.has(k)) {
      const prev = byName.get(k);
      const prevNt = String(prev.narrativeTypeName ?? "").trim();
      const overlayNt = String(pat.narrativeTypeName ?? "").trim();
      byName.set(k, {
        ...mergePracticeElements(prev, pat),
        name: k,
        ...(prevNt || overlayNt ? { narrativeTypeName: prevNt || overlayNt } : {}),
        patternViews: mergePatternViews(prev.patternViews ?? [], pat.patternViews ?? []),
      });
    } else {
      byName.set(k, clonedRowWithCanonicalName(pat as Record<string, unknown>, k));
    }
  }
  return [...byName.values()];
}

function mapByPracticeElementName<T extends { name?: unknown }>(rows: T[] | undefined): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows ?? []) {
    const n = String(r?.name ?? "").trim();
    if (n) m.set(n, r);
  }
  return m;
}

function baselineKernelDescription(el: { description?: unknown } | null | undefined): string {
  return String(el?.description ?? "");
}

/**
 * Hierarchy depth **0**: re-stamps `description` from the kernel **`method.baselinePractice`** onto every same-named
 * merged practice element row. Runs last so intermediate clones/spreads ({@link aggregateSupportingAlphasFromContributesTo},
 * focus placeholders) cannot leave lower-layer prose on identities defined under the baseline artifact.
 *
 * **Depths 1…n** (“extension” practices) rely on pairwise merge ordering — each {@link mergePracticeElementRecords}
 * preserves the accumulator (`base`), i.e. earlier hierarchy levels, for `description`.
 *
 * @param merged Practice-shaped merged document (mutated in place).
 */
function applyBaselineKernelPracticeDescriptions(merged: Record<string, unknown>, kernel: PracticeBaseline): void {
  const kDoc = kernel as Record<string, unknown>;

  const mergedFocusByName = mapByPracticeElementName((merged.focuses as { name?: unknown }[]) ?? []);
  for (const bf of kernel.focuses ?? []) {
    const n = String(bf?.name ?? "").trim();
    if (!n) continue;
    const row = mergedFocusByName.get(n);
    if (row) (row as { description?: string }).description = baselineKernelDescription(bf);
  }

  const mergedAlphaByName = mapByPracticeElementName((merged.alphas as { name?: unknown }[]) ?? []);
  for (const ba of kernel.alphas ?? []) {
    const an = String(ba?.name ?? "").trim();
    if (!an) continue;
    const a = mergedAlphaByName.get(an);
    if (!a) continue;
    (a as { description?: string }).description = baselineKernelDescription(ba);

    const baselineStateByName = mapByPracticeElementName((ba.states ?? []) as { name?: unknown }[]);
    for (const st of (a as { states?: { name?: unknown; checklist?: { name?: unknown }[] }[] }).states ?? []) {
      const sn = String(st?.name ?? "").trim();
      if (!sn) continue;
      const bs = baselineStateByName.get(sn);
      if (!bs) continue;
      (st as { description?: string }).description = baselineKernelDescription(bs as { description?: unknown });
      const baselineChByName = mapByPracticeElementName(
        ((bs as { checklist?: { name?: unknown }[] }).checklist ?? []) as { name?: unknown }[],
      );
      for (const ch of st.checklist ?? []) {
        const cn = String(ch?.name ?? "").trim();
        if (!cn) continue;
        const bch = baselineChByName.get(cn);
        if (bch)
          (ch as { description?: string }).description = baselineKernelDescription(bch as { description?: unknown });
      }
    }
  }

  const baselineSpaceByKey = new Map<string, PracticeBaseline["activitySpaces"][number]>();
  for (const bs of kernel.activitySpaces ?? []) {
    if (isPracticeActivityNode(bs)) continue;
    const key = activitySpaceIdentityKey(bs.name);
    if (key) baselineSpaceByKey.set(key, bs);
  }
  for (const s of (merged.activitySpaces as PracticeBaseline["activitySpaces"]) ?? []) {
    if (isPracticeActivityNode(s)) continue;
    const sk = activitySpaceIdentityKey((s as { name?: unknown }).name);
    if (!sk || !baselineSpaceByKey.has(sk)) continue;
    const bsRow = baselineSpaceByKey.get(sk)!;
    (s as { description?: string }).description = baselineKernelDescription(bsRow);
    const baselineActByName = mapByPracticeElementName((bsRow.activities ?? []) as { name?: unknown }[]);
    for (const act of (s as { activities?: { name?: unknown }[] }).activities ?? []) {
      const actName = String(act?.name ?? "").trim();
      if (!actName) continue;
      const ba = baselineActByName.get(actName);
      if (ba)
        (act as { description?: string }).description = baselineKernelDescription(ba as { description?: unknown });
    }
  }

  const mergedCompByName = mapByPracticeElementName((merged.competencies as { name?: unknown }[]) ?? []);
  for (const bc of kernel.competencies ?? []) {
    const cn = String(bc?.name ?? "").trim();
    if (!cn) continue;
    const c = mergedCompByName.get(cn);
    if (!c) continue;
    (c as { description?: string }).description = baselineKernelDescription(bc);
    const baselineLevelByKey = new Map<string, { description?: unknown }>();
    for (const bl of bc.levels ?? []) {
      baselineLevelByKey.set(`${Number(bl.level) || 0}:${String(bl.name ?? "").trim()}`, bl);
    }
    for (const lv of (c as { levels?: { level?: unknown; name?: unknown }[] }).levels ?? []) {
      const lk = `${Number(lv.level) || 0}:${String(lv.name ?? "").trim()}`;
      const bl = baselineLevelByKey.get(lk);
      if (bl) (lv as { description?: string }).description = baselineKernelDescription(bl);
    }
  }

  const mergedNtByName = mapByPracticeElementName((merged.narrativeTypes as { name?: unknown }[]) ?? []);
  for (const bnt of kernel.narrativeTypes ?? []) {
    const nn = String(bnt?.name ?? "").trim();
    if (!nn) continue;
    const nt = mergedNtByName.get(nn);
    if (!nt) continue;
    (nt as { description?: string }).description = baselineKernelDescription(bnt);
    const baselineNeByName = mapByPracticeElementName((bnt.narrativeElements ?? []) as { name?: unknown }[]);
    for (const ne of (nt as { narrativeElements?: { name?: unknown }[] }).narrativeElements ?? []) {
      const en = String(ne?.name ?? "").trim();
      if (!en) continue;
      const bne = baselineNeByName.get(en);
      if (bne)
        (ne as { description?: string }).description = baselineKernelDescription(bne as { description?: unknown });
    }
  }

  const baselinePatterns = Array.isArray(kDoc.patterns)
    ? (kDoc.patterns as { name?: unknown; description?: unknown; patternViews?: { name?: unknown }[] }[])
    : [];
  const mergedPatByName = mapByPracticeElementName((merged.patterns as { name?: unknown }[]) ?? []);
  for (const bp of baselinePatterns) {
    const pn = String(bp?.name ?? "").trim();
    if (!pn) continue;
    const p = mergedPatByName.get(pn);
    if (!p) continue;
    (p as { description?: string }).description = baselineKernelDescription(bp);
    const baselinePvByName = mapByPracticeElementName(bp.patternViews ?? []);
    for (const pv of (p as { patternViews?: { name?: unknown }[] }).patternViews ?? []) {
      const vn = String(pv?.name ?? "").trim();
      if (!vn) continue;
      const bpv = baselinePvByName.get(vn);
      if (bpv)
        (pv as { description?: string }).description = baselineKernelDescription(bpv as { description?: unknown });
    }
  }

  const baselineWps = Array.isArray(kDoc.workProducts)
    ? (kDoc.workProducts as {
        name?: unknown;
        description?: unknown;
        levelsOfDetail?: { name?: unknown; checklist?: { name?: unknown }[] }[];
      }[])
    : [];
  const mergedWpByName = mapByPracticeElementName((merged.workProducts as { name?: unknown }[]) ?? []);
  for (const bwp of baselineWps) {
    const wn = String(bwp?.name ?? "").trim();
    if (!wn) continue;
    const wp = mergedWpByName.get(wn);
    if (!wp) continue;
    (wp as { description?: string }).description = baselineKernelDescription(bwp);
    const baselineLodByName = mapByPracticeElementName(bwp.levelsOfDetail ?? []);
    for (const lod of (wp as { levelsOfDetail?: { name?: unknown; checklist?: { name?: unknown }[] }[] })
      .levelsOfDetail ?? []) {
      const ln = String(lod?.name ?? "").trim();
      if (!ln) continue;
      const blod = baselineLodByName.get(ln);
      if (!blod) continue;
      (lod as { description?: string }).description = baselineKernelDescription(blod as { description?: unknown });
      const baselineLodChByName = mapByPracticeElementName(
        ((blod as { checklist?: { name?: unknown }[] }).checklist ?? []) as { name?: unknown }[],
      );
      for (const ch of lod.checklist ?? []) {
        const chn = String(ch?.name ?? "").trim();
        if (!chn) continue;
        const bch = baselineLodChByName.get(chn);
        if (bch)
          (ch as { description?: string }).description = baselineKernelDescription(bch as { description?: unknown });
      }
    }
  }

  const baselinePersonas = Array.isArray(kDoc.personas)
    ? (kDoc.personas as { name?: unknown; description?: unknown }[])
    : [];
  const mergedPersonaByName = mapByPracticeElementName((merged.personas as { name?: unknown }[]) ?? []);
  for (const bp of baselinePersonas) {
    const n = String(bp?.name ?? "").trim();
    if (!n) continue;
    const row = mergedPersonaByName.get(n);
    if (row) (row as { description?: string }).description = baselineKernelDescription(bp);
  }

  const baselineGroups = Array.isArray(kDoc.personaGroups)
    ? (kDoc.personaGroups as { name?: unknown; description?: unknown }[])
    : [];
  const mergedPgByName = mapByPracticeElementName((merged.personaGroups as { name?: unknown }[]) ?? []);
  for (const bg of baselineGroups) {
    const n = String(bg?.name ?? "").trim();
    if (!n) continue;
    const row = mergedPgByName.get(n);
    if (row) (row as { description?: string }).description = baselineKernelDescription(bg);
  }
}

type ExtensionMergeAccumulator = {
  out: Record<string, unknown>;
  slotMap: Map<string, SpaceSlot>;
};

/** MergeMethod / MergePractice: load a differing kernel baseline into the accumulator (activity grid + keyed arrays). */
function mergeSecondaryBaselineKernel(acc: ExtensionMergeAccumulator, secondary: PracticeBaseline): void {
  if (
    normalizeKernelPracticeName(secondary.name) === normalizeKernelPracticeName(acc.out.mergesBaselinePracticeName)
  )
    return;
  const sdoc = secondary as Record<string, unknown>;
  acc.slotMap = mergeSpaceSlotMaps(acc.slotMap, toSpaceSlotMap(secondary.activitySpaces ?? [], []));
  acc.out.focuses = mergeFocuses(acc.out.focuses as any, secondary.focuses ?? []);
  acc.out.alphas = mergeAlphas(acc.out.alphas as any, secondary.alphas ?? []);
  acc.out.competencies = mergeCompetencies(acc.out.competencies as any, secondary.competencies ?? []);
  acc.out.authors = uniqStrings([...(acc.out.authors as string[]), ...((secondary.authors ?? []) as string[])]);
  acc.out.keywords = uniqStrings([...(acc.out.keywords as string[]), ...((secondary.keywords ?? []) as string[])]);
  acc.out.workProducts = mergeWorkProducts(acc.out.workProducts as any, (sdoc.workProducts ?? []) as any[]);
  acc.out.narrativeTypes = mergeNarrativeTypes(acc.out.narrativeTypes as any, (sdoc.narrativeTypes ?? []) as any[]);
  acc.out.personas = mergePersonas(acc.out.personas as any, (sdoc.personas ?? []) as any[]);
  acc.out.personaGroups = mergePersonaGroups(
    acc.out.personaGroups as any,
    (sdoc.personaGroups ?? []) as any[],
  );
  acc.out.patterns = mergePatterns(acc.out.patterns as any, (sdoc.patterns ?? []) as any[]);
  const mergedSecondaryAi = mergeKeyedPracticeOverlayRows(
    Array.isArray(acc.out.alphaInstances) ? (acc.out.alphaInstances as any[]) : [],
    Array.isArray(sdoc.alphaInstances) ? (sdoc.alphaInstances as any[]) : [],
  );
  if (mergedSecondaryAi.length) acc.out.alphaInstances = mergedSecondaryAi;
  const mergedSecondaryWpi = mergeKeyedPracticeOverlayRows(
    Array.isArray(acc.out.workProductInstances) ? (acc.out.workProductInstances as any[]) : [],
    Array.isArray(sdoc.workProductInstances) ? (sdoc.workProductInstances as any[]) : [],
  );
  if (mergedSecondaryWpi.length) acc.out.workProductInstances = mergedSecondaryWpi;
  const mergedAle = mergePracticeElementAliasLists([
    Array.isArray(acc.out.practiceElementAliases)
      ? (acc.out.practiceElementAliases as NonNullable<Practice["practiceElementAliases"]>)
      : undefined,
    sdoc.practiceElementAliases as Practice["practiceElementAliases"] | undefined,
  ]);
  if (mergedAle.length) acc.out.practiceElementAliases = mergedAle;
  // Do NOT merge secondary baseline narratives into the root - only method's own narratives should appear at root level
}

/** Flatten nested {@link Method} trees to ordered {@link Practice} overlays for swimlane serialization. */
function flattenPracticeLayersForActivitySpaceOrder(items: unknown[]): Practice[] {
  const flat: Practice[] = [];
  const walk = (arr: unknown[]) => {
    for (const raw of arr) {
      if (isEmbeddedMethodAggregate(raw)) walk((raw.practices ?? []) as unknown[]);
      else if (isPlainRecord(raw) && typeof (raw as Practice).name === "string") flat.push(raw as Practice);
    }
  };
  walk(items);
  return flat;
}

/** Activity-space ordering hints from embedded methods whose baseline differs from the composing kernel. */
function collectSecondaryBaselineActivitySpaceRows(items: unknown[], primaryKernelName: string): unknown[] {
  const rows: unknown[] = [];
  const walk = (arr: unknown[]) => {
    for (const raw of arr) {
      if (!isEmbeddedMethodAggregate(raw)) continue;
      const emb = raw;
      if (
        normalizeKernelPracticeName(emb.baselinePractice.name) !== normalizeKernelPracticeName(primaryKernelName)
      ) {
        rows.push(...(emb.baselinePractice.activitySpaces ?? []));
      }
      walk((emb.practices ?? []) as unknown[]);
    }
  };
  walk(items);
  return rows;
}

/** doc-gen-spec **MergePracticeIntoDocument**: one extension {@link Practice} layer (activities + keyed merges). */
function mergeOneExtensionPracticeOntoOut(acc: ExtensionMergeAccumulator, overlayPractice: Practice): void {
  acc.slotMap = mergeSpaceSlotMaps(
    acc.slotMap,
    toSpaceSlotMap(overlayPractice.activitySpaces ?? [], overlayPractice.activities ?? []),
  );
  acc.out.focuses = mergeFocuses(acc.out.focuses as any, overlayPractice.focuses ?? []);
  acc.out.alphas = mergeAlphas(acc.out.alphas as any, overlayPractice.alphas ?? []);
  acc.out.competencies = mergeCompetencies(acc.out.competencies as any, overlayPractice.competencies ?? []);
  acc.out.authors = uniqStrings([...(acc.out.authors as string[]), ...((overlayPractice.authors ?? []) as string[])]);
  acc.out.keywords = uniqStrings([...(acc.out.keywords as string[]), ...((overlayPractice.keywords ?? []) as string[])]);
  acc.out.practiceDependencyNames = uniqStrings([
    ...(acc.out.practiceDependencyNames as string[]),
    ...((overlayPractice.practiceDependencyNames ?? []) as string[]),
  ]);
  acc.out.workProducts = mergeWorkProducts(acc.out.workProducts as any, (overlayPractice.workProducts ?? []) as any[]);
  acc.out.narrativeTypes = mergeNarrativeTypes(
    acc.out.narrativeTypes as any,
    ((overlayPractice as any).narrativeTypes ?? []) as any[],
  );
  acc.out.personas = mergePersonas(acc.out.personas as any, ((overlayPractice as any).personas ?? []) as any[]);
  acc.out.personaGroups = mergePersonaGroups(
    acc.out.personaGroups as any,
    ((overlayPractice as any).personaGroups ?? []) as any[],
  );
  acc.out.patterns = mergePatterns(acc.out.patterns as any, (overlayPractice.patterns ?? []) as any[]);
  const mergedExtAi = mergeKeyedPracticeOverlayRows(
    Array.isArray(acc.out.alphaInstances) ? (acc.out.alphaInstances as any[]) : [],
    Array.isArray((overlayPractice as any).alphaInstances) ? ((overlayPractice as any).alphaInstances as any[]) : [],
  );
  if (mergedExtAi.length) acc.out.alphaInstances = mergedExtAi;
  const mergedExtWpi = mergeKeyedPracticeOverlayRows(
    Array.isArray(acc.out.workProductInstances) ? (acc.out.workProductInstances as any[]) : [],
    Array.isArray((overlayPractice as any).workProductInstances)
      ? ((overlayPractice as any).workProductInstances as any[])
      : [],
  );
  if (mergedExtWpi.length) acc.out.workProductInstances = mergedExtWpi;
  const mergedAle = mergePracticeElementAliasLists([
    Array.isArray(acc.out.practiceElementAliases)
      ? (acc.out.practiceElementAliases as NonNullable<Practice["practiceElementAliases"]>)
      : undefined,
    overlayPractice.practiceElementAliases,
  ]);
  if (mergedAle.length) acc.out.practiceElementAliases = mergedAle;
  if (typeof overlayPractice.updatedAt === "string" && overlayPractice.updatedAt.trim())
    acc.out.updatedAt = overlayPractice.updatedAt;
  // Do NOT merge practice narratives into the root - only method's own narratives should appear at root level
  // Practice narratives are embedded within their respective practice elements
}

/** doc-gen-spec **MergePracticeArray** / recursive **MergeMethod**: embedded methods contribute baseline then child practices. */
function mergePracticeArrayOntoOut(acc: ExtensionMergeAccumulator, items: unknown[]): void {
  for (const raw of items) {
    if (isEmbeddedMethodAggregate(raw)) {
      mergeSecondaryBaselineKernel(acc, raw.baselinePractice);
      mergePracticeArrayOntoOut(acc, (raw.practices ?? []) as unknown[]);
    } else if (isPlainRecord(raw) && typeof (raw as Practice).name === "string") {
      mergeOneExtensionPracticeOntoOut(acc, raw as Practice);
    }
  }
}

/**
 * Checks if a Method needs library resolution (has `baselinePracticeName` or `practiceNames` instead of embedded data).
 */
export function methodNeedsLibraryResolution(method: unknown): boolean {
  if (!method || typeof method !== "object") return false;
  const m = method as any;
  const hasBaselineName = typeof m.baselinePracticeName === "string" && m.baselinePracticeName.trim() !== "";
  const hasPracticeNames = Array.isArray(m.practiceNames) && m.practiceNames.length > 0;
  return hasBaselineName || hasPracticeNames;
}

/**
 * Composes {@link Practice}-shaped output from a {@link Method}: **merge hierarchy** is
 *
 * 1. **`baselinePractice`** (kernel head) seeds the accumulator (`out`). If not embedded, loads from library via `baselinePracticeName`.
 * 2. **`method.practices`** and **`method.practiceNames`** merge as **MergePracticeArray**: plain {@link Practice} rows overlay the composite; embedded
 *    {@link Method} rows (object `baselinePractice`) run **MergeMethod** — differing secondary baselines merge before their
 *    nested `practices` — so dependencies should appear before dependents when built via library resolve.
 *
 * For every merge of rows, {@link mergePracticeElementRecords} is used so **`description` on existing same-named rows
 * follows head-of-hierarchy prose** — later layers cannot override it. Nested collections use the same rule on each named child.
 *
 * Activity spaces flatten {@link Practice.activities}; {@link propagateDerivedFocusNames} /
 * {@link finalizeImplicitFocusPlaceholders} finalize swimlanes on the merged graph; {@link applyBaselineKernelPracticeDescriptions}
 * re-stamps kernel text so incidental clones/spreads cannot leak lower-layer prose for baseline-defined identities.
 *
 * @param method The method to compose. May contain embedded `baselinePractice` and `practices`, or reference them by name.
 * @param library Optional library index for resolving `baselinePracticeName` and `practiceNames`. Required if method uses names instead of embedded data.
 */
export function compositePracticeFromMethod(method: Method, library?: LibraryLookupIndex): Record<string, unknown> {
  const methodAny = method as any;

  // Get baseline - either embedded or load from library
  let baseline: PracticeBaseline | null = null;
  if (method.baselinePractice) {
    baseline = clone(method.baselinePractice);
  } else if (typeof methodAny.baselinePracticeName === "string" && library) {
    const loaded = findBaselineInLibrary(library, methodAny.baselinePracticeName);
    if (!loaded) {
      throw new Error(`Method "${method.name}" references baselinePracticeName "${methodAny.baselinePracticeName}" which was not found in library`);
    }
    baseline = loaded;
  }

  if (!baseline) {
    throw new Error(`Method "${method.name}" is missing required baselinePractice or baselinePracticeName`);
  }
  /**
   * Extension layers only (excludes baseline). Index `0` is closest to the kernel — highest precedence among extensions;
   * the last element is typically the resolved primary leaf practice — lowest precedence.
   */
  let extensionPracticeLayers: Practice[] = [...(method.practices ?? [])];

  // Load practices from library by name if practiceNames is present
  if (library && Array.isArray(methodAny.practiceNames)) {
    const loadedPractices: Practice[] = [];
    for (const name of methodAny.practiceNames) {
      const practiceName = String(name ?? "").trim();
      if (!practiceName) continue;
      const loaded = findPracticeInLibrary(library, practiceName);
      if (loaded) {
        loadedPractices.push(loaded);
      }
    }
    // Append loaded practices after embedded ones (embedded have higher precedence)
    extensionPracticeLayers = [...extensionPracticeLayers, ...loadedPractices];
  }
  /** Embedded baseline-shaped arrays on the Method baseline (optional overlays). */
  const baselineDoc = baseline as Record<string, unknown>;
  const baselineWorkProducts = Array.isArray(baselineDoc.workProducts) ? (baselineDoc.workProducts as any[]) : [];
  const baselinePatterns = Array.isArray(baselineDoc.patterns) ? (baselineDoc.patterns as any[]) : [];
  const baselineNarrativeTypes = Array.isArray(baselineDoc.narrativeTypes) ? (baselineDoc.narrativeTypes as any[]) : [];
  const baselinePersonas = Array.isArray(baselineDoc.personas) ? (baselineDoc.personas as any[]) : [];
  const baselinePersonaGroups = Array.isArray(baselineDoc.personaGroups) ? (baselineDoc.personaGroups as any[]) : [];
  const mergedRootTags = mergePracticeElementTags(method.tags, baseline.tags);
  // Only use the method's own narratives, not baseline or practice narratives
  const methodNarr = Array.isArray((method as Record<string, unknown>).narratives)
    ? ((method as Record<string, unknown>).narratives as unknown[])
    : [];
  const out: Record<string, unknown> = {
    name: method.name,
    description: String(method.description ?? "").trim(),
    ...(mergedRootTags !== undefined ? { tags: mergedRootTags } : {}),
    /** Provenance only: do not use `baselinePracticeName` here — merged docs must classify as kernel-shaped so library resolution and enrich stubs are not re-run. */
    mergesBaselinePracticeName: baseline.name,
    focuses: clone(baseline.focuses ?? []),
    alphas: clone(baseline.alphas ?? []),
    competencies: clone(baseline.competencies ?? []),
    authors: uniqStrings([...(baseline.authors ?? [])]),
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    version: baseline.version,
    keywords: uniqStrings([...(baseline.keywords ?? [])]),
    narrativeTypes: mergeNarrativeTypes([], baselineNarrativeTypes),
    practiceDependencyNames: uniqStrings(((method as any).practiceDependencyNames ?? []) as string[]),
    workProducts: mergeWorkProducts([], baselineWorkProducts),
    patterns: mergePatterns([], baselinePatterns),
    personas: mergePersonas([], baselinePersonas),
    personaGroups: mergePersonaGroups([], baselinePersonaGroups),
    // Only include method's own narratives, not baseline or practice narratives
    ...(methodNarr.length ? { narratives: methodNarr } : {}),
  };

  const layersUnknown = extensionPracticeLayers as unknown[];
  const prefixSpaceRows = [
    ...(baseline.activitySpaces ?? []),
    ...collectSecondaryBaselineActivitySpaceRows(layersUnknown, String(baseline.name ?? "")),
  ];
  const acc: ExtensionMergeAccumulator = { out, slotMap: toSpaceSlotMap(baseline.activitySpaces ?? [], []) };
  mergePracticeArrayOntoOut(acc, layersUnknown);
  out.activitySpaces = slotMapToRows(
    acc.slotMap,
    collectSpaceKeyOrder(prefixSpaceRows, flattenPracticeLayersForActivitySpaceOrder(layersUnknown)),
  );

  if (!(out.workProducts as any[]).length) delete out.workProducts;
  if (!(out.narrativeTypes as any[]).length) delete out.narrativeTypes;
  if (!(out.personas as any[]).length) delete out.personas;
  if (!(out.personaGroups as any[]).length) delete out.personaGroups;
  if (!(out.patterns as any[]).length) delete out.patterns;
  if (!(out.practiceDependencyNames as string[]).length) delete out.practiceDependencyNames;

  out.alphas = aggregateSupportingAlphasFromContributesTo(out.alphas as PracticeBaseline["alphas"]);

  propagateDerivedFocusNames(out as { alphas?: any[]; activitySpaces?: any[]; activities?: any[] });
  finalizeImplicitFocusPlaceholders(out as { activitySpaces?: any[]; alphas?: any[] });
  applyBaselineKernelPracticeDescriptions(out, baseline as PracticeBaseline);
  return out;
}
