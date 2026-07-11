/**
 * Deduplicates competency level references by competencyName + competencyLevelName.
 * Keeps the first occurrence of each unique combination.
 */
function deduplicateCompetencies(competencies: unknown[]): unknown[] {
  const seen = new Set<string>();
  return competencies.filter((comp) => {
    if (!comp || typeof comp !== "object") return true;
    const c = comp as Record<string, unknown>;
    const key = `${c.competencyName}::${c.competencyLevelName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Normalizes practice and method bodies by ensuring required arrays exist.
 *
 * For practices with dependencies but no local elements, this ensures empty arrays
 * exist for alphas, activitySpaces, activities, workProducts, personas, and personaGroups.
 * This normalization prevents undefined access errors during rendering and processing.
 *
 * For methods with embedded practices, recursively normalizes each practice.
 *
 * Also automatically deduplicates competency level references in personas.
 *
 * @param body - The practice/method body to normalize (unknown type for safety)
 * @returns Normalized body with guaranteed array properties, or the original if not applicable
 */
export function normalizePracticeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const o = body as Record<string, unknown>;

  // Check if this is a Method first (has kind: "method" or a practices array)
  const isMethod = o.kind === "method" || Array.isArray(o.practices);
  if (isMethod) {
    // Check if this is a Method with embedded practices - recursively normalize
    if (Array.isArray(o.practices)) {
      return {
        ...o,
        practices: o.practices.map((p) => normalizePracticeBody(p)),
      };
    }
    return body;
  }

  // Check if this is a Practice (has baselinePracticeName or practiceDependencyNames)
  const isPractice = typeof o.baselinePracticeName === "string" || Array.isArray(o.practiceDependencyNames);
  if (!isPractice) {
    return body;
  }

  // Normalize personas and deduplicate competencies
  let personas = Array.isArray(o.personas) ? o.personas : [];
  personas = personas.map((persona) => {
    if (!persona || typeof persona !== "object") return persona;
    const p = persona as Record<string, unknown>;
    if (Array.isArray(p.competencies) && p.competencies.length > 0) {
      return {
        ...p,
        competencies: deduplicateCompetencies(p.competencies),
      };
    }
    return persona;
  });

  // Normalize practice by ensuring all element arrays exist
  return {
    ...o,
    alphas: Array.isArray(o.alphas) ? o.alphas : [],
    activitySpaces: Array.isArray(o.activitySpaces) ? o.activitySpaces : [],
    activities: Array.isArray(o.activities) ? o.activities : [],
    workProducts: Array.isArray(o.workProducts) ? o.workProducts : [],
    personas,
    personaGroups: Array.isArray(o.personaGroups) ? o.personaGroups : [],
  };
}
