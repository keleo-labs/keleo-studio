# Browse Layout Reporting Template Specification

**Version:** 1.0  
**Date:** 2026-05-07  
**Purpose:** Defines the standardized template structure for displaying Methods and Practices in the browse/view layout

---

## 1. Document Types

This specification defines rendering templates for two primary document types:

### 1.1 Method Document
A coordinating artifact that orchestrates multiple practices into a cohesive methodology, optionally defining a baseline practice (kernel) that all constituent practices extend.

### 1.2 Practice Document
An extension or standalone practice defining specialized work, alphas, activities, patterns, and personas either independently or atop a baseline practice.

---

## 2. Method Browse Layout Template

### 2.1 Method Header Section

```markdown
# {Method.name}

**Type:** Method  
**Baseline Practice:** {Method.baselinePracticeName or Method.baselinePractice.name}  
**Practices:** {count} ({comma-separated practice names})  
**Tags:** {display tags if present}

## Description

{Method.description}
```

### 2.2 Method Overview Narrative (if present)

```markdown
## Overview

{render Method.narratives with appropriate narrative structure}
```

### 2.3 Constituent Practices Summary

```markdown
## Practices in this Method

{For each practice in Method.practices:}

### {Practice.name}

**Dependencies:** {Practice.practiceDependencyNames or "None"}  
**Description:** {Practice.description (first 200 chars)}

[View full practice →](#practice-{practice-index})

---
```

### 2.4 Method-Level Dependency Graph (optional)

```markdown
## Practice Dependencies

{Visual or textual representation of practice dependency relationships}

- **{PracticeName1}** depends on: {dependencies}
- **{PracticeName2}** depends on: {dependencies}
```

### 2.5 Detailed Practice Sections

```markdown
---

# Practice Details

{For each practice in Method.practices, render using Practice Template (Section 3)}
```

---

## 3. Practice Browse Layout Template

### 3.1 Practice Header Section

```markdown
# {Practice.name}

**Type:** Practice  
**Baseline Practice:** {Practice.baselinePracticeName or "Standalone"}  
**Dependencies:** {Practice.practiceDependencyNames or "None"}  
**Tags:** {display tags if present}

## Description

{Practice.description}
```

### 3.2 Practice Overview Narrative (if present)

```markdown
## Overview

{render Practice.narratives at root level with appropriate narrative structure}
```

### 3.3 Quick Reference Section

```markdown
## Quick Reference

| Element Type | Count | Key Items |
|--------------|-------|-----------|
| **Focuses** | {count} | {comma-separated focus names} |
| **Alphas** | {count} | {comma-separated alpha names (max 5, then "...")} |
| **Activity Spaces** | {count} | {comma-separated space names (max 5, then "...")} |
| **Activities** | {count} | {comma-separated activity names (max 5, then "...")} |
| **Work Products** | {count} | {comma-separated work product names (max 5, then "...")} |
| **Patterns** | {count} | {comma-separated pattern names} |
| **Personas** | {count} | {comma-separated persona names (max 5, then "...")} |
| **Competencies** | {count} | {comma-separated competency names (max 5, then "...")} |
```

### 3.4 Dependencies Section (if applicable)

```markdown
## Dependencies

### Baseline Practice: {baselinePracticeName}

{Brief description of what this practice inherits from the baseline}

{If Practice.practiceDependencyNames exists:}

### Practice Dependencies

This practice builds upon:

{For each dependency in practiceDependencyNames:}
- **{DependencyName}**: {brief description or link}
```

### 3.5 Focuses Section

```markdown
---

## Focuses

The areas of concern that organize the work in this practice.

{For each focus in Practice.focuses:}

### {Focus.name}

{Focus.description}

**Related Alphas:** {list alphas with this focus}  
**Related Activity Spaces:** {list activity spaces with this focus}

{If Focus.narratives exists, render narrative}
```

### 3.6 Alphas Section

```markdown
---

## Alphas

The essential elements of software engineering that are worked with and progressed through states.

{For each alpha in Practice.alphas:}

### {Alpha.name}

**Focus:** {Alpha.focusName}  
**Contributes To:** {Alpha.contributesTo or "N/A"}  
**Supporting Alphas:** {Alpha.supportingAlphas or "None"}

{Alpha.description}

{If Alpha.narratives exists, render narrative}

#### States

{For each state in Alpha.states:}

##### {State.seq}. {State.name}

{State.description}

**Checklist:**

{For each item in State.checklist:}
- [ ] **{ChecklistItem.name}**: {ChecklistItem.description}  
  *Verification:* {ChecklistItem.verificationMethod}

{If State.contributesTo exists:}
**Contributes To:** {state target alphas}

{If State.narratives exists, render narrative}

---
```

