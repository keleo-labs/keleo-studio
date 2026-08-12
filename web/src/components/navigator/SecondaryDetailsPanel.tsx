"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { findActivitiesProgressingState, findWorkProductsEvidencingState } from "@/lib/analysis/stateProgression";
import { AliasedName } from "../common/AliasedName";
import { BackgroundBlock, TestBlock, ExamplesBlock } from "./GherkinBlock";

interface SecondaryDetailsPanelProps {
  secondaryElement: {
    type: "state" | "activity" | "workProduct" | "levelOfDetail" | "patternView" | "alpha" | "practice" | "persona" | "competency" | "competencyLevel";
    data: any;
    parent?: any;
    specificLevelOfDetail?: string;
  } | null;
  baseline: PracticeBaseline;
  onSetSecondaryElement: (element: string | null) => void;
  onSetSelectedElement?: (element: string | null) => void;
  onNavigateToElement?: (element: string) => void;
  onSetMode?: (mode: "concerns" | "activities") => void;
  practiceDocuments?: Map<string, { id: string | null; body: any }>;
  libraryId?: string | null;
}

export function SecondaryDetailsPanel({
  secondaryElement,
  baseline,
  onSetSecondaryElement,
  onSetSelectedElement,
  onNavigateToElement,
  onSetMode,
  practiceDocuments,
  libraryId,
}: SecondaryDetailsPanelProps) {
  const assets = baseline.assets ?? [];

  // Helper to navigate to an element
  const navigateToElement = (elementName: string, switchToMode?: "concerns" | "activities") => {
    // Switch mode if needed
    if (switchToMode && onSetMode) {
      onSetMode(switchToMode);
    }

    // Use the combined callback if available (preferred)
    if (onNavigateToElement) {
      onNavigateToElement(elementName);
    } else if (onSetSelectedElement) {
      // Fallback to separate calls
      onSetSelectedElement(elementName);
      setTimeout(() => {
        onSetSecondaryElement(null);
      }, 0);
    }
  };

  if (!secondaryElement) {
    return (
      <aside
        style={{
          position: "sticky",
          top: 0,
          maxHeight: "100vh",
          overflowY: "auto",
          width: "320px",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)",
          padding: "2rem 1.5rem",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--pf-v6-global--Color--200)", fontSize: "0.875rem" }}>
          <p>Click on a state, work product, or related element to view its details here.</p>
        </div>
      </aside>
    );
  }

  const { type, data, parent, specificLevelOfDetail } = secondaryElement;

  // Get icon
  const assetRef = data.assetNames?.find((a: any) => a.type === "icon");
  const parentAssetRef = parent?.assetNames?.find((a: any) => a.type === "icon");
  const asset = assetRef
    ? findAsset(assetRef.assetName, assets)
    : parentAssetRef
    ? findAsset(parentAssetRef.assetName, assets)
    : null;

  // Get description
  const description = practiceElementDescriptionForDisplay(data);

  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        maxHeight: "100vh",
        overflowY: "auto",
        width: "320px",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
        borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)",
        padding: "1.5rem",
      }}
    >
      {/* Header with close button */}
      <div style={{ marginBottom: "1.5rem", paddingTop: "0.5rem" }}>
        {/* Close button */}
        <button
          onClick={() => onSetSecondaryElement(null)}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.5rem",
            color: "var(--pf-v6-global--Color--200)",
            padding: "0.25rem",
            lineHeight: 1,
            transition: "color 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--pf-v6-global--Color--100)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--pf-v6-global--Color--200)";
          }}
          aria-label="Close details"
        >
          ×
        </button>

        {/* Only show icon for non-state types */}
        {type !== "state" && asset && (
          <div style={{ marginBottom: "0.75rem" }}>
            <IconAsset asset={asset} size={32} />
          </div>
        )}

        {/* For states, show alpha name above state name */}
        {type === "state" && parent && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
              paddingRight: "2rem",
            }}
          >
            <div
              onClick={() => navigateToElement(parent.name, "concerns")}
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--200)",
                cursor: "pointer",
                transition: "color 0.2s",
                flex: 1,
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--Color--200)";
                e.currentTarget.style.textDecoration = "none";
              }}
              title={`Go to ${parent.name}`}
            >
              <AliasedName kind="alpha" name={parent.name} browse={false} />
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateToElement(parent.name, "concerns");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--pf-v6-global--link--Color)",
                fontSize: "0.875rem",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color--hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
              }}
              title={`Go to ${parent.name}`}
              aria-label={`Go to ${parent.name}`}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* For level of detail, show work product name above LOD name */}
        {type === "levelOfDetail" && parent && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
              paddingRight: "2rem",
            }}
          >
            <div
              onClick={() => navigateToElement(parent.name)}
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--200)",
                cursor: "pointer",
                transition: "color 0.2s",
                flex: 1,
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--Color--200)";
                e.currentTarget.style.textDecoration = "none";
              }}
              title={`Go to ${parent.name}`}
            >
              <AliasedName kind="workProduct" name={parent.name} browse={false} />
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateToElement(parent.name);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--pf-v6-global--link--Color)",
                fontSize: "0.875rem",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color--hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
              }}
              title={`Go to ${parent.name}`}
              aria-label={`Go to ${parent.name}`}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", paddingRight: "2rem", marginBottom: "0.5rem" }}>
          <Title
            headingLevel="h2"
            size="lg"
            style={{
              color: "var(--pf-v6-global--Color--100)",
              fontWeight: 700,
              flex: 1,
              minWidth: 0,
            }}
          >
            <AliasedName kind={type} name={type === "practice" ? (data.body?.name || data.name) : data.name} browse={false} />
          </Title>
          {/* Show goto link for alpha, activity, and practice types */}
          {(type === "alpha" || type === "activity" || type === "practice") && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (type === "practice") {
                  const practiceBody = data.body || data;
                  const practiceName = practiceBody.name;
                  if (practiceName) {
                    // Check if we already have the practice with an id
                    const practiceDoc = practiceDocuments?.get(practiceName);
                    if (practiceDoc?.id) {
                      window.location.href = `/navigator?libraryId=${practiceDoc.id}&selected=__introduction__`;
                      return;
                    }

                    // Practice is embedded or not loaded - search library for it
                    try {
                      const listResponse = await fetch('/api/documents?withBody=1');
                      if (listResponse.ok) {
                        const listData = await listResponse.json();
                        const libraryPractice = listData.documents?.find((doc: any) => doc.body?.name === practiceName);
                        if (libraryPractice?.id) {
                          window.location.href = `/navigator?libraryId=${libraryPractice.id}&selected=__introduction__`;
                        } else {
                          alert(`Practice "${practiceName}" not found in library.`);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to search library for practice:', error);
                      alert('Failed to search library for practice.');
                    }
                  }
                } else if (type === "activity") {
                  navigateToElement(data.name, "activities");
                } else if (type === "alpha") {
                  navigateToElement(data.name, "concerns");
                } else {
                  navigateToElement(data.name);
                }
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--pf-v6-global--link--Color)",
                fontSize: "1.125rem",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color--hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--pf-v6-global--link--Color)";
              }}
              title="Go to this element"
              aria-label={`Go to ${data.name}`}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          )}
        </div>
        <p
          style={{
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--pf-v6-global--Color--100)",
          }}
        >
          {description}
        </p>
      </div>

      {/* State-specific: Background prerequisites */}
      {type === "state" && data.background && (
        <BackgroundBlock
          background={data.background}
          baseline={baseline}
          onNavigateToElement={onNavigateToElement || onSetSelectedElement ? (name) => navigateToElement(name) : undefined}
        />
      )}

      {/* State-specific: Checklist */}
      {type === "state" && data.checklist && data.checklist.length > 0 && (
        <div>
          <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
            Checklist
          </Title>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data.checklist
              .sort((a: any, b: any) => a.seq - b.seq)
              .map((item: any, idx: number) => {
                // Map verification method to Font Awesome icon
                const getVerificationIcon = (method: string) => {
                  switch (method) {
                    case "automated-telemetry":
                      return "fa-solid fa-chart-line";
                    case "manual-audit":
                      return "fa-solid fa-user-check";
                    case "documentation-review":
                      return "fa-solid fa-file-lines";
                    case "system-assertion":
                      return "fa-solid fa-shield-check";
                    default:
                      return null;
                  }
                };

                const verificationIcon = item.verificationMethod
                  ? getVerificationIcon(item.verificationMethod)
                  : null;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "1rem",
                      backgroundColor: "white",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "2px solid var(--pf-v6-global--BorderColor--100)",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          border: "2px solid var(--pf-v6-global--primary-color--100)",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          flexShrink: 0,
                          marginTop: "0.125rem",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pf-v6-global--Color--100)", marginBottom: "0.25rem" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", lineHeight: "1.6", color: "var(--pf-v6-global--Color--100)" }}>
                          {item.description}
                        </div>
                      </div>
                      {verificationIcon && (
                        <i
                          className={verificationIcon}
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--pf-v6-global--primary-color--100)",
                            flexShrink: 0,
                          }}
                          title={item.verificationMethod}
                        />
                      )}
                    </div>

                    {/* Test scenario */}
                    {item.test && (
                      <div style={{ marginTop: "0.5rem", marginLeft: "calc(18px + 0.75rem)" }}>
                        <TestBlock test={item.test} compact />
                      </div>
                    )}

                    {/* Examples */}
                    {item.examples && item.examples.length > 0 && (
                      <div style={{ marginLeft: "calc(18px + 0.75rem)" }}>
                        <ExamplesBlock examples={item.examples} />
                      </div>
                    )}

                    {/* Evidence tiles */}
                    {item.evidencedBy && item.evidencedBy.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem", marginLeft: "calc(18px + 0.75rem)" }}>
                        {item.evidencedBy.map((evidence: any, evidenceIdx: number) => {
                          const workProduct = baseline.workProducts?.find(
                            (wp) => wp.name === evidence.workProductName
                          );
                          const wpAssetRef = workProduct?.assetNames?.find((a: any) => a.type === "icon");
                          const wpAsset = wpAssetRef ? findAsset(wpAssetRef.assetName, assets) : null;

                          return (
                            <div
                              key={evidenceIdx}
                              onClick={() => navigateToElement(evidence.workProductName)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                                cursor: "pointer",
                                transition: "background-color 0.2s, border-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                              }}
                              title={`Go to ${evidence.workProductName}`}
                            >
                              {wpAsset && <IconAsset asset={wpAsset} size={16} style={{ flexShrink: 0 }} />}
                              <div style={{ fontSize: "0.6875rem", minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                                  <AliasedName kind="workProduct" name={evidence.workProductName} browse={false} />
                                </div>
                                <div style={{ color: "var(--pf-v6-global--Color--200)" }}>
                                  → <AliasedName kind="levelOfDetail" name={evidence.levelOfDetailName} browse={false} />
                                </div>
                              </div>
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
      )}

      {/* State-specific: Progressed By */}
      {type === "state" && parent && (
        (() => {
          const progressedBy = findActivitiesProgressingState(
            parent.name,
            data.name,
            baseline
          );

          if (progressedBy.length === 0) return null;

          return (
            <div style={{ marginTop: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Progressed By
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {progressedBy.map((activityName, idx) => {
                  // Find the activity to get its icon and determine if it's an ActivitySpace
                  let activity = null;
                  let isActivitySpace = false;

                  // First check if it's an ActivitySpace
                  const activitySpace = (baseline.activitySpaces || []).find((space: any) => space.name === activityName);
                  if (activitySpace) {
                    activity = activitySpace;
                    isActivitySpace = true;
                  } else {
                    // Look for the activity within activity spaces
                    for (const space of baseline.activitySpaces || []) {
                      if (space.activities) {
                        activity = space.activities.find((a: any) => a.name === activityName);
                        if (activity) break;
                      }
                    }
                  }

                  const activityAssetRef = activity?.assetNames?.find((a: any) => a.type === "icon");
                  const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, assets) : null;

                  return (
                    <div
                      key={idx}
                      style={{
                        paddingRight: "12px",
                      }}
                    >
                      <div
                        onClick={() => !isActivitySpace && onSetSelectedElement && navigateToElement(activityName, "activities")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.625rem",
                          paddingRight: "0.625rem",
                          clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
                          backgroundColor: "#ffffff",
                          border: isActivitySpace
                            ? "1px dashed var(--pf-v6-global--BorderColor--100)"
                            : "1px solid var(--pf-v6-global--BorderColor--100)",
                          cursor: !isActivitySpace && onSetSelectedElement ? "pointer" : "default",
                          transition: !isActivitySpace && onSetSelectedElement ? "background-color 0.2s" : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActivitySpace && onSetSelectedElement) {
                            e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActivitySpace && onSetSelectedElement) {
                            e.currentTarget.style.backgroundColor = "#ffffff";
                          }
                        }}
                        title={!isActivitySpace && onSetSelectedElement ? `Go to ${activityName}` : undefined}
                      >
                        {activityAsset && <IconAsset asset={activityAsset} size={16} style={{ flexShrink: 0 }} />}
                        <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "10px" }}>
                          <AliasedName kind={isActivitySpace ? "activitySpace" : "activity"} name={activityName} browse={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}

      {/* State-specific: Evidenced By */}
      {type === "state" && parent && (
        (() => {
          const evidencedBy = findWorkProductsEvidencingState(
            parent.name,
            data.name,
            baseline
          );

          if (evidencedBy.length === 0) return null;

          return (
            <div style={{ marginTop: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Evidenced By
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {evidencedBy.map((evidence, idx) => {
                  // Find work product to get its icon
                  const workProduct = baseline.workProducts?.find(
                    (wp) => wp.name === evidence.workProductName
                  );
                  const wpAssetRef = workProduct?.assetNames?.find((a: any) => a.type === "icon");
                  const wpAsset = wpAssetRef ? findAsset(wpAssetRef.assetName, assets) : null;

                  return (
                    <div
                      key={idx}
                      onClick={() => navigateToElement(evidence.workProductName)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.625rem",
                        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                        cursor: "pointer",
                        transition: "background-color 0.2s, border-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                        e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                      }}
                      title={`Go to ${evidence.workProductName}`}
                    >
                      {wpAsset && <IconAsset asset={wpAsset} size={16} style={{ flexShrink: 0 }} />}
                      <div style={{ fontSize: "0.6875rem", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <AliasedName kind="workProduct" name={evidence.workProductName} browse={false} />
                        </div>
                        <div style={{ color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          → <AliasedName kind="levelOfDetail" name={evidence.levelOfDetailName} browse={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}

      {/* WorkProduct-specific: Levels of Detail and Checklist */}
      {type === "workProduct" && (
        <>
          {data.levelsOfDetail && data.levelsOfDetail.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                {specificLevelOfDetail ? "Level of Detail" : "Levels of Detail"}
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.levelsOfDetail
                  .filter((lod: any) => !specificLevelOfDetail || lod.name === specificLevelOfDetail)
                  .sort((a: any, b: any) => a.seq - b.seq)
                  .map((lod: any) => (
                    <div
                      key={lod.name}
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      }}
                    >
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                        {lod.seq}. <AliasedName kind="levelOfDetail" name={lod.name} browse={false} />
                      </div>
                      <div style={{ fontSize: "0.75rem", lineHeight: "1.5", color: "var(--pf-v6-global--Color--200)", marginBottom: lod.contributesTo?.length > 0 || lod.checklist?.length > 0 ? "0.75rem" : 0 }}>
                        {practiceElementDescriptionForDisplay(lod)}
                      </div>
                      {lod.contributesTo && lod.contributesTo.length > 0 && (
                        <div style={{ marginBottom: lod.checklist?.length > 0 ? "0.75rem" : 0 }}>
                          <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--pf-v6-global--Color--100)" }}>
                            Contributes To
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            {lod.contributesTo.map((contrib: any, idx: number) => (
                              <div
                                key={idx}
                                onClick={() => onSetSelectedElement && navigateToElement(contrib.alphaName, "concerns")}
                                style={{
                                  fontSize: "0.6875rem",
                                  padding: "0.375rem 0.5rem",
                                  backgroundColor: "#ffffff",
                                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                                  cursor: onSetSelectedElement ? "pointer" : "default",
                                  transition: onSetSelectedElement ? "background-color 0.2s, border-color 0.2s" : "none",
                                }}
                                onMouseEnter={(e) => {
                                  if (onSetSelectedElement) {
                                    e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (onSetSelectedElement) {
                                    e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                                  }
                                }}
                                title={onSetSelectedElement ? `Go to ${contrib.alphaName}` : undefined}
                              >
                                <div style={{ fontWeight: 600 }}>
                                  <AliasedName kind="alpha" name={contrib.alphaName} browse={false} />
                                </div>
                                <div style={{ color: "var(--pf-v6-global--Color--200)" }}>
                                  → <AliasedName kind="state" name={contrib.stateName} browse={false} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {lod.background && (
                        <div style={{ marginBottom: lod.checklist?.length > 0 ? "0.75rem" : 0 }}>
                          <BackgroundBlock
                            background={lod.background}
                            baseline={baseline}
                            onNavigateToElement={onNavigateToElement || onSetSelectedElement ? (name) => navigateToElement(name) : undefined}
                          />
                        </div>
                      )}
                      {lod.checklist && lod.checklist.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--pf-v6-global--Color--100)" }}>
                            Checklist
                          </div>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {lod.checklist
                              .sort((a: any, b: any) => a.seq - b.seq)
                              .map((item: any, itemIdx: number) => {
                                const getVerificationIcon = (method: string) => {
                                  switch (method) {
                                    case "automated-telemetry": return "fa-solid fa-chart-line";
                                    case "manual-audit": return "fa-solid fa-user-check";
                                    case "documentation-review": return "fa-solid fa-file-lines";
                                    case "system-assertion": return "fa-solid fa-shield-check";
                                    default: return null;
                                  }
                                };

                                const iconClass = item.verificationMethod ? getVerificationIcon(item.verificationMethod) : null;

                                return (
                                  <li
                                    key={itemIdx}
                                    style={{
                                      fontSize: "0.6875rem",
                                      padding: "0.625rem",
                                      backgroundColor: "white",
                                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                      border: "2px solid var(--pf-v6-global--BorderColor--100)",
                                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                                      display: "flex",
                                      gap: "0.5rem",
                                      alignItems: "flex-start",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: "16px",
                                        height: "16px",
                                        border: "2px solid var(--pf-v6-global--primary-color--100)",
                                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                        flexShrink: 0,
                                        marginTop: "0.125rem",
                                      }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                                        {item.seq}. {item.name}
                                      </div>
                                      <div style={{ color: "var(--pf-v6-global--Color--100)", marginBottom: item.verificationMethod || (item.evidencedBy && item.evidencedBy.length > 0) ? "0.375rem" : 0 }}>
                                        {item.description}
                                      </div>
                                      {item.verificationMethod && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.375rem" }}>
                                          {iconClass && <i className={iconClass} style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--primary-color--100)" }} />}
                                          <span style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                                            {item.verificationMethod.replace(/-/g, " ")}
                                          </span>
                                        </div>
                                      )}
                                      {item.evidencedBy && item.evidencedBy.length > 0 && (
                                        <div style={{ marginTop: "0.375rem" }}>
                                          <div style={{ fontSize: "0.625rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                                            Evidence:
                                          </div>
                                          {item.evidencedBy.map((evidence: any, evIdx: number) => (
                                            <div
                                              key={evIdx}
                                              style={{
                                                fontSize: "0.625rem",
                                                color: "var(--pf-v6-global--Color--200)",
                                                marginTop: "0.125rem",
                                              }}
                                            >
                                              <AliasedName kind="workProduct" name={evidence.workProductName} browse={false} /> → <AliasedName kind="levelOfDetail" name={evidence.levelOfDetailName} browse={false} />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {item.test && (
                                        <div style={{ marginTop: "0.375rem" }}>
                                          <TestBlock test={item.test} compact />
                                        </div>
                                      )}
                                      {item.examples && item.examples.length > 0 && (
                                        <ExamplesBlock examples={item.examples} />
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Level of Detail-specific: Detailed view */}
      {type === "levelOfDetail" && (
        <>
          <div style={{ fontSize: "0.8125rem", lineHeight: "1.5", color: "var(--pf-v6-global--Color--100)", marginBottom: "1.5rem" }}>
            {practiceElementDescriptionForDisplay(data)}
          </div>

          {data.contributesTo && data.contributesTo.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Contributes To
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.contributesTo.map((contrib: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onSetSelectedElement && navigateToElement(contrib.alphaName, "concerns")}
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.5rem 0.625rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      cursor: onSetSelectedElement ? "pointer" : "default",
                      transition: onSetSelectedElement ? "background-color 0.2s, border-color 0.2s" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (onSetSelectedElement) {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (onSetSelectedElement) {
                        e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                        e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                      }
                    }}
                    title={onSetSelectedElement ? `Go to ${contrib.alphaName}` : undefined}
                  >
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <AliasedName kind="alpha" name={contrib.alphaName} browse={false} />
                    </div>
                    <div style={{ color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      → <AliasedName kind="state" name={contrib.stateName} browse={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.background && (
            <BackgroundBlock
              background={data.background}
              baseline={baseline}
              onNavigateToElement={onNavigateToElement || onSetSelectedElement ? (name) => navigateToElement(name) : undefined}
            />
          )}

          {data.checklist && data.checklist.length > 0 && (
            <div>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Checklist
              </Title>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.checklist
                  .sort((a: any, b: any) => a.seq - b.seq)
                  .map((item: any, itemIdx: number) => {
                    const getVerificationIcon = (method: string) => {
                      switch (method) {
                        case "automated-telemetry": return "fa-solid fa-chart-line";
                        case "manual-audit": return "fa-solid fa-user-check";
                        case "documentation-review": return "fa-solid fa-file-lines";
                        case "system-assertion": return "fa-solid fa-shield-check";
                        default: return null;
                      }
                    };

                    const iconClass = item.verificationMethod ? getVerificationIcon(item.verificationMethod) : null;

                    return (
                      <li
                        key={itemIdx}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.875rem",
                          backgroundColor: "white",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          border: "2px solid var(--pf-v6-global--BorderColor--100)",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          display: "flex",
                          gap: "0.625rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            border: "2px solid var(--pf-v6-global--primary-color--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            flexShrink: 0,
                            marginTop: "0.125rem",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                            {item.seq}. {item.name}
                          </div>
                          <div style={{ color: "var(--pf-v6-global--Color--100)", marginBottom: item.verificationMethod || (item.evidencedBy && item.evidencedBy.length > 0) ? "0.5rem" : 0 }}>
                            {item.description}
                          </div>
                          {item.verificationMethod && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem" }}>
                              {iconClass && <i className={iconClass} style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--primary-color--100)" }} />}
                              <span style={{ fontSize: "0.6875rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                                {item.verificationMethod.replace(/-/g, " ")}
                              </span>
                            </div>
                          )}
                          {item.evidencedBy && item.evidencedBy.length > 0 && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                                Evidence:
                              </div>
                              {item.evidencedBy.map((evidence: any, evIdx: number) => (
                                <div
                                  key={evIdx}
                                  style={{
                                    fontSize: "0.6875rem",
                                    color: "var(--pf-v6-global--Color--200)",
                                    marginTop: "0.125rem",
                                  }}
                                >
                                  <AliasedName kind="workProduct" name={evidence.workProductName} browse={false} /> → <AliasedName kind="levelOfDetail" name={evidence.levelOfDetailName} browse={false} />
                                </div>
                              ))}
                            </div>
                          )}
                          {item.test && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <TestBlock test={item.test} compact />
                            </div>
                          )}
                          {item.examples && item.examples.length > 0 && (
                            <ExamplesBlock examples={item.examples} />
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Activity-specific: Full details (reuse structure from main panel) */}
      {type === "activity" && (
        <>
          {data.contributesTo && data.contributesTo.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Contributes To
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.contributesTo.map((contrib: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => navigateToElement(contrib.alphaName, "concerns")}
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.5rem 0.625rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      cursor: "pointer",
                      transition: "background-color 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                      e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                    }}
                    title={`Go to ${contrib.alphaName}`}
                  >
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <AliasedName kind="alpha" name={contrib.alphaName} browse={false} />
                    </div>
                    <div style={{ color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      → <AliasedName kind="state" name={contrib.stateName} browse={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.worksOn && data.worksOn.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Works On
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.worksOn.map((wp: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => navigateToElement(wp.workProductName)}
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.5rem 0.625rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      cursor: "pointer",
                      transition: "background-color 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                      e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                    }}
                    title={`Go to ${wp.workProductName}`}
                  >
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <AliasedName kind="workProduct" name={wp.workProductName} browse={false} />
                    </div>
                    <div style={{ color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      → <AliasedName kind="levelOfDetail" name={wp.levelOfDetailName} browse={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.involves && data.involves.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Involves
              </Title>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {data.involves.map((personaGroupName: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      color: "var(--pf-v6-global--Color--100)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <i className="fa-solid fa-users" style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)" }} />
                    {personaGroupName}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {isRecommended
                    ? data.recommendedCompetencyLevels.map((comp: any, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                            color: "var(--pf-v6-global--Color--100)",
                            border: "1px solid var(--pf-v6-global--BorderColor--100)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {comp.competencyName} → {comp.competencyLevelName}
                        </span>
                      ))
                    : data.requiredCompetencies.map((comp: string, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                            color: "var(--pf-v6-global--Color--100)",
                            border: "1px solid var(--pf-v6-global--BorderColor--100)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {comp}
                        </span>
                      ))}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* PatternView-specific: Show details */}
      {type === "patternView" && (
        <>
          <div style={{ fontSize: "0.8125rem", lineHeight: "1.5", color: "var(--pf-v6-global--Color--100)", marginBottom: "1.5rem" }}>
            {practiceElementDescriptionForDisplay(data)}
          </div>

          {data.alphaStates && data.alphaStates.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Concern States
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.alphaStates.map((alphaState: any, idx: number) => {
                  // Handle both string format and AlphaContribution object
                  let alphaName, stateName;
                  if (typeof alphaState === "string") {
                    // Parse "AlphaName→StateName" or "AlphaName->StateName"
                    const parts = alphaState.split(/→|->/).map((s: string) => s.trim());
                    alphaName = parts[0];
                    stateName = parts[1];
                  } else {
                    alphaName = alphaState.alphaName;
                    stateName = alphaState.stateName;
                  }

                  const alpha = baseline.alphas.find((a) => a.name === alphaName);
                  const alphaAssetRef = alpha?.assetNames?.find((a: any) => a.type === "icon");
                  const alphaAsset = alphaAssetRef ? findAsset(alphaAssetRef.assetName, assets) : null;

                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: "0.6875rem",
                        padding: "0.5rem 0.625rem",
                        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {alphaAsset && <IconAsset asset={alphaAsset} size={14} style={{ flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <AliasedName kind="alpha" name={alphaName} browse={false} />
                        </div>
                        <div style={{ color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          → <AliasedName kind="state" name={stateName} browse={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.activities && data.activities.length > 0 && (
            <div>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Activities
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.activities.map((activityName: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.5rem 0.625rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      fontWeight: 600,
                    }}
                  >
                    <AliasedName kind="activity" name={activityName} browse={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Alpha-specific: Show states */}
      {type === "alpha" && (
        <>
          {data.states && data.states.length > 0 && (
            <div>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                States
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.states
                  .sort((a: any, b: any) => a.seq - b.seq)
                  .map((state: any, idx: number) => {
                    // Generate a color based on progression (gradient from blue to green)
                    const totalStates = data.states.length;
                    const hue = 210 + (idx / Math.max(totalStates - 1, 1)) * 90; // 210 (blue) to 300 (purple/green)
                    const progressColor = `hsl(${hue}, 70%, 50%)`;

                    return (
                      <div
                        key={idx}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.75rem",
                          backgroundColor: "white",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          border: "2px solid var(--pf-v6-global--BorderColor--100)",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: progressColor,
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            flexShrink: 0,
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                          }}
                        >
                          {state.seq}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                            {state.name}
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--pf-v6-global--Color--100)", lineHeight: "1.5" }}>
                            {practiceElementDescriptionForDisplay(state)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Practice-specific: Show name, description, narratives */}
      {type === "practice" && (() => {
        // Extract the actual practice body from the stored document structure
        const practiceBody = data.body || data;
        return (
          <>
            <div style={{ fontSize: "0.8125rem", lineHeight: "1.5", color: "var(--pf-v6-global--Color--100)", marginBottom: "1.5rem" }}>
              {practiceElementDescriptionForDisplay(practiceBody)}
            </div>

            {practiceBody.narratives && practiceBody.narratives.length > 0 && (
            <div>
              <Title headingLevel="h3" size="md" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                Narratives
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {practiceBody.narratives.map((narrative: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                      {narrative.name}
                    </div>
                    {narrative.description && (
                      <div style={{ fontSize: "0.6875rem", lineHeight: "1.5", color: "var(--pf-v6-global--Color--100)", marginBottom: "0.5rem" }}>
                        {narrative.description}
                      </div>
                    )}

                    {/* Narrative Contexts */}
                    {narrative.narrativeContexts && narrative.narrativeContexts.length > 0 && (
                      <div style={{
                        marginTop: "0.5rem",
                        fontSize: "0.6875rem",
                        color: "var(--pf-v6-global--Color--200)",
                        paddingLeft: "0.5rem",
                        borderLeft: "2px solid var(--pf-v6-global--BorderColor--100)"
                      }}>
                        {narrative.narrativeContexts
                          .sort((a: any, b: any) => a.seq - b.seq)
                          .map((context: any, contextIdx: number) => (
                            <div key={contextIdx} style={{ marginTop: contextIdx > 0 ? "0.375rem" : 0 }}>
                              {context.seq}. {context.context}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Contexts */}
                    {narrative.contexts && narrative.contexts.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                          Contexts:
                        </div>
                        <div style={{
                          fontSize: "0.6875rem",
                          color: "var(--pf-v6-global--Color--200)",
                          paddingLeft: "0.5rem",
                          borderLeft: "2px solid var(--pf-v6-global--BorderColor--100)"
                        }}>
                          {narrative.contexts
                            .sort((a: any, b: any) => a.seq - b.seq)
                            .map((context: any, contextIdx: number) => (
                              <div key={contextIdx} style={{ marginTop: contextIdx > 0 ? "0.375rem" : 0 }}>
                                {context.seq}. {context.text}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Further Reading */}
                    {narrative.citationNames && narrative.citationNames.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--pf-v6-global--Color--100)" }}>
                          Further Reading:
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--pf-v6-global--Color--200)" }}>
                          {narrative.citationNames.map((citationName: string, citIdx: number) => {
                            // Find citation in practice citations
                            const citation = practiceBody.citations?.find((c: any) => c.name === citationName);
                            if (!citation) return null;

                            return (
                              <div key={citIdx} style={{ marginTop: citIdx > 0 ? "0.25rem" : 0 }}>
                                • {citation.name}
                                {citation.url && (
                                  <a
                                    href={citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ marginLeft: "0.25rem", color: "var(--pf-v6-global--link--Color)" }}
                                  >
                                    ↗
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
        );
      })()}

      {/* Persona (as secondary from persona group) */}
      {type === "persona" && (() => {
        const persona = data;
        return (
          <>
            {persona.narratives && persona.narratives.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <Title headingLevel="h4" size="sm" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Narratives
                </Title>
                {renderNarratives(persona.narratives, baseline)}
              </div>
            )}

            {persona.competencies && persona.competencies.length > 0 && (
              <div>
                <Title headingLevel="h4" size="sm" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Competencies
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {persona.competencies.map((compRef: any) => {
                    const competency = baseline.competencies?.find((c) => c.name === compRef.competencyName);
                    if (!competency) return null;

                    const level = competency.levels?.find((l: any) => l.name === compRef.competencyLevelName);

                    return (
                      <button
                        key={compRef.competencyName}
                        onClick={() => {
                          if (onNavigateToElement) {
                            onNavigateToElement(compRef.competencyName);
                          }
                        }}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--pf-v6-global--BorderColor--100)",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                          e.currentTarget.style.borderColor = "var(--pf-v6-global--primary-color--100)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--100)";
                          e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                        }}
                      >
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                          {compRef.competencyName}
                        </div>
                        {level && (
                          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem" }}>
                            Level {level.level}: {level.name}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Competency (as secondary from persona or persona group) */}
      {type === "competency" && (() => {
        const competency = data;
        return (
          <>
            {competency.narratives && competency.narratives.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <Title headingLevel="h4" size="sm" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Narratives
                </Title>
                {renderNarratives(competency.narratives, baseline)}
              </div>
            )}

            {competency.levels && competency.levels.length > 0 && (
              <div>
                <Title headingLevel="h4" size="sm" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Skill Levels
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {competency.levels
                    .sort((a: any, b: any) => a.level - b.level)
                    .map((level: any) => (
                      <div
                        key={level.name}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          padding: "0.75rem",
                          border: "1px solid var(--pf-v6-global--BorderColor--100)",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: "var(--pf-v6-global--primary-color--100)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            flexShrink: 0,
                          }}
                        >
                          {level.level}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                            {level.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem" }}>
                            {level.description}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Competency Level (as secondary from competency) */}
      {type === "competencyLevel" && (() => {
        const level = data;
        const competency = parent;
        return (
          <>
            {competency && (
              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
                {competency.name}
              </div>
            )}

            {level.narratives && level.narratives.length > 0 && (
              <div>
                <Title headingLevel="h4" size="sm" style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Narratives
                </Title>
                {renderNarratives(level.narratives, baseline)}
              </div>
            )}
          </>
        );
      })()}
    </aside>
  );
}
