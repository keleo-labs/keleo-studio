"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline, Asset } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

interface PatternTableProps {
  pattern: any;
  baseline: PracticeBaseline;
  assets: Asset[];
  selectedElement: string | null;
  onSelectAlpha: (alphaName: string) => void;
  onSelectState: (alphaName: string, stateName: string) => void;
}

export function PatternTable({
  pattern,
  baseline,
  assets,
  selectedElement,
  onSelectAlpha,
  onSelectState,
}: PatternTableProps) {
  // Collect all unique alphas referenced in pattern views
  const referencedAlphas = new Set<string>();
  pattern.patternViews?.forEach((view: any) => {
    view.alphaStates?.forEach((alphaState: any) => {
      let alphaName;
      if (typeof alphaState === "string") {
        alphaName = alphaState.split(/→|->/)[0]?.trim();
      } else {
        alphaName = alphaState.alphaName;
      }
      if (alphaName) referencedAlphas.add(alphaName);
    });
  });

  // Helper: Find ultimate root alpha recursively
  const findUltimateRoot = (alphaName: string, visited = new Set<string>()): string => {
    if (visited.has(alphaName) || visited.size > 20) {
      return alphaName;
    }
    visited.add(alphaName);

    const alpha = baseline.alphas.find((a) => a.name === alphaName);
    if (!alpha || !alpha.contributesTo) {
      return alphaName;
    }

    return findUltimateRoot(alpha.contributesTo, visited);
  };

  // Build alpha hierarchy (root alphas and their contributing alphas)
  const alphaHierarchy: Array<{
    root: any;
    rootReferenced: boolean;
    contributors: any[];
  }> = [];

  const processedAlphas = new Set<string>();

  // First, find all contributing alphas that are referenced
  const contributingAlphas = baseline.alphas.filter(
    (alpha) => alpha.contributesTo && referencedAlphas.has(alpha.name)
  );

  // Group contributing alphas by their ULTIMATE root alpha (recursive)
  const contributorsByRoot = new Map<string, any[]>();
  contributingAlphas.forEach((alpha) => {
    const rootName = findUltimateRoot(alpha.name);
    if (!contributorsByRoot.has(rootName)) {
      contributorsByRoot.set(rootName, []);
    }
    contributorsByRoot.get(rootName)!.push(alpha);
  });

  // Build hierarchy for each root alpha that has contributors
  contributorsByRoot.forEach((contributors, rootName) => {
    const rootAlpha = baseline.alphas.find((a) => a.name === rootName);
    if (rootAlpha) {
      alphaHierarchy.push({
        root: rootAlpha,
        rootReferenced: referencedAlphas.has(rootName),
        contributors: contributors,
      });

      processedAlphas.add(rootName);
      contributors.forEach((c) => processedAlphas.add(c.name));
    }
  });

  // Add root alphas that are referenced but have no contributing alphas
  baseline.alphas.forEach((alpha) => {
    if (!referencedAlphas.has(alpha.name)) return;
    if (processedAlphas.has(alpha.name)) return;
    if (alpha.contributesTo) return; // Skip contributing alphas

    // This is a referenced root alpha with no contributors
    alphaHierarchy.push({
      root: alpha,
      rootReferenced: true,
      contributors: [],
    });
    processedAlphas.add(alpha.name);
  });

  // Sort hierarchy: root alphas that are referenced come first,
  // then root alphas with only contributors (not themselves referenced)
  alphaHierarchy.sort((a, b) => {
    // If both or neither are referenced, maintain original order
    if (a.rootReferenced === b.rootReferenced) return 0;
    // Referenced roots come first
    return a.rootReferenced ? -1 : 1;
  });

  // Calculate total column span (root alpha + contributors)
  const totalColumns = alphaHierarchy.reduce(
    (sum, item) => {
      const rootCol = item.rootReferenced ? 1 : 0;
      const contributorCols = item.contributors.length;
      return sum + rootCol + contributorCols;
    },
    0
  );

  // Helper to get states for an alpha in a pattern view
  const getStatesForAlpha = (view: any, alphaName: string): string[] => {
    const states: string[] = [];

    view.alphaStates?.forEach((alphaState: any) => {
      let stateAlphaName, stateName;

      if (typeof alphaState === "string") {
        const parts = alphaState.split(/→|->/);
        stateAlphaName = parts[0]?.trim();
        stateName = parts[1]?.trim();
      } else {
        stateAlphaName = alphaState.alphaName;
        stateName = alphaState.stateName;
      }

      if (stateAlphaName === alphaName && stateName) {
        states.push(stateName);
      }
    });

    return states;
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      {/* Pattern name and description above table */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
          <AliasedName kind="pattern" name={pattern.name} browse={false} />
        </div>
        {pattern.description && (
          <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", lineHeight: "1.5" }}>
            {pattern.description}
          </div>
        )}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "0.8125rem",
        }}
      >
        {/* Header - Alpha Swimlanes */}
        <thead>
          {/* Top header row - Root alphas */}
          <tr>
            <th
              rowSpan={2}
              style={{
                minWidth: "280px",
                padding: "1rem",
                textAlign: "left",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                borderBottom: "2px solid var(--pf-v6-global--BorderColor--100)",
                position: "sticky",
                left: 0,
                zIndex: 3,
                verticalAlign: "top",
              }}
            >
              {pattern.narratives && pattern.narratives.length > 0 && (
                <div>
                  {pattern.narratives.map((narrative: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: idx < pattern.narratives.length - 1 ? "0.75rem" : 0 }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                        {narrative.name}
                      </div>
                      {narrative.description && (
                        <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", lineHeight: "1.5" }}>
                          {narrative.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </th>
            {alphaHierarchy.map((item, idx) => {
              // Calculate colspan: root column (if referenced) + contributor columns
              const rootCol = item.rootReferenced ? 1 : 0;
              const contributorCols = item.contributors.length;
              const colSpan = rootCol + contributorCols;

              const rootAssetRef = item.root.assetNames?.find((a: any) => a.type === "icon");
              const rootAsset = rootAssetRef ? findAsset(rootAssetRef.assetName, assets) : null;

              const isRootSelected = selectedElement === item.root.name;

              return (
                <th
                  key={idx}
                  colSpan={colSpan}
                  style={{
                    padding: "0.5rem 0.75rem",
                    textAlign: "left",
                    backgroundColor: isRootSelected
                      ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 15%, var(--pf-v6-global--BackgroundColor--200))"
                      : "var(--pf-v6-global--BackgroundColor--200)",
                    borderBottom: "1px dashed var(--pf-v6-global--BorderColor--100)",
                    borderLeft: idx > 0 ? "1px solid var(--pf-v6-global--BorderColor--100)" : "none",
                    borderTop: isRootSelected
                      ? "3px solid var(--pf-v6-global--primary-color--100)"
                      : "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onClick={() => onSelectAlpha(item.root.name)}
                  onMouseEnter={(e) => {
                    if (!isRootSelected) {
                      e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 8%, var(--pf-v6-global--BackgroundColor--200))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRootSelected) {
                      e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {rootAsset && <IconAsset asset={rootAsset} size={20} style={{ flexShrink: 0 }} />}
                    <div style={{ fontWeight: 600, fontSize: "0.75rem", color: isRootSelected ? "var(--pf-v6-global--primary-color--100)" : "inherit" }}>
                      <AliasedName kind="alpha" name={item.root.name} browse={false} />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>

          {/* Second header row - Individual alpha columns (root if referenced + contributors) */}
          <tr>
            {/* Left cell is spanned from row above */}
            {alphaHierarchy.map((item, groupIdx) => {
              const cells = [];

              // Add root alpha cell if it's referenced in pattern views
              if (item.rootReferenced) {
                const rootAssetRef = item.root.assetNames?.find((a: any) => a.type === "icon");
                const rootAsset = rootAssetRef ? findAsset(rootAssetRef.assetName, assets) : null;
                const isSelected = selectedElement === item.root.name;

                cells.push(
                  <th
                    key={`${groupIdx}-root`}
                    style={{
                      padding: "0.5rem",
                      textAlign: "center",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 15%, var(--pf-v6-global--BackgroundColor--200))"
                        : "var(--pf-v6-global--BackgroundColor--200)",
                      borderBottom: "2px solid var(--pf-v6-global--BorderColor--100)",
                      borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)",
                      borderTop: isSelected
                        ? "3px solid var(--pf-v6-global--primary-color--100)"
                        : "3px solid var(--pf-v6-global--primary-color--100)",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <button
                      onClick={() => onSelectAlpha(item.root.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: 0,
                        width: "100%",
                      }}
                    >
                      {rootAsset && <IconAsset asset={rootAsset} size={18} />}
                      <div style={{ fontWeight: 700, fontSize: "0.6875rem", color: isSelected ? "var(--pf-v6-global--primary-color--100)" : "inherit" }}>
                        <AliasedName kind="alpha" name={item.root.name} browse={false} />
                      </div>
                    </button>
                  </th>
                );
              }

              // Add contributing alpha cells
              item.contributors.forEach((contributor, contribIdx) => {
                const assetRef = contributor.assetNames?.find((a: any) => a.type === "icon");
                const asset = assetRef ? findAsset(assetRef.assetName, assets) : null;
                const isSelected = selectedElement === contributor.name;

                cells.push(
                  <th
                    key={`${groupIdx}-${contribIdx}`}
                    style={{
                      padding: "0.5rem",
                      textAlign: "center",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 15%, var(--pf-v6-global--BackgroundColor--100))"
                        : "var(--pf-v6-global--BackgroundColor--100)",
                      borderBottom: "2px solid var(--pf-v6-global--BorderColor--100)",
                      borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <button
                      onClick={() => onSelectAlpha(contributor.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: 0,
                        width: "100%",
                      }}
                    >
                      {asset && <IconAsset asset={asset} size={18} />}
                      <div style={{ fontWeight: 600, fontSize: "0.6875rem", color: isSelected ? "var(--pf-v6-global--primary-color--100)" : "inherit" }}>
                        <AliasedName kind="alpha" name={contributor.name} browse={false} />
                      </div>
                    </button>
                  </th>
                );
              });

              return cells;
            })}
          </tr>
        </thead>

        {/* Body - Pattern Views */}
        <tbody>
          {pattern.patternViews
            ?.sort((a: any, b: any) => a.seq - b.seq)
            .map((view: any, viewIdx: number) => (
              <tr key={viewIdx}>
                {/* Left column - Pattern view name and description */}
                <td
                  style={{
                    padding: "1.5rem 1rem",
                    borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                    verticalAlign: "top",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                >
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.6875rem", marginBottom: "0.25rem" }}>
                      {view.name}
                    </div>
                    {view.description && (
                      <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", lineHeight: "1.5" }}>
                        {view.description}
                      </div>
                    )}
                  </div>
                  {view.narrativeContexts && view.narrativeContexts.length > 0 && (
                    <div>
                      {view.narrativeContexts.map((ctx: any, ctxIdx: number) => (
                        <div
                          key={ctxIdx}
                          style={{
                            fontSize: "0.625rem",
                            lineHeight: "1.5",
                            color: "var(--pf-v6-global--Color--100)",
                            marginBottom: "0.5rem",
                            paddingLeft: "1rem",
                            borderLeft: "2px solid var(--pf-v6-global--BorderColor--200)",
                          }}
                        >
                          {ctx.context}
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* Alpha columns - States */}
                {alphaHierarchy.map((item, groupIdx) => {
                  const renderStatesForAlpha = (alphaName: string, isSubColumn: boolean = false) => {
                    const states = getStatesForAlpha(view, alphaName);

                    return (
                      <td
                        key={alphaName}
                        style={{
                          padding: "1rem 0.75rem",
                          borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                          borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)",
                          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                          verticalAlign: "top",
                        }}
                      >
                        {states.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {states.map((stateName, stateIdx) => {
                              const stateKey = `${alphaName}::${stateName}`;
                              const isSelected = selectedElement === stateKey;

                              return (
                                <button
                                  key={stateIdx}
                                  onClick={() => onSelectState(alphaName, stateName)}
                                  style={{
                                    padding: "0.375rem 0.5rem",
                                    border: isSelected
                                      ? "2px solid var(--pf-v6-global--primary-color--100)"
                                      : "2px solid var(--pf-v6-global--BorderColor--100)",
                                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                    backgroundColor: isSelected
                                      ? "var(--pf-v6-global--primary-color--100)"
                                      : "var(--pf-v6-global--BackgroundColor--200)",
                                    color: isSelected ? "white" : "inherit",
                                    fontSize: "0.625rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    textAlign: "center",
                                    transition: "all 0.2s",
                                    width: "100%",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.backgroundColor = "var(--pf-v6-global--primary-color--100)";
                                      e.currentTarget.style.color = "white";
                                      e.currentTarget.style.borderColor = "var(--pf-v6-global--primary-color--100)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
                                      e.currentTarget.style.color = "inherit";
                                      e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
                                    }
                                  }}
                                >
                                  <AliasedName kind="state" name={stateName} browse={false} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  };

                  // Render cells for this alpha group
                  const cells = [];

                  // Render root alpha cell if it's referenced
                  if (item.rootReferenced) {
                    cells.push(renderStatesForAlpha(item.root.name, false));
                  }

                  // Render contributing alpha cells
                  item.contributors.forEach((contributor) => {
                    cells.push(renderStatesForAlpha(contributor.name, true));
                  });

                  return cells;
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