### 3.7 Activity Spaces & Activities Section

```markdown
---

## Activity Spaces & Activities

The organized work performed to progress alphas and produce work products.

{For each activitySpace in Practice.activitySpaces:}

### {ActivitySpace.name}

{If ActivitySpace is a flat activity node (isPracticeActivityNode):}

**Type:** Activity (flat structure)  
**Focus:** {ActivitySpace.focusName}  
**Contributes To:** {ActivitySpace.contributesTo}  
**Required Competencies:** {ActivitySpace.requiredCompetencies}  
**Involves:** {ActivitySpace.involves (persona groups)}

{ActivitySpace.description}

{Else:}

**Type:** Activity Space  
**Focus:** {ActivitySpace.focusName}  
**Contributes To:** {ActivitySpace.contributesTo}  
**Required Competencies:** {ActivitySpace.requiredCompetencies}  
**Involves:** {ActivitySpace.involves (persona groups)}

{ActivitySpace.description}

{If ActivitySpace.narratives exists, render narrative}

#### Activities in {ActivitySpace.name}

{For each activity in ActivitySpace.activities:}

##### {Activity.name}

**Focus:** {Activity.focusName}  
**Contributes To:** {Activity.contributesTo}  
**Required Competencies:** {Activity.requiredCompetencies}  
**Recommended Competency Levels:**
{For each level in Activity.recommendedCompetencyLevels:}
- {level.competencyName}: {level.competencyLevelName}

**Works On (Work Products):**
{For each workProduct in Activity.worksOn:}
- {workProduct.workProductName} → {workProduct.levelOfDetailName}

**Involves (Persona Groups):** {Activity.involves}

{Activity.description}

{If Activity.narratives exists, render narrative}

---

{End ActivitySpace activities}
{End ActivitySpace loop}
```

### 3.8 Flat Activities Section (if present)

```markdown
---

## Additional Activities

{If Practice.activities exists and has items:}

Activities defined outside of activity space hierarchy.

{For each activity in Practice.activities:}

### {Activity.name}

**Activity Space:** {Activity.activitySpaceName}  
**Focus:** {Activity.focusName}  
**Contributes To:** {Activity.contributesTo}  
**Required Competencies:** {Activity.requiredCompetencies}  
**Recommended Competency Levels:**
{For each level in Activity.recommendedCompetencyLevels:}
- {level.competencyName}: {level.competencyLevelName}

**Works On (Work Products):**
{For each workProduct in Activity.worksOn:}
- {workProduct.workProductName} → {workProduct.levelOfDetailName}

**Involves (Persona Groups):** {Activity.involves}

{Activity.description}

{If Activity.narratives exists, render narrative}

---
```

### 3.9 Work Products Section

```markdown
---

## Work Products

Artifacts produced and refined through the practice's activities.

{For each workProduct in Practice.workProducts:}

### {WorkProduct.name}

{WorkProduct.description}

{If WorkProduct.narratives exists, render narrative}

#### Levels of Detail

{For each lod in WorkProduct.levelsOfDetail:}

##### Level {lod.seq}: {lod.name}

{lod.description}

**Contributes To:**
{For each contrib in lod.contributesTo:}
- {contrib.alphaName} → {contrib.stateName}

**Checklist:**

{For each item in lod.checklist:}
- [ ] **{ChecklistItem.name}**: {ChecklistItem.description}  
  *Verification:* {ChecklistItem.verificationMethod}

{If lod.narratives exists, render narrative}

---
```

### 3.10 Competencies Section

```markdown
---

## Competencies

The skills and abilities required to perform the practice's activities.

{For each competency in Practice.competencies:}

### {Competency.name}

{Competency.description}

{If Competency.narratives exists, render narrative}

#### Competency Levels

{For each level in Competency.levels:}

##### {level.seq}. {level.name}

{level.description}

**Checklist:**

{For each item in level.checklist:}
- [ ] **{ChecklistItem.name}**: {ChecklistItem.description}  
  *Verification:* {ChecklistItem.verificationMethod}

---
```

### 3.11 Personas & Persona Groups Section

