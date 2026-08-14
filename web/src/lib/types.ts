export type ValidationIssue = {
  path: string;
  message: string;
};

export type DocumentVersionConstraint = {
  documentName: string;
  versionRange: string;
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

/** Reference to a visual asset with semantic type classification (language.schema.json AssetReference). */
export type AssetReference = {
  assetName: string;
  type: "icon" | "illustrative" | "template" | "diagram";
};

/** Visual asset definition (language.schema.json Asset). */
export type Asset = {
  name: string;
  description?: string;
  type: "image" | "diagram" | "template" | "icon" | "font-character";
  path?: string;
  mimeType?: string;
  checksum?: string;
  dataUri?: string;
  url?: string;
  fontFamily?: string;
  fontCharacter?: string;
  fontWeight?: string;
  fontUrl?: string;
};

/** Core fields shared by every practice artifact (excluding recursive `narratives`). */
export type PracticeElementIdentity = {
  name: string;
  description: string;
  tags?: PracticeElementTags | string[];
  assetNames?: AssetReference[];
};

export type NarrativeContext = {
  seq: number;
  narrativeElementName: string;
  context: string;
};

/** Embedded narrative breakdown subtree (`PracticeElement.narratives`; language.schema.json). */
export type Narrative = PracticeElementIdentity & {
  narratives?: Narrative[];
  narrativeTypeName: string;
  narrativeContexts: NarrativeContext[];
  citationNames?: string[];
};

export type PracticeElement = PracticeElementIdentity & {
  narratives?: Narrative[];
};

/** Acknowledgement of a person or institution (language.schema.json Acknowledgement). */
export type Acknowledgement = PracticeElement & {
  url?: string;
};

/** Bibliographic reference (language.schema.json Citation). */
export type Citation = PracticeElement & {
  authors: string[];
  date: string;
  source: string;
  url?: string;
};

export type AlphaContribution = {
  alphaName: string;
  stateName: string;
};

export type BaselineAlphaReference = {
  baselineName: string;
  alphaName: string;
};

export type StateContribution = {
  fromState: string;
  toState: string;
};

export type ContributingAlpha = BaselineAlphaReference & {
  stateContributions?: StateContribution[];
};

export type AlphaBinding = {
  baselineAlpha: BaselineAlphaReference;
  contributingAlphas: ContributingAlpha[];
};

export type AlphaInstanceStateReference = {
  instanceName: string;
  stateName: string;
};

export type WorkProductInstanceLevelReference = {
  instanceName: string;
  levelOfDetailName: string;
};

export type Background = {
  given?: string[];
  alphaStates?: AlphaContribution[];
  workProductLevels?: WorkProductContribution[];
  alphaInstanceStates?: AlphaInstanceStateReference[];
  workProductInstanceLevels?: WorkProductInstanceLevelReference[];
};

export type Test = PracticeElement & {
  given?: string[];
  when?: string[];
  then?: string[];
};

export type ExternalLink = {
  name: string;
  description?: string;
  uri?: string;
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

export type Note = {
  name: string;
  timestamp: string;
  content: string;
  links?: ExternalLink[];
};

export type ChecklistState = {
  checklistName: string;
  state: "complete" | "not complete" | "not required";
  evidence?: ExternalLink;
  notes?: Note[];
};

export type WorkProductInstance = PracticeElement & {
  workProductName: string;
  levelOfDetailName: string;
  checklistStates?: ChecklistState[];
  background?: Background;
  links?: ExternalLink[];
};

export type AlphaInstance = PracticeElement & {
  alphaName: string;
  stateName: string;
  evidenceBy?: WorkProductInstance[];
  checklistStates?: ChecklistState[];
  background?: Background;
  links?: ExternalLink[];
};

/** Practice-level tagging row (`Practice.alphaInstances[]`; schema `AlphaInstanceName`). */
export type AlphaInstanceNameRow = PracticeElement & {
  alphaName: string;
  links?: ExternalLink[];
};

/** Practice-level tagging row (`Practice.workProductInstances[]`; schema `WorkProductInstanceName`). */
export type WorkProductInstanceNameRow = PracticeElement & {
  workProductName: string;
  links?: ExternalLink[];
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
  involves?: string[];
  worksOn: WorkProductContribution[];
  recommendedCompetencyLevels: CompetencyLevelReference[];
  background?: Background;
  test?: Test;
  examples?: Test[];
};

export type AlphaRelationship = {
  relationship: string;
  alphaName: string;
  direction: "outgoing" | "incoming" | "mutual";
  description?: string;
};

export type PracticeBaseline = PracticeElement & {
  focuses: PracticeElement[];
  alphas: (PracticeElement & {
    focusName: string;
    /** Optional name of another alpha this alpha contributes to (same baseline; language.mmd). */
    contributesTo?: string;
    /** Optional name of another alpha this alpha is a variant of (same state progression; mutually exclusive with contributesTo). */
    mapsTo?: string;
    /** Optional names of contributing / child alphas under this rollup alpha (same baseline; unioned when merging practices). */
    supportingAlphas?: string[];
    /** Alphas that declared mapsTo this alpha, populated during merge. Each variant has the same state progression but distinct name, description, and checklists. */
    variants?: PracticeBaseline["alphas"];
    /** Optional array of named semantic relationships to other alphas (language.schema.json AlphaRelationship). */
    relatesTo?: AlphaRelationship[];
    states: (PracticeElement & {
      seq: number;
      checklist: (PracticeElement & {
        seq: number;
        verificationMethod?: string;
        evidencedBy?: WorkProductContribution[];
        test?: Test;
        examples?: Test[];
      })[];
      contributesToState?: string;
      background?: Background;
    })[];
  })[];
  activitySpaces: (PracticeElement & {
    contributesTo: { alphaName: string; stateName: string }[];
    focusName: string;
    requiredCompetencies: string[];
    involves?: string[];
    activities?: PracticeActivity[];
    background?: Background;
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
  citations?: Citation[];
  acknowledgements?: Acknowledgement[];
  assets?: Asset[];
  alphaInstances?: AlphaInstanceNameRow[];
  practiceElementAliases?: PracticeElementAlias[];
  baselinePracticeNames?: string[];
  schemaVersion?: string;
  dependencyVersions?: DocumentVersionConstraint[];
};

export type WorkProduct = PracticeElement & {
  partOf?: string;
  levelsOfDetail: (PracticeElement & {
    seq: number;
    checklist: (PracticeElement & {
      seq: number;
      verificationMethod?: string;
      evidencedBy?: WorkProductContribution[];
      test?: Test;
      examples?: Test[];
    })[];
    contributesTo: AlphaContribution[];
    background?: Background;
  })[];
};

/** Canonical alpha/state slice or legacy string token (see language.schema.json PatternView.alphaStates). */
export type PatternViewAlphaState = AlphaContribution | string;

export type PatternView = PracticeElement & {
  seq: number;
  alphaStates: PatternViewAlphaState[];
  /** Embedded instance outcome rows expected for this view (composition; schema `AlphaInstance`). */
  alphaInstances?: AlphaInstance[];
  /** ActivitySpace.name entries for matrix swimlanes (symbolic links). Legacy: may also list Activity.name here. */
  activitySpaces?: string[];
  /** Activity.name entries for matrix swimlanes (nested or flat activities; symbolic links). */
  activities?: string[];
  /** Optional hook to NarrativeElement.name under Pattern.narrativeTypeName spine. */
  narrativeElementName?: string;
  narrativeContexts?: NarrativeContext[];
};

export type Pattern = PracticeElement & {
  patternViews: PatternView[];
  narrativeTypeName?: string;
  alphaInstanceNames?: AlphaInstanceNameRow[];
  workProductInstanceNames?: WorkProductInstanceNameRow[];
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
  alphaInstances?: AlphaInstanceNameRow[];
  workProductInstances?: WorkProductInstanceNameRow[];
  /** Baseline-overlay narrative spine types (merged like focuses when composing methods). */
  narrativeTypes?: NarrativeType[];
  /** Bibliographic references elaborated by this practice. */
  citations?: Citation[];
  acknowledgements?: Acknowledgement[];
  /** Visual assets referenced by practice elements. */
  assets?: Asset[];
  schemaVersion?: string;
  dependencyVersions?: DocumentVersionConstraint[];
};

export type Method = PracticeElement & {
  /** Canonical kernel artifact; head of the practice hierarchy — always merges first into the accumulator. */
  baselinePractice?: PracticeBaseline;
  /** Symbolic link to baseline practice by name. Use this OR baselinePractice (not both). */
  baselinePracticeName?: string;
  /**
   * Extension layers merged after {@link baselinePractice}, in hierarchy order — **nearest baseline first**, leaf
   * practice last (e.g. `[...dependencyPracticesFromLibraryInDependencyListOrder, primaryPractice]`).
   * Each layer overlays the accumulator under {@link compositePracticeFromMethod}: earlier layers keep `description` on same-named rows when later layers redefine them.
   * Use this OR practiceNames (not both).
   */
  practices?: Practice[];
  /** Array of symbolic practice name references. Use this OR practices (not both). */
  practiceNames?: string[];
  /** Bibliographic references defined in this method (merged from baseline and practices). */
  citations?: Citation[];
  acknowledgements?: Acknowledgement[];
  /** Visual assets for the entire method (shared across practices). */
  assets?: Asset[];
  /** Cross-baseline alpha contribution relationships injected during composition (Section 7.1 of merge spec). */
  alphaBindings?: AlphaBinding[];
  version?: string;
  authors?: string[];
  createdAt?: string;
  updatedAt?: string;
  keywords?: string[];
  schemaVersion?: string;
  dependencyVersions?: DocumentVersionConstraint[];
};

export type CommunicationChannel = {
  name: string;
  address: string;
};

export type TeamMember = {
  name: string;
  personaName: string;
  contact: string;
  started?: string;
  finished?: string;
};

export type TeamEntry = {
  name: string;
  description: string;
  communicationChannels?: CommunicationChannel[];
  members: TeamMember[];
  notes?: Note[];
};

export type ProjectPlan = {
  pattern: Pattern;
  notes?: Note[];
};

export type ProjectStateSection = {
  alphaInstances?: AlphaInstance[];
  workProductInstances?: WorkProductInstance[];
  notes?: Note[];
};

/** A bounded period of work within a project (schema ProjectCycle). */
export type ProjectCycle = ProjectStateSection & {
  name: string;
  description?: string;
  startedAt?: string;
  completedAt?: string;
};

export type Project = PracticeElement & {
  practiceName?: string;
  methodName?: string;
  team?: TeamEntry;
  plan: ProjectPlan;
  current: ProjectStateSection;
  target: ProjectStateSection;
  cycles?: ProjectCycle[];
  currentCycleName?: string;
  notes?: Note[];
  keywords?: string[];
  citations?: Citation[];
  acknowledgements?: Acknowledgement[];
  assets?: Asset[];
  authors?: string[];
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  schemaVersion?: string;
  dependencyVersions?: DocumentVersionConstraint[];
};

// ---------------------------------------------------------------------------
// Package manifest types (.keleo package format)
// ---------------------------------------------------------------------------

export type PackageIdentity = {
  name: string;
  version: string;
  description: string;
  authors?: string[];
  license?: string;
  url?: string;
};

export type PackageDocument = {
  path: string;
  documentType: "practiceBaseline" | "practice" | "method" | "project" | "changeRequest" | "changeSet";
  documentName: string;
  entryPoint?: boolean;
};

export type PackageDependency = {
  packageName: string;
  versionRange: string;
  documentNames?: string[];
};

export type PackageManifest = {
  schemaVersion: string;
  package: PackageIdentity;
  documents: PackageDocument[];
  dependencies?: PackageDependency[];
};

// ---------------------------------------------------------------------------
// Change management types (ChangeRequest / ChangeSet)
// ---------------------------------------------------------------------------

export type ReferenceUpdate = {
  elementType: string;
  elementName: string;
  field: string;
  fromValue: string;
  toValue: string;
};

export type AddOperation = {
  operation: "add";
  elementType: string;
  elementName: string;
  element: Record<string, unknown>;
  rationale?: string;
};

export type ModifyOperation = {
  operation: "modify";
  elementType: string;
  elementName: string;
  modifications: Record<string, unknown>;
  rationale?: string;
};

export type RemoveOperation = {
  operation: "remove";
  elementType: string;
  elementName: string;
  rationale?: string;
};

export type RenameOperation = {
  operation: "rename";
  elementType: string;
  elementName: string;
  newName: string;
  referenceUpdates: ReferenceUpdate[];
  rationale?: string;
};

export type ChangeOperation = AddOperation | ModifyOperation | RemoveOperation | RenameOperation;

export type NameChange = {
  elementType: string;
  fromName: string;
  toName: string;
};

export type ChangeRequest = {
  changeId: string;
  targetDocumentName: string;
  targetDocumentType: "practiceBaseline" | "practice" | "method";
  status: "draft" | "proposed" | "accepted" | "rejected" | "withdrawn";
  note: Note;
  authors: string[];
  createdAt: string;
  updatedAt: string;
  operations: ChangeOperation[];
  nameChanges?: NameChange[];
  reviewNotes?: Note[];
  supersedes?: string;
  schemaVersion?: string;
};

export type ChangeSet = {
  changeSetId: string;
  status: "draft" | "proposed" | "accepted" | "rejected" | "withdrawn";
  note: Note;
  authors: string[];
  createdAt: string;
  updatedAt: string;
  changeRequests: ChangeRequest[];
  reviewNotes?: Note[];
  schemaVersion?: string;
};
