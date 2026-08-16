import type { PracticeBaseline, Asset } from "@/lib/types";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";
import type { DependencyDiagramLayout } from "@/lib/diagrams/dependencyTree";
import { findIconAsset, renderIconHtml, collectFontCdnUrls } from "./fontIcons";
import { GRAPH_DEPTH_LIMITS } from "@/lib/core/graphLimits";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 48;
const CARD_GAP = 12;
const VERTICAL_PADDING = 12;
const INDENT = 42;
const LINE_OFFSET = 21;
const FOCUS_HEADING_HEIGHT = 40;
const FOCUS_GAP = 32;
const TEXT_SIZE = 11;
const WRAP_WIDTH = 1100;
const TREE_GAP_X = 24;
const ROW_GAP = 24;
const MULTI_COL_THRESHOLD = 7 * (CARD_HEIGHT + CARD_GAP);
const COLUMN_GAP = 24;
const MAPS_TO_BAR_WIDTH = 6;

function wrapLayout(
  items: { width: number; height: number }[],
): { positions: { x: number; y: number }[]; totalWidth: number; totalHeight: number } {
  const positions: { x: number; y: number }[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;
  let maxRowWidth = 0;

  for (const item of items) {
    if (currentX > 0 && currentX + item.width > WRAP_WIDTH) {
      maxRowWidth = Math.max(maxRowWidth, currentX - TREE_GAP_X);
      currentY += rowMaxHeight + ROW_GAP;
      currentX = 0;
      rowMaxHeight = 0;
    }
    positions.push({ x: currentX, y: currentY });
    rowMaxHeight = Math.max(rowMaxHeight, item.height);
    currentX += item.width + TREE_GAP_X;
  }
  maxRowWidth = Math.max(maxRowWidth, currentX > 0 ? currentX - TREE_GAP_X : 0);

  return {
    positions,
    totalWidth: maxRowWidth,
    totalHeight: currentY + rowMaxHeight,
  };
}

function escSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function generateSvgFontStyles(assets: Asset[]): string {
  const urls = collectFontCdnUrls(assets);
  if (urls.length === 0) return "";
  const imports = urls.map((url) => `@import url('${url}');`).join("\n      ");
  return `  <defs>\n    <style>\n      ${imports}\n    </style>\n  </defs>`;
}

const CONTRIBUTES_TO_COLOR = "rgba(102,102,102,0.8)";
const MAPS_TO_COLOR = "rgba(0,102,204,0.6)";

interface AlphaNode {
  name: string;
  displayName: string;
  assetNames?: Array<{ assetName: string; type: string }>;
  x: number;
  y: number;
  children: AlphaNode[];
  relationship?: "contributesTo" | "mapsTo";
}

function buildAlphaTree(
  parentName: string | null,
  allAlphas: PracticeBaseline["alphas"],
  startX: number,
  startY: number,
  display: DisplayAliasFn,
  visited?: Set<string>,
  depth?: number,
): { nodes: AlphaNode[]; totalHeight: number } {
  const seen = visited ?? new Set<string>();
  const d = depth ?? 0;
  if (d > GRAPH_DEPTH_LIMITS.alphaHierarchy) return { nodes: [], totalHeight: 0 };

  const mapsToChildren = allAlphas.filter((a) => a.mapsTo === parentName);
  const contributesToChildren = allAlphas.filter((a) => a.contributesTo === parentName);
  const children = [...mapsToChildren, ...contributesToChildren];
  const nodes: AlphaNode[] = [];
  let currentY = startY;

  for (const alpha of children) {
    if (seen.has(alpha.name)) continue;
    seen.add(alpha.name);

    const node: AlphaNode = {
      name: alpha.name,
      displayName: display("Alpha", alpha.name),
      assetNames: alpha.assetNames,
      x: startX,
      y: currentY,
      children: [],
      relationship: alpha.mapsTo === parentName ? "mapsTo" : "contributesTo",
    };

    const hasChildren = allAlphas.some((a) => a.contributesTo === alpha.name || a.mapsTo === alpha.name);
    if (hasChildren) {
      const childResult = buildAlphaTree(
        alpha.name,
        allAlphas,
        startX + INDENT,
        currentY + CARD_HEIGHT + CARD_GAP,
        display,
        seen,
        d + 1,
      );
      node.children = childResult.nodes;
      currentY +=
        CARD_HEIGHT + CARD_GAP + childResult.totalHeight + VERTICAL_PADDING;
    } else {
      currentY += CARD_HEIGHT + CARD_GAP;
    }

    nodes.push(node);
  }

  const totalHeight = currentY - startY - CARD_GAP;
  return { nodes, totalHeight };
}

function countDepth(node: AlphaNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(countDepth));
}

