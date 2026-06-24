import {
  ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS,
  alphaCardGeomAt,
  alphaContributesToEdges,
  augmentLaneAlphasWithCrossLaneContributesParents,
  computeAlphaContributorBelowLayout,
  contributeEdgePathD,
} from "@/lib/diagrams/alphaContributes/diagram";
import { practiceElementDescriptionForDisplay, patternViewNarrativeContextProseTexts } from "@/lib/ir";
import {
  buildPatternMatrixAlphaRows,
  buildPatternMatrixCells,
  computeArrowHeightForWidth,
  computeBlockHeightForWidth,
  computePatternMatrixLayout,
  computeSwimlaneFocusHeadingLayout,
  computeSwimlaneFocusHeadingLayoutAliased,
  diagramTextCharLimits,
  layoutDiagramAliasedNameRows,
  patternMatrixSliceChipPrimaryJoined,
  PATTERN_VIEW_MATRIX_NARRATIVE_BULLET_GAP_PX,
  SWIMLANE_FOCUS_HEADING,
  wrapDiagramTextLines,
  type PatternMatrixLaneLabels,
} from "@/lib/diagrams/patternMatrix/diagram";
import {
  diagramMeasureName,
  getAliasedDisplay,
  EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
  type PracticeElementAliasLookup,
} from "@/lib/display/elementDisplay";
import type { PracticeBaseline } from "@/lib/types";
import type { ThemeTokens } from "@/lib/data/themeTokens";
import {
  extractKanbanPatternData,
  buildAlphaSwimLanes,
  buildWorkProductSwimLanes,
} from "@/lib/diagrams/kanban/data";

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Safe fragment for SVG marker ids (unique per focus lane in a combined document). */
function markerIdFragment(s: unknown) {
  return (
    String(s ?? "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "lane"
  );
}

function wrapLines(text: unknown, maxChars: number) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function computeBlockHeight(name: unknown, desc: unknown, nameMaxChars: number, descMaxChars: number) {
  const nameLines = wrapLines(name, nameMaxChars);
  const descLines = wrapLines(desc, descMaxChars);
  const nameLineH = 18;
  const descLineH = 16;
  const top = 14;
  const bottom = 28;
  const gap = 8;
  return top + nameLines.length * nameLineH + gap + descLines.length * descLineH + bottom;
}

function computeArrowHeight(name: unknown, desc: unknown, nameMaxChars: number, descMaxChars: number) {
  return Math.max(74, computeBlockHeight(name, desc, nameMaxChars, descMaxChars));
}

function renderWrappedText(
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
  const x = padX + 12;
  const y0 = padY + 22;

  const nameText = nameLines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y0 + i * nameLineH}" fill="var(--text)" font-size="14" font-weight="800">${esc(ln)}</text>`,
    )
    .join("");
  const descText = descLines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y0 + nameLines.length * nameLineH + gap + i * descLineH}" fill="var(--muted)" font-size="12">${esc(
          ln,
        )}</text>`,
    )
    .join("");
  return nameText + descText;
}

function swimlaneFocusHeadingSvgAliased(hdr: ReturnType<typeof computeSwimlaneFocusHeadingLayoutAliased>): string {
  const H = SWIMLANE_FOCUS_HEADING;
  const yName0 = H.padTop + H.nameFirstBaselineDy;
  const nameText = hdr.nameRows
    .map((row, i) => {
      const y = yName0 + i * H.nameLineH;
      if (row.type === "primary") {
        return `<text x="${hdr.textX}" y="${y}" fill="var(--text)" font-size="16" font-weight="800">${esc(row.text)}</text>`;
      }
      if (row.type === "primaryWithCanonical") {
        return `<text x="${hdr.textX}" y="${y}" fill="var(--text)" font-size="16" font-weight="800">${esc(row.primary)}<tspan font-size="13" font-style="italic" font-weight="500" fill="var(--muted)"> (${esc(
          row.canonical,
        )})</tspan></text>`;
      }
      return `<text x="${hdr.textX}" y="${y}" fill="var(--muted)" font-size="13" font-style="italic" font-weight="500">${esc(row.text)}</text>`;
    })
    .join("");
  const descText = hdr.descLines
    .map(
      (ln, i) =>
        `<text x="${hdr.textX}" y="${
          yName0 + hdr.nameRows.length * H.nameLineH + H.nameDescGap + i * H.descLineH
        }" fill="var(--muted)" font-size="12" font-weight="400">${esc(ln)}</text>`,
    )
    .join("");
  return nameText + descText;
}

function swimlaneFocusHeadingSvg(hdr: ReturnType<typeof computeSwimlaneFocusHeadingLayout>): string {
  const H = SWIMLANE_FOCUS_HEADING;
  const yName0 = H.padTop + H.nameFirstBaselineDy;
  const nameText = hdr.nameLines
    .map(
      (ln, i) =>
        `<text x="${hdr.textX}" y="${yName0 + i * H.nameLineH}" fill="var(--text)" font-size="16" font-weight="800">${esc(
          ln,
        )}</text>`,
    )
    .join("");
  const descText = hdr.descLines
    .map(
      (ln, i) =>
        `<text x="${hdr.textX}" y="${
          yName0 + hdr.nameLines.length * H.nameLineH + H.nameDescGap + i * H.descLineH
        }" fill="var(--muted)" font-size="12" font-weight="400">${esc(ln)}</text>`,
    )
    .join("");
  return nameText + descText;
}

