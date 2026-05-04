# Practice Logic

## Component: Data Ingestion and Semantic Resolution
Instructions:
The engine must first load the core schemas, resolve practice dependencies to form a cohesive ontological graph, and apply presentation-layer terminology mapping to ensure the vocabulary resonates with the specific enterprise audience.

Note: DocumentObject is a class that represents all of the PracticeElement types and schema objects

--- 

FUNCTION MergeMethod(DocumentObject,Method)
> IF DocumentObject DOES NOT CONTAIN Method.BaselinePractice THEN
>> LOAD Practice.baselinePractice INTO baseline

> MergePracticeArray(DocumentObject,Method.Practices)

---

FUNCTION MergePracticeArray(DocumentObject,ArrayOfLibraryItems)
> FOR EACH LibraryItem FROM ArrayOfLibraryItems
>> LOAD LibraryItem INTO LibraryItem
IF LibraryItem is Method THEN MergeMethod(DocumentObject,LibraryItem)
ELSE IF LibraryItem is Practice THEN 
>>> FOR EACH PracticeDependency IN LibraryItem
>>>> MergePractice(LibraryItem.baselinePractice,PracticeDependency)
>>> MergePractice(LibraryItem.baselinePractice,LibraryItem)

---

FUNCTION MergePractice(DocumentObject,Practice)
> IF DocumentObject DOES NOT CONTAIN Practice.BaselinePractice THEN
>> LOAD Practice.baselinePractice INTO baseline
>> MergePracticeIntoDocument(DocumentObject,baseline)

> FOR EACH PracticeDependency in Practice.practiceDependencies
>> IF DocumentObject DOES NOT CONTAIN PracticeDependency THEN
>>> LOAD PracticeDependency
>>> MergePractice(DocumentObject,PracticeDependency)

> MergePracticeIntoDocument(DocumentObject,Practice)

---

FUNCTION MergePracticeIntoDocument(DocumentObject,Practice)
> FOR EACH PracticeElement IN Practice
>> IF PracticeElement.type IS PracticeElementAlias THEN
>>> FIND Element IN DocmentObject WHERE type = PracticElement.PracticeElementType AND name = PracticeElement.PracticeElementName
>>> IF FOUND Element.Alias = PracticeElement.AliasName

>> FIND Element IN DocumentObject
>> IF Element IS NULL THEN NEW Element
>> MergeContents(Element,PracticeElement)


---

FUNCTION MergeContents(Element,PracticeElement)
> FOR EACH Property IN PracticeElement
>> FIND oProperty IN Element
>> IF oProperty IS NULL THEN oProperty = Element.add(PracticeElement)
>> MergeContents(oProperty,Property)


# Practice Reporting

Instructions (presentation):
Resolve a **report renderable document**: baseline graph plus practice overlays (`patterns`, `activities`, `workProducts`, `practiceElementAliases`, `personas`, `personaGroups`, `narrativeTypes`, `narratives`). **Practice element aliases** map canonical schema names to audience-facing labels for headings and inline mentions only; they do not alter merge semantics upstream.

Emit sections in this order: **Introduction**, **Concerns**, **Documents**, **Activities**, optional **Lifecycle Execution (STAR Narrative Loop)**, **Conclusion and Next Steps**.

---

## Component: PrintNarrative and document shell
```
FUNCTION PrintNarrativeBlocks(Narrative, DisplayAlias)
COMMENT: One subsection per narrative node; recurse into nested `narratives[]`.

SET Heading TO DisplayAlias("Narrative", Narrative.narrativeName) OR "Narrative"
APPEND Narrative.description (or interchange description field) AS NORMAL under Heading

SORT Narrative.narrativeContexts BY seq ASCENDING
FOR EACH row IN sorted narrativeContexts
APPEND ONE BULLET whose body IS display text for that row (context prose; interchange-aware)

IF Narrative.narratives IS non-empty array
FOR EACH Child IN Narrative.narratives
APPEND PrintNarrativeBlocks(Child, DisplayAlias) after this block
RETURN combined blocks
```

