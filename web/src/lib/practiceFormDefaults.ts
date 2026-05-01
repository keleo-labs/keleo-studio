/** Default subtree shapes for the practice editor (see public/language.schema.json). */

export function emptyPracticeElement(name = "", description = ""): Record<string, unknown> {
  return { name, description };
}

export function emptyFocus(): Record<string, unknown> {
  return emptyPracticeElement();
}

export function alphaContribution(alphaName = "", stateName = ""): Record<string, unknown> {
  return { alphaName, stateName };
}

export function workProductContribution(wp = "", lod = ""): Record<string, unknown> {
  return { workProductName: wp, levelOfDetailName: lod };
}

export function competencyLevelRef(competencyName = "", levelName = ""): Record<string, unknown> {
  return { competencyName, competencyLevelName: levelName };
}

export function patternViewReference(patternName = "", patternViewName = ""): Record<string, unknown> {
  return { patternName, patternViewName };
}

export function activitySpaceReference(activitySpaceName = ""): Record<string, unknown> {
  return { activitySpaceName };
}

export function checklistItem(seq: number): Record<string, unknown> {
  return { ...emptyPracticeElement("", ""), seq };
}

export function emptyState(seq: number): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    seq,
    checklist: [] as Record<string, unknown>[],
  };
}

/** Strict schema expects ≥3 states on Alpha; starter set satisfies it. */
export function emptyAlpha(focusFallback = ""): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    focusName: focusFallback,
    states: [emptyState(1), emptyState(2), emptyState(3)],
  };
}

export function emptyActivitySpace(focusFallback = ""): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    focusName: focusFallback,
    contributesTo: [alphaContribution()],
    requiredCompetencies: [] as string[],
    involves: [] as string[],
    activities: [] as Record<string, unknown>[],
  };
}

export function emptyActivity(parentSpaceName = ""): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    activitySpaceName: parentSpaceName,
    focusName: "",
    contributesTo: [] as Record<string, unknown>[],
    requiredCompetencies: [] as string[],
    worksOn: [] as Record<string, unknown>[],
    recommendedCompetencyLevels: [] as Record<string, unknown>[],
  };
}

export function emptyCompetencyLevel(seq: number, competencyNameFallback = ""): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    level: seq,
    competencyName: competencyNameFallback,
  };
}

export function emptyCompetency(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    levels: [emptyCompetencyLevel(1, "")],
  };
}

export function emptyLevelOfDetail(seq: number): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    seq,
    checklist: [] as Record<string, unknown>[],
    contributesTo: [alphaContribution()],
  };
}

/** Strict schema: ≥2 levels of detail. */
export function emptyWorkProduct(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    levelsOfDetail: [emptyLevelOfDetail(1), emptyLevelOfDetail(2)],
  };
}

export function emptyNarrativeElement(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    howToUse: "",
  };
}

export function emptyNarrativeType(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    narrativeElements: [] as Record<string, unknown>[],
  };
}

export function emptyPersona(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    competencies: [] as Record<string, unknown>[],
  };
}

export function emptyPersonaGroup(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    personaNames: [] as string[],
  };
}

export function emptyPatternView(seq: number): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    seq,
    narrativeElementName: "",
    alphaStates: [] as unknown[],
    activitySpaces: [] as string[],
    activities: [] as string[],
  };
}

export function emptyPattern(): Record<string, unknown> {
  return {
    ...emptyPracticeElement("", ""),
    narrativeTypeName: "",
    patternViews: [emptyPatternView(1)],
  };
}

export function emptyExtensionPractice(): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...emptyPracticeElement("", ""),
    baselinePracticeName: "",
    practiceDependencyNames: [] as string[],
    authors: [] as string[],
    keywords: [] as string[],
    version: "0.1.0",
    createdAt: today,
    updatedAt: today,
    focuses: [] as Record<string, unknown>[],
    alphas: [] as Record<string, unknown>[],
    competencies: [] as Record<string, unknown>[],
    activitySpaces: [] as Record<string, unknown>[],
    activities: [] as Record<string, unknown>[],
    workProducts: [] as Record<string, unknown>[],
    personas: [] as Record<string, unknown>[],
    personaGroups: [] as Record<string, unknown>[],
    narrativeTypes: [] as Record<string, unknown>[],
    patterns: [] as Record<string, unknown>[],
  };
}

export function emptyBaselinePractice(): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...emptyPracticeElement("", ""),
    authors: [] as string[],
    keywords: [] as string[],
    version: "0.1.0",
    createdAt: today,
    updatedAt: today,
    focuses: [] as Record<string, unknown>[],
    alphas: [] as Record<string, unknown>[],
    competencies: [] as Record<string, unknown>[],
    activitySpaces: [] as Record<string, unknown>[],
    narrativeTypes: [] as Record<string, unknown>[],
  };
}
