import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import {
  getAliasedDisplay,
  type PracticeElementAliasLookup,
} from "@/lib/practiceElementAliasDisplay";
import type { PracticeBaseline } from "@/lib/types";
import { parsePatternViewAlphaState, patternViewLaneRefsWithOrigin, type PatternViewLaneListOrigin } from "@/lib/patternView";

export type PatternMatrixCellEntry = { alphaName: string; stateName: string };

/** Resolved swimlane chip: name matches ActivitySpace.name or Activity.name; secondary is description or type label. */
export type PatternMatrixLaneChip = {
  laneName: string;
  secondary: string;
  kind: "activitySpace" | "activity";
  /** Which PatternView array listed this ref (`activitySpaces` block renders before `activities`). */
  listOrigin: PatternViewLaneListOrigin;
  /** Raw string from the PatternView array (stable dedup within a cell). */
  patternRef: string;
};

export type PatternMatrixGrouped = { focusName: string };

export type PatternMatrixLaneLabels = { activitySpace: string; activity: string };

function isFlatActivityNode(s: any): boolean {
  return s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";
}

function buildLaneIndexes(baseline: PracticeBaseline) {
  const spaceByName = new Map<string, any>();
  const activityByName = new Map<string, any>();
  for (const s of baseline.activitySpaces ?? []) {
    if (isFlatActivityNode(s)) {
      activityByName.set(String(s.name).trim(), s);
    } else {
      spaceByName.set(String(s.name).trim(), s);
      for (const act of s.activities ?? []) {
        activityByName.set(String(act.name).trim(), act);
      }
    }
  }
  const topActs = (baseline as unknown as { activities?: unknown }).activities;
  if (Array.isArray(topActs)) {
    for (const act of topActs) {
      if (!act || typeof act !== "object") continue;
      const n = String((act as { name?: unknown }).name ?? "").trim();
      if (n && !activityByName.has(n)) activityByName.set(n, act);
    }
  }
  return { spaceByName, activityByName };
}

function resolvePatternLane(
  ref: string,
  spaceByName: Map<string, any>,
  activityByName: Map<string, any>,
): { kind: "activitySpace" | "activity"; entity: any } | null {
  const k = String(ref ?? "").trim();
  if (!k) return null;
  if (spaceByName.has(k)) return { kind: "activitySpace", entity: spaceByName.get(k) };
  if (activityByName.has(k)) return { kind: "activity", entity: activityByName.get(k) };
  return null;
}

/**
 * {@link Focus} names referenced by a PatternView: each alpha state's {@link Alpha.focusName} on `baseline`,
 * plus each swimlane ref's {@link ActivitySpace.focusName} or {@link Activity.focusName}.
 */
export function baselineFocusNamesReferencedByPatternView(pv: unknown, baseline: PracticeBaseline): string[] {
  const names = new Set<string>();
  const alphaByName = new Map<string, any>();
  for (const a of baseline.alphas ?? []) {
    alphaByName.set(String(a.name), a);
  }
  const o = pv as { alphaStates?: unknown[] };
  for (const raw of o?.alphaStates ?? []) {
    const p = parsePatternViewAlphaState(raw);
    if (!p) continue;
    const a = alphaByName.get(p.alphaName);
    const fn = String(a?.focusName ?? "").trim();
    if (fn) names.add(fn);
  }
  const { spaceByName, activityByName } = buildLaneIndexes(baseline);
  for (const { name: refName } of patternViewLaneRefsWithOrigin(pv)) {
    const resolved = resolvePatternLane(refName, spaceByName, activityByName);
    if (!resolved) continue;
    const fn = String(resolved.entity?.focusName ?? "").trim();
    if (fn) names.add(fn);
  }
  return [...names];
}

function laneChipSecondary(
  entity: any,
  kind: "activitySpace" | "activity",
  labels: PatternMatrixLaneLabels,
): string {
  const d = practiceElementDescriptionForDisplay(entity);
  if (d) return d;
  return kind === "activitySpace" ? labels.activitySpace : labels.activity;
}

