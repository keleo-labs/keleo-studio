"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { drag as d3Drag } from "d3-drag";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import {
  extractTopologyData,
  calculateTopologyStats,
  type TopologyNode,
  type TopologyEdge,
  type TopologyNodeType,
  type TopologyEdgeType,
} from "@/lib/diagrams/topology/data";
import { findAsset } from "@/lib/display/assets";
import type { Asset } from "@/lib/types";
import { createIconSvgElement } from "@/lib/display/renderIconInSvg";

type TopologyDiagramProps = {
  practice: any;
  width?: number;
  height?: number;
};

type SimNode = TopologyNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & TopologyEdge & { count?: number };

// Color scheme for different node types
const NODE_COLORS: Record<TopologyNodeType, string> = {
  alpha: "#3b82f6", // blue-500
  alphaState: "#93c5fd", // blue-300
  activity: "#8b5cf6", // violet-500
  activitySpace: "#c4b5fd", // violet-300
  workProduct: "#f59e0b", // amber-500
  levelOfDetail: "#fbbf24", // amber-400
  competency: "#10b981", // emerald-500
  competencyLevel: "#6ee7b7", // emerald-300
};

// Edge colors by type
const EDGE_COLORS: Record<TopologyEdgeType, string> = {
  contributes: "#64748b", // slate-500
  evidences: "#22c55e", // green-500
  worksOn: "#f97316", // orange-500
  recommended: "#06b6d4", // cyan-500
  required: "#ef4444", // red-500
};

// Child tile size (for states, levels, etc.)
const CHILD_TILE_WIDTH = 140;
const CHILD_TILE_MIN_HEIGHT = 35;
const CHILD_TILE_GAP = 8;
const CARD_PADDING = 12;
const CARD_HEADER_HEIGHT = 40;

// Helper to calculate tile height based on text length
function calculateTileHeight(text: string, width: number): number {
  // Rough estimate: ~12 characters per line at 10px font
  const charsPerLine = Math.floor(width / 7);
  const lines = Math.ceil(text.length / charsPerLine);
  const lineHeight = 14; // pixels
  const padding = 8; // top and bottom padding
  return Math.max(CHILD_TILE_MIN_HEIGHT, lines * lineHeight + padding);
}

// Standalone activity size
const ACTIVITY_WIDTH = 130;
const ACTIVITY_HEIGHT = 45;

// Determine if a node should use vertical layout (sequential children)
function usesVerticalLayout(nodeType: TopologyNodeType): boolean {
  return nodeType === "alpha" || nodeType === "workProduct" || nodeType === "competency";
}

// Calculate dimensions for compound nodes
function calculateNodeDimensions(node: TopologyNode): { width: number; height: number } {
  if (!node.children || node.children.length === 0) {
    // Standalone activity - allow dynamic height
    const height = calculateTileHeight(node.name, ACTIVITY_WIDTH - 16);
    return { width: ACTIVITY_WIDTH, height: Math.max(ACTIVITY_HEIGHT, height) };
  }

  // Compound node (alpha, workProduct, activitySpace, competency)
  if (usesVerticalLayout(node.type)) {
    // Vertical layout for sequential nodes - calculate each child's height
    let totalHeight = 0;
    node.children.forEach((child) => {
      const childHeight = calculateTileHeight(child.name, CHILD_TILE_WIDTH - 16);
      totalHeight += childHeight + CHILD_TILE_GAP;
    });
    totalHeight -= CHILD_TILE_GAP; // Remove last gap

    return {
      width: CHILD_TILE_WIDTH + CARD_PADDING * 2,
      height: CARD_HEADER_HEIGHT + totalHeight + CARD_PADDING * 2,
    };
  } else {
    // Grid layout for activity spaces - calculate row heights
    const childrenPerRow = 3;
    const rows = Math.ceil(node.children.length / childrenPerRow);
    const cols = Math.min(node.children.length, childrenPerRow);

    let totalHeight = 0;
    for (let row = 0; row < rows; row++) {
      let maxRowHeight = CHILD_TILE_MIN_HEIGHT;
      for (let col = 0; col < childrenPerRow; col++) {
        const childIndex = row * childrenPerRow + col;
        if (childIndex < node.children.length) {
          const child = node.children[childIndex];
          const childHeight = calculateTileHeight(child.name, CHILD_TILE_WIDTH - 16);
          maxRowHeight = Math.max(maxRowHeight, childHeight);
        }
      }
      totalHeight += maxRowHeight + CHILD_TILE_GAP;
    }
    totalHeight -= CHILD_TILE_GAP; // Remove last gap

    const contentWidth = cols * CHILD_TILE_WIDTH + (cols - 1) * CHILD_TILE_GAP;

    return {
      width: Math.max(200, contentWidth + CARD_PADDING * 2),
      height: CARD_HEADER_HEIGHT + totalHeight + CARD_PADDING * 2,
    };
  }
}

