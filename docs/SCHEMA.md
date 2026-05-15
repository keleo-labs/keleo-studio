# JSON Schema Documentation

This document describes the JSON Schema and operational semantics for the Adoption Framework's practice language model. The schema is located at `web/public/language.schema.json`.

## Overview

The Practice Language JSON Schema is a meta-model for translating abstract engineering and methodology concepts into machine-readable, operational constructs. It defines a type-discriminated hierarchy that transforms from static descriptive taxonomy into a prescriptive operational engine.

**Document Types**:
- **PracticeBaseline**: Kernel foundations - domain-agnostic, version-controlled registry of core constructs
- **Practice**: Extensions that overlay and extend baselines with applied methodology
- **Method**: Compositions orchestrating baseline + practices into executable methods

The root document type is automatically detected based on which fields are present.

## Ontological Principles

### Semantic Coherence

The schema design prioritizes **ontological correctness** by explicitly separating:
- **Abstract concepts** (Alphas) from **information artifacts** (Work Products)
- **Definitions** (Work Product types) from **instances** (actual deliverables)
- **Capabilities** (Competencies) from **roles** (Personas)

This separation prevents common ontological errors and ensures the schema functions as a prescriptive operational engine rather than merely descriptive taxonomy.

### Knowledge Graph Integration

**Stable Identifiers**: The schema mandates `$schema` keyword usage and encourages unique `$id` properties providing stable namespace IRIs (Internationalized Resource Identifiers) for all methodology components. This enables:
- Reliable cross-system references in distributed environments
- Integration with enterprise knowledge graphs
- Advanced semantic search capabilities
- Retrieval-augmented generation (RAG) applications

**JSON-LD Compatibility**: By structuring with semantic intent, the schema supports annotation with JSON-LD metadata, embedding methodology definitions inside broader enterprise knowledge graphs.

## Type Discrimination

The schema uses conditional validation to detect document type:

```
If document has (practices OR practiceNames OR baselinePractice):
  → Method
Else if document has baselinePracticeName:
  → Practice
Else:
  → PracticeBaseline
```

This programmatic discrimination ensures extension practices are not erroneously validated as full baselines, maintaining structural integrity across the methodology hierarchy.

## Core Definitions

### PracticeElement

Base type for all named practice artifacts - the foundational root object.

```json
{
  "name": "string",           // Required: Unique identifier (canonical key)
  "description": "string",    // Required: Human-readable description
  "tags": {                   // Optional: Structured orthogonal classification
    "domainTags": ["string"],          // Technical discipline (Architecture, Security, FinOps)
    "lifecycleTags": ["string"],       // Temporal mapping (Strategy, Sprints, Operations)
    "organizationalTags": ["string"]   // Owning business unit
  },
  "narratives": [...]         // Optional: Embedded narrative breakdown
}
```

**Tags - Orthogonal Classification**:
- **Structured object** (preferred): Separate domain/lifecycle/organizational buckets prevent semantic fragmentation
- **Legacy array**: Flat string array treated as lifecycleTags only (deprecated)

**Narrative Support**: By embedding `narratives` at the root level, ANY methodology construct—from micro-level Work Product to macro-level Pattern—can be enriched with structured storytelling frameworks.

### Identity Pattern

All named elements follow this canonical pattern:
- **Identity by name**: Case-insensitive, whitespace-normalized comparison
- **Symbolic references**: Cross-links use string names, NOT embedded objects
- **Merge by name**: During composition, elements with matching canonical names merge

**Canonical Name**: The authoritative identifier used for all structural references. Aliases exist only for presentation.

## Practice Language Elements

### Alpha - Essential Elements of Concern

An **Alpha** (Abstract-Level Progress Health Attribute) defines essential elements of an endeavor requiring tracking and progression. It represents the **conceptual entity**, not its documentation.

**Ontological Clarity**: A "Requirements" Alpha represents actual stakeholder needs, NOT the requirements document. The document is a Work Product that provides evidence of the Alpha's state.

```json
{
  "name": "Requirements",
  "description": "The things the software must do",
  "focusName": "Solution",      // String ref to Focus
  "contributesTo": "System",     // Optional: Parent alpha name (hierarchical dependency)
  "supportingAlphas": [...],     // Optional: Child alpha names (rollup calculation)
  "states": [...]                // Required: 3+ progression states
}
```

