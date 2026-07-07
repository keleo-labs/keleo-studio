"use client";

import { useMemo, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  PageSection,
  PageSectionVariants,
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
  groupByFocus,
  practiceElementDescriptionForDisplay,
  narrativeContextRowDisplayText,
} from "@/lib/ir";
import { formatAPA7Citation, getCitationsForNarrative, formatInTextCitation } from "@/lib/display/citations";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { useLanguagePack } from "@/lib/display/languagePack";
import { useAlphaScores } from "@/hooks/useAlphaScores";
import {
  buildPracticeElementAliasLookup,
  getAliasedDisplay,
  type PracticeElementAliasLookup,
} from "@/lib/display/elementDisplay";
import KanbanPatternBoardPF from "../visualizations/patterns/KanbanPatternBoardPatternFly";
import { PracticeRadarChart } from "../visualizations/charts/PracticeRadarChart";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import type { Asset } from "@/lib/types";

/**
 * BrowseView: A 6-part methodology documentation structure following outline.md
 *
 * 1. Executive Context: Method identity and root narratives
 * 2. Method Focus: Where guidance is focused and what is not progressed
 * 3. Lifecycle Orchestration (Patterns): Temporal phases
 * 4. Core Concepts & Progression (Alphas): Areas of concern and maturity states
 * 5. Evidentiary Artifacts (Work Products): Physical deliverables
 * 6. Execution & Roles (Activities & Personas): Workflows and competencies
 */

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ========================================================================
// OUTLINE: Quick Navigation
// ========================================================================

