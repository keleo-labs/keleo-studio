import type { PracticeBaseline } from "@/lib/types";
import { canonicalPracticeElementName } from "@/lib/ir";

export type ElementSource = "baseline" | "extension" | "dependency";

export type ElementSourceMap = Map<string, ElementSource>;

/**
 * Build a map tracking which elements come from baseline vs extension.
 * Keys are paths like "alphas.Solution" or "alphas.Solution.states.In Use.checklist.Baseline Item"
 */
export function buildElementSourceMap(
  extensionDoc: Record<string, unknown>,
  baseline: PracticeBaseline | null,
  dependencies: Record<string, unknown>[]
): ElementSourceMap {
  const map = new Map<string, ElementSource>();

  if (!baseline) return map;

  // Track baseline alphas
  for (const alpha of baseline.alphas ?? []) {
    const alphaName = canonicalPracticeElementName(alpha?.name) ?? "";
    if (!alphaName) continue;
    map.set(`alphas.${alphaName}`, "baseline");
    map.set(`alphas.${alphaName}.description`, "baseline");
    map.set(`alphas.${alphaName}.focusName`, "baseline");

    // Track baseline states
    for (const state of (alpha as any).states ?? []) {
      const stateName = canonicalPracticeElementName(state?.name) ?? "";
      if (!stateName) continue;
      const stateKey = `alphas.${alphaName}.states.${stateName}`;
      map.set(stateKey, "baseline");
      map.set(`${stateKey}.description`, "baseline");

      // Track baseline checklist items
      for (const item of state.checklist ?? []) {
        const itemName = canonicalPracticeElementName(item?.name) ?? "";
        if (!itemName) continue;
        map.set(`${stateKey}.checklist.${itemName}`, "baseline");
      }

      // Track baseline narratives
      for (const narr of (state.narratives ?? []) as any[]) {
        const narrName = String(narr?.name ?? "").trim();
        if (narrName) map.set(`${stateKey}.narratives.${narrName}`, "baseline");
      }
    }
  }

  // Track baseline focuses
  for (const focus of baseline.focuses ?? []) {
    const focusName = canonicalPracticeElementName(focus?.name) ?? "";
    if (!focusName) continue;
    map.set(`focuses.${focusName}`, "baseline");
    map.set(`focuses.${focusName}.description`, "baseline");
  }

  // Track baseline activity spaces
  for (const space of baseline.activitySpaces ?? []) {
    const spaceName = canonicalPracticeElementName((space as any)?.name) ?? "";
    if (!spaceName) continue;
    map.set(`activitySpaces.${spaceName}`, "baseline");
    map.set(`activitySpaces.${spaceName}.description`, "baseline");
    map.set(`activitySpaces.${spaceName}.focusName`, "baseline");

    // Track baseline activities within space
    for (const act of (space as any).activities ?? []) {
      const actName = canonicalPracticeElementName(act?.name) ?? "";
      if (!actName) continue;
      const actKey = `activitySpaces.${spaceName}.activities.${actName}`;
      map.set(actKey, "baseline");
      map.set(`${actKey}.description`, "baseline");
      map.set(`${actKey}.focusName`, "baseline");
    }
  }

  // Track baseline competencies
  for (const comp of baseline.competencies ?? []) {
    const compName = canonicalPracticeElementName(comp?.name) ?? "";
    if (!compName) continue;
    map.set(`competencies.${compName}`, "baseline");
    map.set(`competencies.${compName}.description`, "baseline");

    // Track baseline competency levels
    for (const level of comp.levels ?? []) {
      const levelName = canonicalPracticeElementName(level?.name) ?? "";
      if (!levelName) continue;
      const levelKey = `competencies.${compName}.levels.${levelName}`;
      map.set(levelKey, "baseline");
      map.set(`${levelKey}.description`, "baseline");
    }
  }

  // Track baseline work products
  const baselineDoc = baseline as Record<string, unknown>;
  for (const wp of (baselineDoc.workProducts ?? []) as any[]) {
    const wpName = canonicalPracticeElementName(wp?.name) ?? "";
    if (!wpName) continue;
    map.set(`workProducts.${wpName}`, "baseline");
    map.set(`workProducts.${wpName}.description`, "baseline");

    for (const lod of wp.levelsOfDetail ?? []) {
      const lodName = canonicalPracticeElementName(lod?.name) ?? "";
      if (!lodName) continue;
      const lodKey = `workProducts.${wpName}.levelsOfDetail.${lodName}`;
      map.set(lodKey, "baseline");
      map.set(`${lodKey}.description`, "baseline");

      // Track baseline checklist items
      for (const item of lod.checklist ?? []) {
        const itemName = canonicalPracticeElementName(item?.name) ?? "";
        if (itemName) map.set(`${lodKey}.checklist.${itemName}`, "baseline");
      }

      // Track baseline narratives in LOD
      for (const narr of (lod.narratives ?? []) as any[]) {
        const narrName = String(narr?.name ?? "").trim();
        if (narrName) map.set(`${lodKey}.narratives.${narrName}`, "baseline");
      }
    }
  }

  // Track baseline narrative types
  for (const nt of (baselineDoc.narrativeTypes ?? []) as any[]) {
    const ntName = canonicalPracticeElementName(nt?.name) ?? "";
    if (!ntName) continue;
    map.set(`narrativeTypes.${ntName}`, "baseline");
    map.set(`narrativeTypes.${ntName}.description`, "baseline");

    // Track baseline narrative elements
    for (const ne of (nt.narrativeElements ?? []) as any[]) {
      const neName = canonicalPracticeElementName(ne?.name) ?? "";
      if (!neName) continue;
      const neKey = `narrativeTypes.${ntName}.narrativeElements.${neName}`;
      map.set(neKey, "baseline");
      map.set(`${neKey}.description`, "baseline");
      map.set(`${neKey}.howToUse`, "baseline");
    }
  }

  // Track baseline personas
  for (const persona of (baselineDoc.personas ?? []) as any[]) {
    const personaName = canonicalPracticeElementName(persona?.name) ?? "";
    if (!personaName) continue;
    map.set(`personas.${personaName}`, "baseline");
    map.set(`personas.${personaName}.description`, "baseline");
  }

  // Track baseline persona groups
  for (const pg of (baselineDoc.personaGroups ?? []) as any[]) {
    const pgName = canonicalPracticeElementName(pg?.name) ?? "";
    if (!pgName) continue;
    map.set(`personaGroups.${pgName}`, "baseline");
    map.set(`personaGroups.${pgName}.description`, "baseline");
  }

  // Track baseline patterns
  for (const pattern of (baselineDoc.patterns ?? []) as any[]) {
    const patternName = canonicalPracticeElementName(pattern?.name) ?? "";
    if (!patternName) continue;
    map.set(`patterns.${patternName}`, "baseline");
    map.set(`patterns.${patternName}.description`, "baseline");

    // Track baseline pattern views
    for (const pv of (pattern.patternViews ?? []) as any[]) {
      const pvName = canonicalPracticeElementName(pv?.name) ?? "";
      if (!pvName) continue;
      const pvKey = `patterns.${patternName}.patternViews.${pvName}`;
      map.set(pvKey, "baseline");
      map.set(`${pvKey}.description`, "baseline");
    }
  }

  // Track dependencies similarly (mark as "dependency")
  for (const dep of dependencies) {
    const depDoc = dep as any;

    // Track dependency alphas
    for (const alpha of depDoc.alphas ?? []) {
      const alphaName = canonicalPracticeElementName(alpha?.name) ?? "";
      if (!alphaName) continue;

      // Only mark as dependency if not already marked as baseline
      if (!map.has(`alphas.${alphaName}`)) {
        map.set(`alphas.${alphaName}`, "dependency");
        map.set(`alphas.${alphaName}.description`, "dependency");
      }

      for (const state of alpha.states ?? []) {
        const stateName = canonicalPracticeElementName(state?.name) ?? "";
        if (!stateName) continue;
        const stateKey = `alphas.${alphaName}.states.${stateName}`;

        if (!map.has(stateKey)) {
          map.set(stateKey, "dependency");
          map.set(`${stateKey}.description`, "dependency");
        }

        // Track dependency checklist items
        for (const item of state.checklist ?? []) {
          const itemName = canonicalPracticeElementName(item?.name) ?? "";
          if (!itemName) continue;
          const itemKey = `${stateKey}.checklist.${itemName}`;
          if (!map.has(itemKey)) {
            map.set(itemKey, "dependency");
          }
        }
      }
    }

    // Similar for other dependency elements (activity spaces, competencies, etc.)
  }

  return map;
}

