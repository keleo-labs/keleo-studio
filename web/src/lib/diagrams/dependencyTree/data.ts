import type { LibraryLookupIndex } from "@/lib/library/practiceDependencyResolution";
import { findPracticeInLibrary, findBaselineInLibrary } from "@/lib/library/practiceDependencyResolution";
import { classifyLibraryRoot } from "@/lib/library/classify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DependencyNodeKind = "practice" | "baselinePractice" | "root";

export type DependencyNode = {
  name: string;
  kind: DependencyNodeKind;
  baselineName: string | null;
  version: string | null;
  children: DependencyNode[];
};

export type DependencyCrossEdge = {
  fromName: string;
  toName: string;
};

export type DependencyTreeData = {
  root: DependencyNode;
  baselineNames: string[];
  crossEdges: DependencyCrossEdge[];
};

export type LayoutNode = {
  name: string;
  kind: DependencyNodeKind;
  baselineName: string | null;
  version: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EdgeDirection = "right" | "left" | "top" | "bottom";

export type LayoutEdge = {
  fromName: string;
  toName: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  exitDir: EdgeDirection;
  entryDir: EdgeDirection;
};

export type LayoutGroup = {
  baselineName: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DependencyDiagramLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  groups: LayoutGroup[];
  viewBoxWidth: number;
  viewBoxHeight: number;
};

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

function buildPracticeNode(
  name: string,
  index: LibraryLookupIndex,
  visited: Set<string>,
  crossEdges: DependencyCrossEdge[],
): DependencyNode | null {
  const n = name.trim();
  if (!n || visited.has(n)) return null;
  visited.add(n);

  const practice = findPracticeInLibrary(index, n);
  const node: DependencyNode = {
    name: n,
    kind: "practice",
    baselineName: practice?.baselinePracticeName ?? null,
    version: practice?.version ?? null,
    children: [],
  };

  if (practice) {
    const deps = (practice as any).practiceDependencyNames;
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        const depName = String(dep).trim();
        if (!depName) continue;
        if (visited.has(depName)) {
          crossEdges.push({ fromName: n, toName: depName });
        } else {
          const child = buildPracticeNode(depName, index, visited, crossEdges);
          if (child) node.children.push(child);
        }
      }
    }
  }

  return node;
}

function buildBaselineNode(
  name: string,
  index: LibraryLookupIndex,
  visited: Set<string>,
): DependencyNode | null {
  const n = name.trim();
  if (!n || visited.has(n)) return null;
  visited.add(n);

  const fromBaseline = findBaselineInLibrary(index, n);
  const fromPractice = findPracticeInLibrary(index, n);
  const baseline = fromBaseline ?? fromPractice;
  const node: DependencyNode = {
    name: n,
    kind: "baselinePractice",
    baselineName: n,
    version: (fromBaseline as any)?.version ?? (fromPractice as any)?.version ?? null,
    children: [],
  };

  if (baseline) {
    const deps = (baseline as any).baselinePracticeNames;
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        const child = buildBaselineNode(String(dep), index, visited);
        if (child) node.children.push(child);
      }
    }
    // Check both baseline and practice copies for the parent chain —
    // method-embedded baselines are often stripped of baselinePracticeName.
    const parentName =
      (typeof (fromBaseline as any)?.baselinePracticeName === "string" ? ((fromBaseline as any).baselinePracticeName as string).trim() : "") ||
      (typeof (fromPractice as any)?.baselinePracticeName === "string" ? ((fromPractice as any).baselinePracticeName as string).trim() : "");
    if (parentName) {
      const child = buildBaselineNode(parentName, index, visited);
      if (child) node.children.push(child);
    }
  }

  return node;
}