function computeBlockHeightAliased(
  nameCanon: string,
  descCanon: string,
  blockW: number,
  padX: number,
  padY: number,
  chevron: boolean,
  lookup: PracticeElementAliasLookup,
  nameKind?: string,
  descKind?: string,
): number {
  const { nameMaxChars, descMaxChars } = diagramTextCharLimits(blockW, padX, chevron);
  const nameLineCount = nameKind
    ? layoutDiagramAliasedNameRows(lookup, nameKind, nameCanon, nameMaxChars).length
    : wrapDiagramTextLines(nameCanon, nameMaxChars).length;
  const descLineCount = descKind
    ? layoutDiagramAliasedNameRows(lookup, descKind, descCanon, descMaxChars).length
    : wrapDiagramTextLines(descCanon, descMaxChars).length;
  const nameLineH = 18;
  const descLineH = 16;
  const gap = 8;
  const y0 = padY + 22;
  const bottomPad = 22;
  return y0 + nameLineCount * nameLineH + gap + descLineCount * descLineH + bottomPad;
}

function computeArrowHeightAliased(
  nameCanon: string,
  descCanon: string,
  blockW: number,
  padX: number,
  padY: number,
  lookup: PracticeElementAliasLookup,
  nameKind?: string,
  descKind?: string,
) {
  return Math.max(
    74,
    computeBlockHeightAliased(nameCanon, descCanon, blockW, padX, padY, true, lookup, nameKind, descKind),
  );
}

function renderAliasedDiagramText(
  nameCanon: string,
  descCanon: string,
  blockW: number,
  padX: number,
  padY: number,
  chevron: boolean,
  lookup: PracticeElementAliasLookup,
  nameKind?: string,
  descKind?: string,
  narrativeContextBullets?: string[],
): string {
  const { nameMaxChars, descMaxChars } = diagramTextCharLimits(blockW, padX, chevron);
  const nameLineH = 18;
  const descLineH = 16;
  const gap = 8;
  const x = padX + 12;
  const y0 = padY + 22;
  const nameRows = nameKind
    ? layoutDiagramAliasedNameRows(lookup, nameKind, nameCanon, nameMaxChars)
    : wrapDiagramTextLines(nameCanon, nameMaxChars).map((text) => ({ type: "primary" as const, text }));
  const nameText = nameRows
    .map((row, i) => {
      const y = y0 + i * nameLineH;
      if (row.type === "primary") {
        return `<text x="${x}" y="${y}" fill="var(--text)" font-size="14" font-weight="800">${esc(row.text)}</text>`;
      }
      if (row.type === "primaryWithCanonical") {
        return `<text x="${x}" y="${y}" fill="var(--text)" font-size="14" font-weight="800">${esc(row.primary)}<tspan font-size="12" font-style="italic" font-weight="500" fill="var(--muted)"> (${esc(
          row.canonical,
        )})</tspan></text>`;
      }
      return `<text x="${x}" y="${y}" fill="var(--muted)" font-size="12" font-style="italic" font-weight="500">${esc(row.text)}</text>`;
    })
    .join("");
  const descRows = descKind
    ? layoutDiagramAliasedNameRows(lookup, descKind, descCanon, descMaxChars)
    : wrapDiagramTextLines(descCanon, descMaxChars).map((text) => ({ type: "primary" as const, text }));
  const descY = y0 + nameRows.length * nameLineH + gap;
  const descText = descRows
    .map((row, i) => {
      const y = descY + i * descLineH;
      if (row.type === "primary") {
        return `<text x="${x}" y="${y}" fill="var(--muted)" font-size="12">${esc(row.text)}</text>`;
      }
      if (row.type === "primaryWithCanonical") {
        return `<text x="${x}" y="${y}" fill="var(--muted)" font-size="12">${esc(row.primary)}<tspan font-size="10" font-style="italic" font-weight="500" fill="var(--muted)"> (${esc(
          row.canonical,
        )})</tspan></text>`;
      }
      return `<text x="${x}" y="${y}" fill="var(--muted)" font-size="10" font-style="italic" font-weight="500">${esc(row.text)}</text>`;
    })
    .join("");
  const bullets =
    narrativeContextBullets?.map((s) => String(s ?? "").trim()).filter((s) => s !== "") ?? [];
  if (bullets.length === 0) return nameText + descText;

  const useBullets = bullets.length > 1;
  const narrativeWrapMaxChars = Math.max(
    4,
    useBullets ? descMaxChars - 2 : descMaxChars,
  );
  let yBullet = descY + descRows.length * descLineH + PATTERN_VIEW_MATRIX_NARRATIVE_BULLET_GAP_PX;
  const bulletFragments: string[] = [];
  for (const body of bullets) {
    const wrapped = wrapDiagramTextLines(body, narrativeWrapMaxChars);
    wrapped.forEach((ln, wi) => {
      const prefix = useBullets && wi === 0 ? "• " : useBullets ? "  " : "";
      const txt = `${prefix}${ln}`;
      bulletFragments.push(`<text x="${x}" y="${yBullet}" fill="var(--muted)" font-size="12">${esc(txt)}</text>`);
      yBullet += descLineH;
    });
  }
  return nameText + descText + bulletFragments.join("");
}

