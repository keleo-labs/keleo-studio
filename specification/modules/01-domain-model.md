# Domain Model

## Purpose

This module defines the complete domain model for Keleo Studio -- a practice management and method composition system built on the SEMAT Essence language. The model describes all domain types, their relationships, structural constraints, and the rules that govern how documents are identified, composed, and validated.

The domain model is the single source of truth for data structure semantics. All storage, validation, composition, and rendering subsystems derive their behaviour from the types and rules defined here.

---

## Data Model

### Notation

Type definitions use generic pseudo-type notation. Conventions:

- `Type { field: FieldType }` -- a named record type with named fields.
- `required` -- the field must be present and non-null.
- `optional` -- the field may be absent.
- `extends ParentType` -- the type inherits all fields from the parent.
- `Type[]` -- an ordered list of `Type`.
- `min N` -- the list must contain at least N elements.
- `oneOf(a, b)` -- exactly one of the listed fields must be present, not both.
- `enum(a, b, c)` -- the value must be one of the listed constants.
- `mutually exclusive(a, b)` -- at most one of the two fields may be present.
- `populated by merge` -- the field is not authored directly; it is computed by the composition algorithm.
- `string` -- a text value; `integer` -- a whole number; `boolean` -- true or false.

---

### Foundational Types

#### PracticeElement

The base type for every named element in the domain. All domain-specific types extend this.

```
PracticeElement {
  name:                    string          required
  description:             string          required
  kind:                    ElementKind     optional
  tags:                    PracticeElementTags  optional
  narratives:              Narrative[]     optional
  assetNames:              AssetReference[] optional
  contributingPatternName: string          optional, populated by merge
}
```

`contributingPatternName` records which Pattern introduced this element during composition. It is set by the merge algorithm and must not be authored in source documents.

#### ElementKind

```
ElementKind = enum(
  practice, method, practiceBaseline, project,
  practiceElementAlias, workProduct, workProductInstance,
  alpha, alphaInstance, activitySpace, activity,
  persona, personaGroup, pattern, patternView,
  narrativeType, citation, acknowledgement, test
)
```

#### PracticeElementTags

Structured tag buckets for multi-dimensional classification.

```
PracticeElementTags {
  domainTags:          string[]  optional
  lifecycleTags:       string[]  optional
  organizationalTags:  string[]  optional
}
```

Legacy documents may represent tags as a flat `string[]` instead of the structured form. Consumers must handle both representations.

#### AssetReference

A typed reference from an element to a named visual asset.

```
AssetReference {
  assetName:  string                                           required
  type:       enum(icon, illustrative, template, diagram)      required
}
```

#### Asset

A visual asset definition. The storage mechanism varies by type.

```
Asset {
  name:          string                                                          required
  type:          enum(image, diagram, template, icon, font-character)            required
  description:   string                                                          optional
  path:          string                                                          optional
  mimeType:      string                                                          optional
  checksum:      string                                                          optional
  dataUri:       string                                                          optional
  url:           string                                                          optional
  fontFamily:    string                                                          optional
  fontCharacter: string                                                          optional
  fontWeight:    string                                                          optional
  fontUrl:       string                                                          optional
}
```

**Constraint:** When `type` is `font-character`, then `fontFamily` and `fontCharacter` are required.

#### Focus

A key area of concern within a practice (e.g., "Solution", "Stakeholder", "Endeavour"). Focuses serve as the top-level grouping for alphas and activity spaces.

```
Focus extends PracticeElement {
  -- no additional fields --
}
```

#### PracticeElementAlias

A local alias that lets one practice refer to another practice's named element under an alternative name.

```
PracticeElementAlias {
  practiceElementType:  string  required
  practiceElementName:  string  required
  aliasName:            string  required
}
```

#### ValidationIssue

A single validation finding, used by the validation subsystem to report structural or referential problems.

```
ValidationIssue {
  path:     string  required
  message:  string  required
}
```

#### DocumentVersionConstraint

A semver range constraint on a named dependency document.

```
DocumentVersionConstraint {
  documentName:  string  required
  versionRange:  string  required
}
```

#### ExternalLink

A reference to an external resource.

```
ExternalLink {
  name:         string  required
  description:  string  optional
  uri:          string  optional
}
```

#### Note

A timestamped free-text annotation.

```
Note {
  name:       string          required
  timestamp:  string          required
  content:    string          required
  links:      ExternalLink[]  optional
}
```

---

### Alpha System

The alpha system models the essential elements of concern in a domain. Each alpha progresses through a series of states, where each state has a checklist of criteria that must be satisfied before the state is considered achieved.

