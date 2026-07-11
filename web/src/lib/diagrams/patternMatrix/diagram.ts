import {
  patternViewNarrativeContextProseTexts,
  practiceElementDescriptionForDisplay,
} from "@/lib/ir";
import {
  getAliasedDisplay,
  type PracticeElementAliasLookup,
} from "@/lib/display/elementDisplay";
import type { PracticeBaseline } from "@/lib/types";
import {
  parsePatternViewAlphaState,
  patternViewLaneRefsWithOrigin,
  type PatternViewLaneListOrigin,
} from "@/lib/converters/patternView";

/** True when a baseline `contributesTo` entry targets the exact alpha/state slice used in PatternView.alphaStates. */
export function contribEntryMatchesAlphaState(
  entry: unknown,
  alphaName: string,
  stateName: string,
): boolean {
  const p = parsePatternViewAlphaState(entry);
  if (!p) return false;
  return (
    p.alphaName.trim() === alphaName.trim() &&
    p.stateName.trim() === stateName.trim()
  );
}

export type PatternMatrixCellEntry = { alphaName: string; stateName: string };

/** Hierarchical alpha row: root with optional children that should be displayed as sub-columns. */
export type PatternMatrixAlphaRow = {
  alphaName: string;
  children: string[]; // Child alpha names (direct and indirect descendants)
};

/** One PatternView.alphaInstances row matched to an alpha/state matrix slice (diagram + PDF); {@link instanceName} is `alphaName: instance.name` for display. */
export type PatternMatrixSliceInstanceChip = {
  instanceName: string;
  /** Instance description from IR (currently unused inside the slice chip visual). */
  secondary: string;
};

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

/** One alpha→state slice in a matrix cell plus execution lanes inferred from contributesTo / explicit refs. */
export type PatternMatrixCellBlock = PatternMatrixCellEntry & {
  lanes: PatternMatrixLaneChip[];
  sliceInstances?: PatternMatrixSliceInstanceChip[];
};