export function svgFocusAlphas(args: {
  baseline: PracticeBaseline;
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  theme: ThemeTokens;
}) {
  const { baseline, grouped, theme } = args;

  const laneGap = 14;
  const cardW = 260;
  const cardGap = 12;

  const lanes = (baseline.focuses ?? []).map((f) => {
    const g = grouped.find((x) => x.focusName === f.name);
    const alphas = augmentLaneAlphasWithCrossLaneContributesParents(g?.alphas ?? [], baseline.alphas ?? []);
    return { focus: f, alphas };
  });

  const alphaHeightsByLane = lanes.map((lane) =>
    lane.alphas.map((a: any) => computeBlockHeightForWidth(a.name, practiceElementDescriptionForDisplay(a), cardW, 10, 10)),
  );

  const laneLayoutsProvisional = lanes.map((lane, i) =>
    computeAlphaContributorBelowLayout(lane.alphas, alphaHeightsByLane[i] ?? [], {
      headerH: SWIMLANE_FOCUS_HEADING.minHeight,
      cardW,
      cardGap,
      rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
      bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
    }),
  );

  const width = Math.max(...laneLayoutsProvisional.map((ly) => ly.width), cardGap * 2 + cardW);

  const laneHeaders = lanes.map((lane) => {
    const fd = practiceElementDescriptionForDisplay(lane.focus);
    return computeSwimlaneFocusHeadingLayout(lane.focus.name, fd, width);
  });

  const laneLayouts = lanes.map((lane, i) =>
    computeAlphaContributorBelowLayout(lane.alphas, alphaHeightsByLane[i] ?? [], {
      headerH: laneHeaders[i].headerH,
      cardW,
      cardGap,
      rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
      bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
    }),
  );

  const laneHeights = laneLayouts.map((ly) => Math.max(180, ly.height));
  const laneH = (idx: number) => laneHeights[idx] ?? 180;

  const height = lanes.reduce((sum, _l, i) => sum + laneH(i), 0) + Math.max(0, lanes.length - 1) * laneGap;

  let yCursor = 0;
  const laneSvgs = lanes
    .map((lane, i) => {
      const y0 = yCursor;
      yCursor += laneH(i) + laneGap;
      const laneFill = theme.focusSwimlaneFill[lane.focus.name] ?? theme.panel;

      const ly = laneLayouts[i];
      const cards = lane.alphas
        .map((a: any, idx: number) => {
          const x = ly.x[idx] ?? cardGap;
          const y = ly.y[idx] ?? laneHeaders[i].headerH;
          const h = alphaHeightsByLane[i]?.[idx] ?? 96;
          return `
          <g transform="translate(${x},${y})">
            <rect x="0" y="0" width="${cardW}" height="${h}" rx="14" ry="14" fill="rgba(0,0,0,0.18)" stroke="var(--border)"/>
            ${renderWrappedText(a.name, practiceElementDescriptionForDisplay(a), cardW, 10, 10)}
          </g>`;
        })
        .join("");

      const edges = alphaContributesToEdges(lane.alphas);
      const geoms = lane.alphas.map((_: any, idx: number) =>
        alphaCardGeomAt(ly.x[idx] ?? 0, ly.y[idx] ?? laneHeaders[i].headerH, alphaHeightsByLane[i]?.[idx] ?? 96, cardW),
      );
      const markerId = `alpha-contrib-lane-${i}`;
      const edgeSvg =
        edges.length === 0
          ? ""
          : `<defs>
          <marker id="${markerId}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 9 4.5 L 0 9 z" fill="var(--accent)" />
          </marker>
        </defs>
        <g fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.92">
          ${edges
            .map(({ child, parent }, ei) => {
              const d = contributeEdgePathD(geoms[child], geoms[parent], ei);
              return `<path d="${d}" marker-end="url(#${markerId})"/>`;
            })
            .join("")}
        </g>`;

      const header = swimlaneFocusHeadingSvg(laneHeaders[i]);

      return `
      <g transform="translate(0,${y0})">
        <rect x="0" y="0" width="${width}" height="${laneH(i)}" fill="${esc(laneFill)}"/>
        <rect x="0" y="0" width="${width}" height="${laneH(i)}" fill="none" stroke="var(--border)"/>
        ${header}
        ${cards}
        ${edgeSvg}
      </g>`;
    })
    .join("");

  return `<svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">
    ${laneSvgs}
  </svg>`;
}

type GroupedByFocus = {
  focusName: string;
  focus: any;
  alphas: any[];
  activitySpaces: any[];
};

function isActivitySpaceNodeFlatActivity(s: any): boolean {
  return s && "activitySpaceName" in s && String((s as any).activitySpaceName ?? "").trim() !== "";
}

function buildActivitiesByParentMap(baseline: PracticeBaseline) {
  const allSpaces = (baseline.activitySpaces ?? []) as any[];
  const spaces = allSpaces.filter((s) => !isActivitySpaceNodeFlatActivity(s));
  const activitiesByParent = new Map<string, any[]>();
  for (const s of spaces) {
    activitiesByParent.set(String(s.name), [...(s.activities ?? [])]);
  }
  for (const s of allSpaces) {
    if (!isActivitySpaceNodeFlatActivity(s)) continue;
    const parent = String((s as any).activitySpaceName).trim();
    if (!activitiesByParent.has(parent)) activitiesByParent.set(parent, []);
    activitiesByParent.get(parent)!.push(s);
  }
  return activitiesByParent;
}

