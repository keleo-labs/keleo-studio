import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import { classifyLibraryRoot, type LibraryRootKind } from "@/lib/library/classify";
import {
  activitySpaceIdentityKey,
  asBaselineDocument,
  finalizeImplicitFocusPlaceholders,
  isPracticeActivityNode,
  isUnresolvedFocusName,
  propagateDerivedFocusNames,
} from "@/lib/ir";
import { baselineFocusNamesReferencedByPatternView } from "@/lib/patternMatrixDiagram";
import { parsePatternViewAlphaState, patternViewLaneRefStrings } from "@/lib/patternView";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

function uniqStrings(xs: string[]): string[] {
  return [...new Set(xs.map((s) => String(s).trim()).filter(Boolean))];
}

export type DocumentationClosure = {
  focusNames: Set<string>;
  alphaNames: Set<string>;
  activitySpaceNames: Set<string>;
  activityNames: Set<string>;
  competencyNames: Set<string>;
  workProductNames: Set<string>;
  workBreakdownNames: Set<string>;
  patternNames: Set<string>;
};

/** Names of baseline elements the primary practice references (for pruning merged library content). */
export function collectPrimaryDocumentationClosure(doc: unknown): DocumentationClosure {
  const focusNames = new Set<string>();
  const alphaNames = new Set<string>();
  const activitySpaceNames = new Set<string>();
  const activityNames = new Set<string>();
  const competencyNames = new Set<string>();
  const workProductNames = new Set<string>();
  const workBreakdownNames = new Set<string>();
  const patternNames = new Set<string>();

  if (!doc || typeof doc !== "object") {
    return {
      focusNames,
      alphaNames,
      activitySpaceNames,
      activityNames,
      competencyNames,
      workProductNames,
      workBreakdownNames,
      patternNames,
    };
  }

  const d = doc as Record<string, any>;

  for (const f of d.focuses ?? []) {
    const n = String(f?.name ?? "").trim();
    if (n) focusNames.add(n);
  }
  for (const c of d.competencies ?? []) {
    const n = String(c?.name ?? "").trim();
    if (n) competencyNames.add(n);
  }

  const addAlphaState = (alphaName: string, stateName: string | undefined) => {
    const an = String(alphaName ?? "").trim();
    if (!an) return;
    alphaNames.add(an);
    const sn = String(stateName ?? "").trim();
    if (sn) alphaNames.add(an);
  };

  const walkContrib = (c: any) => {
    if (c && typeof c.alphaName === "string") addAlphaState(c.alphaName, c.stateName);
  };

  const walkContribEntry = (c: any) => {
    if (typeof c === "string") {
      const n = c.trim();
      if (n) alphaNames.add(n);
      return;
    }
    walkContrib(c);
  };

  for (const act of d.activities ?? []) {
    const fn = String(act.focusName ?? "").trim();
    if (fn) focusNames.add(fn);
    const an = String(act.name ?? "").trim();
    if (an) activityNames.add(an);
    const p = String(act.activitySpaceName ?? "").trim();
    if (p) activitySpaceNames.add(p);
    for (const c of act.contributesTo ?? []) walkContribEntry(c);
    for (const c of act.requiredCompetencies ?? []) {
      const n = String(c ?? "").trim();
      if (n) competencyNames.add(n);
    }
    for (const r of act.recommendedCompetencyLevels ?? []) {
      const n = String(r?.competencyName ?? "").trim();
      if (n) competencyNames.add(n);
    }
    for (const w of act.worksOn ?? []) {
      const n = String(w?.workProductName ?? "").trim();
      if (n) workProductNames.add(n);
    }
  }

  for (const s of d.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      const fn = String(s.focusName ?? "").trim();
      if (fn) focusNames.add(fn);
      const an = String(s.name ?? "").trim();
      if (an) activityNames.add(an);
      const parent = String(s.activitySpaceName ?? "").trim();
      if (parent) activitySpaceNames.add(parent);
      for (const c of s.contributesTo ?? []) walkContribEntry(c);
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
    const sn = String(s.name ?? "").trim();
    if (sn) activitySpaceNames.add(sn);
    const fn = String(s.focusName ?? "").trim();
    if (fn) focusNames.add(fn);
    for (const c of s.contributesTo ?? []) walkContribEntry(c);
    for (const c of s.requiredCompetencies ?? []) {
      const n = String(c ?? "").trim();
      if (n) competencyNames.add(n);
    }
    for (const act of s.activities ?? []) {
      const af = String(act.focusName ?? "").trim();
      if (af) focusNames.add(af);
      const actn = String(act.name ?? "").trim();
      if (actn) activityNames.add(actn);
      for (const c of act.contributesTo ?? []) walkContribEntry(c);
      for (const c of act.requiredCompetencies ?? []) {
        const n = String(c ?? "").trim();
        if (n) competencyNames.add(n);
      }
      for (const r of act.recommendedCompetencyLevels ?? []) {
        const n = String(r?.competencyName ?? "").trim();
        if (n) competencyNames.add(n);
      }
      for (const w of act.worksOn ?? []) {
        const n = String(w?.workProductName ?? "").trim();
        if (n) workProductNames.add(n);
      }
    }
  }

  for (const a of d.alphas ?? []) {
    const fn = String(a.focusName ?? "").trim();
    if (fn) focusNames.add(fn);
    const an = String(a.name ?? "").trim();
    if (an) alphaNames.add(an);
    const rollup = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (rollup) alphaNames.add(rollup);
    for (const raw of a.supportingAlphas ?? []) {
      const cn = String(raw ?? "").trim();
      if (cn) alphaNames.add(cn);
    }
    for (const st of a.states ?? []) {
      for (const c of st.contributesTo ?? []) walkContribEntry(c);
    }
  }

  for (const wp of d.workProducts ?? []) {
    const n = String(wp.name ?? "").trim();
    if (n) workProductNames.add(n);
    for (const lod of wp.levelsOfDetail ?? []) {
      for (const c of lod.contributesTo ?? []) walkContribEntry(c);
    }
  }

  for (const wb of d.workBreakdowns ?? []) {
    const n = String(wb.name ?? "").trim();
    if (n) workBreakdownNames.add(n);
    const cx = wb.complexity;
    if (cx && typeof cx === "object") {
      if (cx.valueRisk) walkContrib(cx.valueRisk);
      if (cx.technicalRisk) walkContrib(cx.technicalRisk);
      if (cx.stakeholderEngagement) walkContrib(cx.stakeholderEngagement);
      for (const c of cx.productRisks ?? []) walkContrib(c);
      for (const c of cx.projectRisks ?? []) walkContrib(c);
    }
    for (const task of wb.task ?? []) {
      for (const c of task.contributesTo ?? []) walkContribEntry(c);
      for (const w of task.worksOn ?? []) {
        const n = String(w?.workProductName ?? "").trim();
        if (n) workProductNames.add(n);
      }
      for (const ap of task.applies ?? []) {
        const sn = String(ap?.activitySpaceName ?? "").trim();
        if (sn) activitySpaceNames.add(sn);
      }
      const impl = String(task.implementsActivityName ?? "").trim();
      if (impl) activityNames.add(impl);
    }
  }

  const baselineForPatternResolution = {
    alphas: d.alphas ?? [],
    activitySpaces: d.activitySpaces ?? [],
    activities: d.activities ?? [],
  } as unknown as PracticeBaseline;

  for (const pat of d.patterns ?? []) {
    const pn = String(pat.name ?? "").trim();
    if (pn) patternNames.add(pn);
    for (const pv of pat.patternViews ?? []) {
      for (const fn of baselineFocusNamesReferencedByPatternView(pv, baselineForPatternResolution)) {
        if (fn) focusNames.add(fn);
      }
      for (const raw of pv.alphaStates ?? []) {
        const p = parsePatternViewAlphaState(raw);
        if (p) addAlphaState(p.alphaName, p.stateName);
      }
      for (const ref of patternViewLaneRefStrings(pv)) {
        activitySpaceNames.add(ref);
        activityNames.add(ref);
      }
    }
  }

  return {
    focusNames,
    alphaNames,
    activitySpaceNames,
    activityNames,
    competencyNames,
    workProductNames,
    workBreakdownNames,
    patternNames,
  };
}