```markdown
---

## Personas & Teams

The people and teams who perform the work in this practice.

{If Practice.personas exists:}

### Personas

{For each persona in Practice.personas:}

#### {Persona.name}

{Persona.description}

**Required Competencies:**
{For each competency in Persona.competencies:}
- {competency.competencyName} at level: {competency.competencyLevelName}

{If Persona.narratives exists, render narrative}

---

{If Practice.personaGroups exists:}

### Persona Groups (Teams)

{For each personaGroup in Practice.personaGroups:}

#### {PersonaGroup.name}

{PersonaGroup.description}

**Members:**
{For each personaName in PersonaGroup.personaNames:}
- {personaName}

{If PersonaGroup.narratives exists, render narrative}

---
```

### 3.12 Patterns Section

```markdown
---

## Patterns

Reusable sequences and approaches that coordinate activities and progress states.

{For each pattern in Practice.patterns:}

### {Pattern.name}

**Narrative Type:** {Pattern.narrativeTypeName}

{Pattern.description}

{If Pattern.narratives exists, render pattern-level narrative}

#### Pattern Phases

{For each patternView in Pattern.patternViews (sorted by seq):}

##### Phase {patternView.seq}: {patternView.name}

{patternView.description}

**Alpha States at this Phase:**

{For each alphaState in patternView.alphaStates:}
- **{alphaState.alphaName}** → {alphaState.stateName}

{If patternView.alphaInstances exists:}

**Alpha Instances:**

{For each alphaInstance in patternView.alphaInstances:}
- **{alphaInstance.instanceName}** ({alphaInstance.alphaName}) → {alphaInstance.stateName}

{If patternView.workProductInstances exists:}

**Work Product Instances:**

{For each wpInstance in patternView.workProductInstances:}
- **{wpInstance.instanceName}** ({wpInstance.workProductName}) → {wpInstance.levelOfDetailName}

{If patternView.activities exists:}

**Activities in this Phase:**

{For each activity in patternView.activities:}
- {activity}

{If patternView.activitySpaces exists:}

**Activity Spaces in this Phase:**

{For each activitySpace in patternView.activitySpaces:}
- {activitySpace}

{If patternView.narrativeContexts exists:}

**Phase Narrative:**

{For each narrativeContext in patternView.narrativeContexts (sorted by seq):}

**{narrativeContext.narrativeElementName}:**  
{narrativeContext.context}

---

{End Pattern loop}
```

### 3.13 Instances Section (if declared)

```markdown
---

## Declared Instances

Specific named examples referenced in patterns.

{If Practice.alphaInstanceNames exists:}

### Alpha Instances

{For each instance in Practice.alphaInstanceNames:}

#### {instance.name}

**Instance of:** {instance.alphaName}

{instance.description}

---

{If Practice.workProductInstanceNames exists:}

### Work Product Instances

{For each instance in Practice.workProductInstanceNames:}

#### {instance.name}

**Instance of:** {instance.workProductName}

{instance.description}

---
```

### 3.14 Practice Element Aliases Section (if present)

```markdown
---

## Terminology Mapping

This practice uses different terminology for some baseline elements.

{For each alias in Practice.practiceElementAliases:}

- **{alias.practiceElementType}**: *{alias.practiceElementName}* (baseline) → **{alias.aliasName}** (this practice)

---
```

### 3.15 Narrative Types Section (if custom types defined)

```markdown
---

## Narrative Frameworks

Custom narrative structures used in this practice.

{For each narrativeType in Practice.narrativeTypes:}

### {narrativeType.name}

{narrativeType.description}

#### Narrative Elements

{For each element in narrativeType.narrativeElements (sorted by seq):}

{element.seq}. **{element.name}**: {element.description}

---
```

---

## 4. Rendering Rules

### 4.1 Narrative Rendering

When a `narratives` array is encountered on any element:

```markdown
{For each narrative in element.narratives:}

**{narrative.narrativeName}** ({narrative.narrativeTypeName})

{narrative.description}

{For each narrativeContext in narrative.narrativeContexts (sorted by seq):}

**{narrativeContext.narrativeElementName}:**  
{narrativeContext.context}
```

### 4.2 Reference Link Format

- Alpha references: `[{alphaName}](#alpha-{slug(alphaName)})`
- Activity references: `[{activityName}](#activity-{slug(activityName)})`
- Work Product references: `[{wpName}](#workproduct-{slug(wpName)})`
- Persona references: `[{personaName}](#persona-{slug(personaName)})`

### 4.3 Contributes-To Rendering

When displaying `contributesTo` entries:

```markdown
**Contributes To:**
{For each contrib:}
- {If string: contrib}
- {If object: contrib.alphaName → contrib.stateName}
```