/** One focus lane for PDF text section (same layout as {@link svgFocusAlphas} lane). */
export function svgFocusAlphasForGroup(
  baseline: PracticeBaseline,
  g: GroupedByFocus,
  theme: ThemeTokens,
  opts: { focusLabel?: string; aliasLookup?: PracticeElementAliasLookup } = {},
): string {
  const lookup = opts.aliasLookup ?? EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP;
  const cardW = 260;
  const cardGap = 12;

  const focus =
    (baseline.focuses ?? []).find((f) => f.name === g.focusName) ?? ({ name: g.focusName, description: "" } as any);
  const implicit = Boolean(opts.focusLabel && opts.focusLabel !== focus.name);
  const fd = practiceElementDescriptionForDisplay(focus);
  const alphas = augmentLaneAlphasWithCrossLaneContributesParents(g.alphas ?? [], baseline.alphas ?? []);
  const alphaHeights = alphas.map((a: any) =>
    computeBlockHeightAliased(
      String(a.name ?? ""),
      practiceElementDescriptionForDisplay(a),
      cardW,
      10,
      10,
      false,
      lookup,
      "Alpha",
    ),
  );
  const layoutProvisional = computeAlphaContributorBelowLayout(alphas, alphaHeights, {
    headerH: SWIMLANE_FOCUS_HEADING.minHeight,
    cardW,
    cardGap,
    rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
    bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
  });
  const laneWidth = layoutProvisional.width;
  const headingPlain = implicit
    ? computeSwimlaneFocusHeadingLayout(String(opts.focusLabel ?? focus.name), fd, laneWidth)
    : null;
  const headingAliased = !implicit
    ? computeSwimlaneFocusHeadingLayoutAliased(lookup, "Focus", focus.name, fd, laneWidth)
    : null;
  const headerH = (headingPlain ?? headingAliased)!.headerH;
  const layout = computeAlphaContributorBelowLayout(alphas, alphaHeights, {
    headerH,
    cardW,
    cardGap,
    rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
    bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
  });
  const contribEdges = alphaContributesToEdges(alphas);
  const width = layout.width;
  const height = Math.max(180, layout.height);
  const laneFill = theme.focusSwimlaneFill[focus.name] ?? theme.panel;

  const geoms = alphas.map((_: any, idx: number) =>
    alphaCardGeomAt(layout.x[idx] ?? 0, layout.y[idx] ?? headerH, alphaHeights[idx] ?? 96, cardW),
  );
  const markerId = `alpha-contrib-${markerIdFragment(g.focusName)}-${alphas.length}`;

  const cards = alphas
    .map((a: any, idx: number) => {
      const x = layout.x[idx] ?? cardGap;
      const y = layout.y[idx] ?? headerH;
      const h = alphaHeights[idx] ?? 96;
      return `
          <g transform="translate(${x},${y})">
            <rect x="0" y="0" width="${cardW}" height="${h}" rx="14" ry="14" fill="rgba(0,0,0,0.18)" stroke="var(--border)"/>
            ${renderAliasedDiagramText(
              String(a.name ?? ""),
              practiceElementDescriptionForDisplay(a),
              cardW,
              10,
              10,
              false,
              lookup,
              "Alpha",
            )}
          </g>`;
    })
    .join("");

  const edgeSvg =
    contribEdges.length === 0
      ? ""
      : `<defs>
          <marker id="${markerId}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 9 4.5 L 0 9 z" fill="var(--accent)" />
          </marker>
        </defs>
        <g fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.92">
          ${contribEdges
            .map(({ child, parent }, ei) => {
              const d = contributeEdgePathD(geoms[child], geoms[parent], ei);
              return `<path d="${d}" marker-end="url(#${markerId})"/>`;
            })
            .join("")}
        </g>`;

  const header = headingPlain ? swimlaneFocusHeadingSvg(headingPlain) : swimlaneFocusHeadingSvgAliased(headingAliased!);

  const inner = `
      <g transform="translate(0,0)">
        ${header}
        ${cards}
        ${edgeSvg}
      </g>`;

  return `<div style="margin:10px 0 14px;border:1px solid rgba(2,6,23,0.14);border-radius:10px;background:${esc(
    laneFill,
  )}">
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg" style="display:block;border:none;border-radius:0;max-width:${width}px">
      ${inner}
    </svg>
  </div>`;
}

/** One focus lane for PDF activity section (same layout as {@link svgFocusActivity} lane). */
export function svgFocusActivityForGroup(
  baseline: PracticeBaseline,
  g: GroupedByFocus,
  theme: ThemeTokens,
  opts: { focusLabel?: string; aliasLookup?: PracticeElementAliasLookup } = {},
): string {
  const lookup = opts.aliasLookup ?? EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP;
  const activitiesByParent = buildActivitiesByParentMap(baseline);
  const focus =
    (baseline.focuses ?? []).find((f) => f.name === g.focusName) ?? ({ name: g.focusName, description: "" } as any);
  const implicit = Boolean(opts.focusLabel && opts.focusLabel !== focus.name);
  const laneSpaces = (g.activitySpaces ?? []).filter((s: any) => !isActivitySpaceNodeFlatActivity(s));

  const arrowW = 260;
  const arrowGap = 14;
  const maxArrows = Math.max(1, laneSpaces.length);
  const width = maxArrows * (arrowW + arrowGap) + arrowGap;
  const fad = practiceElementDescriptionForDisplay(focus);
  const headingPlain = implicit
    ? computeSwimlaneFocusHeadingLayout(String(opts.focusLabel ?? focus.name), fad, width)
    : null;
  const headingAliased = !implicit
    ? computeSwimlaneFocusHeadingLayoutAliased(lookup, "Focus", focus.name, fad, width)
    : null;
  const headerH = (headingPlain ?? headingAliased)!.headerH;

  let maxColumn = headerH + 10;
  for (const s of laneSpaces) {
    const sH = computeArrowHeightAliased(
      String(s.name ?? ""),
      practiceElementDescriptionForDisplay(s),
      arrowW,
      10,
      10,
      lookup,
      "ActivitySpace",
    );
    const kids = (activitiesByParent.get(s.name) ?? []) as any[];
    const kidHeights = kids.map((a) =>
      computeArrowHeightAliased(String(a.name ?? ""), practiceElementDescriptionForDisplay(a), arrowW, 10, 10, lookup, "Activity"),
    );
    const total = headerH + sH + 14 + kidHeights.reduce((sum, h) => sum + h + 10, 0) + 18;
    maxColumn = Math.max(maxColumn, total);
  }
  const laneH = Math.max(200, maxColumn);
  const height = laneH;
  const laneFill = theme.focusSwimlaneFill[focus.name] ?? theme.panel;

  const header = headingPlain ? swimlaneFocusHeadingSvg(headingPlain) : swimlaneFocusHeadingSvgAliased(headingAliased!);

  const blocks = laneSpaces
    .map((s: any, idx: number) => {
      const x = arrowGap + idx * (arrowW + arrowGap);
      const y = headerH;
      const kids = (activitiesByParent.get(s.name) ?? [])
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      const sH = computeArrowHeightAliased(
        String(s.name ?? ""),
        practiceElementDescriptionForDisplay(s),
        arrowW,
        10,
        10,
        lookup,
        "ActivitySpace",
      );

      const parentPoly = arrowPolygon(arrowW, sH);
      const parent = `
            <polygon points="${parentPoly}" fill="rgba(0,0,0,0.18)" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="6 6"/>
            ${renderAliasedDiagramText(
              String(s.name ?? ""),
              practiceElementDescriptionForDisplay(s),
              arrowW,
              10,
              10,
              true,
              lookup,
              "ActivitySpace",
            )}
          `;

      let kidY = sH + 14;
      const kidsSvg = kids
        .map((a: any) => {
          const aH = computeArrowHeightAliased(
            String(a.name ?? ""),
            practiceElementDescriptionForDisplay(a),
            arrowW,
            10,
            10,
            lookup,
            "Activity",
          );
          const poly = arrowPolygon(arrowW, aH);
          const out = `
                <g transform="translate(0,${kidY})">
                  <polygon points="${poly}" fill="rgba(0,0,0,0.18)" stroke="var(--border)" stroke-width="1.5"/>
                  ${renderAliasedDiagramText(
                    String(a.name ?? ""),
                    practiceElementDescriptionForDisplay(a),
                    arrowW,
                    10,
                    10,
                    true,
                    lookup,
                    "Activity",
                  )}
                </g>`;
          kidY += aH + 10;
          return out;
        })
        .join("");

      return `<g transform="translate(${x},${y})">${parent}${kidsSvg}</g>`;
    })
    .join("");

  const inner = `
      <g transform="translate(0,0)">
        ${header}
        ${blocks}
      </g>`;

  return `<div style="margin:10px 0 14px;border:1px solid rgba(2,6,23,0.14);border-radius:10px;background:${esc(
    laneFill,
  )}">
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg" style="display:block;border:none;border-radius:0;max-width:${width}px">
      ${inner}
    </svg>
  </div>`;
}