#### Alpha

```
Alpha extends PracticeElement {
  focusName:        string               required  -- name of the parent Focus
  states:           State[]              required, min 3
  contributesTo:    string               optional  -- parent alpha name (same baseline)
  mapsTo:           string               optional  -- cross-baseline alpha mapping
  supportingAlphas: string[]             optional  -- child alpha names under this rollup
  variants:         Alpha[]              optional, populated by merge
  relatesTo:        AlphaRelationship[]  optional
}
```

**Constraints:**
- `contributesTo` and `mapsTo` are mutually exclusive. An alpha either contributes to a parent within its own baseline, or maps to an alpha in another baseline, but not both.
- `variants` is populated during composition when other alphas declare `mapsTo` this alpha. Variants share the same state progression but have distinct names, descriptions, and checklists.
- `supportingAlphas` lists the names of alphas that declare `contributesTo` this alpha. It is unioned during merge.

#### State

A progression checkpoint for an alpha. States are ordered sequentially; achieving a state implies all prior states have been achieved.

```
State extends PracticeElement {
  seq:                integer       required  -- ordinal position (1-based)
  checklist:          Checklist[]   required
  contributesToState: string        optional  -- name of a state in the parent alpha
  background:         Background    optional
}
```

#### Checklist

A single verifiable criterion within a state.

```
Checklist extends PracticeElement {
  seq:                 integer                     required
  verificationMethod:  VerificationMethod          optional
  evidencedBy:         WorkProductContribution[]   optional
  test:                Test                        optional
  examples:            Test[]                      optional
}
```

#### VerificationMethod

```
VerificationMethod = enum(
  automated-telemetry,
  manual-audit,
  documentation-review,
  system-assertion
)
```

#### AlphaContribution

The universal cross-reference from activities, work products, and pattern views to a specific alpha state. This is the primary mechanism for expressing "this work advances this alpha to this state."

```
AlphaContribution {
  alphaName:  string  required
  stateName:  string  required
}
```

#### AlphaRelationship

A named semantic relationship between two alphas.

```
AlphaRelationship {
  relationship:  string                              required
  alphaName:     string                              required
  direction:     enum(outgoing, incoming, mutual)     required
  description:   string                              optional
}
```

#### AlphaInstanceName

A practice-level declaration that names a specific instance of an alpha (e.g., "User Story" as an instance of the "Requirement" alpha). Used for tagging at the practice/pattern level without full state tracking.

```
AlphaInstanceName extends PracticeElement {
  alphaName:  string          required
  links:      ExternalLink[]  optional
}
```

#### AlphaInstance

A fully-realised instance of an alpha at a specific state, with optional evidence and checklist progress. Used in projects and pattern views to track actual endeavour state.

```
AlphaInstance extends PracticeElement {
  alphaName:        string              required
  stateName:        string              required
  evidenceBy:       WorkProductInstance[]  optional
  checklistStates:  ChecklistState[]    optional
  background:       Background          optional
  links:            ExternalLink[]      optional
}
```

#### ChecklistState

Tracks the completion status of a single checklist item within an instance.

```
ChecklistState {
  checklistName:  string                                          required
  state:          enum(complete, not complete, not required)       required
  evidence:       ExternalLink                                    optional
  notes:          Note[]                                          optional
}
```

---

### Work Product System

Work products are the artifacts produced, consumed, or maintained by activities. Each work product has levels of detail that describe its progressive completeness, analogous to alpha states.

#### WorkProduct

```
WorkProduct extends PracticeElement {
  levelsOfDetail:  LevelOfDetail[]  required, min 2
  partOf:          string           optional  -- containment parent work product name
  mapsTo:          string           optional  -- cross-baseline work product mapping
  variants:        WorkProduct[]    optional, populated by merge
}
```

**Constraint:** `partOf` and `mapsTo` are mutually exclusive, following the same rule as Alpha's `contributesTo`/`mapsTo`.

#### LevelOfDetail

A completeness milestone for a work product. Each level declares which alpha states it contributes to.

```
LevelOfDetail extends PracticeElement {
  seq:            integer               required
  checklist:      Checklist[]           required
  contributesTo:  AlphaContribution[]   required, min 1
  background:     Background            optional
}
```

#### WorkProductContribution

The cross-reference from checklists and activities to a specific work product level. This is the work product counterpart to AlphaContribution.

```
WorkProductContribution {
  workProductName:     string  required
  levelOfDetailName:   string  required
}
```

