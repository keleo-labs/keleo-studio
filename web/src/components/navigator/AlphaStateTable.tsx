"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline, Asset } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

interface AlphaStateTableProps {
  alpha: any;
  baseline: PracticeBaseline;
  assets: Asset[];
  selectedElement: string | null;
  onSelectElement: (element: string | null) => void;
}

export function AlphaStateTable({
  alpha,
  baseline,
  assets,
  selectedElement,
  onSelectElement,
}: AlphaStateTableProps) {
  const states = [...alpha.states].sort((a, b) => a.seq - b.seq);

  // Gather activities that contribute to each state
  const activitiesByState = new Map<string, any[]>();

  // Check both activitySpaces and flat activities
  const allActivities: any[] = [];

  // Activities from activity spaces
  baseline.activitySpaces?.forEach(space => {
    space.activities?.forEach(activity => {
      allActivities.push(activity);
    });
  });

  // Collect activities by state
  allActivities.forEach(activity => {
    activity.contributesTo?.forEach((contrib: any) => {
      if (contrib.alphaName === alpha.name) {
        const stateActivities = activitiesByState.get(contrib.stateName) || [];
        stateActivities.push(activity);
        activitiesByState.set(contrib.stateName, stateActivities);
      }
    });
  });

  // Gather work products that contribute to each state
  const workProductsByState = new Map<string, Array<{workProduct: any, lod: any}>>();

  baseline.workProducts?.forEach(wp => {
    wp.levelsOfDetail?.forEach((lod: any) => {
      lod.contributesTo?.forEach((contrib: any) => {
        if (contrib.alphaName === alpha.name) {
          const stateWPs = workProductsByState.get(contrib.stateName) || [];
          stateWPs.push({ workProduct: wp, lod });
          workProductsByState.set(contrib.stateName, stateWPs);
        }
      });
    });
  });

  const totalStates = states.length;

  return (
    <div style={{ marginTop: "2rem", width: "100%", overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: "0.25rem",
        tableLayout: "fixed"
      }}>
        <colgroup>
          <col style={{ width: "100px" }} />
          {states.map(() => (
            <col key={Math.random()} style={{ width: `${100 / states.length}%` }} />
          ))}
        </colgroup>

        {/* Row 1: State tiles */}
        <tbody>
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              State
            </td>
            {states.map((state, idx) => {
              const isSelected = selectedElement === state.name;
              const hue = 210 + (idx / Math.max(totalStates - 1, 1)) * 90;
              const progressColor = `hsl(${hue}, 70%, 50%)`;

              return (
                <td key={state.name} style={{ padding: "0", verticalAlign: "top" }}>
                  <button
                    onClick={() => onSelectElement(isSelected ? null : state.name)}
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      border: isSelected
                        ? "3px solid var(--pf-v6-global--primary-color--100)"
                        : "2px solid var(--pf-v6-global--BorderColor--100)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                        : "white",
                      cursor: "pointer",
                      textAlign: "center",
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
                      {state.seq}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                      <AliasedName kind="state" name={state.name} browse={false} />
                    </div>
                  </button>
                </td>
              );
            })}
          </tr>

          {/* Row 2: Description + narratives */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Description
            </td>
            {states.map((state) => (
              <td key={state.name} style={{ padding: "0", verticalAlign: "top" }}>
                <div style={{
                  padding: "0.5rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  fontSize: "0.625rem",
                  lineHeight: "1.5",
                  color: "var(--pf-v6-global--Color--100)",
                  minHeight: "3rem"
                }}>
                  {state.description}
                  {state.narratives && state.narratives.length > 0 && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--pf-v6-global--BorderColor--100)" }}>
                      {state.narratives.map((narrative: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: "0.5rem" }}>
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{narrative.name}</div>
                          <div style={{ fontSize: "0.575rem", color: "var(--pf-v6-global--Color--200)" }}>
                            {narrative.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            ))}
          </tr>

          {/* Row 3: Activities */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Activities
            </td>
            {states.map((state) => {
              const stateActivities = activitiesByState.get(state.name) || [];

              return (
                <td key={state.name} style={{ padding: "0", verticalAlign: "top" }}>
                  <div style={{
                    padding: "0.375rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                    border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    minHeight: "3rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem"
                  }}>
                    {stateActivities.length > 0 ? (
                      stateActivities.map((activity) => {
                        const activityAssetRef = activity.assetNames?.find((a: any) => a.type === "icon");
                        const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, assets) : null;
                        const isSelected = selectedElement === activity.name;

                        return (
                          <button
                            key={activity.name}
                            onClick={() => onSelectElement(isSelected ? null : activity.name)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.25rem 0.375rem",
                              border: isSelected
                                ? "2px solid var(--pf-v6-global--primary-color--100)"
                                : "1px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: isSelected
                                ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                : "white",
                              cursor: "pointer",
                              textAlign: "left",
                              width: "100%",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "white";
                              }
                            }}
                          >
                            {activityAsset && <IconAsset asset={activityAsset} size={14} style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: "0.7rem", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <AliasedName kind="activity" name={activity.name} browse={false} />
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                        —
                      </span>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Row 4: Work Products */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Work Products
            </td>
            {states.map((state) => {
              const stateWPs = workProductsByState.get(state.name) || [];

              return (
                <td key={state.name} style={{ padding: "0", verticalAlign: "top" }}>
                  <div style={{
                    padding: "0.375rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                    border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    minHeight: "3rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem"
                  }}>
                    {stateWPs.length > 0 ? (
                      stateWPs.map(({ workProduct, lod }) => {
                        const wpAssetRef = workProduct.assetNames?.find((a: any) => a.type === "icon");
                        const wpAsset = wpAssetRef ? findAsset(wpAssetRef.assetName, assets) : null;
                        const elementKey = `${workProduct.name}::${lod.name}`;
                        const isSelected = selectedElement === elementKey;

                        return (
                          <button
                            key={elementKey}
                            onClick={() => onSelectElement(isSelected ? null : elementKey)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.25rem 0.375rem",
                              border: isSelected
                                ? "2px solid var(--pf-v6-global--primary-color--100)"
                                : "1px solid var(--pf-v6-global--BorderColor--100)",
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              backgroundColor: isSelected
                                ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                : "white",
                              cursor: "pointer",
                              textAlign: "left",
                              width: "100%",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "white";
                              }
                            }}
                          >
                            {wpAsset && <IconAsset asset={wpAsset} size={14} style={{ flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0, fontSize: "0.7rem" }}>
                              <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {workProduct.name}
                              </div>
                              <div style={{ fontSize: "0.65rem", color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                → {lod.name}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                        —
                      </span>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Row 5: Checklist */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Checklist
            </td>
            {states.map((state) => (
              <td key={state.name} style={{ padding: "0", verticalAlign: "top" }}>
                <div style={{
                  padding: "0.5rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  minHeight: "3rem"
                }}>
                  {state.checklist && state.checklist.length > 0 ? (
                    <ul style={{
                      margin: 0,
                      padding: 0,
                      listStyleType: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem"
                    }}>
                      {state.checklist
                        .sort((a: any, b: any) => a.seq - b.seq)
                        .map((item: any) => (
                          <li
                            key={item.name}
                            style={{
                              fontSize: "0.7rem",
                              lineHeight: "1.4",
                              color: "var(--pf-v6-global--Color--100)",
                              display: "flex",
                              gap: "0.375rem",
                              alignItems: "flex-start"
                            }}
                          >
                            <i className="fa-regular fa-square" style={{ fontSize: "0.7rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.125rem" }} />
                            <span>{item.name}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: "0.7rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                      —
                    </span>
                  )}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