**States** represent discrete maturity checkpoints:
```json
{
  "name": "Conceived",
  "description": "Initial state",
  "seq": 1,                     // Temporal ordering
  "checklist": [                // Verification items (state gates)
    {
      "name": "Stakeholders identified",
      "description": "...",
      "seq": 1,
      "verificationMethod": "manual-audit",
      "evidencedBy": [          // Work product contributions required
        { "workProductName": "Stakeholder Register", 
          "levelOfDetailName": "Identified" }
      ]
    }
  ]
}
```

**Verification Methods** (operational semantics):
- `automated-telemetry`: Automated metrics collection from systems
- `manual-audit`: Manual inspection and attestation
- `documentation-review`: Document existence and content verification
- `system-assertion`: System state checks (configuration, deployment)

#### Baseline Isolation Rules

**CRITICAL**: When extending a baseline, authors are **strictly prohibited** from creating floating Alphas.

✓ **Correct**: All new Alphas in a Practice must logically refine a parent concept:
```json
{
  "name": "Custom Alpha",
  "contributesTo": "Baseline Alpha",  // Must reference baseline or dependency
  ...
}
```

✗ **Incorrect**: Floating alphas with no baseline connection are invalid:
```json
{
  "name": "Random New Alpha",
  // Missing contributesTo - invalid in extension practice
}
```

#### Programmatic State Transitions

The schema enables **programmatic transition triggers** that evaluate prerequisite conditions:

1. **Checklist Completion**: All checklist items must be satisfied
2. **Evidence Validation**: Required Work Products at specified levels must exist
3. **Supporting Alpha Gates**: Child alphas must meet prerequisite maturity

This transforms the schema into a **dynamic to-do engine** generating actionable task lists.

#### Alpha Rollups and Hierarchies

**supportingAlphas** enables hierarchical dependencies:
- Child alpha states **roll up** into parent alpha evaluations
- Parent Alpha cannot transition unless **designated supportingAlphas** meet calculated prerequisite maturity
- Auto-populated from `contributesTo` relationships during composition

### Alpha Instances - Expected Occurrences

While an **Alpha** defines the abstract concept, executing a methodology requires defining **anticipated occurrences** of these concepts.

**AlphaInstanceName** (Practice-level declaration):
```json
{
  "name": "Mobile App Requirements",
  "description": "Requirements specific to mobile application",
  "alphaName": "Requirements"  // Links to abstract Alpha
}
```

**AlphaInstance** (Tracking actual progression):
```json
{
  "name": "Mobile App Requirements",
  "description": "...",
  "alphaName": "Requirements",
  "stateName": "Addressed",     // Current state of this instance
  "evidenceBy": [               // Artifacts proving this state
    {
      "name": "Mobile Backlog",
      "description": "...",
      "workProductName": "Requirements Document",
      "levelOfDetailName": "Refined"
    }
  ]
}
```

**Operational Guidance**: Expected instances should be contextualized using embedded narratives to connect abstract concepts to practical, real-world execution.

### ActivitySpace - Execution Boundaries

Coordinates work in a focus area (swimlane parent). Provides generalized organizational boundaries.

```json
{
  "name": "Requirements Engineering",
  "description": "...",
  "focusName": "Solution",
  "contributesTo": [            // Alpha/state pairs this work advances
    { "alphaName": "Requirements", "stateName": "Conceived" }
  ],
  "requiredCompetencies": ["Analysis"],  // Capabilities needed
  "involves": ["Product Owner"],         // PersonaGroup names (team mapping)
  "activities": [...]           // Nested activities (canonical)
}
```

**Organizational Mapping**: The `involves` array references `PersonaGroup.name`, explicitly linking execution boundaries to grouped organizational roles. This ensures macro-level responsibilities are programmatically mapped to specific talent pools.

#### Baseline Isolation Rules

**CRITICAL**: Practice authors should **avoid creating new ActivitySpaces** in extension practices.

✓ **Correct**: New tactical Activities map to existing baseline boundaries:
```json
{
  "name": "Custom Activity",
  "activitySpaceName": "Requirements Engineering",  // Reference baseline space
  ...
}
```

✗ **Incorrect**: Creating new ActivitySpaces fragments governance structure:
```json
{
  "activitySpaces": [
    { "name": "Custom Space", ... }  // Avoid in extension practices
  ]
}
```

### Activity - Concrete Work

Specific actionable work performed within an activity space.

