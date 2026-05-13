"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Content,
  ContentVariants,
  List,
  ListItem,
  Divider,
  Label,
} from "@patternfly/react-core";
import type { Method } from "@/lib/types";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  practiceElementDescriptionForDisplay,
  narrativeContextRowDisplayText,
} from "@/lib/ir";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { useLanguagePack } from "@/lib/languagePack";
import KanbanPatternBoardPF from "./KanbanPatternBoardPF";

/**
 * ProjectManagementView: A 4-part project planning report structure
 *
 * 1. Strategic Context & Business Case: Method identity and narratives
 * 2. Project Lifecycle & Phasing: Patterns and phases with target milestones
 * 3. Milestones & Deliverables: Alphas as milestone tracks, WorkProducts as artifacts
 * 4. Resourcing & Activity Backlog: Teams, roles, and task backlog
 */

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ========================================================================
// NARRATIVE RENDERING
// ========================================================================

function NarrativeBlock({ narrative }: { narrative: any }) {
  const narrativeName = String(narrative.narrativeName ?? narrative.name ?? "");
  const narrativeTypeName = String(narrative.narrativeTypeName ?? "");
  const description = practiceElementDescriptionForDisplay(narrative) ?? "";
  const contexts = Array.isArray(narrative.narrativeContexts) ? narrative.narrativeContexts : [];

  if (!narrativeName && !description && contexts.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: "1rem",
      marginBottom: "1rem",
      padding: "1rem",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
      borderLeft: "3px solid var(--pf-v6-global--palette--blue-200)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
    }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--pf-v6-global--primary-color--100)" }}>
        {narrativeName}{narrativeTypeName ? ` (${narrativeTypeName})` : ""}
      </div>
      {description && (
        <Content component={ContentVariants.p} style={{ marginBottom: contexts.length > 0 ? "0.75rem" : "0", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
          {description}
        </Content>
      )}
      {contexts.length > 0 && (
        <div style={{ fontSize: "0.875rem" }}>
          {contexts
            .slice()
            .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
            .map((ctx: any, idx: number) => {
              const elementName = String(ctx.narrativeElementName ?? "");
              const contextText = String(ctx.context ?? narrativeContextRowDisplayText(ctx) ?? "");
              return contextText ? (
                <div key={idx} style={{ marginBottom: idx < contexts.length - 1 ? "0.5rem" : "0" }}>
                  {elementName && <strong>{elementName}: </strong>}
                  {contextText}
                </div>
              ) : null;
            })}
        </div>
      )}
    </div>
  );
}

function renderNarratives(narratives: any[] | undefined) {
  if (!Array.isArray(narratives) || narratives.length === 0) {
    return null;
  }
  return (
    <>
      {narratives.map((narrative: any, idx: number) => (
        <NarrativeBlock key={idx} narrative={narrative} />
      ))}
    </>
  );
}

// ========================================================================
// CHECKLIST RENDERING
// ========================================================================

