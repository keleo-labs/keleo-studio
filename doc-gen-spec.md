# Practice Logic

## Component: Data Ingestion and Semantic Resolution
Instructions:
The engine must first load the core schemas, resolve practice dependencies to form a cohesive ontological graph, and apply presentation-layer terminology mapping to ensure the vocabulary resonates with the specific enterprise audience.

Pseudo-Code Logic Block: Initialization and Resolution
```
FUNCTION InitializeGenerator(BaselineKernel, PracticeExtension)
LOAD the BaselineKernel (e.g., the foundational platform-adoption-kernel.json defining core Alphas like Opportunity and Platform).
LOAD the PracticeExtension (e.g., the specific adoption-library-2026-05-02.json detailing the pilot governance).
FOR EACH Practice declared in the PracticeExtension:
IF the baselinePracticeName property exists, programmatically link the extension elements to their baseline parents, ensuring no floating Alphas exist.
FOR EACH Alias declared in the practiceElementAliases array:
MAP the targetName (e.g., "Pilot Summary Report") to the aliasName (e.g., "Consulting Engagement Report").
Constraint: Apply this alias ONLY to the presentation text, never altering the underlying JSON relationship references to maintain structural integrity.
CREATE an empty DocumentObject to hold the generated narrative sections.
RETURN the initialized DocumentObject for processing.
```

# Practice Reporting

## Component: Generating the Executive Summary and Strategic Introduction
Instructions:
This phase utilizes the ABT framework logic to extract high-level metadata and embedded micro-narratives, constructing the critical front matter of the business report.

Pseudo-Code Logic Block: Front Matter Construction
```
FUNCTION GenerateFrontMatter(Practice, DocumentObject)
COMMENT: Build the Introduction section first.
SET IntroText to the root Practice.description to provide a baseline functional overview.
FIND the Alpha where the name equals "Opportunity" or the focusName equals "Value".
IF the Alpha's narratives array contains a NarrativeType matching "Micro-Narratives (ABT)":
EXTRACT the Context string from narrativeContexts where seq = 1 (The "And" statement).
EXTRACT the Conflict string from narrativeContexts where seq = 2 (The "But" statement).
APPEND the Context and Conflict strings to the IntroText to establish the strategic hook.
ADD the completed IntroText to DocumentObject under the heading "Introduction".
COMMENT: Build the Executive Summary.
EXTRACT the Resolution string from narrativeContexts where seq = 3 (The "Therefore" statement).
SET ExecSummary to "Strategic Objective: " + Resolution.
FIND the terminal WorkProduct named "Pilot Summary Report".
FIND its LevelOfDetail object where the type equals "Applied / Behavioral".
APPEND "Success Verification Mechanism: " + LevelOfDetail.description to the ExecSummary to prove the endeavor is measurable.
ADD the ExecSummary to DocumentObject under the heading "Executive Summary", placing it at the very beginning of the final output.
```

## Component: Structuring Content via Areas of Concern
Instructions:
The engine loops through the SEMAT Essence categorizations, physically organizing the document so that diverse organizational personas can quickly locate the information relevant to their domain.

Pseudo-Code Logic Block: Thematic Categorization
```
FUNCTION GenerateAreasOfConcern(Practice, DocumentObject)
DEFINE a list of target FocusAreas:.
FOR EACH Focus in FocusAreas:
CREATE a new SubSection titled with the Focus name.
FIND ALL Alphas in the schema where Alpha.focusName equals the current Focus.
FOR EACH Alpha found:
EXTRACT the Alpha's name and description.
EXTRACT the Alpha's terminal state from its states array to indicate the final destination.
FORMAT the extracted data into narrative prose: "The [Alpha.name] concept focuses on [Alpha.description]. The target outcome for this entity is to reach a status."
APPEND this generated prose to the SubSection.
ADD the completed SubSection to the DocumentObject.
```

## Component: Lifecycle Orchestration and Execution Rendering (The STAR Loop)
Instructions:
This represents the core dynamic rendering engine. It iterates chronologically through the PatternViews, applying strict pruning rules, and formats tactical execution steps utilizing the STAR methodology to ensure actionable clarity.

Pseudo-Code Logic Block: The Lifecycle STAR Renderer
```
FUNCTION GenerateLifecycleNarrative(Practice, DocumentObject)
FIND the Pattern object where the narrativeTypeName equals "Lifecycle" (e.g., Global Pilot Lifecycle).
FOR EACH PatternView within the Pattern's patternViews array, ordered ascending by the seq integer:
APPLY PRUNING: Compare the Alpha states required in this PatternView against the previous PatternView.
REMOVE any Alpha states from memory that have not changed, preventing redundant text generation.
EXTRACT the PhaseName and PhaseContext from the PatternView's narrativeContexts array.
CREATE a new Chapter titled with the PhaseName.
APPEND the PhaseContext as the introductory paragraph for the Chapter.
FOR EACH ActivityRef listed in the PatternView's activities array:
FIND the corresponding Activity object in the Practice schema.
FIND the parent ActivitySpace via the Activity's activitySpaceName property.
COMMENT: Construct the STAR Framework Elements.
SET Situation = "Operating within the strategic bounds of " + ParentSpace.description.
SET Task = "The objective is to " + Activity.name + ", which involves " + Activity.description.
EXTRACT the PersonaGroup assigned to the Activity.
EXTRACT the Checklists required to complete the Activity.
SET Action = "The " + PersonaGroup + " will execute the necessary validation steps, specifically: " + Checklists.
EXTRACT the target Alpha state and generated WorkProducts.
SET Result = "Successful execution results in achieving the " + TargetState + " state, evidenced by the creation of the " + WorkProduct.name + "."
FORMAT Situation, Task, Action, and Result into a continuous, flowing narrative paragraph.
APPEND the formatted paragraph to the Chapter.
ADD the completed Chapter to the DocumentObject.
```

## Component: Synthesizing the Conclusion
Instructions:
The final subroutine gathers all terminal conditions from across the schema to form a cohesive, undeniable set of completion criteria.

Pseudo-Code Logic Block: State-Driven Conclusions
```
FUNCTION GenerateConclusion(Practice, DocumentObject)
SET ConclusionText to an introductory string defining the overall endeavor completion criteria.
FIND ALL Alphas whose ultimate states indicate completion (e.g., Benefit Accrued, Optimized, Retired).
FOR EACH TerminatedAlpha identified:
EXTRACT the specific operational Checklists attached to the TerminatedAlpha's final state.
APPEND narrative prose: "To definitively finalize the " + TerminatedAlpha.name + " workflow and close the endeavor, the organization must quantitatively validate that: " + Checklists.
ADD the completed ConclusionText to the DocumentObject under the heading "Conclusion and Next Steps".
RENDER the entire DocumentObject as a finalized Markdown or PDF file for executive distribution.
```