/** Word wrap for diagram blocks; breaks tokens longer than `maxChars` so text stays inside the shape. */
export function wrapDiagramTextLines(text: unknown, maxChars: number): string[] {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (w.length > maxChars) {
      if (line) {
        lines.push(line);
        line = "";
      }
      for (let i = 0; i < w.length; i += maxChars) {
        lines.push(w.slice(i, i + maxChars));
      }
      continue;
    }
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Rows for wrapping aliased diagram titles (matches SVG: primary lines + optional muted canonical). */
export type DiagramAliasedNameRow =
  | { type: "primary"; text: string }
  | { type: "primaryWithCanonical"; primary: string; canonical: string }
  | { type: "canonicalContinuation"; text: string };

/**
 * Layout name lines the same way as {@link PracticeHumanReadablePanel} / PDF aliased diagram blocks:
 * wrap `primary` only; append ` (canonical)` on last primary line when it fits, else continue canonical on extra line(s).
 */
export function layoutDiagramAliasedNameRows(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
  maxChars: number,
): DiagramAliasedNameRow[] {
  const { primary, showCanonical, canonical } = getAliasedDisplay(lookup, kind, canonicalName);
  const plines = wrapDiagramTextLines(primary, maxChars);
  if (!showCanonical) {
    return plines.map((text) => ({ type: "primary" as const, text }));
  }

  const suf = ` (${canonical})`;
  if (plines.length === 0) {
    return wrapDiagramTextLines(suf.trim(), maxChars).map((text) => ({
      type: "canonicalContinuation" as const,
      text,
    }));
  }

  const rows: DiagramAliasedNameRow[] = [];
  for (let i = 0; i < plines.length - 1; i++) {
    rows.push({ type: "primary", text: plines[i] });
  }
  const lastP = plines[plines.length - 1];
  if (lastP.length + suf.length <= maxChars) {
    rows.push({ type: "primaryWithCanonical", primary: lastP, canonical });
    return rows;
  }
  rows.push({ type: "primary", text: lastP });
  for (const cl of wrapDiagramTextLines(suf.trim(), maxChars)) {
    rows.push({ type: "canonicalContinuation", text: cl });
  }
  return rows;
}

/** Height for a title block when the name may be aliased (alpha/activity swimlane cards, etc.). */
export function computeBlockHeightForWidthWithAlias(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
  desc: unknown,
  blockW: number,
  padX: number,
  padY: number,
  chevron = false,
): number {
  const { nameMaxChars, descMaxChars } = diagramTextCharLimits(blockW, padX, chevron);
  const nameRows = layoutDiagramAliasedNameRows(lookup, kind, String(canonicalName ?? ""), nameMaxChars);
  const descLines = wrapDiagramTextLines(desc, descMaxChars);
  const nameLineH = 18;
  const descLineH = 16;
  const gap = 8;
  const y0 = padY + 22;
  const bottomPad = 22;
  return y0 + nameRows.length * nameLineH + gap + descLines.length * descLineH + bottomPad;
}

export function computeArrowHeightForWidthWithAlias(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: string,
  desc: unknown,
  blockW: number,
  padX: number,
  padY: number,
): number {
  return Math.max(74, computeBlockHeightForWidthWithAlias(lookup, kind, canonicalName, desc, blockW, padX, padY, true));
}

export function computeSwimlaneFocusHeadingLayoutAliased(
  lookup: PracticeElementAliasLookup,
  kind: string,
  canonicalName: unknown,
  desc: unknown,
  svgWidthPx: number,
  horizontalPad = 16,
): {
  headerH: number;
  nameRows: DiagramAliasedNameRow[];
  descLines: string[];
  textX: number;
} {
  const trimmedDesc = String(desc ?? "").trim();
  const textX = horizontalPad;
  const { nameMaxChars, descMaxChars } = swimlaneFocusHeadingCharLimits(svgWidthPx, horizontalPad);
  const nameRows = layoutDiagramAliasedNameRows(lookup, kind, String(canonicalName ?? ""), nameMaxChars);
  const descLines = trimmedDesc ? wrapDiagramTextLines(trimmedDesc, descMaxChars) : [];
  const H = SWIMLANE_FOCUS_HEADING;
  const headerH = Math.max(
    H.minHeight,
    H.padTop +
      nameRows.length * H.nameLineH +
      (descLines.length ? H.nameDescGap : 0) +
      descLines.length * H.descLineH +
      H.padBottom,
  );
  return { headerH, nameRows, descLines, textX };
}

/** Chevron notch width; matches React `ArrowBlock` and PDF `arrowPolygon`. */
export function arrowNotchWidth(blockW: number) {
  return Math.min(42, Math.floor(blockW * 0.18));
}

const ARROW_TEXT_RIGHT_MARGIN = 8;

/** Reserve right side so wrapped text stays inside the chevron (notch + margin for stroke/glyphs). */
export function arrowTextRightInset(blockW: number) {
  return arrowNotchWidth(blockW) + ARROW_TEXT_RIGHT_MARGIN;
}

function diagramTextContentWidth(blockW: number, padX: number, chevron: boolean) {
  const inset = chevron ? arrowTextRightInset(blockW) : 0;
  return Math.max(24, blockW - 2 * padX - inset);
}

/**
 * Character limits for diagram `wrapLines` (14px/800 name, 12px desc). Slightly conservative vs avg glyph width
 * so text stays inside rects and chevrons.
 */
export function diagramTextCharLimits(blockW: number, padX: number, chevron: boolean) {
  const cw = diagramTextContentWidth(blockW, padX, chevron);
  return {
    nameMaxChars: Math.max(8, Math.floor(cw / 8)),
    descMaxChars: Math.max(12, Math.floor(cw / 7)),
  };
}

/**
 * Focus swimlane title block (16px/800 name, 12px description). Keep in sync with
 * {@link PracticeHumanReadablePanel} swimlane headings and {@link pdfSvgs} lane headers.
 */
export const SWIMLANE_FOCUS_HEADING = {
  padTop: 18,
  nameLineH: 20,
  descLineH: 16,
  nameDescGap: 6,
  padBottom: 12,
  minHeight: 52,
  /** First name line: SVG `y` = padTop + this (text baseline). */
  nameFirstBaselineDy: 15,
} as const;

/** Character limits for a heading that spans the full swimlane width (minus horizontal padding). */
export function swimlaneFocusHeadingCharLimits(svgWidthPx: number, horizontalPad = 16) {
  const innerW = Math.max(24, svgWidthPx - 2 * horizontalPad);
  return {
    nameMaxChars: Math.max(8, Math.floor(innerW / 9)),
    descMaxChars: Math.max(12, Math.floor(innerW / 7)),
  };
}

export function computeSwimlaneFocusHeadingLayout(
  name: unknown,
  desc: unknown,
  svgWidthPx: number,
  horizontalPad = 16,
): { headerH: number; nameLines: string[]; descLines: string[]; textX: number } {
  const trimmedDesc = String(desc ?? "").trim();
  const textX = horizontalPad;
  const { nameMaxChars, descMaxChars } = swimlaneFocusHeadingCharLimits(svgWidthPx, horizontalPad);
  const nameLines = wrapDiagramTextLines(name, nameMaxChars);
  const descLines = trimmedDesc ? wrapDiagramTextLines(trimmedDesc, descMaxChars) : [];
  const H = SWIMLANE_FOCUS_HEADING;
  const headerH = Math.max(
    H.minHeight,
    H.padTop +
      nameLines.length * H.nameLineH +
      (descLines.length ? H.nameDescGap : 0) +
      descLines.length * H.descLineH +
      H.padBottom,
  );
  return { headerH, nameLines, descLines, textX };
}

/** Match {@link PracticeHumanReadablePanel} / {@link pdfSvgs} diagram text metrics. */
export function computeBlockHeightForWidth(
  name: unknown,
  desc: unknown,
  blockW: number,
  padX: number,
  padY: number,
  chevron = false,
) {
  const { nameMaxChars, descMaxChars } = diagramTextCharLimits(blockW, padX, chevron);
  const nameLines = wrapDiagramTextLines(name, nameMaxChars);
  const descLines = wrapDiagramTextLines(desc, descMaxChars);
  const nameLineH = 18;
  const descLineH = 16;
  const gap = 8;
  const y0 = padY + 22;
  const bottomPad = 22;
  return y0 + nameLines.length * nameLineH + gap + descLines.length * descLineH + bottomPad;
}

/** Match activity swimlane arrows ({@link pdfSvgs} / {@link PracticeHumanReadablePanel} ArrowBlock). */
export function computeArrowHeightForWidth(name: unknown, desc: unknown, blockW: number, padX: number, padY: number) {
  return Math.max(74, computeBlockHeightForWidth(name, desc, blockW, padX, padY, true));
}

export function buildPatternMatrixRows(
  baseline: PracticeBaseline,
  grouped: PatternMatrixGrouped[],
): PatternMatrixGrouped[] {
  if (grouped.length) return grouped;
  return (baseline.focuses ?? []).map((f) => ({ focusName: f.name }));
}

export function buildPatternMatrixCells(
  patternViews: any[] | undefined,
  baseline: PracticeBaseline,
  rowFocusNames: string[],
  laneLabels: PatternMatrixLaneLabels,
): { views: any[]; cells: PatternMatrixCellEntry[][][]; laneCells: PatternMatrixLaneChip[][][] } {
  const views = [...(patternViews ?? [])].sort((a, b) => (Number(a?.seq) || 0) - (Number(b?.seq) || 0));
  const alphaByName = new Map<string, any>();
  for (const a of baseline.alphas ?? []) {
    alphaByName.set(String(a.name), a);
  }
  const nR = rowFocusNames.length;
  const nC = views.length;
  const cells: PatternMatrixCellEntry[][][] = rowFocusNames.map(() => views.map(() => []));
  const laneCells: PatternMatrixLaneChip[][][] = rowFocusNames.map(() => views.map(() => []));
  const { spaceByName, activityByName } = buildLaneIndexes(baseline);

  for (let cj = 0; cj < nC; cj++) {
    const pv = views[cj];
    const states = Array.isArray(pv?.alphaStates) ? pv.alphaStates : [];
    for (const raw of states) {
      const p = parsePatternViewAlphaState(raw);
      if (!p) continue;
      const alpha = alphaByName.get(p.alphaName);
      if (!alpha) continue;
      const af = String(alpha.focusName ?? "").trim();
      const ri = rowFocusNames.findIndex((fn) => String(fn).trim() === af);
      if (ri < 0) continue;
      const bucket = cells[ri][cj];
      const key = `${p.alphaName}\0${p.stateName}`;
      if (bucket.some((e) => `${e.alphaName}\0${e.stateName}` === key)) continue;
      bucket.push({ alphaName: p.alphaName, stateName: p.stateName });
    }

    const laneRefs = patternViewLaneRefsWithOrigin(pv);
    for (const { name: refName, listOrigin } of laneRefs) {
      const resolved = resolvePatternLane(refName, spaceByName, activityByName);
      if (!resolved) continue;
      const focus = String(resolved.entity.focusName ?? "").trim();
      const ri = rowFocusNames.findIndex((fn) => String(fn).trim() === focus);
      if (ri < 0) continue;
      const laneName = String(resolved.entity.name ?? "").trim();
      if (!laneName) continue;
      const secondary = laneChipSecondary(resolved.entity, resolved.kind, laneLabels);
      const bucket = laneCells[ri][cj];
      const key = `${listOrigin}\0${refName}`;
      if (bucket.some((e) => `${e.listOrigin}\0${e.patternRef}` === key)) continue;
      bucket.push({ laneName, secondary, kind: resolved.kind, listOrigin, patternRef: refName });
    }
  }
  for (let ri = 0; ri < nR; ri++) {
    for (let cj = 0; cj < nC; cj++) {
      cells[ri][cj].sort((a, b) => a.alphaName.localeCompare(b.alphaName) || a.stateName.localeCompare(b.stateName));
      laneCells[ri][cj].sort((a, b) => {
        const oa = a.listOrigin === "activities" ? 1 : 0;
        const ob = b.listOrigin === "activities" ? 1 : 0;
        if (oa !== ob) return oa - ob;
        return a.patternRef.localeCompare(b.patternRef) || a.laneName.localeCompare(b.laneName) || a.kind.localeCompare(b.kind);
      });
    }
  }
  return { views, cells, laneCells };
}

export type PatternMatrixLayout = {
  width: number;
  height: number;
  headerH: number;
  rowHeights: number[];
  labelColW: number;
  colW: number;
  chipInnerW: number;
};

export function computePatternMatrixLayout(
  views: any[],
  cells: PatternMatrixCellEntry[][][],
  laneCells: PatternMatrixLaneChip[][][],
  options: {
    labelColW: number;
    colW: number;
    headerTopPad: number;
    cellPadding: number;
    chipGap: number;
    minRowH: number;
    /** Vertical gap between alpha/state stack and activity lane stack inside a cell. */
    blockGap?: number;
    /** Optional display measurement for element names (e.g. alias + canonical) so row heights fit. */
    measureName?: (kind: string, canonicalName: string) => string;
    /** When set, chip/arrow heights use alias-aware wrapping for these element kinds. */
    aliasLookup?: PracticeElementAliasLookup;
  },
): PatternMatrixLayout {
  const { labelColW, colW, headerTopPad, cellPadding, chipGap, minRowH, blockGap = 8, measureName, aliasLookup } = options;
  const m = measureName ?? ((_k: string, n: string) => n);
  const chipNameBlockH = (
    kind: string,
    name: string,
    desc: unknown,
    w: number,
    useChevron: boolean,
  ): number => {
    if (aliasLookup && (kind === "Alpha" || kind === "ActivitySpace" || kind === "Activity")) {
      return useChevron
        ? computeArrowHeightForWidthWithAlias(aliasLookup, kind, name, desc, w, 8, 8)
        : computeBlockHeightForWidthWithAlias(aliasLookup, kind, name, desc, w, 8, 8, useChevron);
    }
    return useChevron
      ? computeArrowHeightForWidth(m(kind, name), desc, w, 8, 8)
      : computeBlockHeightForWidth(m(kind, name), desc, w, 8, 8, useChevron);
  };

  const nR = cells.length;
  const nC = views.length;
  const innerHeaderW = colW - 16;
  const colHeaderHs = views.map((pv) =>
    aliasLookup
      ? computeBlockHeightForWidthWithAlias(
          aliasLookup,
          "PatternView",
          String(pv.name ?? ""),
          practiceElementDescriptionForDisplay(pv),
          innerHeaderW,
          8,
          8,
        )
      : computeBlockHeightForWidth(
          m("PatternView", String(pv.name ?? "")),
          practiceElementDescriptionForDisplay(pv),
          innerHeaderW,
          8,
          8,
        ),
  );
  const headerH = (colHeaderHs.length ? Math.max(...colHeaderHs) : 48) + headerTopPad;
  const chipInnerW = Math.max(80, colW - 2 * cellPadding - 8);
  const chipW = chipInnerW + 8;
  const rowHeights: number[] = [];
  for (let ri = 0; ri < nR; ri++) {
    let maxCell = minRowH;
    for (let cj = 0; cj < nC; cj++) {
      const alphaChips = cells[ri][cj];
      const laneChips = laneCells[ri]?.[cj] ?? [];
      let cellH = cellPadding * 2;
      if (alphaChips.length) {
        cellH += alphaChips.reduce(
          (sum, e, idx) =>
            sum +
            chipNameBlockH("Alpha", e.alphaName, m("State", e.stateName), chipW, false) +
            (idx < alphaChips.length - 1 ? chipGap : 0),
          0,
        );
      }
      if (alphaChips.length && laneChips.length) cellH += blockGap;
      if (laneChips.length) {
        cellH += laneChips.reduce(
          (sum, e, idx) =>
            sum +
            chipNameBlockH(
              e.kind === "activitySpace" ? "ActivitySpace" : "Activity",
              e.laneName,
              e.secondary,
              chipW,
              true,
            ) +
            (idx < laneChips.length - 1 ? chipGap : 0),
          0,
        );
      }
      if (!alphaChips.length && !laneChips.length) cellH += 12;
      maxCell = Math.max(maxCell, cellH);
    }
    rowHeights.push(maxCell);
  }
  const width = labelColW + nC * colW;
  const height = headerH + rowHeights.reduce((a, b) => a + b, 0);
  return { width, height, headerH, rowHeights, labelColW, colW, chipInnerW };
}
