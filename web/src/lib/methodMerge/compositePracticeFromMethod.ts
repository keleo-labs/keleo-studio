import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import { mergePracticeElementTags } from "@/lib/practiceElementTags";
import {
  activitySpaceIdentityKey,
  canonicalizeActivitySpaces,
  finalizeImplicitFocusPlaceholders,
  isPracticeActivityNode,
  mergeFocusNamePreferNonImplicit,
  propagateDerivedFocusNames,
} from "@/lib/ir";
import { mergePatternViewAlphaStates } from "@/lib/patternView";

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

function uniqStrings(xs: string[]): string[] {
  return [...new Set(xs.map((s) => String(s).trim()).filter(Boolean))];
}

function mergeDescriptions(a: string, b: string): string {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!y) return x;
  if (!x) return y;
  if (y === x) return x;
  return `${x}\n\n${y}`;
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

function mergePracticeElements<T extends { name: string; description?: string; tags?: unknown }>(base: T, overlay: T): T {
  const mergedTags = mergePracticeElementTags(base.tags, overlay.tags);
  return {
    ...base,
    ...overlay,
    name: base.name,
    description: mergeDescriptions(String(base.description ?? ""), String(overlay.description ?? "")),
    ...(mergedTags !== undefined ? { tags: mergedTags } : {}),
  };
}

function mergeChecklists(base: any[], over: any[]): any[] {
  const byName = new Map<string, any>();
  for (const ch of base ?? []) {
    if (ch?.name) byName.set(String(ch.name), clone(ch));
  }
  for (const ch of over ?? []) {
    if (!ch?.name) continue;
    const k = String(ch.name);
    if (byName.has(k)) {
      byName.set(k, mergePracticeElements(byName.get(k), ch));
    } else {
      byName.set(k, clone(ch));
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
    if (s?.name) byName.set(String(s.name), clone(s));
  }
  for (const s of over ?? []) {
    if (!s?.name) continue;
    const k = String(s.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, s),
        seq: s.seq ?? prev.seq,
        checklist: mergeChecklists(prev.checklist ?? [], s.checklist ?? []),
      });
    } else {
      byName.set(k, clone(s));
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
    if (a?.name) byName.set(String(a.name), clone(a));
  }
  for (const a of over ?? []) {
    if (!a?.name) continue;
    const k = String(a.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      const mergedSupporting = uniqStrings([...(prev.supportingAlphas ?? []), ...(a.supportingAlphas ?? [])]);
      const merged: Record<string, unknown> = {
        ...mergePracticeElements(prev, a),
        focusName: mergeFocusNamePreferNonImplicit(prev.focusName, a.focusName),
        contributesTo: a.contributesTo ?? prev.contributesTo,
        states: mergeStates(prev.states ?? [], a.states ?? []),
      };
      if (mergedSupporting.length) merged.supportingAlphas = mergedSupporting;
      else delete merged.supportingAlphas;
      byName.set(k, merged as PracticeBaseline["alphas"][number]);
    } else {
      byName.set(k, clone(a));
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
    if (f?.name) byName.set(String(f.name), clone(f));
  }
  for (const f of over ?? []) {
    if (!f?.name) continue;
    const k = String(f.name);
    if (byName.has(k)) byName.set(k, mergePracticeElements(byName.get(k), f));
    else byName.set(k, clone(f));
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
      if (a?.name) actMap.set(String(a.name), clone(a));
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
    if (!activities.has(k)) activities.set(k, clone(v));
    else activities.set(k, mergeActivityElements(activities.get(k)!, v));
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
  for (const c of base ?? []) {
    if (c?.name) byName.set(String(c.name), clone(c));
  }
  for (const c of over ?? []) {
    if (!c?.name) continue;
    const k = String(c.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      const levelMap = new Map<string, any>();
      for (const lv of prev.levels ?? []) {
        const lk = `${lv.level}:${lv.name}`;
        levelMap.set(lk, clone(lv));
      }
      for (const lv of c.levels ?? []) {
        const lk = `${lv.level}:${lv.name}`;
        if (levelMap.has(lk)) levelMap.set(lk, mergePracticeElements(levelMap.get(lk), lv));
        else levelMap.set(lk, clone(lv));
      }
      byName.set(k, {
        ...mergePracticeElements(prev, c),
        levels: [...levelMap.values()].sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0)),
      });
    } else {
      byName.set(k, clone(c));
    }
  }
  return [...byName.values()];
}