---

## Component: Introduction, Concerns, Documents, Activities

```
FUNCTION GenerateIntroduction(ReportRenderableDoc, DisplayAlias)
CREATE H2 "Introduction"
SET body TO root practice description (or interchange); IF empty, placeholder about authoring root description
APPEND body AS first paragraph
IF root Narratives[] IS non-empty
FOR EACH root narrative N
APPEND PrintNarrativeBlocks(N, DisplayAlias) AS subsections under Introduction
```

```
FUNCTION GenerateConcerns(ReportRenderableDoc, DisplayAlias)
CREATE H2 "Concerns"
LEAD paragraph: structural note (e.g. swimlanes from Focus; Alphas only when they carry narratives)

SORT Focus rows BY name
FOR EACH Focus F
CREATE H3 DisplayAlias("Focus", F.name)
APPEND F description AS NORMAL

FOR EACH Alpha A WHERE A.focusName = F.name AND A.narratives[] is non-empty
CREATE H4 DisplayAlias("Alpha", A.name)
APPEND A description AS NORMAL
APPEND PrintNarrativeBlocks for EACH item IN A.narratives
```

```
FUNCTION GenerateDocuments(ReportRenderableDoc, DisplayAlias)
CREATE H2 "Documents"
FOR EACH WorkProduct W (schema order)
CREATE BULLET: label = DisplayAlias("WorkProduct", W.name) IN BOLD; body = W description (or placeholder if empty)
```

```
FUNCTION GenerateActivities(ReportRenderableDoc, DisplayAlias)
CREATE H2 "Activities"
LEAD paragraph: execution topography note

SORT Focus rows BY name
FOR EACH Focus F
CREATE H3 DisplayAlias("Focus", F.name)

FOR EACH ActivitySpace S WHERE S.focusName = F.name
COMMENT: Omit spaces with zero activities (nested row count + flat Practice.activities keyed by activitySpaceName).

MERGE activities: union of S.activities[] AND flat Practice.activities matching S.name by activitySpaceName; dedupe by activity name; sort by name
CREATE H4 DisplayAlias("ActivitySpace", S.name)
APPEND S description AS NORMAL (or placeholder)
IF S has narratives, FOR EACH narrative IN S.narratives APPEND PrintNarrativeBlocks BEFORE activity children
FOR EACH merged Activity A
CREATE H5/Hx DisplayAlias("Activity", A.name)
APPEND A description AS NORMAL (or placeholder)
IF A has narratives, APPEND PrintNarrativeBlocks for EACH
```

## Component: Lifecycle orchestration (STAR loop)
Instructions:
If a **Pattern** exists whose `narrativeTypeName` is **Lifecycle** (match case-insensitively), emit one subsection per **patternView** in ascending `seq`. **Alpha-state pruning** compares each view’s resolved alpha–state pairs to the previous view and narrates only **new** pairs as a short transition lead-in. **Phase title** comes from the first `narrativeContext` row’s `narrativeElementName` when present; otherwise fall back to the view name (or a seq-based label). **Phase intro prose** is the concatenation of context display strings for all `narrativeContexts` rows (sorted by `seq`), optionally prefixed by the transition sentence.