function arrowPolygon(width: number, height: number) {
  const notch = Math.min(42, Math.floor(width * 0.18));
  return [`0,0`, `${width - notch},0`, `${width},${height / 2}`, `${width - notch},${height}`, `0,${height}`].join(" ");
}

export function svgFocusActivity(args: {
  baseline: PracticeBaseline;
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  theme: ThemeTokens;
}) {
  const { baseline, grouped, theme } = args;

  const allSpaces = (baseline.activitySpaces ?? []) as any[];
  const spaces = allSpaces.filter((s) => !("activitySpaceName" in s && String((s as any).activitySpaceName ?? "").trim()));
  const activitiesByParent = new Map<string, any[]>();
  for (const s of spaces) {
    activitiesByParent.set(String(s.name), [...(s.activities ?? [])]);
  }
  for (const s of allSpaces) {
    if (!("activitySpaceName" in s) || !String((s as any).activitySpaceName ?? "").trim()) continue;
    const parent = String((s as any).activitySpaceName).trim();
    if (!activitiesByParent.has(parent)) activitiesByParent.set(parent, []);
    activitiesByParent.get(parent)!.push(s);
  }

  const laneGap = 14;
  const arrowW = 260;
  const arrowGap = 14;

  const lanes = (baseline.focuses ?? []).map((f) => {
    const laneSpaces = spaces.filter((s: any) => s.focusName === f.name);
    return { focus: f, spaces: laneSpaces };
  });

  const maxArrows = Math.max(1, ...lanes.map((l) => l.spaces.length));
  const width = maxArrows * (arrowW + arrowGap) + arrowGap;

  const laneHeaders = lanes.map((lane) =>
    computeSwimlaneFocusHeadingLayout(lane.focus.name, practiceElementDescriptionForDisplay(lane.focus), width),
  );

  const laneHeights = lanes.map((lane, i) => {
    const headerH = laneHeaders[i].headerH;
    let maxColumn = headerH + 10;
    for (const s of lane.spaces) {
      const sH = computeArrowHeightForWidth(s.name, practiceElementDescriptionForDisplay(s), arrowW, 10, 10);
      const kids = (activitiesByParent.get(s.name) ?? []) as any[];
      const kidHeights = kids.map((a) => computeArrowHeightForWidth(a.name, practiceElementDescriptionForDisplay(a), arrowW, 10, 10));
      const total = headerH + sH + 14 + kidHeights.reduce((sum, h) => sum + h + 10, 0) + 18;
      maxColumn = Math.max(maxColumn, total);
    }
    return Math.max(200, maxColumn);
  });
  const laneH = (idx: number) => laneHeights[idx] ?? 220;

  const height = lanes.reduce((sum, _l, i) => sum + laneH(i), 0) + Math.max(0, lanes.length - 1) * laneGap;

  let yCursor = 0;
  const laneSvgs = lanes
    .map((lane, i) => {
      const y0 = yCursor;
      yCursor += laneH(i) + laneGap;
      const laneFill = theme.focusSwimlaneFill[lane.focus.name] ?? theme.panel;

      const header = swimlaneFocusHeadingSvg(laneHeaders[i]);

      const blocks = lane.spaces
        .map((s: any, idx: number) => {
          const x = arrowGap + idx * (arrowW + arrowGap);
          const y = laneHeaders[i].headerH;
          const kids = (activitiesByParent.get(s.name) ?? [])
            .slice()
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
          const sH = computeArrowHeightForWidth(s.name, practiceElementDescriptionForDisplay(s), arrowW, 10, 10);

          const parentPoly = arrowPolygon(arrowW, sH);
          const parent = `
            <polygon points="${parentPoly}" fill="rgba(0,0,0,0.18)" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="6 6"/>
            ${renderWrappedText(s.name, practiceElementDescriptionForDisplay(s), arrowW, 10, 10, true)}
          `;

          let kidY = sH + 14;
          const kidsSvg = kids
            .map((a: any) => {
              const aH = computeArrowHeightForWidth(a.name, practiceElementDescriptionForDisplay(a), arrowW, 10, 10);
              const poly = arrowPolygon(arrowW, aH);
              const out = `
                <g transform="translate(0,${kidY})">
                  <polygon points="${poly}" fill="rgba(0,0,0,0.18)" stroke="var(--border)" stroke-width="1.5"/>
                  ${renderWrappedText(a.name, practiceElementDescriptionForDisplay(a), arrowW, 10, 10, true)}
                </g>`;
              kidY += aH + 10;
              return out;
            })
            .join("");

          return `<g transform="translate(${x},${y})">${parent}${kidsSvg}</g>`;
        })
        .join("");

      return `
      <g transform="translate(0,${y0})">
        <rect x="0" y="0" width="${width}" height="${laneH(i)}" fill="${esc(laneFill)}"/>
        <rect x="0" y="0" width="${width}" height="${laneH(i)}" fill="none" stroke="var(--border)"/>
        ${header}
        ${blocks}
      </g>`;
    })
    .join("");

  return `<svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">
    ${laneSvgs}
  </svg>`;
}

