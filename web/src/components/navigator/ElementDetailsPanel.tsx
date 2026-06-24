"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Title } from "@patternfly/react-core";
import type { PracticeBaseline, Asset } from "@/lib/types";
import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import type {
  FocusGroup as AlphaScoreFocusGroup,
  ActivitySpaceFocusGroup
} from "@/lib/analysis/methodFocus";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { PatternTable } from "./PatternTable";
import { OverviewDiagram } from "./OverviewDiagram";
import { AliasedName } from "../common/AliasedName";

interface ElementDetailsPanelProps {
  selectedElement: {
    type: "alpha" | "activitySpace" | "activity" | "workProduct" | "pattern" | "references" | "overview" | "introduction";
    data: any;
    specificLevelOfDetail?: string;
  } | null;
  baseline: PracticeBaseline;
  libraryId: string | null;
  dependencyArtifacts: BrowseDependencyArtifact[];
  mode: "concerns" | "activities";
  alphaScores: Map<string, AlphaScoreFocusGroup>;
  activitySpaceScores?: Map<string, ActivitySpaceFocusGroup>;
  onSetSecondaryElement: (element: string | null) => void;
  secondaryElementName: string | null;
}

// Helper function to render narratives
function renderNarratives(narratives: any[], baseline: PracticeBaseline) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {narratives.map((narrative: any, idx: number) => (
        <div key={idx}>
          <Title headingLevel="h3" size="md" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
            {narrative.name}
          </Title>
          <p style={{ fontSize: "0.875rem", lineHeight: "1.6", color: "var(--pf-v6-global--Color--100)", marginBottom: "0.75rem" }}>
            {narrative.description}
          </p>
          {narrative.narrativeContexts && narrative.narrativeContexts.length > 0 && (
            <ol style={{
              paddingLeft: "1.5rem",
              listStyleType: "decimal",
              margin: 0,
              marginBottom: "0.75rem",
            }}>
              {narrative.narrativeContexts.map((ctx: any, ctxIdx: number) => (
                <li
                  key={ctxIdx}
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: "1.6",
                    color: "var(--pf-v6-global--Color--100)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {ctx.context}
                </li>
              ))}
            </ol>
          )}
          {narrative.citationNames && narrative.citationNames.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Further Reading
              </div>
              <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", margin: 0 }}>
                {narrative.citationNames.map((citationName: string, citIdx: number) => {
                  const citation = baseline.citations?.find((c: any) => c.name === citationName);
                  if (!citation) return null;

                  const formattedAuthors = citation.authors?.join(", ") || "";
                  const citationText = `${citation.name} (${formattedAuthors}, ${citation.date})`;

                  return (
                    <li key={citIdx} style={{ marginBottom: "0.375rem" }}>
                      {citation.url ? (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--pf-v6-global--link--Color)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "baseline",
                            gap: "0.25rem",
                          }}
                        >
                          <span>{citationText}</span>
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.625rem" }} />
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--100)" }}>
                          {citationText}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper function to render states list
function renderStatesList(
  data: any,
  assets: Asset[],
  parentAsset: Asset | null,
  secondaryElementName: string | null,
  onSetSecondaryElement: (element: string | null) => void
) {
  const totalStates = data.states.length;

  return (
    <div>
      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
        States
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {data.states
          .sort((a: any, b: any) => a.seq - b.seq)
          .map((state: any, idx: number) => {
            const isSelected = secondaryElementName === state.name;

            // Generate a color based on progression (gradient from blue to green)
            const hue = 210 + (idx / Math.max(totalStates - 1, 1)) * 90; // 210 (blue) to 300 (purple/green)
            const progressColor = `hsl(${hue}, 70%, 50%)`;

            return (
              <button
                key={state.name}
                onClick={() => onSetSecondaryElement(isSelected ? null : state.name)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  border: isSelected
                    ? "3px solid var(--pf-v6-global--primary-color--100)"
                    : "2px solid var(--pf-v6-global--BorderColor--100)",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                    : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  position: "relative",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
                  }
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: progressColor,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    flexShrink: 0,
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  {state.seq}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                    <AliasedName kind="state" name={state.name} browse={false} />
                  </div>
                </div>
                {isSelected && (
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 400,
                      color: "var(--pf-v6-global--Color--200)",
                      lineHeight: 1,
                      flexShrink: 0,
                      paddingTop: "0.125rem",
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

// Helper function to render activities list
function renderActivitiesList(
  data: any,
  assets: Asset[],
  onSetSecondaryElement: (element: string | null) => void
) {
  return (
    <div>
      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
        Activities
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.activities.map((activity: any) => {
          const activityAssetRef = activity.assetNames?.find((a: any) => a.type === "icon");
          const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, assets) : null;

          return (
            <button
              key={activity.name}
              onClick={() => onSetSecondaryElement(activity.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                border: "2px solid var(--pf-v6-global--BorderColor--100)",
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
              }}
            >
              {activityAsset && <IconAsset asset={activityAsset} size={20} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                  <AliasedName kind="activity" name={activity.name} browse={false} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


export function ElementDetailsPanel({
  selectedElement,
  baseline,
  libraryId,
  dependencyArtifacts,
  mode,
  alphaScores,
  activitySpaceScores,
  onSetSecondaryElement,
  secondaryElementName,
}: ElementDetailsPanelProps) {
  // State to hold the practice library ID lookup
  const [practiceLibraryIds, setPracticeLibraryIds] = useState<Record<string, string>>({});

  // Fetch library IDs for practices when component mounts
  useEffect(() => {
    async function fetchPracticeIds() {
      try {
        // Add withBody=1 to get the document bodies
        const response = await fetch('/api/documents?withBody=1');
        if (!response.ok) {
          console.error('Failed to fetch documents:', response.status);
          return;
        }
        const data = await response.json();

        // Build a map of practice names to their library IDs
        const idMap: Record<string, string> = {};
        for (const doc of data.documents || []) {
          if (doc.body?.name) {
            idMap[doc.body.name] = doc.id;
          }
        }
        console.log('Practice library ID map:', idMap);
        setPracticeLibraryIds(idMap);
      } catch (err) {
        console.error('Failed to fetch practice library IDs:', err);
      }
    }
    fetchPracticeIds();
  }, []);

  if (!selectedElement) {
    return (
      <main
        style={{
          padding: "3rem 2rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <Title headingLevel="h2" size="xl" style={{ color: "var(--pf-v6-global--Color--200)" }}>
            Select an element to view details
          </Title>
          <p style={{ marginTop: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
            Use the navigation sidebar to browse concerns (alphas) or activities and select an
            element to view its full details here.
          </p>
        </div>
      </main>
    );
  }

  const { type, data } = selectedElement;
  const assets = baseline.assets ?? [];

  // Get icon for the element
  const assetRef = data.assetNames?.find((a: any) => a.type === "icon");
  const asset = assetRef ? findAsset(assetRef.assetName, assets) : null;

  // Get description
  const description = practiceElementDescriptionForDisplay(data);

  // Determine what we have to display
  const hasNarratives = data.narratives && data.narratives.length > 0;
  const hasStates = type === "alpha" && data.states;
  const hasActivities = type === "activitySpace" && data.activities && data.activities.length > 0;
  const hasLODs = type === "workProduct" && data.levelsOfDetail && data.levelsOfDetail.length > 0;
  const hasPatternViews = type === "pattern" && data.patternViews && data.patternViews.length > 0;

  return (
    <main
      style={{
        padding: "2rem",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
        {/* Overview: Alphas or Activities diagram - full page view without header */}
        {type === "overview" ? (
          <OverviewDiagram
            baseline={baseline}
            mode={mode}
            alphaScores={alphaScores}
            activitySpaceScores={activitySpaceScores}
            onSelectElement={(elementName) => onSetSecondaryElement(elementName)}
            selectedElement={secondaryElementName}
          />
        ) : (
          <>
            {/* Header with icon and title */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
              {asset && <IconAsset asset={asset} size={32} style={{ flexShrink: 0, marginTop: "0.25rem" }} />}
              <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <Title
                    headingLevel="h1"
                    size="2xl"
                    style={{
                      color: "var(--pf-v6-global--Color--100)",
                      marginBottom: "0.5rem",
                      fontWeight: 700,
                    }}
                  >
                    <AliasedName kind={type} name={data.name} browse={false} />
                  </Title>
                  <p
                    style={{
                      fontSize: "1rem",
                      lineHeight: "1.6",
                      color: "var(--pf-v6-global--Color--100)",
                    }}
                  >
                    {description}
                  </p>
                </div>
                {(() => {
                  // Skip for references view
                  if (type === "references") {
                    return null;
                  }

                  // Get the practice name - either from sourcePracticeName or baseline
                  const sourcePracticeName = data.sourcePracticeName;
                  const practiceName = sourcePracticeName || baseline.name;

                  if (!practiceName) {
                    return null;
                  }

                  // Look up the practice's library ID by name
                  const practiceId = practiceLibraryIds[practiceName];

                  console.log('Looking up practice:', {
                    practiceName,
                    foundId: practiceId,
                    availableIds: Object.keys(practiceLibraryIds)
                  });

                  // If practice not found in library, show name without edit button
                  if (!practiceId) {
                    return (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontStyle: "italic",
                          color: "var(--pf-v6-global--Color--200)",
                          whiteSpace: "nowrap",
                          alignSelf: "flex-start",
                          marginTop: "0.25rem",
                        }}
                        title={`Practice: ${practiceName} (not found in library)`}
                      >
                        {practiceName}
                      </div>
                    );
                  }

                  // Practice found - show with edit icon that opens the specific practice
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.75rem",
                        fontStyle: "italic",
                        alignSelf: "flex-start",
                        marginTop: "0.25rem",
                      }}
                    >
                      <span style={{ color: "var(--pf-v6-global--Color--200)" }}>
                        {practiceName}
                      </span>
                      <Link
                        href={`/practice-author?libraryId=${encodeURIComponent(practiceId)}`}
                        style={{
                          color: "var(--pf-v6-global--link--Color)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          transition: "color 0.2s",
                        }}
                        title={`Edit ${practiceName}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--pf-v6-global--primary-color--200)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
                        }}
                      >
                        <i className="fa-solid fa-pen-to-square" style={{ fontSize: "0.75rem" }} />
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Introduction view: Narratives */}
            {type === "introduction" && data.narratives && data.narratives.length > 0 && (
              <div style={{ marginTop: "2rem", marginBottom: "2.5rem" }}>
                {renderNarratives(data.narratives, baseline)}
              </div>
            )}

            {/* References view: Alphabetically sorted citations */}
            {type === "references" && (
          <div style={{ marginTop: "2rem" }}>
            {/* Narratives first (with contexts and citations) */}
            {data.narratives && data.narratives.length > 0 && (
              <div style={{ marginBottom: "2.5rem" }}>
                {renderNarratives(data.narratives, baseline)}
              </div>
            )}

            {/* References section */}
            <Title headingLevel="h2" size="lg" style={{ marginBottom: "1.5rem", fontWeight: 600 }}>
              References
            </Title>
            {data.citations && data.citations.length > 0 ? (
              <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[...data.citations]
                  .sort((a: any, b: any) => {
                    // Sort by first author's last name, then by date
                    const aAuthor = a.authors?.[0] || "";
                    const bAuthor = b.authors?.[0] || "";
                    const authorCompare = aAuthor.localeCompare(bAuthor);
                    if (authorCompare !== 0) return authorCompare;
                    return (a.date || "").localeCompare(b.date || "");
                  })
                  .map((citation: any, idx: number) => {
                    // Format: Authors (Date). Title. Source.
                    const authors = citation.authors?.join(", ") || "Unknown Author";
                    const date = citation.date || "n.d.";
                    const title = citation.name || "Untitled";
                    const source = citation.source || "";
                    const description = citation.description || "";

                    return (
                      <li
                        key={idx}
                        style={{
                          fontSize: "0.8125rem",
                          lineHeight: "1.6",
                          color: "var(--pf-v6-global--Color--100)",
                        }}
                      >
                        <div>
                          <div>
                            <span style={{ fontWeight: 500 }}>{authors}</span>
                            {" "}
                            <span style={{ color: "var(--pf-v6-global--Color--200)" }}>({date}).</span>
                            {" "}
                            {citation.url ? (
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "var(--pf-v6-global--link--Color)",
                                  textDecoration: "none",
                                }}
                              >
                                <em>{title}</em>
                                {" "}
                                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.625rem" }} />
                              </a>
                            ) : (
                              <em>{title}</em>
                            )}
                            {source && (
                              <>
                                .{" "}
                                <span style={{ color: "var(--pf-v6-global--Color--200)" }}>{source}</span>
                              </>
                            )}
                            .
                          </div>
                          {description && (
                            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", lineHeight: "1.5" }}>
                              {description}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                No references found.
              </p>
              )}
            </div>
          )}

          {/* Pattern-specific: Full-width table view */}
          {type === "pattern" && hasPatternViews && (
          <div style={{ marginTop: "2rem" }}>
            <PatternTable
              pattern={data}
              baseline={baseline}
              assets={assets}
              selectedElement={secondaryElementName}
              onSelectAlpha={(alphaName) => onSetSecondaryElement(alphaName)}
              onSelectState={(alphaName, stateName) => onSetSecondaryElement(`${alphaName}::${stateName}`)}
            />
            </div>
          )}


          {/* Type-specific sections */}
          {type !== "pattern" && type !== "references" && (
          <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
            {/* If no narratives, show states/activities/LODs on the left */}
            {!hasNarratives && (hasStates || hasActivities || hasLODs) ? (
            <>
              <div style={{ flex: "0 0 45%", minWidth: "15rem" }}>
                {hasStates && renderStatesList(data, assets, asset, secondaryElementName, onSetSecondaryElement)}
                {hasActivities && renderActivitiesList(data, assets, onSetSecondaryElement)}
                {hasLODs && type === "workProduct" && (
                  <div>
                    <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                      Levels of Detail
                    </Title>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(() => {
                        const filteredLODs = data.levelsOfDetail
                          .filter((lod: any) => !selectedElement?.specificLevelOfDetail || lod.name === selectedElement.specificLevelOfDetail)
                          .sort((a: any, b: any) => a.seq - b.seq);
                        const totalLODs = filteredLODs.length;

                        return filteredLODs.map((lod: any, idx: number) => {
                          const isSelected = secondaryElementName === lod.name;

                          // Generate a color based on progression (gradient from blue to green)
                          const hue = 210 + (idx / Math.max(totalLODs - 1, 1)) * 90; // 210 (blue) to 300 (purple/green)
                          const progressColor = `hsl(${hue}, 70%, 50%)`;

                          return (
                            <button
                              key={lod.name}
                              onClick={() => onSetSecondaryElement(isSelected ? null : lod.name)}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.75rem",
                                padding: "0.875rem 1rem",
                                border: isSelected
                                  ? "3px solid var(--pf-v6-global--primary-color--100)"
                                  : "2px solid var(--pf-v6-global--BorderColor--100)",
                                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                backgroundColor: isSelected
                                  ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                  : "white",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.2s",
                                position: "relative",
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.08)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "white";
                                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
                                }
                              }}
                            >
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: progressColor,
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: "0.9375rem",
                                  flexShrink: 0,
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                                }}
                              >
                                {lod.seq}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                                  {lod.name}
                                </div>
                              </div>
                              {isSelected && (
                                <span
                                  style={{
                                    fontSize: "1.25rem",
                                    fontWeight: 400,
                                    color: "var(--pf-v6-global--Color--200)",
                                    lineHeight: 1,
                                    flexShrink: 0,
                                    paddingTop: "0.125rem",
                                  }}
                                >
                                  ×
                                </span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }} />
            </>
          ) : (
            <>
              {/* Left column: Narratives - 55% (skip for introduction since it's shown above) */}
              <div style={{ flex: "0 0 55%", minWidth: 0 }}>
                {hasNarratives && type !== "introduction" && renderNarratives(data.narratives, baseline)}

                {/* Activity-specific sections */}
                {type === "activity" && (
                  <div style={{ marginTop: hasNarratives ? "2rem" : 0 }}>
                    {/* Contributes To */}
                    {data.contributesTo && data.contributesTo.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                          Contributes To
                        </Title>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {data.contributesTo.map((contrib: any, idx: number) => {
                            const alpha = baseline.alphas.find((a) => a.name === contrib.alphaName);
                            const alphaAssetRef = alpha?.assetNames?.find((a: any) => a.type === "icon");
                            const alphaAsset = alphaAssetRef ? findAsset(alphaAssetRef.assetName, assets) : null;

                            const elementKey = `${contrib.alphaName}::${contrib.stateName}`;
                            const isSelected = secondaryElementName === elementKey;

                            return (
                              <button
                                key={idx}
                                onClick={() => onSetSecondaryElement(isSelected ? null : elementKey)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.5rem",
                                  padding: "0.75rem",
                                  border: isSelected
                                    ? "3px solid var(--pf-v6-global--primary-color--100)"
                                    : "2px solid var(--pf-v6-global--BorderColor--100)",
                                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                  backgroundColor: isSelected
                                    ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                    : "var(--pf-v6-global--BackgroundColor--100)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  width: "100%",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                                  }
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                                  {alphaAsset && <IconAsset asset={alphaAsset} size={16} style={{ flexShrink: 0 }} />}
                                  <div style={{ fontSize: "0.8125rem", minWidth: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{contrib.alphaName}</div>
                                    <div style={{ color: "var(--pf-v6-global--Color--200)" }}>→ {contrib.stateName}</div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span
                                    style={{
                                      fontSize: "1rem",
                                      fontWeight: 400,
                                      color: "var(--pf-v6-global--Color--200)",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ×
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Works On */}
                    {data.worksOn && data.worksOn.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                          Works On
                        </Title>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {data.worksOn.map((wp: any, idx: number) => {
                            const workProduct = baseline.workProducts?.find((w) => w.name === wp.workProductName);
                            const wpAssetRef = workProduct?.assetNames?.find((a: any) => a.type === "icon");
                            const wpAsset = wpAssetRef ? findAsset(wpAssetRef.assetName, assets) : null;

                            const elementKey = `${wp.workProductName}::${wp.levelOfDetailName}`;
                            const isSelected = secondaryElementName === elementKey;

                            return (
                              <button
                                key={idx}
                                onClick={() => onSetSecondaryElement(isSelected ? null : elementKey)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.5rem",
                                  padding: "0.75rem",
                                  border: isSelected
                                    ? "3px solid var(--pf-v6-global--primary-color--100)"
                                    : "2px solid var(--pf-v6-global--BorderColor--100)",
                                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                  backgroundColor: isSelected
                                    ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                    : "var(--pf-v6-global--BackgroundColor--100)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  width: "100%",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                                  }
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                                  {wpAsset && <IconAsset asset={wpAsset} size={16} style={{ flexShrink: 0 }} />}
                                  <div style={{ fontSize: "0.8125rem", minWidth: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{wp.workProductName}</div>
                                    <div style={{ color: "var(--pf-v6-global--Color--200)" }}>→ {wp.levelOfDetailName}</div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span
                                    style={{
                                      fontSize: "1rem",
                                      fontWeight: 400,
                                      color: "var(--pf-v6-global--Color--200)",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ×
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recommended or Required Competencies */}
                    {(() => {
                      // Show recommendedCompetencyLevels if they exist, otherwise show requiredCompetencies
                      const hasRecommended = data.recommendedCompetencyLevels && data.recommendedCompetencyLevels.length > 0;
                      const hasRequired = data.requiredCompetencies && data.requiredCompetencies.length > 0;

                      if (!hasRecommended && !hasRequired) return null;

                      const isRecommended = hasRecommended;
                      const title = isRecommended ? "Recommended Competencies" : "Required Competencies";

                      return (
                        <div>
                          <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                            {title}
                          </Title>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {isRecommended
                              ? data.recommendedCompetencyLevels.map((comp: any, idx: number) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.375rem 0.75rem",
                                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                                      color: "var(--pf-v6-global--Color--100)",
                                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                                    }}
                                  >
                                    {comp.competencyName} → {comp.competencyLevelName}
                                  </span>
                                ))
                              : data.requiredCompetencies.map((comp: string, idx: number) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.375rem 0.75rem",
                                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                                      color: "var(--pf-v6-global--Color--100)",
                                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                                    }}
                                  >
                                    {comp}
                                  </span>
                                ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Right column: States/Activities/Practices - 45% */}
              {hasStates && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  {renderStatesList(data, assets, asset, secondaryElementName, onSetSecondaryElement)}
                </div>
              )}

              {hasActivities && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  {renderActivitiesList(data, assets, onSetSecondaryElement)}
                </div>
              )}

              {/* Introduction-specific: Show practices for methods */}
              {/* For methods: show practices */}
              {type === "introduction" && ((data.practices && Array.isArray(data.practices) && data.practices.length > 0) || (data.practiceNames && Array.isArray(data.practiceNames) && data.practiceNames.length > 0)) && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                    Practices
                  </Title>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {/* Show practices first - handle both embedded (data.practices) and named (data.practiceNames) */}
                    {(data.practices ?? data.practiceNames ?? []).map((practice: any, idx: number) => {
                      const practiceName = typeof practice === "string" ? practice : (practice.name || "Unknown Practice");
                      const isSelected = secondaryElementName === practiceName;

                      return (
                        <button
                          key={idx}
                          onClick={() => onSetSecondaryElement(isSelected ? null : practiceName)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            border: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "2px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                              : "var(--pf-v6-global--BackgroundColor--100)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <i className="fa-solid fa-puzzle-piece" style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }} />
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                            {practiceName}
                          </div>
                        </button>
                      );
                    })}

                    {/* Show baseline at the end - handle both embedded (data.baselinePractice) and named (data.baselinePracticeName) */}
                    {(() => {
                      const baselineName = data.baselinePracticeName || data.baselinePractice?.name;
                      if (!baselineName) return null;

                      const isSelected = secondaryElementName === baselineName;

                      return (
                        <button
                          onClick={() => onSetSecondaryElement(isSelected ? null : baselineName)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            border: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "2px solid var(--pf-v6-global--primary-color--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                              : "var(--pf-v6-global--BackgroundColor--100)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <i className="fa-solid fa-layer-group" style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--primary-color--100)" }} />
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                            {baselineName}
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* For practices: show practice dependencies */}
              {type === "introduction" && data.practiceDependencyNames && Array.isArray(data.practiceDependencyNames) && data.practiceDependencyNames.length > 0 && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                    Practice Dependencies
                  </Title>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {/* Show practice dependencies first */}
                    {data.practiceDependencyNames.map((practiceName: string, idx: number) => {
                      const isSelected = secondaryElementName === practiceName;

                      return (
                        <button
                          key={idx}
                          onClick={() => onSetSecondaryElement(isSelected ? null : practiceName)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            border: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "2px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                              : "var(--pf-v6-global--BackgroundColor--100)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <i className="fa-solid fa-puzzle-piece" style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }} />
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                            {practiceName}
                          </div>
                        </button>
                      );
                    })}

                    {/* Show baseline at the end - handle both embedded (data.baselinePractice) and named (data.baselinePracticeName) */}
                    {(() => {
                      const baselineName = data.baselinePracticeName || data.baselinePractice?.name;
                      if (!baselineName) return null;

                      const isSelected = secondaryElementName === baselineName;

                      return (
                        <button
                          onClick={() => onSetSecondaryElement(isSelected ? null : baselineName)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            border: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "2px solid var(--pf-v6-global--primary-color--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                              : "var(--pf-v6-global--BackgroundColor--100)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <i className="fa-solid fa-layer-group" style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--primary-color--100)" }} />
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                            {baselineName}
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {hasLODs && type === "workProduct" && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                    Levels of Detail
                  </Title>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(() => {
                      const filteredLODs = data.levelsOfDetail
                        .filter((lod: any) => !selectedElement?.specificLevelOfDetail || lod.name === selectedElement.specificLevelOfDetail)
                        .sort((a: any, b: any) => a.seq - b.seq);
                      const totalLODs = filteredLODs.length;

                      return filteredLODs.map((lod: any, idx: number) => {
                        const isSelected = secondaryElementName === lod.name;

                        // Generate a color based on progression (gradient from blue to green)
                        const hue = 210 + (idx / Math.max(totalLODs - 1, 1)) * 90; // 210 (blue) to 300 (purple/green)
                        const progressColor = `hsl(${hue}, 70%, 50%)`;

                        return (
                          <button
                            key={lod.name}
                            onClick={() => onSetSecondaryElement(isSelected ? null : lod.name)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.75rem",
                              padding: "0.875rem 1rem",
                              border: isSelected
                                ? "3px solid var(--pf-v6-global--primary-color--100)"
                                : "2px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: isSelected
                                ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                : "white",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.2s",
                              position: "relative",
                              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.08)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "white";
                                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
                              }
                            }}
                          >
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: progressColor,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.9375rem",
                                flexShrink: 0,
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                              }}
                            >
                              {lod.seq}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                                {lod.name}
                              </div>
                            </div>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 400,
                                  color: "var(--pf-v6-global--Color--200)",
                                  lineHeight: 1,
                                  flexShrink: 0,
                                  paddingTop: "0.125rem",
                                }}
                              >
                                ×
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </>
            )}
            </div>
          )}

          {/* Alpha-specific: Relates To - shown regardless of narratives */}
          {type === "alpha" && data.relatesTo && data.relatesTo.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
              Relates To
            </Title>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "40rem" }}>
              {data.relatesTo.map((relation: any, idx: number) => {
                const relatedAlpha = baseline.alphas.find((a) => a.name === relation.alphaName);
                const alphaAssetRef = relatedAlpha?.assetNames?.find((a: any) => a.type === "icon");
                const alphaAsset = alphaAssetRef ? findAsset(alphaAssetRef.assetName, assets) : null;
                const isSelected = secondaryElementName === relation.alphaName;

                return (
                  <button
                    key={idx}
                    onClick={() => onSetSecondaryElement(isSelected ? null : relation.alphaName)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      border: isSelected
                        ? "3px solid var(--pf-v6-global--primary-color--100)"
                        : "2px solid var(--pf-v6-global--BorderColor--100)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                        : "var(--pf-v6-global--BackgroundColor--100)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                      }
                    }}
                  >
                    {alphaAsset && <IconAsset asset={alphaAsset} size={16} style={{ flexShrink: 0 }} />}
                    <div style={{ fontSize: "0.8125rem", flex: 1 }}>
                      <span style={{ fontStyle: "italic", color: "var(--pf-v6-global--Color--200)" }}>
                        {relation.relationship}
                      </span>
                      {" "}
                      <span style={{ fontWeight: 600 }}>
                        {relation.alphaName}
                      </span>
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: 400,
                          color: "var(--pf-v6-global--Color--200)",
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
          </>
        )}
      </div>
    </main>
  );
}