/** Derived bold primary text for slice chip when `sliceInstances` are present (`" · "`-joined names). Otherwise empty. */
export function patternMatrixSliceChipPrimaryJoined(block: PatternMatrixCellBlock): string {
  const inst = block.sliceInstances;
  if (!inst?.length) return "";
  return inst.map((s) => s.instanceName.trim()).filter(Boolean).join(" · ");
}

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
  /** Lanes tied via contributesTo → alpha state slices also constrain focus closure. */
  for (const raw of o?.alphaStates ?? []) {
    const slice = parsePatternViewAlphaState(raw);
    if (!slice) continue;
    for (const s of baseline.activitySpaces ?? []) {
      if (isFlatActivityNode(s)) {
        const match = (s.contributesTo ?? []).some((c) =>
          contribEntryMatchesAlphaState(c, slice.alphaName, slice.stateName),
        );
        if (match) {
          const fn = String((s as { focusName?: unknown }).focusName ?? "").trim();
          if (fn) names.add(fn);
        }
      } else {
        const matchSpace = (s.contributesTo ?? []).some((c) =>
          contribEntryMatchesAlphaState(c, slice.alphaName, slice.stateName),
        );
        if (matchSpace) {
          const fn = String(s.focusName ?? "").trim();
          if (fn) names.add(fn);
        }
        for (const act of s.activities ?? []) {
          const matchAct = (act.contributesTo ?? []).some((c) =>
            contribEntryMatchesAlphaState(c, slice.alphaName, slice.stateName),
          );
          if (matchAct) {
            const fn = String(act.focusName ?? "").trim();
            if (fn) names.add(fn);
          }
        }
      }
    }
    const topActs = (baseline as unknown as { activities?: unknown }).activities;
    if (Array.isArray(topActs)) {
      for (const act of topActs) {
        if (!act || typeof act !== "object") continue;
        const matchAct = ((act as { contributesTo?: unknown[] }).contributesTo ?? []).some((c) =>
          contribEntryMatchesAlphaState(c, slice.alphaName, slice.stateName),
        );
        if (matchAct) {
          const fn = String((act as { focusName?: unknown }).focusName ?? "").trim();
          if (fn) names.add(fn);
        }
      }
    }
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

/**
 * Get all descendant alphas (direct and indirect children) for a root alpha.
 * Returns them in depth-first order.
 */
export function getAlphaDescendants(
  rootAlphaName: string,
  baseline: PracticeBaseline,
): string[] {
  const list = baseline.alphas ?? [];
  const nameSet = new Set(list.map((a) => String(a?.name ?? "").trim()).filter(Boolean));
  const alphaByName = new Map<string, (typeof list)[number]>();
  const indexByName = new Map<string, number>();

  for (let i = 0; i < list.length; i++) {
    const n = String(list[i]?.name ?? "").trim();
    if (n) {
      alphaByName.set(n, list[i]);
      if (!indexByName.has(n)) indexByName.set(n, i);
    }
  }

  const sortByBaselineIndex = (a: string, b: string) => {
    return (indexByName.get(a) ?? 0) - (indexByName.get(b) ?? 0);
  };

  /** Map of parent -> direct children */
  const childrenByParent = new Map<string, string[]>();

  for (const a of list) {
    const n = String(a?.name ?? "").trim();
    if (!n) continue;

    const parent = parentNameInFocus(a, nameSet);
    if (parent !== null) {
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(n);
    }
  }

  // Sort each child list by baseline index
  for (const [, children] of childrenByParent) {
    children.sort(sortByBaselineIndex);
  }

  // Depth-first traversal starting from rootAlphaName
  const result: string[] = [];
  const visited = new Set<string>();

  function dfs(alphaName: string) {
    if (visited.has(alphaName)) return;
    visited.add(alphaName);

    const children = childrenByParent.get(alphaName) ?? [];
    for (const child of children) {
      result.push(child);
      dfs(child);
    }
  }

  dfs(rootAlphaName);
  return result;
}

/**
 * Ordered alpha names for the pattern matrix rows: grouped by focus (order follows
 * `PracticeBaseline.focuses`). Only returns root alphas (ultimate parents in contributesTo chains).
 * Use {@link getAlphaDescendants} to find children of each root for hierarchical display.
 */
export function buildPatternMatrixAlphaRows(baseline: PracticeBaseline): string[] {
  const list = baseline.alphas ?? [];
  if (list.length === 0) return [];

  const indexByName = new Map<string, number>();
  for (let i = 0; i < list.length; i++) {
    const n = String(list[i]?.name ?? "").trim();
    if (n && !indexByName.has(n)) indexByName.set(n, i);
  }

  const byFocus = new Map<string, typeof list>();
  for (const a of list) {
    const fk = String(a.focusName ?? "").trim();
    if (!byFocus.has(fk)) byFocus.set(fk, []);
    byFocus.get(fk)!.push(a);
  }

  /** Focus buckets in focuses[] order; remaining focuses appended by earliest alpha index then name */
  const focusKeysOrdered: string[] = [];
  const seenFocus = new Set<string>();
  for (const f of baseline.focuses ?? []) {
    const k = String(f?.name ?? "").trim();
    if (!byFocus.has(k)) continue;
    focusKeysOrdered.push(k);
    seenFocus.add(k);
  }
  const remainingFocuses = [...byFocus.keys()].filter((k) => !seenFocus.has(k));
  remainingFocuses.sort((a, b) => {
    const minIdx = (fk: string) => {
      const idxs = (byFocus.get(fk) ?? []).map((x) => indexByName.get(String(x?.name ?? "").trim()) ?? 1e9);
      return idxs.length ? Math.min(...idxs) : 1e9;
    };
    const da = minIdx(a);
    const db = minIdx(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
  focusKeysOrdered.push(...remainingFocuses);

  const out: string[] = [];
  for (const fk of focusKeysOrdered) {
    const group = byFocus.get(fk) ?? [];
    if (group.length === 0) continue;
    out.push(...orderAlphasWithinFocusForPatternMatrix(group, indexByName));
  }
  return out;
}

function parentNameInFocus(a: { name?: unknown; contributesTo?: unknown }, nameSet: Set<string>): string | null {
  const self = String(a?.name ?? "").trim();
  const raw = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
  if (!raw || raw === self) return null;
  if (!nameSet.has(raw)) return null;
  return raw;
}

/** Find the ultimate root alpha in a contributesTo chain (handles cycles by returning null). */
function findUltimateRootInFocus(
  alphaName: string,
  alphaByName: Map<string, any>,
  nameSet: Set<string>,
): string | null {
  const visited = new Set<string>();
  let current = alphaName;

  while (true) {
    if (visited.has(current)) {
      // Cycle detected
      return null;
    }
    visited.add(current);

    const alpha = alphaByName.get(current);
    if (!alpha) return current;

    const parent = parentNameInFocus(alpha, nameSet);
    if (parent === null) {
      // No parent - this is the root
      return current;
    }

    current = parent;
  }
}

/**
 * Returns only the ultimate root alphas within a focus (no duplication of parent alphas in contributesTo chains).
 * For hierarchical alphas (A → B → C), only the root (A) is returned.
 */
function orderAlphasWithinFocusForPatternMatrix(
  group: NonNullable<PracticeBaseline["alphas"]>,
  indexByName: Map<string, number>,
): string[] {
  const nameSet = new Set(group.map((a) => String(a?.name ?? "").trim()).filter(Boolean));
  const alphaByName = new Map<string, (typeof group)[number]>();

  for (const a of group) {
    const n = String(a?.name ?? "").trim();
    if (n) alphaByName.set(n, a);
  }

  const sortByBaselineIndex = (x: (typeof group)[number], y: (typeof group)[number]) => {
    const ix = indexByName.get(String(x?.name ?? "").trim()) ?? 0;
    const iy = indexByName.get(String(y?.name ?? "").trim()) ?? 0;
    return ix - iy;
  };

  // Find all ultimate roots
  const rootNames = new Set<string>();
  const alphaToRoot = new Map<string, string>();

  for (const a of group) {
    const n = String(a?.name ?? "").trim();
    if (!n) continue;

    const root = findUltimateRootInFocus(n, alphaByName, nameSet);
    if (root) {
      rootNames.add(root);
      alphaToRoot.set(n, root);
    } else {
      // Cycle detected - treat this alpha as its own root
      rootNames.add(n);
      alphaToRoot.set(n, n);
    }
  }

  // Get root alpha objects and sort by baseline index
  const roots = Array.from(rootNames)
    .map(name => alphaByName.get(name))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)
    .sort(sortByBaselineIndex);

  return roots.map(a => String(a?.name ?? "").trim()).filter(Boolean);
}

export function buildPatternMatrixRows(
  baseline: PracticeBaseline,
  grouped: PatternMatrixGrouped[],
): PatternMatrixGrouped[] {
  if (grouped.length) return grouped;
  return (baseline.focuses ?? []).map((f) => ({ focusName: f.name }));
}

/**
 * Find the row index for an alpha, mapping child alphas to their root alpha row.
 * If alphaName is a child of a root alpha in rowAlphaNames, returns the root's index.
 */
function alphaRowIndexWithHierarchy(
  rowAlphaNames: string[],
  alphaName: string,
  baseline: PracticeBaseline,
): number {
  const t = alphaName.trim();

  // Direct match
  const directIdx = rowAlphaNames.findIndex((n) => n.trim() === t);
  if (directIdx >= 0) return directIdx;

  // Check if alphaName is a child of any root alpha
  const list = baseline.alphas ?? [];
  const nameSet = new Set(list.map((a) => String(a?.name ?? "").trim()).filter(Boolean));
  const alphaByName = new Map<string, (typeof list)[number]>();

  for (const a of list) {
    const n = String(a?.name ?? "").trim();
    if (n) alphaByName.set(n, a);
  }

  const root = findUltimateRootInFocus(t, alphaByName, nameSet);
  if (root && root !== t) {
    return rowAlphaNames.findIndex((n) => n.trim() === root);
  }

  return -1;
}

function findOrAppendCellBlock(bucket: PatternMatrixCellBlock[], alphaName: string, stateName: string): PatternMatrixCellBlock {
  const k = `${alphaName}\0${stateName}`;
  const found = bucket.find((b) => `${b.alphaName}\0${b.stateName}` === k);
  if (found) return found;
  const b: PatternMatrixCellBlock = { alphaName, stateName, lanes: [] };
  bucket.push(b);
  return b;
}

function appendSliceInstanceForBlock(block: PatternMatrixCellBlock, raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const o = raw as Record<string, unknown>;
  const instanceNm = String(o.name ?? "").trim();
  const secondary = String(practiceElementDescriptionForDisplay(raw) ?? "").trim();
  const displayHead = `${block.alphaName}: ${instanceNm || "—"}`;
  if (!block.sliceInstances) block.sliceInstances = [];
  if (block.sliceInstances.some((x) => x.instanceName === displayHead && x.secondary === secondary)) return;
  block.sliceInstances.push({
    instanceName: displayHead,
    secondary,
  });
}

function appendLaneIfMissing(
  block: PatternMatrixCellBlock,
  lane: Omit<PatternMatrixLaneChip, "patternRef"> & { patternRef: string },
) {
  const key = `${lane.listOrigin}\0${lane.patternRef}`;
  if (block.lanes.some((e) => `${e.listOrigin}\0${e.patternRef}` === key)) return;
  block.lanes.push({
    laneName: lane.laneName,
    secondary: lane.secondary,
    kind: lane.kind,
    listOrigin: lane.listOrigin,
    patternRef: lane.patternRef,
  });
}

function fillLanesContributingForSlice(
  block: PatternMatrixCellBlock,
  baseline: PracticeBaseline,
  alphaName: string,
  stateName: string,
  laneLabels: PatternMatrixLaneLabels,
) {
  function tryLane(
    entity: { name?: unknown; contributesTo?: unknown[] } | null | undefined,
    kind: "activitySpace" | "activity",
    listOrigin: PatternViewLaneListOrigin,
  ) {
    if (!entity || typeof entity !== "object") return;
    const laneName = String(entity.name ?? "").trim();
    if (!laneName) return;
    const match = (entity.contributesTo ?? []).some((c) =>
      contribEntryMatchesAlphaState(c, alphaName, stateName),
    );
    if (!match) return;
    const secondary = laneChipSecondary(entity, kind, laneLabels);
    appendLaneIfMissing(block, { laneName, secondary, kind, listOrigin, patternRef: laneName });
  }

  for (const s of baseline.activitySpaces ?? []) {
    if (isFlatActivityNode(s)) tryLane(s, "activity", "activities");
    else {
      tryLane(s, "activitySpace", "activitySpaces");
      for (const act of s.activities ?? []) {
        tryLane(act, "activity", "activities");
      }
    }
  }
  const topActs = (baseline as unknown as { activities?: unknown }).activities;
  if (Array.isArray(topActs)) {
    for (const act of topActs) {
      tryLane(act as { name?: unknown; contributesTo?: unknown[] }, "activity", "activities");
    }
  }
}

function appendExplicitLanesForSliceFromPatternView(
  block: PatternMatrixCellBlock,
  pv: unknown,
  baseline: PracticeBaseline,
  alphaName: string,
  stateName: string,
  laneLabels: PatternMatrixLaneLabels,
) {
  const { spaceByName, activityByName } = buildLaneIndexes(baseline);
  for (const { name: refName, listOrigin } of patternViewLaneRefsWithOrigin(pv)) {
    const resolved = resolvePatternLane(refName, spaceByName, activityByName);
    if (!resolved) continue;
    const ln = String(resolved.entity.name ?? "").trim();
    if (!ln) continue;
    const match = (resolved.entity.contributesTo ?? []).some((c: unknown) =>
      contribEntryMatchesAlphaState(c, alphaName, stateName),
    );
    if (!match) continue;
    const secondary = laneChipSecondary(resolved.entity, resolved.kind, laneLabels);
    appendLaneIfMissing(block, {
      laneName: ln,
      secondary,
      kind: resolved.kind,
      listOrigin,
      patternRef: refName,
    });
  }
}

/**
 * Rows = baseline alphas; each cell stacks {@link PatternMatrixCellBlock} for every alpha/state slice that the
 * PatternView names for that alpha. Execution lanes nest under each slice.
 */
export function buildPatternMatrixCells(
  patternViews: any[] | undefined,
  baseline: PracticeBaseline,
  rowAlphaNames: string[],
  laneLabels: PatternMatrixLaneLabels,
): { views: any[]; cellBlocks: PatternMatrixCellBlock[][][] } {
  const views = [...(patternViews ?? [])].sort((a, b) => (Number(a?.seq) || 0) - (Number(b?.seq) || 0));
  const nR = rowAlphaNames.length;
  const nC = views.length;
  const cellBlocks: PatternMatrixCellBlock[][][] = rowAlphaNames.map(() => views.map(() => []));

  for (let cj = 0; cj < nC; cj++) {
    const pv = views[cj];
    const states = Array.isArray(pv?.alphaStates) ? pv.alphaStates : [];
    for (const raw of states) {
      const p = parsePatternViewAlphaState(raw);
      if (!p) continue;
      const ri = alphaRowIndexWithHierarchy(rowAlphaNames, p.alphaName, baseline);
      if (ri < 0) continue;
      const block = findOrAppendCellBlock(cellBlocks[ri][cj], p.alphaName, p.stateName);
      fillLanesContributingForSlice(block, baseline, p.alphaName, p.stateName, laneLabels);
      appendExplicitLanesForSliceFromPatternView(block, pv, baseline, p.alphaName, p.stateName, laneLabels);
    }
    const instRows = Array.isArray(pv?.alphaInstances) ? pv.alphaInstances : [];
    for (const raw of instRows) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      const alphaName = String(o.alphaName ?? "").trim();
      const stateName = String(o.stateName ?? "").trim();
      if (!alphaName || !stateName) continue;
      const ri = alphaRowIndexWithHierarchy(rowAlphaNames, alphaName, baseline);
      if (ri < 0) continue;
      const block = findOrAppendCellBlock(cellBlocks[ri][cj], alphaName, stateName);
      appendSliceInstanceForBlock(block, raw);
      fillLanesContributingForSlice(block, baseline, alphaName, stateName, laneLabels);
      appendExplicitLanesForSliceFromPatternView(block, pv, baseline, alphaName, stateName, laneLabels);
    }
  }

  for (let ri = 0; ri < nR; ri++) {
    for (let cj = 0; cj < nC; cj++) {
      cellBlocks[ri][cj].sort((a, b) => a.stateName.localeCompare(b.stateName));
      for (const b of cellBlocks[ri][cj]) {
        b.lanes.sort((x, y) => {
          const oa = x.listOrigin === "activities" ? 1 : 0;
          const ob = y.listOrigin === "activities" ? 1 : 0;
          if (oa !== ob) return oa - ob;
          return (
            x.patternRef.localeCompare(y.patternRef) ||
            x.laneName.localeCompare(y.laneName) ||
            x.kind.localeCompare(y.kind)
          );
        });
      }
    }
  }
  return { views, cellBlocks };
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

/** Min height for lane fold overlay (execution lanes) in {@link DiagramPatternMatrix}. */
export const PATTERN_MATRIX_LANE_TOGGLE_HEIGHT = 22;

/** Vertical gap between PatternView description and first narrative-context bullet in the matrix header. */
export const PATTERN_VIEW_MATRIX_NARRATIVE_BULLET_GAP_PX = 6;

/**
 * Extra height for narrative-context bullets under the PatternView column header (web + PDF matrix).
 */
export function patternViewNarrativeBulletBlockHeight(
  innerHeaderW: number,
  padX: number,
  proseLines: readonly string[],
): number {
  const nonEmpty = proseLines
    .map((p) => String(p ?? "").trim())
    .filter((t) => t !== "");
  if (nonEmpty.length === 0) return 0;
  const { descMaxChars } = diagramTextCharLimits(innerHeaderW, padX, false);
  /** Single context: plain prose (full width). Multiple: bulleted; reserve two chars for • and gap. */
  const wrapMaxChars =
    nonEmpty.length > 1 ? Math.max(4, descMaxChars - 2) : Math.max(4, descMaxChars);
  const lineH = 16;
  let lines = 0;
  for (const prose of nonEmpty) {
    lines += wrapDiagramTextLines(prose, wrapMaxChars).length;
  }
  if (lines === 0) return 0;
  return PATTERN_VIEW_MATRIX_NARRATIVE_BULLET_GAP_PX + lines * lineH;
}

export function computePatternMatrixLayout(
  views: any[],
  cellBlocks: PatternMatrixCellBlock[][][],
  options: {
    labelColW: number;
    colW: number;
    headerTopPad: number;
    cellPadding: number;
    chipGap: number;
    minRowH: number;
    /** Vertical gap between alpha→state slice and lanes / toggle beneath it. */
    blockGap?: number;
    /** Extra gap between sibling alpha→state stacks within one matrix cell. */
    blockStackGap?: number;
    /** When false, lane arrows are hidden; fold control overlays the slice chip (no separate strip height). */
    lanesExpanded?: (ri: number, cj: number, blockIdx: number) => boolean;
    measureName?: (kind: string, canonicalName: string) => string;
    aliasLookup?: PracticeElementAliasLookup;
  },
): PatternMatrixLayout {
  const {
    labelColW,
    colW,
    headerTopPad,
    cellPadding,
    chipGap,
    minRowH,
    blockGap = 8,
    blockStackGap = 8,
    lanesExpanded,
    measureName,
    aliasLookup,
  } = options;
  const isExpanded = lanesExpanded ?? (() => true);
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

  const nR = cellBlocks.length;
  const nC = views.length;
  const innerHeaderW = colW - 16;
  const colHeaderHs = views.map((pv) => {
    const bullets = patternViewNarrativeContextProseTexts(pv);
    const base =
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
          );
    return base + patternViewNarrativeBulletBlockHeight(innerHeaderW, 8, bullets);
  });
  const headerH = (colHeaderHs.length ? Math.max(...colHeaderHs) : 48) + headerTopPad;
  const chipInnerW = Math.max(80, colW - 2 * cellPadding - 8);
  const chipW = chipInnerW + 8;
  const rowHeights: number[] = [];
  for (let ri = 0; ri < nR; ri++) {
    let maxCell = minRowH;
    for (let cj = 0; cj < nC; cj++) {
      const blocks = cellBlocks[ri][cj];
      let cellH = cellPadding * 2;
      if (blocks.length === 0) {
        cellH += 12;
        maxCell = Math.max(maxCell, cellH);
        continue;
      }
      for (let bk = 0; bk < blocks.length; bk++) {
        const b = blocks[bk];
        const derivedPrimary = patternMatrixSliceChipPrimaryJoined(b);
        cellH += derivedPrimary
          ? computeBlockHeightForWidth(derivedPrimary, m("State", b.stateName), chipW, 8, 8, false)
          : chipNameBlockH("Alpha", b.alphaName, m("State", b.stateName), chipW, false);
        const lanes = b.lanes;
        if (lanes.length > 0) {
          if (isExpanded(ri, cj, bk)) {
            cellH += blockGap;
            cellH += lanes.reduce(
              (sum, e, idx) =>
                sum +
                chipNameBlockH(
                  e.kind === "activitySpace" ? "ActivitySpace" : "Activity",
                  e.laneName,
                  e.secondary,
                  chipW,
                  true,
                ) +
                (idx < lanes.length - 1 ? chipGap : 0),
              0,
            );
          }
          /* Collapsed: fold control overlays the slice chip row — no reserved strip height here. */
        }
        if (bk < blocks.length - 1) cellH += blockStackGap;
      }
      maxCell = Math.max(maxCell, cellH);
    }
    rowHeights.push(maxCell);
  }
  const width = labelColW + nC * colW;
  const height = headerH + rowHeights.reduce((a, b) => a + b, 0);
  return { width, height, headerH, rowHeights, labelColW, colW, chipInnerW };
}
