export type LanguagePackId = "default" | "alt";

export type LanguagePack = {
  appTitle: string;
  appSubtitle: string;
  inputJson: string;
  renderedView: string;
  loadExample: string;
  validateAndRender: string;
  downloadPdf: string;
  /** Practice author: toggle back to structured form. */
  editAsForm: string;
  /** Practice author: switch to raw JSON textarea. */
  editAsJson: string;
  /** Practice author: parse JSON textarea into the live document without leaving JSON mode. */
  applyJsonToDocument: string;
  /** Practice author: commits current document body to stored library JSON (PUT). */
  saveToLibrary: string;
  /** Practice author: reloads document from library, dropping local edits. */
  discardLibraryChanges: string;
  /** Practice author: confirm discarding unsaved edits. */
  discardLibraryConfirm: string;
  /** Practice author: short label when linking to library session. */
  editingLibraryDocument: string;
  /** Practice author: unavailable while save request runs. */
  savingLabel: string;
  /** Practice author: discard reload failed. */
  discardFailed: string;
  /** Practice author: PUT failed messages. */
  saveFailedPrefix: string;
  /** Practice author: subtitle when not editing an existing library entry; mentions saving new. */
  practiceAuthorStandaloneLead: string;
  /** Practice author: POST succeeded but response had no id. */
  saveMissingDocumentId: string;
  /** Practice author: document kind switch hidden for library-backed edits. */
  documentTypeLockedHint: string;
  /** Library: delete row action label. */
  libraryDelete: string;
  /** Library: confirmation before DELETE; `{name}` is replaced with the document display name. */
  libraryDeleteConfirm: string;
  /** Library: delete in progress on a row. */
  libraryDeleting: string;
  /** Library: delete failed (HTTP or network). */
  libraryDeleteFailed: string;
  /** Library browse: TOC nav label. */
  browseTableOfContents: string;
  /** Library browse: link to practice title / overview. */
  browseTocOverview: string;
  nothingToRender: string;
  schemaIssuesTitle: string;
  refIssuesTitle: string;

  viewText: string;
  viewDiagramFocusAlphas: string;
  viewDiagramActivitySpaces: string;

  pdfDiagramFocusAlphas: string;
  pdfDiagramActivitySpaces: string;
  pdfTextRender: string;

  /** Top document section: all alphas, grouped by focus. */
  sectionAlphas: string;
  /** Top document section: all activity content, grouped by focus. */
  sectionActivities: string;
  /** Display label for the synthesized implicit focus group. */
  implicitFocusName: string;
  alphasAndStates: string;
  activitySpaces: string;
  competencies: string;
  contributesTo: string;
  /** Label for Alpha.contributesTo → another alpha by name (string ref). */
  alphaContributesToAlpha: string;
  /** Label for Alpha.supportingAlphas → contributing child alphas by name. */
  alphaSupportingAlphas: string;
  /** Collapsible IR section: alpha states list. */
  alphaStatesSection: string;
  requiredCompetencies: string;
  levels: string;

  alpha: string;
  state: string;
  activitySpace: string;
  competency: string;

  practiceActivity: string;
  withinActivitySpace: string;
  /** Nested supporting alpha: links to the parent rollup alpha (parallel to withinActivitySpace). */
  withinRollupAlpha: string;
  worksOn: string;
  recommendedCompetencyLevels: string;
  tags: string;
  checklist: string;
  keywords: string;
  /** Library browse / method IR: heading above extension practice list (`Method.practices`). */
  methodBrowseExtensionPracticesHeading: string;
  extendsBaseline: string;
  practiceDependencies: string;
  workProducts: string;

  workBreakdowns: string;
  patterns: string;
  /** Pattern view: list of lane names (activity space or activity). */
  patternViewLanes: string;
  wbTasks: string;
  wbPrerequisites: string;
  wbComplexity: string;
  wbEstimate: string;
  implementsActivity: string;
  appliesInSpaces: string;
  contractType: string;
  complexityLevel: string;
  productRisks: string;
  projectRisks: string;
  complexityValueRisk: string;
  complexityTechnicalRisk: string;
  complexityStakeholderEngagement: string;
};