#### WorkProductInstanceName

A practice-level declaration naming a specific instance of a work product.

```
WorkProductInstanceName extends PracticeElement {
  workProductName:  string          required
  links:            ExternalLink[]  optional
}
```

#### WorkProductInstance

A fully-realised instance of a work product at a specific level of detail, with optional checklist progress. Used in projects and pattern views.

```
WorkProductInstance extends PracticeElement {
  workProductName:     string            required
  levelOfDetailName:   string            required
  checklistStates:     ChecklistState[]  optional
  background:          Background        optional
  links:               ExternalLink[]    optional
}
```

---

### Activity System

Activities represent the work that teams perform. They are organised under activity spaces, which group related activities by focus area.

#### ActivitySpace

A grouping of related activities within a focus area. Activity spaces define what work is available; activities define how the work is performed.

```
ActivitySpace extends PracticeElement {
  contributesTo:          AlphaContribution[]        required, min 1
  focusName:              string                     required
  requiredCompetencies:   string[]                   required
  involves:               string[]                   optional  -- persona group names
  activities:             Activity[]                 optional
  background:             Background                 optional
}
```

#### Activity

A concrete unit of work that advances alpha states by producing or modifying work products.

```
Activity extends PracticeElement {
  contributesTo:                AlphaContribution[]          required, min 1
  focusName:                    string                       required
  requiredCompetencies:         string[]                     required
  involves:                     string[]                     optional
  activitySpaceName:            string                       optional
  worksOn:                      WorkProductContribution[]    required
  recommendedCompetencyLevels:  CompetencyLevelReference[]   required
  background:                   Background                   optional
  test:                         Test                         optional
  examples:                     Test[]                       optional
}
```

**Note:** Activities may be nested under their parent ActivitySpace (via `ActivitySpace.activities`) or declared flat on a Practice (via `Practice.activities`) with an `activitySpaceName` back-reference. Both representations are valid; the flat form is a legacy convenience.

---

### Competency System

Competencies represent the skills and capabilities required to perform activities. Each competency has a set of progressive levels.

#### Competency

```
Competency extends PracticeElement {
  levels:  CompetencyLevel[]  required, min 1
}
```

#### CompetencyLevel

```
CompetencyLevel extends PracticeElement {
  level:           integer  required  -- ordinal level number
  competencyName:  string   required  -- back-reference to parent competency
}
```

#### CompetencyLevelReference

A lightweight cross-reference to a specific competency at a specific level. Used by activities and personas.

```
CompetencyLevelReference {
  competencyName:       string  required
  competencyLevelName:  string  required
}
```

---

### Pattern System

Patterns model temporal progressions -- how a practice unfolds through a series of views (stages, iterations, phases). Each view captures a snapshot of expected alpha states, active work products, and running activities.

#### Pattern

```
Pattern extends PracticeElement {
  patternViews:            PatternView[]           required, min 1
  narrativeTypeName:       string                  optional
  alphaInstanceNames:      AlphaInstanceName[]     optional
  workProductInstanceNames: WorkProductInstanceName[] optional
}
```

#### PatternView

A single stage or milestone within a pattern, capturing the target state of the endeavour at that point.

```
PatternView extends PracticeElement {
  seq:                    integer                              required
  alphaStates:            (AlphaContribution | string)[]       required
  alphaInstances:         AlphaInstance[]                      optional
  activitySpaces:         string[]                             optional
  activities:             string[]                             optional
  narrativeElementName:   string                               optional
  narrativeContexts:      NarrativeContext[]                   optional
}
```

**Note:** `alphaStates` entries may be either structured `AlphaContribution` objects or legacy string tokens. Consumers must handle both representations.

#### PatternViewReference

A cross-reference to a specific view within a named pattern.

```
PatternViewReference {
  patternName:      string  required
  patternViewName:  string  required
}
```

---

### Narrative System

Narratives provide a storytelling layer that contextualises practice elements. A narrative type defines the structure (what elements make up the narrative); narratives are instances that fill that structure with domain-specific context.

#### NarrativeType

```
NarrativeType extends PracticeElement {
  narrativeElements:  NarrativeElement[]  optional
}
```

#### NarrativeElement

A building block within a narrative type, with guidance on how to use it.

```
NarrativeElement extends PracticeElement {
  howToUse:  string  required
}
```

#### Narrative

An instance of a narrative type, attached to any PracticeElement.

```
Narrative extends PracticeElement {
  narrativeTypeName:  string               required
  narrativeContexts:  NarrativeContext[]    required
  citationNames:      string[]             optional
}
```

