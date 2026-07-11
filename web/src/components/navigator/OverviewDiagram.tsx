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

  // Layout constants (in pixels for SVG)
  const CARD_WIDTH = 180;
  const CARD_HEIGHT = 48;
  const CARD_GAP = 12;        // Gap between sibling cards
  const VERTICAL_PADDING = 12; // Extra padding before children
  const INDENT = 42;
  const LINE_OFFSET = 21;

  interface AlphaNode {
    alpha: typeof baseline.alphas[0];
    x: number;
    y: number;
    score: number;
    children: AlphaNode[];
  }

  // Build tree structure and calculate positions
  const buildAlphaTree = (
    parentName: string | null,
    allAlphas: typeof baseline.alphas,
    startX: number,
    startY: number,
    rootScoreEntry: any
  ): { nodes: AlphaNode[]; totalHeight: number } => {
    const children = allAlphas.filter((a) => a.contributesTo === parentName);
    const nodes: AlphaNode[] = [];
    let currentY = startY;

    for (const alpha of children) {
      // Look up score
      let score = 0;
      if (rootScoreEntry && rootScoreEntry.newAlphas) {
        const findScoreRecursive = (alphas: any[]): number => {
          for (const na of alphas) {
            if (na.alpha.name === alpha.name) return na.score;
            if (na.newAlphas) {
              const s = findScoreRecursive(na.newAlphas);
              if (s > 0) return s;
            }
          }
          return 0;
        };
        score = findScoreRecursive(rootScoreEntry.newAlphas);
      }

      const node: AlphaNode = {
        alpha,
        x: startX,
        y: currentY,
        score,
        children: []
      };

      // Recursively build children
      const hasChildren = allAlphas.some((a) => a.contributesTo === alpha.name);
      if (hasChildren) {
        const childResult = buildAlphaTree(alpha.name, allAlphas, startX + INDENT, currentY + CARD_HEIGHT + CARD_GAP, rootScoreEntry);
        node.children = childResult.nodes;
        // Advance past this card's height + gap + all grandchildren's total height + padding after subtree
        currentY += CARD_HEIGHT + CARD_GAP + childResult.totalHeight + VERTICAL_PADDING;
      } else {
        currentY += CARD_HEIGHT + CARD_GAP;
      }

      nodes.push(node);
    }

    const totalHeight = currentY - startY - CARD_GAP;
    return { nodes, totalHeight };
  };

  // Render alpha nodes recursively
  const renderAlphaNodes = (nodes: AlphaNode[], parentX?: number, parentY?: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    nodes.forEach((node, index) => {
      const isSelected = selectedElement === node.alpha.name;
      const cardCenterY = node.y + CARD_HEIGHT / 2;

      // Draw connecting lines if there's a parent
      if (parentX !== undefined && parentY !== undefined) {
        const parentBottomY = parentY + CARD_HEIGHT;

        // Horizontal line from parent's vertical line to this card
        elements.push(
          <line
            key={`h-${node.alpha.name}`}
            x1={parentX + LINE_OFFSET}
            y1={cardCenterY}
            x2={node.x}
            y2={cardCenterY}
            stroke="rgba(102, 102, 102, 0.8)"
            strokeWidth="3"
          />
        );

        // Vertical line from parent card bottom to last child (only on first iteration)
        if (index === 0) {
          const lastSiblingCenterY = nodes[nodes.length - 1].y + CARD_HEIGHT / 2;
          elements.push(
            <line
              key={`v-parent-${node.alpha.name}`}
              x1={parentX + LINE_OFFSET}
              y1={parentBottomY}
              x2={parentX + LINE_OFFSET}
              y2={lastSiblingCenterY}
              stroke="rgba(102, 102, 102, 0.8)"
              strokeWidth="3"
            />
          );
        }
      }

      // Recursively render children
      if (node.children.length > 0) {
        elements.push(...renderAlphaNodes(node.children, node.x, node.y));
      }
    });

    return elements;
  };

  // Render alpha cards
  const renderAlphaCards = (nodes: AlphaNode[]): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    nodes.forEach((node) => {
      const isSelected = selectedElement === node.alpha.name;
      const assetRef = node.alpha.assetNames?.find((a) => a.type === "icon");
      const asset = assetRef ? findAsset(assetRef.assetName, baseline.assets || []) : null;

      elements.push(
        <g key={`card-${node.alpha.name}`}>
          <rect
            x={node.x}
            y={node.y}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            rx="4"
            fill={getScoreBackgroundColor(node.score, isSelected)}
            stroke={isSelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
            strokeWidth={isSelected ? "3" : "1"}
            style={{ cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => onSelectElement(isSelected ? null : node.alpha.name)}
          />
          <foreignObject
            x={node.x}
            y={node.y}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            style={{ pointerEvents: "none" }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              height: "100%"
            }}>
              {asset && <IconAsset asset={asset} size={18} />}
              <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                <AliasedName kind="alpha" name={node.alpha.name} browse={false} />
              </div>
            </div>
          </foreignObject>
        </g>
      );

      // Recursively render child cards
      if (node.children.length > 0) {
        elements.push(...renderAlphaCards(node.children));
      }
    });

    return elements;
  };

  if (mode === "concerns") {
    // Separate root alphas from contributing alphas
    const rootAlphas = (baseline.alphas || []).filter((a) => !a.contributesTo);

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

    // Build tree structures for all focus groups
    const focusGroups: Array<{
      focusName: string;
      focus: typeof baseline.focuses[0] | undefined;
      trees: Array<{ rootAlpha: typeof baseline.alphas[0]; tree: AlphaNode[]; height: number; score: number }>;
    }> = [];

    let maxWidth = 0;

    Array.from(rootAlphasByFocus.entries()).forEach(([focusName, rootAlphas]) => {
      const trees: Array<{ rootAlpha: typeof baseline.alphas[0]; tree: AlphaNode[]; height: number; score: number; rootX: number }> = [];
      let currentX = 0;

      rootAlphas.forEach((rootAlpha) => {
        // Look up score for root
        let rootScore = 0;
        let rootScoreEntry = null;
        const focusGroup = alphaScores.get(focusName);
        if (focusGroup) {
          const scoreEntry = focusGroup.alphas.find(a => a.alpha.name === rootAlpha.name);
          if (scoreEntry) {
            rootScore = scoreEntry.score;
            rootScoreEntry = scoreEntry;
          }
        }

        // Build tree for children at current X position
        const { nodes, totalHeight } = buildAlphaTree(rootAlpha.name, baseline.alphas || [], currentX + INDENT, CARD_HEIGHT + CARD_GAP, rootScoreEntry);

        // Calculate max depth for this tree to determine width
        const maxDepth = nodes.length > 0 ? Math.max(0, ...nodes.map(n => countDepth(n))) : 0;
        const treeWidth = CARD_WIDTH + (maxDepth > 0 ? (maxDepth + 1) * INDENT : 0) + 42;

        trees.push({
          rootAlpha,
          tree: nodes,
          height: totalHeight,
          score: rootScore,
          rootX: currentX
        });

        currentX += treeWidth;
      });

      focusGroups.push({
        focusName,
        focus: baseline.focuses?.find((f) => f.name === focusName),
        trees
      });
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
          Overview of Concerns
        </Title>

        {/* SVG-based alpha visualization */}
        {focusGroups.map((group) => {
          return (
            <div key={group.focusName} style={{ marginBottom: "2rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <Title headingLevel="h3" size="md" style={{ fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                  {group.focusName}
                </Title>
                {group.focus?.description && (
                  <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 400, color: "var(--pf-v6-global--Color--100)" }}>
                    {group.focus.description}
                  </div>
                )}
              </div>

              <svg width="100%" height={Math.max(...group.trees.map(t => CARD_HEIGHT + t.height + CARD_GAP + 24)) + 24} style={{ overflow: "visible" }}>
                {group.trees.map((treeData, treeIndex) => {
                  const rootX = treeData.rootX;
                  const rootY = 0;

                  // Render root alpha card
                  const isRootSelected = selectedElement === treeData.rootAlpha.name;
                  const rootAssetRef = treeData.rootAlpha.assetNames?.find((a) => a.type === "icon");
                  const rootAsset = rootAssetRef ? findAsset(rootAssetRef.assetName, baseline.assets || []) : null;

                  const rootCard = (
                    <g key={`root-${treeData.rootAlpha.name}`}>
                      <rect
                        x={rootX}
                        y={rootY}
                        width={CARD_WIDTH}
                        height={CARD_HEIGHT}
                        rx="4"
                        fill={getScoreBackgroundColor(treeData.score, isRootSelected)}
                        stroke={isRootSelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
                        strokeWidth={isRootSelected ? "3" : "1"}
                        style={{ cursor: "pointer" }}
                        onClick={() => onSelectElement(isRootSelected ? null : treeData.rootAlpha.name)}
                      />
                      <foreignObject
                        x={rootX}
                        y={rootY}
                        width={CARD_WIDTH}
                        height={CARD_HEIGHT}
                        style={{ pointerEvents: "none" }}
                      >
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem",
                          height: "100%"
                        }}>
                          {rootAsset && <IconAsset asset={rootAsset} size={18} />}
                          <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                            <AliasedName kind="alpha" name={treeData.rootAlpha.name} browse={false} />
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  );

                  // Render child tree
                  const childElements = [
                    ...renderAlphaNodes(treeData.tree, rootX, rootY),
                    ...renderAlphaCards(treeData.tree)
                  ];

                  return [rootCard, ...childElements];
                })}
              </svg>
            </div>
          );
        })}
      </div>
    );
  }

  // Helper to count tree depth
  function countDepth(node: AlphaNode): number {
    if (node.children.length === 0) return 0;
    return 1 + Math.max(...node.children.map(countDepth));
  }

  // Activities mode - build tree structure
  interface ActivityNode {
    activity: typeof baseline.activitySpaces[0]["activities"][0];
    x: number;
    y: number;
    score: number;
  }

  interface ActivitySpaceTree {
    activitySpace: typeof baseline.activitySpaces[0];
    x: number;
    y: number;
    score: number;
    activities: ActivityNode[];
  }

  const buildActivityTree = (
    activitySpace: typeof baseline.activitySpaces[0],
    startX: number,
    startY: number,
    spaceScoreEntry: any
  ): { tree: ActivitySpaceTree; totalHeight: number } => {
    const activities = activitySpace.activities || [];
    const activityNodes: ActivityNode[] = [];
    let currentY = startY + CARD_HEIGHT + CARD_GAP;

    activities.forEach((activity) => {
      // Look up score
      let activityScore = 0;
      if (spaceScoreEntry && spaceScoreEntry.activityScores) {
        const actScoreEntry = spaceScoreEntry.activityScores.find(
          (a: any) => a.activity.name === activity.name
        );
        if (actScoreEntry) {
          activityScore = actScoreEntry.score;
        }
      }

      activityNodes.push({
        activity,
        x: startX + INDENT,
        y: currentY,
        score: activityScore
      });

      currentY += CARD_HEIGHT + CARD_GAP;
    });

    const totalHeight = activities.length > 0
      ? CARD_HEIGHT + CARD_GAP + (activities.length * (CARD_HEIGHT + CARD_GAP)) + VERTICAL_PADDING
      : CARD_HEIGHT + CARD_GAP;

    return {
      tree: {
        activitySpace,
        x: startX,
        y: startY,
        score: 0,
        activities: activityNodes
      },
      totalHeight
    };
  };

  // Group activity spaces by focus
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

  // Build trees for all activity spaces
  const activityFocusGroups: Array<{
    focusName: string;
    focus: typeof baseline.focuses[0] | undefined;
    trees: Array<{ spaceTree: ActivitySpaceTree; height: number }>;
  }> = [];

  Array.from(activitySpacesByFocus.entries()).forEach(([focusName, spaces]) => {
    const trees: Array<{ spaceTree: ActivitySpaceTree; height: number }> = [];
    let currentX = 0;

    spaces.forEach((space) => {
      // Look up score for space
      let spaceScore = 0;
      let spaceScoreEntry = null;
      if (activitySpaceScores) {
        const focusGroup = activitySpaceScores.get(focusName);
        if (focusGroup) {
          const scoreEntry = focusGroup.activitySpaces.find(
            (s) => s.activitySpace.name === space.name
          );
          if (scoreEntry) {
            spaceScore = scoreEntry.score;
            spaceScoreEntry = scoreEntry;
          }
        }
      }

      // Build tree at current X position
      const { tree, totalHeight } = buildActivityTree(space, currentX, 0, spaceScoreEntry);
      tree.score = spaceScore;

      trees.push({
        spaceTree: tree,
        height: totalHeight
      });

      // Advance X position for next tree
      const treeWidth = CARD_WIDTH + (space.activities && space.activities.length > 0 ? INDENT : 0) + 42;
      currentX += treeWidth;
    });

    activityFocusGroups.push({
      focusName,
      focus: baseline.focuses?.find((f) => f.name === focusName),
      trees
    });
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

      {/* SVG-based activity visualization */}
      {activityFocusGroups.map((group) => {
        let currentX = 0;

        return (
          <div key={group.focusName} style={{ marginBottom: "2rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <Title headingLevel="h3" size="md" style={{ fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                {group.focusName}
              </Title>
              {group.focus?.description && (
                <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 400, color: "var(--pf-v6-global--Color--100)" }}>
                  {group.focus.description}
                </div>
              )}
            </div>

            <svg width="100%" height={Math.max(...group.trees.map(t => t.height)) + 24} style={{ overflow: "visible" }}>
              {group.trees.map((treeData) => {
                const spaceX = currentX;
                const spaceY = 0;
                const space = treeData.spaceTree;

                const isSpaceSelected = selectedElement === space.activitySpace.name;
                const spaceAssetRef = space.activitySpace.assetNames?.find((a) => a.type === "icon");
                const spaceAsset = spaceAssetRef ? findAsset(spaceAssetRef.assetName, baseline.assets || []) : null;

                // Render activity space card with arrow shape
                const spaceCard = (
                  <g key={`space-${space.activitySpace.name}`}>
                    {/* Arrow-shaped activity space - filled path with dashed stroke */}
                    <path
                      d={`M 0 0 L ${CARD_WIDTH - 12} 0 L ${CARD_WIDTH} ${CARD_HEIGHT / 2} L ${CARD_WIDTH - 12} ${CARD_HEIGHT} L 0 ${CARD_HEIGHT} Z`}
                      transform={`translate(${spaceX}, ${spaceY})`}
                      fill={getScoreBackgroundColor(space.score, isSpaceSelected)}
                      stroke={isSpaceSelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
                      strokeWidth={isSpaceSelected ? "3" : "1"}
                      strokeDasharray="4"
                      style={{ cursor: "pointer" }}
                      onClick={() => onSelectElement(isSpaceSelected ? null : space.activitySpace.name)}
                    />
                    <foreignObject
                      x={spaceX}
                      y={spaceY}
                      width={CARD_WIDTH - 12}
                      height={CARD_HEIGHT}
                      style={{ pointerEvents: "none" }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem",
                        height: "100%"
                      }}>
                        {spaceAsset && <IconAsset asset={spaceAsset} size={18} />}
                        <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                          <AliasedName kind="activitySpace" name={space.activitySpace.name} browse={false} />
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );

                // Render connecting lines and activities
                const activityElements: JSX.Element[] = [];

                if (space.activities.length > 0) {
                  // Vertical line from space to activities
                  const spaceBottomY = spaceY + CARD_HEIGHT;
                  const lastActivityCenterY = space.activities[space.activities.length - 1].y + CARD_HEIGHT / 2;

                  activityElements.push(
                    <line
                      key={`v-${space.activitySpace.name}`}
                      x1={spaceX + LINE_OFFSET}
                      y1={spaceBottomY}
                      x2={spaceX + LINE_OFFSET}
                      y2={lastActivityCenterY}
                      stroke="rgba(102, 102, 102, 0.8)"
                      strokeWidth="3"
                    />
                  );

                  // Render each activity
                  space.activities.forEach((actNode) => {
                    const isActivitySelected = selectedElement === actNode.activity.name;
                    const activityAssetRef = actNode.activity.assetNames?.find((a) => a.type === "icon");
                    const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, baseline.assets || []) : null;
                    const activityCenterY = actNode.y + CARD_HEIGHT / 2;

                    // Horizontal line
                    activityElements.push(
                      <line
                        key={`h-${actNode.activity.name}`}
                        x1={spaceX + LINE_OFFSET}
                        y1={activityCenterY}
                        x2={actNode.x}
                        y2={activityCenterY}
                        stroke="rgba(102, 102, 102, 0.8)"
                        strokeWidth="3"
                      />
                    );

                    // Activity card with arrow shape
                    activityElements.push(
                      <g key={`activity-${actNode.activity.name}`}>
                        {/* Arrow-shaped activity - filled path with solid stroke */}
                        <path
                          d={`M 0 0 L ${CARD_WIDTH - 12} 0 L ${CARD_WIDTH} ${CARD_HEIGHT / 2} L ${CARD_WIDTH - 12} ${CARD_HEIGHT} L 0 ${CARD_HEIGHT} Z`}
                          transform={`translate(${actNode.x}, ${actNode.y})`}
                          fill={getScoreBackgroundColor(actNode.score, isActivitySelected)}
                          stroke={isActivitySelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
                          strokeWidth={isActivitySelected ? "3" : "1"}
                          style={{ cursor: "pointer" }}
                          onClick={() => onSelectElement(isActivitySelected ? null : actNode.activity.name)}
                        />
                        <foreignObject
                          x={actNode.x}
                          y={actNode.y}
                          width={CARD_WIDTH - 12}
                          height={CARD_HEIGHT}
                          style={{ pointerEvents: "none" }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.75rem",
                            height: "100%"
                          }}>
                            {activityAsset && <IconAsset asset={activityAsset} size={18} />}
                            <div style={{ fontWeight: 600, fontSize: "0.6875rem" }}>
                              <AliasedName kind="activity" name={actNode.activity.name} browse={false} />
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  });
                }

                // Calculate width for next space
                const treeWidth = CARD_WIDTH + (space.activities.length > 0 ? INDENT : 0) + 42;
                currentX += treeWidth;

                return [spaceCard, ...activityElements];
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