export function buildDependencyTree(
  doc: Record<string, unknown>,
  index: LibraryLookupIndex,
): DependencyTreeData {
  const kind = classifyLibraryRoot(doc);
  const visited = new Set<string>();
  const crossEdges: DependencyCrossEdge[] = [];
  const rootName = String(doc.name ?? "");
  visited.add(rootName);

  const rootVersion = typeof doc.version === "string" ? doc.version : null;
  const root: DependencyNode = {
    name: rootName,
    kind: "root",
    baselineName: null,
    version: rootVersion,
    children: [],
  };

  if (kind === "practice") {
    const blName = typeof doc.baselinePracticeName === "string" ? doc.baselinePracticeName.trim() : "";
    root.baselineName = blName || null;

    if (blName) {
      const blNode = buildBaselineNode(blName, index, visited);
      if (blNode) root.children.push(blNode);
    }

    const deps = doc.practiceDependencyNames;
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        const child = buildPracticeNode(String(dep), index, visited, crossEdges);
        if (child) root.children.push(child);
      }
    }
  } else if (kind === "method") {
    const blName =
      typeof doc.baselinePracticeName === "string"
        ? doc.baselinePracticeName.trim()
        : typeof (doc.baselinePractice as any)?.name === "string"
          ? ((doc.baselinePractice as any).name as string).trim()
          : "";
    root.baselineName = blName || null;

    if (blName) {
      const blNode = buildBaselineNode(blName, index, visited);
      if (blNode) root.children.push(blNode);
    }

    const practices: string[] = [];
    if (Array.isArray(doc.practices)) {
      for (const p of doc.practices) {
        const pn = typeof p === "object" && p ? String((p as any).name ?? "") : String(p);
        if (pn.trim()) practices.push(pn.trim());
      }
    } else if (Array.isArray(doc.practiceNames)) {
      for (const pn of doc.practiceNames) {
        const s = String(pn).trim();
        if (s) practices.push(s);
      }
    }
    for (const pn of practices) {
      const child = buildPracticeNode(pn, index, visited, crossEdges);
      if (child) root.children.push(child);
    }
  } else if (kind === "baselinePractice") {
    root.kind = "baselinePractice";
    root.baselineName = rootName;

    const deps = doc.baselinePracticeNames;
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        const child = buildBaselineNode(String(dep), index, visited);
        if (child) root.children.push(child);
      }
    }

    // Also check singular baselinePracticeName (baseline extending another baseline)
    const parentBlName = typeof doc.baselinePracticeName === "string" ? String(doc.baselinePracticeName).trim() : "";
    if (parentBlName && !visited.has(parentBlName)) {
      const child = buildBaselineNode(parentBlName, index, visited);
      if (child) root.children.push(child);
    }
  }

  const baselineSet = new Set<string>();
  const collectBaselines = (node: DependencyNode) => {
    if (node.baselineName) baselineSet.add(node.baselineName);
    for (const c of node.children) collectBaselines(c);
  };
  collectBaselines(root);

  return { root, baselineNames: [...baselineSet], crossEdges };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const NODE_WIDTH = 160;
const NODE_HEIGHT = 48;
const COLUMN_GAP = 60;
const ROW_GAP = 16;
const GROUP_PADDING_X = 16;
const GROUP_PADDING_Y = 28;
const GROUP_GAP = 24;
const ROOT_GAP = 40;

type FlatNode = {
  name: string;
  kind: DependencyNodeKind;
  baselineName: string | null;
  version: string | null;
  column: number;
  parentName: string | null;
};

function flattenTree(
  node: DependencyNode,
  column: number,
  parentName: string | null,
  out: FlatNode[],
) {
  out.push({
    name: node.name,
    kind: node.kind,
    baselineName: node.baselineName,
    version: node.version,
    column,
    parentName,
  });
  for (const child of node.children) {
    flattenTree(child, column + 1, node.name, out);
  }
}