#### NarrativeContext

A single contextual entry within a narrative, ordered by sequence.

```
NarrativeContext {
  seq:                   integer  required
  narrativeElementName:  string   required
  context:               string   required
}
```

---

### Persona System

Personas represent the roles that participate in activities. Persona groups collect related personas.

#### Persona

```
Persona extends PracticeElement {
  competencies:  CompetencyLevelReference[]  optional
}
```

#### PersonaGroup

```
PersonaGroup extends PracticeElement {
  personaNames:  string[]  required
}
```

---

### Citation and Acknowledgement

#### Citation

A bibliographic reference used to support practice elements with scholarly or professional sources.

```
Citation extends PracticeElement {
  authors:  string[]  required, min 1
  date:     string    required
  source:   string    required
  url:      string    optional
}
```

#### Acknowledgement

Recognition of a person, institution, or contribution.

```
Acknowledgement extends PracticeElement {
  url:  string  optional
}
```

---

### Test and Background (Gherkin-Inspired)

These types provide a structured, behaviour-driven mechanism for specifying verifiable conditions and preconditions.

#### Test

A verifiable scenario expressed in Given/When/Then form.

```
Test extends PracticeElement {
  given:  string[]  optional
  when:   string[]  optional
  then:   string[]  optional
}
```

#### Background

Preconditions that establish context for a state, level of detail, or activity. Unlike Test, Background does not extend PracticeElement -- it is a structural fragment, not a named element.

```
Background {
  given:                      string[]                              optional
  alphaStates:                AlphaContribution[]                   optional
  workProductLevels:          WorkProductContribution[]              optional
  alphaInstanceStates:        AlphaInstanceStateReference[]         optional
  workProductInstanceLevels:  WorkProductInstanceLevelReference[]   optional
}
```

#### AlphaInstanceStateReference

```
AlphaInstanceStateReference {
  instanceName:  string  required
  stateName:     string  required
}
```

#### WorkProductInstanceLevelReference

```
WorkProductInstanceLevelReference {
  instanceName:       string  required
  levelOfDetailName:  string  required
}
```

---

### Document Types

The domain recognises six root document types. Each document is a self-contained unit of authoring, storage, and exchange.

#### PracticeBaseline

The foundational kernel artifact. A baseline defines the core structural elements of a practice domain: focuses, alphas with their state progressions, activity spaces, and competencies. All other document types build upon or reference baselines.

```
PracticeBaseline extends PracticeElement {
  -- Structural elements (required) --
  focuses:               Focus[]          required
  alphas:                Alpha[]          required
  activitySpaces:        ActivitySpace[]  required
  competencies:          Competency[]     required

  -- Metadata (required) --
  authors:               string[]         required
  createdAt:             string           required  -- ISO 8601 timestamp
  updatedAt:             string           required  -- ISO 8601 timestamp
  version:               string           required  -- semver
  keywords:              string[]         required

  -- Optional structural extensions --
  alphaInstances:        AlphaInstanceName[]      optional
  narrativeTypes:        NarrativeType[]          optional
  citations:             Citation[]               optional
  acknowledgements:      Acknowledgement[]        optional
  assets:                Asset[]                  optional
  practiceElementAliases: PracticeElementAlias[]  optional
  baselinePracticeNames: string[]                 optional  -- names of other baselines this one extends

  -- Versioning --
  schemaVersion:         string                   optional
  dependencyVersions:    DocumentVersionConstraint[]  optional
}
```

#### Practice

An extension that overlays a baseline with additional or modified elements. A practice names its baseline and optionally declares dependencies on other practices. All structural fields are optional overlays -- when present, they are merged onto the baseline during composition.

```
Practice extends PracticeElement {
  -- Baseline reference (required) --
  baselinePracticeName:    string  required

  -- Dependency chain --
  practiceDependencyNames: string[]  optional  -- other practices merged before this one

  -- Structural overlays (all optional) --
  focuses:                 Focus[]               optional
  alphas:                  Alpha[]               optional
  activitySpaces:          ActivitySpace[]        optional
  competencies:            Competency[]           optional
  activities:              Activity[]             optional  -- flat activity declarations
  workProducts:            WorkProduct[]          optional
  patterns:                Pattern[]              optional
  personas:                Persona[]              optional
  personaGroups:           PersonaGroup[]         optional
  alphaInstances:          AlphaInstanceName[]    optional
  workProductInstances:    WorkProductInstanceName[]  optional
  narrativeTypes:          NarrativeType[]        optional
  citations:               Citation[]             optional
  acknowledgements:        Acknowledgement[]      optional
  assets:                  Asset[]                optional
  references:              AlphaInstance[]         optional
  practiceElementAliases:  PracticeElementAlias[] optional

  -- Metadata (all optional on extensions) --
  authors:                 string[]               optional
  createdAt:               string                 optional
  updatedAt:               string                 optional
  version:                 string                 optional
  keywords:                string[]               optional
  schemaVersion:           string                 optional
  dependencyVersions:      DocumentVersionConstraint[]  optional

  -- Merge provenance (populated by merge, not authored) --
  mergesBaselinePracticeName: string              optional, populated by merge
}
```

