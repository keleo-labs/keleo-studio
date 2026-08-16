"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Title } from "@patternfly/react-core";
import type { PracticeBaseline, Asset } from "@/lib/types";
import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import type { DependencyDiagramLayout } from "@/lib/diagrams/dependencyTree";
import { DependencyDiagram } from "./DependencyDiagram";
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
import { WorkProductQualifiedName } from "../common/WorkProductQualifiedName";
import { AlphaStateTable } from "./AlphaStateTable";
import { WorkProductLODTable } from "./WorkProductLODTable";
import { BackgroundBlock, TestBlock, ExamplesBlock } from "./GherkinBlock";
import { NarrativesBlock } from "./NarrativesBlock";
import { ElementTagsBadges } from "./ElementTagsBadges";

interface ElementDetailsPanelProps {
  selectedElement: {
    type: "alpha" | "activitySpace" | "activity" | "workProduct" | "pattern" | "references" | "overview" | "introduction" | "personaGroup" | "persona" | "competency";
    data: any;
    specificLevelOfDetail?: string;
  } | null;
  baseline: PracticeBaseline;
  libraryId: string | null;
  dependencyArtifacts: BrowseDependencyArtifact[];
  dependencyDiagramLayout?: DependencyDiagramLayout;
  mode: "concerns" | "activities";
  alphaScores: Map<string, AlphaScoreFocusGroup>;
  activitySpaceScores?: Map<string, ActivitySpaceFocusGroup>;
  onSetSecondaryElement: (element: string | null) => void;
  secondaryElementName: string | null;
  onSetMode?: (mode: "concerns" | "activities") => void;
  onSetSelectedElement?: (element: string | null) => void;
}


function CollapsibleSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--pf-v6-global--Color--200)",
          marginBottom: expanded ? "0.5rem" : 0,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", display: "inline-block" }}>
          &#9654;
        </span>
        {title}
        <span style={{
          fontSize: "0.625rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
          borderRadius: "8px",
          padding: "0.0625rem 0.375rem",
          fontWeight: 400,
        }}>
          {count}
        </span>
      </button>
      {expanded && children}
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