```json
{
  "name": "Elicit Requirements",
  "description": "...",
  "activitySpaceName": "Requirements Engineering",  // Parent (optional if nested)
  "focusName": "Solution",
  "contributesTo": [
    { "alphaName": "Requirements", "stateName": "Conceived" }
  ],
  "requiredCompetencies": ["Analysis"],
  "involves": ["Product Owner"],
  "worksOn": [                  // Work products this activity creates/refines
    { "workProductName": "Requirements Document", 
      "levelOfDetailName": "Draft" }
  ],
  "recommendedCompetencyLevels": [  // Specific skill levels needed
    { "competencyName": "Analysis", "competencyLevelName": "Proficient" }
  ]
}
```

**Structural Options**:
- **Nested** (canonical): Under `ActivitySpace.activities[]`
- **Flat** (legacy interchange): Under `Practice.activities[]`

Loaders canonicalize by folding flat activities into their parent spaces.

### WorkProduct - Evidentiary Artifacts

A **Work Product** is the tangible artifact providing empirical evidence necessary to validate Alpha state progressions. It represents the **definition** of an artifact type, not specific instances.

**Ontological Distinction**: Work Products are information artifacts ABOUT reality (Alphas), not reality itself.

```json
{
  "name": "Requirements Document",
  "description": "...",
  "levelsOfDetail": [          // Required: 2+ levels (maturity progression)
    {
      "name": "Draft",
      "description": "Initial capture of requirements",
      "seq": 1,
      "checklist": [...],      // Quality gates for this level
      "contributesTo": [       // Alpha/state contributions
        { "alphaName": "Requirements", "stateName": "Conceived" }
      ]
    },
    {
      "name": "Refined",
      "description": "Detailed, prioritized requirements",
      "seq": 2,
      "checklist": [...],
      "contributesTo": [
        { "alphaName": "Requirements", "stateName": "Bounded" }
      ]
    }
  ]
}
```

**Maturity Progression**: Levels of Detail align with progressive organizational adoption:
1. Initial/Draft (basic capture)
2. Refined/Detailed (elaborated)
3. Validated/Approved (governance cleared)

Each level's achievement directly advances parent Alphas via **AlphaContribution**.

### Work Product Instances - Expected Deliverables

While a **Work Product** defines the artifact type, practitioners need **expected, tangible deliverables** during execution.

**WorkProductInstanceName** (Practice-level declaration):
```json
{
  "name": "Mobile Backlog",
  "description": "Product backlog for mobile app",
  "workProductName": "Requirements Document"  // Links to abstract type
}
```

**WorkProductInstance** (Tracking actual artifacts):
```json
{
  "name": "Mobile Backlog",
  "description": "...",
  "workProductName": "Requirements Document",
  "levelOfDetailName": "Refined"  // Target level for this instance
}
```

**Usage**: These instances appear in:
- `AlphaInstance.evidenceBy[]` - Proving alpha state progression
- `PatternView.alphaInstances[].evidenceBy[]` - Expected phase outcomes

### Pattern - Lifecycle Orchestration

Temporal progression showing how a practice unfolds over time. Structures language elements into reusable real-world execution lifecycles.

```json
{
  "name": "Scrum Sprint Pattern",
  "description": "Two-week sprint cycle",
  "narrativeTypeName": "Sprint Narrative",  // Optional: Adopts storytelling framework
  "patternViews": [            // Required: 1+ views (phases/stages)
    {
      "name": "Sprint Planning",
      "description": "Plan sprint scope and commit",
      "seq": 1,
      "alphaStates": [         // States to achieve in this phase
        { "alphaName": "Work", "stateName": "Initiated" },
        "Requirements→Conceived"  // Legacy string format (deprecated)
      ],
      "alphaInstances": [...], // Expected instance outcomes with evidence
      "activitySpaces": [...], // Swimlanes (ActivitySpace names)
      "activities": [...],     // Activities (Activity names)
      "narrativeContexts": [...]  // Authored narrative slices
    }
  ]
}
```

**Pattern Views** represent stages/phases/iterations in temporal flow. They act as **localized filters**, displaying only relevant elements for that lifecycle phase.

#### Narrative Integration

