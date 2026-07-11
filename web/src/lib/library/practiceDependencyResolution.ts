import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import { classifyLibraryRoot, type LibraryRootKind } from "@/lib/library/classify";
import {
  activitySpaceIdentityKey,
  asBaselineDocument,
  canonicalPracticeElementName,
  finalizeImplicitFocusPlaceholders,
  isPracticeActivityNode,
  isUnresolvedFocusName,
  personaReferencedCompetencyNames,
  propagateDerivedFocusNames,
} from "@/lib/ir";
import { baselineFocusNamesReferencedByPatternView } from "@/lib/diagrams/patternMatrix/diagram";
import { parsePatternViewAlphaState, patternViewLaneRefStrings } from "@/lib/converters/patternView";
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
  personaNames: Set<string>;
  personaGroupNames: Set<string>;
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
  const personaNames = new Set<string>();
  const personaGroupNames = new Set<string>();
  const patternNames = new Set<string>();

  if (!doc || typeof doc !== "object") {
    return {
      focusNames,
      alphaNames,
      activitySpaceNames,
      activityNames,
      competencyNames,
      workProductNames,
      personaNames,
      personaGroupNames,
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
    for (const raw of Array.isArray((s as { involves?: unknown }).involves)
      ? ((s as { involves?: unknown }).involves as unknown[])
      : []) {
      const gn = String(raw ?? "").trim();
      if (gn) personaGroupNames.add(gn);
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

  for (const persona of (d.personas ?? []) as { name?: unknown }[]) {
    const pn = String(persona?.name ?? "").trim();
    if (pn) personaNames.add(pn);
    for (const cn of personaReferencedCompetencyNames(persona)) {
      const n = String(cn ?? "").trim();
      if (n) competencyNames.add(n);
    }
  }
  for (const pg of (d.personaGroups ?? []) as { name?: unknown; personaNames?: unknown[] }[]) {
    const gn = String(pg?.name ?? "").trim();
    if (gn) personaGroupNames.add(gn);
    for (const raw of pg.personaNames ?? []) {
      const pn = String(raw ?? "").trim();
      if (pn) personaNames.add(pn);
    }
  }

  for (const tag of (d.alphaInstances ?? []) as { alphaName?: unknown }[]) {
    addAlphaState(String(tag?.alphaName ?? ""), undefined);
  }
  for (const tag of (d.workProductInstances ?? []) as { workProductName?: unknown }[]) {
    const wpn = String(tag?.workProductName ?? "").trim();
    if (wpn) workProductNames.add(wpn);
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
      for (const inst of Array.isArray(pv.alphaInstances) ? pv.alphaInstances : []) {
        if (!inst || typeof inst !== "object") continue;
        const ai = inst as Record<string, unknown>;
        addAlphaState(String(ai.alphaName ?? ""), String(ai.stateName ?? ""));
        for (const ev of Array.isArray(ai.evidenceBy) ? ai.evidenceBy : []) {
          if (ev && typeof ev === "object") {
            const wpn = String((ev as { workProductName?: unknown }).workProductName ?? "").trim();
            if (wpn) workProductNames.add(wpn);
          }
        }
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
    personaNames,
    personaGroupNames,
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
      c.personaNames.size +
      c.personaGroupNames.size +
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
  for (const x of other.personaNames) into.personaNames.add(x);
  for (const x of other.personaGroupNames) into.personaGroupNames.add(x);
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
    const addPersona = (n: string) => {
      const t = String(n ?? "").trim();
      if (!t || c.personaNames.has(t)) return;
      c.personaNames.add(t);
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

    for (const pg of (merged.personaGroups as any[]) ?? []) {
      const gn = String(pg?.name ?? "").trim();
      if (!gn || !c.personaGroupNames.has(gn)) continue;
      for (const raw of pg.personaNames ?? []) addPersona(String(raw ?? ""));
    }

    for (const persona of (merged.personas as any[]) ?? []) {
      const pn = String(persona?.name ?? "").trim();
      if (!pn || !c.personaNames.has(pn)) continue;
      for (const cn of personaReferencedCompetencyNames(persona)) addComp(String(cn ?? ""));
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
        for (const inst of Array.isArray(pv.alphaInstances) ? pv.alphaInstances : []) {
          if (!inst || typeof inst !== "object") continue;
          const ai = inst as Record<string, unknown>;
          const an = String(ai.alphaName ?? "").trim();
          if (an) addAlpha(an);
          for (const ev of Array.isArray(ai.evidenceBy) ? ai.evidenceBy : []) {
            if (ev && typeof ev === "object") {
              const wpn = String((ev as { workProductName?: unknown }).workProductName ?? "").trim();
              if (wpn) addWp(wpn);
            }
          }
        }
        for (const lane of patternViewLaneRefStrings(pv)) {
          addSpace(lane);
          addActivity(lane);
        }
      }
    }
  }
}

/**
 * Bidirectionally expand persona ↔ persona-group membership against the merged doc; then add competency names
 * from every retained persona so prune keeps matching Competency definitions for display.
 */
function expandPersonaSubgroupClosureInPlace(merged: Record<string, unknown>, c: DocumentationClosure) {
  const allPersonas = (merged.personas as any[] | undefined) ?? [];
  const allGroups = (merged.personaGroups as any[] | undefined) ?? [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pg of allGroups) {
      const gn = String(pg?.name ?? "").trim();
      if (!gn || c.personaGroupNames.has(gn)) continue;
      const members = (pg.personaNames ?? []).map((x: unknown) => String(x ?? "").trim()).filter(Boolean);
      if (!members.some((m: string) => c.personaNames.has(m))) continue;
      c.personaGroupNames.add(gn);
      changed = true;
    }
    for (const pg of allGroups) {
      const gn = String(pg?.name ?? "").trim();
      if (!gn || !c.personaGroupNames.has(gn)) continue;
      for (const raw of pg.personaNames ?? []) {
        const pn = String(raw ?? "").trim();
        if (pn && !c.personaNames.has(pn)) {
          c.personaNames.add(pn);
          changed = true;
        }
      }
    }
  }

  for (const persona of allPersonas) {
    const pn = String(persona?.name ?? "").trim();
    if (!pn || !c.personaNames.has(pn)) continue;
    for (const cn of personaReferencedCompetencyNames(persona)) {
      const t = String(cn ?? "").trim();
      if (t) c.competencyNames.add(t);
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

  const keptAlphas =
    (merged.alphas as any[] | undefined)?.filter((a) => {
      const n = canonicalPracticeElementName(a?.name);
      return n !== null && closure.alphaNames.has(n);
    }) ?? [];
  const rawSpaces = (merged.activitySpaces as any[] | undefined) ?? [];
  const keptSpaces: any[] = [];
  for (const s of rawSpaces) {
    if (isPracticeActivityNode(s)) {
      const n = canonicalPracticeElementName((s as { name?: unknown }).name);
      if (n !== null && closure.activityNames.has(n)) keptSpaces.push(s);
      continue;
    }
    const sn = String(s?.name ?? "").trim();
    if (!closure.activitySpaceNames.has(sn)) continue;
    const acts = (s.activities ?? []).filter((act: any) => {
      const an = canonicalPracticeElementName(act?.name);
      return an !== null && closure.activityNames.has(an);
    });
    keptSpaces.push(acts.length ? { ...s, activities: acts } : { ...s, activities: undefined });
  }

  const usedFocus = computeFocusNamesUsedBySlices(keptAlphas, keptSpaces);
  for (const fn of closure.focusNames) usedFocus.add(fn);

  const keptFocuses =
    (merged.focuses as any[] | undefined)?.filter((f) => {
      const n = canonicalPracticeElementName((f as { name?: unknown }).name);
      return n !== null && usedFocus.has(n);
    }) ?? [];
  const keptCompetencies =
    (merged.competencies as any[] | undefined)?.filter((c) => {
      const n = canonicalPracticeElementName((c as { name?: unknown }).name);
      return n !== null && closure.competencyNames.has(n);
    }) ?? [];
  const keptWps =
    (merged.workProducts as any[] | undefined)?.filter((wp) => {
      const n = canonicalPracticeElementName((wp as { name?: unknown }).name);
      return n !== null && closure.workProductNames.has(n);
    }) ?? [];
  const keptPersonas =
    (merged.personas as any[] | undefined)?.filter((p) => {
      const n = canonicalPracticeElementName((p as { name?: unknown }).name);
      return n !== null && closure.personaNames.has(n);
    }) ?? [];
  const keptPersonaGroups =
    (merged.personaGroups as any[] | undefined)?.filter((pg) => {
      const n = canonicalPracticeElementName((pg as { name?: unknown }).name);
      return n !== null && closure.personaGroupNames.has(n);
    }) ?? [];
  const keptPatterns =
    (merged.patterns as any[] | undefined)?.filter((p) => {
      const n = canonicalPracticeElementName((p as { name?: unknown }).name);
      return n !== null && closure.patternNames.has(n);
    }) ?? [];

  const flatActs = (merged.activities as any[] | undefined)?.filter((a) => {
    const n = canonicalPracticeElementName((a as { name?: unknown }).name);
    return n !== null && closure.activityNames.has(n);
  });

  out.focuses = keptFocuses;
  out.alphas = keptAlphas;
  out.activitySpaces = keptSpaces;
  out.competencies = keptCompetencies;
  if (keptWps.length) out.workProducts = keptWps;
  else delete out.workProducts;
  if (keptPersonas.length) out.personas = keptPersonas;
  else delete out.personas;
  if (keptPersonaGroups.length) out.personaGroups = keptPersonaGroups;
  else delete out.personaGroups;
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

/** Heuristic richness so we prefer the canonical kernel over thin duplicate baselines registering under the same `name`. */
function baselineStructuralRichness(bp: PracticeBaseline): number {
  let states = 0;
  let checklistRows = 0;
  for (const a of bp.alphas ?? []) {
    for (const st of (a as { states?: unknown[] }).states ?? []) {
      states++;
      checklistRows += (st as { checklist?: unknown[] }).checklist?.length ?? 0;
    }
  }
  const nt = bp.narrativeTypes?.reduce((acc, nt) => acc + ((nt.narrativeElements ?? []) as unknown[]).length, 0) ?? 0;
  return (
    (bp.alphas ?? []).length * 10_000 +
    states * 100 +
    checklistRows +
    nt * 3 +
    (bp.focuses ?? []).length * 50 +
    (bp.activitySpaces ?? []).length * 20 +
    (bp.competencies ?? []).length * 15
  );
}

/**
 * Prefer the strictly richer artifact when multiple library roots claim the same {@link PracticeBaseline.name}.
 * On ties, keep {@link existing} so ingest order wins — pair with deterministic ordering in
 * {@link buildLibraryLookupIndex} so standalone kernels do not lose to duplicate embedded copies.
 */
function pickRicherPracticeBaseline(existing: PracticeBaseline | undefined, next: PracticeBaseline): PracticeBaseline {
  if (!existing) return next;
  const re = baselineStructuralRichness(existing);
  const rn = baselineStructuralRichness(next);
  if (rn > re) return next;
  if (rn < re) return existing;
  return existing;
}

/**
 * Prefer standalone {@link baselineByName} entries over an embedded {@link Method.baselinePractice} duplicate.
 * Embedded copies sometimes carry extension-local prose while matching structural richness — only adopt embedded
 * when it is strictly structurally richer.
 */
function preferIndexedBaselineOverEmbedded(existing: PracticeBaseline | undefined, embedded: PracticeBaseline): PracticeBaseline {
  if (!existing) return embedded;
  const re = baselineStructuralRichness(existing);
  const rn = baselineStructuralRichness(embedded);
  if (rn > re) return embedded;
  return existing;
}

/** When two baselines collide (normalized name tie, equivalence class, …), prefer a root stored as `baselinePractice` over one only embedded under a Method. Hierarchy sort alone cannot decide that—library ingestion order is unrelated to compose order. */
function compareBaselinePreferStandaloneArtifact(
  index: LibraryLookupIndex,
  a: PracticeBaseline,
  b: PracticeBaseline,
): number {
  const standalone = index.standaloneBaselinePracticeKeys;
  const sa = standalone.has(String(a.name ?? "").trim()) ? 0 : 1;
  const sb = standalone.has(String(b.name ?? "").trim()) ? 0 : 1;
  if (sa !== sb) return sa - sb;
  const ra = baselineStructuralRichness(a);
  const rb = baselineStructuralRichness(b);
  if (rb !== ra) return rb - ra;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}

/** Pick richer among {@link prev} vs {@link next}, breaking ties toward standalone-root baselines recorded in {@link LibraryLookupIndex.standaloneBaselinePracticeKeys}. */
function pickRicherWithStandaloneBaselinePreference(
  index: LibraryLookupIndex,
  prev: PracticeBaseline | undefined,
  next: PracticeBaseline,
): PracticeBaseline {
  if (!prev) return next;
  const c = compareBaselinePreferStandaloneArtifact(index, prev, next);
  if (c < 0) return prev;
  if (c > 0) return next;
  return pickRicherPracticeBaseline(prev, next);
}

export type LibraryLookupIndex = {
  baselineByName: Map<string, PracticeBaseline>;
  /**
   * Baseline artifact names registered from standalone library roots ({@link classifyLibraryRoot} `"baselinePractice"`).
   * These must not be swapped for duplicated {@link Method.baselinePractice} copies that often carry vendor-local prose on shared alphas.
   */
  standaloneBaselinePracticeKeys: Set<string>;
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

/** Pool baselines indexed as artifacts with method embeddings filling gaps except where a standalone kernel already owns the name. */
function allPracticeBaselinesInIndex(index: LibraryLookupIndex): Map<string, PracticeBaseline> {
  const standaloneKeys = index.standaloneBaselinePracticeKeys;
  const byName = new Map<string, PracticeBaseline>();
  for (const b of index.baselineByName.values()) {
    const k = String(b?.name ?? "").trim();
    if (!k) continue;
    byName.set(k, pickRicherPracticeBaseline(byName.get(k), b));
  }
  for (const m of index.methods) {
    const bp = m.baselinePractice;
    if (!bp) continue;
    const k = String(bp.name ?? "").trim();
    if (!k) continue;
    /** Do not overlay method-embedded kernels on top of authoritative standalone artifacts (same trimmed name key). */
    if (standaloneKeys.has(k)) continue;
    const existing = byName.get(k);
    byName.set(k, preferIndexedBaselineOverEmbedded(existing, bp as PracticeBaseline));
  }
  return byName;
}

function uniqueBaselinesInIndex(index: LibraryLookupIndex): PracticeBaseline[] {
  return [...allPracticeBaselinesInIndex(index).values()];
}

function libraryLookupIngestRank(kind: LibraryRootKind): number {
  /** Standalone baselines → standalone practices → methods (kernels embedded last so ties keep earlier copies). */
  switch (kind) {
    case "baselinePractice":
      return 0;
    case "practice":
      return 1;
    case "method":
      return 2;
    default:
      return 9;
  }
}

export function buildLibraryLookupIndex(bodies: unknown[]): LibraryLookupIndex {
  const baselineByName = new Map<string, PracticeBaseline>();
  const standaloneBaselinePracticeKeys = new Set<string>();
  const practiceByName = new Map<string, Practice>();
  const methods: Method[] = [];

  const sortedBodies = [...bodies].sort((a, b) => {
    if (!a || typeof a !== "object") return 1;
    if (!b || typeof b !== "object") return -1;
    const ka = classifyLibraryRoot(a);
    const kb = classifyLibraryRoot(b);
    return libraryLookupIngestRank(ka) - libraryLookupIngestRank(kb);
  });

  for (const body of sortedBodies) {
    if (!body || typeof body !== "object") continue;
    const kind: LibraryRootKind = classifyLibraryRoot(body);
    if (kind === "baselinePractice") {
      const b = body as PracticeBaseline;
      const n = String(b.name ?? "").trim();
      if (!n) continue;
      standaloneBaselinePracticeKeys.add(n);
      baselineByName.set(n, pickRicherPracticeBaseline(baselineByName.get(n), b));
    } else if (kind === "practice") {
      const p = body as Practice;
      const n = String(p.name ?? "").trim();
      if (n && !practiceByName.has(n)) practiceByName.set(n, p);
    } else if (kind === "method") {
      const m = body as Method;
      methods.push(m);
      const bp = m.baselinePractice;
      const bn = String(bp?.name ?? "").trim();
      if (bn) {
        if (!standaloneBaselinePracticeKeys.has(bn)) {
          baselineByName.set(bn, preferIndexedBaselineOverEmbedded(baselineByName.get(bn), bp as PracticeBaseline));
        }
      }
      const plist = Array.isArray(m.practices) ? m.practices : [];
      for (const pr of plist) {
        const pn = String((pr as Practice)?.name ?? "").trim();
        if (!pn || practiceByName.has(pn)) continue;
        practiceByName.set(pn, pr as Practice);
      }
    }
  }

  return { baselineByName, standaloneBaselinePracticeKeys, practiceByName, methods };
}

export function findBaselineInLibrary(index: LibraryLookupIndex, baselinePracticeName: string): PracticeBaseline | null {
  const n = String(baselinePracticeName ?? "").trim();
  if (!n) return null;

  const pooled = allPracticeBaselinesInIndex(index);
  const direct = pooled.get(n);
  if (direct) return clone(direct);

  const wantNorm = normalizeBaselinePracticeName(n);

  let normPick: PracticeBaseline | undefined;
  for (const b of pooled.values()) {
    if (normalizeBaselinePracticeName(b.name) === wantNorm)
      normPick = pickRicherWithStandaloneBaselinePreference(index, normPick, b);
  }
  if (normPick) return clone(normPick);

  const eq = equivalenceClassForRequestedName(wantNorm);
  if (eq) {
    const matches = uniqueBaselinesInIndex(index).filter((b) => eq.has(normalizeBaselinePracticeName(b.name)));
    if (matches.length === 1) return clone(matches[0]);
    if (matches.length > 1) {
      const exactCi = matches.find((b) => normalizeBaselinePracticeName(b.name) === wantNorm);
      if (exactCi) return clone(exactCi);
      matches.sort((a, b) => compareBaselinePreferStandaloneArtifact(index, a, b));
      return clone(matches[0]);
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
 * doc-gen-spec **MergePractice** dependency phase: recursively merge transitive
 * {@link Practice.practiceDependencyNames} before merging the dependent practice.
 * Post-order DFS (dependencies first); each distinct practice name merges once.
 * Missing library rows are skipped (same tolerance as shallow resolution).
 *
 * @throws When {@link Practice.practiceDependencyNames} forms a cycle.
 */
export function orderedTransitiveExtensionPractices(primary: Practice, index: LibraryLookupIndex): Practice[] {
  const ordered: Practice[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  function visitPractice(p: Practice): void {
    const n = String(p.name ?? "").trim();
    if (!n || done.has(n)) return;
    if (visiting.has(n))
      throw new Error(`Circular practiceDependencyNames at "${n}" (MergePractice preprocessing).`);

    visiting.add(n);
    try {
      for (const dep of uniqStrings((p.practiceDependencyNames ?? []) as string[])) {
        if (dep === n) continue;
        const depP = findPracticeInLibrary(index, dep);
        if (depP) visitPractice(depP);
      }
    } finally {
      visiting.delete(n);
    }

    done.add(n);
    ordered.push(clone(p));
  }

  visitPractice(primary);
  return ordered;
}

/**
 * Post-order DFS through {@link PracticeBaseline.baselinePracticeNames}: recursively resolve
 * transitive baseline dependencies before the primary baseline.
 * Each distinct baseline name merges once. Missing library rows are skipped.
 *
 * @throws When `baselinePracticeNames` forms a cycle.
 */
export function orderedTransitiveBaselinePractices(primary: PracticeBaseline, index: LibraryLookupIndex): PracticeBaseline[] {
  const ordered: PracticeBaseline[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  function visitBaseline(b: PracticeBaseline): void {
    const n = String(b.name ?? "").trim();
    if (!n || done.has(n)) return;
    if (visiting.has(n))
      throw new Error(`Circular baselinePracticeNames at "${n}" (baseline dependency resolution).`);

    visiting.add(n);
    try {
      for (const dep of uniqStrings((b.baselinePracticeNames ?? []) as string[])) {
        if (dep === n) continue;
        const depB = findBaselineInLibrary(index, dep);
        if (depB) visitBaseline(depB);
      }
    } finally {
      visiting.delete(n);
    }

    done.add(n);
    ordered.push(clone(b));
  }

  visitBaseline(primary);
  return ordered;
}

/**
 * Resolve a baseline's {@link PracticeBaseline.baselinePracticeNames} recursively: loads
 * referenced baselines from the library, merges them in dependency order, then overlays the
 * primary baseline on top. Returns the original baseline unchanged if it has no dependencies.
 */
export function resolveBaselineWithDependencies(baseline: PracticeBaseline, index: LibraryLookupIndex): PracticeBaseline {
  const deps = baseline.baselinePracticeNames;
  if (!Array.isArray(deps) || deps.length === 0) return baseline;

  const chain = orderedTransitiveBaselinePractices(baseline, index);
  if (chain.length <= 1) return baseline;

  const seed = chain[0];
  delete (seed as any).baselinePracticeNames;

  const overlays = chain.slice(1).map(b => {
    const p = { ...b, baselinePracticeName: String(seed.name ?? "") } as unknown as Practice;
    delete (p as any).baselinePracticeNames;
    return p;
  });

  const method: Method = {
    name: String(baseline.name ?? "Baseline"),
    description: String(baseline.description ?? ""),
    baselinePractice: seed,
    practices: overlays,
  };

  const merged = compositePracticeFromMethod(method) as Record<string, unknown>;
  delete merged.mergesBaselinePracticeName;
  delete merged.baselinePracticeName;
  return merged as unknown as PracticeBaseline;
}

/**
 * Expand a method's practice layers to include transitive {@link Practice.practiceDependencyNames}
 * loaded from the library. Practices already present (by name) are not duplicated. Dependencies
 * are inserted before the practice that requires them (DFS post-order).
 */
export function expandMethodPracticeDependencies(practices: Practice[], library: LibraryLookupIndex): Practice[] {
  const ordered: Practice[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  function visit(p: Practice): void {
    const n = String(p.name ?? "").trim();
    if (!n || done.has(n)) return;
    if (visiting.has(n))
      throw new Error(`Circular practiceDependencyNames at "${n}" (method practice dependency expansion).`);

    visiting.add(n);
    try {
      for (const depName of uniqStrings((p.practiceDependencyNames ?? []) as string[])) {
        if (depName === n || done.has(depName)) continue;
        const dep = findPracticeInLibrary(library, depName);
        if (dep) visit(clone(dep));
      }
    } finally {
      visiting.delete(n);
    }

    done.add(n);
    ordered.push(p);
  }

  for (const p of practices) {
    visit(p);
  }

  return ordered;
}

/** Library snapshot embedded in browse "Dependencies" (baseline or extension practice bodies). */
export type BrowseDependencyArtifact = {
  role: "baselinePractice" | "practice";
  /** Canonical {@link PracticeElement.name} */
  name: string;
  body: Record<string, unknown>;
};

/**
 * Resolved stored documents referenced by naming fields on {@link Practice} aggregates or merged composites
 * (`mergesBaselinePracticeName`, `practiceDependencyNames`, or extension `baselinePracticeName`).
 */
export function collectBrowseDependencyArtifacts(primary: unknown, index: LibraryLookupIndex): BrowseDependencyArtifact[] {
  if (!primary || typeof primary !== "object") return [];
  const o = primary as Record<string, unknown>;
  const root = classifyLibraryRoot(primary);
  const out: BrowseDependencyArtifact[] = [];

  const addBaselineFromName = (name: string) => {
    const b = findBaselineInLibrary(index, name);
    if (!b?.name) return;
    const n = String(b.name).trim();
    if (!n) return;
    out.push({ role: "baselinePractice", name: n, body: structuredClone(b) as Record<string, unknown> });
  };

  const addPracticeFromName = (name: string) => {
    const n = String(name ?? "").trim();
    if (!n) return;
    const pb = findPracticeInLibrary(index, n);
    if (!pb?.name) return;
    out.push({ role: "practice", name: String(pb.name).trim(), body: structuredClone(pb) as Record<string, unknown> });
  };

  if (root === "baselinePractice") {
    const self = typeof o.name === "string" ? o.name.trim() : "";
    for (const raw of uniqStrings((o.baselinePracticeNames ?? []) as string[])) {
      if (!raw || raw === self) continue;
      addBaselineFromName(raw);
    }
    return out;
  }

  if (root === "practice") {
    const bn = typeof o.baselinePracticeName === "string" ? o.baselinePracticeName.trim() : "";
    if (bn) addBaselineFromName(bn);
    const self = typeof o.name === "string" ? o.name.trim() : "";
    for (const raw of uniqStrings((o.practiceDependencyNames ?? []) as string[])) {
      if (!raw || raw === self) continue;
      addPracticeFromName(raw);
    }
    return out;
  }

  const merges = typeof o.mergesBaselinePracticeName === "string" ? o.mergesBaselinePracticeName.trim() : "";
  if (merges) addBaselineFromName(merges);
  for (const raw of uniqStrings((o.practiceDependencyNames ?? []) as string[])) addPracticeFromName(raw);
  return out;
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

export function baselineNeedsLibraryResolution(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (classifyLibraryRoot(doc) !== "baselinePractice") return false;
  const o = doc as Record<string, unknown>;
  const deps = o.baselinePracticeNames;
  return Array.isArray(deps) && deps.length > 0;
}

export function documentNeedsLibraryResolution(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  const root = classifyLibraryRoot(doc);
  if (root === "method") return methodNeedsLibraryResolution(doc);
  if (root === "baselinePractice") return baselineNeedsLibraryResolution(doc);
  if (root === "practice") return practiceNeedsLibraryResolution(doc);
  return false;
}

export function resolveBaselinePracticeWithLibraryIndex(primary: unknown, index: LibraryLookupIndex): unknown {
  if (!baselineNeedsLibraryResolution(primary)) return primary;
  return resolveBaselineWithDependencies(primary as PracticeBaseline, index);
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

export function methodNeedsLibraryResolution(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (classifyLibraryRoot(doc) !== "method") return false;
  const o = doc as Record<string, unknown>;
  const hasBaselineName = typeof o.baselinePracticeName === "string" && String(o.baselinePracticeName).trim() !== "";
  if (hasBaselineName) return true;
  const practices = o.practices;
  if (Array.isArray(practices)) {
    for (const p of practices) {
      if (p && typeof p === "object") {
        const practiceNames = (p as Record<string, unknown>).practiceNames;
        if (Array.isArray(practiceNames) && practiceNames.length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Merge the named baseline and dependency practices into one kernel-shaped document (doc-gen-spec **MergePractice** /
 * {@link compositePracticeFromMethod}): transitive {@link Practice.practiceDependencyNames} resolve in post-order before
 * the primary, then prune to documentation referenced by `primary`.
 */
function stripExtensionBaselineNameForKernelComposite(doc: Record<string, unknown>): void {
  /** Merged outputs use {@link mergesBaselinePracticeName}; retaining `baselinePracticeName` would re-run stub enrichment on the client and fight kernel prose. */
  delete doc.baselinePracticeName;
}

export function resolveMethodWithLibraryIndex(method: unknown, index: LibraryLookupIndex): unknown {
  if (!methodNeedsLibraryResolution(method)) return method;
  return compositePracticeFromMethod(method as Method, index);
}

/**
 * Universal resolver: dispatches to method, baseline, or practice resolution based on document classification.
 */
export function resolveDocumentWithLibraryIndex(doc: unknown, index: LibraryLookupIndex): unknown {
  const root = classifyLibraryRoot(doc);
  if (root === "method") return resolveMethodWithLibraryIndex(doc, index);
  if (root === "baselinePractice") return resolveBaselinePracticeWithLibraryIndex(doc, index);
  return resolvePracticeWithLibraryIndex(doc, index);
}

export function resolvePracticeWithLibraryIndex(primary: unknown, index: LibraryLookupIndex): unknown {
  if (!practiceNeedsLibraryResolution(primary)) return primary;
  const p = primary as Record<string, unknown>;
  const baselineName = typeof p.baselinePracticeName === "string" ? p.baselinePracticeName.trim() : "";

  const resolvedBaseline = baselineName ? findBaselineInLibrary(index, baselineName) : null;
  const fallbackBaseline = asBaselineDocument(primary);
  if (!resolvedBaseline && !fallbackBaseline) return primary;

  const baseline: PracticeBaseline = resolvedBaseline ?? (fallbackBaseline as PracticeBaseline);

  /** Transitive deps (library) then primary — matches MergePractice DFS before overlaying the focal practice. */
  const hierarchicalExtensions: Practice[] = orderedTransitiveExtensionPractices(p as Practice, index);

  const method: Method = {
    name: String(p.name ?? "Practice"),
    description: String(p.description ?? ""),
    baselinePractice: baseline,
    practices: hierarchicalExtensions,
    ...(p.tags !== undefined && p.tags !== null ? { tags: p.tags as Practice["tags"] } : {}),
    // Preserve patterns, workProducts, personas, and personaGroups from primary practice
    ...(Array.isArray((p as any).patterns) && (p as any).patterns.length > 0 ? { patterns: (p as any).patterns } : {}),
    ...(Array.isArray((p as any).workProducts) && (p as any).workProducts.length > 0 ? { workProducts: (p as any).workProducts } : {}),
    ...(Array.isArray((p as any).personas) && (p as any).personas.length > 0 ? { personas: (p as any).personas } : {}),
    ...(Array.isArray((p as any).personaGroups) && (p as any).personaGroups.length > 0 ? { personaGroups: (p as any).personaGroups } : {}),
  } as any;

  const merged = compositePracticeFromMethod(method, index) as Record<string, unknown>;
  const sourceChain: Record<string, unknown>[] = [
    baseline as unknown as Record<string, unknown>,
    ...hierarchicalExtensions.map((x) => x as unknown as Record<string, unknown>),
  ];
  fillUnresolvedFocusNamesFromSourceChain(merged, sourceChain);

  const closure = collectPrimaryDocumentationClosure(primary);
  for (const dep of hierarchicalExtensions.slice(0, -1)) {
    unionDocumentationClosuresInPlace(closure, collectPrimaryDocumentationClosure(dep));
  }
  expandDocumentationClosureFromMergedGraph(merged, closure);
  expandPersonaSubgroupClosureInPlace(merged, closure);

  // CRITICAL: Always include ALL baseline alphas in the closure to ensure they're shown
  // in the Method Focus view, even if not referenced by the extension practice.
  // This provides a complete view of baseline coverage.
  const baselineAlphas = (baseline as any).alphas ?? [];
  for (const alpha of baselineAlphas) {
    const alphaName = canonicalPracticeElementName(alpha?.name);
    if (alphaName !== null) {
      closure.alphaNames.add(alphaName);
      // Also ensure the alpha's focus is included
      const focusName = canonicalPracticeElementName((alpha as any)?.focusName);
      if (focusName !== null) {
        closure.focusNames.add(focusName);
      }
    }
  }

  // CRITICAL: Always include ALL baseline activity spaces in the closure to ensure they're shown
  // in the Activities view, even if not referenced by the extension practice.
  // This provides a complete view of baseline activities.
  const baselineActivitySpaces = (baseline as any).activitySpaces ?? [];
  for (const space of baselineActivitySpaces) {
    const spaceName = canonicalPracticeElementName(space?.name);
    if (spaceName !== null) {
      closure.activitySpaceNames.add(spaceName);
      // Also ensure the activity space's focus is included
      const focusName = canonicalPracticeElementName((space as any)?.focusName);
      if (focusName !== null) {
        closure.focusNames.add(focusName);
      }
      // Include any activities within the space
      const activities = (space as any)?.activities ?? [];
      for (const activity of activities) {
        const activityName = canonicalPracticeElementName(activity?.name);
        if (activityName !== null) {
          closure.activityNames.add(activityName);
        }
      }
    }
  }

  if (documentationClosureIsEmpty(closure)) {
    stripExtensionBaselineNameForKernelComposite(merged);
    return merged;
  }
  const pruned = prunePracticeToDocumentationClosure(merged, closure, p) as Record<string, unknown>;
  propagateDerivedFocusNames(pruned as { alphas?: any[]; activitySpaces?: any[]; activities?: any[] });
  finalizeImplicitFocusPlaceholders(pruned as { activitySpaces?: any[]; alphas?: any[] });
  stripExtensionBaselineNameForKernelComposite(pruned);
  return pruned;
}