function mergeLevelsOfDetail(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const x of a ?? []) {
    if (x?.name) byName.set(String(x.name), clone(x));
  }
  for (const x of b ?? []) {
    if (!x?.name) continue;
    const k = String(x.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, x),
        seq: x.seq ?? prev.seq,
        contributesTo: mergeContribs(prev.contributesTo ?? [], x.contributesTo ?? []),
        checklist: mergeChecklists(prev.checklist ?? [], x.checklist ?? []),
      });
    } else {
      byName.set(k, clone(x));
    }
  }
  return [...byName.values()].sort((p, q) => (Number(p.seq) || 0) - (Number(q.seq) || 0));
}

function mergeWorkProducts(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const wp of a ?? []) {
    if (wp?.name) byName.set(String(wp.name), clone(wp));
  }
  for (const wp of b ?? []) {
    if (!wp?.name) continue;
    const k = String(wp.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, wp),
        levelsOfDetail: mergeLevelsOfDetail(prev.levelsOfDetail ?? [], wp.levelsOfDetail ?? []),
      });
    } else {
      byName.set(k, clone(wp));
    }
  }
  return [...byName.values()];
}

function mergeNarrativeElements(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const item of a ?? []) {
    if (item?.name) byName.set(String(item.name), clone(item));
  }
  for (const item of b ?? []) {
    if (!item?.name) continue;
    const k = String(item.name);
    if (byName.has(k)) byName.set(k, mergePracticeElements(byName.get(k), item));
    else byName.set(k, clone(item));
  }
  return [...byName.values()];
}

function mergeNarrativeTypes(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const nt of a ?? []) {
    if (nt?.name) byName.set(String(nt.name), clone(nt));
  }
  for (const nt of b ?? []) {
    if (!nt?.name) continue;
    const k = String(nt.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, nt),
        narrativeElements: mergeNarrativeElements(prev.narrativeElements ?? [], nt.narrativeElements ?? []),
      });
    } else {
      byName.set(k, clone(nt));
    }
  }
  return [...byName.values()];
}

function mergePersonas(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const p of a ?? []) {
    if (p?.name) byName.set(String(p.name), clone(p));
  }
  for (const p of b ?? []) {
    if (!p?.name) continue;
    const k = String(p.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, p),
        competencies: [...(prev.competencies ?? []), ...(p.competencies ?? [])],
      });
    } else {
      byName.set(k, clone(p));
    }
  }
  return [...byName.values()];
}

function mergePersonaGroups(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pg of a ?? []) {
    if (pg?.name) byName.set(String(pg.name), clone(pg));
  }
  for (const pg of b ?? []) {
    if (!pg?.name) continue;
    const k = String(pg.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, pg),
        personaNames: uniqStrings([...(prev.personaNames ?? []), ...(pg.personaNames ?? [])]),
      });
    } else {
      byName.set(k, clone(pg));
    }
  }
  return [...byName.values()];
}

function mergePatternViews(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pv of a ?? []) {
    if (pv?.name) byName.set(String(pv.name), clone(pv));
  }
  for (const pv of b ?? []) {
    if (!pv?.name) continue;
    const k = String(pv.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, pv),
        seq: pv.seq ?? prev.seq,
        narrativeElementName:
          pv.narrativeElementName !== undefined && String(pv.narrativeElementName).trim() !== ""
            ? pv.narrativeElementName
            : prev.narrativeElementName,
        activitySpaces: uniqStrings([...(prev.activitySpaces ?? []), ...(pv.activitySpaces ?? [])]),
        activities: uniqStrings([...(prev.activities ?? []), ...(pv.activities ?? [])]),
        alphaStates: mergePatternViewAlphaStates(prev.alphaStates ?? [], pv.alphaStates ?? []),
      });
    } else {
      byName.set(k, clone(pv));
    }
  }
  return [...byName.values()].sort((p, q) => (Number(p.seq) || 0) - (Number(q.seq) || 0));
}

function mergePatterns(a: any[], b: any[]): any[] {
  const byName = new Map<string, any>();
  for (const pat of a ?? []) {
    if (pat?.name) byName.set(String(pat.name), clone(pat));
  }
  for (const pat of b ?? []) {
    if (!pat?.name) continue;
    const k = String(pat.name);
    if (byName.has(k)) {
      const prev = byName.get(k);
      byName.set(k, {
        ...mergePracticeElements(prev, pat),
        narrativeTypeName:
          typeof pat.narrativeTypeName === "string" && pat.narrativeTypeName.trim() !== ""
            ? pat.narrativeTypeName
            : prev.narrativeTypeName,
        patternViews: mergePatternViews(prev.patternViews ?? [], pat.patternViews ?? []),
      });
    } else {
      byName.set(k, clone(pat));
    }
  }
  return [...byName.values()];
}

