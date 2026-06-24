"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline } from "@/lib/types";
import type {
  FocusGroup as AlphaScoreFocusGroup,
  ActivitySpaceFocusGroup
} from "@/lib/analysis/methodFocus";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

interface OverviewDiagramProps {
  baseline: PracticeBaseline;
  mode: "concerns" | "activities";
  alphaScores: Map<string, AlphaScoreFocusGroup>;
  activitySpaceScores?: Map<string, ActivitySpaceFocusGroup>;
  onSelectElement: (elementName: string) => void;
  selectedElement: string | null;
}

// Helper function to get background color based on score (works for both alphas and activities)
function getScoreBackgroundColor(score: number, isSelected: boolean): string {
  if (isSelected) {
    return "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, #ffffff)";
  }

  // 0 - white, 1 - light blue, 2 - mid blue, 3+ - dark blue
  if (score === 0) {
    return "#ffffff";
  } else if (score === 1) {
    return "#E7F1FA"; // Light blue
  } else if (score === 2) {
    return "#BEE1F4"; // Mid blue
  } else {
    return "#73BCF7"; // Dark blue
  }
}

export function OverviewDiagram({
  baseline,
  mode,
  alphaScores,
  activitySpaceScores,
  onSelectElement,
  selectedElement,
}: OverviewDiagramProps) {

  if (mode === "concerns") {
    // Separate root alphas from contributing alphas
    const rootAlphas = (baseline.alphas || []).filter((a) => !a.contributesTo);
    const contributingAlphas = (baseline.alphas || []).filter((a) => a.contributesTo);

    // Group root alphas by focus
    const rootAlphasByFocus = new Map<string, typeof baseline.alphas>();

    for (const alpha of rootAlphas) {
      const focusName = alpha.focusName || "Other";
      if (!rootAlphasByFocus.has(focusName)) {
        rootAlphasByFocus.set(focusName, []);
      }
      rootAlphasByFocus.get(focusName)!.push(alpha);
    }

    // Sort root alphas by seq within each focus
    rootAlphasByFocus.forEach((alphas) => {
      alphas.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    });

    // Build map of root alpha -> contributing alphas
    const contributorsByRoot = new Map<string, typeof baseline.alphas>();
    for (const alpha of contributingAlphas) {
      const rootName = alpha.contributesTo!;
      if (!contributorsByRoot.has(rootName)) {
        contributorsByRoot.set(rootName, []);
      }
      contributorsByRoot.get(rootName)!.push(alpha);
    }


    return (
      <div style={{ position: "relative" }}>
        <Title
          headingLevel="h1"
          size="2xl"
          style={{
            marginBottom: "1.5rem",
            fontWeight: 700,
            color: "var(--pf-v6-global--Color--100)"
          }}
        >
          Overview of Concerns
        </Title>

        {/* Alpha cards grouped by focus */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative" }}>
          {Array.from(rootAlphasByFocus.entries()).map(([focusName, rootAlphas]) => (
            <div key={focusName}>
              <div style={{ marginBottom: "1rem" }}>
                <Title headingLevel="h3" size="md" style={{ fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                  {focusName}
                </Title>
                {(() => {
                  const focus = baseline.focuses?.find((f) => f.name === focusName);
                  if (focus?.description) {
                    return (
                      <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 400, color: "var(--pf-v6-global--Color--100)" }}>
                        {focus.description}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              {/* Root alphas in rows (max 5 per row) */}
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                {rootAlphas.map((rootAlpha) => {
                  const contributors = contributorsByRoot.get(rootAlpha.name) || [];
                  const rootAssetRef = rootAlpha.assetNames?.find((a) => a.type === "icon");
                  const rootAsset = rootAssetRef ? findAsset(rootAssetRef.assetName, baseline.assets || []) : null;
                  const isSelected = selectedElement === rootAlpha.name;

                  // Look up the score for this alpha
                  let alphaScore = 0;
                  let rootScoreEntry = null;
                  const focusGroup = alphaScores.get(focusName);
                  if (focusGroup) {
                    const scoreEntry = focusGroup.alphas.find(a => a.alpha.name === rootAlpha.name);
                    if (scoreEntry) {
                      alphaScore = scoreEntry.score;
                      rootScoreEntry = scoreEntry;
                    }
                  }

                  return (
                    <div key={rootAlpha.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", position: "relative" }}>
                      {/* Root alpha card */}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          data-element-name={rootAlpha.name}
                          onClick={() => onSelectElement(isSelected ? null : rootAlpha.name)}
                          style={{
                            padding: "0.75rem",
                            border: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "1px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: getScoreBackgroundColor(alphaScore, isSelected),
                            cursor: "pointer",
                            transition: "all 0.2s",
                            width: "180px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {rootAsset && <IconAsset asset={rootAsset} size={18} />}
                            <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                              <AliasedName kind="alpha" name={rootAlpha.name} browse={false} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contributing alphas stacked vertically below with connecting line */}
                      {contributors.length > 0 && (
                        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          {/* Permanent vertical line connecting to contributors - behind cards */}
                          <svg
                            style={{
                              position: "absolute",
                              top: "-0.75rem",
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: "3px",
                              height: "calc(100% + 0.75rem)",
                              pointerEvents: "none",
                              zIndex: 0,
                            }}
                          >
                            <line
                              x1="1.5"
                              y1="0"
                              x2="1.5"
                              y2="100%"
                              stroke="rgba(102, 102, 102, 0.8)"
                              strokeWidth="3"
                            />
                          </svg>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.75rem" }}>
                            {contributors.map((contributor) => {
                              const contribAssetRef = contributor.assetNames?.find((a) => a.type === "icon");
                              const contribAsset = contribAssetRef ? findAsset(contribAssetRef.assetName, baseline.assets || []) : null;
                              const isContribSelected = selectedElement === contributor.name;

                              // Look up the score for this contributing alpha
                              let contribScore = 0;
                              if (rootScoreEntry && rootScoreEntry.newAlphas) {
                                const contribEntry = rootScoreEntry.newAlphas.find(na => na.alpha.name === contributor.name);
                                if (contribEntry) {
                                  contribScore = contribEntry.score;
                                }
                              }

                              return (
                                <div
                                  key={contributor.name}
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                  }}
                                >
                                  <div
                                    data-element-name={contributor.name}
                                    onClick={() => onSelectElement(isContribSelected ? null : contributor.name)}
                                    style={{
                                      padding: "0.75rem",
                                      border: isContribSelected
                                        ? "3px solid var(--pf-v6-global--primary-color--100)"
                                        : "1px solid var(--pf-v6-global--BorderColor--100)",
                                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                      backgroundColor: getScoreBackgroundColor(contribScore, isContribSelected),
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                      width: "180px",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      {contribAsset && <IconAsset asset={contribAsset} size={18} />}
                                      <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                                        <AliasedName kind="alpha" name={contributor.name} browse={false} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Activities mode - group activity spaces by focus
  const activitySpacesByFocus = new Map<string, typeof baseline.activitySpaces>();

  const activitySpaces = baseline.activitySpaces || [];
  for (const space of activitySpaces) {
    const focusName = space.focusName || "Other";
    if (!activitySpacesByFocus.has(focusName)) {
      activitySpacesByFocus.set(focusName, []);
    }
    activitySpacesByFocus.get(focusName)!.push(space);
  }

  // Sort activity spaces by seq within each focus
  activitySpacesByFocus.forEach((spaces) => {
    spaces.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  });

  return (
    <div style={{ position: "relative" }}>
      <Title
        headingLevel="h1"
        size="2xl"
        style={{
          marginBottom: "1.5rem",
          fontWeight: 700,
          color: "var(--pf-v6-global--Color--100)"
        }}
      >
        Overview of Activities
      </Title>

      {/* Activity spaces grouped by focus */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative" }}>
        {Array.from(activitySpacesByFocus.entries()).map(([focusName, spaces]) => (
          <div key={focusName}>
            <div style={{ marginBottom: "1rem" }}>
              <Title headingLevel="h3" size="md" style={{ fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                {focusName}
              </Title>
              {(() => {
                const focus = baseline.focuses?.find((f) => f.name === focusName);
                if (focus?.description) {
                  return (
                    <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 400, color: "var(--pf-v6-global--Color--100)" }}>
                      {focus.description}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            {/* Activity spaces in rows (max 5 per row) */}
            <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              {spaces.map((activitySpace) => {
                const activities = activitySpace.activities || [];
                const spaceAssetRef = activitySpace.assetNames?.find((a) => a.type === "icon");
                const spaceAsset = spaceAssetRef ? findAsset(spaceAssetRef.assetName, baseline.assets || []) : null;
                const isSelected = selectedElement === activitySpace.name;

                // Look up the score for this activity space
                let spaceScore = 0;
                let spaceScoreEntry = null;
                if (activitySpaceScores) {
                  const focusGroup = activitySpaceScores.get(focusName);
                  if (focusGroup) {
                    const scoreEntry = focusGroup.activitySpaces.find(
                      (s) => s.activitySpace.name === activitySpace.name
                    );
                    if (scoreEntry) {
                      spaceScore = scoreEntry.score;
                      spaceScoreEntry = scoreEntry;
                    }
                  }
                }

                return (
                  <div key={activitySpace.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", position: "relative" }}>
                    {/* Activity space card - arrow shape with dashed border */}
                    <div style={{ position: "relative", zIndex: 1, paddingRight: "15px" }}>
                      <div
                        data-element-name={activitySpace.name}
                        onClick={() => onSelectElement(isSelected ? null : activitySpace.name)}
                        style={{
                          padding: "0.75rem",
                          paddingRight: "0.75rem",
                          clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                          border: isSelected
                            ? "3px dashed var(--pf-v6-global--primary-color--100)"
                            : "1px dashed var(--pf-v6-global--BorderColor--100)",
                          backgroundColor: getScoreBackgroundColor(spaceScore, isSelected),
                          cursor: "pointer",
                          transition: "all 0.2s",
                          width: "180px",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingRight: "12px" }}>
                          {spaceAsset && <IconAsset asset={spaceAsset} size={18} />}
                          <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                            <AliasedName kind="activitySpace" name={activitySpace.name} browse={false} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activities stacked vertically below with connecting line */}
                    {activities.length > 0 && (
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {/* Permanent vertical line connecting to activities - behind cards */}
                        <svg
                          style={{
                            position: "absolute",
                            top: "-0.75rem",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "3px",
                            height: "calc(100% + 0.75rem)",
                            pointerEvents: "none",
                            zIndex: 0,
                          }}
                        >
                          <line
                            x1="1.5"
                            y1="0"
                            x2="1.5"
                            y2="100%"
                            stroke="rgba(102, 102, 102, 0.8)"
                            strokeWidth="3"
                          />
                        </svg>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.75rem" }}>
                          {activities.map((activity) => {
                            const activityAssetRef = activity.assetNames?.find((a) => a.type === "icon");
                            const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, baseline.assets || []) : null;
                            const isActivitySelected = selectedElement === activity.name;

                            // Look up the score for this activity
                            let activityScore = 0;
                            if (spaceScoreEntry && spaceScoreEntry.activityScores) {
                              const actScoreEntry = spaceScoreEntry.activityScores.find(
                                (a) => a.activity.name === activity.name
                              );
                              if (actScoreEntry) {
                                activityScore = actScoreEntry.score;
                              }
                            }

                            return (
                              <div
                                key={activity.name}
                                style={{
                                  position: "relative",
                                  zIndex: 1,
                                  paddingRight: "15px",
                                }}
                              >
                                <div
                                  data-element-name={activity.name}
                                  onClick={() => onSelectElement(isActivitySelected ? null : activity.name)}
                                  style={{
                                    padding: "0.75rem",
                                    paddingRight: "0.75rem",
                                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                                    border: isActivitySelected
                                      ? "3px solid var(--pf-v6-global--primary-color--100)"
                                      : "1px solid var(--pf-v6-global--BorderColor--100)",
                                    backgroundColor: getScoreBackgroundColor(activityScore, isActivitySelected),
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    width: "180px",
                                    position: "relative",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingRight: "12px" }}>
                                    {activityAsset && <IconAsset asset={activityAsset} size={18} />}
                                    <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                                      <AliasedName kind="activity" name={activity.name} browse={false} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
