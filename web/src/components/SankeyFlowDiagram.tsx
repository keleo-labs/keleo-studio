"use client";

import { useEffect, useRef, useState } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyGraph,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from "d3-sankey";
import {
  extractSankeyFlowData,
  calculateFlowStats,
  type SankeyNode,
  type SankeyLink,
} from "@/lib/sankeyFlowData";

type SankeyFlowDiagramProps = {
  practice: any;
  width?: number;
  height?: number;
};

type ExtendedSankeyNode = D3SankeyNode<SankeyNode, SankeyLink> & SankeyNode;
type ExtendedSankeyLink = D3SankeyLink<SankeyNode, SankeyLink> & SankeyLink;

const CATEGORY_COLORS = {
  activity: "#06c",
  workProduct: "#f59e0b",
  alphaState: "#10b981",
} as const;

export default function SankeyFlowDiagram({
  practice,
  width = 1400,
  height = 800,
}: SankeyFlowDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [flowData, setFlowData] = useState<ReturnType<typeof extractSankeyFlowData> | null>(null);

  useEffect(() => {
    if (!practice) return;

    try {
      const data = extractSankeyFlowData(practice);
      // Validate that we have some data
      if (data.nodes.length === 0) {
        console.warn("No flow data found in practice");
      }
      setFlowData(data);
    } catch (error) {
      console.error("Error extracting Sankey data:", error);
      setFlowData({ nodes: [], links: [] });
    }
  }, [practice]);

  useEffect(() => {
    if (!flowData || !svgRef.current) return;

    const svg = svgRef.current;
    const margin = { top: 20, right: 160, bottom: 20, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create Sankey layout
    const sankeyLayout = d3Sankey<SankeyNode, SankeyLink>()
      .nodeId((d) => d.id)
      .nodeWidth(20)
      .nodePadding(20)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    // Prepare graph data
    const graph: SankeyGraph<SankeyNode, SankeyLink> = {
      nodes: flowData.nodes.map((n) => ({ ...n })),
      links: flowData.links.map((l) => ({ ...l })),
    };

    // Compute layout
    const { nodes, links } = sankeyLayout(graph);

    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create SVG groups
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(g);

    // Draw links
    const linkGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linkGroup.setAttribute("class", "links");
    linkGroup.setAttribute("fill", "none");
    g.appendChild(linkGroup);

    links.forEach((link) => {
      const extLink = link as ExtendedSankeyLink;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = sankeyLinkHorizontal()(link);
      if (d) {
        path.setAttribute("d", d);
      }
      path.setAttribute("stroke", "#cbd5e1");
      path.setAttribute("stroke-width", String(Math.max(1, link.width || 1)));
      path.setAttribute("opacity", "0.4");
      path.setAttribute("class", "transition-opacity duration-200");

      // Add hover effect
      path.addEventListener("mouseenter", () => {
        path.setAttribute("opacity", "0.7");
        path.setAttribute("stroke", "#475569");
      });
      path.addEventListener("mouseleave", () => {
        path.setAttribute("opacity", "0.4");
        path.setAttribute("stroke", "#cbd5e1");
      });

      // Tooltip
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      const sourceNode = link.source as ExtendedSankeyNode;
      const targetNode = link.target as ExtendedSankeyNode;
      title.textContent = `${sourceNode.name} → ${targetNode.name} (${link.value})`;
      path.appendChild(title);

      linkGroup.appendChild(path);
    });

    // Draw nodes
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", "nodes");
    g.appendChild(nodeGroup);

    nodes.forEach((node) => {
      const extNode = node as ExtendedSankeyNode;
      const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      nodeG.setAttribute("class", "node");

      // Node rectangle
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(node.x0 || 0));
      rect.setAttribute("y", String(node.y0 || 0));
      rect.setAttribute("width", String((node.x1 || 0) - (node.x0 || 0)));
      rect.setAttribute("height", String((node.y1 || 0) - (node.y0 || 0)));
      rect.setAttribute("fill", CATEGORY_COLORS[extNode.category]);
      rect.setAttribute("opacity", "0.8");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1");
      rect.setAttribute("rx", "3");
      rect.setAttribute("class", "transition-opacity duration-200 cursor-pointer");

      // Hover effects
      rect.addEventListener("mouseenter", () => {
        rect.setAttribute("opacity", "1");
        setHoveredNode(extNode.id);
      });
      rect.addEventListener("mouseleave", () => {
        rect.setAttribute("opacity", "0.8");
        setHoveredNode(null);
      });

      // Tooltip
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = extNode.description
        ? `${extNode.name}\n${extNode.description}`
        : extNode.name;
      rect.appendChild(title);

      nodeG.appendChild(rect);

      // Node label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const x = (node.x0 || 0) < width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6;
      const y = ((node.y0 || 0) + (node.y1 || 0)) / 2;
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y));
      text.setAttribute("dy", "0.35em");
      text.setAttribute("text-anchor", (node.x0 || 0) < width / 2 ? "start" : "end");
      text.setAttribute("font-size", "12");
      text.setAttribute("fill", "#1e293b");
      text.setAttribute("font-weight", "500");
      text.setAttribute("class", "pointer-events-none select-none");

      // Truncate long names
      const maxLength = 30;
      const displayName =
        extNode.name.length > maxLength
          ? extNode.name.substring(0, maxLength) + "..."
          : extNode.name;
      text.textContent = displayName;

      nodeG.appendChild(text);
      nodeGroup.appendChild(nodeG);
    });
  }, [flowData, width, height]);

  if (!flowData) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading flow diagram...
      </div>
    );
  }

  const stats = calculateFlowStats(flowData);

  // Show message if no flow data
  if (flowData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-600">
        <p className="text-lg font-medium mb-2">No Flow Data Available</p>
        <p className="text-sm text-gray-500 max-w-md text-center">
          This practice doesn't have activities or work products defined yet, or they don't have
          flow relationships (worksOn / contributesTo).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend and Stats */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: CATEGORY_COLORS.activity }} />
            <span className="text-sm font-medium">Activities ({stats.activityCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: CATEGORY_COLORS.workProduct }}
            />
            <span className="text-sm font-medium">Work Products ({stats.workProductCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: CATEGORY_COLORS.alphaState }}
            />
            <span className="text-sm font-medium">Alpha States ({stats.alphaStateCount})</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Flows: {stats.linkCount} | Flow Value: {stats.totalFlow}
        </div>
      </div>

      {/* Sankey Diagram */}
      <div className="border rounded-lg bg-white p-4 overflow-auto">
        <svg ref={svgRef} width={width} height={height} className="mx-auto" />
      </div>

      {/* Description */}
      <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-lg">
        <p className="font-medium mb-2">How to read this diagram:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Activities</strong> (blue) on the left show the work being performed
          </li>
          <li>
            <strong>Work Products</strong> (orange) in the middle show artifacts being created or
            evolved
          </li>
          <li>
            <strong>Alpha States</strong> (green) on the right show the progress states being
            achieved
          </li>
          <li>The width of flows indicates the strength of relationships (connection count)</li>
          <li>Hover over nodes and links to see details</li>
        </ul>
      </div>
    </div>
  );
}