function OutlineSection({ doc, grouped, aliasMap }: { doc: any; grouped: any[]; aliasMap: PracticeElementAliasLookup }) {
  const patterns = Array.isArray(doc.patterns) ? doc.patterns : [];
  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];
  const personas = Array.isArray(doc.personas) ? doc.personas : [];
  const personaGroups = Array.isArray(doc.personaGroups) ? doc.personaGroups : [];

  // Sort patterns same as LifecycleOrchestration section
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

  const hasPatterns = patterns.length > 0;
  const hasAlphas = grouped.some((g: any) => g.alphas?.length > 0);
  const hasWorkProducts = workProducts.length > 0;
  const hasActivities = grouped.some((g: any) => g.activitySpaces?.length > 0);
  const hasPeople = personas.length > 0 || personaGroups.length > 0;

  return (
    <section id="outline" style={{ marginBottom: "4rem" }}>
      <Title headingLevel="h2" size="2xl" style={{ marginBottom: "1.5rem" }}>
        Report Outline
      </Title>

      <Card>
        <CardBody>
          <List>
            <ListItem>
              <a
                href="#executive-context"
                style={{
                  color: "var(--pf-v6-global--primary-color--100)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                }}
              >
                1. Executive Context
              </a>
              <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                Method identity and strategic narratives
              </div>
            </ListItem>

            {hasAlphas && (
              <ListItem style={{ marginTop: "1rem" }}>
                <a
                  href="#method-focus"
                  style={{
                    color: "var(--pf-v6-global--primary-color--100)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  2. Method Focus
                </a>
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                  Where this practice/method focuses its guidance
                </div>
              </ListItem>
            )}

            {hasPatterns && (
              <ListItem style={{ marginTop: "1rem" }}>
                <a
                  href="#lifecycle-orchestration"
                  style={{
                    color: "var(--pf-v6-global--primary-color--100)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  3. Lifecycle Orchestration
                </a>
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                  Temporal phases and chronological roadmap
                </div>
                {sortedPatterns.length > 0 && (
                  <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                    {sortedPatterns.map((pattern: any, idx: number) => {
                      const patternName = String(pattern.name ?? "Pattern");
                      const patternSlug = slug(patternName);
                      return (
                        <div key={idx} style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          <a
                            href={`#pattern-${patternSlug}`}
                            style={{
                              color: "var(--pf-v6-global--link--Color)",
                              textDecoration: "none",
                            }}
                          >
                            → {patternName}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ListItem>
            )}

            {hasAlphas && (
              <ListItem style={{ marginTop: "1rem" }}>
                <a
                  href="#core-concepts"
                  style={{
                    color: "var(--pf-v6-global--primary-color--100)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  4. Core Concepts & Progression
                </a>
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                  Areas of concern and sequential states
                </div>
                {grouped.map((focus: any, idx: number) => {
                  const focusName = String(focus.focusName ?? "");
                  const alphas = focus.alphas ?? [];
                  if (alphas.length === 0) return null;

                  const focusSlug = slug(focusName);
                  return (
                    <div key={idx} style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                      <a
                        href={`#focus-${focusSlug}`}
                        style={{
                          color: "var(--pf-v6-global--link--Color)",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        → {focusName}
                      </a>
                      <div style={{ marginLeft: "1rem", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                        {alphas.length} alpha{alphas.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </ListItem>
            )}

            {hasWorkProducts && (
              <ListItem style={{ marginTop: "1rem" }}>
                <a
                  href="#evidentiary-artifacts"
                  style={{
                    color: "var(--pf-v6-global--primary-color--100)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  5. Evidentiary Artifacts
                </a>
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                  Physical deliverables ({workProducts.length} work product{workProducts.length !== 1 ? "s" : ""})
                </div>
              </ListItem>
            )}

            {(hasActivities || hasPeople) && (
              <ListItem style={{ marginTop: "1rem" }}>
                <a
                  href="#execution-roles"
                  style={{
                    color: "var(--pf-v6-global--primary-color--100)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  6. Execution & Roles
                </a>
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                  Workflows, competencies, and people
                </div>
                {grouped.map((focus: any, idx: number) => {
                  const focusName = String(focus.focusName ?? "");
                  const activitySpaces = focus.activitySpaces ?? [];
                  if (activitySpaces.length === 0) return null;

                  const focusSlug = slug(focusName);
                  return (
                    <div key={idx} style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                      <a
                        href={`#activities-${focusSlug}`}
                        style={{
                          color: "var(--pf-v6-global--link--Color)",
                          textDecoration: "none",
                          fontSize: "0.875rem",
                        }}
                      >
                        → {focusName} Activities
                      </a>
                    </div>
                  );
                })}
                {hasPeople && (
                  <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                    <a
                      href="#personas-section"
                      style={{
                        color: "var(--pf-v6-global--link--Color)",
                        textDecoration: "none",
                      }}
                    >
                      → Personas & Groups
                    </a>
                  </div>
                )}
              </ListItem>
            )}
          </List>
        </CardBody>
      </Card>
    </section>
  );
}

// ========================================================================
// ELEMENT NAME WITH ALIAS FORMATTING
// ========================================================================

/**
 * Component to display an element name with its alias.
 * If an alias exists, shows: "Alias Name (Original Name)" with original in italics and smaller
 */
function ElementNameWithAlias({
  aliasMap,
  elementType,
  name,
  style,
}: {
  aliasMap: PracticeElementAliasLookup;
  elementType: string;
  name: string;
  style?: CSSProperties;
}) {
  const { primary, showCanonical, canonical } = getAliasedDisplay(aliasMap, elementType, name);

  if (showCanonical) {
    return (
      <span style={style}>
        {primary}{" "}
        <span style={{ fontStyle: "italic", fontSize: "0.85em", fontWeight: 400 }}>
          ({canonical})
        </span>
      </span>
    );
  }

  return <span style={style}>{primary}</span>;
}

// ========================================================================

// ========================================================================
// SECTION 1: Executive Context
// ========================================================================

function ExecutiveContext({ doc, methodComposition, aliasMap }: { doc: any; methodComposition?: Method | null; aliasMap: PracticeElementAliasLookup }) {
  const name = String(doc.name ?? "Unnamed Practice");
  const description = practiceElementDescriptionForDisplay(doc) ?? "";
  const version = String(doc.version ?? "—");
  const authors = Array.isArray(doc.authors)
    ? doc.authors.map((a: unknown) => String(a ?? "").trim()).filter(Boolean).join(", ")
    : "—";
  const updatedAt = String(doc.updatedAt ?? "—");

  // Root narratives
  const narratives = Array.isArray(doc.narratives) ? doc.narratives : [];

  // Citations
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  // Get practices from method composition
  const practices = methodComposition?.practices ?? [];

  return (
    <section id="executive-context" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="blue" isCompact>
          Part 1 of 6
        </Label>
      </div>

      <Title headingLevel="h1" size="4xl" style={{ marginBottom: "1rem" }}>
        {name}
      </Title>

      <div style={{ marginBottom: "2rem" }}>
        <Content component={ContentVariants.p} style={{ fontSize: "1.125rem", color: "var(--pf-v6-global--Color--200)" }}>
          {description || "No description provided."}
        </Content>
      </div>

      <Card isCompact style={{ marginBottom: "2rem" }}>
        <CardBody>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Version
              </div>
              <div style={{ fontWeight: 600 }}>{version}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Authors
              </div>
              <div style={{ fontWeight: 600 }}>{authors}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Updated
              </div>
              <div style={{ fontWeight: 600 }}>{updatedAt}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {narratives.length > 0 && (
        <>
          <Title headingLevel="h2" size="xl" style={{ marginTop: "3rem", marginBottom: "1rem" }}>
            Strategic Context
          </Title>
          <NarrativesSection narratives={narratives} compact={false} allCitations={citations} />
        </>
      )}

      {citations.length > 0 && (
        <CitationsSection citations={citations} compact={false} />
      )}

      {practices.length > 0 && (
        <>
          <Title headingLevel="h2" size="xl" style={{ marginTop: "3rem", marginBottom: "1rem" }}>
            Included Practices
          </Title>
          <Content component={ContentVariants.p} style={{ marginBottom: "1.5rem", color: "var(--pf-v6-global--Color--200)" }}>
            This {methodComposition ? "method" : "composition"} combines the following practices:
          </Content>
          {practices.map((practice: any, idx: number) => {
            const practiceName = String(practice.name ?? "Unnamed Practice");
            const practiceDescription = practiceElementDescriptionForDisplay(practice) ?? "";
            const practiceNarratives = Array.isArray(practice.narratives) ? practice.narratives : [];

            return (
              <Card key={idx} style={{ marginBottom: "1.5rem" }}>
                <CardBody>
                  <Title headingLevel="h3" size="lg" style={{ marginBottom: "0.5rem" }}>
                    {practiceName}
                  </Title>
                  {practiceDescription && (
                    <Content component={ContentVariants.p} style={{ marginBottom: practiceNarratives.length > 0 ? "1rem" : "0", color: "var(--pf-v6-global--Color--200)" }}>
                      {practiceDescription}
                    </Content>
                  )}
                  {practiceNarratives.length > 0 && (
                    <NarrativesSection narratives={practiceNarratives} compact={true} allCitations={citations} />
                  )}
                </CardBody>
              </Card>
            );
          })}
        </>
      )}
    </section>
  );
}

function NarrativeBlock({ narrative, compact = false, allCitations = [] }: { narrative: any; compact?: boolean; allCitations?: any[] }) {
  const narrativeName = String(narrative.name ?? "");
  const description = practiceElementDescriptionForDisplay(narrative) ?? "";
  const contexts = Array.isArray(narrative.narrativeContexts) ? narrative.narrativeContexts : [];

  // Get citations for this narrative
  const narrativeCitations = getCitationsForNarrative(narrative, allCitations);
  const hasCitations = narrativeCitations.length > 0;

  if (!narrativeName && !description && contexts.length === 0 && !hasCitations) {
    return null;
  }

  if (compact) {
    // Compact inline display for narratives within other elements
    return (
      <div style={{
        marginTop: "1rem",
        padding: "1rem",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
        borderLeft: "3px solid var(--pf-v6-global--palette--blue-200)",
        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      }}>
        {narrativeName && (
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--pf-v6-global--primary-color--100)" }}>
            {narrativeName}
          </div>
        )}
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: contexts.length > 0 || hasCitations ? "0.75rem" : "0", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        {contexts.length > 0 && (
          <div style={{ fontSize: "0.875rem", marginBottom: hasCitations ? "0.75rem" : "0" }}>
            {contexts
              .slice()
              .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
              .map((ctx: any, idx: number) => {
                const text = narrativeContextRowDisplayText(ctx);
                return text ? (
                  <div key={idx} style={{ display: "flex", marginBottom: idx < contexts.length - 1 ? "0.5rem" : "0" }}>
                    <div style={{
                      minWidth: "1.5rem",
                      height: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "var(--pf-v6-global--primary-color--100)",
                      color: "white",
                      borderRadius: "50%",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      marginRight: "0.5rem",
                      flexShrink: 0,
                    }}>
                      {(ctx.seq ?? idx + 1)}
                    </div>
                    <div style={{ flex: 1 }}>{text}</div>
                  </div>
                ) : null;
              })}
          </div>
        )}
        {hasCitations && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Further Reading
            </div>
            <List style={{ fontSize: "0.75rem" }}>
              {narrativeCitations.map((citation: any, idx: number) => {
                const citationName = String(citation.name ?? "");
                const citationUrl = citation.url;
                const inTextCitation = formatInTextCitation(citation);
                return (
                  <ListItem key={idx} style={{ marginBottom: "0.25rem" }}>
                    <a
                      href={citationUrl || `#citation-${slug(citationName)}`}
                      target={citationUrl ? "_blank" : undefined}
                      rel={citationUrl ? "noopener noreferrer" : undefined}
                      style={{
                        color: "var(--pf-v6-global--link--Color)",
                        textDecoration: "none",
                      }}
                    >
                      {citationName}
                      {citationUrl && (
                        <span style={{ marginLeft: "0.25rem", fontSize: "0.7em", verticalAlign: "super" }}>↗</span>
                      )}
                    </a>
                    {inTextCitation && <span style={{ marginLeft: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>{inTextCitation}</span>}
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}
      </div>
    );
  }

  // Full card display for top-level narratives
  return (
    <Card style={{ marginBottom: "1.5rem" }}>
      <CardBody>
        <Title headingLevel="h3" size="lg" style={{ marginBottom: "0.5rem" }}>
          {narrativeName}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        {contexts.length > 0 && (
          <List isPlain style={{ marginBottom: hasCitations ? "1rem" : "0" }}>
            {contexts
              .slice()
              .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
              .map((ctx: any, idx: number) => {
                const text = narrativeContextRowDisplayText(ctx);
                return text ? (
                  <ListItem key={idx}>
                    <div style={{ display: "flex", marginBottom: "0.75rem" }}>
                      <div style={{
                        minWidth: "2rem",
                        height: "1.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "var(--pf-v6-global--primary-color--100)",
                        color: "white",
                        borderRadius: "50%",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        marginRight: "0.75rem",
                        flexShrink: 0,
                      }}>
                        {(ctx.seq ?? idx + 1)}
                      </div>
                      <Content component={ContentVariants.p}>{text}</Content>
                    </div>
                  </ListItem>
                ) : null;
              })}
          </List>
        )}
        {hasCitations && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Further Reading
            </div>
            <List>
              {narrativeCitations.map((citation: any, idx: number) => {
                const citationName = String(citation.name ?? "");
                const citationUrl = citation.url;
                const inTextCitation = formatInTextCitation(citation);
                return (
                  <ListItem key={idx} style={{ marginBottom: "0.25rem" }}>
                    <a
                      href={citationUrl || `#citation-${slug(citationName)}`}
                      target={citationUrl ? "_blank" : undefined}
                      rel={citationUrl ? "noopener noreferrer" : undefined}
                      style={{
                        color: "var(--pf-v6-global--link--Color)",
                        textDecoration: "underline",
                      }}
                    >
                      {citationName}
                      {citationUrl && (
                        <span style={{ marginLeft: "0.25rem", fontSize: "0.7em", verticalAlign: "super" }}>↗</span>
                      )}
                    </a>
                    {inTextCitation && <span style={{ marginLeft: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>{inTextCitation}</span>}
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

// Reusable component to render narratives array
function NarrativesSection({ narratives, compact = false, allCitations = [] }: { narratives: any[] | undefined; compact?: boolean; allCitations?: any[] }) {
  if (!Array.isArray(narratives) || narratives.length === 0) {
    return null;
  }

  return (
    <>
      {narratives.map((narrative: any, idx: number) => (
        <NarrativeBlock key={idx} narrative={narrative} compact={compact} allCitations={allCitations} />
      ))}
    </>
  );
}

// Reusable component to render citations array
function CitationsSection({ citations, compact = false }: { citations: any[] | undefined; compact?: boolean }) {
  if (!Array.isArray(citations) || citations.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: "1.5rem",
      padding: compact ? "1rem" : "1.5rem",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
      borderLeft: "3px solid var(--pf-v6-global--palette--blue-300)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
    }}>
      <Title headingLevel="h4" size={compact ? "md" : "lg"} style={{ marginBottom: "1rem" }}>
        References
      </Title>
      <List style={{ fontSize: compact ? "0.75rem" : "0.875rem" }}>
        {citations.map((citation: any, idx: number) => {
          const citationName = String(citation.name ?? "");
          return (
            <ListItem
              key={idx}
              id={`citation-${slug(citationName)}`}
              style={{
                marginBottom: idx < citations.length - 1 ? "0.5rem" : "0",
                lineHeight: "1.6",
                scrollMarginTop: "2rem",
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: formatAPA7Citation(citation) }} />
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}

// ========================================================================
// SECTION 2: Method Focus
// ========================================================================

function MethodFocus({ doc, baseline, grouped, methodComposition, aliasMap, assets, alphaScores: alphasByFocus }: { doc: any; baseline: any; grouped: any[]; methodComposition?: Method | null; aliasMap: PracticeElementAliasLookup; assets: Asset[]; alphaScores?: Map<string, any> | null }) {
  // Alpha scores are now passed from parent (pre-computed server-side)
  const scores = alphasByFocus || new Map();

  if (scores.size === 0) {
    return null;
  }

  // Helper functions for tile visualization
  const getColorStyle = (score: number): CSSProperties => {
    if (score === 0) {
      // No coverage - greyed out with high contrast
      return {
        backgroundColor: "#F5F5F5",
        borderColor: "#D2D2D2",
        color: "#8C8C8C",
        opacity: 0.6,
      };
    } else if (score <= 2) {
      // Light coverage - light blue
      return {
        backgroundColor: "#E7F1FA",
        borderColor: "#73BCF7",
        color: "#004368",
      };
    } else if (score <= 5) {
      // Medium coverage - medium blue
      return {
        backgroundColor: "#BEE1F4",
        borderColor: "#2B9AF3",
        color: "#002952",
      };
    } else {
      // Strong coverage - strong blue with white text
      return {
        backgroundColor: "#73BCF7",
        borderColor: "#06C",
        color: "#FFFFFF",
      };
    }
  };


  return (
    <section id="method-focus" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="green" isCompact>
          Part 2 of 6
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Method Focus
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Where this {methodComposition ? "method" : "practice"} focuses its guidance and which areas it does not address.
      </Content>

      {/* Radar Chart Visualization */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "3rem" }}>
        <PracticeRadarChart
          alphasByFocus={scores}
          size="medium"
          fixedMaxScore={20}
        />
      </div>

      {/* Tile-based Coverage Overview */}
      <Card style={{ marginBottom: "3rem" }}>
        <CardBody>
          {Array.from(scores.entries()).map(([focusName, { focusObj, alphas }], idx) => {
            const focusDescription = focusObj ? (practiceElementDescriptionForDisplay(focusObj) ?? "") : "";
            return (
            <div key={idx} style={{ marginBottom: idx < scores.size - 1 ? "2.5rem" : "0" }}>
              <div style={{
                color: "var(--pf-v6-global--Color--100)",
                marginBottom: "0.75rem",
                lineHeight: "1.4"
              }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{focusName}:</span>
                {focusDescription && <span style={{ fontSize: "0.75rem", fontWeight: 400, fontStyle: "italic" }}> {focusDescription}</span>}
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "1rem"
              }}>
                {alphas.map(({ alpha, score, newAlphas }, alphaIdx) => {
                  const alphaName = String(alpha.name ?? "");
                  const description = practiceElementDescriptionForDisplay(alpha) ?? "";
                  const colorStyle = getColorStyle(score);
                  const hasNewAlphas = (newAlphas?.length ?? 0) > 0;

                  // Get icon for this alpha
                  const iconRef = alpha.assetNames?.find((ref: any) => ref.type === "icon");
                  const iconAsset = iconRef ? findAsset(iconRef.assetName, assets) : null;

                  return (
                    <div key={alphaIdx} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {/* Main baseline alpha tile */}
                      <a
                        href={`#alpha-${slug(alphaName)}`}
                        title={`Baseline Alpha: ${alphaName}\n${description || 'No description'}\nScore: ${score}${hasNewAlphas ? `\n+ ${newAlphas?.length ?? 0} contributing alpha(s)` : ''}`}
                        style={{
                          backgroundColor: colorStyle.backgroundColor,
                          color: colorStyle.color,
                          opacity: colorStyle.opacity,
                          borderWidth: "3px",
                          borderStyle: "solid",
                          borderColor: colorStyle.borderColor,
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          minHeight: "90px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          textDecoration: "none",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {/* Baseline indicator badge */}
                        <div style={{
                          position: "absolute",
                          top: "4px",
                          left: "4px",
                          backgroundColor: "#F0AB00",
                          color: "white",
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "3px",
                          lineHeight: 1,
                          zIndex: 1,
                        }}>
                          BASE
                        </div>

                        {/* Icon above name */}
                        {iconAsset && (
                          <div style={{ marginBottom: "0.5rem" }}>
                            <IconAsset asset={iconAsset} size={32} />
                          </div>
                        )}

                        <div style={{
                          fontSize: "0.9375rem",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          letterSpacing: "0.2px",
                        }}>
                          {alphaName}
                        </div>
                      </a>

                      {/* New contributing alphas below with connecting line */}
                      {hasNewAlphas && newAlphas && (
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          paddingLeft: "1rem",
                          borderLeft: "2px dashed var(--pf-v6-global--BorderColor--100)",
                        }}>
                          {newAlphas.map((newAlpha, newIdx) => {
                            const newAlphaName = String(newAlpha.alpha.name ?? "");
                            const newColorStyle = getColorStyle(newAlpha.score);
                            const newDescription = practiceElementDescriptionForDisplay(newAlpha.alpha) ?? "";

                            // Get icon for contributing alpha
                            const newIconRef = newAlpha.alpha.assetNames?.find((ref: any) => ref.type === "icon");
                            const newIconAsset = newIconRef ? findAsset(newIconRef.assetName, assets) : null;

                            return (
                              <div key={newIdx} style={{ position: "relative" }}>
                                {/* Connecting line to parent */}
                                <div style={{
                                  position: "absolute",
                                  left: "-1rem",
                                  top: "50%",
                                  width: "1rem",
                                  height: "2px",
                                  backgroundColor: "var(--pf-v6-global--BorderColor--100)",
                                }}></div>

                                <a
                                  href={`#alpha-${slug(newAlphaName)}`}
                                  title={`Contributing Alpha: ${newAlphaName}\n${newDescription || 'No description'}\nContributes to: ${alphaName}\nScore: ${newAlpha.score}`}
                                  style={{
                                    ...newColorStyle,
                                    border: "2px solid",
                                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                    padding: "0.75rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    textDecoration: "none",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                    minHeight: "55px",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateX(4px)";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateX(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  {/* Extension alpha indicator */}
                                  <div style={{
                                    position: "absolute",
                                    top: "4px",
                                    left: "4px",
                                    backgroundColor: "#A18FFF",
                                    color: "white",
                                    fontSize: "0.5rem",
                                    fontWeight: 700,
                                    padding: "2px 4px",
                                    borderRadius: "3px",
                                    lineHeight: 1,
                                    zIndex: 1,
                                  }}>
                                    EXT
                                  </div>

                                  {/* Icon above name */}
                                  {newIconAsset && (
                                    <div style={{ marginBottom: "0.25rem", marginTop: "0.5rem" }}>
                                      <IconAsset asset={newIconAsset} size={24} />
                                    </div>
                                  )}

                                  <div style={{
                                    fontSize: "0.8125rem",
                                    fontWeight: 600,
                                    lineHeight: 1.4,
                                    letterSpacing: "0.2px",
                                  }}>
                                    {newAlphaName}
                                  </div>
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}

          <Divider style={{ marginTop: "1.5rem", marginBottom: "1rem" }} />

          <div style={{ display: "flex", gap: "2rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", flexWrap: "wrap" }}>
            {/* Alpha Type Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>Alpha Type:</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  backgroundColor: "#F0AB00",
                  color: "white",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "3px",
                }}>BASE</div>
                <span>Baseline</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  backgroundColor: "#A18FFF",
                  color: "white",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "3px",
                }}>EXT</div>
                <span>Extension</span>
              </div>
            </div>

            <Divider orientation={{ default: "vertical" }} style={{ height: "auto" }} />

            {/* Coverage Level Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>Coverage:</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#F5F5F5",
                  border: "2px solid #D2D2D2",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  opacity: 0.6,
                }}></div>
                <span>None</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#E7F1FA",
                  border: "2px solid #73BCF7",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                }}></div>
                <span>Light (1-2)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#BEE1F4",
                  border: "2px solid #2B9AF3",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                }}></div>
                <span>Medium (3-5)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#73BCF7",
                  border: "2px solid #06C",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                }}></div>
                <span>Strong (6+)</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

// ========================================================================
// SECTION 3: Lifecycle Orchestration (Patterns)
// ========================================================================

function LifecycleOrchestration({ doc, baseline, aliasMap }: { doc: any; baseline: any; aliasMap: PracticeElementAliasLookup }) {
  const { t } = useLanguagePack();
  const patterns = Array.isArray(doc.patterns) ? doc.patterns : [];
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  if (patterns.length === 0) {
    return null;
  }

  // Sort patterns: lifecycle first, then non-lifecycle, then by patternViews count descending
  const sortedPatterns = patterns.slice().sort((a: any, b: any) => {
    // Check if pattern is lifecycle (check type, category, or name)
    const aIsLifecycle = a.type === "lifecycle" || a.category === "lifecycle" ||
      String(a.name ?? "").toLowerCase().includes("lifecycle");
    const bIsLifecycle = b.type === "lifecycle" || b.category === "lifecycle" ||
      String(b.name ?? "").toLowerCase().includes("lifecycle");

    // Lifecycle patterns come first
    if (aIsLifecycle && !bIsLifecycle) return -1;
    if (!aIsLifecycle && bIsLifecycle) return 1;

    // Then sort by patternViews count descending
    const aCount = Array.isArray(a.patternViews) ? a.patternViews.length : 0;
    const bCount = Array.isArray(b.patternViews) ? b.patternViews.length : 0;
    return bCount - aCount;
  });

  return (
    <section id="lifecycle-orchestration" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="purple" isCompact>
          Part 3 of 6
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Lifecycle Orchestration
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Temporal phases providing a chronological roadmap for methodology execution.
      </Content>

      {sortedPatterns.map((pattern: any, idx: number) => (
        <PatternBlock key={idx} pattern={pattern} baseline={baseline} allCitations={citations} />
      ))}
    </section>
  );
}

function PatternBlock({ pattern, baseline, allCitations = [] }: { pattern: any; baseline: any; allCitations?: any[] }) {
  const name = String(pattern.name ?? "Pattern");
  const description = practiceElementDescriptionForDisplay(pattern) ?? "";
  const narratives = pattern.narratives;
  const patternViews = Array.isArray(pattern.patternViews)
    ? pattern.patternViews.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  return (
    <Card id={`pattern-${slug(name)}`} style={{ marginBottom: "2rem", scrollMarginTop: "2rem" }}>
      <CardBody>
        <Title headingLevel="h3" size="xl" style={{ marginBottom: "0.5rem" }}>
          {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />

        {patternViews.length > 0 && baseline && (
          <div style={{ marginTop: "1.5rem" }}>
            <Title headingLevel="h4" size="md" style={{ marginBottom: "1rem" }}>
              Pattern Progression
            </Title>
            <KanbanPatternBoardPF pattern={pattern} baseline={baseline} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PatternViewCard({ view }: { view: any }) {
  const name = String(view.name ?? "Phase");
  const description = practiceElementDescriptionForDisplay(view) ?? "";
  const seq = view.seq !== undefined ? `${view.seq}` : "";
  const alphaStates = Array.isArray(view.alphaStates) ? view.alphaStates : [];
  const activities = Array.isArray(view.activities) ? view.activities : [];
  const narrativeContexts = Array.isArray(view.narrativeContexts) ? view.narrativeContexts : [];

  return (
    <div style={{
      padding: "1.5rem",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      borderLeft: "4px solid var(--pf-v6-global--primary-color--100)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
        {seq && (
          <span style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--pf-v6-global--Color--200)",
            textTransform: "uppercase",
          }}>
            Phase {seq}
          </span>
        )}
        <Title headingLevel="h5" size="md">
          {name}
        </Title>
      </div>

      {description && (
        <Content component={ContentVariants.p} style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
          {description}
        </Content>
      )}

      {narrativeContexts.length > 0 && (
        <div style={{
          marginBottom: "1rem",
          padding: "0.75rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
          borderLeft: "3px solid var(--pf-v6-global--palette--blue-200)",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        }}>
          <div style={{ fontSize: "0.875rem" }}>
            {narrativeContexts
              .slice()
              .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
              .map((ctx: any, idx: number) => {
                const text = narrativeContextRowDisplayText(ctx);
                return text ? (
                  <div key={idx} style={{ display: "flex", marginBottom: idx < narrativeContexts.length - 1 ? "0.5rem" : "0" }}>
                    <div style={{
                      minWidth: "1.5rem",
                      height: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "var(--pf-v6-global--primary-color--100)",
                      color: "white",
                      borderRadius: "50%",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      marginRight: "0.5rem",
                      flexShrink: 0,
                    }}>
                      {(ctx.seq ?? idx + 1)}
                    </div>
                    <div style={{ flex: 1 }}>{text}</div>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      )}

      {alphaStates.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Target States
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {alphaStates.map((state: any, idx: number) => {
              const alphaName = String(state.alphaName ?? "");
              const stateName = String(state.stateName ?? "");
              return (
                <a
                  key={idx}
                  href={`#alpha-${slug(alphaName)}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="blue" isCompact>
                    {alphaName} → {stateName}
                  </Label>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Activities
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {activities.map((activity: any, idx: number) => {
              const activityName = String(activity ?? "");
              return (
                <a
                  key={idx}
                  href={`#activity-${slug(activityName)}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="green" isCompact>
                    {activityName}
                  </Label>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================================
// SECTION 4: Core Concepts & Progression (Alphas)
// ========================================================================

// Build alpha hierarchy based on contributesTo relationships
function buildAlphaHierarchy(alphas: any[]): { roots: any[]; childrenMap: Map<string, any[]> } {
  const childrenMap = new Map<string, any[]>();
  const roots: any[] = [];
  const alphasByName = new Map<string, any>();

  // Index alphas by name
  for (const alpha of alphas) {
    const name = String(alpha.name ?? "").trim();
    if (name) {
      alphasByName.set(name, alpha);
    }
  }

  // Build parent-child relationships
  for (const alpha of alphas) {
    const name = String(alpha.name ?? "").trim();
    const contributesTo = String(alpha.contributesTo ?? "").trim();

    if (!contributesTo || !alphasByName.has(contributesTo)) {
      // This is a root alpha (no contributesTo, or contributesTo points outside this practice)
      roots.push(alpha);
    } else {
      // This alpha contributes to another alpha in this practice
      if (!childrenMap.has(contributesTo)) {
        childrenMap.set(contributesTo, []);
      }
      childrenMap.get(contributesTo)!.push(alpha);
    }
  }

  return { roots, childrenMap };
}

function CoreConcepts({ doc, originalDoc, grouped, aliasMap, methodComposition }: { doc: any; originalDoc: any; grouped: any[]; aliasMap: PracticeElementAliasLookup; methodComposition?: Method | null }) {
  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  // Extract all activities from all activitySpaces across all focuses
  const activities: any[] = [];
  for (const focus of grouped) {
    const activitySpaces = focus.activitySpaces ?? [];
    for (const space of activitySpaces) {
      const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
      activities.push(...spaceActivities);
    }
  }

  // Build a set of alpha names from the original practice document or method's practices
  const practiceAlphaNames = useMemo(() => {
    const names = new Set<string>();

    if (methodComposition) {
      // For methods, collect alphas from all the method's extension practices (not the baseline)
      // First, collect baseline alphas to exclude them
      const baselineAlphaNames = new Set<string>();
      const baseline = methodComposition.baselinePractice;
      if (baseline && typeof baseline === 'object') {
        const baselineAlphas = Array.isArray(baseline.alphas) ? baseline.alphas : [];
        for (const alpha of baselineAlphas) {
          const name = String(alpha.name ?? "").trim();
          if (name) baselineAlphaNames.add(name);
        }
      }

      // Collect from embedded practices
      const practices = Array.isArray(methodComposition.practices) ? methodComposition.practices : [];
      for (const practice of practices) {
        const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];
        for (const alpha of alphas) {
          const name = String(alpha.name ?? "").trim();
          if (name) names.add(name);
        }
      }

      // Check if method uses practiceNames (practices referenced by name)
      const practiceNames = Array.isArray((methodComposition as any).practiceNames)
        ? (methodComposition as any).practiceNames
        : [];

      // If there are practices referenced by name, we need to include their alphas too
      // Since those practices have been merged into doc and we can't distinguish which
      // baseline alphas were extended vs baseline-only, include ALL alphas from the merged doc
      // This ensures alphas from referenced practices are never incorrectly marked as "Referenced"
      if (practiceNames.length > 0) {
        const allAlphas = Array.isArray(doc.alphas) ? doc.alphas : [];
        for (const alpha of allAlphas) {
          const name = String(alpha.name ?? "").trim();
          if (name) {
            names.add(name);
          }
        }
      }
    } else {
      // For standalone practices, use the practice's own alphas
      const alphas = Array.isArray(originalDoc.alphas) ? originalDoc.alphas : [];
      for (const alpha of alphas) {
        const name = String(alpha.name ?? "").trim();
        if (name) names.add(name);
      }
    }

    return names;
  }, [doc, originalDoc, methodComposition]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <section id="core-concepts" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="orange" isCompact>
          Part 4 of 6
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Core Concepts & Progression
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Abstract areas of concern and their sequential states of maturity.
      </Content>

      {grouped.map((focus: any, idx: number) => (
        <FocusBlock key={idx} focus={focus} workProducts={workProducts} activities={activities} aliasMap={aliasMap} practiceAlphaNames={practiceAlphaNames} allCitations={citations} />
      ))}
    </section>
  );
}

function FocusBlock({ focus, workProducts, activities, aliasMap, practiceAlphaNames, allCitations = [] }: { focus: any; workProducts: any[]; activities: any[]; aliasMap: PracticeElementAliasLookup; practiceAlphaNames: Set<string>; allCitations?: any[] }) {
  const focusName = String(focus.focusName ?? "");
  const alphas = focus.alphas ?? [];

  if (alphas.length === 0) {
    return null;
  }

  const { roots, childrenMap } = buildAlphaHierarchy(alphas);

  return (
    <div id={`focus-${slug(focusName)}`} style={{ marginBottom: "3rem", scrollMarginTop: "2rem" }}>
      <Title headingLevel="h3" size="2xl" style={{ marginBottom: "1.5rem", color: "var(--pf-v6-global--primary-color--100)" }}>
        {focusName}
      </Title>

      {roots.map((alpha: any, idx: number) => (
        <AlphaBlock key={idx} alpha={alpha} childrenMap={childrenMap} workProducts={workProducts} activities={activities} depth={0} aliasMap={aliasMap} practiceAlphaNames={practiceAlphaNames} allCitations={allCitations} />
      ))}
    </div>
  );
}

function AlphaBlock({ alpha, childrenMap, workProducts, activities, depth = 0, aliasMap, practiceAlphaNames, allCitations = [] }: { alpha: any; childrenMap: Map<string, any[]>; workProducts: any[]; activities: any[]; depth?: number; aliasMap: PracticeElementAliasLookup; practiceAlphaNames: Set<string>; allCitations?: any[] }) {
  const name = String(alpha.name ?? "");
  const description = practiceElementDescriptionForDisplay(alpha) ?? "";
  const narratives = alpha.narratives;
  const states = Array.isArray(alpha.states)
    ? alpha.states.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  const children = childrenMap.get(name) ?? [];
  const hasChildren = children.length > 0;

  // Check if this alpha is defined in the practice (not from a dependency)
  const isPracticeDefined = practiceAlphaNames.has(name.trim());

  // Adjust styling based on depth
  const marginLeft = depth > 0 ? `${depth * 2}rem` : "0";
  const borderLeftColor = depth > 0 ? "var(--pf-v6-global--BorderColor--200)" : "transparent";

  // If not practice-defined, render simplified view (just name and description)
  if (!isPracticeDefined) {
    return (
      <>
        <Card id={`alpha-${slug(name)}`} style={{
          marginBottom: "1.5rem",
          marginLeft,
          borderLeft: depth > 0 ? `3px solid ${borderLeftColor}` : undefined,
          scrollMarginTop: "2rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
          opacity: 0.8,
        }}>
          <CardBody>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <Title headingLevel={depth === 0 ? "h4" : depth === 1 ? "h5" : "h6"} size={depth === 0 ? "lg" : "md"}>
                <ElementNameWithAlias aliasMap={aliasMap} elementType="Alpha" name={name} />
              </Title>
              <Label color="grey" isCompact>
                Referenced
              </Label>
              {depth > 0 && (
                <a
                  href={`#alpha-${slug(String(alpha.contributesTo ?? ""))}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="grey" isCompact>
                    Specializes {String(alpha.contributesTo ?? "")}
                  </Label>
                </a>
              )}
            </div>

            {description && (
              <Content component={ContentVariants.p} style={{ marginBottom: "0", color: "var(--pf-v6-global--Color--200)" }}>
                {description}
              </Content>
            )}
          </CardBody>
        </Card>

        {/* Render child alphas */}
        {hasChildren && (
          <div style={{ marginBottom: "1.5rem" }}>
            {children.map((child: any, idx: number) => (
              <AlphaBlock key={idx} alpha={child} childrenMap={childrenMap} workProducts={workProducts} activities={activities} depth={depth + 1} aliasMap={aliasMap} practiceAlphaNames={practiceAlphaNames} allCitations={allCitations} />
            ))}
          </div>
        )}
      </>
    );
  }

  // Practice-defined alpha - render full view
  return (
    <>
      <Card id={`alpha-${slug(name)}`} style={{
        marginBottom: "1.5rem",
        marginLeft,
        borderLeft: depth > 0 ? `3px solid ${borderLeftColor}` : undefined,
        scrollMarginTop: "2rem",
      }}>
        <CardBody>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Title headingLevel={depth === 0 ? "h4" : depth === 1 ? "h5" : "h6"} size={depth === 0 ? "lg" : "md"}>
              <ElementNameWithAlias aliasMap={aliasMap} elementType="Alpha" name={name} />
            </Title>
            {depth > 0 && (
              <a
                href={`#alpha-${slug(String(alpha.contributesTo ?? ""))}`}
                style={{ textDecoration: "none" }}
              >
                <Label color="grey" isCompact>
                  Specializes {String(alpha.contributesTo ?? "")}
                </Label>
              </a>
            )}
          </div>

          {description && (
            <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
              {description}
            </Content>
          )}

          <NarrativesSection narratives={narratives} compact allCitations={allCitations} />

          {states.length > 0 && (
            <>
              <Title headingLevel="h5" size="md" style={{ marginBottom: "1rem", marginTop: "1.5rem" }}>
                State Progression
              </Title>
              <div style={{ position: "relative" }}>
                {/* Progress line */}
                <div style={{
                  position: "absolute",
                  left: "1rem",
                  top: "2rem",
                  bottom: "2rem",
                  width: "2px",
                  backgroundColor: "var(--pf-v6-global--BorderColor--100)",
                }} />

                {states.map((state: any, idx: number) => (
                  <StateBlock key={idx} state={state} alphaName={name} workProducts={workProducts} activities={activities} index={idx} total={states.length} />
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Render child alphas */}
      {hasChildren && (
        <div style={{ marginBottom: "1.5rem" }}>
          {children.map((child: any, idx: number) => (
            <AlphaBlock key={idx} alpha={child} childrenMap={childrenMap} workProducts={workProducts} activities={activities} depth={depth + 1} aliasMap={aliasMap} practiceAlphaNames={practiceAlphaNames} allCitations={allCitations} />
          ))}
        </div>
      )}
    </>
  );
}

function StateBlock({ state, alphaName, workProducts, activities, index, total }: { state: any; alphaName: string; workProducts: any[]; activities: any[]; index: number; total: number }) {
  const name = String(state.name ?? "");
  const description = practiceElementDescriptionForDisplay(state) ?? "";
  const checklist = Array.isArray(state.checklist)
    ? state.checklist.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  // Find all activities that contribute to this alpha state
  const progressedBy: Array<string> = [];
  for (const activity of activities) {
    const activityName = String(activity.name ?? "");
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
    for (const contrib of contributesTo) {
      const contribAlphaName = String(contrib.alphaName ?? "");
      const contribStateName = String(contrib.stateName ?? "");
      if (contribAlphaName === alphaName && contribStateName === name) {
        progressedBy.push(activityName);
        break; // Only add each activity once per state
      }
    }
  }

  // Find all work product LODs that contribute to this alpha state
  const evidencedBy: Array<{ workProductName: string; lodName: string }> = [];
  for (const wp of workProducts) {
    const wpName = String(wp.name ?? "");
    const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
    for (const lod of lods) {
      const lodName = String(lod.name ?? "");
      const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
      for (const contrib of contributesTo) {
        const contribAlphaName = String(contrib.alphaName ?? "");
        const contribStateName = String(contrib.stateName ?? "");
        if (contribAlphaName === alphaName && contribStateName === name) {
          evidencedBy.push({ workProductName: wpName, lodName });
          break; // Only add each LOD once per state
        }
      }
    }
  }

  return (
    <div style={{ position: "relative", paddingLeft: "3rem", marginBottom: index < total - 1 ? "2rem" : "0" }}>
      {/* State indicator */}
      <div style={{
        position: "absolute",
        left: "0.5rem",
        top: "0.5rem",
        width: "2rem",
        height: "2rem",
        borderRadius: "50%",
        backgroundColor: "var(--pf-v6-global--primary-color--100)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.875rem",
        zIndex: 1,
      }}>
        {index + 1}
      </div>

      <div style={{
        padding: "1rem",
        border: "1px solid var(--pf-v6-global--BorderColor--100)",
        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
      }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>
          {name}
        </div>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        {checklist.length > 0 && (
          <div style={{ marginBottom: progressedBy.length > 0 || evidencedBy.length > 0 ? "1rem" : "0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Checklist
            </div>
            <List isPlain>
              {checklist.map((item: any, idx: number) => {
                const itemName = String(item.name ?? "");
                const itemDesc = practiceElementDescriptionForDisplay(item) ?? "";
                return (
                  <ListItem key={idx} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <span style={{ color: "var(--pf-v6-global--primary-color--100)", marginRight: "0.5rem" }}>✓</span>
                      <div>
                        <strong>{itemName}:</strong> {itemDesc}
                      </div>
                    </div>
                  </ListItem>
                );
              })}
            </List>
          </div>
        )}

        {/* Progressed By - Activities that contribute to this state */}
        {progressedBy.length > 0 && (
          <div style={{ marginBottom: evidencedBy.length > 0 ? "1rem" : "0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Progressed By
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {progressedBy.map((activityName, idx) => (
                <a
                  key={idx}
                  href={`#activity-${slug(activityName)}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="green" isCompact>
                    {activityName}
                  </Label>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Evidenced By - Work Products that contribute to this state */}
        {evidencedBy.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Evidenced By
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {evidencedBy.map((evidence, idx) => (
                <a
                  key={idx}
                  href={`#workproduct-${slug(evidence.workProductName)}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="teal" isCompact>
                    {evidence.workProductName} → {evidence.lodName}
                  </Label>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================================================
// SECTION 5: Evidentiary Artifacts (Work Products)
// ========================================================================

function EvidentaryArtifacts({ doc, aliasMap }: { doc: any; aliasMap: PracticeElementAliasLookup }) {
  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  if (workProducts.length === 0) {
    return null;
  }

  return (
    <section id="evidentiary-artifacts" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="teal" isCompact>
          Part 5 of 6
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Evidentiary Artifacts
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Physical deliverables that prove the maturation of core concepts.
      </Content>

      {workProducts.map((wp: any, idx: number) => (
        <WorkProductBlock key={idx} workProduct={wp} allCitations={citations} />
      ))}
    </section>
  );
}

function WorkProductBlock({ workProduct, allCitations = [] }: { workProduct: any; allCitations?: any[] }) {
  const name = String(workProduct.name ?? "");
  const description = practiceElementDescriptionForDisplay(workProduct) ?? "";
  const narratives = workProduct.narratives;
  const levelsOfDetail = Array.isArray(workProduct.levelsOfDetail)
    ? workProduct.levelsOfDetail.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  return (
    <Card id={`workproduct-${slug(name)}`} style={{ marginBottom: "1.5rem", scrollMarginTop: "2rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="lg" style={{ marginBottom: "0.5rem" }}>
          {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />

        {levelsOfDetail.length > 0 && (
          <>
            <Title headingLevel="h5" size="md" style={{ marginBottom: "1rem", marginTop: "1.5rem" }}>
              Levels of Detail
            </Title>
            <div style={{ display: "grid", gap: "1rem" }}>
              {levelsOfDetail.map((lod: any, idx: number) => (
                <LevelOfDetailCard key={idx} lod={lod} />
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function LevelOfDetailCard({ lod }: { lod: any }) {
  const name = String(lod.name ?? "");
  const description = practiceElementDescriptionForDisplay(lod) ?? "";
  const checklist = Array.isArray(lod.checklist)
    ? lod.checklist.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];
  const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];

  return (
    <div style={{
      padding: "1rem",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
        {name}
      </div>
      {description && (
        <Content component={ContentVariants.p} style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
          {description}
        </Content>
      )}

      {contributesTo.length > 0 && (
        <div style={{ marginBottom: checklist.length > 0 ? "1rem" : "0" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
            Provides Evidence For
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {contributesTo.map((contrib: any, idx: number) => {
              const alphaName = String(contrib.alphaName ?? "");
              const stateName = String(contrib.stateName ?? "");
              return (
                <a
                  key={idx}
                  href={`#alpha-${slug(alphaName)}`}
                  style={{ textDecoration: "none" }}
                >
                  <Label color="blue" isCompact>
                    {alphaName} → {stateName}
                  </Label>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {checklist.length > 0 && (
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
            Criteria
          </div>
          <List isPlain>
            {checklist.map((item: any, idx: number) => {
              const itemName = String(item.name ?? "");
              const itemDesc = practiceElementDescriptionForDisplay(item) ?? "";
              return (
                <ListItem key={idx} style={{ marginBottom: "0.25rem", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <span style={{ color: "var(--pf-v6-global--primary-color--100)", marginRight: "0.5rem" }}>✓</span>
                    <div>
                      <strong>{itemName}:</strong> {itemDesc}
                    </div>
                  </div>
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
// SECTION 6: Execution & Roles (Activities & Personas)
// ========================================================================

function ExecutionAndRoles({ doc, originalDoc, grouped, aliasMap, methodComposition }: { doc: any; originalDoc: any; grouped: any[]; aliasMap: PracticeElementAliasLookup; methodComposition?: Method | null }) {
  const personas = Array.isArray(doc.personas) ? doc.personas : [];
  const personaGroups = Array.isArray(doc.personaGroups) ? doc.personaGroups : [];
  const competencies = Array.isArray(doc.competencies) ? doc.competencies : [];
  const citations = Array.isArray(doc.citations) ? doc.citations : [];

  // Build a set of activity space names from the original practice document or method's practices
  const practiceActivitySpaceNames = useMemo(() => {
    const names = new Set<string>();

    if (methodComposition) {
      // For methods, collect activity spaces from all the method's extension practices (not the baseline)
      // First, collect baseline activity space names to exclude them
      const baselineActivitySpaceNames = new Set<string>();
      const baseline = methodComposition.baselinePractice;
      if (baseline && typeof baseline === 'object') {
        const baselineSpaces = Array.isArray(baseline.activitySpaces) ? baseline.activitySpaces : [];
        for (const space of baselineSpaces) {
          const name = String(space.name ?? "").trim();
          if (name) baselineActivitySpaceNames.add(name);
        }
      }

      // Collect from embedded practices
      const practices = Array.isArray(methodComposition.practices) ? methodComposition.practices : [];
      for (const practice of practices) {
        const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
        for (const space of activitySpaces) {
          const name = String(space.name ?? "").trim();
          if (name) names.add(name);
        }
      }

      // Check if method uses practiceNames (practices referenced by name)
      const practiceNames = Array.isArray((methodComposition as any).practiceNames)
        ? (methodComposition as any).practiceNames
        : [];

      // If there are practices referenced by name, we need to include their activity spaces too
      // Since those practices have been merged into doc and we can't distinguish which
      // baseline spaces were extended vs baseline-only, include ALL spaces from the merged doc
      // This ensures activity spaces from referenced practices are never incorrectly marked as "Referenced"
      if (practiceNames.length > 0) {
        const allSpaces = Array.isArray(doc.activitySpaces) ? doc.activitySpaces : [];
        for (const space of allSpaces) {
          const name = String(space.name ?? "").trim();
          if (name) {
            names.add(name);
          }
        }
      }
    } else {
      // For standalone practices, use the practice's own activity spaces
      const activitySpaces = Array.isArray(originalDoc.activitySpaces) ? originalDoc.activitySpaces : [];
      for (const space of activitySpaces) {
        const name = String(space.name ?? "").trim();
        if (name) names.add(name);
      }
    }

    return names;
  }, [doc, originalDoc, methodComposition]);

  const hasActivities = grouped.some((g: any) => g.activitySpaces?.length > 0);

  if (!hasActivities && personas.length === 0 && personaGroups.length === 0) {
    return null;
  }

  return (
    <section id="execution-roles" style={{ marginBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label color="yellow" isCompact>
          Part 6 of 6
        </Label>
      </div>

      <Title headingLevel="h2" size="3xl" style={{ marginBottom: "1rem" }}>
        Execution & Roles
      </Title>

      <Content component={ContentVariants.p} style={{ marginBottom: "2rem", color: "var(--pf-v6-global--Color--200)" }}>
        Specific workflows, who executes them, and the competencies required.
      </Content>

      {/* Activities by Focus */}
      {hasActivities && (
        <div style={{ marginBottom: "3rem" }}>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1.5rem" }}>
            Activities
          </Title>
          {grouped.map((focus: any, idx: number) => {
            const activitySpaces = focus.activitySpaces ?? [];

            if (activitySpaces.length === 0) return null;

            return (
              <div key={idx} id={`activities-${slug(focus.focusName)}`} style={{ marginBottom: "2rem", scrollMarginTop: "2rem" }}>
                <Title headingLevel="h4" size="lg" style={{ marginBottom: "1rem", color: "var(--pf-v6-global--primary-color--100)" }}>
                  {focus.focusName}
                </Title>
                {activitySpaces.map((space: any, spaceIdx: number) => (
                  <ActivitySpaceBlock key={spaceIdx} activitySpace={space} practiceActivitySpaceNames={practiceActivitySpaceNames} allCitations={citations} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Personas */}
      {personas.length > 0 && (
        <div id="personas-section" style={{ marginBottom: "3rem", scrollMarginTop: "2rem" }}>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1.5rem" }}>
            Personas
          </Title>
          <div style={{ display: "grid", gap: "1rem" }}>
            {personas.map((persona: any, idx: number) => (
              <PersonaCard key={idx} persona={persona} allCitations={citations} />
            ))}
          </div>
        </div>
      )}

      {/* Persona Groups */}
      {personaGroups.length > 0 && (
        <div style={{ marginBottom: "3rem" }}>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1.5rem" }}>
            Persona Groups
          </Title>
          <div style={{ display: "grid", gap: "1rem" }}>
            {personaGroups.map((group: any, idx: number) => (
              <PersonaGroupCard key={idx} group={group} allCitations={citations} />
            ))}
          </div>
        </div>
      )}

      {/* Competencies */}
      {competencies.length > 0 && (
        <div>
          <Title headingLevel="h3" size="xl" style={{ marginBottom: "1.5rem" }}>
            Competencies
          </Title>
          <div style={{ display: "grid", gap: "1rem" }}>
            {competencies.map((competency: any, idx: number) => (
              <CompetencyCard key={idx} competency={competency} allCitations={citations} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActivitySpaceBlock({ activitySpace, practiceActivitySpaceNames, allCitations = [] }: { activitySpace: any; practiceActivitySpaceNames: Set<string>; allCitations?: any[] }) {
  const name = String(activitySpace.name ?? "");
  const description = practiceElementDescriptionForDisplay(activitySpace) ?? "";
  const narratives = activitySpace.narratives;
  const activities = Array.isArray(activitySpace.activities) ? activitySpace.activities : [];
  const requiredCompetencies = Array.isArray(activitySpace.requiredCompetencies)
    ? activitySpace.requiredCompetencies
    : [];
  const involves = Array.isArray(activitySpace.involves)
    ? activitySpace.involves
    : [];
  const contributesTo = Array.isArray(activitySpace.contributesTo)
    ? activitySpace.contributesTo
    : [];

  // Check if this activity space is defined in the practice (not from a dependency)
  const isPracticeDefined = practiceActivitySpaceNames.has(name.trim());
  const hasActivities = activities.length > 0;

  // If not practice-defined AND has no activities, render simplified view (just name and description)
  if (!isPracticeDefined && !hasActivities) {
    return (
      <Card style={{ marginBottom: "1rem", backgroundColor: "var(--pf-v6-global--BackgroundColor--200)", opacity: 0.8 }}>
        <CardBody>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Title headingLevel="h5" size="md">
              {name}
            </Title>
            <Label color="grey" isCompact>
              Referenced
            </Label>
          </div>
          {description && (
            <Content component={ContentVariants.p} style={{ marginBottom: "0", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
              {description}
            </Content>
          )}
        </CardBody>
      </Card>
    );
  }

  // Practice-defined OR has activities - render full view
  return (
    <Card style={{ marginBottom: "1rem" }}>
      <CardBody>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Title headingLevel="h5" size="md">
            {name}
          </Title>
          {!isPracticeDefined && hasActivities && (
            <Label color="grey" isCompact>
              Referenced (with activities)
            </Label>
          )}
        </div>
        {description && (
          <Content component={ContentVariants.p} style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}

        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />

        {/* Required Competencies */}
        {requiredCompetencies.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Required Competencies
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {requiredCompetencies.map((comp: any, compIdx: number) => {
                const compName = String(comp ?? "");
                return (
                  <a
                    key={compIdx}
                    href={`#competency-${slug(compName)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Label color="purple" isCompact>
                      {compName}
                    </Label>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Involves - Persona Groups */}
        {involves.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Involves
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {involves.map((pg: any, pgIdx: number) => {
                const pgName = String(pg ?? "");
                return (
                  <a
                    key={pgIdx}
                    href={`#personagroup-${slug(pgName)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Label color="blue" isCompact>
                      {pgName}
                    </Label>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Contributes To - Alpha States */}
        {contributesTo.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Contributes To
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {contributesTo.map((target: any, targetIdx: number) => {
                const alphaName = String(target.alphaName ?? "");
                const stateName = String(target.stateName ?? "");
                return (
                  <a
                    key={targetIdx}
                    href={`#alpha-${slug(alphaName)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Label color="orange" isCompact>
                      {alphaName} → {stateName}
                    </Label>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {activities.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            {activities.map((activity: any, idx: number) => {
              const actName = String(activity.name ?? "");
              const actDesc = practiceElementDescriptionForDisplay(activity) ?? "";
              const actNarratives = activity.narratives;
              const requiredCompetencies = Array.isArray(activity.requiredCompetencies)
                ? activity.requiredCompetencies
                : [];
              const recommendedCompetencyLevels = Array.isArray(activity.recommendedCompetencyLevels)
                ? activity.recommendedCompetencyLevels
                : [];
              const worksOn = Array.isArray(activity.worksOn)
                ? activity.worksOn
                : [];
              const involves = Array.isArray(activity.involves)
                ? activity.involves
                : [];
              const contributesTo = Array.isArray(activity.contributesTo)
                ? activity.contributesTo
                : [];

              return (
                <div
                  key={idx}
                  id={`activity-${slug(actName)}`}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                    scrollMarginTop: "2rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                    {actName}
                  </div>
                  {actDesc && (
                    <Content component={ContentVariants.p} style={{ fontSize: "0.75rem", marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>
                      {actDesc}
                    </Content>
                  )}
                  <NarrativesSection narratives={actNarratives} compact allCitations={allCitations} />

                  {/* Works On - Work Products */}
                  {worksOn.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
                        Works On
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {worksOn.map((wp: any, wpIdx: number) => {
                          const wpName = String(wp.workProductName ?? "");
                          const lodName = String(wp.levelOfDetailName ?? "");
                          return (
                            <a
                              key={wpIdx}
                              href={`#workproduct-${slug(wpName)}`}
                              style={{ textDecoration: "none" }}
                            >
                              <Label color="teal" isCompact>
                                {wpName}{lodName ? ` → ${lodName}` : ""}
                              </Label>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Required Competencies */}
                  {requiredCompetencies.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
                        Required Competencies
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {requiredCompetencies.map((comp: any, compIdx: number) => {
                          const compName = String(comp ?? "");
                          return (
                            <a
                              key={compIdx}
                              href={`#competency-${slug(compName)}`}
                              style={{ textDecoration: "none" }}
                            >
                              <Label color="purple" isCompact>
                                {compName}
                              </Label>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended Competency Levels */}
                  {recommendedCompetencyLevels.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
                        Recommended Competency Levels
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {recommendedCompetencyLevels.map((comp: any, compIdx: number) => {
                          const compName = String(comp.competencyName ?? "");
                          const levelName = String(comp.competencyLevelName ?? "");
                          return (
                            <a
                              key={compIdx}
                              href={`#competency-${slug(compName)}`}
                              style={{ textDecoration: "none" }}
                            >
                              <Label color="purple" isCompact>
                                {compName}{levelName ? ` → ${levelName}` : ""}
                              </Label>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Involves - Persona Groups */}
                  {involves.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
                        Involves
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {involves.map((pg: any, pgIdx: number) => {
                          const pgName = String(pg ?? "");
                          return (
                            <a
                              key={pgIdx}
                              href={`#personagroup-${slug(pgName)}`}
                              style={{ textDecoration: "none" }}
                            >
                              <Label color="blue" isCompact>
                                {pgName}
                              </Label>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contributes To - Alpha States */}
                  {contributesTo.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
                        Contributes To
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {contributesTo.map((target: any, targetIdx: number) => {
                          const alphaName = String(target.alphaName ?? "");
                          const stateName = String(target.stateName ?? "");
                          return (
                            <a
                              key={targetIdx}
                              href={`#alpha-${slug(alphaName)}`}
                              style={{ textDecoration: "none" }}
                            >
                              <Label color="orange" isCompact>
                                {alphaName} → {stateName}
                              </Label>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PersonaCard({ persona, allCitations = [] }: { persona: any; allCitations?: any[] }) {
  const name = String(persona.name ?? "");
  const description = practiceElementDescriptionForDisplay(persona) ?? "";
  const narratives = persona.narratives;
  const competencies = Array.isArray(persona.competencies) ? persona.competencies : [];

  return (
    <Card id={`persona-${slug(name)}`} isCompact style={{ scrollMarginTop: "2rem" }}>
      <CardBody>
        <Title headingLevel="h5" size="md" style={{ marginBottom: "0.5rem" }}>
          {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />
        {competencies.length > 0 && (
          <div style={{ marginTop: narratives && Array.isArray(narratives) && narratives.length > 0 ? "1rem" : "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Required Competencies
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {competencies.map((comp: any, idx: number) => {
                const compName = String(comp.competencyName ?? "");
                const levelName = String(comp.competencyLevelName ?? "");
                return (
                  <a
                    key={idx}
                    href={`#competency-${slug(compName)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Label color="purple" isCompact>
                      {compName}{levelName ? ` (${levelName})` : ""}
                    </Label>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PersonaGroupCard({ group, allCitations = [] }: { group: any; allCitations?: any[] }) {
  const name = String(group.name ?? "");
  const description = practiceElementDescriptionForDisplay(group) ?? "";
  const narratives = group.narratives;
  const personaNames = Array.isArray(group.personaNames) ? group.personaNames : [];

  return (
    <Card id={`personagroup-${slug(name)}`} isCompact style={{ scrollMarginTop: "2rem" }}>
      <CardBody>
        <Title headingLevel="h5" size="md" style={{ marginBottom: "0.5rem" }}>
          {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />
        {personaNames.length > 0 && (
          <div style={{ marginTop: narratives && Array.isArray(narratives) && narratives.length > 0 ? "1rem" : "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Members
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {personaNames.map((pname: any, idx: number) => {
                const personaName = String(pname ?? "");
                return (
                  <a
                    key={idx}
                    href={`#persona-${slug(personaName)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Label color="blue" isCompact>
                      {personaName}
                    </Label>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function CompetencyCard({ competency, allCitations = [] }: { competency: any; allCitations?: any[] }) {
  const name = String(competency.name ?? "");
  const description = practiceElementDescriptionForDisplay(competency) ?? "";
  const narratives = competency.narratives;
  const levels = Array.isArray(competency.levels)
    ? competency.levels.slice().sort((a: any, b: any) => (a.level ?? 0) - (b.level ?? 0))
    : [];

  return (
    <Card id={`competency-${slug(name)}`} isCompact style={{ scrollMarginTop: "2rem" }}>
      <CardBody>
        <Title headingLevel="h5" size="md" style={{ marginBottom: "0.5rem" }}>
          {name}
        </Title>
        {description && (
          <Content component={ContentVariants.p} style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
            {description}
          </Content>
        )}
        <NarrativesSection narratives={narratives} compact allCitations={allCitations} />
        {levels.length > 0 && (
          <div style={{ marginTop: narratives && Array.isArray(narratives) && narratives.length > 0 ? "1rem" : "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)" }}>
              Levels
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {levels.map((level: any, idx: number) => {
                const levelName = String(level.name ?? "");
                const levelNum = level.level ?? idx + 1;
                const levelDesc = practiceElementDescriptionForDisplay(level) ?? "";
                return (
                  <div key={idx} style={{ fontSize: "0.75rem" }}>
                    <strong>Level {levelNum} - {levelName}:</strong> {levelDesc}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ========================================================================
// NAVIGATION SIDEBAR
// ========================================================================

function NavigationSidebar({ doc, grouped }: { doc: any; grouped: any[] }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["lifecycle", "alphas", "workproducts", "activities"]));
  const [activeSection, setActiveSection] = useState<string>("");

  // Track scroll position to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "outline", "executive-context", "method-focus", "lifecycle-orchestration",
        "core-concepts", "evidentiary-artifacts", "execution-roles"
      ];

      const scrollPosition = window.scrollY + 100; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Set initial active section

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const patterns = Array.isArray(doc.patterns) ? doc.patterns : [];
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

  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];

  const navItemStyle = (isActive: boolean = false): CSSProperties => ({
    display: "block",
    padding: "0.5rem 1rem",
    color: isActive ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--Color--100)",
    textDecoration: "none",
    borderLeft: isActive ? "3px solid var(--pf-v6-global--primary-color--100)" : "3px solid transparent",
    fontSize: "0.875rem",
    marginBottom: "0.125rem",
    transition: "all 0.2s ease",
    fontWeight: isActive ? 600 : 400,
  });

  const subItemStyle: CSSProperties = {
    display: "block",
    padding: "0.5rem 1rem 0.5rem 2rem",
    color: "var(--pf-v6-global--Color--200)",
    textDecoration: "none",
    borderLeft: "3px solid transparent",
    fontSize: "0.8rem",
    marginBottom: "0.125rem",
    transition: "all 0.2s ease",
  };

  const sectionHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--pf-v6-global--Color--100)",
    borderLeft: "3px solid transparent",
    transition: "all 0.2s ease",
  };

  return (
    <nav style={{
      width: 300,
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
      <div style={{ padding: "0 1.5rem", marginBottom: "1rem" }}>
        <Title headingLevel="h3" size="md" style={{ textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)", fontSize: "0.875rem" }}>
          Contents
        </Title>
      </div>

      <a
        href="#outline"
        style={navItemStyle(activeSection === "outline")}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
          if (activeSection !== "outline") e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          if (activeSection !== "outline") e.currentTarget.style.borderLeftColor = "transparent";
        }}
      >
        Report Outline
      </a>

      <a
        href="#executive-context"
        style={navItemStyle(activeSection === "executive-context")}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
          if (activeSection !== "executive-context") e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          if (activeSection !== "executive-context") e.currentTarget.style.borderLeftColor = "transparent";
        }}
      >
        1. Executive Context
      </a>

      <a
        href="#method-focus"
        style={navItemStyle(activeSection === "method-focus")}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
          if (activeSection !== "method-focus") e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          if (activeSection !== "method-focus") e.currentTarget.style.borderLeftColor = "transparent";
        }}
      >
        2. Method Focus
      </a>

      {/* Lifecycle Orchestration with subsections */}
      {sortedPatterns.length > 0 && (
        <div>
          <div
            style={sectionHeaderStyle}
            onClick={() => toggleSection("lifecycle")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <a href="#lifecycle-orchestration" style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
              3. Lifecycle Orchestration
            </a>
            <span style={{ fontSize: "0.75rem" }}>{expandedSections.has("lifecycle") ? "▼" : "▶"}</span>
          </div>
          {expandedSections.has("lifecycle") && sortedPatterns.map((pattern: any, idx: number) => {
            const name = String(pattern.name ?? "");
            return (
              <a
                key={idx}
                href={`#pattern-${slug(name)}`}
                style={subItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                  e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }}
              >
                {name}
              </a>
            );
          })}
        </div>
      )}

      {/* Core Concepts with subsections (Alphas) */}
      {grouped.some((g: any) => g.alphas?.length > 0) && (
        <div>
          <div
            style={sectionHeaderStyle}
            onClick={() => toggleSection("alphas")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <a href="#core-concepts" style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
              4. Core Concepts
            </a>
            <span style={{ fontSize: "0.75rem" }}>{expandedSections.has("alphas") ? "▼" : "▶"}</span>
          </div>
          {expandedSections.has("alphas") && grouped.map((focusGroup: any, gIdx: number) => {
            const alphas = focusGroup.alphas || [];
            return alphas.map((alpha: any, aIdx: number) => {
              const name = String(alpha.name ?? "");
              return (
                <a
                  key={`${gIdx}-${aIdx}`}
                  href={`#alpha-${slug(name)}`}
                  style={subItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                    e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderLeftColor = "transparent";
                  }}
                >
                  {name}
                </a>
              );
            });
          })}
        </div>
      )}

      {/* Work Products with subsections */}
      {workProducts.length > 0 && (
        <div>
          <div
            style={sectionHeaderStyle}
            onClick={() => toggleSection("workproducts")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <a href="#evidentiary-artifacts" style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
              5. Evidentiary Artifacts
            </a>
            <span style={{ fontSize: "0.75rem" }}>{expandedSections.has("workproducts") ? "▼" : "▶"}</span>
          </div>
          {expandedSections.has("workproducts") && workProducts.map((wp: any, idx: number) => {
            const name = String(wp.name ?? "");
            return (
              <a
                key={idx}
                href={`#workproduct-${slug(name)}`}
                style={subItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                  e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }}
              >
                {name}
              </a>
            );
          })}
        </div>
      )}

      {/* Execution & Roles with subsections (Activity Spaces) */}
      {grouped.some((g: any) => g.activitySpaces?.length > 0) && (
        <div>
          <div
            style={sectionHeaderStyle}
            onClick={() => toggleSection("activities")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <a href="#execution-roles" style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
              6. Execution & Roles
            </a>
            <span style={{ fontSize: "0.75rem" }}>{expandedSections.has("activities") ? "▼" : "▶"}</span>
          </div>
          {expandedSections.has("activities") && grouped.map((focusGroup: any, gIdx: number) => {
            const activitySpaces = focusGroup.activitySpaces || [];
            return activitySpaces.map((space: any, sIdx: number) => {
              const name = String(space.name ?? "");
              return (
                <a
                  key={`${gIdx}-${sIdx}`}
                  href={`#activityspace-${slug(name)}`}
                  style={subItemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                    e.currentTarget.style.borderLeftColor = "var(--pf-v6-global--primary-color--100)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderLeftColor = "transparent";
                  }}
                >
                  {name}
                </a>
              );
            });
          })}
        </div>
      )}
    </nav>
  );
}

// ========================================================================
// MAIN COMPONENT
// ========================================================================

export function BrowseView({
  doc,
  originalDoc,
  libraryId,
  methodComposition,
  embed = false,
}: {
  doc?: unknown;
  originalDoc?: unknown;
  libraryId?: string;
  methodComposition?: Method | null;
  embed?: boolean;
}) {
  const { t } = useLanguagePack();
  const [apiData, setApiData] = useState<{
    original: unknown;
    merged: unknown;
    methodComposition?: Method | null;
  } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch from API if libraryId is provided
  useEffect(() => {
    if (!libraryId) return;

    let cancelled = false;
    setApiLoading(true);
    setApiError(null);

    (async () => {
      try {
        const res = await fetch(`/api/library/browse/${encodeURIComponent(libraryId)}`);
        if (!res.ok) {
          if (!cancelled) setApiError(`Failed to load document (${res.status})`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setApiData({
          original: data.original,
          merged: data.merged,
          methodComposition: data.metadata?.methodComposition ?? null,
        });
      } catch (e) {
        if (!cancelled) setApiError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  // Determine effective doc based on mode (API or props)
  const effectiveOriginalDoc = libraryId ? apiData?.original : (originalDoc ?? doc);
  const effectiveMergedDoc = libraryId ? apiData?.merged : doc;
  const effectiveMethodComposition = libraryId ? apiData?.methodComposition : methodComposition;

  // Handle legacy behavior for doc prop (without libraryId) - must call hooks unconditionally
  const shouldResolveLibrary = useMemo(() => {
    if (libraryId) return false; // Don't resolve if using API
    return practiceNeedsLibraryResolution(effectiveMergedDoc);
  }, [libraryId, effectiveMergedDoc]);

  const { loading: resolveBusy, resolved: libraryResolved } = usePracticeLibraryResolveForRender(effectiveMergedDoc, shouldResolveLibrary);

  // Call all hooks before any early returns
  const effectiveDoc = shouldResolveLibrary ? (libraryResolved ?? effectiveMergedDoc) : effectiveMergedDoc;
  const baseline = useMemo(() => (effectiveDoc ? asBaselineDocument(effectiveDoc) : null), [effectiveDoc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !effectiveDoc) return null;
    const withActivities = baselineWithPracticeActivities(effectiveDoc, baseline);
    return enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
  }, [baseline, effectiveDoc]);

  const grouped = useMemo(() => (baselineForRender ? groupByFocus(baselineForRender) : []), [baselineForRender]);

  // Use server-side pre-computed alpha scores (cached)
  const { scoresByFocus: alphaScores, loading: alphaScoresLoading } = useAlphaScores(libraryId, true);

  // Extract assets from the document
  const assets = useMemo(() => {
    if (!effectiveDoc || typeof effectiveDoc !== "object") return [];
    const doc = effectiveDoc as Record<string, unknown>;
    return (doc.assets as Asset[]) || [];
  }, [effectiveDoc]);

  // Build alias lookup map from practiceElementAliases
  const aliasMap = useMemo(() => {
    const sourceDoc = effectiveDoc && typeof effectiveDoc === "object" ? (effectiveDoc as Record<string, unknown>) : {};
    const aliases = Array.isArray(sourceDoc.practiceElementAliases) ? sourceDoc.practiceElementAliases : undefined;
    return buildPracticeElementAliasLookup(aliases);
  }, [effectiveDoc]);

  // Now safe to do early returns after all hooks have been called
  if (libraryId && apiLoading) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--pf-v6-global--Color--200)" }}>
        Loading from library…
      </div>
    );
  }

  if (libraryId && apiError) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--pf-v6-global--Color--200)" }}>
        Error: {apiError}
      </div>
    );
  }

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
  // Use effectiveOriginalDoc which comes from API or props
  const originalDocRecord = effectiveOriginalDoc && typeof effectiveOriginalDoc === "object"
    ? (effectiveOriginalDoc as Record<string, unknown>)
    : {};

  return (
    <>
      {!embed && <style>{`html { scroll-behavior: smooth; }`}</style>}
      <div style={{
        display: "flex",
        fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
        minHeight: embed ? undefined : "100vh",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
      }}>
        {!embed && <NavigationSidebar doc={baselineForRender} grouped={grouped} />}

      <main style={{
        flex: 1,
        padding: embed ? "1.5rem" : "3rem 4rem",
        maxWidth: embed ? "none" : "1400px",
        minWidth: 0,
      }}>
        <OutlineSection doc={sourceDocRecord} grouped={grouped} aliasMap={aliasMap} />
        <Divider style={{ margin: "3rem 0" }} />

        <ExecutiveContext doc={baselineForRender} methodComposition={effectiveMethodComposition} aliasMap={aliasMap} />
        <Divider style={{ margin: "3rem 0" }} />

        <MethodFocus doc={sourceDocRecord} baseline={baselineForRender} grouped={grouped} methodComposition={effectiveMethodComposition} aliasMap={aliasMap} assets={assets} alphaScores={alphaScores} />
        <Divider style={{ margin: "3rem 0" }} />

        <LifecycleOrchestration doc={sourceDocRecord} baseline={baselineForRender} aliasMap={aliasMap} />
        <Divider style={{ margin: "3rem 0" }} />

        <CoreConcepts doc={baselineForRender} originalDoc={originalDocRecord} grouped={grouped} aliasMap={aliasMap} methodComposition={effectiveMethodComposition} />
        <Divider style={{ margin: "3rem 0" }} />

        <EvidentaryArtifacts doc={sourceDocRecord} aliasMap={aliasMap} />
        <Divider style={{ margin: "3rem 0" }} />

        <ExecutionAndRoles doc={baselineForRender} originalDoc={originalDocRecord} grouped={grouped} aliasMap={aliasMap} methodComposition={effectiveMethodComposition} />
      </main>
      </div>
    </>
  );
}