**Practice dependency ordering:** Entries in `practiceDependencyNames` define merge hierarchy. Earlier entries are "above" later entries -- they merge first onto the accumulating document, so their descriptions take precedence on same-named elements.

#### Method

A composed artifact that combines a baseline practice with zero or more extension practices. A method may embed its constituent documents or reference them by name.

```
Method extends PracticeElement {
  -- Baseline (exactly one of these two) --
  baselinePractice:    PracticeBaseline  optional  -- embedded baseline
  baselinePracticeName: string           optional  -- reference by name

  -- Extension practices (at most one of these two) --
  practices:           Practice[]        optional  -- embedded practices
  practiceNames:       string[]          optional  -- references by name

  -- Cross-baseline bindings --
  bindings:            Bindings          optional

  -- Shared assets --
  citations:           Citation[]        optional
  acknowledgements:    Acknowledgement[] optional
  assets:              Asset[]           optional

  -- Metadata --
  authors:             string[]          optional
  createdAt:           string            optional
  updatedAt:           string            optional
  version:             string            optional
  keywords:            string[]          optional
  schemaVersion:       string            optional
  dependencyVersions:  DocumentVersionConstraint[]  optional
}
```

**Constraints:**
- Exactly one of `baselinePractice` or `baselinePracticeName` must be present (oneOf).
- At most one of `practices` or `practiceNames` may be present (oneOf).
- When using name references, the referenced documents must be resolvable from the library at composition time.

#### Project

A bounded endeavour that uses a practice or method. Projects track planned, current, and target states of alpha and work product instances, along with team composition and iterative cycles.

```
Project extends PracticeElement {
  -- Practice or method reference (exactly one) --
  practiceName:      string              optional
  methodName:        string              optional

  -- Core sections (required) --
  plan:              ProjectPlan         required
  current:           ProjectStateSection required
  target:            ProjectStateSection required

  -- Team and cycles --
  team:              TeamEntry           optional
  cycles:            ProjectCycle[]      optional
  currentCycleName:  string              optional
  notes:             Note[]              optional

  -- Metadata --
  authors:           string[]            optional
  createdAt:         string              optional
  updatedAt:         string              optional
  version:           string              optional
  keywords:          string[]            optional
  citations:         Citation[]          optional
  acknowledgements:  Acknowledgement[]   optional
  assets:            Asset[]             optional
  schemaVersion:     string              optional
  dependencyVersions: DocumentVersionConstraint[]  optional
}
```

**Constraint:** Exactly one of `practiceName` or `methodName` must be present.

#### ProjectPlan

```
ProjectPlan {
  pattern:  Pattern  required
  notes:    Note[]   optional
}
```

#### ProjectStateSection

A snapshot of endeavour state, capturing the current or target positions of alpha and work product instances.

```
ProjectStateSection {
  alphaInstances:        AlphaInstance[]        optional
  workProductInstances:  WorkProductInstance[]   optional
  notes:                 Note[]                 optional
}
```

#### ProjectCycle

A bounded period of work within a project (e.g., a sprint, an iteration, a phase).

```
ProjectCycle extends ProjectStateSection {
  name:          string  required
  description:   string  optional
  startedAt:     string  optional
  completedAt:   string  optional
}
```

#### TeamEntry

```
TeamEntry {
  name:                    string                  required
  description:             string                  required
  communicationChannels:   CommunicationChannel[]  optional
  members:                 TeamMember[]            required
  notes:                   Note[]                  optional
}
```

#### CommunicationChannel

```
CommunicationChannel {
  name:     string  required
  address:  string  required
}
```

#### TeamMember

```
TeamMember {
  name:         string  required
  personaName:  string  required
  contact:      string  required
  started:      string  optional
  finished:     string  optional
}
```

---

### Cross-Baseline Bindings

When a method composes practices from multiple baselines, bindings declare how elements from different baselines relate to each other.