function renderAlphaNodeLines(
  nodes: AlphaNode[],
  parentX?: number,
  parentY?: number,
): string[] {
  const lines: string[] = [];

  if (parentX !== undefined && parentY !== undefined) {
    const parentBottomY = parentY + CARD_HEIGHT;
    const mapsToNodes = nodes.filter(n => n.relationship === "mapsTo");
    const contributesToNodes = nodes.filter(n => n.relationship !== "mapsTo");

    if (contributesToNodes.length > 0) {
      const lastContribCenterY = contributesToNodes[contributesToNodes.length - 1].y + CARD_HEIGHT / 2;
      lines.push(
        `<line x1="${parentX + LINE_OFFSET}" y1="${parentBottomY}" x2="${parentX + LINE_OFFSET}" y2="${lastContribCenterY}" stroke="${CONTRIBUTES_TO_COLOR}" stroke-width="3"/>`,
      );
    }

    if (mapsToNodes.length > 0) {
      const barX = mapsToNodes[0].x - MAPS_TO_BAR_WIDTH;
      const barTop = parentBottomY;
      const barBottom = mapsToNodes[mapsToNodes.length - 1].y + CARD_HEIGHT;
      lines.push(
        `<rect x="${barX}" y="${barTop}" width="${MAPS_TO_BAR_WIDTH}" height="${barBottom - barTop}" rx="2" fill="${MAPS_TO_COLOR}"/>`,
      );
    }
  }

  nodes.forEach((node) => {
    if (parentX !== undefined && parentY !== undefined && node.relationship !== "mapsTo") {
      const cardCenterY = node.y + CARD_HEIGHT / 2;
      lines.push(
        `<line x1="${parentX + LINE_OFFSET}" y1="${cardCenterY}" x2="${node.x}" y2="${cardCenterY}" stroke="${CONTRIBUTES_TO_COLOR}" stroke-width="3"/>`,
      );
    }

    if (node.children.length > 0) {
      lines.push(...renderAlphaNodeLines(node.children, node.x, node.y));
    }
  });

  return lines;
}

function renderCardContent(
  x: number,
  y: number,
  width: number,
  label: string,
  asset: Asset | undefined,
): string[] {
  const out: string[] = [];

  // Text fallback (visible when foreignObject doesn't render, e.g. GitHub SVG sanitization)
  out.push(
    `  <text x="${x + 12}" y="${y + CARD_HEIGHT / 2 + 4}" font-family="sans-serif" font-size="${TEXT_SIZE}" font-weight="600" fill="#151515">${escSvg(label)}</text>`,
  );

  if (asset && asset.type === "font-character") {
    const iconHtml = renderIconHtml(asset, 14);
    if (iconHtml) {
      out.push(
        `  <foreignObject x="${x}" y="${y}" width="${width}" height="${CARD_HEIGHT}">`,
        `    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;gap:8px;padding:12px;height:100%;box-sizing:border-box;background:#fff;border-radius:4px">`,
        `      ${iconHtml}`,
        `      <span style="font-weight:600;font-size:${TEXT_SIZE}px;font-family:sans-serif;color:#151515">${escSvg(label)}</span>`,
        `    </div>`,
        `  </foreignObject>`,
      );
    }
  }

  return out;
}

