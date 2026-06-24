/** Default vertical rhythm for alpha contributor swimlanes (web + PDF). */
export const ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS = {
  /** Space between stacked alpha rows; arrows run in this channel. */
  rowGap: 26,
  /** Padding below the last row so downward / orthogonal traces and markers are not clipped. */
  bottomPad: 40,
} as const;

const TRACE_BELOW_CARD_BOTTOM = 22;
const TRACE_STAGGER = 9;
const MID_CHANNEL_JITTER = 2.5;

/**
 * When rollup alphas live in another focus swimlane, prepend their cards to this lane’s diagram so
 * {@link alphaContributesToEdges} and layout can connect contributors to real parents.
 */
export function augmentLaneAlphasWithCrossLaneContributesParents(
  laneAlphas: { name?: unknown; contributesTo?: unknown }[],
  allAlphas: { name?: unknown; contributesTo?: unknown }[] | undefined,
): { name?: unknown; contributesTo?: unknown }[] {
  if (!allAlphas?.length || !laneAlphas.length) return laneAlphas;
  const laneNames = new Set(laneAlphas.map((a) => String(a?.name ?? "").trim()).filter(Boolean));
  const byName = new Map<string, { name?: unknown; contributesTo?: unknown }>();
  for (const a of allAlphas) {
    const nm = String(a?.name ?? "").trim();
    if (nm) byName.set(nm, a);
  }
  const extras: typeof laneAlphas = [];
  const seen = new Set<string>();
  for (const a of laneAlphas) {
    const self = String(a?.name ?? "").trim();
    const p = typeof a?.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (!p || p === self || laneNames.has(p)) continue;
    if (seen.has(p)) continue;
    const parent = byName.get(p);
    if (!parent) continue;
    seen.add(p);
    extras.push(parent);
  }
  extras.sort((x, y) => String(x?.name ?? "").localeCompare(String(y?.name ?? "")));
  return [...extras, ...laneAlphas];
}

/** Collect child → parent indices from Alpha.contributesTo within one focus lane (same diagram). */
export function alphaContributesToEdges(alphas: { name?: unknown; contributesTo?: unknown }[]): Array<{
  child: number;
  parent: number;
}> {
  const nameToIdx = new Map<string, number>();
  alphas.forEach((a, i) => {
    const n = String(a?.name ?? "").trim();
    if (n) nameToIdx.set(n, i);
  });
  const out: Array<{ child: number; parent: number }> = [];
  alphas.forEach((a, i) => {
    const p = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (!p) return;
    const j = nameToIdx.get(p);
    if (j === undefined || j === i) return;
    out.push({ child: i, parent: j });
  });
  return out;
}