function documentationClosureIsEmpty(c: DocumentationClosure): boolean {
  return (
    c.focusNames.size +
      c.alphaNames.size +
      c.activitySpaceNames.size +
      c.activityNames.size +
      c.competencyNames.size +
      c.workProductNames.size +
      c.workBreakdownNames.size +
      c.patternNames.size ===
    0
  );
}

function unionDocumentationClosuresInPlace(into: DocumentationClosure, other: DocumentationClosure) {
  for (const x of other.focusNames) into.focusNames.add(x);
  for (const x of other.alphaNames) into.alphaNames.add(x);
  for (const x of other.activitySpaceNames) into.activitySpaceNames.add(x);
  for (const x of other.activityNames) into.activityNames.add(x);
  for (const x of other.competencyNames) into.competencyNames.add(x);
  for (const x of other.workProductNames) into.workProductNames.add(x);
  for (const x of other.workBreakdownNames) into.workBreakdownNames.add(x);
  for (const x of other.patternNames) into.patternNames.add(x);
}

/**
 * Grow closure along contribution edges on the merged doc so we do not prune alphas (e.g. Opportunity) that are
 * only referenced transitively. Without this, {@link enrichBaselineWithReferencedWrappers} re-adds them as stubs under
 * the implicit "Dependencies" swimlane.
 */