#### Bindings

```
Bindings {
  alphaBindings:        AlphaBinding[]        optional
  workProductBindings:  WorkProductBinding[]   optional
}
```

#### AlphaBinding

```
AlphaBinding {
  relationship:   enum(contribution, variant)   required
  targetAlpha:    BaselineAlphaReference         required
  sourceAlphas:   ContributingAlpha[]            required
}
```

#### BaselineAlphaReference

```
BaselineAlphaReference {
  baselineName:  string  required
  alphaName:     string  required
}
```

#### ContributingAlpha

```
ContributingAlpha extends BaselineAlphaReference {
  stateContributions:  StateContribution[]  optional
}
```

#### StateContribution

```
StateContribution {
  fromState:  string  required
  toState:    string  required
}
```

#### WorkProductBinding

```
WorkProductBinding {
  relationship:       enum(contribution, variant)      required
  targetWorkProduct:  BaselineWorkProductReference      required
  sourceWorkProducts: ContributingWorkProduct[]         required
}
```

#### BaselineWorkProductReference

```
BaselineWorkProductReference {
  baselineName:     string  required
  workProductName:  string  required
}
```

#### ContributingWorkProduct

```
ContributingWorkProduct extends BaselineWorkProductReference {
  lodContributions:  LodContribution[]  optional
}
```

#### LodContribution

```
LodContribution {
  fromLevelOfDetail:  string  required
  toLevelOfDetail:    string  required
}
```

---

### Change Management

Change requests and change sets provide a formal mechanism for proposing, reviewing, and tracking modifications to practice documents.

#### ChangeRequest

```
ChangeRequest {
  changeId:            string                                          required
  targetDocumentName:  string                                          required
  targetDocumentType:  enum(practiceBaseline, practice, method)        required
  status:              enum(draft, proposed, accepted, rejected, withdrawn)  required
  note:                Note                                            required
  authors:             string[]                                        required
  createdAt:           string                                          required
  updatedAt:           string                                          required
  operations:          ChangeOperation[]                                required
  nameChanges:         NameChange[]                                    optional
  reviewNotes:         Note[]                                          optional
  supersedes:          string                                          optional
  schemaVersion:       string                                          optional
}
```

#### ChangeOperation

A discriminated union representing a single atomic change to a document. Exactly one of the four operation forms applies.

```
AddOperation {
  operation:    "add"
  elementType:  string                   required
  elementName:  string                   required
  element:      record                   required  -- the full element to add
  rationale:    string                   optional
}

ModifyOperation {
  operation:      "modify"
  elementType:    string                 required
  elementName:    string                 required
  modifications:  record                 required  -- partial update fields
  rationale:      string                 optional
}

RemoveOperation {
  operation:    "remove"
  elementType:  string                   required
  elementName:  string                   required
  rationale:    string                   optional
}

RenameOperation {
  operation:         "rename"
  elementType:       string              required
  elementName:       string              required
  newName:           string              required
  referenceUpdates:  ReferenceUpdate[]   required
  rationale:         string              optional
}

ChangeOperation = AddOperation | ModifyOperation | RemoveOperation | RenameOperation
```

#### ReferenceUpdate

Describes how a rename cascades to references in other elements.

```
ReferenceUpdate {
  elementType:  string  required
  elementName:  string  required
  field:        string  required
  fromValue:    string  required
  toValue:      string  required
}
```

#### NameChange

Records a completed name change for provenance tracking.

```
NameChange {
  elementType:  string  required
  fromName:     string  required
  toName:       string  required
}
```

#### ChangeSet

Groups multiple change requests into a single reviewable unit.

```
ChangeSet {
  changeSetId:     string                                                  required
  status:          enum(draft, proposed, accepted, rejected, withdrawn)    required
  note:            Note                                                    required
  authors:         string[]                                                required
  createdAt:       string                                                  required
  updatedAt:       string                                                  required
  changeRequests:  ChangeRequest[]                                         required
  reviewNotes:     Note[]                                                  optional
  schemaVersion:   string                                                  optional
}
```

---

### Package System

Packages are the unit of distribution. A `.keleo` package bundles one or more documents with metadata and dependency declarations, enabling portable exchange and version-aware dependency resolution.

#### PackageManifest

```
PackageManifest {
  schemaVersion:  string              required
  package:        PackageIdentity     required
  documents:      PackageDocument[]   required
  dependencies:   PackageDependency[] optional
}
```

#### PackageIdentity