export type AlphaCardGeom = {
  cx: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Single horizontal row at `headerH` (legacy / simple strip). */
export function alphaCardGeom(
  idx: number,
  h: number,
  headerH: number,
  cardW: number,
  cardGap: number,
): AlphaCardGeom {
  const x = cardGap + idx * (cardW + cardGap);
  return alphaCardGeomAt(x, headerH, h, cardW);
}

export function alphaCardGeomAt(x: number, y: number, h: number, cardW: number): AlphaCardGeom {
  return {
    cx: x + cardW / 2,
    top: y,
    bottom: y + h,
    left: x,
    right: x + cardW,
  };
}

/** Orthogonal path when child and parent share a row: route below the cards. */
export function contributeOrthogonalPathD(child: AlphaCardGeom, parent: AlphaCardGeom, traceY: number): string {
  const { cx: cx0, bottom: b0 } = child;
  const { cx: cx1, bottom: b1 } = parent;
  const endY = Math.max(b1 - 2, child.top + 4);
  return `M ${cx0} ${b0} L ${cx0} ${traceY} L ${cx1} ${traceY} L ${cx1} ${endY}`;
}

function contributePathChildBelowParentRow(child: AlphaCardGeom, parent: AlphaCardGeom, midYJitter: number): string {
  const mid = parent.bottom + (child.top - parent.bottom) / 2 + midYJitter;
  const endY = Math.max(parent.top + 6, parent.bottom - 3);
  return `M ${child.cx} ${child.top} L ${child.cx} ${mid} L ${parent.cx} ${mid} L ${parent.cx} ${endY}`;
}

/** Arrow from contributor (child) to rollup (parent); uses upward routing when the child sits on a lower row. */
export function contributeEdgePathD(child: AlphaCardGeom, parent: AlphaCardGeom, edgeIndex: number): string {
  if (child.top >= parent.bottom - 4) {
    return contributePathChildBelowParentRow(child, parent, edgeIndex * MID_CHANNEL_JITTER);
  }
  const traceY = Math.max(child.bottom, parent.bottom) + TRACE_BELOW_CARD_BOTTOM + edgeIndex * TRACE_STAGGER;
  return contributeOrthogonalPathD(child, parent, traceY);
}

/**
 * Place alphas in horizontal rows: row 0 has roots (no in-lane parent); each `contributesTo` target sits one row above
 * its contributor. Children are centered under their parent, then the row is compacted left without overlap.
 */
export function computeAlphaContributorBelowLayout(
  alphas: { name?: unknown; contributesTo?: unknown }[],
  heights: number[],
  opts: { headerH: number; cardW: number; cardGap: number; rowGap?: number; bottomPad?: number },
): { x: number[]; y: number[]; width: number; height: number } {
  const rowGap = opts.rowGap ?? ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap;
  const bottomPad = opts.bottomPad ?? ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad;
  const headerH = opts.headerH;
  const cardW = opts.cardW;
  const cardGap = opts.cardGap;

  const n = alphas.length;
  if (n === 0) {
    return { x: [], y: [], width: cardGap * 2 + cardW, height: headerH + bottomPad };
  }

  const nameToIdx = new Map<string, number>();
  alphas.forEach((a, i) => {
    const nm = String(a?.name ?? "").trim();
    if (nm) nameToIdx.set(nm, i);
  });

  const parentIdx = alphas.map((a, i) => {
    const p = typeof a.contributesTo === "string" ? a.contributesTo.trim() : "";
    if (!p) return -1;
    const j = nameToIdx.get(p);
    if (j === undefined || j === i) return -1;
    return j;
  });

  const row = new Array(n).fill(0);
  for (let pass = 0; pass < n + 2; pass++) {
    for (let i = 0; i < n; i++) {
      const p = parentIdx[i];
      if (p < 0) continue;
      row[i] = Math.max(row[i], row[p] + 1);
    }
  }

  const byRow = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = row[i];
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r)!.push(i);
  }

  const sortedRows = [...byRow.keys()].sort((a, b) => a - b);
  const x = new Array(n).fill(0);

  for (const r of sortedRows) {
    const nodes = byRow.get(r)!;
    if (r === 0) {
      nodes.sort((a, b) => a - b);
      for (let k = 0; k < nodes.length; k++) {
        x[nodes[k]] = cardGap + k * (cardW + cardGap);
      }
    } else {
      const byParent = new Map<number, number[]>();
      for (const i of nodes) {
        const p = parentIdx[i];
        if (p < 0) continue;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p)!.push(i);
      }
      for (const ch of byParent.values()) ch.sort((a, b) => a - b);
      const parentKeys = [...byParent.keys()].sort((a, b) => x[a] - x[b] || a - b);
      for (const p of parentKeys) {
        const ch = byParent.get(p)!;
        const pc = x[p] + cardW / 2;
        const k = ch.length;
        const totalW = k * cardW + (k - 1) * cardGap;
        let left = pc - totalW / 2;
        for (let j = 0; j < k; j++) {
          x[ch[j]] = left + j * (cardW + cardGap);
        }
      }
      const assigned = new Set<number>();
      for (const ch of byParent.values()) for (const i of ch) assigned.add(i);
      const orphan = nodes.filter((i) => !assigned.has(i));
      orphan.sort((a, b) => a - b);
      if (orphan.length) {
        const placed = nodes.filter((i) => assigned.has(i));
        const start =
          placed.length > 0 ? Math.max(cardGap, ...placed.map((i) => x[i] + cardW + cardGap)) : cardGap;
        orphan.forEach((idx, k) => {
          x[idx] = start + k * (cardW + cardGap);
        });
      }
    }
    const sortedNodes = [...nodes].sort((a, b) => x[a] - x[b] || a - b);
    let cursor = cardGap;
    for (const i of sortedNodes) {
      if (x[i] < cursor) x[i] = cursor;
      cursor = x[i] + cardW + cardGap;
    }
  }

  const minX = Math.min(...x);
  const dx = cardGap - minX;
  if (dx !== 0) {
    for (let i = 0; i < n; i++) x[i] += dx;
  }

  const y = new Array(n).fill(0);
  let yCursor = headerH;
  for (const r of sortedRows) {
    const nodes = byRow.get(r)!;
    const maxH = Math.max(...nodes.map((i) => heights[i] ?? 96), 96);
    for (const i of nodes) y[i] = yCursor;
    yCursor += maxH + rowGap;
  }
  yCursor += bottomPad;

  const width = Math.max(...x.map((xi, i) => xi + cardW)) + cardGap;
  const height = Math.max(headerH + bottomPad + 96, yCursor);

  return { x, y, width, height };
}