function expandDocumentationClosureFromMergedGraph(merged: Record<string, unknown>, c: DocumentationClosure) {
  const walkContrib = (x: any, addAlpha: (n: string) => void) => {
    if (typeof x === "string") {
      const t = x.trim();
      if (t) addAlpha(t);
      return;
    }
    if (x && typeof x.alphaName === "string") addAlpha(x.alphaName);
  };

  let changed = true;
  while (changed) {
    changed = false;
    const addAlpha = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.alphaNames.has(t)) return;
      c.alphaNames.add(t);
      changed = true;
    };
    const addActivity = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.activityNames.has(t)) return;
      c.activityNames.add(t);
      changed = true;
    };
    const addSpace = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.activitySpaceNames.has(t)) return;
      c.activitySpaceNames.add(t);
      changed = true;
    };
    const addFocus = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || isUnresolvedFocusName(t) || c.focusNames.has(t)) return;
      c.focusNames.add(t);
      changed = true;
    };
    const addComp = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.competencyNames.has(t)) return;
      c.competencyNames.add(t);
      changed = true;
    };
    const addWp = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.workProductNames.has(t)) return;
      c.workProductNames.add(t);
      changed = true;
    };

    for (const a of (merged.alphas as any[]) ?? []) {
      if (!a?.name || !c.alphaNames.has(String(a.name))) continue;
      const rollup = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
      if (rollup) addAlpha(rollup);
      for (const raw of a.supportingAlphas ?? []) addAlpha(String(raw ?? ""));
      for (const st of a.states ?? []) {
        for (const x of st.contributesTo ?? []) walkContrib(x, addAlpha);
      }
      addFocus(String(a.focusName ?? "").trim());
    }

    for (const s of (merged.activitySpaces as any[]) ?? []) {
      if (isPracticeActivityNode(s)) {
        if (s?.name && c.activityNames.has(String(s.name))) {
          for (const x of s.contributesTo ?? []) walkContrib(x, addAlpha);
          for (const cn of s.requiredCompetencies ?? []) addComp(String(cn ?? ""));
          addFocus(String(s.focusName ?? "").trim());
        }
        continue;
      }
      const sn = String(s?.name ?? "").trim();
      const spaceRelevant =
        c.activitySpaceNames.has(sn) ||
        (s.activities ?? []).some((act: any) => act?.name && c.activityNames.has(String(act.name)));
      if (!spaceRelevant) continue;
      for (const x of s.contributesTo ?? []) walkContrib(x, addAlpha);
      for (const cn of s.requiredCompetencies ?? []) addComp(String(cn ?? ""));
      addFocus(String(s.focusName ?? "").trim());
      for (const act of s.activities ?? []) {
        if (!act?.name || !c.activityNames.has(String(act.name))) continue;
        for (const x of act.contributesTo ?? []) walkContrib(x, addAlpha);
        for (const cn of act.requiredCompetencies ?? []) addComp(String(cn ?? ""));
        for (const w of act.worksOn ?? []) addWp(String(w?.workProductName ?? ""));
        addFocus(String(act.focusName ?? "").trim());
      }
    }

    for (const act of (merged.activities as any[]) ?? []) {
      if (!act?.name || !c.activityNames.has(String(act.name))) continue;
      for (const x of act.contributesTo ?? []) walkContrib(x, addAlpha);
      for (const cn of act.requiredCompetencies ?? []) addComp(String(cn ?? ""));
      for (const w of act.worksOn ?? []) addWp(String(w?.workProductName ?? ""));
      const parent = String(act.activitySpaceName ?? "").trim();
      if (parent) addSpace(parent);
      addFocus(String(act.focusName ?? "").trim());
    }

    for (const wp of (merged.workProducts as any[]) ?? []) {
      if (!wp?.name || !c.workProductNames.has(String(wp.name))) continue;
      for (const lod of wp.levelsOfDetail ?? []) {
        for (const x of lod.contributesTo ?? []) walkContrib(x, addAlpha);
      }
    }

    for (const wb of (merged.workBreakdowns as any[]) ?? []) {
      if (!wb?.name || !c.workBreakdownNames.has(String(wb.name))) continue;
      const cx = wb.complexity;
      if (cx && typeof cx === "object") {
        if (cx.valueRisk) walkContrib(cx.valueRisk, addAlpha);
        if (cx.technicalRisk) walkContrib(cx.technicalRisk, addAlpha);
        if (cx.stakeholderEngagement) walkContrib(cx.stakeholderEngagement, addAlpha);
        for (const x of cx.productRisks ?? []) walkContrib(x, addAlpha);
        for (const x of cx.projectRisks ?? []) walkContrib(x, addAlpha);
      }
      for (const task of wb.task ?? []) {
        for (const x of task.contributesTo ?? []) walkContrib(x, addAlpha);
        for (const w of task.worksOn ?? []) addWp(String(w?.workProductName ?? ""));
        for (const ap of task.applies ?? []) addSpace(String(ap?.activitySpaceName ?? ""));
        const impl = String(task.implementsActivityName ?? "").trim();
        if (impl) addActivity(impl);
      }
    }

    for (const pat of (merged.patterns as any[]) ?? []) {
      const pn = String(pat?.name ?? "").trim();
      if (!pn || !c.patternNames.has(pn)) continue;
      for (const pv of pat.patternViews ?? []) {
        for (const fn of baselineFocusNamesReferencedByPatternView(pv, merged as PracticeBaseline)) {
          addFocus(fn);
        }
        for (const raw of pv.alphaStates ?? []) {
          const p = parsePatternViewAlphaState(raw);
          if (p?.alphaName) addAlpha(p.alphaName);
        }
        for (const lane of patternViewLaneRefStrings(pv)) {
          addSpace(lane);
          addActivity(lane);
        }
      }
    }
  }
}