/**
 * Check if a given path refers to a baseline element (readonly).
 */
export function isBaselineElement(path: string, sourceMap: ElementSourceMap): boolean {
  return sourceMap.get(path) === "baseline";
}

/**
 * Check if a given path refers to a dependency element (readonly for descriptions).
 */
export function isDependencyElement(path: string, sourceMap: ElementSourceMap): boolean {
  return sourceMap.get(path) === "dependency";
}

/**
 * Get all baseline checklist item names for a given alpha state.
 */
export function getBaselineChecklistItemNames(
  sourceMap: ElementSourceMap,
  alphaName: string,
  stateName: string
): Set<string> {
  const prefix = `alphas.${alphaName}.states.${stateName}.checklist.`;
  const names = new Set<string>();

  for (const [key, source] of sourceMap.entries()) {
    if (source === "baseline" && key.startsWith(prefix)) {
      const itemName = key.slice(prefix.length);
      if (itemName) names.add(itemName);
    }
  }

  return names;
}

/**
 * Get all baseline state names for a given alpha.
 */
export function getBaselineStateNames(
  sourceMap: ElementSourceMap,
  alphaName: string
): Set<string> {
  const prefix = `alphas.${alphaName}.states.`;
  const names = new Set<string>();

  for (const [key, source] of sourceMap.entries()) {
    if (source === "baseline" && key.startsWith(prefix) && !key.includes(".", prefix.length)) {
      const stateName = key.slice(prefix.length);
      if (stateName) names.add(stateName);
    }
  }

  return names;
}
