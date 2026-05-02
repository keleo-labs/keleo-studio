export type ValidationIssue = {
  path: string;
  message: string;
};

export type RefIssue = {
  kind: "missing";
  type:
    | "Focus"
    | "Alpha"
    | "AlphaState"
    | "ActivitySpace"
    | "Competency"
    | "WorkProduct"
    | "LevelOfDetail"
    | "Pattern"
    | "PatternView"
    | "PersonaGroup";
  ref: string;
  context?: string;
};

/** Canonical tag buckets (language.schema.json); legacy documents may use `string[]` at `tags`. */
export type PracticeElementTags = {
  domainTags?: string[];
  lifecycleTags?: string[];
  organizationalTags?: string[];
};

/** Core fields shared by every practice artifact (excluding recursive `narratives`). */
export type PracticeElementIdentity = {
  name: string;
  description: string;
  tags?: PracticeElementTags | string[];
};

export type NarrativeContext = {
  seq: number;
  narrativeElementName: string;
  context: string;
};

/** Embedded narrative breakdown subtree (`PracticeElement.narratives`; language.schema.json). */
export type Narrative = PracticeElementIdentity & {
  narratives?: Narrative[];
  narrativeName: string;
  narrativeTypeName: string;
  narrativeContexts: NarrativeContext[];
};

export type PracticeElement = PracticeElementIdentity & {
  narratives?: Narrative[];
};

export type AlphaContribution = {
  alphaName: string;
  stateName: string;
};

export type WorkProductContribution = {
  workProductName: string;
  levelOfDetailName: string;
};

/** References a competency level by competency and level name (language.mmd). */
export type CompetencyLevelReference = {
  competencyName: string;
  competencyLevelName: string;
};

export type NarrativeElement = PracticeElement & {
  howToUse: string;
};

export type NarrativeType = PracticeElement & {
  narrativeElements?: NarrativeElement[];
};

export type Persona = PracticeElement & {
  competencies?: CompetencyLevelReference[];
};

export type PersonaGroup = PracticeElement & {
  personaNames: string[];
};

export type PatternViewReference = {
  patternName: string;
  patternViewName: string;
};

/** Local alias for a named element within the same Practice document (language.mmd). */
export type PracticeElementAlias = {
  practiceElementType: string;
  practiceElementName: string;
  aliasName: string;
};

/** Essence swimlane activity; nested under ActivitySpace.activities or flat on Practice.activities (legacy). */
export type PracticeActivity = PracticeElement & {
  activitySpaceName?: string;
  focusName: string;
  contributesTo: { alphaName: string; stateName: string }[];
  requiredCompetencies: string[];
  /** Symbolic PersonaGroup.name refs (same as ActivitySpace.involves; schema ActivitySpaceCore). */
  involves?: string[];
  worksOn: WorkProductContribution[];
  recommendedCompetencyLevels: CompetencyLevelReference[];
};

export type PracticeBaseline = PracticeElement & {
  focuses: PracticeElement[];
  alphas: (PracticeElement & {
    focusName: string;
    /** Optional name of another alpha this alpha contributes to (same baseline; language.mmd). */
    contributesTo?: string;
    /** Optional names of contributing / child alphas under this rollup alpha (same baseline; unioned when merging practices). */
    supportingAlphas?: string[];
    states: (PracticeElement & { seq: number; checklist: (PracticeElement & { seq: number })[] })[];
  })[];
  activitySpaces: (PracticeElement & {
    contributesTo: { alphaName: string; stateName: string }[];
    focusName: string;
    requiredCompetencies: string[];
    /** Symbolic PersonaGroup.name refs (same practice / merged scope; language.mmd). */
    involves?: string[];
    activities?: PracticeActivity[];
  })[];
  competencies: (PracticeElement & {
    levels: (PracticeElement & { level: number; competencyName: string })[];
  })[];
  authors: string[];
  createdAt: string;
  updatedAt: string;
  version: string;
  keywords: string[];
  narrativeTypes?: NarrativeType[];
};

export type WorkProduct = PracticeElement & {
  levelsOfDetail: (PracticeElement & {
    seq: number;
    checklist: (PracticeElement & { seq: number })[];
    contributesTo: AlphaContribution[];
  })[];
};

/** Canonical alpha/state slice or legacy string token (see language.schema.json PatternView.alphaStates). */
export type PatternViewAlphaState = AlphaContribution | string;

export type PatternView = PracticeElement & {
  seq: number;
  alphaStates: PatternViewAlphaState[];
  /** ActivitySpace.name entries for matrix swimlanes (symbolic links). Legacy: may also list Activity.name here. */
  activitySpaces?: string[];
  /** Activity.name entries for matrix swimlanes (nested or flat activities; symbolic links). */
  activities?: string[];
  /** Optional hook to NarrativeElement.name under Pattern.narrativeTypeName spine. */
  narrativeElementName?: string;
};

export type Pattern = PracticeElement & {
  patternViews: PatternView[];
  narrativeTypeName?: string;
};

/** Practice document: names a baseline; baseline-shaped fields are optional overlays. */
export type Practice = PracticeElement & {
  baselinePracticeName: string;
  /** When set on merged output (e.g. {@link compositePracticeFromMethod}), baseline provenance without implying an unresolved extension. */
  mergesBaselinePracticeName?: string;
  /**
   * Other practices merged after the named baseline during resolution. **Order defines hierarchy among extensions:**
   * entries earlier in the array are **above** later entries — they merge first onto the accumulating document, so on
   * same-named elements their `description` prevails under the merge rules implemented in **`compositePracticeFromMethod`**.
   */
  practiceDependencyNames?: string[];
  practiceElementAliases?: PracticeElementAlias[];
  focuses?: PracticeBaseline["focuses"];
  alphas?: PracticeBaseline["alphas"];
  activitySpaces?: PracticeBaseline["activitySpaces"];
  competencies?: PracticeBaseline["competencies"];
  authors?: string[];
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  keywords?: string[];
  activities?: PracticeActivity[];
  workProducts?: WorkProduct[];
  patterns?: Pattern[];
  personas?: Persona[];
  personaGroups?: PersonaGroup[];
  /** Baseline-overlay narrative spine types (merged like focuses when composing methods). */
  narrativeTypes?: NarrativeType[];
};

export type Method = PracticeElement & {
  /** Canonical kernel artifact; head of the practice hierarchy — always merges first into the accumulator. */
  baselinePractice: PracticeBaseline;
  /**
   * Extension layers merged after {@link baselinePractice}, in hierarchy order — **nearest baseline first**, leaf
   * practice last (e.g. `[...dependencyPracticesFromLibraryInDependencyListOrder, primaryPractice]`).
   * Each layer overlays the accumulator under {@link compositePracticeFromMethod}: earlier layers keep `description` on same-named rows when later layers redefine them.
   */
  practices?: Practice[];
};

