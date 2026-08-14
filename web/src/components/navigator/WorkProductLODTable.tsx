"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline, Asset } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

interface WorkProductLODTableProps {
  workProduct: any;
  baseline: PracticeBaseline;
  assets: Asset[];
  selectedElement: string | null;
  onSelectElement: (element: string | null) => void;
  specificLevelOfDetail?: string;
}

export function WorkProductLODTable({
  workProduct,
  baseline,
  assets,
  selectedElement,
  onSelectElement,
  specificLevelOfDetail,
}: WorkProductLODTableProps) {
  const lods = [...workProduct.levelsOfDetail]
    .filter((lod: any) => !specificLevelOfDetail || lod.name === specificLevelOfDetail)
    .sort((a: any, b: any) => a.seq - b.seq);

  const allActivities: any[] = [];
  baseline.activitySpaces?.forEach(space => {
    space.activities?.forEach(activity => {
      allActivities.push(activity);
    });
  });

  const activitiesByLOD = new Map<string, any[]>();
  allActivities.forEach(activity => {
    activity.worksOn?.forEach((wo: any) => {
      if (wo.workProductName === workProduct.name) {
        const lodActivities = activitiesByLOD.get(wo.levelOfDetailName) || [];
        lodActivities.push(activity);
        activitiesByLOD.set(wo.levelOfDetailName, lodActivities);
      }
    });
  });

  const totalLODs = lods.length;

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
          {lods.map((_: any, i: number) => (
            <col key={i} style={{ width: `${100 / lods.length}%` }} />
          ))}
        </colgroup>

        <tbody>
          {/* Row 1: LOD tiles */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Level of Detail
            </td>
            {lods.map((lod: any, idx: number) => {
              const isSelected = selectedElement === lod.name;
              const hue = 210 + (idx / Math.max(totalLODs - 1, 1)) * 90;
              const progressColor = `hsl(${hue}, 70%, 50%)`;

              return (
                <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
                  <button
                    onClick={() => onSelectElement(isSelected ? null : lod.name)}
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
                      {lod.seq}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                      <AliasedName kind="levelOfDetail" name={lod.name} browse={false} />
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
            {lods.map((lod: any) => (
              <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
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
                  {lod.description}
                </div>
              </td>
            ))}
          </tr>

          {/* Row 2.5: Prerequisites (only if any LOD has background) */}
          {lods.some((lod: any) => lod.background) && (
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Prerequisites
            </td>
            {lods.map((lod: any) => {
              const bg = lod.background;
              if (!bg) {
                return (
                  <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
                    <div style={{
                      padding: "0.5rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      minHeight: "2rem",
                      fontSize: "0.625rem",
                      color: "var(--pf-v6-global--Color--200)",
                      fontStyle: "italic",
                    }}>
                      —
                    </div>
                  </td>
                );
              }

              const items: string[] = [];
              if (bg.given) items.push(...bg.given);
              bg.alphaStates?.forEach((s: any) => items.push(`${s.alphaName} → ${s.stateName}`));
              bg.workProductLevels?.forEach((w: any) => items.push(`${w.workProductName} → ${w.levelOfDetailName}`));

              return (
                <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
                  <div style={{
                    padding: "0.5rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                    border: "1px solid var(--pf-v6-global--BorderColor--100)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    fontSize: "0.625rem",
                    lineHeight: "1.5",
                    minHeight: "2rem",
                  }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ color: "var(--pf-v6-global--Color--100)" }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </td>
              );
            })}
          </tr>
          )}

          {/* Row 3: Contributes To */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Contributes To
            </td>
            {lods.map((lod: any) => {
              const contributions = lod.contributesTo || [];

              return (
                <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
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
                    {contributions.length > 0 ? (
                      contributions.map((contrib: any, idx: number) => {
                        const alpha = baseline.alphas.find((a) => a.name === contrib.alphaName);
                        const alphaAssetRef = alpha?.assetNames?.find((a: any) => a.type === "icon");
                        const alphaAsset = alphaAssetRef ? findAsset(alphaAssetRef.assetName, assets) : null;
                        const elementKey = `${contrib.alphaName}::${contrib.stateName}`;
                        const isSelected = selectedElement === elementKey;

                        return (
                          <button
                            key={idx}
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
                            {alphaAsset && <IconAsset asset={alphaAsset} size={14} style={{ flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0, fontSize: "0.7rem" }}>
                              <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <AliasedName kind="alpha" name={contrib.alphaName} browse={false} />
                              </div>
                              <div style={{ fontSize: "0.65rem", color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                → <AliasedName kind="state" name={contrib.stateName} browse={false} />
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

          {/* Row 4: Developed By (activities whose worksOn targets this LOD) */}
          <tr>
            <td style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
              verticalAlign: "top",
              padding: "0.25rem"
            }}>
              Developed By
            </td>
            {lods.map((lod: any) => {
              const lodActivities = activitiesByLOD.get(lod.name) || [];

              return (
                <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
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
                    {lodActivities.length > 0 ? (
                      lodActivities.map((activity: any) => {
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
            {lods.map((lod: any) => (
              <td key={lod.name} style={{ padding: "0", verticalAlign: "top" }}>
                <div style={{
                  padding: "0.5rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  minHeight: "3rem"
                }}>
                  {lod.checklist && lod.checklist.length > 0 ? (
                    <ul style={{
                      margin: 0,
                      padding: 0,
                      listStyleType: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem"
                    }}>
                      {lod.checklist
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
