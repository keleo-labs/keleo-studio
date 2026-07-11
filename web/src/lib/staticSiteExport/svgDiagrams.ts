import type { PracticeBaseline, Asset } from "@/lib/types";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";
import { findIconAsset, renderIconHtml, collectFontCdnUrls } from "./fontIcons";

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

interface AlphaNode {
  name: string;
  displayName: string;
  assetNames?: Array<{ assetName: string; type: string }>;
  x: number;
  y: number;
  children: AlphaNode[];
}

function buildAlphaTree(
  parentName: string | null,
  allAlphas: PracticeBaseline["alphas"],
  startX: number,
  startY: number,
  display: DisplayAliasFn,
): { nodes: AlphaNode[]; totalHeight: number } {
  const children = allAlphas.filter((a) => a.contributesTo === parentName);
  const nodes: AlphaNode[] = [];
  let currentY = startY;

  for (const alpha of children) {
    const node: AlphaNode = {
      name: alpha.name,
      displayName: display("Alpha", alpha.name),
      assetNames: alpha.assetNames,
      x: startX,
      y: currentY,
      children: [],
    };

    const hasChildren = allAlphas.some((a) => a.contributesTo === alpha.name);
    if (hasChildren) {
      const childResult = buildAlphaTree(
        alpha.name,
        allAlphas,
        startX + INDENT,
        currentY + CARD_HEIGHT + CARD_GAP,
        display,
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

  nodes.forEach((node, index) => {
    const cardCenterY = node.y + CARD_HEIGHT / 2;

    if (parentX !== undefined && parentY !== undefined) {
      const parentBottomY = parentY + CARD_HEIGHT;

      lines.push(
        `<line x1="${parentX + LINE_OFFSET}" y1="${cardCenterY}" x2="${node.x}" y2="${cardCenterY}" stroke="rgba(102,102,102,0.8)" stroke-width="3"/>`,
      );

      if (index === 0) {
        const lastSiblingCenterY =
          nodes[nodes.length - 1].y + CARD_HEIGHT / 2;
        lines.push(
          `<line x1="${parentX + LINE_OFFSET}" y1="${parentBottomY}" x2="${parentX + LINE_OFFSET}" y2="${lastSiblingCenterY}" stroke="rgba(102,102,102,0.8)" stroke-width="3"/>`,
        );
      }
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

export function generateConcernsOverviewSvg(
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): string {
  const assets = baseline.assets ?? [];
  const rootAlphas = (baseline.alphas ?? []).filter((a) => !a.contributesTo);

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
      const { nodes, totalHeight } = buildAlphaTree(
        rootAlpha.name,
        baseline.alphas ?? [],
        INDENT,
        CARD_HEIGHT + CARD_GAP,
        display,
      );

      const rootLabel = truncate(display("Alpha", rootAlpha.name), 22);
      const rootAsset = findIconAsset(rootAlpha.assetNames, assets);

      const parts: string[] = [];
      parts.push(
        `<g>`,
        `  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
        ...renderCardContent(0, 0, CARD_WIDTH, rootLabel, rootAsset),
        `</g>`,
      );

      parts.push(...renderAlphaNodeLines(nodes, 0, 0));
      parts.push(...renderAlphaNodeCards(nodes, assets));

      const maxDepth =
        nodes.length > 0 ? Math.max(0, ...nodes.map(countDepth)) : 0;
      const treeWidth = nodes.length > 0
        ? (maxDepth + 1) * INDENT + CARD_WIDTH
        : CARD_WIDTH;
      const treeHeight = Math.max(
        CARD_HEIGHT,
        CARD_HEIGHT + CARD_GAP + totalHeight,
      );

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