export default function TopologyDiagram({
  practice,
  width = 1600,
  height = 1000,
}: TopologyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const [topologyData, setTopologyData] = useState<ReturnType<typeof extractTopologyData> | null>(
    null
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);

  // Extract topology data and assets when practice changes
  const assets = (practice?.assets || []) as Asset[];

  useEffect(() => {
    if (!practice) return;

    try {
      const data = extractTopologyData(practice);
      setTopologyData(data);
    } catch (error) {
      console.error("Error extracting topology data:", error);
      setTopologyData({ nodes: [], edges: [] });
    }
  }, [practice]);

  // Create and update D3 visualization
  useEffect(() => {
    if (!topologyData || !svgRef.current || !containerRef.current) return;

    const svg = select(svgRef.current);
    const container = select(containerRef.current);

    // Clear previous content
    container.selectAll("*").remove();

    // Flatten all nodes (including children) for D3 simulation
    // This ensures edges can find their targets
    const allNodes: SimNode[] = [];
    const parentNodes: SimNode[] = [];

    // Group nodes by type for initial positioning
    const nodesByType: Record<string, SimNode[]> = {
      alpha: [],
      workProduct: [],
      activitySpace: [],
      competency: [],
    };

    topologyData.nodes.forEach((node) => {
      const simNode: SimNode = { ...node };

      // Set initial positions in vertical columns by type
      if (node.type === 'alpha') {
        simNode.x = width * 0.15;
        simNode.y = height * 0.2 + nodesByType.alpha.length * 150;
        nodesByType.alpha.push(simNode);
      } else if (node.type === 'workProduct') {
        simNode.x = width * 0.35;
        simNode.y = height * 0.2 + nodesByType.workProduct.length * 150;
        nodesByType.workProduct.push(simNode);
      } else if (node.type === 'activitySpace') {
        simNode.x = width * 0.55;
        simNode.y = height * 0.2 + nodesByType.activitySpace.length * 150;
        nodesByType.activitySpace.push(simNode);
      } else if (node.type === 'competency') {
        simNode.x = width * 0.8;
        simNode.y = height * 0.2 + nodesByType.competency.length * 150;
        nodesByType.competency.push(simNode);
      } else {
        // Fallback for any other node types
        simNode.x = width / 2;
        simNode.y = height / 2;
      }

      allNodes.push(simNode);
      parentNodes.push(simNode);

      // Also add all children to the flat list for edge resolution
      if (node.children) {
        node.children.forEach((child) => {
          allNodes.push({ ...child });
        });
      }
    });

    // Aggregate edges at the parent card level
    const edgeGroups = new Map<string, { edge: TopologyEdge; count: number }>();

    topologyData.edges.forEach((edge) => {
      // Find the parent cards for source and target
      let sourceParentId = edge.source;
      let targetParentId = edge.target;

      // Find parent for source (if it's a child node)
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (sourceNode?.parentId) {
        sourceParentId = sourceNode.parentId;
      }

      // Find parent for target (if it's a child node)
      const targetNode = allNodes.find((n) => n.id === edge.target);
      if (targetNode?.parentId) {
        targetParentId = targetNode.parentId;
      }

      // Create a key for this parent-to-parent connection
      const key = `${sourceParentId}::${targetParentId}::${edge.type}`;

      if (edgeGroups.has(key)) {
        edgeGroups.get(key)!.count++;
      } else {
        edgeGroups.set(key, {
          edge: {
            id: key,
            source: sourceParentId,
            target: targetParentId,
            type: edge.type,
            label: edge.label,
          },
          count: 1,
        });
      }
    });

    // Convert aggregated edges to SimLinks
    const links: SimLink[] = Array.from(edgeGroups.values()).map((group) => ({
      ...group.edge,
      source: group.edge.source,
      target: group.edge.target,
      count: group.count, // Store count for line thickness
    }));

    // Create force simulation with all nodes but only apply forces to parents
    const simulation = forceSimulation<SimNode>(allNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            // Keep links shorter for more compact layout
            if (d.type === "evidences") return 120;
            if (d.type === "contributes") return 100;
            if (d.type === "worksOn") return 80;
            if (d.type === "recommended" || d.type === "required") return 90;
            return 100;
          })
          .strength((d) => {
            // Only apply link forces between parent nodes
            const source = typeof d.source === "object" ? d.source : nodeMap.get(d.source);
            const target = typeof d.target === "object" ? d.target : nodeMap.get(d.target);
            const sourceIsParent = parentNodes.some(p => p.id === source?.id);
            const targetIsParent = parentNodes.some(p => p.id === target?.id);
            // Weaken forces if either end is a child node
            return sourceIsParent && targetIsParent ? 0.3 : 0.05;
          })
      )
      .force("charge", forceManyBody().strength((d) => {
        // Only apply repulsion to parent nodes, moderate strength
        const isParent = parentNodes.some(p => p.id === d.id);
        return isParent ? -600 : 0;
      }))
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "collision",
        forceCollide<SimNode>().radius((d) => {
          // Only apply collision to parent nodes
          const isParent = parentNodes.some(p => p.id === d.id);
          if (!isParent) return 0;
          const dims = calculateNodeDimensions(d);
          return Math.max(dims.width, dims.height) / 2 + 30;
        }).strength(0.8)
      )
      .alpha(0.3)
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    // Create arrow markers for directed edges
    const defs = container.append("defs");

    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 75)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    // Create links
    const linkGroup = container.append("g").attr("class", "links");

    const linkElements = linkGroup
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => EDGE_COLORS[d.type])
      .attr("stroke-width", (d) => {
        // Width based on number of connections, capped at reasonable max
        const count = (d as any).count || 1;
        return Math.min(2 + count * 0.5, 8);
      })
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", (d) => `url(#arrow-${d.type})`)
      .attr("class", "transition-opacity duration-200");

    // Add tooltips to links
    linkElements.append("title").text((d) => {
      const source = typeof d.source === "object" ? d.source.name : d.source;
      const target = typeof d.target === "object" ? d.target.name : d.target;
      const count = (d as any).count || 1;
      const countStr = count > 1 ? ` (${count} connections)` : "";
      return `${source} ${d.label || d.type} ${target}${countStr}`;
    });

    // Create nodes - only render parent nodes (not flattened children)
    const nodeGroup = container.append("g").attr("class", "nodes");

    const nodeElements = nodeGroup
      .selectAll<SVGGElement, SimNode>("g")
      .data(parentNodes)
      .join("g")
      .attr("class", "node cursor-pointer");

    // Render each node (compound or simple)
    nodeElements.each(function (d) {
      const nodeGroup = select(this);
      const dims = calculateNodeDimensions(d);
      const hasChildren = d.children && d.children.length > 0;

      if (hasChildren) {
        // Render compound node (card with children)
        renderCompoundNode(nodeGroup, d, dims);
      } else {
        // Render simple node (standalone activity)
        renderSimpleNode(nodeGroup, d, dims);
      }

      // Add mouse events
      nodeGroup
        .on("mouseenter", function () {
          nodeGroup.selectAll(".node-bg").attr("opacity", d.isPlaceholder ? 0.7 : 1);
          setSelectedNode(d.id);

          // Highlight connected links
          linkElements
            .attr("stroke-opacity", (link) => {
              const source = typeof link.source === "object" ? link.source.id : link.source;
              const target = typeof link.target === "object" ? link.target.id : link.target;
              // Also highlight if any child is source/target
              const isChildSource = d.children?.some((c) => c.id === source);
              const isChildTarget = d.children?.some((c) => c.id === target);
              return source === d.id || target === d.id || isChildSource || isChildTarget
                ? 1
                : 0.2;
            })
            .attr("stroke-width", (link) => {
              const source = typeof link.source === "object" ? link.source.id : link.source;
              const target = typeof link.target === "object" ? link.target.id : link.target;
              const isChildSource = d.children?.some((c) => c.id === source);
              const isChildTarget = d.children?.some((c) => c.id === target);
              return source === d.id || target === d.id || isChildSource || isChildTarget ? 3 : 2;
            });
        })
        .on("mouseleave", function () {
          nodeGroup.selectAll(".node-bg").attr("opacity", d.isPlaceholder ? 0.5 : 0.9);
          setSelectedNode(null);
          linkElements.attr("stroke-opacity", 0.6).attr("stroke-width", 2);
        });
    });

    // Helper function to render compound nodes
    function renderCompoundNode(
      nodeGroup: any,
      node: SimNode,
      dims: { width: number; height: number }
    ) {
      // Card background
      nodeGroup
        .append("rect")
        .attr("class", "node-bg")
        .attr("x", -dims.width / 2)
        .attr("y", -dims.height / 2)
        .attr("width", dims.width)
        .attr("height", dims.height)
        .attr("rx", 8)
        .attr("fill", "#f8fafc")
        .attr("stroke", node.isPlaceholder ? "#999" : NODE_COLORS[node.type])
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", node.isPlaceholder ? "4,4" : "0")
        .attr("opacity", node.isPlaceholder ? 0.5 : 0.9);

      // Header background
      nodeGroup
        .append("rect")
        .attr("x", -dims.width / 2)
        .attr("y", -dims.height / 2)
        .attr("width", dims.width)
        .attr("height", CARD_HEADER_HEIGHT)
        .attr("rx", 8)
        .attr("fill", NODE_COLORS[node.type])
        .attr("opacity", 0.15);

      // Header icon (if available)
      const iconRef = node.assetNames?.find((ref) => ref.type === "icon");
      const iconAsset = iconRef ? findAsset(iconRef.assetName, assets) : null;
      const iconSize = 16;
      const iconPadding = 4;

      if (iconAsset) {
        const iconX = -dims.width / 2 + iconPadding;
        const iconY = -dims.height / 2 + (CARD_HEADER_HEIGHT - iconSize) / 2;

        const iconElement = createIconSvgElement(iconAsset, iconX, iconY, iconSize, NODE_COLORS[node.type]);
        if (iconElement) {
          nodeGroup.node()?.appendChild(iconElement);
        }
      }

      // Header text
      const headerText = node.name.length > 20 ? node.name.substring(0, 20) + "..." : node.name;

      // Calculate text position
      let textX = 0;
      let textAnchor = "middle";

      if (iconAsset) {
        // Position text after icon (left side of card)
        textX = -dims.width / 2 + iconPadding + iconSize + iconPadding;
        textAnchor = "start";
      }

      nodeGroup
        .append("text")
        .attr("x", textX)
        .attr("y", -dims.height / 2 + CARD_HEADER_HEIGHT / 2)
        .attr("text-anchor", textAnchor)
        .attr("dy", "0.35em")
        .attr("font-size", "13px")
        .attr("font-weight", "700")
        .attr("fill", NODE_COLORS[node.type])
        .attr("class", "pointer-events-none select-none")
        .text(headerText);

      // Render children as tiles
      const sortedChildren = [...(node.children || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));
      const isVertical = usesVerticalLayout(node.type);

      let cumulativeY = -dims.height / 2 + CARD_HEADER_HEIGHT + CARD_PADDING;

      if (isVertical) {
        // Vertical layout
        sortedChildren.forEach((child) => {
          const childHeight = calculateTileHeight(child.name, CHILD_TILE_WIDTH - 16);
          const x = -CHILD_TILE_WIDTH / 2;
          const y = cumulativeY;

          // Child tile background
          nodeGroup
            .append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", CHILD_TILE_WIDTH)
            .attr("height", childHeight)
            .attr("rx", 4)
            .attr("fill", NODE_COLORS[child.type])
            .attr("opacity", 0.9)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .append("title")
            .text(child.description || child.name);

          // Child tile text with wrapping
          wrapText(nodeGroup, child.name, x + CHILD_TILE_WIDTH / 2, y + childHeight / 2, CHILD_TILE_WIDTH - 16, 10);

          cumulativeY += childHeight + CHILD_TILE_GAP;
        });
      } else {
        // Grid layout
        const childrenPerRow = 3;
        const rows = Math.ceil(sortedChildren.length / childrenPerRow);

        for (let row = 0; row < rows; row++) {
          // Calculate max height for this row
          let maxRowHeight = CHILD_TILE_MIN_HEIGHT;
          for (let col = 0; col < childrenPerRow; col++) {
            const childIndex = row * childrenPerRow + col;
            if (childIndex < sortedChildren.length) {
              const child = sortedChildren[childIndex];
              const childHeight = calculateTileHeight(child.name, CHILD_TILE_WIDTH - 16);
              maxRowHeight = Math.max(maxRowHeight, childHeight);
            }
          }

          // Render tiles in this row
          for (let col = 0; col < childrenPerRow; col++) {
            const childIndex = row * childrenPerRow + col;
            if (childIndex >= sortedChildren.length) break;

            const child = sortedChildren[childIndex];
            const numInRow = Math.min(childrenPerRow, sortedChildren.length - row * childrenPerRow);
            const rowWidth = numInRow * CHILD_TILE_WIDTH + (numInRow - 1) * CHILD_TILE_GAP;
            const startX = -rowWidth / 2;

            const x = startX + col * (CHILD_TILE_WIDTH + CHILD_TILE_GAP);
            const y = cumulativeY;

            // Child tile background
            nodeGroup
              .append("rect")
              .attr("x", x)
              .attr("y", y)
              .attr("width", CHILD_TILE_WIDTH)
              .attr("height", maxRowHeight)
              .attr("rx", 4)
              .attr("fill", NODE_COLORS[child.type])
              .attr("opacity", 0.9)
              .attr("stroke", "#fff")
              .attr("stroke-width", 1.5)
              .append("title")
              .text(child.description || child.name);

            // Child tile text with wrapping
            wrapText(nodeGroup, child.name, x + CHILD_TILE_WIDTH / 2, y + maxRowHeight / 2, CHILD_TILE_WIDTH - 16, 10);
          }

          cumulativeY += maxRowHeight + CHILD_TILE_GAP;
        }
      }
    }

    // Helper to wrap text into multiple lines
    function wrapText(container: any, text: string, x: number, y: number, maxWidth: number, fontSize: number) {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = "";

      // Simple word wrapping
      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const estimatedWidth = testLine.length * (fontSize * 0.6);

        if (estimatedWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }

      // Render each line
      const lineHeight = fontSize + 4;
      const totalHeight = lines.length * lineHeight;
      const startY = y - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        container
          .append("text")
          .attr("x", x)
          .attr("y", startY + i * lineHeight)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", `${fontSize}px`)
          .attr("font-weight", "600")
          .attr("fill", "#fff")
          .attr("class", "pointer-events-none select-none")
          .text(line);
      });
    }

    // Helper function to render simple nodes
    function renderSimpleNode(
      nodeGroup: any,
      node: SimNode,
      dims: { width: number; height: number }
    ) {
      // Simple tile
      nodeGroup
        .append("rect")
        .attr("class", "node-bg")
        .attr("x", -dims.width / 2)
        .attr("y", -dims.height / 2)
        .attr("width", dims.width)
        .attr("height", dims.height)
        .attr("rx", 6)
        .attr("fill", NODE_COLORS[node.type])
        .attr("stroke", node.isPlaceholder ? "#999" : "#fff")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", node.isPlaceholder ? "4,4" : "0")
        .attr("opacity", node.isPlaceholder ? 0.5 : 0.9);

      // Text with wrapping
      wrapText(nodeGroup, node.name, 0, 0, dims.width - 16, 11);
    }

    // Add tooltips to nodes
    nodeElements.append("title").text((d) => {
      let text = `${d.name} (${d.type})`;
      if (d.description) text += `\n${d.description}`;
      if (d.group) text += `\nGroup: ${d.group}`;
      return text;
    });

    // Add drag behavior
    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(dragBehavior);

    // Add zoom behavior
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity);

    // Create a map to find parent position for child nodes
    const nodeMap = new Map<string, SimNode>();
    allNodes.forEach((n) => nodeMap.set(n.id, n));

    // Helper to calculate child tile position within parent card
    const getChildPosition = (parent: SimNode, child: TopologyNode, childIndex: number) => {
      if (!parent.x || !parent.y) return { x: 0, y: 0 };

      const dims = calculateNodeDimensions(parent);

      if (usesVerticalLayout(parent.type)) {
        // Vertical layout - children stacked vertically with dynamic heights
        const sortedChildren = [...(parent.children || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));
        let cumulativeY = 0;

        // Calculate Y position by summing heights of previous children
        for (let i = 0; i < childIndex; i++) {
          const prevChild = sortedChildren[i];
          const prevHeight = calculateTileHeight(prevChild.name, CHILD_TILE_WIDTH - 16);
          cumulativeY += prevHeight + CHILD_TILE_GAP;
        }

        const childHeight = calculateTileHeight(child.name, CHILD_TILE_WIDTH - 16);
        const relativeX = 0; // Centered horizontally
        const relativeY =
          -dims.height / 2 +
          CARD_HEADER_HEIGHT +
          CARD_PADDING +
          cumulativeY +
          childHeight / 2;

        return {
          x: parent.x + relativeX,
          y: parent.y + relativeY,
        };
      } else {
        // Grid layout for activity spaces with dynamic row heights
        const childrenPerRow = 3;
        const row = Math.floor(childIndex / childrenPerRow);
        const col = childIndex % childrenPerRow;

        const sortedChildren = [...(parent.children || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));

        // Calculate cumulative Y by summing previous row heights
        let cumulativeY = 0;
        for (let r = 0; r < row; r++) {
          let maxRowHeight = CHILD_TILE_MIN_HEIGHT;
          for (let c = 0; c < childrenPerRow; c++) {
            const idx = r * childrenPerRow + c;
            if (idx < sortedChildren.length) {
              const ch = sortedChildren[idx];
              const h = calculateTileHeight(ch.name, CHILD_TILE_WIDTH - 16);
              maxRowHeight = Math.max(maxRowHeight, h);
            }
          }
          cumulativeY += maxRowHeight + CHILD_TILE_GAP;
        }

        // Calculate current row height
        let currentRowHeight = CHILD_TILE_MIN_HEIGHT;
        for (let c = 0; c < childrenPerRow; c++) {
          const idx = row * childrenPerRow + c;
          if (idx < sortedChildren.length) {
            const ch = sortedChildren[idx];
            const h = calculateTileHeight(ch.name, CHILD_TILE_WIDTH - 16);
            currentRowHeight = Math.max(currentRowHeight, h);
          }
        }

        const numInRow = Math.min(
          childrenPerRow,
          (parent.children?.length || 0) - row * childrenPerRow
        );
        const rowWidth = numInRow * CHILD_TILE_WIDTH + (numInRow - 1) * CHILD_TILE_GAP;
        const startX = -rowWidth / 2;

        const relativeX = startX + col * (CHILD_TILE_WIDTH + CHILD_TILE_GAP) + CHILD_TILE_WIDTH / 2;
        const relativeY =
          -dims.height / 2 +
          CARD_HEADER_HEIGHT +
          CARD_PADDING +
          cumulativeY +
          currentRowHeight / 2;

        return {
          x: parent.x + relativeX,
          y: parent.y + relativeY,
        };
      }
    };

    // Keep child nodes positioned with their parents
    const constrainChildren = () => {
      parentNodes.forEach((parent) => {
        if (parent.children) {
          const sortedChildren = [...parent.children].sort((a, b) => (a.seq || 0) - (b.seq || 0));
          sortedChildren.forEach((child, index) => {
            const childNode = nodeMap.get(child.id);
            if (childNode) {
              // Position child at its specific tile location within the parent card
              const pos = getChildPosition(parent, child, index);
              childNode.x = pos.x;
              childNode.y = pos.y;
              childNode.vx = parent.vx;
              childNode.vy = parent.vy;
            }
          });
        }
      });
    };

    // Update positions on simulation tick
    simulation.on("tick", () => {
      constrainChildren();

      linkElements
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x || 0 : 0))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y || 0 : 0))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x || 0 : 0))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y || 0 : 0));

      nodeElements.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [topologyData, width, height]);

  if (!topologyData) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading topology diagram...
      </div>
    );
  }

  const stats = calculateTopologyStats(topologyData);

  if (topologyData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-600">
        <p className="text-lg font-medium mb-2">No Topology Data Available</p>
        <p className="text-sm text-gray-500 max-w-md text-center">
          This practice doesn't have elements defined yet. Add alphas, activities, work products,
          or competencies to visualize them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Node Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(NODE_COLORS).map(([type, color]) => {
            const count = stats.nodesByType[type as TopologyNodeType] || 0;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium capitalize">
                  {type.replace(/([A-Z])/g, " $1").trim()} ({count})
                </span>
              </div>
            );
          })}
        </div>

        <h3 className="text-sm font-semibold mt-4 mb-3 text-gray-700">Relationship Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(EDGE_COLORS).map(([type, color]) => {
            const count = stats.edgesByType[type as TopologyEdgeType] || 0;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-2">
                <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium capitalize">
                  {type} ({count})
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p className="font-medium mb-1">Interactions:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Drag nodes to reposition them</li>
            <li>Hover over nodes to highlight connections</li>
            <li>Scroll to zoom in/out</li>
            <li>Pan by dragging the background</li>
            <li>
              <em>Dashed, semi-transparent nodes</em> are referenced from baseline or other
              practices
            </li>
          </ul>
        </div>
      </div>

      {/* Topology Diagram */}
      <div className="border rounded-lg bg-white p-4 overflow-hidden">
        <svg ref={svgRef} width={width} height={height} className="mx-auto">
          <g ref={containerRef} />
        </svg>
      </div>

      {/* Description */}
      <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-lg">
        <p className="font-medium mb-2">Understanding the Topology:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Alphas</strong> (blue) contain <strong>States</strong> (light blue) that
            represent progression
          </li>
          <li>
            <strong>Activities</strong> (violet) are grouped by{" "}
            <strong>Activity Spaces</strong> (light violet)
          </li>
          <li>
            <strong>Work Products</strong> (amber) have <strong>Levels of Detail</strong> (yellow)
          </li>
          <li>
            <strong>Competencies</strong> (emerald) contain <strong>Levels</strong> (light emerald)
          </li>
          <li>Arrows show relationships: contributes, evidences, works on, recommended, required</li>
        </ul>
      </div>
    </div>
  );
}