### 4.4 Empty Array Handling

- If an array is empty or undefined, omit the entire section
- Exception: For practices with dependencies, show "Inherits from baseline/dependencies" message

### 4.5 Tag Display

```markdown
**Tags:**
- Domain: {tag1, tag2, ...}
- Lifecycle: {tag1, tag2, ...}
- Organizational: {tag1, tag2, ...}
- Custom: {key1: value1, key2: value2, ...}
```

### 4.6 Pruned/Synthesized Element Handling

Elements with `tags.synthesized = true` or `tags.pruned = true` should:
- Be visually distinguished (italic, muted color, or with indicator)
- Include note: *(Inherited from baseline)*

---

## 5. Pattern Matrix Visualization Rules

For lifecycle patterns, optionally render a matrix view:

```markdown
### Pattern Matrix: {Pattern.name}

| Phase | {Alpha1} | {Alpha2} | {Alpha3} | {WorkProduct1} | ... |
|-------|----------|----------|----------|----------------|-----|
| **{Phase1.name}** | State1 | State2 | State3 | LOD1 | ... |
| **{Phase2.name}** | State2 | State3 | State4 | LOD2 | ... |
| **{Phase3.name}** | State3 | State4 | State5 | LOD3 | ... |

**Legend:**
- Bold changes indicate progression from previous phase
- Cells show target states/LODs by end of phase
```

---

## 6. Responsive Considerations

### 6.1 Mobile View

- Collapse competency level details by default
- Show pattern matrix as scrollable table
- Use accordion/disclosure for nested sections

### 6.2 Desktop View

- Show full expanded view
- Side navigation with section anchors
- Sticky header with practice name

### 6.3 Print View

- Include full table of contents
- Page breaks between major sections
- Expand all collapsed content

---

## 7. Accessibility Requirements

- All headings must follow proper hierarchy (no skipped levels)
- Use semantic HTML5 elements
- Provide ARIA labels for complex interactive elements
- Ensure sufficient color contrast for tags and indicators
- Keyboard navigation for all interactive elements

---

## 8. Example Implementation Pseudocode

```typescript
function renderPracticeBrowseLayout(practice: Practice): RenderedHTML {
  const sections = [];
  
  // Header
  sections.push(renderHeader(practice));
  
  // Overview narrative
  if (practice.narratives?.length) {
    sections.push(renderNarratives(practice.narratives, "Overview"));
  }
  
  // Quick reference
  sections.push(renderQuickReference(practice));
  
  // Dependencies
  if (practice.baselinePracticeName || practice.practiceDependencyNames?.length) {
    sections.push(renderDependencies(practice));
  }
  
  // Focuses
  if (practice.focuses?.length) {
    sections.push(renderFocuses(practice.focuses));
  }
  
  // Alphas
  if (practice.alphas?.length) {
    sections.push(renderAlphas(practice.alphas));
  }
  
  // Activity Spaces
  if (practice.activitySpaces?.length) {
    sections.push(renderActivitySpaces(practice.activitySpaces));
  }
  
  // Flat activities
  if (practice.activities?.length) {
    sections.push(renderActivities(practice.activities));
  }
  
  // Work Products
  if (practice.workProducts?.length) {
    sections.push(renderWorkProducts(practice.workProducts));
  }
  
  // Competencies
  if (practice.competencies?.length) {
    sections.push(renderCompetencies(practice.competencies));
  }
  
  // Personas & Groups
  if (practice.personas?.length || practice.personaGroups?.length) {
    sections.push(renderPersonasAndGroups(practice.personas, practice.personaGroups));
  }
  
  // Patterns
  if (practice.patterns?.length) {
    sections.push(renderPatterns(practice.patterns));
  }
  
  // Instances
  if (practice.alphaInstanceNames?.length || practice.workProductInstanceNames?.length) {
    sections.push(renderInstances(practice));
  }
  
  // Aliases
  if (practice.practiceElementAliases?.length) {
    sections.push(renderAliases(practice.practiceElementAliases));
  }
  
  // Narrative Types
  if (practice.narrativeTypes?.length) {
    sections.push(renderNarrativeTypes(practice.narrativeTypes));
  }
  
  return joinSections(sections);
}
```

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-07 | Initial specification |

---

## 10. References

- Essence Framework: ISO/IEC 24744
- Platform Adoption Essentials baseline practice
- Method composition merge logic: `compositePracticeFromMethod`
- Practice dependency resolution: `resolvePracticeWithLibraryIndex`