function computeFocusNamesUsedBySlices(alphas: any[], spaces: any[]): Set<string> {
  const used = new Set<string>();
  for (const a of alphas ?? []) {
    const fn = String(a?.focusName ?? "").trim();
    if (fn) used.add(fn);
  }
  for (const s of spaces ?? []) {
    if (isPracticeActivityNode(s)) continue;
    const fn = String(s?.focusName ?? "").trim();
    if (fn) used.add(fn);
    for (const act of s?.activities ?? []) {
      const fn2 = String(act?.focusName ?? "").trim();
      if (fn2) used.add(fn2);
    }
  }
  return used;
}

/** Drop merged content not needed to document the primary practice's references. */
export function prunePracticeToDocumentationClosure(
  merged: Record<string, unknown>,
  closure: DocumentationClosure,
  originalPrimary: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...merged };

  const keptAlphas = (merged.alphas as any[] | undefined)?.filter((a) => a?.name && closure.alphaNames.has(String(a.name))) ?? [];
  const rawSpaces = (merged.activitySpaces as any[] | undefined) ?? [];
  const keptSpaces: any[] = [];
  for (const s of rawSpaces) {
    if (isPracticeActivityNode(s)) {
      if (s?.name && closure.activityNames.has(String(s.name))) keptSpaces.push(s);
      continue;
    }
    const sn = String(s?.name ?? "").trim();
    if (!closure.activitySpaceNames.has(sn)) continue;
    const acts = (s.activities ?? []).filter((act: any) => act?.name && closure.activityNames.has(String(act.name)));
    keptSpaces.push(acts.length ? { ...s, activities: acts } : { ...s, activities: undefined });
  }

  const usedFocus = computeFocusNamesUsedBySlices(keptAlphas, keptSpaces);
  for (const fn of closure.focusNames) usedFocus.add(fn);

  const keptFocuses =
    (merged.focuses as any[] | undefined)?.filter((f) => f?.name && usedFocus.has(String(f.name))) ?? [];
  const keptCompetencies =
    (merged.competencies as any[] | undefined)?.filter((c) => c?.name && closure.competencyNames.has(String(c.name))) ??
    [];
  const keptWps =
    (merged.workProducts as any[] | undefined)?.filter((wp) => wp?.name && closure.workProductNames.has(String(wp.name))) ??
    [];
  const keptWbs =
    (merged.workBreakdowns as any[] | undefined)?.filter((wb) => wb?.name && closure.workBreakdownNames.has(String(wb.name))) ??
    [];
  const keptPatterns =
    (merged.patterns as any[] | undefined)?.filter((p) => p?.name && closure.patternNames.has(String(p.name))) ?? [];

  const flatActs = (merged.activities as any[] | undefined)?.filter(
    (a) => a?.name && closure.activityNames.has(String(a.name)),
  );

  out.focuses = keptFocuses;
  out.alphas = keptAlphas;
  out.activitySpaces = keptSpaces;
  out.competencies = keptCompetencies;
  if (keptWps.length) out.workProducts = keptWps;
  else delete out.workProducts;
  if (keptWbs.length) out.workBreakdowns = keptWbs;
  else delete out.workBreakdowns;
  if (keptPatterns.length) out.patterns = keptPatterns;
  else delete out.patterns;

  if (flatActs?.length) out.activities = flatActs;
  else delete out.activities;

  if (Array.isArray(originalPrimary.practiceDependencyNames) && originalPrimary.practiceDependencyNames.length) {
    out.practiceDependencyNames = uniqStrings(originalPrimary.practiceDependencyNames as string[]);
  } else {
    delete out.practiceDependencyNames;
  }

  return out;
}

