export type ValidationIssue = {
  path: string;
  message: string;
};

export type RefIssue = {
  kind: "missing";
  type: "Focus" | "Alpha" | "AlphaState" | "ActivitySpace" | "Competency" | "WorkProduct" | "LevelOfDetail" | "Pattern" | "PatternView";
  ref: string;
  context?: string;
};

/** Canonical tag buckets (language.schema.json); legacy documents may use `string[]` at `tags`. */
export type PracticeElementTags = {
  domainTags?: string[];
  lifecycleTags?: string[];
  organizationalTags?: string[];
};

export type PracticeElement = {
  name: string;
  description: string;
  tags?: PracticeElementTags | string[];
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

export type ActivitySpaceReference = {
  activitySpaceName: string;
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

export type Estimate = {
  lowEst: number;
  medEst: number;
  highEst: number;
};

export type Complexity = PracticeElement & {
  level: number;
  contractType: string;
  /** Present when a single alpha/state slice is modeled (language.mmd 0..1). */
  valueRisk?: AlphaContribution;
  technicalRisk?: AlphaContribution;
  stakeholderEngagement?: AlphaContribution;
  productRisks: AlphaContribution[];
  projectRisks: AlphaContribution[];
};

export type WorkItem = PracticeElement & {
  seq: number;
  implementsActivityName: string;
  contributesTo: AlphaContribution[];
  worksOn: WorkProductContribution[];
  applies: ActivitySpaceReference[];
  estimate: Estimate;
};

export type WorkBreakdown = PracticeElement & {
  prerequisiteAndAssumptions: PatternViewReference[];
  /** Forecasting unit (language.schema.json); optional on partial/runtime JSON. */
  estimationUnit?: "man-hours" | "story-points" | "currency" | string;
  task: WorkItem[];
  complexity: Complexity;
};

/** Essence swimlane activity; nested under ActivitySpace.activities or flat on Practice.activities (legacy). */
export type PracticeActivity = PracticeElement & {
  activitySpaceName?: string;
  focusName: string;
  contributesTo: { alphaName: string; stateName: string }[];
  requiredCompetencies: string[];
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
};

export type Pattern = PracticeElement & {
  patternViews: PatternView[];
};

/** Practice document: names a baseline; baseline-shaped fields are optional overlays. */
export type Practice = PracticeElement & {
  baselinePracticeName: string;
  /** When set on merged output (e.g. {@link compositePracticeFromMethod}), baseline provenance without implying an unresolved extension. */
  mergesBaselinePracticeName?: string;
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
  workBreakdowns?: WorkBreakdown[];
  patterns?: Pattern[];
};

/** Enriched baseline plus practice-root overlays for alternate readable previews (business / delivery / SOW). */
export type ReadablePracticePreviewDoc = PracticeBaseline &
  Partial<Pick<Practice, "patterns" | "activities" | "workProducts" | "workBreakdowns" | "practiceElementAliases">>;

export type Method = PracticeElement & {
  baselinePractice: PracticeBaseline;
  practices?: Practice[];
};