```
PackageIdentity {
  name:         string    required  -- kebab-case identifier
  version:      string    required  -- semver
  description:  string    required
  authors:      string[]  optional
  license:      string    optional
  url:          string    optional
}
```

#### PackageDocument

```
PackageDocument {
  path:           string        required  -- relative path (documents/*.json)
  documentType:   enum(practiceBaseline, practice, method, project,
                       changeRequest, changeSet)   required
  documentName:   string        required
  entryPoint:     boolean       optional  -- marks the primary document
  meta:           PackageDocumentMeta  optional
}
```

#### PackageDocumentMeta

Summary metadata for a document within a package.

```
PackageDocumentMeta {
  documentVersion:        string                required
  description:            string                required
  tags:                   PracticeElementTags   required
  keywords:               string[]              required
  elementCount:           integer               required
  associatedBaselineName: string or null        required
  updatedAt:              string                required
  createdAt:              string                required
}
```

#### PackageDependency

```
PackageDependency {
  packageName:    string    required
  versionRange:   string    required  -- semver range
  documentNames:  string[]  optional  -- specific documents needed from the package
}
```

---

## Semantic Rules

### Naming and Identity

1. **Name uniqueness.** Within a single document, every element of the same type must have a unique `name`. Names serve as the primary key for merge operations, cross-references, and identity.

2. **Cross-references by name.** All inter-element references (e.g., `focusName`, `alphaName`, `activitySpaceName`, `baselinePracticeName`) use the target element's `name` as the key. Referential integrity is enforced by the validation subsystem.

3. **Alias resolution.** When a `PracticeElementAlias` is declared, references using the `aliasName` must resolve to the element identified by `practiceElementName` of the specified `practiceElementType`.

### Alpha Constraints

4. **Minimum state count.** Every alpha must have at least 3 states. This reflects the Essence requirement that alphas model meaningful progressions, not binary conditions.

5. **Mutual exclusivity of contribution and mapping.** An alpha's `contributesTo` (parent within the same baseline) and `mapsTo` (equivalent in another baseline) are mutually exclusive. An alpha participates in exactly one hierarchy.

6. **State ordering.** States within an alpha are ordered by their `seq` field. Sequential numbering should be contiguous starting from 1. Achievement of state N implies achievement of all states with seq < N.

7. **Supporting alphas consistency.** If alpha A declares `contributesTo: "B"`, then alpha B's `supportingAlphas` should include "A". The merge algorithm enforces this by auto-populating `supportingAlphas` from `contributesTo` declarations.

### Work Product Constraints

8. **Minimum levels of detail.** Every work product must have at least 2 levels of detail.

9. **Level-to-alpha linkage.** Every level of detail must declare at least one `contributesTo` entry, linking the work product level to the alpha state it advances. This ensures that no work product exists in isolation from the alpha progression model.

10. **Mutual exclusivity of containment and mapping.** A work product's `partOf` (containment parent) and `mapsTo` (cross-baseline mapping) are mutually exclusive, mirroring the alpha rule.

### Activity Constraints

11. **Alpha contribution required.** Every activity space and activity must declare at least one `contributesTo` entry, linking the work to an alpha state. Activities that do not advance any alpha state are semantically invalid.

12. **Activity-space relationship.** An activity may reference its parent activity space via `activitySpaceName`, or it may be nested directly under `ActivitySpace.activities`. Both representations are valid. When nested, the `activitySpaceName` is implicit.

### Pattern Constraints

13. **Minimum views.** Every pattern must have at least one pattern view.

14. **View ordering.** Pattern views are ordered by `seq`, representing temporal progression.

### Composition Rules

15. **Baseline-first merge.** When composing a method, the baseline practice is always the starting accumulator. Extension practices are merged in dependency order: earlier entries in the list merge first, so their descriptions take precedence on same-named elements.

16. **Union by name.** Arrays of named elements (alphas, states, activities, etc.) are merged by unioning on the `name` field. When two elements share the same name, their properties are merged according to the merge rules (baseline descriptions preserved, arrays unioned, tags merged by bucket).

17. **Focus resolution.** When an element appears in both the baseline and an extension, explicit values in the extension override placeholder values in the baseline, but baseline descriptions are preserved when the extension merely adds structure (e.g., new checklist items) without providing its own description.

18. **Tag merging.** Structured tags are merged by bucket -- `domainTags`, `lifecycleTags`, and `organizationalTags` are each independently unioned.

19. **Variant population.** During merge, alphas that declare `mapsTo` a target alpha are collected as `variants` on the target. Variants share the same state progression but maintain distinct identity.

### Document-Level Constraints

