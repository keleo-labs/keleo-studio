/**
 * Generate example SVG diagrams from the scrum-foundations bundle.
 *
 * Run from web/:
 *   cd web && npx tsx ../scripts/generate-example-diagrams.ts
 */
import * as fs from "fs";
import * as path from "path";

import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  groupByFocus,
  enrichBaselineWithReferencedWrappers,
  propagateDerivedFocusNames,
} from "@/lib/ir";
import {
  generateConcernsOverviewSvg,
  generateActivitiesOverviewSvg,
  generateDependencyDiagramSvg,
} from "@/lib/staticSiteExport/svgDiagrams";
import {
  buildDependencyTree,
  computeDependencyLayout,
} from "@/lib/diagrams/dependencyTree/data";
import { extractSankeyFlowData, groupNodesByCategory } from "@/lib/diagrams/sankey/data";
import {
  transformAlphaScoresToRadar,
  createInitialism,
  getFocusStrokeColor,
} from "@/lib/diagrams/radarChart/data";
import {
  polarToCartesian,
  generatePolygonPath,
  generateFocusSegmentPath,
} from "@/lib/diagrams/radarChart/geometry";
import { extractProgressiveFlowData } from "@/lib/diagrams/progressiveFlow/data";
import { calculateAlphaScores } from "@/lib/analysis/methodFocus";
import {
  buildPatternMatrixAlphaRows,
  getAlphaDescendants,
} from "@/lib/diagrams/patternMatrix/diagram";
import {
  alphaContributesToEdges,
  computeAlphaContributorBelowLayout,
  contributeEdgePathD,
  alphaCardGeomAt,
} from "@/lib/diagrams/alphaContributes/diagram";

const BUNDLE_DIR = path.resolve(process.cwd(), "data/bundles/scrum-foundations/documents");
const OUT_DIR = path.resolve(process.cwd(), "../specification/diagrams/examples");

function loadJson(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(BUNDLE_DIR, name), "utf-8"));
}

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function writeOut(name: string, svg: string) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), svg, "utf-8");
  console.log(`  wrote ${name} (${Math.round(svg.length / 1024)}KB)`);
}

// ---------------------------------------------------------------------------
// Load and merge practice data
// ---------------------------------------------------------------------------

const baselineDoc = loadJson("project-essentials.json");
const dependencyDoc = loadJson("delivery-and-team-operations.json");
const practiceDoc = loadJson("scrum-foundations.json");

// Build a merged baseline view: baseline + dependency + practice
let baseline = asBaselineDocument(baselineDoc)!;
baseline = enrichBaselineWithReferencedWrappers(dependencyDoc, baseline);
baseline = enrichBaselineWithReferencedWrappers(practiceDoc, baseline);
baseline = baselineWithPracticeActivities(dependencyDoc, baseline);
baseline = baselineWithPracticeActivities(practiceDoc, baseline);
propagateDerivedFocusNames(baseline);

const display = (_kind: string, name: string) => name;

// ---------------------------------------------------------------------------
// 1. Overview of Concerns
// ---------------------------------------------------------------------------

console.log("Generating diagrams...");

const concernsSvg = generateConcernsOverviewSvg(baseline, display);
writeOut("overview-concerns.svg", concernsSvg);

// ---------------------------------------------------------------------------
// 2. Overview of Activities
// ---------------------------------------------------------------------------

const activitiesSvg = generateActivitiesOverviewSvg(baseline, display);
writeOut("overview-activities.svg", activitiesSvg);

// ---------------------------------------------------------------------------
// 3. Dependency Tree
// ---------------------------------------------------------------------------