```
FUNCTION GenerateLifecycleSTAR(ReportRenderableDoc, DisplayAlias)
FIND Pattern P WHERE lower(trim(P.narrativeTypeName)) = "lifecycle"
IF none THEN skip this whole section

SET prevSignature TO empty set of "AlphaName⇥StateName" keys

FOR EACH PatternView V IN P.patternViews SORTED BY V.seq ASCENDING
BUILD pairs[] FROM V.alphaStates (parse object fields or string tokens like "Alpha → State")
SET currSignature TO set of keys for pairs
SET delta TO keys IN currSignature NOT IN prevSignature
SET prevSignature TO currSignature

SET phaseName FROM first narrativeContext.narrativeElementName (after seq sort) OR V.name OR fallback label
SET phaseContext TO joined context display text for all narrativeContexts (seq order)

IF delta non-empty
APPEND lead sentence summarizing newly advanced Alpha → State (DisplayAlias on alpha names)

APPEND phaseContext to chapter intro paragraph(s)

FOR EACH activity reference name IN V.activities[] (dedupe by normalized name)
RESOLVE Activity A from merged activity index (nested under spaces OR flat Practice.activities)
SKIP if unresolved

FIND parent ActivitySpace via A.activitySpaceName OR by scanning spaces for nested match

SET Situation = "Operating within the strategic bounds of " + parent space description (placeholder if missing)
SET Task = "The objective is to " + DisplayAlias("Activity", A.name) + optional ", which involves " + A.description
SET involves TO DisplayAlias("PersonaGroup", ...) for EACH name IN A.involves[] OR literal "accountable persona groups" if empty
SET (alphaName, stateName) FROM first entry IN A.contributesTo[] IF present
SET ChecklistText TO prose from that alpha-state’s checklist items (name + description); ELSE placeholder
SET Action = "The " + involves + " will execute the necessary validation steps, specifically: " + ChecklistText + "."
SET TargetState TO stateName from contributesTo OR placeholder
SET WorkProductLabel TO DisplayAlias("WorkProduct", first A.worksOn[].workProductName) OR placeholder
SET Result = "Successful execution results in achieving the " + TargetState + " state, evidenced by the creation of the " + WorkProductLabel + "."

APPEND ONE paragraph concatenating Situation, Task, Action, Result for this activity

CREATE chapter subsection titled: DisplayAlias("Pattern", P.name) + " · " + phaseName
IF no activities resolved, optional placeholder paragraph about symbolic activity references
COLLECT all chapter subsections under H2 "Lifecycle Execution (STAR Narrative Loop)"
```

## Component: Conclusion (terminal states)
Instructions:
Closing section **Conclusion and Next Steps** summarizes completion criteria using **culminating alpha states** whose names match a **terminal hint** (case-insensitive), for example: *Benefit Accrued*, *Optimized*, *Retired*, *Sustained*, *Embedded*, *Value Established*. For each such alpha, use the **last** state in `seq` order **if** its name matches the hint, attach **checklist prose** from that state (same shaping as lifecycle Action), and append one validation paragraph per alpha. If none qualify, append guidance to author terminal-state checklists.

```
FUNCTION GenerateConclusion(ReportRenderableDoc, DisplayAlias)
CREATE H2 "Conclusion and Next Steps"
APPEND lead paragraph explaining completion criteria from terminal alpha-state checklists

FOR EACH Alpha A IN ReportRenderableDoc.alphas
SORT A.states BY seq ASCENDING
TAKE last state L; IF L.name does NOT match terminal-hint pattern THEN CONTINUE
BUILD ChecklistText FROM L.checklist (skip alpha if empty)
APPEND "To definitively finalize the " + DisplayAlias("Alpha", A.name) + " workflow and close the endeavor, the organization must quantitatively validate that: " + ChecklistText

IF no paragraph generated for any alpha
APPEND author guidance placeholder naming example terminal state labels
```

---

## Component: Top-level orchestration
```
FUNCTION BuildPracticeReport(MergedDocument)
ReportDoc = normalize baseline + practice overlays + activity enrichment + referenced wrappers
DisplayAlias = lookup from practiceElementAliases

SECTIONS = [
  GenerateIntroduction(ReportDoc, DisplayAlias),
  GenerateConcerns(ReportDoc, DisplayAlias),
  GenerateDocuments(ReportDoc, DisplayAlias),
  GenerateActivities(ReportDoc, DisplayAlias),
]
IF Lifecycle pattern EXISTS THEN APPEND GenerateLifecycleSTAR(ReportDoc, DisplayAlias)
ALWAYS APPEND GenerateConclusion(ReportDoc, DisplayAlias)
RETURN structured section tree for Markdown/PDF renderers
```

Rendering to **Markdown** or **PDF** is a separate output step over the returned section tree.