export function computeDependencyLayout(tree: DependencyTreeData): DependencyDiagramLayout {
  const flat: FlatNode[] = [];
  flattenTree(tree.root, 0, null, flat);

  // Adjust columns so cross-edge targets are always to the right of their sources
  {
    const flatByName = new Map(flat.map((n) => [n.name, n]));
    let adjusted = true;
    while (adjusted) {
      adjusted = false;
      for (const ce of tree.crossEdges) {
        const src = flatByName.get(ce.fromName);
        const tgt = flatByName.get(ce.toName);
        if (src && tgt && tgt.kind !== "baselinePractice" && tgt.kind !== "root" && tgt.column <= src.column) {
          tgt.column = src.column + 1;
          adjusted = true;
        }
      }
      for (const fn of flat) {
        if (!fn.parentName) continue;
        const parent = flatByName.get(fn.parentName);
        if (parent && fn.column <= parent.column) {
          fn.column = parent.column + 1;
          adjusted = true;
        }
      }
    }
  }

  if (flat.length <= 1) {
    const single: LayoutNode = {
      name: tree.root.name,
      kind: tree.root.kind,
      baselineName: tree.root.baselineName,
      version: tree.root.version,
      x: 0,
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
    return {
      nodes: [single],
      edges: [],
      groups: [],
      viewBoxWidth: NODE_WIDTH + 20,
      viewBoxHeight: NODE_HEIGHT + 20,
    };
  }

  const rootFlat = flat[0];
  const depNodes = flat.slice(1);

  // Group dep nodes by baseline
  const groupMap = new Map<string, FlatNode[]>();
  for (const n of depNodes) {
    const key = n.baselineName ?? "__ungrouped__";
    let arr = groupMap.get(key);
    if (!arr) {
      arr = [];
      groupMap.set(key, arr);
    }
    arr.push(n);
  }

  // Include root in its baseline group so it's laid out with its group
  if (rootFlat.baselineName) {
    let arr = groupMap.get(rootFlat.baselineName);
    if (!arr) {
      arr = [];
      groupMap.set(rootFlat.baselineName, arr);
    }
    arr.push(rootFlat);
  }

  // Sort within each group: baselines first, then practices; stable order by column
  for (const [, nodes] of groupMap) {
    nodes.sort((a, b) => {
      if (a.kind === "baselinePractice" && b.kind !== "baselinePractice") return -1;
      if (a.kind !== "baselinePractice" && b.kind === "baselinePractice") return 1;
      return a.column - b.column;
    });
  }

  // Compute group positions
  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];
  const layoutGroups: LayoutGroup[] = [];

  const groupXStart = rootFlat.baselineName ? GROUP_PADDING_X : NODE_WIDTH + ROOT_GAP;
  let currentGroupY = 0;

  for (const [baselineName, nodes] of groupMap) {
    // Within the group, assign rows. Baseline nodes get dedicated rows first.
    const baselines = nodes.filter((n) => n.kind === "baselinePractice");
    const practices = nodes.filter((n) => n.kind !== "baselinePractice");

    const rows: FlatNode[][] = [];
    if (baselines.length > 0) rows.push(baselines);

    // Each practice chain becomes its own row. Build chains by following parentage.
    const practiceByName = new Map(practices.map((p) => [p.name, p]));
    const assigned = new Set<string>();

    // Find chain heads: practices whose parent is the root or whose parent is not in this group
    const chainHeads = practices.filter((p) => {
      if (assigned.has(p.name)) return false;
      return !p.parentName || !practiceByName.has(p.parentName);
    });

    for (const head of chainHeads) {
      if (assigned.has(head.name)) continue;
      const chain = [head];
      assigned.add(head.name);
      // Follow children within this group
      let current = head;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const child = practices.find(
          (p) => p.parentName === current.name && !assigned.has(p.name),
        );
        if (!child) break;
        chain.push(child);
        assigned.add(child.name);
        current = child;
      }
      rows.push(chain);
    }

    // Any unassigned practices get their own rows
    for (const p of practices) {
      if (!assigned.has(p.name)) {
        rows.push([p]);
        assigned.add(p.name);
      }
    }

    // Compute positions for nodes in this group (each group uses its own column origin)
    const groupNodePositions: { node: FlatNode; x: number; y: number }[] = [];
    const groupMinCol = Math.min(...nodes.map((n) => n.column));

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      for (const node of row) {
        const colOffset = node.kind === "baselinePractice" ? 0 : node.column - groupMinCol;
        const x = groupXStart + GROUP_PADDING_X + colOffset * (NODE_WIDTH + COLUMN_GAP);
        const y = currentGroupY + GROUP_PADDING_Y + rowIdx * (NODE_HEIGHT + ROW_GAP);
        groupNodePositions.push({ node, x, y });
      }
    }

    // Layout group bounding box
    if (groupNodePositions.length > 0) {
      const minX = Math.min(...groupNodePositions.map((p) => p.x));
      const maxX = Math.max(...groupNodePositions.map((p) => p.x + NODE_WIDTH));
      const minY = Math.min(...groupNodePositions.map((p) => p.y));
      const maxY = Math.max(...groupNodePositions.map((p) => p.y + NODE_HEIGHT));

      if (baselineName !== "__ungrouped__") {
        layoutGroups.push({
          baselineName,
          x: minX - GROUP_PADDING_X,
          y: minY - GROUP_PADDING_Y,
          width: maxX - minX + GROUP_PADDING_X * 2,
          height: maxY - minY + GROUP_PADDING_Y + GROUP_PADDING_X,
        });
      }

      for (const pos of groupNodePositions) {
        layoutNodes.push({
          name: pos.node.name,
          kind: pos.node.kind,
          baselineName: pos.node.baselineName,
          version: pos.node.version,
          x: pos.x,
          y: pos.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      }

      currentGroupY = maxY + NODE_HEIGHT / 2 + GROUP_GAP;
    }
  }

  // If root is not part of a baseline group, position it standalone (centered vertically)
  if (!rootFlat.baselineName) {
    const allDepYs = layoutNodes.map((n) => n.y + NODE_HEIGHT / 2);
    const centerY =
      allDepYs.length > 0
        ? (Math.min(...allDepYs) + Math.max(...allDepYs)) / 2
        : NODE_HEIGHT / 2;

    layoutNodes.unshift({
      name: rootFlat.name,
      kind: rootFlat.kind,
      baselineName: rootFlat.baselineName,
      version: rootFlat.version,
      x: 0,
      y: centerY - NODE_HEIGHT / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // Build edges from parent→child and cross-edge relationships
  const nodeByName = new Map(layoutNodes.map((n) => [n.name, n]));
  const groupByBaseline = new Map(layoutGroups.map((g) => [g.baselineName, g]));

  function buildEdge(from: LayoutNode, to: LayoutNode, fromName: string, toName: string): LayoutEdge | null {
    // Edges to a node's own baseline are implied by group containment
    if (to.kind === "baselinePractice" && from.baselineName === to.name) {
      return null;
    }

    let x1 = from.x + from.width;
    let y1 = from.y + from.height / 2;
    let x2 = to.x;
    let y2 = to.y + to.height / 2;
    let exitDir: EdgeDirection = "right";
    let entryDir: EdgeDirection = "left";

    // Determine source and target groups
    const fgKey = from.kind === "baselinePractice" ? from.name : from.baselineName;
    const fg = fgKey ? groupByBaseline.get(fgKey) : null;
    const tgKey = to.kind === "baselinePractice" ? to.name : to.baselineName;
    const tg = tgKey ? groupByBaseline.get(tgKey) : null;

    if (fg && tg && fg !== tg) {
      // Cross-group edge: detect if vertically stacked
      const hOverlap = fg.x < tg.x + tg.width && tg.x < fg.x + fg.width;
      if (hOverlap) {
        if (to.kind === "baselinePractice") {
          // Baseline target: route group-to-group via overlap midpoint
          const oLeft = Math.max(fg.x, tg.x);
          const oRight = Math.min(fg.x + fg.width, tg.x + tg.width);
          const midX = (oLeft + oRight) / 2;
          if (fg.y < tg.y) {
            x1 = midX; y1 = fg.y + fg.height;
            x2 = midX; y2 = tg.y;
            exitDir = "bottom"; entryDir = "top";
          } else {
            x1 = midX; y1 = fg.y;
            x2 = midX; y2 = tg.y + tg.height;
            exitDir = "top"; entryDir = "bottom";
          }
        } else {
          // Practice target: route node-to-node vertically
          const fromCx = from.x + from.width / 2;
          const toCx = to.x + to.width / 2;
          if (from.y < to.y) {
            x1 = fromCx; y1 = from.y + from.height;
            x2 = toCx; y2 = to.y;
            exitDir = "bottom"; entryDir = "top";
          } else {
            x1 = fromCx; y1 = from.y;
            x2 = toCx; y2 = to.y + to.height;
            exitDir = "top"; entryDir = "bottom";
          }
        }
      } else {
        // Horizontally separated groups
        if (to.kind === "baselinePractice") {
          x1 = fg.x + fg.width; y1 = fg.y + fg.height / 2;
          x2 = tg.x; y2 = tg.y + tg.height / 2;
        } else if (from.kind === "baselinePractice") {
          x1 = fg.x + fg.width; y1 = fg.y + fg.height / 2;
        }
      }
    } else if (to.kind === "baselinePractice") {
      const targetGroup = groupByBaseline.get(to.name);
      if (targetGroup) {
        x2 = targetGroup.x; y2 = targetGroup.y + targetGroup.height / 2;
      }
    } else if (from.kind === "baselinePractice" && fg) {
      x1 = fg.x + fg.width; y1 = fg.y + fg.height / 2;
    }

    return { fromName, toName, x1, y1, x2, y2, exitDir, entryDir };
  }

  for (const fn of flat) {
    if (!fn.parentName) continue;
    const from = nodeByName.get(fn.parentName);
    const to = nodeByName.get(fn.name);
    if (!from || !to) continue;
    const edge = buildEdge(from, to, fn.parentName, fn.name);
    if (edge) layoutEdges.push(edge);
  }

  for (const ce of tree.crossEdges) {
    const from = nodeByName.get(ce.fromName);
    const to = nodeByName.get(ce.toName);
    if (!from || !to) continue;
    const edge = buildEdge(from, to, ce.fromName, ce.toName);
    if (edge) layoutEdges.push(edge);
  }

  // Viewport
  const allX = layoutNodes.map((n) => n.x + n.width);
  const allY = layoutNodes.map((n) => n.y + n.height);
  const viewBoxWidth = Math.max(...allX) + 20;
  const viewBoxHeight = Math.max(...allY, ...layoutGroups.map((g) => g.y + g.height)) + 20;

  // Ensure no negative coordinates (group extension may push x/y below 0)
  const minX = Math.min(...layoutNodes.map((n) => n.x), ...layoutGroups.map((g) => g.x));
  if (minX < 10) {
    const shift = 10 - minX;
    for (const n of layoutNodes) n.x += shift;
    for (const e of layoutEdges) { e.x1 += shift; e.x2 += shift; }
    for (const g of layoutGroups) g.x += shift;
  }
  const minY = Math.min(...layoutNodes.map((n) => n.y), ...layoutGroups.map((g) => g.y));
  if (minY < 10) {
    const shift = 10 - minY;
    for (const n of layoutNodes) n.y += shift;
    for (const e of layoutEdges) { e.y1 += shift; e.y2 += shift; }
    for (const g of layoutGroups) g.y += shift;
  }

  // Recalculate viewport after shifts
  const finalMaxX = Math.max(
    ...layoutNodes.map((n) => n.x + n.width),
    ...layoutGroups.map((g) => g.x + g.width),
  );
  const finalMaxY = Math.max(
    ...layoutNodes.map((n) => n.y + n.height),
    ...layoutGroups.map((g) => g.y + g.height),
  );

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    groups: layoutGroups,
    viewBoxWidth: finalMaxX + 20,
    viewBoxHeight: finalMaxY + 20,
  };
}