const libraryIndex = {
  baselineByName: new Map([[baselineDoc.name, baselineDoc]]),
  standaloneBaselinePracticeKeys: new Set([baselineDoc.name]),
  practiceByName: new Map([
    [practiceDoc.name, practiceDoc],
    [dependencyDoc.name, dependencyDoc],
  ]),
  methods: [],
};
const tree = buildDependencyTree(practiceDoc, libraryIndex as any);
const layout = computeDependencyLayout(tree);
const depSvg = generateDependencyDiagramSvg(layout);
if (depSvg) writeOut("dependency-tree.svg", depSvg);

// ---------------------------------------------------------------------------
// 4. Sankey Flow
// ---------------------------------------------------------------------------

function generateSankeyFlowSvg(practice: any): string {
  const data = extractSankeyFlowData(practice);
  const groups = groupNodesByCategory(data);

  const colWidth = 200;
  const colGap = 160;
  const nodeH = 32;
  const nodeGap = 8;
  const pad = 20;
  const headerH = 30;

  const cols = [groups.activities, groups.workProducts, groups.alphaStates];
  const colLabels = ["Activities", "Work Products", "Alpha States"];
  const maxRows = Math.max(...cols.map((c) => c.length));
  const height = pad + headerH + maxRows * (nodeH + nodeGap) + pad;
  const width = pad + 3 * colWidth + 2 * colGap + pad;

  const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>();
  const parts: string[] = [];

  parts.push(`<rect width="${width}" height="${height}" fill="#fafafa" rx="4"/>`);

  for (let ci = 0; ci < 3; ci++) {
    const colX = pad + ci * (colWidth + colGap);
    const colNodes = cols[ci];

    parts.push(
      `<text x="${colX + colWidth / 2}" y="${pad + 16}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#151515">${colLabels[ci]}</text>`,
    );

    const colors = ["#0066cc", "#6a6e73", "#4ade80"];
    for (let ni = 0; ni < colNodes.length; ni++) {
      const node = colNodes[ni];
      const x = colX;
      const y = pad + headerH + ni * (nodeH + nodeGap);
      nodePositions.set(node.id, { x, y, w: colWidth, h: nodeH });

      const label = node.name.length > 25 ? node.name.slice(0, 24) + "…" : node.name;
      parts.push(
        `<rect x="${x}" y="${y}" width="${colWidth}" height="${nodeH}" rx="3" fill="#ffffff" stroke="${colors[ci]}" stroke-width="1.5"/>`,
        `<text x="${x + 8}" y="${y + nodeH / 2 + 4}" font-family="sans-serif" font-size="10" fill="#151515">${escSvg(label)}</text>`,
      );
    }
  }

  for (const link of data.links) {
    const src = nodePositions.get(link.source);
    const tgt = nodePositions.get(link.target);
    if (!src || !tgt) continue;

    const x1 = src.x + src.w;
    const y1 = src.y + src.h / 2;
    const x2 = tgt.x;
    const y2 = tgt.y + tgt.h / 2;
    const cpOff = (x2 - x1) * 0.45;

    parts.push(
      `<path d="M ${x1} ${y1} C ${x1 + cpOff} ${y1}, ${x2 - cpOff} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(0,102,204,0.25)" stroke-width="${Math.max(1, link.value * 2)}"/>`,
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

writeOut("sankey-flow.svg", generateSankeyFlowSvg(baseline));

// ---------------------------------------------------------------------------
// 5. Radar Chart
// ---------------------------------------------------------------------------

function generateRadarChartSvg(): string {
  const grouped = groupByFocus(baseline);
  const alphaScores = calculateAlphaScores(practiceDoc, baseline, grouped);
  const dataset = transformAlphaScoresToRadar(alphaScores);

  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 180;
  const rings = 4;
  const parts: string[] = [];

  parts.push(`<rect width="${size}" height="${size}" fill="#fafafa" rx="4"/>`);

  // Focus segment backgrounds
  for (const seg of dataset.focusSegments) {
    const startSpine = dataset.spines[seg.startIndex];
    const endSpine = dataset.spines[seg.endIndex];
    const angleStep = 360 / dataset.spines.length;
    const startAngle = startSpine.angle - angleStep / 2;
    const endAngle = endSpine.angle + angleStep / 2;
    const segPath = generateFocusSegmentPath(startAngle, endAngle, cx, cy, maxR + 20);
    parts.push(`<path d="${segPath}" fill="${seg.color}" stroke="none"/>`);
  }

  // Concentric rings
  for (let r = 1; r <= rings; r++) {
    const radius = (maxR / rings) * r;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>`,
    );
  }

  // Spines
  for (const spine of dataset.spines) {
    const end = polarToCartesian(spine.angle, 1, cx, cy, maxR);
    parts.push(
      `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="#d0d0d0" stroke-width="0.5"/>`,
    );
  }

  // Data polygon
  const dataPoints = dataset.spines.map((s) =>
    polarToCartesian(s.angle, s.value / dataset.maxScore, cx, cy, maxR),
  );
  const polyPath = generatePolygonPath(dataPoints);
  parts.push(`<path d="${polyPath}" fill="rgba(0,102,204,0.2)" stroke="#0066cc" stroke-width="2"/>`);

  // Data points and labels
  for (const spine of dataset.spines) {
    const pt = polarToCartesian(spine.angle, spine.value / dataset.maxScore, cx, cy, maxR);
    parts.push(`<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#0066cc"/>`);

    const labelPt = polarToCartesian(spine.angle, 1.15, cx, cy, maxR);
    const initials = createInitialism(spine.label);
    const anchor = Math.abs(labelPt.x - cx) < 5 ? "middle" : labelPt.x > cx ? "start" : "end";
    parts.push(
      `<text x="${labelPt.x}" y="${labelPt.y + 4}" text-anchor="${anchor}" font-family="sans-serif" font-size="11" font-weight="600" fill="#151515">${escSvg(initials)}</text>`,
    );
  }

  // Focus labels
  for (const seg of dataset.focusSegments) {
    const midIdx = Math.floor((seg.startIndex + seg.endIndex) / 2);
    const midAngle = dataset.spines[midIdx].angle;
    const lpt = polarToCartesian(midAngle, 1.35, cx, cy, maxR);
    const color = getFocusStrokeColor(seg.focusName);
    const anchor = Math.abs(lpt.x - cx) < 5 ? "middle" : lpt.x > cx ? "start" : "end";
    parts.push(
      `<text x="${lpt.x}" y="${lpt.y}" text-anchor="${anchor}" font-family="sans-serif" font-size="12" font-weight="700" fill="${color}">${escSvg(seg.focusName)}</text>`,
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

writeOut("radar-chart.svg", generateRadarChartSvg());

// ---------------------------------------------------------------------------
// 6. Progressive Flow
// ---------------------------------------------------------------------------

function generateProgressiveFlowSvg(): string {
  const data = extractProgressiveFlowData(baseline);
  if (data.flows.length === 0) return "<svg/>";

  const flow = data.flows[0]; // first persona group
  const nodeW = 140;
  const nodeH = 40;
  const gapX = 40;
  const gapY = 16;
  const pad = 20;

  // Group nodes by type for column layout
  const pgNodes = flow.nodes.filter((n) => n.type === "personaGroup");
  const actNodes = flow.nodes.filter((n) => n.type === "activity");
  const stateNodes = flow.nodes.filter((n) => n.type === "alphaState");

  const cols = [pgNodes, actNodes, stateNodes];
  const colLabels = ["Persona Group", "Activities", "Alpha States"];
  const maxRows = Math.max(...cols.map((c) => c.length), 1);
  const headerH = 30;
  const width = pad + 3 * (nodeW + gapX) + pad;
  const height = pad + headerH + maxRows * (nodeH + gapY) + pad;

  const nodePos = new Map<string, { x: number; y: number }>();
  const parts: string[] = [];

  parts.push(`<rect width="${width}" height="${height}" fill="#fafafa" rx="4"/>`);

  const colors = ["#6a6e73", "#0066cc", "#4ade80"];
  for (let ci = 0; ci < 3; ci++) {
    const colX = pad + ci * (nodeW + gapX);
    const colNodes = cols[ci];

    parts.push(
      `<text x="${colX + nodeW / 2}" y="${pad + 16}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#151515">${colLabels[ci]}</text>`,
    );

    for (let ni = 0; ni < colNodes.length; ni++) {
      const node = colNodes[ni];
      const x = colX;
      const y = pad + headerH + ni * (nodeH + gapY);
      nodePos.set(node.id, { x, y });

      const label = node.label.length > 18 ? node.label.slice(0, 17) + "…" : node.label;
      const rx = node.type === "personaGroup" ? "20" : "4";
      parts.push(
        `<rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="${rx}" fill="#ffffff" stroke="${colors[ci]}" stroke-width="1.5"/>`,
        `<text x="${x + 8}" y="${y + nodeH / 2 + 4}" font-family="sans-serif" font-size="10" fill="#151515">${escSvg(label)}</text>`,
      );
    }
  }

  for (const link of flow.links) {
    const src = nodePos.get(link.sourceId);
    const tgt = nodePos.get(link.targetId);
    if (!src || !tgt) continue;

    const x1 = src.x + nodeW;
    const y1 = src.y + nodeH / 2;
    const x2 = tgt.x;
    const y2 = tgt.y + nodeH / 2;

    if (Math.abs(x2 - x1) < 10) {
      // Vertical link (same column)
      parts.push(
        `<line x1="${src.x + nodeW / 2}" y1="${src.y + nodeH}" x2="${tgt.x + nodeW / 2}" y2="${tgt.y}" stroke="rgba(102,102,102,0.4)" stroke-width="1.5" marker-end="url(#flow-arrow)"/>`,
      );
    } else {
      const cpOff = Math.abs(x2 - x1) * 0.4;
      parts.push(
        `<path d="M ${x1} ${y1} C ${x1 + cpOff} ${y1}, ${x2 - cpOff} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(102,102,102,0.4)" stroke-width="1.5"/>`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <defs><marker id="flow-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="rgba(102,102,102,0.6)"/></marker></defs>`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

writeOut("progressive-flow.svg", generateProgressiveFlowSvg());

// ---------------------------------------------------------------------------
// 7. Pattern Matrix
// ---------------------------------------------------------------------------

function generatePatternMatrixSvg(): string {
  const alphaRows = buildPatternMatrixAlphaRows(baseline);
  const patterns = baseline.patterns ?? [];
  const allViews = patterns.flatMap((p: any) => (p.views ?? []).map((v: any) => ({ ...v, patternName: p.name })));

  if (alphaRows.length === 0) {
    // No pattern views — generate a placeholder showing the matrix structure
    const rowH = 48;
    const colW = 140;
    const labelW = 160;
    const pad = 10;
    const headerH = 50;
    const patternNames = patterns.map((p: any) => p.name);
    const nCols = Math.max(patternNames.length, 3);
    const width = pad + labelW + nCols * colW + pad;
    const height = pad + headerH + alphaRows.length * rowH + pad;
    // Fall back to showing alphas by focus as rows and patterns as columns
    const focuses = baseline.focuses ?? [];
    const alphasByFocus = new Map<string, any[]>();
    for (const a of baseline.alphas ?? []) {
      const fn = a.focusName || "Other";
      if (!alphasByFocus.has(fn)) alphasByFocus.set(fn, []);
      alphasByFocus.get(fn)!.push(a);
    }
    const rows: { label: string; isHeader: boolean }[] = [];
    for (const f of focuses) {
      rows.push({ label: f.name, isHeader: true });
      for (const a of alphasByFocus.get(f.name) ?? []) {
        rows.push({ label: a.name, isHeader: false });
      }
    }

    const totalH = pad + headerH + rows.length * rowH + pad;
    const totalW = pad + labelW + nCols * colW + pad;
    const parts: string[] = [];
    parts.push(`<rect width="${totalW}" height="${totalH}" fill="#fafafa" rx="4"/>`);

    // Column headers
    for (let ci = 0; ci < nCols; ci++) {
      const x = pad + labelW + ci * colW;
      const label = patternNames[ci] ?? `View ${ci + 1}`;
      parts.push(
        `<rect x="${x}" y="${pad}" width="${colW}" height="${headerH}" fill="#f0f0ff" stroke="#d2d2d2" stroke-width="0.5"/>`,
        `<text x="${x + colW / 2}" y="${pad + headerH / 2 + 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#151515">${escSvg(label.length > 18 ? label.slice(0, 17) + "…" : label)}</text>`,
      );
    }

    // Rows
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const y = pad + headerH + ri * rowH;
      if (row.isHeader) {
        parts.push(
          `<rect x="${pad}" y="${y}" width="${labelW + nCols * colW}" height="${rowH}" fill="#f5f5f5" stroke="#d2d2d2" stroke-width="0.5"/>`,
          `<text x="${pad + 8}" y="${y + rowH / 2 + 4}" font-family="sans-serif" font-size="11" font-weight="700" fill="#151515">${escSvg(row.label)}</text>`,
        );
      } else {
        parts.push(
          `<rect x="${pad}" y="${y}" width="${labelW}" height="${rowH}" fill="#ffffff" stroke="#d2d2d2" stroke-width="0.5"/>`,
          `<text x="${pad + 16}" y="${y + rowH / 2 + 4}" font-family="sans-serif" font-size="10" fill="#151515">${escSvg(row.label)}</text>`,
        );
        for (let ci = 0; ci < nCols; ci++) {
          const x = pad + labelW + ci * colW;
          parts.push(
            `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="#ffffff" stroke="#d2d2d2" stroke-width="0.5"/>`,
          );
        }
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
      ...parts,
      `</svg>`,
    ].join("\n");
  }

  // If we have actual views, render them
  const rowH = 52;
  const colW = 160;
  const labelW = 160;
  const pad = 10;
  const headerH = 60;
  const nCols = allViews.length;
  const nRows = alphaRows.length;
  const width = pad + labelW + nCols * colW + pad;
  const height = pad + headerH + nRows * rowH + pad;

  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="#fafafa" rx="4"/>`);

  for (let ci = 0; ci < nCols; ci++) {
    const x = pad + labelW + ci * colW;
    const v = allViews[ci];
    parts.push(
      `<rect x="${x}" y="${pad}" width="${colW}" height="${headerH}" fill="#f0f0ff" stroke="#d2d2d2" stroke-width="0.5"/>`,
      `<text x="${x + colW / 2}" y="${pad + headerH / 2 + 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#151515">${escSvg(v.name ?? "")}</text>`,
    );
  }

  for (let ri = 0; ri < nRows; ri++) {
    const y = pad + headerH + ri * rowH;
    parts.push(
      `<rect x="${pad}" y="${y}" width="${labelW}" height="${rowH}" fill="#ffffff" stroke="#d2d2d2" stroke-width="0.5"/>`,
      `<text x="${pad + 8}" y="${y + rowH / 2 + 4}" font-family="sans-serif" font-size="10" font-weight="600" fill="#151515">${escSvg(alphaRows[ri])}</text>`,
    );
    for (let ci = 0; ci < nCols; ci++) {
      const x = pad + labelW + ci * colW;
      parts.push(
        `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="#ffffff" stroke="#d2d2d2" stroke-width="0.5"/>`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

writeOut("pattern-matrix.svg", generatePatternMatrixSvg());

// ---------------------------------------------------------------------------
// 8. Alpha Contributes
// ---------------------------------------------------------------------------

function generateAlphaContributesSvg(): string {
  const alphas = baseline.alphas ?? [];
  const focuses = baseline.focuses ?? [];

  // Group alphas by focus
  const byFocus = new Map<string, any[]>();
  for (const a of alphas) {
    const fn = a.focusName || "Other";
    if (!byFocus.has(fn)) byFocus.set(fn, []);
    byFocus.get(fn)!.push(a);
  }

  const cardW = 140;
  const cardH = 48;
  const cardGap = 12;
  const headerH = 44;
  const swimlanePad = 16;
  const swimlaneGap = 24;

  const parts: string[] = [];
  let currentY = 10;
  let maxWidth = 400;

  for (const focus of focuses) {
    const focusAlphas = byFocus.get(focus.name) ?? [];
    if (focusAlphas.length === 0) continue;

    const heights = focusAlphas.map(() => cardH);
    const edges = alphaContributesToEdges(focusAlphas);
    const layout = computeAlphaContributorBelowLayout(focusAlphas, heights, {
      headerH,
      cardW,
      cardGap,
    });

    const swimlaneW = layout.width + swimlanePad * 2;
    maxWidth = Math.max(maxWidth, swimlaneW);

    // Swimlane background
    parts.push(
      `<rect x="10" y="${currentY}" width="${swimlaneW}" height="${layout.height + swimlanePad}" rx="6" fill="#f8f8f8" stroke="#d2d2d2" stroke-width="1"/>`,
    );
    // Focus heading
    parts.push(
      `<text x="${10 + swimlanePad}" y="${currentY + 24}" font-family="sans-serif" font-size="13" font-weight="700" fill="#151515">${escSvg(focus.name)}</text>`,
    );
    if (focus.description) {
      parts.push(
        `<text x="${10 + swimlanePad}" y="${currentY + 38}" font-family="sans-serif" font-size="10" font-style="italic" fill="#6a6e73">${escSvg(focus.description.slice(0, 60))}</text>`,
      );
    }

    // Alpha cards within this swimlane
    const offsetX = 10 + swimlanePad;
    const offsetY = currentY;

    for (let i = 0; i < focusAlphas.length; i++) {
      const alpha = focusAlphas[i];
      const ax = offsetX + layout.x[i];
      const ay = offsetY + layout.y[i];
      const label = alpha.name.length > 18 ? alpha.name.slice(0, 17) + "…" : alpha.name;

      parts.push(
        `<rect x="${ax}" y="${ay}" width="${cardW}" height="${cardH}" rx="4" fill="#ffffff" stroke="#d2d2d2" stroke-width="1"/>`,
        `<text x="${ax + 8}" y="${ay + cardH / 2 + 4}" font-family="sans-serif" font-size="10" font-weight="600" fill="#151515">${escSvg(label)}</text>`,
      );
    }

    // Contribution edges
    for (const edge of edges) {
      const childGeom = alphaCardGeomAt(
        offsetX + layout.x[edge.child],
        offsetY + layout.y[edge.child],
        cardH,
        cardW,
      );
      const parentGeom = alphaCardGeomAt(
        offsetX + layout.x[edge.parent],
        offsetY + layout.y[edge.parent],
        cardH,
        cardW,
      );
      const pathD = contributeEdgePathD(childGeom, parentGeom, 0);
      parts.push(
        `<path d="${pathD}" fill="none" stroke="rgba(0,102,204,0.5)" stroke-width="1.5" marker-end="url(#contrib-arrow)"/>`,
      );
    }

    currentY += layout.height + swimlanePad + swimlaneGap;
  }

  const totalH = currentY + 10;
  const totalW = maxWidth + 30;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
    `  <defs><marker id="contrib-arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(0,102,204,0.5)"/></marker></defs>`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

writeOut("alpha-contributes.svg", generateAlphaContributesSvg());

console.log("Done — all example diagrams generated.");
