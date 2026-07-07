"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
type SimLink = SimulationLinkDatum<SimNode> & TopologyEdge;

// Color scheme for alphas
const ALPHA_COLOR = "#3b82f6"; // blue-500
const ALPHA_STATE_COLOR = "#93c5fd"; // blue-300

// Edge colors by type
const EDGE_COLORS: Record<TopologyEdgeType, string> = {
  contributesTo: "#8b5cf6", // violet-500
  relatesTo: "#10b981", // emerald-500
};

// Alpha card dimensions
const CARD_WIDTH = 160;
const CARD_HEIGHT = 80;

// Calculate card dimensions
function calculateCardDimensions(node: TopologyNode): { width: number; height: number } {
  return {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  };
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
  const [resetTrigger, setResetTrigger] = useState(0);
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);

  const assets = useMemo(() => (practice?.assets || []) as Asset[], [practice]);

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

  useEffect(() => {
    if (!topologyData || !svgRef.current || !containerRef.current) return;

    const svg = select(svgRef.current);
    const container = select(containerRef.current);

    // Clear previous content
    container.selectAll("*").remove();

    const nodes: SimNode[] = topologyData.nodes.map((node, index) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    const links: SimLink[] = topologyData.edges.map((edge) => ({
      ...edge,
      source: edge.source,
      target: edge.target,
    }));

    // Create force simulation
    const simulation = forceSimulation<SimNode>(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => (d.type === "contributesTo" ? 200 : 250))
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-800))
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "collision",
        forceCollide<SimNode>().radius((d) => {
          const dims = calculateCardDimensions(d);
          return Math.max(dims.width, dims.height) / 2 + 40;
        }).strength(0.8)
      )
      .alpha(1)
      .alphaDecay(0.05)
      .alphaMin(0.001);

    simulationRef.current = simulation;

    // Track simulation state
    let tickCount = 0;
    const maxTicks = 300;
    let hasStoppedNaturally = false;

    simulation.on("end", () => {
      console.log("Topology simulation settled");
      hasStoppedNaturally = true;
    });

    // Create arrow markers for directed edges
    const defs = container.append("defs");

    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 100)
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
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", (d) => `url(#arrow-${d.type})`)
      .attr("class", "transition-opacity duration-200");

    linkElements.append("title").text((d) => {
      const source = typeof d.source === "object" ? d.source.name : d.source;
      const target = typeof d.target === "object" ? d.target.name : d.target;
      return `${source} ${d.label || d.type} ${target}`;
    });

    // Create edge labels
    const linkLabelGroup = container.append("g").attr("class", "link-labels");

    const linkLabelContainers = linkLabelGroup
      .selectAll<SVGGElement, SimLink>("g")
      .data(links)
      .join("g")
      .attr("class", "link-label-container");

    // Add background rectangles for labels
    const linkLabelBgs = linkLabelContainers
      .append("rect")
      .attr("class", "link-label-bg")
      .attr("fill", "#ffffff")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)
      .attr("rx", 3)
      .attr("opacity", 0.95);

    // Add text labels
    const linkLabels = linkLabelContainers
      .append("text")
      .attr("class", "pointer-events-none select-none")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#475569")
      .attr("opacity", 0.9)
      .text((d) => d.label || d.type);

    // Calculate background sizes based on text
    linkLabels.each(function (d, i) {
      const textNode = this as SVGTextElement;
      const bbox = textNode.getBBox();
      const padding = 4;

      linkLabelBgs
        .filter((_, j) => i === j)
        .attr("x", bbox.x - padding)
        .attr("y", bbox.y - padding)
        .attr("width", bbox.width + padding * 2)
        .attr("height", bbox.height + padding * 2);
    });

    // Create nodes
    const nodeGroup = container.append("g").attr("class", "nodes");

    const nodeElements = nodeGroup
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "node cursor-pointer");

    // Render each alpha card
    nodeElements.each(function (d) {
      const nodeGroup = select(this);
      const dims = calculateCardDimensions(d);

      // Card background
      nodeGroup
        .append("rect")
        .attr("class", "node-bg")
        .attr("x", -dims.width / 2)
        .attr("y", -dims.height / 2)
        .attr("width", dims.width)
        .attr("height", dims.height)
        .attr("rx", 8)
        .attr("fill", d.isPlaceholder ? "#f8fafc" : ALPHA_COLOR)
        .attr("stroke", d.isPlaceholder ? "#999" : ALPHA_COLOR)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", d.isPlaceholder ? "4,4" : "0")
        .attr("opacity", d.isPlaceholder ? 0.5 : 0.9);

      // Icon (if available)
      const iconRef = d.assetNames?.find((ref) => ref.type === "icon");
      const iconAsset = iconRef ? findAsset(iconRef.assetName, assets) : null;
      const iconSize = 24;

      if (iconAsset) {
        const iconX = -dims.width / 2 + (dims.width - iconSize) / 2;
        const iconY = -dims.height / 2 + 12;

        const iconColor = d.isPlaceholder ? ALPHA_COLOR : "#ffffff";
        const iconElement = createIconSvgElement(iconAsset, iconX, iconY, iconSize, iconColor);
        if (iconElement) {
          nodeGroup.node()?.appendChild(iconElement);
        }
      }

      // Alpha name text
      const maxChars = 16;
      const displayName = d.name.length > maxChars ? d.name.substring(0, maxChars - 2) + "..." : d.name;

      nodeGroup
        .append("text")
        .attr("x", 0)
        .attr("y", iconAsset ? -dims.height / 2 + 50 : 0)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("fill", d.isPlaceholder ? ALPHA_COLOR : "#ffffff")
        .attr("class", "pointer-events-none select-none")
        .text(displayName);

      // Add mouse events
      nodeGroup
        .on("mouseenter", function () {
          nodeGroup.selectAll(".node-bg").attr("opacity", d.isPlaceholder ? 0.7 : 1);
          setSelectedNode(d.id);

          // Highlight connected links and labels
          linkElements
            .attr("stroke-opacity", (link) => {
              const source = typeof link.source === "object" ? link.source.id : link.source;
              const target = typeof link.target === "object" ? link.target.id : link.target;
              return source === d.id || target === d.id ? 1 : 0.15;
            })
            .attr("stroke-width", (link) => {
              const source = typeof link.source === "object" ? link.source.id : link.source;
              const target = typeof link.target === "object" ? link.target.id : link.target;
              return source === d.id || target === d.id ? 3 : 2;
            });

          linkLabelContainers.attr("opacity", (link) => {
            const source = typeof link.source === "object" ? link.source.id : link.source;
            const target = typeof link.target === "object" ? link.target.id : link.target;
            return source === d.id || target === d.id ? 1 : 0.2;
          });
        })
        .on("mouseleave", function () {
          nodeGroup.selectAll(".node-bg").attr("opacity", d.isPlaceholder ? 0.5 : 0.9);
          setSelectedNode(null);
          linkElements.attr("stroke-opacity", 0.6).attr("stroke-width", 2);
          linkLabelContainers.attr("opacity", 1);
        });
    });

    // Add tooltips to nodes
    nodeElements.append("title").text((d) => {
      let text = `${d.name}`;
      if (d.focusName) text += `\nFocus: ${d.focusName}`;
      if (d.description) text += `\n${d.description}`;
      return text;
    });

    // Add drag behavior
    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) {
          // Reset tick count when user drags to allow simulation to run again
          tickCount = 0;
          simulation.alphaTarget(0.1).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep nodes fixed after dragging to prevent jitter
        // Comment out the next two lines if you want nodes to float back
        // d.fx = null;
        // d.fy = null;
      });

    nodeElements.call(dragBehavior);

    // Add zoom behavior
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      tickCount++;

      linkElements
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x || 0 : 0))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y || 0 : 0))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x || 0 : 0))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y || 0 : 0));

      // Position label containers at the midpoint of each edge
      linkLabelContainers.attr("transform", (d) => {
        const sx = typeof d.source === "object" ? d.source.x || 0 : 0;
        const tx = typeof d.target === "object" ? d.target.x || 0 : 0;
        const sy = typeof d.source === "object" ? d.source.y || 0 : 0;
        const ty = typeof d.target === "object" ? d.target.y || 0 : 0;
        return `translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`;
      });

      nodeElements.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);

      // Stop simulation after max ticks to prevent infinite running
      // Only enforce this limit during initial layout, not during drag operations
      if (tickCount > maxTicks && simulation.alpha() < 0.05) {
        simulation.stop();
        hasStoppedNaturally = true;
      }
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [topologyData, width, height, assets, resetTrigger]);

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
          This practice doesn't have alphas defined yet. Add alphas to visualize their relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex justify-end">
        <button
          onClick={() => setResetTrigger((prev) => prev + 1)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reset Layout
        </button>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Alpha Relationships</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(EDGE_COLORS).map(([type, color]) => {
            const count = stats.edgesByType[type as TopologyEdgeType] || 0;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-2">
                <div className="w-8 h-1" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium">
                  {type === "contributesTo" ? "Contributes To" : "Relates To"} ({count})
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p className="font-medium mb-1">Total: {stats.totalNodes} alphas</p>
          <p className="font-medium mb-2">Interactions:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Drag alphas to reposition them (they stay where you place them)</li>
            <li>Hover over alphas to highlight connections</li>
            <li>Scroll to zoom in/out</li>
            <li>Pan by dragging the background</li>
            <li>Click "Reset Layout" to recalculate positions</li>
            <li>
              <em>Dashed nodes</em> are referenced from baseline or other practices
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
        <p className="font-medium mb-2">Understanding the Alpha Topology:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Alphas</strong> (blue cards) represent essential elements of concern in the practice
          </li>
          <li>
            <strong>Contributes To</strong> (violet arrows) shows hierarchical alpha relationships (specialization)
          </li>
          <li>
            <strong>Relates To</strong> (emerald arrows) shows semantic relationships with custom labels (depends on, influences, constrains, etc.)
          </li>
          <li>Edge labels show the specific relationship type between alphas</li>
        </ul>
      </div>
    </div>
  );
}
