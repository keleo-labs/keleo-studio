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

function splitIntoBalancedColumns<T extends { slotHeight: number }>(
  items: T[],
  numCols: number,
): T[][] {
  if (numCols <= 1 || items.length < numCols) return [items];

  const prefix = [0];
  for (const item of items) {
    prefix.push(prefix[prefix.length - 1] + item.slotHeight);
  }
  const total = prefix[items.length];

  if (numCols === 2) {
    let bestSplit = 1;
    let bestMax = Infinity;
    for (let s = 1; s < items.length; s++) {
      const maxH = Math.max(prefix[s], total - prefix[s]);
      if (maxH < bestMax) { bestMax = maxH; bestSplit = s; }
    }
    return [items.slice(0, bestSplit), items.slice(bestSplit)];
  }

  let bestSplits = [1, 2];
  let bestMax = Infinity;
  for (let s1 = 1; s1 < items.length - 1; s1++) {
    for (let s2 = s1 + 1; s2 < items.length; s2++) {
      const maxH = Math.max(prefix[s1], prefix[s2] - prefix[s1], total - prefix[s2]);
      if (maxH < bestMax) { bestMax = maxH; bestSplits = [s1, s2]; }
    }
  }
  return [
    items.slice(0, bestSplits[0]),
    items.slice(bestSplits[0], bestSplits[1]),
    items.slice(bestSplits[1]),
  ];
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
  const MULTI_COL_THRESHOLD = 7 * (CARD_HEIGHT + CARD_GAP);
  const COLUMN_GAP = 24;
  const MAPS_TO_BAR_WIDTH = 6;

  interface AlphaNode {
    alpha: typeof baseline.alphas[0];
    x: number;
    y: number;
    score: number;
    children: AlphaNode[];
    relationship: "contributesTo" | "mapsTo";
  }

  // Build tree structure and calculate positions
  const buildAlphaTree = (
    parentName: string | null,
    allAlphas: typeof baseline.alphas,
    startX: number,
    startY: number,
    rootScoreEntry: any
  ): { nodes: AlphaNode[]; totalHeight: number } => {
    const mapsToChildren = allAlphas.filter((a) => a.mapsTo === parentName);
    const contributesToChildren = allAlphas.filter((a) => a.contributesTo === parentName);
    const children = [...mapsToChildren, ...contributesToChildren];
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
        children: [],
        relationship: alpha.mapsTo === parentName ? "mapsTo" : "contributesTo",
      };

      const hasChildren = allAlphas.some((a) => a.contributesTo === alpha.name || a.mapsTo === alpha.name);
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

  const findAlphaScore = (alphaName: string, scoreEntry: any): number => {
    if (!scoreEntry?.newAlphas) return 0;
    const search = (alphas: any[]): number => {
      for (const na of alphas) {
        if (na.alpha.name === alphaName) return na.score;
        if (na.newAlphas) {
          const s = search(na.newAlphas);
          if (s > 0) return s;
        }
      }
      return 0;
    };
    return search(scoreEntry.newAlphas);
  };

  const buildMultiColumnTree = (
    rootAlphaName: string,
    allAlphas: typeof baseline.alphas,
    rootScoreEntry: any,
  ): {
    columns: Array<{ nodes: AlphaNode[]; parentX: number }>;
    numColumns: number;
    rootCardWidth: number;
    treeWidth: number;
    treeHeight: number;
  } => {
    const mapsToDirectChildren = allAlphas.filter(a => a.mapsTo === rootAlphaName);
    const contributesToDirectChildren = allAlphas.filter(a => a.contributesTo === rootAlphaName);
    const directChildren = [...mapsToDirectChildren, ...contributesToDirectChildren];

    if (directChildren.length === 0) {
      return {
        columns: [],
        numColumns: 1,
        rootCardWidth: CARD_WIDTH,
        treeWidth: CARD_WIDTH,
        treeHeight: CARD_HEIGHT,
      };
    }

    const childMeasurements = directChildren.map(child => {
      const hasGrandchildren = allAlphas.some(a => a.contributesTo === child.name || a.mapsTo === child.name);
      if (!hasGrandchildren) {
        return { child, slotHeight: CARD_HEIGHT + CARD_GAP, maxDepth: 0 };
      }
      const { nodes: grandchildren, totalHeight: gcHeight } = buildAlphaTree(
        child.name, allAlphas, INDENT, CARD_HEIGHT + CARD_GAP, rootScoreEntry
      );
      const maxDepth = 1 + Math.max(0, ...grandchildren.map(countDepth));
      return {
        child,
        slotHeight: CARD_HEIGHT + CARD_GAP + gcHeight + VERTICAL_PADDING,
        maxDepth,
      };
    });

    const totalChildrenHeight = childMeasurements.reduce((s, m) => s + m.slotHeight, 0);

    let numColumns = 1;
    let columnGroups = [childMeasurements];

    if (totalChildrenHeight > MULTI_COL_THRESHOLD && directChildren.length >= 2) {
      const split2 = splitIntoBalancedColumns(childMeasurements, 2);
      const maxHeight2 = Math.max(...split2.map(col => col.reduce((s, m) => s + m.slotHeight, 0)));

      if (maxHeight2 <= totalChildrenHeight * 0.7) {
        numColumns = 2;
        columnGroups = split2;

        if (maxHeight2 > MULTI_COL_THRESHOLD && directChildren.length >= 4) {
          const split3 = splitIntoBalancedColumns(childMeasurements, 3);
          const maxHeight3 = Math.max(...split3.map(col => col.reduce((s, m) => s + m.slotHeight, 0)));
          if (maxHeight3 <= maxHeight2 * 0.7) {
            numColumns = 3;
            columnGroups = split3;
          }
        }
      }
    }

    const columns: Array<{ nodes: AlphaNode[]; parentX: number }> = [];
    let currentColX = 0;
    let maxColumnBottom = CARD_HEIGHT;

    for (const colItems of columnGroups) {
      const colNodes: AlphaNode[] = [];
      let currentY = CARD_HEIGHT + CARD_GAP;

      for (const { child } of colItems) {
        const score = findAlphaScore(child.name, rootScoreEntry);

        const node: AlphaNode = {
          alpha: child,
          x: currentColX + INDENT,
          y: currentY,
          score,
          children: [],
          relationship: child.mapsTo === rootAlphaName ? "mapsTo" : "contributesTo",
        };

        const hasGrandchildren = allAlphas.some(a => a.contributesTo === child.name || a.mapsTo === child.name);
        if (hasGrandchildren) {
          const childResult = buildAlphaTree(
            child.name, allAlphas,
            currentColX + 2 * INDENT,
            currentY + CARD_HEIGHT + CARD_GAP,
            rootScoreEntry
          );
          node.children = childResult.nodes;
          currentY += CARD_HEIGHT + CARD_GAP + childResult.totalHeight + VERTICAL_PADDING;
        } else {
          currentY += CARD_HEIGHT + CARD_GAP;
        }

        colNodes.push(node);
      }

      maxColumnBottom = Math.max(maxColumnBottom, currentY - CARD_GAP);

      const colMaxDepth = Math.max(0, ...colItems.map(m => m.maxDepth));
      const colWidth = (colMaxDepth + 1) * INDENT + CARD_WIDTH;

      columns.push({ nodes: colNodes, parentX: currentColX });
      currentColX += colWidth + COLUMN_GAP;
    }

    const totalWidth = columns.length > 0 ? currentColX - COLUMN_GAP : CARD_WIDTH;
    const rootCardWidth = numColumns > 1 ? totalWidth : CARD_WIDTH;
    const treeHeight = maxColumnBottom;

    return { columns, numColumns, rootCardWidth, treeWidth: totalWidth, treeHeight };
  };

  const CONTRIBUTES_TO_COLOR = "rgba(102, 102, 102, 0.8)";
  const MAPS_TO_COLOR = "rgba(0, 102, 204, 0.6)";

  const renderAlphaNodes = (nodes: AlphaNode[], parentX?: number, parentY?: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    if (parentX !== undefined && parentY !== undefined) {
      const parentBottomY = parentY + CARD_HEIGHT;
      const mapsToNodes = nodes.filter(n => n.relationship === "mapsTo");
      const contributesToNodes = nodes.filter(n => n.relationship !== "mapsTo");

      if (contributesToNodes.length > 0) {
        const lastContribCenterY = contributesToNodes[contributesToNodes.length - 1].y + CARD_HEIGHT / 2;
        elements.push(
          <line
            key={`v-ct-${nodes[0].alpha.name}`}
            x1={parentX + LINE_OFFSET}
            y1={parentBottomY}
            x2={parentX + LINE_OFFSET}
            y2={lastContribCenterY}
            stroke={CONTRIBUTES_TO_COLOR}
            strokeWidth="3"
          />
        );
      }

      if (mapsToNodes.length > 0) {
        const barX = mapsToNodes[0].x - MAPS_TO_BAR_WIDTH;
        const barTop = parentBottomY;
        const barBottom = mapsToNodes[mapsToNodes.length - 1].y + CARD_HEIGHT;
        elements.push(
          <rect
            key={`v-mt-${nodes[0].alpha.name}`}
            x={barX}
            y={barTop}
            width={MAPS_TO_BAR_WIDTH}
            height={barBottom - barTop}
            rx={2}
            fill={MAPS_TO_COLOR}
          />
        );
      }
    }

    nodes.forEach((node) => {
      const cardCenterY = node.y + CARD_HEIGHT / 2;

      if (parentX !== undefined && parentY !== undefined && node.relationship !== "mapsTo") {
        elements.push(
          <line
            key={`h-${node.alpha.name}`}
            x1={parentX + LINE_OFFSET}
            y1={cardCenterY}
            x2={node.x}
            y2={cardCenterY}
            stroke={CONTRIBUTES_TO_COLOR}
            strokeWidth="3"
          />
        );
      }

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
    const rootAlphas = (baseline.alphas || []).filter((a) => !a.contributesTo && !a.mapsTo);

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
    type TreeData = {
      rootAlpha: typeof baseline.alphas[0];
      columns: Array<{ nodes: AlphaNode[]; parentX: number }>;
      numColumns: number;
      rootCardWidth: number;
      score: number;
      treeWidth: number;
      treeHeight: number;
    };

    const focusGroups: Array<{
      focusName: string;
      focus: typeof baseline.focuses[0] | undefined;
      trees: TreeData[];
    }> = [];

    Array.from(rootAlphasByFocus.entries()).forEach(([focusName, rootAlphas]) => {
      const trees: TreeData[] = [];

      rootAlphas.forEach((rootAlpha) => {
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

        const result = buildMultiColumnTree(rootAlpha.name, baseline.alphas || [], rootScoreEntry);

        trees.push({
          rootAlpha,
          ...result,
          score: rootScore,
        });
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
                {group.trees.map((treeData, treeIndex) => {
                  const isRootSelected = selectedElement === treeData.rootAlpha.name;
                  const rootAssetRef = treeData.rootAlpha.assetNames?.find((a) => a.type === "icon");
                  const rootAsset = rootAssetRef ? findAsset(rootAssetRef.assetName, baseline.assets || []) : null;

                  return (
                    <svg key={`tree-${treeData.rootAlpha.name}`} width={treeData.treeWidth} height={treeData.treeHeight} style={{ overflow: "visible" }}>
                      <rect
                        x={0}
                        y={0}
                        width={treeData.rootCardWidth}
                        height={CARD_HEIGHT}
                        rx="4"
                        fill={getScoreBackgroundColor(treeData.score, isRootSelected)}
                        stroke={isRootSelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
                        strokeWidth={isRootSelected ? "3" : "1"}
                        style={{ cursor: "pointer" }}
                        onClick={() => onSelectElement(isRootSelected ? null : treeData.rootAlpha.name)}
                      />
                      <foreignObject
                        x={0}
                        y={0}
                        width={treeData.rootCardWidth}
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
                      {treeData.columns.flatMap(col => [
                        ...renderAlphaNodes(col.nodes, col.parentX, 0),
                        ...renderAlphaCards(col.nodes),
                      ])}
                    </svg>
                  );
                })}
              </div>
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
    trees: Array<{ spaceTree: ActivitySpaceTree; height: number; treeWidth: number }>;
  }> = [];

  Array.from(activitySpacesByFocus.entries()).forEach(([focusName, spaces]) => {
    const trees: Array<{ spaceTree: ActivitySpaceTree; height: number; treeWidth: number }> = [];

    spaces.forEach((space) => {
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

      const { tree, totalHeight } = buildActivityTree(space, 0, 0, spaceScoreEntry);
      tree.score = spaceScore;

      const treeWidth = CARD_WIDTH + (space.activities && space.activities.length > 0 ? INDENT : 0);

      trees.push({
        spaceTree: tree,
        height: totalHeight,
        treeWidth,
      });
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
      {activityFocusGroups.map((group) => (
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
            {group.trees.map((treeData) => {
              const space = treeData.spaceTree;
              const isSpaceSelected = selectedElement === space.activitySpace.name;
              const spaceAssetRef = space.activitySpace.assetNames?.find((a) => a.type === "icon");
              const spaceAsset = spaceAssetRef ? findAsset(spaceAssetRef.assetName, baseline.assets || []) : null;

              return (
                <svg key={`tree-${space.activitySpace.name}`} width={treeData.treeWidth} height={treeData.height} style={{ overflow: "visible" }}>
                  <path
                    d={`M 0 0 L ${CARD_WIDTH - 12} 0 L ${CARD_WIDTH} ${CARD_HEIGHT / 2} L ${CARD_WIDTH - 12} ${CARD_HEIGHT} L 0 ${CARD_HEIGHT} Z`}
                    fill={getScoreBackgroundColor(space.score, isSpaceSelected)}
                    stroke={isSpaceSelected ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}
                    strokeWidth={isSpaceSelected ? "3" : "1"}
                    strokeDasharray="4"
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectElement(isSpaceSelected ? null : space.activitySpace.name)}
                  />
                  <foreignObject
                    x={0}
                    y={0}
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

                  {space.activities.length > 0 && (
                    <>
                      <line
                        x1={LINE_OFFSET}
                        y1={CARD_HEIGHT}
                        x2={LINE_OFFSET}
                        y2={space.activities[space.activities.length - 1].y + CARD_HEIGHT / 2}
                        stroke="rgba(102, 102, 102, 0.8)"
                        strokeWidth="3"
                      />
                      {space.activities.map((actNode) => {
                        const isActivitySelected = selectedElement === actNode.activity.name;
                        const activityAssetRef = actNode.activity.assetNames?.find((a) => a.type === "icon");
                        const activityAsset = activityAssetRef ? findAsset(activityAssetRef.assetName, baseline.assets || []) : null;
                        const activityCenterY = actNode.y + CARD_HEIGHT / 2;

                        return (
                          <g key={`activity-${actNode.activity.name}`}>
                            <line
                              x1={LINE_OFFSET}
                              y1={activityCenterY}
                              x2={actNode.x}
                              y2={activityCenterY}
                              stroke="rgba(102, 102, 102, 0.8)"
                              strokeWidth="3"
                            />
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
                      })}
                    </>
                  )}
                </svg>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