**Pattern-Level**: `narrativeTypeName` adopts a storytelling framework for the entire lifecycle (STAR, Hero's Journey, etc.)

**PatternView-Level**: `narrativeContexts[]` embeds contextual, authored narrative slices:
```json
{
  "narrativeContexts": [
    {
      "seq": 1,
      "narrativeElementName": "Sprint Goal",  // From NarrativeType
      "context": "Implement user authentication and session management"
    }
  ]
}
```

A single PatternView can articulate its role across **multiple narrative elements** (e.g., both 'Task' and 'Action' in STAR narrative).

#### Phase Management Best Practices

**Prerequisite Views**: Account for "Phase 0" or preparation:
```json
{
  "name": "Preparation",
  "seq": 0,  // Explicit prerequisite phase
  ...
}
```

**Pruning for Clarity**:
- If Alpha's state doesn't change across entire lifecycle → remove from Pattern
- If Alpha's state identical between sequential views → omit from subsequent view
- Only highlight **active state transitions**

This maintains focus and prevents matrix bloat in visualization.

### Competency - Skills and Capabilities

Capabilities required for activities (not organizational roles).

```json
{
  "name": "Analysis",
  "description": "Ability to analyze requirements and systems",
  "levels": [                  // Required: 1+ levels (skill progression)
    {
      "name": "Novice",
      "description": "Basic analytical skills",
      "level": 1,
      "competencyName": "Analysis"  // Back-reference to parent
    },
    {
      "name": "Proficient",
      "description": "Advanced analytical capabilities",
      "level": 3,
      "competencyName": "Analysis"
    }
  ]
}
```

**Competency Hierarchy** (Dreyfus model recommended):
1. Novice
2. Advanced Beginner
3. Competent
4. Proficient
5. Expert

### Persona & PersonaGroup - Organizational Roles

**Persona**: Direct container for required competencies.
```json
{
  "name": "Business Analyst",
  "description": "Analyzes business needs and translates to requirements",
  "competencies": [            // Competency level refs
    { "competencyName": "Analysis", "competencyLevelName": "Proficient" },
    { "competencyName": "Communication", "competencyLevelName": "Competent" }
  ]
}
```

**PersonaGroup**: Clusters multiple roles for team-level assignment.
```json
{
  "name": "Product Owner",
  "description": "Product ownership collective",
  "personaNames": [            // Required: 1+ persona names
    "Product Manager",
    "Business Analyst"
  ]
}
```

**Usage in Activities**: ActivitySpaces assign workflows to `PersonaGroup.name` via `involves` array, enabling department-level rather than individual assignments.

### Focus - Aspects of Concern

Categorizes elements by dimension of interest (SEMAT: Customer, Solution, Endeavor).

```json
{
  "name": "Solution",
  "description": "The software system being built"
}
```

**Standard Focuses** (SEMAT Kernel):
- **Customer**: Value, needs, satisfaction
- **Solution**: System, requirements, architecture
- **Endeavor**: Team, work, way of working

### Narrative Structures - Storytelling Frameworks

Translates complex JSON hierarchy into engaging formats through structured narrative frameworks.

#### NarrativeType - Storytelling Template

Defines specific narrative approaches as container for **NarrativeElement** objects.

```json
{
  "name": "STAR Narrative",
  "description": "Situation-Task-Action-Result framework",
  "narrativeElements": [
    {
      "name": "Situation",
      "description": "Context and background",
      "howToUse": "Describe the initial context, challenges, or opportunities that motivated this work"
    },
    {
      "name": "Task",
      "description": "Specific objectives",
      "howToUse": "State the specific goal or objective that needed to be accomplished"
    },
    {
      "name": "Action",
      "description": "Steps taken",
      "howToUse": "Detail the specific actions, activities, and decisions made to address the task"
    },
    {
      "name": "Result",
      "description": "Outcomes and impacts",
      "howToUse": "Quantify the outcomes, impacts, and lessons learned from the actions"
    }
  ]
}
```

**howToUse Field**: Provides explicit authoring instructions for practitioners. Operational tooling must surface this guidance when authors fill narrative contexts.

#### Common Narrative Frameworks

**STAR Format** (Situation, Task, Action, Result):
- Enforces strict cause-and-effect relationships
- Ideal for: Progress reports, retrospectives, case studies

**Hero's Journey / Pixar Framework**:
- 12-stage mythological structure
- Ideal for: Platform adoptions, transformations, organizational change

**Three-Act Structure & StoryBrand**:
- Positions consumer as Hero, methodology as Guide
- Ideal for: Marketing methodology adoption, executive communication

**Micro-Narratives** (ABT - And/But/Therefore, PAS - Problem/Agitate/Solve):
- Short, persuasive formats
- Ideal for: Daily standup updates, status reports, quick wins

#### Narrative Instance

Instance of narrative type on any practice element (universal via `PracticeElement.narratives`).

```json
{
  "name": "sprint-1-story",
  "description": "Sprint 1 narrative",
  "narrativeName": "Sprint 1: Authentication Foundation",
  "narrativeTypeName": "STAR Narrative",
  "narrativeContexts": [
    {
      "seq": 1,
      "narrativeElementName": "Situation",
      "context": "Users had no secure way to access the system, relying on unsafe URL parameters"
    },
    {
      "seq": 2,
      "narrativeElementName": "Task",
      "context": "Implement enterprise-grade authentication with OAuth2 and session management"
    }
  ]
}
```

**Tooling Synchronization**: Operational tooling must synchronize `narrativeName` with human-facing interfaces. Execution milestones map to narrative spine via NarrativeContext, delivering contextual slices based on user progress.

## Document Types

### PracticeBaseline

The kernel foundation with complete practice definitions. Domain-agnostic, version-controlled registry of core constructs.

```json
{
  "name": "Essence Kernel",
  "description": "SEMAT Essence kernel",
  "focuses": [...],            // Required: Customer, Solution, Endeavor
  "alphas": [...],             // Required: Core abstract concerns
  "activitySpaces": [...],     // Required: Organizational boundaries
  "competencies": [...],       // Required: Core capabilities
  "authors": ["string"],       // Required: IP tracking
  "createdAt": "ISO-8601",     // Required: Provenance
  "updatedAt": "ISO-8601",     // Required: Version control
  "version": "1.0.0",          // Required: Semantic versioning
  "keywords": ["string"],      // Required: Discovery
  "narrativeTypes": [...]      // Optional: Storytelling templates
}
```

**Metadata Requirements**: Tooling must enforce:
- Strict semantic versioning (major.minor.patch)
- ISO 8601 timestamps (UTC recommended)
- Author attribution for IP tracking
- Keyword taxonomies for discovery

### Practice

Extension that overlays a baseline with applied methodology.

```json
{
  "name": "Scrum Practice",
  "description": "Agile framework for iterative development",
  "baselinePracticeName": "Essence Kernel",  // Required: Kernel reference
  "practiceDependencyNames": [...],          // Optional: Other practices
  "practiceElementAliases": [...],           // Optional: Local name aliases
  
  // Baseline-shaped overlays (all optional):
  "focuses": [...],
  "alphas": [...],
  "activitySpaces": [...],
  "competencies": [...],
  "authors": [...],
  "createdAt": "...",
  "updatedAt": "...",
  "version": "...",
  "keywords": [...],
  
  // Practice-specific elements:
  "workProducts": [...],      // Optional: Artifact definitions
  "patterns": [...],          // Optional: Lifecycle orchestrations
  "personas": [...],          // Optional: Role definitions
  "personaGroups": [...],     // Optional: Team groupings
  "alphaInstances": [...],    // Optional: Expected alpha occurrences
  "workProductInstances": [...],  // Optional: Expected deliverables
  "narrativeTypes": [...],    // Optional: Custom narrative frameworks
  "activities": [...]         // Optional: Flat activities (legacy)
}
```

**Practice Dependencies** define merge hierarchy:
- `baselinePracticeName`: Kernel, always merges first
- `practiceDependencyNames`: Extensions merged before this practice (order matters)

### Method

Composition of baseline + practices into executable methodology.

```json
{
  "name": "Our Method",
  "description": "Tailored methodology for our context",
  
  // Either embedded baseline or name reference:
  "baselinePractice": { ... },          // Embedded baseline object
  // OR
  "baselinePracticeName": "string",     // Name reference (requires library)
  
  // Either embedded practices or name references:
  "practices": [                        // Embedded practice objects
    { ... }
  ],
  // OR
  "practiceNames": ["string"],          // Name references (requires library)
  
  // Optional: Method-level overlays
  "workProducts": [...],
  "patterns": [...],
  "personas": [...],
  "personaGroups": [...]
}
```

**Method Composition Rules**:
1. Baseline merges first (kernel foundation)
2. Embedded methods contribute their baseline before their practices
3. Practices merge in hierarchy order (nearest baseline first)
4. **Baseline descriptions always win** on same-named elements
5. Activity spaces merge by identity key
6. Supporting alphas auto-aggregate from contributesTo relationships

## Adapting and Extending Practices

### Practice Aliasing - Presentation Layer

Because abstract naming conventions can obscure domain-specific adaptations, practices can declare **presentation-layer aliases**.

```json
{
  "practiceElementAliases": [
    {
      "practiceElementType": "Alpha",
      "practiceElementName": "Requirements",  // Canonical baseline name
      "aliasName": "Backlog"                  // Local presentation name
    }
  ]
}
```

**CRITICAL - Strict Alias Isolation**:

✓ **Correct**: Aliases for presentation only
- Display "Backlog" in UI instead of "Requirements"
- Document "Product Backlog" but reference "Requirements" internally

✗ **Incorrect**: Using aliases for structural references
```json
{
  "contributesTo": [
    { "alphaName": "Backlog", ... }  // WRONG - use canonical "Requirements"
  ]
}
```

**Isolation Rule**: `aliasName` strings must **NEVER** appear in structural relationships (`alphaName`, `activitySpaceName`, etc.). All internal references use **canonical baseline names**. Alias serves only as UI substitution.

### Practice Adaptation - Extending Elements

Practices can now **adapt existing PracticeElements** from dependencies while maintaining operational integrity.

**Adaptation Rules**:

When extending existing elements:
- ✓ **CAN** add new narratives, tags, keywords
- ✓ **CAN** add new checklist items to existing States/Levels
- ✗ **MUST NOT** change `name` property (unique key)
- ✗ **MUST NOT** change `description` property (baseline wins)
- ✗ **MUST NOT** change existing State/Checklist definitions

**Example - Adding Checklists to Baseline Alpha**:
```json
{
  "alphas": [
    {
      "name": "Requirements",  // Reference baseline alpha by canonical name
      "states": [
        {
          "name": "Conceived",  // Reference baseline state by name
          "checklist": [
            {
              "name": "Architecture Review Complete",  // NEW checklist item
              "description": "Architecture board has reviewed and approved requirements",
              "seq": 10,
              "verificationMethod": "documentation-review"
            }
          ]
        }
      ]
    }
  ]
}
```

**Mechanism**: Practice declares the element using its type and canonical name, then includes **only new content**. The merge algorithm combines with baseline definition.

**Alias vs. Adapt**:
- **Alias**: Presentation-layer name substitution (UI display)
- **Adapt**: Structural extension with new content (checklists, tags)

Both mechanisms remain valid; choose based on intent.

### Practice Partitioning - Value-Driven Scoping

**CRITICAL**: Avoid "functional decomposition" when authoring practices.

✗ **Incorrect**: Generic task-list practices
- "Testing Practice" - just flat QA activities
- "Coding Practice" - generic development tasks
- "Documentation Practice" - writing templates

✓ **Correct**: Value-additive units addressing discrete, cohesive concerns
- "Product Discovery Practice" - user research → validated backlog
- "Zero-Trust Networking Practice" - identity verification → secure access
- "FinOps Cost Optimization Practice" - visibility → cost control

**Four-Perspective Evaluation**:

Evaluate methodology across distinct perspectives:
1. **Business**: Commercial logic, value streams, KPIs
2. **Technology**: System design, architecture, tooling
3. **People**: Team RACI, skills, collaboration
4. **Process**: Operational workflows, ceremonies, governance

If source material blends multiple distinct value streams, **partition into separate Practice documents**, linking via `practiceDependencyNames`.

### Practice Dependencies

The Practice object supports modular composition via symbolic links.

```json
{
  "name": "Advanced Practice",
  "baselinePracticeName": "Essence Kernel",  // Always required
  "practiceDependencyNames": [
    "Foundational Practice",    // Merges first (highest precedence)
    "Intermediate Practice"     // Merges second
  ]
  // Current practice merges last (lowest precedence)
}
```

**Dependency Resolution**:
1. Load practice from library by name
2. Recursively resolve its dependencies (cycle detection)
3. Resolve baseline
4. Return in hierarchy order (nearest baseline first)

**Circular Dependency Detection**: Tooling must detect and reject circular references in dependency chains.

## Symbolic References

Most cross-references use **string names** instead of embedded objects, enabling:
- Lightweight documents
- Separate versioning of referenced elements
- Library-based composition
- Validation after resolution

### AlphaContribution
```json
{
  "alphaName": "Requirements",     // String ref to Alpha.name
  "stateName": "Conceived"         // String ref to State.name
}
```

### WorkProductContribution
```json
{
  "workProductName": "Requirements Document",  // String ref to WorkProduct.name
  "levelOfDetailName": "Draft"                 // String ref to LevelOfDetail.name
}
```

### CompetencyLevelReference
```json
{
  "competencyName": "Analysis",         // String ref to Competency.name
  "competencyLevelName": "Proficient"   // String ref to CompetencyLevel.name
}
```

**Validation**: References validated **after composition**, ensuring they resolve within merged scope (baseline + dependencies + current practice).

## Validation Rules

### Structural Validation

**Required Arrays**:
- `Alpha.states`: Minimum 3 states
- `WorkProduct.levelsOfDetail`: Minimum 2 levels
- `Pattern.patternViews`: Minimum 1 view
- `LevelOfDetail.contributesTo`: Minimum 1 contribution

**Unique Names**:
- All `PracticeElement.name` values within same array type must be unique
- Case-insensitive, whitespace-normalized comparison

**String References**:
- Must resolve to actual element names within scope
- Scope = baseline + all dependencies + current practice (after composition)

**Temporal Ordering**:
- States: By `seq` field (ascending)
- Pattern views: By `seq` field (ascending)
- Levels of detail: By `seq` field (ascending)
- Competency levels: By `level` field (ascending)

### Semantic Validation

**Checklist Semantics**:
- Each checklist item represents **demonstrable operational truth**
- Must be verifiable via specified `verificationMethod`
- Should link to `evidencedBy` work products when possible
- Can embed regulatory/architectural controls (SOC2, ISO, internal standards)

**Alpha State Transitions**:
- Transitions blocked until **all checklists satisfied**
- Required evidence (work products at specified levels) must exist
- Supporting alphas must meet prerequisite maturity

**Baseline Isolation**:
- Extension practices must not create floating Alphas (require `contributesTo`)
- Avoid creating new ActivitySpaces (map to baseline boundaries)
- Aliases must not appear in structural references

## Schema Evolution

### Version: Draft 2020-12

Uses JSON Schema draft 2020-12 features:
- `$defs` for reusable definitions
- `unevaluatedProperties: false` for strict validation
- `allOf` for type composition
- `oneOf` for mutually exclusive options

### Extension Points

New practice element types can be added by:
1. Adding definition to `$defs` (extending `PracticeElement`)
2. Adding to appropriate container arrays in baseline/practice
3. Updating merge logic in `compositePracticeFromMethod.ts`
4. Adding field editor component (UI)
5. Updating report generators and visualizations

**Backward Compatibility**: Maintain by:
- Using optional fields for new features
- Supporting legacy formats alongside canonical (e.g., string vs object alpha states)
- Providing migration utilities for structural changes

## Common Patterns

### Baseline + Extension
```json
// baseline.json
{
  "name": "Core Practice",
  "focuses": [{"name": "Solution", "description": "..."}],
  "alphas": [
    {
      "name": "Requirements",
      "description": "Essential stakeholder needs",
      "focusName": "Solution",
      "states": [...]
    }
  ]
}

// extension.json
{
  "name": "Extended Practice",
  "baselinePracticeName": "Core Practice",
  "alphas": [
    {
      "name": "Requirements",  // Same canonical name = merge
      "states": [
        {
          "name": "Conceived",  // Extend baseline state
          "checklist": [
            {
              "name": "Custom Validation",  // Add new checklist
              ...
            }
          ]
        }
      ]
    }
  ]
}
```

### Pattern Lifecycle Progression
```json
{
  "name": "Sprint Pattern",
  "narrativeTypeName": "STAR Narrative",
  "patternViews": [
    {
      "name": "Planning",
      "seq": 1,
      "alphaStates": [
        { "alphaName": "Work", "stateName": "Initiated" }
      ],
      "narrativeContexts": [
        {
          "seq": 1,
          "narrativeElementName": "Task",
          "context": "Plan sprint scope and commitment"
        }
      ]
    },
    {
      "name": "Execution",
      "seq": 2,
      "alphaStates": [
        { "alphaName": "Work", "stateName": "Under Control" }
      ]
    },
    {
      "name": "Review",
      "seq": 3,
      "alphaStates": [
        { "alphaName": "Work", "stateName": "Concluded" }
      ],
      "narrativeContexts": [
        {
          "seq": 1,
          "narrativeElementName": "Result",
          "context": "Delivered working software increment, identified improvements"
        }
      ]
    }
  ]
}
```

### Competency Hierarchy (Dreyfus Model)
```json
{
  "name": "Programming",
  "description": "Software development capability",
  "levels": [
    {
      "name": "Novice",
      "description": "Learning basic syntax and concepts",
      "level": 1,
      "competencyName": "Programming"
    },
    {
      "name": "Advanced Beginner",
      "description": "Can complete simple tasks with guidance",
      "level": 2,
      "competencyName": "Programming"
    },
    {
      "name": "Competent",
      "description": "Independent problem-solving, planning",
      "level": 3,
      "competencyName": "Programming"
    },
    {
      "name": "Proficient",
      "description": "Holistic understanding, pattern recognition",
      "level": 4,
      "competencyName": "Programming"
    },
    {
      "name": "Expert",
      "description": "Intuitive mastery, innovation",
      "level": 5,
      "competencyName": "Programming"
    }
  ]
}
```

### Alpha Instances with Evidence
```json
{
  "patterns": [
    {
      "name": "Mobile App Launch",
      "patternViews": [
        {
          "name": "Beta Testing",
          "seq": 3,
          "alphaInstances": [
            {
              "name": "iOS App",
              "description": "iPhone and iPad application",
              "alphaName": "Software System",
              "stateName": "Usable",
              "evidenceBy": [
                {
                  "name": "iOS Beta Build",
                  "description": "TestFlight build 1.0.0-beta.5",
                  "workProductName": "Deployable System",
                  "levelOfDetailName": "Beta Quality"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Operational Best Practices

### Checklist Design

**DO**:
- Represent demonstrable operational truths
- Link to physical evidence (Git commits, documents, URIs)
- Embed regulatory controls (SOC2 2.1.3, ISO 27001:A.8.1)
- Use specific, measurable criteria

**DON'T**:
- Use vague criteria ("consider security")
- Create unverifiable checks
- Duplicate between related states
- Omit verification method

### Practice Composition

**DO**:
- Start with well-defined baseline
- Use dependencies for prerequisites
- Document rationale in description
- Test composition before release

**DON'T**:
- Create circular dependencies
- Override baseline descriptions
- Create floating alphas in extensions
- Mix multiple value streams in one practice

### Narrative Integration

**DO**:
- Choose framework matching audience (STAR for technical, Hero's Journey for executive)
- Provide concrete examples in `howToUse`
- Map phases to narrative elements consistently
- Use narratives to bridge abstract to concrete

**DON'T**:
- Mix incompatible frameworks
- Leave narrative elements without guidance
- Create narratives without NarrativeType
- Overload with multiple simultaneous stories

## Enterprise Integration

### Knowledge Graph Scenarios

**Semantic Search**: Organizations can query across methodology corpus:
- "Find all activities requiring 'Security' competency"
- "Show alphas in 'Customer' focus that contribute to 'Value'"
- "List work products evidencing SOC2 compliance"

**RAG Applications**: Retrieval-augmented generation using methodology as knowledge base:
- Generate practice documentation from schema
- Answer "How do we handle requirements in our method?"
- Suggest activities based on current alpha states

**Cross-System Integration**: Stable IRIs enable linking:
- Jira epics → Alpha instances
- Git repos → Work product instances
- Team directories → Persona groups
- Compliance databases → Checklist items

### Operational Tooling Requirements

**State Management**:
- Real-time alpha state calculation
- Dependency graph visualization
- Checklist tracking and attestation
- Evidence URI validation

**Workflow Automation**:
- Generate task lists from uncompleted checklists
- Trigger activities when prerequisites met
- Alert on blocked alpha progressions
- Auto-populate supporting alpha relationships

**Reporting and Analytics**:
- Practice adoption metrics
- Alpha state dashboards
- Competency gap analysis
- Pattern execution timelines

## See Also

- [language.schema.json](../web/public/language.schema.json) - Full schema definition
- [types.ts](../web/src/lib/types.ts) - TypeScript type definitions
- [compositePracticeFromMethod.ts](../web/src/lib/methodMerge/compositePracticeFromMethod.ts) - Merge implementation
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - System architecture and functions
- [QUICK_START.md](./QUICK_START.md) - Getting started guide
