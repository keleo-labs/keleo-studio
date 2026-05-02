export type LanguagePackId = "default" | "alt";

export type LanguagePack = {
  appTitle: string;
  appSubtitle: string;
  inputJson: string;
  renderedView: string;
  /** Practice author readable column: diagram-first preview mode label. */
  readablePreviewClassic: string;
  /** Practice author readable column: TOC + sections preview (library browse style). */
  readablePreviewBrowse: string;
  /** Readable preview: PatternFly-style full document layout (FullPracticeView). */
  readablePreviewFullDocument: string;
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
  /** Library: toolbar — delete every extension practice document (not methods or baselines). */
  libraryDeleteAllPractices: string;
  /** Library: title tooltip for delete-all-practices (scope + ignores filters). */
  libraryDeleteAllPracticesTitle: string;
  /** Library: first confirmation before bulk delete; `{count}` = number of extension practices. */
  libraryDeleteAllPracticesConfirm: string;
  /** Library: second confirmation (final chance); `{count}` replays the count. */
  libraryDeleteAllPracticesConfirmFinal: string;
  /** Library: bulk delete practices in progress. */
  libraryDeletingAllPractices: string;
  /** Library: alert when there are no extension practices to delete. */
  libraryDeleteAllPracticesNone: string;
  /** Library: bulk delete finished with some failures; `{failed}` and `{total}`. */
  libraryDeleteAllPracticesPartial: string;
  /** Library browse: TOC nav label. */
  browseTableOfContents: string;
  /** Library browse: link to practice title / overview. */
  browseTocOverview: string;
  /** Library browse: TOC label for upstream baselines / dependency practices resolved from naming fields. */
  browseTocDependencies: string;
  /** Browse layout: subsection heading under Alphas for work-product definitions. */
  browseWorkProductsUnderAlphas: string;
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
  /** Browse IR: domain tag bucket label (structured tags). */
  tagsDomain: string;
  /** Browse IR: lifecycle tag bucket label. */
  tagsLifecycle: string;
  /** Browse IR: organizational tag bucket label. */
  tagsOrganizational: string;
  /** Browse IR: checklist label. */
  checklist: string;
  /** Browse IR: checklist item seq field. */
  checklistSeq: string;
  checklistVerificationMethod: string;
  checklistEvidencedBy: string;
  /** Browse IR: Activity.activitySpaceName when distinct from parent space. */
  activityParentSpace: string;
  /** Browse IR: LevelOfDetail.seq label. */
  levelOfDetailSeq: string;
  /** Readable / browse: embedded {@link PracticeElement.narratives} trees rolled up for the report. */
  elementNarrativesHeading: string;
  /** Browse IR / PDF: Narrative spine types defined on the baseline. */
  narrativeTypesHeading: string;
  /** Browse IR: Narrative elements listed under a narrative type. */
  narrativeElementsHeading: string;
  /** Browse IR: Narrative contexts on an embedded Narrative subtree. */
  narrativeContextsHeading: string;
  narrativeContextSeq: string;
  /** Browse IR: Practice-level personas. */
  personasHeading: string;
  /** Browse IR: persona group → named personas. */
  personaGroupsHeading: string;
  personaGroupMembers: string;
  /** ActivitySpace symbolic links to PersonaGroup.name. */
  activitySpaceInvolvesPersonaGroups: string;
  /** Pattern symbolic link to NarrativeType.name. */
  patternNarrativeTypeName: string;
  /** Pattern view symbolic link to NarrativeElement.name (within the pattern’s narrative spine). */
  patternViewNarrativeElementName: string;
  /** Browse IR: collapsible heading for Pattern.patternViews. */
  patternViewsHeading: string;
  /** Pattern matrix toolbar: reveal every cell’s execution lanes at once. */
  patternMatrixExpandAllLanes: string;
  /** Pattern matrix toolbar: hide all execution lanes (per-cell toggles cleared). */
  patternMatrixCollapseAllLanes: string;
  /**
   * Pattern matrix per alpha→state block when lanes are collapsed; `{count}` is the number of lanes.
   */
  patternMatrixShowLanesCount: string;
  /** Pattern matrix: collapse execution lanes under one alpha/state slice (others unaffected). */
  patternMatrixHideSliceLanes: string;
  patternViewAlphaStates: string;
  patternViewActivitySpaces: string;
  patternViewActivities: string;
  /** Browse IR: Practice.practiceElementAliases section title. */
  practiceElementAliasesHeading: string;
  keywords: string;
  /** Library list: heading for structured tag filters. */
  libraryTagFiltersHeading: string;
  /** Library list: reset domain / lifecycle / org tag selections. */
  libraryClearTagFilters: string;
  /** Manage library table: opens row menu with Download, Browse, edit links, Delete. */
  libraryRowActionsMenu: string;
  /** Library: toolbar — download every stored document as one JSON array (bulk re-import compatible). */
  libraryDownloadAllJson: string;
  /** Library: toolbar bulk export busy state. */
  libraryDownloadingAllJson: string;
  /** Library browse / method IR: heading above extension practice list (`Method.practices`). */
  methodBrowseExtensionPracticesHeading: string;
  extendsBaseline: string;
  practiceDependencies: string;
  workProducts: string;

  patterns: string;
  /** Pattern view: list of lane names (activity space or activity). */
  patternViewLanes: string;
};