/**
 * Builds one {@link Practice}-shaped document from a {@link Method}: start from `baselinePractice`,
 * then merge each extension practice by matching PracticeElement `name` within each collection.
 * Activity spaces merge with nested {@link Activity} children under each space (flat `Practice.activities` folded in).
 */
export function compositePracticeFromMethod(method: Method): Record<string, unknown> {
  const baseline = clone(method.baselinePractice);
  const practices = method.practices ?? [];
  /** Embedded baseline-shaped arrays on the Method baseline (optional overlays). */
  const baselineDoc = baseline as Record<string, unknown>;
  const baselineWorkProducts = Array.isArray(baselineDoc.workProducts) ? (baselineDoc.workProducts as any[]) : [];
  const baselinePatterns = Array.isArray(baselineDoc.patterns) ? (baselineDoc.patterns as any[]) : [];
  const baselineNarrativeTypes = Array.isArray(baselineDoc.narrativeTypes) ? (baselineDoc.narrativeTypes as any[]) : [];
  const baselinePersonas = Array.isArray(baselineDoc.personas) ? (baselineDoc.personas as any[]) : [];
  const baselinePersonaGroups = Array.isArray(baselineDoc.personaGroups) ? (baselineDoc.personaGroups as any[]) : [];
  const mergedRootTags = mergePracticeElementTags(method.tags, baseline.tags);
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
  };

  let slotMap = toSpaceSlotMap(baseline.activitySpaces ?? [], []);
  for (const p of practices) {
    slotMap = mergeSpaceSlotMaps(slotMap, toSpaceSlotMap(p.activitySpaces ?? [], p.activities ?? []));
  }
  out.activitySpaces = slotMapToRows(slotMap, collectSpaceKeyOrder(baseline.activitySpaces ?? [], practices));

  for (const p of practices) {
    out.focuses = mergeFocuses(out.focuses as any, p.focuses ?? []);
    out.alphas = mergeAlphas(out.alphas as any, p.alphas ?? []);
    out.competencies = mergeCompetencies(out.competencies as any, p.competencies ?? []);
    out.authors = uniqStrings([...(out.authors as string[]), ...((p.authors ?? []) as string[])]);
    out.keywords = uniqStrings([...(out.keywords as string[]), ...((p.keywords ?? []) as string[])]);
    out.practiceDependencyNames = uniqStrings([
      ...(out.practiceDependencyNames as string[]),
      ...((p.practiceDependencyNames ?? []) as string[]),
    ]);
    out.workProducts = mergeWorkProducts(out.workProducts as any, (p.workProducts ?? []) as any[]);
    out.narrativeTypes = mergeNarrativeTypes(out.narrativeTypes as any, ((p as any).narrativeTypes ?? []) as any[]);
    out.personas = mergePersonas(out.personas as any, ((p as any).personas ?? []) as any[]);
    out.personaGroups = mergePersonaGroups(out.personaGroups as any, ((p as any).personaGroups ?? []) as any[]);
    out.patterns = mergePatterns(out.patterns as any, (p.patterns ?? []) as any[]);
    if (typeof p.updatedAt === "string" && p.updatedAt.trim()) out.updatedAt = p.updatedAt;
  }

  const mergedAliases = mergePracticeElementAliasLists(practices.map((p) => p.practiceElementAliases));
  if (mergedAliases.length) out.practiceElementAliases = mergedAliases;

  if (!(out.workProducts as any[]).length) delete out.workProducts;
  if (!(out.narrativeTypes as any[]).length) delete out.narrativeTypes;
  if (!(out.personas as any[]).length) delete out.personas;
  if (!(out.personaGroups as any[]).length) delete out.personaGroups;
  if (!(out.patterns as any[]).length) delete out.patterns;
  if (!(out.practiceDependencyNames as string[]).length) delete out.practiceDependencyNames;

  out.alphas = aggregateSupportingAlphasFromContributesTo(out.alphas as PracticeBaseline["alphas"]);

  propagateDerivedFocusNames(out as { alphas?: any[]; activitySpaces?: any[]; activities?: any[] });
  finalizeImplicitFocusPlaceholders(out as { activitySpaces?: any[]; alphas?: any[] });
  return out;
}