20. **Method baseline exclusivity.** A method must provide exactly one of `baselinePractice` (embedded) or `baselinePracticeName` (reference), never both and never neither.

21. **Method practice exclusivity.** A method may provide at most one of `practices` (embedded) or `practiceNames` (references), but not both.

22. **Project practice exclusivity.** A project must reference exactly one of `practiceName` or `methodName`.

### Schema Versioning

23. **Current schema version.** The current schema version is `2.0.0`.

24. **Compatibility rules.** Schema version compatibility follows these rules:
    - **Major version mismatch** (document major > tool major): incompatible. The document requires capabilities the tool does not support.
    - **Minor version mismatch** (same major, document minor > tool minor): compatible with warning. The document may use features the tool does not fully understand, but core structure is preserved.
    - **Absent schema version:** treated as compatible (pre-versioning documents).

---

## Type Discrimination

All six root document types share the same base structure (PracticeElement) and are stored as untyped records. The document type is determined by examining the presence of discriminating fields, evaluated in strict priority order.

### Discrimination Chain

The following chain is evaluated top-to-bottom. The first matching rule determines the document type.

| Priority | Condition | Document Type |
|----------|-----------|---------------|
| 1 | Document has `changeSetId` field | **ChangeSet** |
| 2 | Document has `changeId` field | **ChangeRequest** |
| 3 | Document has `practiceName` or `methodName` field | **Project** |
| 4 | Document has `practices`, `practiceNames`, or `baselinePractice` field | **Method** |
| 5 | Document has `baselinePracticeName` field | **Practice** |
| 6 | None of the above | **PracticeBaseline** |

### Discrimination Rules

- **Order matters.** A document with both `changeId` and `baselinePracticeName` is a ChangeRequest, not a Practice. The chain is evaluated top-to-bottom and short-circuits on the first match.
- **PracticeBaseline is the default.** Any document that does not match rules 1-5 is treated as a PracticeBaseline. This makes PracticeBaseline the "undecorated" base case.
- **Field presence, not value.** Discrimination checks whether the field exists on the document, regardless of its value (including null or empty). The field's mere presence is the discriminator.
- **Explicit `kind` field (preferred).** When a document's root `kind` field is set to a root-level value (`practice`, `method`, `practiceBaseline`, `project`), it is used directly for classification — structural inference is skipped. The `kind` field is defined on `PracticeElement` in the schema and serves double duty: element-level classification within a document *and* document-level type discrimination at the root.
- **Structural inference (fallback).** Documents without a `kind` field (or with a non-root `kind` value) fall through to the structural discrimination chain described above. ChangeSet and ChangeRequest are not represented in the `kind` enum and always rely on structural inference.

---

## Integration Points

### Validation Subsystem

The validation subsystem consumes the domain model in two phases:

1. **Schema validation.** Validates document structure against the formal schema definition -- field types, required fields, enum values, minimum array lengths, and oneOf constraints.
2. **Reference validation.** Validates cross-references within a document -- that every `focusName` references a declared Focus, every `alphaName` references a declared Alpha, every `stateName` references a State within the named Alpha, and so on. This phase checks referential integrity that schema validation alone cannot express.

### Composition Subsystem

The composition (merge) subsystem takes a Method document and produces a single composite PracticeBaseline by:

1. Resolving the baseline (embedded or by name from the library).
2. Resolving each extension practice (embedded or by name), including recursive dependency resolution with cycle detection.
3. Merging practices onto the baseline accumulator in dependency order, following the union-by-name, baseline-description-preserving, tag-bucket-merging rules defined in this module.
4. Populating computed fields (`variants`, `supportingAlphas`, `contributingPatternName`, `mergesBaselinePracticeName`).

### Storage Subsystem

The storage layer persists and retrieves documents as opaque records. It applies the type discrimination chain when loading documents to determine their type. Storage implementations must preserve all fields faithfully without transformation -- the domain model is the contract between writers and readers.

### Package Subsystem

The package system serialises one or more documents into a portable archive with a manifest. It references document types using the same enum values as type discrimination. Package dependency resolution uses semver range matching against `PackageDependency.versionRange` and `DocumentVersionConstraint.versionRange`.

### Library Subsystem

The library manages a collection of documents and provides:

- **Lookup by name** for resolving symbolic references (`baselinePracticeName`, `practiceDependencyNames`, `practiceNames`).
- **Index building** for browsing, searching, and filtering documents by type, tags, keywords, and metadata.
- **Dependency graph construction** for visualising and validating the dependency relationships between documents.