export type LibraryLookupIndex = {
  baselineByName: Map<string, PracticeBaseline>;
  practiceByName: Map<string, Practice>;
  methods: Method[];
};

/** Normalized key for comparing baseline practice titles (case, whitespace). */
export function normalizeBaselinePracticeName(name: unknown): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Baseline documents that are the same logical kernel but may ship under different display names in the library.
 * Used when `baselinePracticeName` on an extension does not match any key in {@link LibraryLookupIndex.baselineByName}.
 */
const BASELINE_NAME_EQUIVALENCE_CLASSES: ReadonlyArray<readonly string[]> = [
  ["Platform Adoption Kernel", "Platform Adoption Essentials"],
];

function equivalenceClassForRequestedName(requestedNorm: string): Set<string> | null {
  for (const clazz of BASELINE_NAME_EQUIVALENCE_CLASSES) {
    const norms = clazz.map((n) => normalizeBaselinePracticeName(n));
    if (norms.includes(requestedNorm)) return new Set(norms);
  }
  return null;
}

function uniqueBaselinesInIndex(index: LibraryLookupIndex): PracticeBaseline[] {
  const out: PracticeBaseline[] = [];
  const seen = new Set<string>();
  for (const b of index.baselineByName.values()) {
    const k = String(b?.name ?? "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(b);
  }
  for (const m of index.methods) {
    const bp = m.baselinePractice;
    if (!bp) continue;
    const k = String(bp.name ?? "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(bp);
  }
  return out;
}

export function buildLibraryLookupIndex(bodies: unknown[]): LibraryLookupIndex {
  const baselineByName = new Map<string, PracticeBaseline>();
  const practiceByName = new Map<string, Practice>();
  const methods: Method[] = [];

  for (const body of bodies) {
    if (!body || typeof body !== "object") continue;
    const kind: LibraryRootKind = classifyLibraryRoot(body);
    if (kind === "baselinePractice") {
      const b = body as PracticeBaseline;
      const n = String(b.name ?? "").trim();
      if (n && !baselineByName.has(n)) baselineByName.set(n, b);
    } else if (kind === "practice") {
      const p = body as Practice;
      const n = String(p.name ?? "").trim();
      if (n && !practiceByName.has(n)) practiceByName.set(n, p);
    } else if (kind === "method") {
      const m = body as Method;
      methods.push(m);
      const bp = m.baselinePractice;
      const bn = String(bp?.name ?? "").trim();
      if (bn && !baselineByName.has(bn)) baselineByName.set(bn, bp);
    }
  }

  return { baselineByName, practiceByName, methods };
}

export function findBaselineInLibrary(index: LibraryLookupIndex, baselinePracticeName: string): PracticeBaseline | null {
  const n = String(baselinePracticeName ?? "").trim();
  if (!n) return null;
  const hit = index.baselineByName.get(n);
  if (hit) return clone(hit);

  const wantNorm = normalizeBaselinePracticeName(n);

  for (const k of index.baselineByName.keys()) {
    if (normalizeBaselinePracticeName(k) === wantNorm) {
      const b = index.baselineByName.get(k);
      if (b) return clone(b);
    }
  }

  for (const m of index.methods) {
    const bp = m.baselinePractice;
    if (bp && normalizeBaselinePracticeName(bp.name) === wantNorm) return clone(bp);
  }

  const eq = equivalenceClassForRequestedName(wantNorm);
  if (eq) {
    const matches = uniqueBaselinesInIndex(index).filter((b) => eq.has(normalizeBaselinePracticeName(b.name)));
    if (matches.length === 1) return clone(matches[0]);
    if (matches.length > 1) {
      const exactCi = matches.find((b) => normalizeBaselinePracticeName(b.name) === wantNorm);
      if (exactCi) return clone(exactCi);
    }
  }

  return null;
}

export function findPracticeInLibrary(index: LibraryLookupIndex, practiceName: string): Practice | null {
  const n = String(practiceName ?? "").trim();
  if (!n) return null;
  const hit = index.practiceByName.get(n);
  return hit ? clone(hit) : null;
}

/**
 * After {@link compositePracticeFromMethod}, some alphas/spaces can keep an empty or implicit focus while the same
 * element in the baseline or a dependency names a real focus (e.g. "Value"). Those would render under the implicit
 * swimlane (localized as "Dependencies"). Copy the first concrete focusName from the merge chain (baseline → deps → primary).
 */
function ingestFocusMapsFromDoc(
  src: Record<string, unknown>,
  alphaFocusByName: Map<string, string>,
  spaceFocusByKey: Map<string, string>,
) {
  const slice = (asBaselineDocument(src) ?? src) as Record<string, any>;
  for (const a of slice.alphas ?? []) {
    const name = String(a?.name ?? "").trim();
    const fn = String(a?.focusName ?? "").trim();
    if (name && fn && !isUnresolvedFocusName(fn) && !alphaFocusByName.has(name)) alphaFocusByName.set(name, fn);
  }
  for (const s of slice.activitySpaces ?? []) {
    if (isPracticeActivityNode(s)) {
      const an = String(s?.name ?? "").trim();
      const fn = String(s?.focusName ?? "").trim();
      if (an && fn && !isUnresolvedFocusName(fn) && !alphaFocusByName.has(an)) alphaFocusByName.set(an, fn);
      continue;
    }
    const sn = String(s?.name ?? "").trim();
    const sfn = String(s?.focusName ?? "").trim();
    if (sn && sfn && !isUnresolvedFocusName(sfn)) {
      const k = activitySpaceIdentityKey(sn);
      if (!spaceFocusByKey.has(k)) spaceFocusByKey.set(k, sfn);
    }
    for (const act of s?.activities ?? []) {
      const actn = String(act?.name ?? "").trim();
      const afn = String(act?.focusName ?? "").trim();
      if (actn && afn && !isUnresolvedFocusName(afn) && !alphaFocusByName.has(actn)) alphaFocusByName.set(actn, afn);
    }
  }
  for (const act of (src as Record<string, any>).activities ?? []) {
    const an = String(act?.name ?? "").trim();
    const fn = String(act?.focusName ?? "").trim();
    if (an && fn && !isUnresolvedFocusName(fn) && !alphaFocusByName.has(an)) alphaFocusByName.set(an, fn);
  }
}

function fillUnresolvedFocusNamesFromSourceChain(merged: Record<string, unknown>, chain: Record<string, unknown>[]) {
  const alphaFocusByName = new Map<string, string>();
  const spaceFocusByKey = new Map<string, string>();
  for (const src of chain) ingestFocusMapsFromDoc(src, alphaFocusByName, spaceFocusByKey);

  for (const a of (merged.alphas as any[]) ?? []) {
    if (!a?.name) continue;
    if (!isUnresolvedFocusName(a.focusName)) continue;
    const fn = alphaFocusByName.get(String(a.name));
    if (fn) a.focusName = fn;
  }

  for (const s of (merged.activitySpaces as any[]) ?? []) {
    if (isPracticeActivityNode(s)) {
      const nm = String(s?.name ?? "").trim();
      if (!nm || !isUnresolvedFocusName(s.focusName)) continue;
      const fromAlpha = alphaFocusByName.get(nm);
      if (fromAlpha) {
        s.focusName = fromAlpha;
        continue;
      }
      const parent = String(s.activitySpaceName ?? "").trim();
      if (parent) {
        const pfn = spaceFocusByKey.get(activitySpaceIdentityKey(parent));
        if (pfn) s.focusName = pfn;
      }
      continue;
    }
    const sn = String(s?.name ?? "").trim();
    if (sn && isUnresolvedFocusName(s.focusName)) {
      const fn = spaceFocusByKey.get(activitySpaceIdentityKey(sn));
      if (fn) s.focusName = fn;
    }
    const parentFocus = String(s.focusName ?? "").trim();
    const resolvedParentFocus = !isUnresolvedFocusName(parentFocus) ? parentFocus : "";
    for (const act of s.activities ?? []) {
      if (!act?.name) continue;
      if (!isUnresolvedFocusName(act.focusName)) continue;
      const af = alphaFocusByName.get(String(act.name));
      if (af) act.focusName = af;
      else if (resolvedParentFocus) act.focusName = resolvedParentFocus;
    }
  }

  for (const act of (merged.activities as any[]) ?? []) {
    if (!act?.name) continue;
    if (!isUnresolvedFocusName(act.focusName)) continue;
    const af = alphaFocusByName.get(String(act.name));
    if (af) act.focusName = af;
    else {
      const parent = String(act.activitySpaceName ?? "").trim();
      if (parent) {
        const pfn = spaceFocusByKey.get(activitySpaceIdentityKey(parent));
        if (pfn) act.focusName = pfn;
      }
    }
  }

  propagateDerivedFocusNames(merged);

  finalizeImplicitFocusPlaceholders(merged as { activitySpaces?: any[]; alphas?: any[] });
}

export function practiceNeedsLibraryResolution(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (classifyLibraryRoot(doc) !== "practice") return false;
  const o = doc as Record<string, unknown>;
  const deps = o.practiceDependencyNames;
  const hasDeps = Array.isArray(deps) && deps.length > 0;
  const hasBaseline = typeof o.baselinePracticeName === "string" && String(o.baselinePracticeName).trim() !== "";
  return hasDeps || hasBaseline;
}

/**
 * Merge the named baseline and dependency practices from the library into one practice-shaped document,
 * then prune to elements referenced by `primary` so the result is documentation-sized.
 */
export function resolvePracticeWithLibraryIndex(primary: unknown, index: LibraryLookupIndex): unknown {
  if (!practiceNeedsLibraryResolution(primary)) return primary;
  const p = primary as Record<string, unknown>;
  const baselineName = typeof p.baselinePracticeName === "string" ? p.baselinePracticeName.trim() : "";
  const depNames = uniqStrings((p.practiceDependencyNames ?? []) as string[]).filter(
    (n) => n && n !== String(p.name ?? "").trim(),
  );

  const resolvedBaseline = baselineName ? findBaselineInLibrary(index, baselineName) : null;
  const fallbackBaseline = asBaselineDocument(primary);
  if (!resolvedBaseline && !fallbackBaseline) return primary;

  const baseline: PracticeBaseline = resolvedBaseline ?? (fallbackBaseline as PracticeBaseline);

  const depPractices: Practice[] = [];
  for (const name of depNames) {
    const pb = findPracticeInLibrary(index, name);
    if (pb) depPractices.push(pb);
  }

  const method: Method = {
    name: String(p.name ?? "Practice"),
    description: String(p.description ?? ""),
    baselinePractice: baseline,
    practices: [...depPractices, p as Practice],
    ...(p.tags !== undefined && p.tags !== null ? { tags: p.tags as Practice["tags"] } : {}),
  };

  const merged = compositePracticeFromMethod(method) as Record<string, unknown>;
  const sourceChain: Record<string, unknown>[] = [
    baseline as unknown as Record<string, unknown>,
    ...depPractices.map((x) => x as unknown as Record<string, unknown>),
    p,
  ];
  fillUnresolvedFocusNamesFromSourceChain(merged, sourceChain);

  const closure = collectPrimaryDocumentationClosure(primary);
  for (const dep of depPractices) {
    unionDocumentationClosuresInPlace(closure, collectPrimaryDocumentationClosure(dep));
  }
  expandDocumentationClosureFromMergedGraph(merged, closure);

  if (documentationClosureIsEmpty(closure)) return merged;
  const pruned = prunePracticeToDocumentationClosure(merged, closure, p) as Record<string, unknown>;
  propagateDerivedFocusNames(pruned as { alphas?: any[]; activitySpaces?: any[]; activities?: any[] });
  finalizeImplicitFocusPlaceholders(pruned as { activitySpaces?: any[]; alphas?: any[] });
  return pruned;
}