function renderChecklist(checklist: any[] | undefined, title: string = "Acceptance Criteria (Definition of Done)") {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return null;
  }

  const sorted = checklist.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0));

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
        {title}
      </div>
      <List isPlain>
        {sorted.map((item: any, idx: number) => {
          const itemName = String(item.name ?? "");
          const itemDesc = practiceElementDescriptionForDisplay(item) ?? "";
          const verificationMethod = String(item.verificationMethod ?? "").trim();
          return (
            <ListItem key={idx} style={{ marginBottom: "0.25rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <span style={{ color: "var(--pf-v6-global--primary-color--100)", marginRight: "0.5rem" }}>✓</span>
                <div>
                  <strong>{itemName}:</strong> {itemDesc}
                  {verificationMethod && <span style={{ color: "var(--pf-v6-global--Color--200)" }}> [Verify via: {verificationMethod}]</span>}
                </div>
              </div>
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}

// ========================================================================
// SECTION 1: Strategic Context & Business Case
// ========================================================================

function StrategicContext({ doc }: { doc: any }) {
  const name = String(doc.name ?? "Unnamed Method");
  const description = practiceElementDescriptionForDisplay(doc) ?? "";
  const narratives = Array.isArray(doc.narratives) ? doc.narratives : [];

  return (
    <section id="strategic-context" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="blue" isCompact>
          Part 1 of 4
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Strategic Context & Business Case
      </Title>

      <Card style={{ marginBottom: "2rem" }}>
        <CardBody>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "0.5rem" }}>
            Project Initiation: {name}
          </Title>
          <div style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
            <strong>Method Objective:</strong>
          </div>
          <Content component={ContentVariants.p} style={{ color: "var(--pf-v6-global--Color--100)" }}>
            {description || "No description provided."}
          </Content>
        </CardBody>
      </Card>

      {renderNarratives(narratives)}
    </section>
  );
}

// ========================================================================
// SECTION 2: Project Lifecycle & Phasing
// ========================================================================

function ProjectLifecycle({ doc, activities, baseline }: { doc: any; activities: any[]; baseline: any }) {
  const patterns = Array.isArray(doc.patterns) ? doc.patterns : [];

  if (patterns.length === 0) {
    return null;
  }

  // Sort patterns: lifecycle first, then by patternViews count descending
  const sortedPatterns = patterns.slice().sort((a: any, b: any) => {
    const aIsLifecycle = a.type === "lifecycle" || a.category === "lifecycle" ||
      String(a.name ?? "").toLowerCase().includes("lifecycle");
    const bIsLifecycle = b.type === "lifecycle" || b.category === "lifecycle" ||
      String(b.name ?? "").toLowerCase().includes("lifecycle");
    if (aIsLifecycle && !bIsLifecycle) return -1;
    if (!aIsLifecycle && bIsLifecycle) return 1;
    const aCount = Array.isArray(a.patternViews) ? a.patternViews.length : 0;
    const bCount = Array.isArray(b.patternViews) ? b.patternViews.length : 0;
    return bCount - aCount;
  });

  return (
    <section id="project-lifecycle" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="purple" isCompact>
          Part 2 of 4
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Project Lifecycle & Phasing
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Chronological macro-phases (Sprints or Release Trains) defining the project timeline.
      </Content>

      {sortedPatterns.map((pattern: any, idx: number) => (
        <PatternCard key={idx} pattern={pattern} activities={activities} baseline={baseline} />
      ))}
    </section>
  );
}

function PatternCard({ pattern, activities, baseline }: { pattern: any; activities: any[]; baseline: any }) {
  const name = String(pattern.name ?? "Pattern");
  const description = practiceElementDescriptionForDisplay(pattern) ?? "";
  const patternViews = Array.isArray(pattern.patternViews)
    ? pattern.patternViews.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  return (
    <Card style={{ marginBottom: "2rem" }}>
      <CardBody>
        <Title headingLevel="h3" size="xl" style={{ marginBottom: "0.5rem" }}>
          Lifecycle Model: {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        {patternViews.length > 0 && baseline && (
          <div style={{ marginTop: "1.5rem" }}>
            <KanbanPatternBoardPF pattern={pattern} baseline={baseline} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PhaseCard({ view, activities }: { view: any; activities: any[] }) {
  const name = String(view.name ?? "Phase");
  const description = practiceElementDescriptionForDisplay(view) ?? "";
  const narratives = view.narratives;
  const alphaStates = Array.isArray(view.alphaStates) ? view.alphaStates : [];

  return (
    <div style={{
      padding: "1rem",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      borderLeft: "4px solid var(--pf-v6-global--primary-color--100)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}>
      <Title headingLevel="h4" size="md" style={{ marginBottom: "0.5rem" }}>
        Phase: {name}
      </Title>
      {description && (
        <Content component={ContentVariants.p} style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
          {description}
        </Content>
      )}

      {renderNarratives(narratives)}

      {alphaStates.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>
            Target Milestones for this Phase:
          </div>
          <List isPlain>
            {alphaStates.map((state: any, idx: number) => {
              const alphaName = String(state.alphaName ?? "");
              const stateName = String(state.stateName ?? "");

              // Find activities that contribute to this alpha state
              const contributingActivities = activities.filter((activity: any) => {
                const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
                return contributesTo.some((contrib: any) => {
                  const contribAlphaName = String(contrib.alphaName ?? "");
                  const contribStateName = String(contrib.stateName ?? "");
                  return contribAlphaName === alphaName && contribStateName === stateName;
                });
              });

              return (
                <ListItem key={idx} style={{ marginBottom: "1rem" }}>
                  <a
                    href={`#milestone-${slug(alphaName)}`}
                    style={{ textDecoration: "none", color: "var(--pf-v6-global--link--Color)", fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    → Advance '{alphaName}' to State: [{stateName}]
                  </a>
                  {contributingActivities.length > 0 && (
                    <div style={{ marginTop: "0.5rem", marginLeft: "1.25rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--200)" }}>
                        Suggested Approaches:
                      </div>
                      <List isPlain>
                        {contributingActivities.map((activity: any, actIdx: number) => {
                          const activityName = String(activity.name ?? "");
                          return (
                            <ListItem key={actIdx} style={{ fontSize: "0.75rem", marginBottom: "0.125rem" }}>
                              <a
                                href={`#activity-${slug(activityName)}`}
                                style={{ textDecoration: "none", color: "var(--pf-v6-global--link--Color)" }}
                              >
                                • {activityName}
                              </a>
                            </ListItem>
                          );
                        })}
                      </List>
                    </div>
                  )}
                </ListItem>
              );
            })}
          </List>
        </div>
      )}
    </div>
  );
}

// ========================================================================
// SECTION 3: Milestones & Deliverables Backlog
// ========================================================================

function MilestonesAndDeliverables({ doc }: { doc: any }) {
  const alphas = Array.isArray(doc.alphas) ? doc.alphas : [];
  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];

  if (alphas.length === 0 && workProducts.length === 0) {
    return null;
  }

  return (
    <section id="milestones-deliverables" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="orange" isCompact>
          Part 3 of 4
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Milestones & Deliverables Backlog
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        State-driven goals (Definition of Done) and the artifact backlog.
      </Content>

      {alphas.length > 0 && (
        <>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1rem" }}>
            Tracked Milestones (Alphas)
          </Title>
          {alphas.map((alpha: any, idx: number) => (
            <AlphaMilestoneCard key={idx} alpha={alpha} />
          ))}
        </>
      )}

      {workProducts.length > 0 && (
        <>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1rem", marginTop: "3rem" }}>
            Required Deliverables (Work Products)
          </Title>
          {workProducts.map((wp: any, idx: number) => (
            <WorkProductCard key={idx} workProduct={wp} />
          ))}
        </>
      )}
    </section>
  );
}

function AlphaMilestoneCard({ alpha }: { alpha: any }) {
  const name = String(alpha.name ?? "");
  const focusName = String(alpha.focusName ?? "");
  const description = practiceElementDescriptionForDisplay(alpha) ?? "";
  const states = Array.isArray(alpha.states)
    ? alpha.states.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  return (
    <Card id={`milestone-${slug(name)}`} style={{ marginBottom: "1.5rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="lg" style={{ marginBottom: "0.5rem" }}>
          Milestone Track: {name}
        </Title>
        {focusName && (
          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
            Focus: {focusName}
          </div>
        )}
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        {states.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {states.map((state: any, idx: number) => (
              <StateTargetCard key={idx} state={state} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StateTargetCard({ state }: { state: any }) {
  const name = String(state.name ?? "");
  const description = practiceElementDescriptionForDisplay(state) ?? "";
  const checklist = state.checklist;

  return (
    <div style={{
      padding: "0.75rem",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
    }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
        State Target: {name}
      </div>
      {description && (
        <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
          {description}
        </Content>
      )}
      {renderChecklist(checklist)}
    </div>
  );
}

function WorkProductCard({ workProduct }: { workProduct: any }) {
  const name = String(workProduct.name ?? "");
  const description = practiceElementDescriptionForDisplay(workProduct) ?? "";
  const levelsOfDetail = Array.isArray(workProduct.levelsOfDetail)
    ? workProduct.levelsOfDetail.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  return (
    <Card id={`artifact-${slug(name)}`} style={{ marginBottom: "1.5rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="lg" style={{ marginBottom: "0.5rem" }}>
          Artifact: {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        {levelsOfDetail.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {levelsOfDetail.map((lod: any, idx: number) => (
              <LevelOfDetailCard key={idx} lod={lod} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function LevelOfDetailCard({ lod }: { lod: any }) {
  const name = String(lod.name ?? "");
  const description = practiceElementDescriptionForDisplay(lod) ?? "";
  const checklist = lod.checklist;

  return (
    <div style={{
      padding: "0.75rem",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
    }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
        Required Detail Level: {name}
      </div>
      {description && (
        <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
          {description}
        </Content>
      )}
      {renderChecklist(checklist, "Validation Checklist")}
    </div>
  );
}

// ========================================================================
// SECTION 4: Resourcing & Activity Backlog
// ========================================================================

function ResourcingAndActivities({ doc }: { doc: any }) {
  const personaGroups = Array.isArray(doc.personaGroups) ? doc.personaGroups : [];
  const personas = Array.isArray(doc.personas) ? doc.personas : [];
  const activities = Array.isArray(doc.activities) ? doc.activities : [];

  if (personaGroups.length === 0 && personas.length === 0 && activities.length === 0) {
    return null;
  }

  return (
    <section id="resourcing-activities" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="teal" isCompact>
          Part 4 of 4
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Resourcing & Activity Backlog
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Cross-functional teams, required roles, and specific operational workflows.
      </Content>

      {personaGroups.length > 0 && (
        <>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1rem" }}>
            Required Project Teams (Persona Groups)
          </Title>
          {personaGroups.map((group: any, idx: number) => (
            <PersonaGroupCard key={idx} group={group} />
          ))}
        </>
      )}

      {personas.length > 0 && (
        <>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1rem", marginTop: "3rem" }}>
            Required Roles (Personas)
          </Title>
          {personas.map((persona: any, idx: number) => (
            <PersonaCard key={idx} persona={persona} />
          ))}
        </>
      )}

      {activities.length > 0 && (
        <>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1rem", marginTop: "3rem" }}>
            Operational Activities (Task Backlog)
          </Title>
          {activities.map((activity: any, idx: number) => (
            <ActivityCard key={idx} activity={activity} />
          ))}
        </>
      )}
    </section>
  );
}

function PersonaGroupCard({ group }: { group: any }) {
  const name = String(group.name ?? "");
  const description = practiceElementDescriptionForDisplay(group) ?? "";
  const personaNames = Array.isArray(group.personaNames) ? group.personaNames : [];

  return (
    <Card id={`team-${slug(name)}`} isCompact style={{ marginBottom: "1rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="md" style={{ marginBottom: "0.5rem" }}>
          Team: {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        {personaNames.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--200)" }}>
              Roles Included:
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              {personaNames.map((pname: any) => String(pname ?? "")).join(", ")}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PersonaCard({ persona }: { persona: any }) {
  const name = String(persona.name ?? "");
  const description = practiceElementDescriptionForDisplay(persona) ?? "";
  const competencies = Array.isArray(persona.competencies) ? persona.competencies : [];

  return (
    <Card id={`role-${slug(name)}`} isCompact style={{ marginBottom: "1rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="md" style={{ marginBottom: "0.5rem" }}>
          Role: {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        {competencies.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>
              Required Competencies:
            </div>
            <List isPlain>
              {competencies.map((comp: any, idx: number) => {
                const compName = String(comp.competencyName ?? "");
                const levelName = String(comp.competencyLevelName ?? "");
                return (
                  <ListItem key={idx} style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    → {compName}: {levelName}
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: any }) {
  const name = String(activity.name ?? "");
  const spaceName = String(activity.activitySpaceName ?? "");
  const description = practiceElementDescriptionForDisplay(activity) ?? "";
  const involves = Array.isArray(activity.involves) ? activity.involves : [];
  const worksOn = Array.isArray(activity.worksOn) ? activity.worksOn : [];
  const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

  return (
    <Card id={`task-${slug(name)}`} isCompact style={{ marginBottom: "1rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="md" style={{ marginBottom: "0.5rem" }}>
          Task: {name}
        </Title>
        {spaceName && (
          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
            Space: {spaceName}
          </div>
        )}
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        {involves.length > 0 && (
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)" }}>
              Assigned To:
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              {involves.map((pg: any) => String(pg ?? "")).join(", ")}
            </div>
          </div>
        )}

        {worksOn.length > 0 && (
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--200)" }}>
              Produces/Updates:
            </div>
            <List isPlain>
              {worksOn.map((target: any, idx: number) => {
                const wpName = String(target.workProductName ?? "");
                const lodName = String(target.levelOfDetailName ?? "");
                return (
                  <ListItem key={idx} style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <a
                      href={`#artifact-${slug(wpName)}`}
                      style={{ textDecoration: "none", color: "var(--pf-v6-global--link--Color)" }}
                    >
                      → {wpName} (Target Level: {lodName})
                    </a>
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}

        {contributesTo.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--200)" }}>
              Advances Milestone:
            </div>
            <List isPlain>
              {contributesTo.map((outcome: any, idx: number) => {
                const alphaName = String(outcome.alphaName ?? "");
                const stateName = String(outcome.stateName ?? "");
                return (
                  <ListItem key={idx} style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <a
                      href={`#milestone-${slug(alphaName)}`}
                      style={{ textDecoration: "none", color: "var(--pf-v6-global--link--Color)" }}
                    >
                      → {alphaName} {"→"} [{stateName}]
                    </a>
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ========================================================================
// NAVIGATION SIDEBAR
// ========================================================================

function NavigationSidebar() {
  const navItems = [
    { id: "strategic-context", label: "1. Strategic Context & Business Case" },
    { id: "project-lifecycle", label: "2. Project Lifecycle & Phasing" },
    { id: "milestones-deliverables", label: "3. Milestones & Deliverables" },
    { id: "resourcing-activities", label: "4. Resourcing & Activities" },
  ];

  const navItemStyle: CSSProperties = {
    display: "block",
    padding: "0.75rem 1rem",
    color: "var(--pf-v6-global--Color--100)",
    textDecoration: "none",
    borderLeft: "3px solid transparent",
    fontSize: "0.875rem",
    marginBottom: "0.25rem",
    transition: "all 0.2s ease",
  };

  return (
    <nav style={{
      width: 280,
      flexShrink: 0,
      borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
      padding: "2rem 0",
      position: "sticky",
      top: 0,
      alignSelf: "flex-start",
      height: "100vh",
      overflowY: "auto",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}>
      <div style={{ padding: "0 1.5rem", marginBottom: "1.5rem" }}>
        <Title headingLevel="h3" size="md" style={{ textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
          Contents
        </Title>
      </div>
      {navItems.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          style={navItemStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderLeftColor = "transparent";
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

// ========================================================================
// MAIN COMPONENT
// ========================================================================

export function ProjectManagementView({
  doc,
  embed = false,
}: {
  doc: unknown;
  embed?: boolean;
}) {
  const { t } = useLanguagePack();
  const shouldResolveLibrary = useMemo(() => practiceNeedsLibraryResolution(doc), [doc]);
  const { loading: resolveBusy, resolved: libraryResolved } = usePracticeLibraryResolveForRender(doc, shouldResolveLibrary);

  const effectiveDoc = shouldResolveLibrary ? (libraryResolved ?? doc) : doc;
  const baseline = useMemo(() => (effectiveDoc ? asBaselineDocument(effectiveDoc) : null), [effectiveDoc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !effectiveDoc) return null;
    const withActivities = baselineWithPracticeActivities(effectiveDoc, baseline);
    return enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
  }, [baseline, effectiveDoc]);

  if (shouldResolveLibrary && resolveBusy) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--pf-v6-global--Color--200)" }}>
        Merging baseline and dependencies from the library…
      </div>
    );
  }

  if (!baselineForRender || !baseline) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--pf-v6-global--Color--200)" }}>
        {t.nothingToRender}
      </div>
    );
  }

  const sourceDocRecord = effectiveDoc && typeof effectiveDoc === "object" ? (effectiveDoc as Record<string, unknown>) : {};
  const activities = Array.isArray((baselineForRender as any)?.activities) ? (baselineForRender as any).activities : [];

  return (
    <div style={{
      display: "flex",
      fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
      minHeight: embed ? undefined : "100vh",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}>
      {!embed && <NavigationSidebar />}

      <main style={{
        flex: 1,
        padding: embed ? "1.5rem" : "3rem 4rem",
        maxWidth: embed ? "none" : "1400px",
        minWidth: 0,
      }}>
        <StrategicContext doc={baselineForRender} />
        <Divider style={{ margin: "3rem 0" }} />

        <ProjectLifecycle doc={sourceDocRecord} activities={activities} baseline={baselineForRender} />
        <Divider style={{ margin: "3rem 0" }} />

        <MilestonesAndDeliverables doc={baselineForRender} />
        <Divider style={{ margin: "3rem 0" }} />

        <ResourcingAndActivities doc={baselineForRender} />
      </main>
    </div>
  );
}