function renderAlphaNodeCards(
  nodes: AlphaNode[],
  assets: Asset[],
): string[] {
  const out: string[] = [];

  for (const node of nodes) {
    const label = truncate(node.displayName, 22);
    const asset = findIconAsset(node.assetNames, assets);

    out.push(
      `<g>`,
      `  <rect x="${node.x}" y="${node.y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
      ...renderCardContent(node.x, node.y, CARD_WIDTH, label, asset),
      `</g>`,
    );

    if (node.children.length > 0) {
      out.push(...renderAlphaNodeCards(node.children, assets));
    }
  }

  return out;
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

function buildMultiColumnTree(
  rootAlphaName: string,
  allAlphas: PracticeBaseline["alphas"],
  display: DisplayAliasFn,
  assets: Asset[],
): {
  parts: string[];
  rootCardWidth: number;
  treeWidth: number;
  treeHeight: number;
} {
  const mapsToDirectChildren = allAlphas.filter(a => a.mapsTo === rootAlphaName);
  const contributesToDirectChildren = allAlphas.filter(a => a.contributesTo === rootAlphaName);
  const directChildren = [...mapsToDirectChildren, ...contributesToDirectChildren];
  const rootLabel = truncate(display("Alpha", rootAlphaName), 22);
  const rootAsset = findIconAsset(
    allAlphas.find(a => a.name === rootAlphaName)?.assetNames,
    assets,
  );

  if (directChildren.length === 0) {
    const parts: string[] = [];
    parts.push(
      `<g>`,
      `  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
      ...renderCardContent(0, 0, CARD_WIDTH, rootLabel, rootAsset),
      `</g>`,
    );
    return { parts, rootCardWidth: CARD_WIDTH, treeWidth: CARD_WIDTH, treeHeight: CARD_HEIGHT };
  }

  const childMeasurements = directChildren.map(child => {
    const hasGrandchildren = allAlphas.some(a => a.contributesTo === child.name || a.mapsTo === child.name);
    if (!hasGrandchildren) {
      return { child, slotHeight: CARD_HEIGHT + CARD_GAP, maxDepth: 0 };
    }
    const measureSeen = new Set<string>([rootAlphaName, child.name]);
    const { nodes: grandchildren, totalHeight: gcHeight } = buildAlphaTree(
      child.name, allAlphas, INDENT, CARD_HEIGHT + CARD_GAP, display, measureSeen, 2,
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
      const node: AlphaNode = {
        name: child.name,
        displayName: display("Alpha", child.name),
        assetNames: child.assetNames,
        x: currentColX + INDENT,
        y: currentY,
        children: [],
        relationship: child.mapsTo === rootAlphaName ? "mapsTo" : "contributesTo",
      };

      const hasGrandchildren = allAlphas.some(a => a.contributesTo === child.name || a.mapsTo === child.name);
      if (hasGrandchildren) {
        const buildSeen = new Set<string>([rootAlphaName, child.name]);
        const childResult = buildAlphaTree(
          child.name, allAlphas,
          currentColX + 2 * INDENT,
          currentY + CARD_HEIGHT + CARD_GAP,
          display, buildSeen, 2,
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

  const parts: string[] = [];
  parts.push(
    `<g>`,
    `  <rect x="0" y="0" width="${rootCardWidth}" height="${CARD_HEIGHT}" rx="4" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
    ...renderCardContent(0, 0, rootCardWidth, rootLabel, rootAsset),
    `</g>`,
  );

  for (const col of columns) {
    parts.push(...renderAlphaNodeLines(col.nodes, col.parentX, 0));
    parts.push(...renderAlphaNodeCards(col.nodes, assets));
  }

  return { parts, rootCardWidth, treeWidth: totalWidth, treeHeight };
}

export function generateConcernsOverviewSvg(
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): string {
  const assets = baseline.assets ?? [];
  const rootAlphas = (baseline.alphas ?? []).filter((a) => !a.contributesTo && !a.mapsTo);

  const rootAlphasByFocus = new Map<string, typeof baseline.alphas>();
  for (const alpha of rootAlphas) {
    const fn = alpha.focusName || "Other";
    if (!rootAlphasByFocus.has(fn)) rootAlphasByFocus.set(fn, []);
    rootAlphasByFocus.get(fn)!.push(alpha);
  }

  const focusOrder = new Map(
    (baseline.focuses ?? []).map((f, i) => [f.name, i] as const),
  );
  const sortedFocuses = [...rootAlphasByFocus.entries()].sort(
    (a, b) =>
      (focusOrder.get(a[0]) ?? 1000) - (focusOrder.get(b[0]) ?? 1000),
  );

  const svgParts: string[] = [];
  let globalY = 0;
  let globalMaxX = 0;

  for (const [focusName, focusAlphas] of sortedFocuses) {
    const focus = baseline.focuses?.find((f) => f.name === focusName);

    svgParts.push(
      `<text x="0" y="${globalY + 16}" font-family="sans-serif" font-size="14" font-weight="700" fill="#151515">${escSvg(focusName)}</text>`,
    );
    if (focus?.description) {
      svgParts.push(
        `<text x="0" y="${globalY + 32}" font-family="sans-serif" font-size="11" font-style="italic" fill="#6a6e73">${escSvg(truncate(focus.description, 80))}</text>`,
      );
    }
    globalY += FOCUS_HEADING_HEIGHT;

    const treeParts: { parts: string[]; width: number; height: number }[] = [];

    for (const rootAlpha of focusAlphas) {
      const result = buildMultiColumnTree(
        rootAlpha.name,
        baseline.alphas ?? [],
        display,
        assets,
      );

      treeParts.push({
        parts: result.parts,
        width: result.treeWidth,
        height: result.treeHeight,
      });
    }

    const { positions, totalWidth, totalHeight: rowsHeight } = wrapLayout(
      treeParts.map((t) => ({ width: t.width, height: t.height })),
    );

    for (let i = 0; i < treeParts.length; i++) {
      const pos = positions[i];
      svgParts.push(`<g transform="translate(${pos.x}, ${globalY + pos.y})">`);
      svgParts.push(...treeParts[i].parts);
      svgParts.push(`</g>`);
    }

    if (totalWidth > globalMaxX) globalMaxX = totalWidth;
    globalY += rowsHeight + FOCUS_GAP;
  }

  const width = Math.max(globalMaxX, 400);
  const height = globalY;
  const fontStyles = generateSvgFontStyles(assets);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...(fontStyles ? [fontStyles] : []),
    ...svgParts,
    `</svg>`,
  ].join("\n");
}

interface ActivityNode {
  name: string;
  displayName: string;
  assetNames?: Array<{ assetName: string; type: string }>;
  x: number;
  y: number;
}

interface ActivitySpaceNode {
  name: string;
  displayName: string;
  assetNames?: Array<{ assetName: string; type: string }>;
  x: number;
  y: number;
  activities: ActivityNode[];
}

export function generateActivitiesOverviewSvg(
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): string {
  const assets = baseline.assets ?? [];
  const spacesByFocus = new Map<string, typeof baseline.activitySpaces>();
  for (const space of baseline.activitySpaces ?? []) {
    const fn = space.focusName || "Other";
    if (!spacesByFocus.has(fn)) spacesByFocus.set(fn, []);
    spacesByFocus.get(fn)!.push(space);
  }

  const focusOrder = new Map(
    (baseline.focuses ?? []).map((f, i) => [f.name, i] as const),
  );
  const sortedFocuses = [...spacesByFocus.entries()].sort(
    (a, b) =>
      (focusOrder.get(a[0]) ?? 1000) - (focusOrder.get(b[0]) ?? 1000),
  );

  const svgParts: string[] = [];
  let globalY = 0;
  let globalMaxX = 0;

  for (const [focusName, focusSpaces] of sortedFocuses) {
    const focus = baseline.focuses?.find((f) => f.name === focusName);

    svgParts.push(
      `<text x="0" y="${globalY + 16}" font-family="sans-serif" font-size="14" font-weight="700" fill="#151515">${escSvg(focusName)}</text>`,
    );
    if (focus?.description) {
      svgParts.push(
        `<text x="0" y="${globalY + 32}" font-family="sans-serif" font-size="11" font-style="italic" fill="#6a6e73">${escSvg(truncate(focus.description, 80))}</text>`,
      );
    }
    globalY += FOCUS_HEADING_HEIGHT;

    const treeParts: { parts: string[]; width: number; height: number }[] = [];
    const arrowPath = `M 0 0 L ${CARD_WIDTH - 12} 0 L ${CARD_WIDTH} ${CARD_HEIGHT / 2} L ${CARD_WIDTH - 12} ${CARD_HEIGHT} L 0 ${CARD_HEIGHT} Z`;
    const arrowContentWidth = CARD_WIDTH - 12;

    for (const space of focusSpaces) {
      const spaceLabel = truncate(
        display("ActivitySpace", space.name),
        20,
      );
      const activities = space.activities ?? [];
      const spaceAsset = findIconAsset(space.assetNames, assets);

      const parts: string[] = [];
      parts.push(
        `<g>`,
        `  <path d="${arrowPath}" fill="#ffffff" stroke="#d2d2d2" stroke-width="1" stroke-dasharray="4"/>`,
        ...renderCardContent(0, 0, arrowContentWidth, spaceLabel, spaceAsset),
        `</g>`,
      );

      if (activities.length > 0) {
        const firstActY = CARD_HEIGHT + CARD_GAP;
        const lastActCenterY =
          firstActY +
          (activities.length - 1) * (CARD_HEIGHT + CARD_GAP) +
          CARD_HEIGHT / 2;
        parts.push(
          `<line x1="${LINE_OFFSET}" y1="${CARD_HEIGHT}" x2="${LINE_OFFSET}" y2="${lastActCenterY}" stroke="rgba(102,102,102,0.8)" stroke-width="3"/>`,
        );

        let actY = firstActY;
        for (const act of activities) {
          const actLabel = truncate(display("Activity", act.name), 20);
          const actCenterY = actY + CARD_HEIGHT / 2;
          const actX = INDENT;
          const actAsset = findIconAsset(act.assetNames, assets);

          parts.push(
            `<line x1="${LINE_OFFSET}" y1="${actCenterY}" x2="${actX}" y2="${actCenterY}" stroke="rgba(102,102,102,0.8)" stroke-width="3"/>`,
          );

          parts.push(
            `<g>`,
            `  <path d="${arrowPath}" transform="translate(${actX},${actY})" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
            ...renderCardContent(actX, actY, arrowContentWidth, actLabel, actAsset),
            `</g>`,
          );

          actY += CARD_HEIGHT + CARD_GAP;
        }
      }

      const treeWidth = CARD_WIDTH + (activities.length > 0 ? INDENT : 0);
      const treeHeight =
        CARD_HEIGHT +
        (activities.length > 0
          ? CARD_GAP +
            activities.length * (CARD_HEIGHT + CARD_GAP) +
            VERTICAL_PADDING
          : 0);

      treeParts.push({ parts, width: treeWidth, height: treeHeight });
    }

    const { positions, totalWidth, totalHeight: rowsHeight } = wrapLayout(
      treeParts.map((t) => ({ width: t.width, height: t.height })),
    );

    for (let i = 0; i < treeParts.length; i++) {
      const pos = positions[i];
      svgParts.push(`<g transform="translate(${pos.x}, ${globalY + pos.y})">`);
      svgParts.push(...treeParts[i].parts);
      svgParts.push(`</g>`);
    }

    if (totalWidth > globalMaxX) globalMaxX = totalWidth;
    globalY += rowsHeight + FOCUS_GAP;
  }

  const width = Math.max(globalMaxX, 400);
  const height = globalY;
  const fontStyles = generateSvgFontStyles(assets);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...(fontStyles ? [fontStyles] : []),
    ...svgParts,
    `</svg>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Dependency diagram (static SVG string from pre-computed layout)
// ---------------------------------------------------------------------------

export function generateDependencyDiagramSvg(layout: DependencyDiagramLayout): string {
  if (layout.nodes.length <= 1) return "";

  const parts: string[] = [];

  parts.push(
    `  <defs>`,
    `    <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">`,
    `      <polygon points="0 0, 8 3, 0 6" fill="rgba(102,102,102,0.7)" />`,
    `    </marker>`,
    `  </defs>`,
  );

  for (const group of layout.groups) {
    parts.push(
      `  <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="6" ry="6" fill="#f0f0f0" stroke="#d2d2d2" stroke-width="1" opacity="0.5" />`,
      `  <text x="${group.x + 8}" y="${group.y + 16}" font-size="11" fill="#6a6e73" font-family="RedHatText, Helvetica, Arial, sans-serif">${escSvg(group.baselineName)}</text>`,
    );
  }

  for (const edge of layout.edges) {
    const dx = Math.abs(edge.x2 - edge.x1);
    const dy = Math.abs(edge.y2 - edge.y1);
    let d: string;
    if (dx >= dy) {
      const midX = (edge.x1 + edge.x2) / 2;
      d = `M ${edge.x1} ${edge.y1} C ${midX} ${edge.y1}, ${midX} ${edge.y2}, ${edge.x2} ${edge.y2}`;
    } else {
      const midY = (edge.y1 + edge.y2) / 2;
      d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`;
    }
    parts.push(
      `  <path d="${d}" fill="none" stroke="rgba(102,102,102,0.6)" stroke-width="1.5" marker-end="url(#dep-arrow)" />`,
    );
  }

  for (const node of layout.nodes) {
    const isBaseline = node.kind === "baselinePractice";
    const isRoot = node.kind === "root";
    const borderColor = isRoot || isBaseline ? "#0066cc" : "#d2d2d2";
    const fillColor = isRoot ? "#f0f0ff" : isBaseline ? "#f5f5f5" : "#ffffff";
    const strokeWidth = isRoot || isBaseline ? 2 : 1.5;
    const iconColor = isBaseline || isRoot ? "#0066cc" : "#6a6e73";

    parts.push(
      `  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="4" ry="4" fill="${fillColor}" stroke="${borderColor}" stroke-width="${strokeWidth}" />`,
      `  <foreignObject x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}">`,
      `    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;gap:6px;padding:0 10px;height:100%;overflow:hidden">`,
      `      <span style="font-size:11px;color:${iconColor};flex-shrink:0">${isBaseline || isRoot ? "&#x25A0;" : "&#x25C6;"}</span>`,
      `      <span style="font-size:11px;font-weight:600;color:#151515;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3" title="${escSvg(node.name)}">${escSvg(node.name)}</span>`,
      `    </div>`,
      `  </foreignObject>`,
    );
  }

  const { viewBoxWidth: w, viewBoxHeight: h } = layout;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    ...parts,
    `</svg>`,
  ].join("\n");
}