function DownloadStaticSiteButton({ libraryId }: { libraryId: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/documents/${libraryId}/static-site`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        alert(err.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] ?? "static-site.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--pf-v6-global--BorderColor--100)" }}>
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.25rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
          cursor: downloading ? "wait" : "pointer",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--pf-v6-global--Color--100)",
          opacity: downloading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!downloading) {
            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
        }}
      >
        <i className={downloading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-download"} style={{ fontSize: "0.875rem" }} />
        <span>{downloading ? "Preparing download…" : "Download as static site"}</span>
      </button>
      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
        Downloads a ZIP with markdown files and SVGs for use with MkDocs or Hugo.
      </div>
    </div>
  );
}

function DownloadTemplateButton({ libraryId, wpName }: { libraryId: string; wpName: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/documents/${libraryId}/work-product-template?wp=${encodeURIComponent(wpName)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        alert(err.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] ?? "template.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
          cursor: downloading ? "wait" : "pointer",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--pf-v6-global--Color--100)",
          opacity: downloading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!downloading) {
            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
        }}
      >
        <i className={downloading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-file-lines"} style={{ fontSize: "0.875rem" }} />
        <span>{downloading ? "Generating template…" : "Download document template"}</span>
      </button>
      <div style={{ marginTop: "0.375rem", fontSize: "0.7rem", color: "var(--pf-v6-global--Color--200)" }}>
        Generates a Markdown template with guidance from this work product's practice definition.
      </div>
    </div>
  );
}

export function ElementDetailsPanel({
  selectedElement,
  baseline,
  libraryId,
  dependencyArtifacts,
  dependencyDiagramLayout,
  mode,
  alphaScores,
  activitySpaceScores,
  onSetSecondaryElement,
  secondaryElementName,
  onSetMode,
  onSetSelectedElement,
}: ElementDetailsPanelProps) {
  // Helper to set secondary element with automatic mode switching
  const setSecondaryWithModeSwitch = (elementName: string | null, elementType?: "alpha" | "activity") => {
    if (elementName && elementType && onSetMode) {
      // Switch mode based on element type
      if (elementType === "alpha" && mode !== "concerns") {
        onSetMode("concerns");
      } else if (elementType === "activity" && mode !== "activities") {
        onSetMode("activities");
      }
    }
    onSetSecondaryElement(elementName);
  };

  // Practice library ID lookup for generating links to other practices
  const [practiceLibraryIds, setPracticeLibraryIds] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchPracticeIds() {
      try {
        const [flatRes, indexRes] = await Promise.all([
          fetch('/api/documents?details=1'),
          fetch('/api/library/index'),
        ]);

        const idMap: Record<string, string> = {};

        if (flatRes.ok) {
          const data = await flatRes.json();
          for (const doc of data.documents || []) {
            if (doc.displayName) {
              idMap[doc.displayName] = doc.id;
            }
          }
        }

        if (indexRes.ok) {
          const indexData = await indexRes.json();
          for (const entry of indexData.entries || []) {
            if (entry.name && !idMap[entry.name]) {
              idMap[entry.name] = `bundle:${entry.activeBundleSlug}/${entry.activeDocumentPath}`;
            }
          }
        }

        setPracticeLibraryIds(idMap);
      } catch (err) {
        console.error('Failed to fetch practice library data:', err);
      }
    }
    fetchPracticeIds();
  }, []);

  const diagramLayout = selectedElement?.type === "introduction" ? dependencyDiagramLayout : undefined;

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
  const hasPersonas = type === "personaGroup" && baseline.personas;
  const hasCompetencies = type === "persona" && data.competencies && data.competencies.length > 0;
  const hasLevels = type === "competency" && data.levels && data.levels.length > 0;

  return (
    <main
      style={{
        padding: "2rem",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: type === "overview" ? "none" : "80rem", margin: "0 auto" }}>
        {/* Overview: Alphas or Activities diagram - full page view without header */}
        {type === "overview" ? (
          <OverviewDiagram
            baseline={baseline}
            mode={mode}
            alphaScores={alphaScores}
            activitySpaceScores={activitySpaceScores}
            onSelectElement={(elementName) => {
              // Determine element type based on current mode and baseline data
              const isAlpha = baseline.alphas.some(a => a.name === elementName);
              const isActivitySpace = baseline.activitySpaces?.some(s => s.name === elementName);
              const isActivity = baseline.activitySpaces?.some(s =>
                s.activities?.some(a => a.name === elementName)
              );

              if (isAlpha) {
                setSecondaryWithModeSwitch(elementName, "alpha");
              } else if (isActivity || isActivitySpace) {
                setSecondaryWithModeSwitch(elementName, "activity");
              } else {
                onSetSecondaryElement(elementName);
              }
            }}
            selectedElement={secondaryElementName}
          />
        ) : (
          <>
            {/* MapsTo parent tile */}
            {type === "alpha" && data.mapsTo && (() => {
              const parentAlpha = baseline.alphas.find((a) => a.name === data.mapsTo);
              const parentAssetRef = parentAlpha?.assetNames?.find((a: any) => a.type === "icon");
              const parentAsset = parentAssetRef ? findAsset(parentAssetRef.assetName, assets) : null;

              return (
                <div
                  onClick={() => {
                    if (onSetSelectedElement) {
                      onSetSelectedElement(data.mapsTo);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.375rem 0.75rem",
                    marginBottom: "0.75rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                    border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    cursor: "pointer",
                    transition: "background-color 0.2s, border-color 0.2s",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--pf-v6-global--Color--100)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                    e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                  }}
                  title={`Maps to ${data.mapsTo}`}
                >
                  {parentAsset && <IconAsset asset={parentAsset} size={16} style={{ flexShrink: 0 }} />}
                  <AliasedName kind="alpha" name={data.mapsTo} browse={false} />
                </div>
              );
            })()}

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
                  {type === "workProduct" && data.partOf && (
                    <div
                      onClick={() => onSetSelectedElement && onSetSelectedElement(data.partOf)}
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.8125rem",
                        color: "var(--pf-v6-global--Color--200)",
                        cursor: onSetSelectedElement ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      Part of:{" "}
                      <span
                        style={{
                          fontWeight: 600,
                          color: onSetSelectedElement ? "var(--pf-v6-global--link--Color)" : "var(--pf-v6-global--Color--100)",
                          transition: "text-decoration 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (onSetSelectedElement) e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {data.partOf}
                      </span>
                    </div>
                  )}
                  {type === "workProduct" && data.mapsTo && (
                    <div
                      onClick={() => onSetSelectedElement && onSetSelectedElement(data.mapsTo)}
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.8125rem",
                        color: "var(--pf-v6-global--Color--200)",
                        cursor: onSetSelectedElement ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      Maps to:{" "}
                      <span
                        style={{
                          fontWeight: 600,
                          color: onSetSelectedElement ? "var(--pf-v6-global--link--Color)" : "var(--pf-v6-global--Color--100)",
                          transition: "text-decoration 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (onSetSelectedElement) e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        <AliasedName kind="workProduct" name={data.mapsTo} browse={false} />
                      </span>
                    </div>
                  )}
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
                        href={practiceId.startsWith('bundle:')
                          ? (() => {
                              const ref = practiceId.slice(7);
                              const slashIdx = ref.indexOf('/');
                              return `/navigator?bundle=${encodeURIComponent(ref.slice(0, slashIdx))}&path=${encodeURIComponent(ref.slice(slashIdx + 1))}&selected=__introduction__`;
                            })()
                          : `/practice-author?libraryId=${encodeURIComponent(practiceId)}`
                        }
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

            {/* Introduction / References: Version and authors at top */}
            {(type === "introduction" || type === "references") && (baseline.version || baseline.schemaVersion || (baseline.authors && baseline.authors.length > 0)) && (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "1rem" }}>
                {baseline.version && (
                  <span>Version {baseline.version}{baseline.schemaVersion && <span style={{ fontStyle: "italic" }}> (schema {baseline.schemaVersion})</span>}</span>
                )}
                {!baseline.version && baseline.schemaVersion && (
                  <span style={{ fontStyle: "italic" }}>Schema {baseline.schemaVersion}</span>
                )}
                {baseline.authors && baseline.authors.length > 0 && (
                  <span>{baseline.authors.join(", ")}</span>
                )}
              </div>
            )}

            {/* Introduction view: Narratives then dependency diagram */}
            {type === "introduction" && data.narratives && data.narratives.length > 0 && (
              <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
                <NarrativesBlock narratives={data.narratives} baseline={baseline} />
              </div>
            )}

            {type === "introduction" && diagramLayout && diagramLayout.nodes.length > 1 && (
              <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
                <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Practice Dependencies
                </Title>
                <DependencyDiagram
                  layout={diagramLayout}
                  selectedElement={secondaryElementName}
                  onSelectElement={onSetSecondaryElement}
                />
              </div>
            )}

            {/* Introduction: Acknowledgements */}
            {type === "introduction" && baseline.acknowledgements && baseline.acknowledgements.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Acknowledgements
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {baseline.acknowledgements.map((ack: any, idx: number) => (
                    <div key={idx} style={{ fontSize: "0.875rem", lineHeight: "1.6", color: "var(--pf-v6-global--Color--100)" }}>
                      <span style={{ fontWeight: 600 }}>{ack.name}</span>
                      {ack.description && (
                        <span style={{ color: "var(--pf-v6-global--Color--200)" }}> — {ack.description}</span>
                      )}
                      {ack.url && (
                        <a
                          href={ack.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginLeft: "0.375rem",
                            color: "var(--pf-v6-global--link--Color)",
                            textDecoration: "none",
                            fontSize: "0.75rem",
                          }}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.625rem" }} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download as static site button - shown at bottom of introduction */}
            {type === "introduction" && libraryId && (
              <DownloadStaticSiteButton libraryId={libraryId} />
            )}

            {/* Introduction / References: Keywords and dates at bottom */}
            {(type === "introduction" || type === "references") && (
              <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                {baseline.keywords && baseline.keywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
                    {baseline.keywords.map((kw, idx) => (
                      <span key={idx} style={{
                        padding: "0.125rem 0.5rem",
                        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  {baseline.createdAt && (
                    <span>Created: {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(baseline.createdAt))}</span>
                  )}
                  {baseline.updatedAt && (
                    <span>Updated: {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(baseline.updatedAt))}</span>
                  )}
                </div>
              </div>
            )}

            {/* References view: Alphabetically sorted citations */}
            {type === "references" && (
          <div style={{ marginTop: "2rem" }}>
            {/* Narratives first (with contexts and citations) */}
            {data.narratives && data.narratives.length > 0 && (
              <div style={{ marginBottom: "2.5rem" }}>
                <NarrativesBlock narratives={data.narratives} baseline={baseline} />
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

          {/* Pattern-specific: Instance names */}
          {type === "pattern" && data.alphaInstanceNames && data.alphaInstanceNames.length > 0 && (
            <CollapsibleSection title="Concern Instances" count={data.alphaInstanceNames.length}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.alphaInstanceNames.map((instance: any, idx: number) => (
                  <div key={idx} style={{ fontSize: "0.8125rem" }}>
                    <span style={{ fontWeight: 600 }}>{instance.name}</span>
                    {instance.description && (
                      <span style={{ color: "var(--pf-v6-global--Color--200)" }}> — {instance.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {type === "pattern" && data.workProductInstanceNames && data.workProductInstanceNames.length > 0 && (
            <CollapsibleSection title="Work Product Instances" count={data.workProductInstanceNames.length}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.workProductInstanceNames.map((instance: any, idx: number) => (
                  <div key={idx} style={{ fontSize: "0.8125rem" }}>
                    <span style={{ fontWeight: 600 }}>{instance.name}</span>
                    {instance.description && (
                      <span style={{ color: "var(--pf-v6-global--Color--200)" }}> — {instance.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Pattern-specific: Full-width table view */}
          {type === "pattern" && hasPatternViews && (
          <div style={{ marginTop: "2rem" }}>
            <PatternTable
              pattern={data}
              baseline={baseline}
              assets={assets}
              selectedElement={secondaryElementName}
              onSelectAlpha={(alphaName) => setSecondaryWithModeSwitch(alphaName, "alpha")}
              onSelectState={(alphaName, stateName) => setSecondaryWithModeSwitch(`${alphaName}::${stateName}`, "alpha")}
            />
            </div>
          )}


          {/* Type-specific sections */}
          {type !== "pattern" && type !== "references" && (
          <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
            {/* If no narratives, show activities/LODs on the left (but NOT states for alphas, NOT LODs for workProducts - those use the table below) */}
            {!hasNarratives && ((type !== "alpha" && type !== "workProduct" && (hasStates || hasActivities || hasLODs)) || (type === "alpha" && (hasActivities || hasLODs)) || (type === "workProduct" && hasActivities)) ? (
            <>
              <div style={{ flex: "0 0 45%", minWidth: "15rem" }}>
                {type === "activitySpace" && data.background && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <BackgroundBlock
                      background={data.background}
                      baseline={baseline}
                      onNavigateToElement={(name) => onSetSecondaryElement(name)}
                    />
                  </div>
                )}
                {hasActivities && renderActivitiesList(data, assets, onSetSecondaryElement)}
              </div>
              <div style={{ flex: 1 }} />
            </>
          ) : (
            <>
              {/* Left column: Narratives - 55% (skip for introduction since it's shown above) */}
              <div style={{ flex: "0 0 55%", minWidth: 0 }}>
                {hasNarratives && type !== "introduction" && <NarrativesBlock narratives={data.narratives} baseline={baseline} />}

                {/* ActivitySpace background prerequisites */}
                {type === "activitySpace" && data.background && (
                  <div style={{ marginTop: hasNarratives ? "2rem" : 0, marginBottom: "1.5rem" }}>
                    <BackgroundBlock
                      background={data.background}
                      baseline={baseline}
                      onNavigateToElement={(name) => onSetSecondaryElement(name)}
                    />
                  </div>
                )}

                {/* ActivitySpace: Required Competencies */}
                {type === "activitySpace" && data.requiredCompetencies && data.requiredCompetencies.length > 0 && (
                  <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                    <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                      Required Competencies
                    </Title>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {data.requiredCompetencies.map((comp: string, idx: number) => (
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
                )}

                {/* ActivitySpace: Involves (persona groups) */}
                {type === "activitySpace" && data.involves && data.involves.length > 0 && (
                  <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                    <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                      Involves
                    </Title>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {data.involves.map((groupName: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => onSetSecondaryElement(groupName)}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.375rem 0.75rem",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                            color: "var(--pf-v6-global--Color--100)",
                            border: "1px solid var(--pf-v6-global--BorderColor--100)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                          }}
                        >
                          {groupName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Examples (alpha instances matching this alpha) */}
                {type === "alpha" && (() => {
                  const instances = (baseline.alphaInstances ?? []).filter((i: any) => i.alphaName === data.name);
                  return instances.length > 0 ? (
                    <div style={{ marginTop: hasNarratives ? "2rem" : 0 }}>
                      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                        Common Examples
                      </Title>
                      <ul style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--100)", margin: 0, paddingLeft: "1.25rem", listStyleType: "disc" }}>
                        {instances.map((instance: any) => (
                          <li key={instance.name} style={{ marginBottom: "0.25rem", display: "list-item" }}>
                            <span style={{ fontWeight: 600 }}>{instance.name}:</span>{" "}
                            {instance.description || ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })()}

                {/* Reference Examples (curated AlphaInstance references matching this alpha) */}
                {type === "alpha" && (() => {
                  const refs = ((baseline as any).references ?? []).filter((r: any) => r.alphaName === data.name);
                  if (!refs.length) return null;
                  return (
                    <div style={{ marginTop: "2rem" }}>
                      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                        Reference Examples
                      </Title>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {refs.map((ref: any) => (
                          <div
                            key={ref.name}
                            style={{
                              padding: "0.75rem",
                              border: "1px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {ref.name}
                            </div>
                            {ref.stateName && (
                              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
                                State: {ref.stateName}
                              </div>
                            )}
                            {ref.description && (
                              <div style={{ fontSize: "0.8125rem", color: "var(--pf-v6-global--Color--100)", lineHeight: 1.5 }}>
                                {ref.description}
                              </div>
                            )}
                            {ref.links?.length > 0 && (
                              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {ref.links.map((link: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={link.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--link--Color)" }}
                                    title={link.description}
                                  >
                                    {link.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            {ref.evidenceBy?.length > 0 && (
                              <div style={{ marginTop: "0.5rem", paddingLeft: "0.75rem", borderLeft: "2px solid var(--pf-v6-global--BorderColor--100)" }}>
                                <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem", fontWeight: 600, letterSpacing: "0.05em" }}>
                                  Evidence
                                </div>
                                {ref.evidenceBy.map((ev: any) => (
                                  <div key={ev.name} style={{ fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                                    <span
                                      style={{ fontWeight: 600, cursor: "pointer", color: "var(--pf-v6-global--link--Color)" }}
                                      onClick={() => onSetSelectedElement && onSetSelectedElement(ev.workProductName)}
                                    >
                                      {ev.workProductName}
                                    </span>
                                    {ev.levelOfDetailName && <span style={{ color: "var(--pf-v6-global--Color--200)" }}> — {ev.levelOfDetailName}</span>}
                                    {ev.description && <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>{ev.description}</div>}
                                    {ev.links?.length > 0 && (
                                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.125rem" }}>
                                        {ev.links.map((link: any, idx: number) => (
                                          <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.6875rem", color: "var(--pf-v6-global--link--Color)" }} title={link.description}>{link.name}</a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Common Examples (work product instances matching this work product) */}
                {type === "workProduct" && (() => {
                  const examples = (baseline.workProductInstances ?? []).filter((i: any) => i.workProductName === data.name);
                  return examples.length > 0 ? (
                    <div style={{ marginTop: hasNarratives || (baseline.alphaInstances && baseline.alphaInstances.length > 0) ? "2rem" : 0 }}>
                      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                        Common Examples
                      </Title>
                      <ul style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--100)", margin: 0, paddingLeft: "1.25rem", listStyleType: "disc" }}>
                        {examples.map((instance: any) => (
                          <li key={instance.name} style={{ marginBottom: "0.25rem", display: "list-item" }}>
                            <span style={{ fontWeight: 600 }}>{instance.name}:</span>{" "}
                            {instance.description || ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })()}

                {/* Reference Examples (curated work product evidence from practice references) */}
                {type === "workProduct" && (() => {
                  const wpRefs: { ref: any; ev: any }[] = [];
                  for (const ref of (baseline as any).references ?? []) {
                    for (const ev of ref.evidenceBy ?? []) {
                      if (ev.workProductName === data.name) {
                        wpRefs.push({ ref, ev });
                      }
                    }
                  }
                  if (!wpRefs.length) return null;
                  return (
                    <div style={{ marginTop: "2rem" }}>
                      <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                        Reference Examples
                      </Title>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {wpRefs.map(({ ref, ev }, idx) => (
                          <div
                            key={`${ref.name}-${ev.name}-${idx}`}
                            style={{
                              padding: "0.75rem",
                              border: "1px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {ev.name}
                            </div>
                            {ev.levelOfDetailName && (
                              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
                                Level of Detail: {ev.levelOfDetailName}
                              </div>
                            )}
                            {ev.description && (
                              <div style={{ fontSize: "0.8125rem", color: "var(--pf-v6-global--Color--100)", lineHeight: 1.5 }}>
                                {ev.description}
                              </div>
                            )}
                            <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.375rem" }}>
                              From:{" "}
                              <span
                                style={{ cursor: "pointer", color: "var(--pf-v6-global--link--Color)" }}
                                onClick={() => onSetSelectedElement && onSetSelectedElement(ref.alphaName)}
                              >
                                {ref.alphaName}
                              </span>
                              {ref.stateName && ` — ${ref.stateName}`}
                            </div>
                            {ev.links?.length > 0 && (
                              <div style={{ marginTop: "0.375rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {ev.links.map((link: any, linkIdx: number) => (
                                  <a key={linkIdx} href={link.uri} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--link--Color)" }} title={link.description}>{link.name}</a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Activity-specific sections */}
                {type === "activity" && (
                  <div style={{ marginTop: hasNarratives ? "2rem" : 0 }}>
                    {/* Background prerequisites */}
                    {data.background && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <BackgroundBlock
                          background={data.background}
                          baseline={baseline}
                          onNavigateToElement={(name) => onSetSecondaryElement(name)}
                        />
                      </div>
                    )}

                    {/* Test scenario */}
                    {data.test && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                          Verification
                        </Title>
                        <TestBlock test={data.test} />
                      </div>
                    )}

                    {/* Examples */}
                    {data.examples && data.examples.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <ExamplesBlock examples={data.examples} />
                      </div>
                    )}

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
                                    <WorkProductQualifiedName wpName={wp.workProductName} workProducts={baseline.workProducts} layout="stacked" />
                                    <div style={{ color: "var(--pf-v6-global--Color--200)" }}>→ <AliasedName kind="levelOfDetail" name={wp.levelOfDetailName} browse={false} /></div>
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

                    {/* Involves */}
                    {data.involves && data.involves.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                          Involves
                        </Title>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {data.involves.map((personaGroupName: string, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                                color: "var(--pf-v6-global--Color--100)",
                                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                              }}
                            >
                              <i className="fa-solid fa-users" style={{ fontSize: "0.6875rem", color: "var(--pf-v6-global--Color--200)" }} />
                              {personaGroupName}
                            </span>
                          ))}
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

              {/* Right column: States/Activities/Practices - 45% (but NOT states for alphas - they go in table below) */}
              {hasStates && type !== "alpha" && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  {renderStatesList(data, assets, asset, secondaryElementName, onSetSecondaryElement)}
                </div>
              )}

              {/* For alphas, show Relates To in the right column instead of states */}
              {type === "alpha" && data.relatesTo && data.relatesTo.length > 0 && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                    Relates To
                  </Title>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
                          {alphaAsset && <IconAsset asset={alphaAsset} size={16} style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: "0.125rem" }} />}
                          <div style={{ fontSize: "0.8125rem", flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                              <span style={{ fontStyle: "italic", color: "var(--pf-v6-global--Color--200)" }}>
                                {relation.relationship}
                              </span>
                              {relation.direction && (
                                <span style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", flexShrink: 0 }}>
                                  {relation.direction === "outgoing" ? "→" : relation.direction === "incoming" ? "←" : "↔"}
                                </span>
                              )}
                              <span style={{ fontWeight: 600 }}>
                                {relation.alphaName}
                              </span>
                            </div>
                            {relation.description && (
                              <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem" }}>
                                {relation.description}
                              </div>
                            )}
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

              {/* Alpha-specific: Supporting Alphas */}
              {type === "alpha" && data.supportingAlphas && data.supportingAlphas.length > 0 && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                    Supporting Concerns
                  </Title>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {data.supportingAlphas.map((alphaName: string, idx: number) => {
                      const supportingAlpha = baseline.alphas.find((a) => a.name === alphaName);
                      const saAssetRef = supportingAlpha?.assetNames?.find((a: any) => a.type === "icon");
                      const saAsset = saAssetRef ? findAsset(saAssetRef.assetName, assets) : null;

                      return (
                        <button
                          key={idx}
                          onClick={() => onSetSecondaryElement(alphaName)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.75rem",
                            border: "2px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                          }}
                        >
                          {saAsset && <IconAsset asset={saAsset} size={16} style={{ flexShrink: 0 }} />}
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                            <AliasedName kind="alpha" name={alphaName} browse={false} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Alpha-specific: Variants */}
              {type === "alpha" && data.variants && data.variants.length > 0 && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  <CollapsibleSection title="Variants" count={data.variants.length}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {data.variants.map((variant: any) => {
                        const variantDesc = practiceElementDescriptionForDisplay(variant);
                        const variantAssetRef = variant.assetNames?.find((a: any) => a.type === "icon");
                        const variantAsset = variantAssetRef ? findAsset(variantAssetRef.assetName, assets) : null;

                        return (
                          <div
                            key={variant.name}
                            style={{
                              padding: "0.75rem",
                              border: "2px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: variantDesc ? "0.25rem" : 0 }}>
                              {variantAsset && <IconAsset asset={variantAsset} size={16} style={{ flexShrink: 0 }} />}
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                                <AliasedName kind="alpha" name={variant.name} browse={false} />
                              </span>
                            </div>
                            {variantDesc && (
                              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", lineHeight: 1.5 }}>
                                {variantDesc}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                </div>
              )}

              {hasActivities && (
                <div style={{ flex: "0 0 45%", minWidth: "15rem", paddingRight: "2rem" }}>
                  {renderActivitiesList(data, assets, onSetSecondaryElement)}
                </div>
              )}


            </>
            )}
            </div>
          )}

          {/* Alpha-specific: State table - shown at bottom after narratives/relates-to */}
          {type === "alpha" && hasStates && (
            <AlphaStateTable
              alpha={data}
              baseline={baseline}
              assets={assets}
              selectedElement={secondaryElementName}
              onSelectElement={onSetSecondaryElement}
            />
          )}

          {/* WorkProduct-specific: Child work products (those declaring partOf this WP) */}
          {type === "workProduct" && (() => {
            const children = baseline.workProducts?.filter((wp) => wp.partOf === data.name) ?? [];
            if (!children.length) return null;

            return (
              <div style={{ marginTop: "2rem" }}>
                <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Includes
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {children.map((child) => {
                    const childAssetRef = child.assetNames?.find((a: any) => a.type === "icon");
                    const childAsset = childAssetRef ? findAsset(childAssetRef.assetName, assets) : null;
                    const childDesc = practiceElementDescriptionForDisplay(child);

                    return (
                      <button
                        key={child.name}
                        onClick={() => onSetSelectedElement && onSetSelectedElement(child.name)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          padding: "0.75rem",
                          border: "2px solid var(--pf-v6-global--BorderColor--100)",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                        }}
                      >
                        {childAsset && <IconAsset asset={childAsset} size={16} style={{ flexShrink: 0, marginTop: "0.125rem" }} />}
                        <div style={{ fontSize: "0.8125rem", flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            <AliasedName kind="workProduct" name={child.name} browse={false} />
                          </div>
                          {childDesc && (
                            <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                              {childDesc}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* WorkProduct-specific: Variants (WPs that declared mapsTo this WP) */}
          {type === "workProduct" && data.variants && data.variants.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <CollapsibleSection title="Variants" count={data.variants.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.variants.map((variant: any) => {
                    const variantAssetRef = variant.assetNames?.find((a: any) => a.type === "icon");
                    const variantAsset = variantAssetRef ? findAsset(variantAssetRef.assetName, assets) : null;
                    const variantDesc = practiceElementDescriptionForDisplay(variant);

                    return (
                      <button
                        key={variant.name}
                        onClick={() => onSetSelectedElement && onSetSelectedElement(variant.name)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          padding: "0.75rem",
                          border: "2px solid var(--pf-v6-global--BorderColor--100)",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                        }}
                      >
                        {variantAsset && <IconAsset asset={variantAsset} size={16} style={{ flexShrink: 0, marginTop: "0.125rem" }} />}
                        <div style={{ fontSize: "0.8125rem", flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            <AliasedName kind="workProduct" name={variant.name} browse={false} />
                          </div>
                          {variantDesc && (
                            <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                              {variantDesc}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* WorkProduct-specific: Download template button */}
          {type === "workProduct" && libraryId && (
            <DownloadTemplateButton libraryId={libraryId} wpName={data.name} />
          )}

          {/* WorkProduct-specific: LOD table - shown at bottom after narratives */}
          {type === "workProduct" && hasLODs && (
            <WorkProductLODTable
              workProduct={data}
              baseline={baseline}
              assets={assets}
              selectedElement={secondaryElementName}
              onSelectElement={onSetSecondaryElement}
              specificLevelOfDetail={selectedElement?.specificLevelOfDetail}
            />
          )}

          {/* Persona Group-specific: Personas in this group */}
          {type === "personaGroup" && hasPersonas && (
            <div style={{ marginTop: "2rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Personas
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {baseline.personas?.filter((p) => data.personaNames.includes(p.name)).map((persona) => {
                  const personaAssetRef = persona.assetNames?.find((a: any) => a.type === "icon");
                  const personaAsset = personaAssetRef ? findAsset(personaAssetRef.assetName, assets) : null;
                  const isSelected = secondaryElementName === persona.name;

                  return (
                    <button
                      key={persona.name}
                      onClick={() => onSetSecondaryElement(isSelected ? null : persona.name)}
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
                      {personaAsset && <IconAsset asset={personaAsset} size={16} style={{ flexShrink: 0 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                          <AliasedName kind="persona" name={persona.name} browse={false} />
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                          {persona.description}
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

          {/* Persona-specific: Competencies */}
          {type === "persona" && hasCompetencies && (
            <div style={{ marginTop: "2rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Competencies
              </Title>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {data.competencies.map((compRef: any, idx: number) => {
                  const isSelected = secondaryElementName === compRef.competencyName;
                  return (
                    <button
                      key={`${compRef.competencyName}-${compRef.competencyLevelName}-${idx}`}
                      onClick={() => onSetSecondaryElement(isSelected ? null : compRef.competencyName)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.375rem 0.75rem",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        backgroundColor: isSelected
                          ? "var(--pf-v6-global--primary-color--100)"
                          : "var(--pf-v6-global--BackgroundColor--200)",
                        color: isSelected ? "white" : "var(--pf-v6-global--Color--100)",
                        border: isSelected
                          ? "1px solid var(--pf-v6-global--primary-color--100)"
                          : "1px solid var(--pf-v6-global--BorderColor--100)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--300)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                        }
                      }}
                    >
                      {compRef.competencyName} → {compRef.competencyLevelName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Competency-specific: Skill Levels */}
          {type === "competency" && hasLevels && (
            <div style={{ marginTop: "2rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Skill Levels
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.levels
                  .sort((a: any, b: any) => a.level - b.level)
                  .map((level: any, idx: number) => {
                    const isSelected = secondaryElementName === level.name;
                    const totalLevels = data.levels.length;
                    // Generate a color based on progression (gradient from blue to green)
                    const hue = 210 + (idx / Math.max(totalLevels - 1, 1)) * 90;
                    const progressColor = `hsl(${hue}, 70%, 50%)`;

                    return (
                      <button
                        key={level.name}
                        onClick={() => onSetSecondaryElement(isSelected ? null : level.name)}
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
                          width: "100%",
                          transition: "all 0.2s",
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
                          {level.level}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>
                          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                            <AliasedName kind="competencyLevel" name={level.name} browse={false} />
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem" }}>
                            {level.description}
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
          )}

            <ElementTagsBadges tags={data.tags} />
          </>
        )}
      </div>
    </main>
  );
}