/** Matrix: one row per baseline alpha × pattern views (columns); PDF renders all lanes expanded. */
export function svgPatternMatrix(args: {
  pattern: any;
  baseline: PracticeBaseline;
  theme: ThemeTokens;
  laneLabels: PatternMatrixLaneLabels;
  aliasLookup?: PracticeElementAliasLookup;
}): string {
  const { pattern, baseline, theme, laneLabels, aliasLookup } = args;
  const lookup = aliasLookup ?? EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP;
  const rowAlphas = buildPatternMatrixAlphaRows(baseline);
  const { views, cellBlocks } = buildPatternMatrixCells(pattern?.patternViews, baseline, rowAlphas, laneLabels);
  if (!views.length || !rowAlphas.length) return "";

  const labelColW = 200;
  const colW = 240;
  const chipGapPx = 8;
  const cellPad = 10;
  const blockGap = 8;
  const blockStackGap = 8;
  const layout = computePatternMatrixLayout(views, cellBlocks, {
    labelColW,
    colW,
    headerTopPad: 18,
    cellPadding: cellPad,
    chipGap: chipGapPx,
    minRowH: 56,
    blockGap,
    blockStackGap,
    lanesExpanded: () => true,
    measureName: (k, n) => diagramMeasureName(lookup, k, n),
    aliasLookup: lookup,
  });
  const { width, height, headerH, rowHeights, chipInnerW } = layout;
  const nC = views.length;
  const nR = rowAlphas.length;

  const headerBand = `<rect x="0" y="0" width="${width}" height="${headerH}" fill="rgba(0,0,0,0.06)" stroke="var(--border)" stroke-width="1"/>`;
  const corner = `<rect x="0" y="0" width="${labelColW}" height="${headerH}" fill="rgba(0,0,0,0.04)" stroke="var(--border)" stroke-width="1"/>`;

  const columnHeaders = views
    .map((pv: any, j: number) => {
      const x0 = labelColW + j * colW;
      const desc = practiceElementDescriptionForDisplay(pv);
      return `<g transform="translate(${x0}, 0)">${renderAliasedDiagramText(
        String(pv.name ?? ""),
        desc,
        colW - 16,
        8,
        8,
        false,
        lookup,
        "PatternView",
        undefined,
        patternViewNarrativeContextProseTexts(pv),
      )}</g>`;
    })
    .join("");

  let rowY = headerH;
  const rowBlocks: string[] = [];
  const labelMaxChars = Math.max(8, Math.floor((labelColW - 20) / 7));
  for (let ri = 0; ri < nR; ri++) {
    const rowH = rowHeights[ri] ?? 56;
    const alphaRowName = rowAlphas[ri];
    const focusAlpha =
      baseline.alphas?.find((a: { name?: string }) => String(a?.name ?? "").trim() === alphaRowName.trim()) ?? null;
    const focusNm = String((focusAlpha as { focusName?: string } | null)?.focusName ?? "").trim();
    const laneFill = theme.focusSwimlaneFill[focusNm] ?? theme.panel;
    rowBlocks.push(`<rect x="0" y="${rowY}" width="${width}" height="${rowH}" fill="${esc(laneFill)}" stroke="none"/>`);

    const alphaDisp = getAliasedDisplay(lookup, "Alpha", alphaRowName);
    const labelLines = wrapLines(alphaDisp.primary, labelMaxChars);
    const labelSuffix = alphaDisp.showCanonical ? alphaDisp.canonical : null;
    const labelLineH = 16;
    const labelStartY = rowY + Math.max(12, (rowH - labelLines.length * labelLineH) / 2);
    const nLab = labelLines.length;
    const labelSvg = labelLines
      .map((ln: string, i: number) => {
        const base = `<text x="12" y="${labelStartY + i * labelLineH}" fill="var(--text)" font-size="14" font-weight="800">${esc(ln)}`;
        if (labelSuffix && i === nLab - 1) {
          return `${base}<tspan font-size="12" font-style="italic" font-weight="500" fill="var(--muted)"> (${esc(labelSuffix)})</tspan></text>`;
        }
        return `${base}</text>`;
      })
      .join("");

    const cellsSvg: string[] = [labelSvg];
    for (let cj = 0; cj < nC; cj++) {
      const x0 = labelColW + cj * colW;
      const blocks = cellBlocks[ri][cj];
      let cy = rowY + cellPad;
      blocks.forEach((b, bk) => {
        const chipW = chipInnerW + 8;
        const derivedPrimary = patternMatrixSliceChipPrimaryJoined(b);
        const stateMeasured = diagramMeasureName(lookup, "State", b.stateName);
        const chipH = derivedPrimary
          ? computeBlockHeightForWidth(derivedPrimary, stateMeasured, chipW, 8, 8, false)
          : computeBlockHeightAliased(b.alphaName, b.stateName, chipW, 8, 8, false, lookup, "Alpha", "State");
        cellsSvg.push(`<g transform="translate(${x0 + 12}, ${cy})">
            <rect x="0" y="0" width="${chipW}" height="${chipH}" rx="12" ry="12" fill="rgba(0,0,0,0.18)" stroke="var(--border)"/>
            ${
              derivedPrimary
                ? renderAliasedDiagramText(
                    derivedPrimary,
                    b.stateName,
                    chipW,
                    8,
                    8,
                    false,
                    lookup,
                    undefined,
                    "State",
                  )
                : renderAliasedDiagramText(b.alphaName, b.stateName, chipW, 8, 8, false, lookup, "Alpha", "State")
            }
          </g>`);
        cy += chipH;

        const lanes = b.lanes;
        if (lanes.length > 0) {
          cy += blockGap;
          lanes.forEach((lane, lk) => {
            const laneKind = lane.kind === "activitySpace" ? "ActivitySpace" : "Activity";
            const laneCh = computeArrowHeightAliased(lane.laneName, lane.secondary, chipW, 8, 8, lookup, laneKind);
            const poly = arrowPolygon(chipW, laneCh);
            const dash = lane.kind === "activitySpace" ? ` stroke-dasharray="6 6"` : "";
            cellsSvg.push(`<g transform="translate(${x0 + 12}, ${cy})">
            <polygon points="${poly}" fill="rgba(0,0,0,0.18)" stroke="var(--border)" stroke-width="1.5"${dash}/>
            ${renderAliasedDiagramText(lane.laneName, lane.secondary, chipW, 8, 8, true, lookup, laneKind)}
          </g>`);
            cy += laneCh;
            if (lk < lanes.length - 1) cy += chipGapPx;
          });
        }

        if (bk < blocks.length - 1) cy += blockStackGap;
      });
    }
    rowBlocks.push(cellsSvg.join(""));
    rowY += rowH;
  }

  const vLines: string[] = [];
  for (let j = 0; j <= nC; j++) {
    const x = labelColW + j * colW;
    vLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="var(--border)" stroke-width="1"/>`);
  }

  const hLines: string[] = [];
  let hy = headerH;
  hLines.push(`<line x1="0" y1="${hy}" x2="${width}" y2="${hy}" stroke="var(--border)" stroke-width="1"/>`);
  for (let ri = 0; ri < nR; ri++) {
    hy += rowHeights[ri] ?? 56;
    hLines.push(`<line x1="0" y1="${hy}" x2="${width}" y2="${hy}" stroke="var(--border)" stroke-width="1"/>`);
  }

  const inner = `
    ${headerBand}
    ${corner}
    ${columnHeaders}
    ${rowBlocks.join("")}
    ${vLines.join("")}
    ${hLines.join("")}
  `;

  return `<div style="margin:12px 0 14px;border:1px solid rgba(2,6,23,0.14);border-radius:10px;background:${esc(theme.panel)}">
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg" style="display:block;border:none;border-radius:0;max-width:${width}px">
      <g>${inner}</g>
    </svg>
  </div>`;
}

/**
 * Generate SVG for Kanban pattern board showing swim lane progression
 */
export function svgKanbanPattern(opts: {
  pattern: any;
  baseline: PracticeBaseline;
  theme: ThemeTokens;
  aliasLookup?: PracticeElementAliasLookup;
}): string {
  const { pattern, baseline, theme, aliasLookup = EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP } = opts;

  const columns = extractKanbanPatternData(pattern, baseline);
  const alphaSwimLanes = buildAlphaSwimLanes(columns);
  const workProductSwimLanes = buildWorkProductSwimLanes(columns);

  if (columns.length === 0) {
    return "";
  }

  // Layout constants
  const HEADER_HEIGHT = 60;
  const ROW_HEIGHT = 50;
  const ACTIVITY_ROW_HEIGHT = 35;
  const COL_WIDTH = 180;
  const ROW_LABEL_WIDTH = 160;
  const LABEL_PADDING = 8;
  const SECTION_GAP = 20;
  const TILE_RADIUS = 3;

  // Colors matching the component
  const PURPLE = "#8B4DAD";
  const GREEN = "#3E8635";
  const ORANGE = "#EC7A08";
  const YELLOW = "#F0AB00";
  const BLUE = "#06C";
  const WHITE = "#FFFFFF";
  const BORDER = theme.border;
  const PANEL = theme.panel;

  const totalColumns = columns.length;
  const width = ROW_LABEL_WIDTH + totalColumns * COL_WIDTH;

  // Calculate heights for each section
  const alphaRowsHeight = alphaSwimLanes.length * ROW_HEIGHT;
  const workProductRowsHeight = workProductSwimLanes.length * ROW_HEIGHT;

  // Calculate max activities per column for activity section height
  const maxActivitiesInColumn = Math.max(...columns.map(col => col.activityCards.length), 1);
  const activitiesHeight = maxActivitiesInColumn * ACTIVITY_ROW_HEIGHT + 40;

  const height =
    HEADER_HEIGHT +
    alphaRowsHeight +
    SECTION_GAP +
    (workProductSwimLanes.length > 0 ? workProductRowsHeight + SECTION_GAP : 0) +
    activitiesHeight;

  let yOffset = 0;

  // Helper to wrap text
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length <= maxChars) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word.length > maxChars ? word.slice(0, maxChars - 1) + "…" : word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  // Helper to render a colored tile with wrapped text
  const renderTile = (
    text: string,
    x: number,
    y: number,
    color: string,
    maxWidth: number,
    maxChars: number
  ): string => {
    const lines = wrapText(text, maxChars);
    const lineHeight = 14;
    const tileHeight = lines.length * lineHeight + LABEL_PADDING * 2;

    const tileLines = lines
      .map((line, i) => {
        return `<text x="${x + maxWidth / 2}" y="${y + LABEL_PADDING + lineHeight * (i + 1) - 2}" fill="${WHITE}" font-size="12" font-weight="600" text-anchor="middle">${esc(line)}</text>`;
      })
      .join("");

    return `
      <rect x="${x}" y="${y}" width="${maxWidth}" height="${tileHeight}" fill="${color}" rx="${TILE_RADIUS}" />
      ${tileLines}
    `;
  };

  let svg = "";

  // Column Headers
  svg += `<rect x="0" y="${yOffset}" width="${width}" height="${HEADER_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" stroke-width="2" />`;
  svg += `<text x="10" y="${yOffset + 25}" fill="${theme.text}" font-size="14" font-weight="700">Alpha</text>`;

  columns.forEach((col, idx) => {
    const x = ROW_LABEL_WIDTH + idx * COL_WIDTH;
    svg += `<rect x="${x}" y="${yOffset}" width="${COL_WIDTH}" height="${HEADER_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" />`;

    const headerLines = wrapText(col.name, 18);
    headerLines.forEach((line, i) => {
      svg += `<text x="${x + COL_WIDTH / 2}" y="${yOffset + 20 + i * 14}" fill="${theme.text}" font-size="13" font-weight="700" text-anchor="middle">${esc(line)}</text>`;
    });

    svg += `<text x="${x + COL_WIDTH - 10}" y="${yOffset + 20}" fill="${theme.muted}" font-size="10" text-anchor="end">#${col.seq}</text>`;
  });

  yOffset += HEADER_HEIGHT;

  // Alpha Swim Lanes
  alphaSwimLanes.forEach((lane, rowIdx) => {
    const rowY = yOffset + rowIdx * ROW_HEIGHT;

    // Row label
    svg += `<rect x="0" y="${rowY}" width="${ROW_LABEL_WIDTH}" height="${ROW_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" stroke-width="2" />`;
    svg += renderTile(lane.alphaName, 5, rowY + 10, PURPLE, ROW_LABEL_WIDTH - 10, 20);

    // State cells
    lane.stateByColumn.forEach((card, colIdx) => {
      const cellX = ROW_LABEL_WIDTH + colIdx * COL_WIDTH;
      svg += `<rect x="${cellX}" y="${rowY}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" />`;

      if (card) {
        const isInstance = card.type === "alphaInstance";
        const displayText = isInstance ? card.name : (card.subtitle || "");
        const color = isInstance ? GREEN : PURPLE;
        svg += renderTile(displayText, cellX + 10, rowY + 10, color, COL_WIDTH - 20, 16);
      }
    });
  });

  yOffset += alphaRowsHeight + SECTION_GAP;

  // Work Product Swim Lanes
  if (workProductSwimLanes.length > 0) {
    workProductSwimLanes.forEach((lane, rowIdx) => {
      const rowY = yOffset + rowIdx * ROW_HEIGHT;

      // Row label
      svg += `<rect x="0" y="${rowY}" width="${ROW_LABEL_WIDTH}" height="${ROW_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" stroke-width="2" />`;
      svg += renderTile(lane.workProductName, 5, rowY + 10, ORANGE, ROW_LABEL_WIDTH - 10, 20);

      // Level cells
      lane.levelByColumn.forEach((card, colIdx) => {
        const cellX = ROW_LABEL_WIDTH + colIdx * COL_WIDTH;
        svg += `<rect x="${cellX}" y="${rowY}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="${PANEL}" stroke="${BORDER}" />`;

        if (card) {
          const isInstance = card.metadata?.isInstance === true;
          const displayText = isInstance ? card.name : (card.subtitle || "");
          const color = isInstance ? YELLOW : ORANGE;
          svg += renderTile(displayText, cellX + 10, rowY + 10, color, COL_WIDTH - 20, 16);
        }
      });
    });

    yOffset += workProductRowsHeight + SECTION_GAP;
  }

  // Activities Section Header
  svg += `<rect x="0" y="${yOffset}" width="${ROW_LABEL_WIDTH}" height="30" fill="${PANEL}" stroke="${BORDER}" stroke-width="2" />`;
  svg += `<text x="10" y="${yOffset + 20}" fill="${theme.text}" font-size="13" font-weight="700">Activities</text>`;

  columns.forEach((col, idx) => {
    const x = ROW_LABEL_WIDTH + idx * COL_WIDTH;
    svg += `<rect x="${x}" y="${yOffset}" width="${COL_WIDTH}" height="30" fill="${PANEL}" stroke="${BORDER}" />`;
  });

  yOffset += 30;

  // Activities
  columns.forEach((col, colIdx) => {
    const cellX = ROW_LABEL_WIDTH + colIdx * COL_WIDTH;

    // Draw column background first
    svg += `<rect x="${cellX}" y="${yOffset}" width="${COL_WIDTH}" height="${activitiesHeight - 30}" fill="${PANEL}" stroke="${BORDER}" />`;

    let activityY = yOffset + 5;
    col.activityCards.forEach((card) => {
      svg += renderTile(card.name, cellX + 10, activityY, BLUE, COL_WIDTH - 20, 18);
      activityY += ACTIVITY_ROW_HEIGHT;
    });
  });

  return `<div style="margin:12px 0 14px;border:1px solid ${esc(BORDER)};border-radius:10px;background:${esc(PANEL)}">
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg" style="display:block;border:none;border-radius:0;max-width:${width}px">
      <g>${svg}</g>
    </svg>
  </div>`;
}
