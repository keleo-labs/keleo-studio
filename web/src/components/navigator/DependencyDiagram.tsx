"use client";

import { computeEdgePath, computeNodeStyle } from "@/lib/diagrams/dependencyTree";
import type { DependencyDiagramLayout } from "@/lib/diagrams/dependencyTree";

interface DependencyDiagramProps {
  layout: DependencyDiagramLayout;
  selectedElement: string | null;
  onSelectElement: (name: string | null) => void;
}

export function DependencyDiagram({
  layout,
  selectedElement,
  onSelectElement,
}: DependencyDiagramProps) {
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <svg
        viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
        width={layout.viewBoxWidth}
        height={layout.viewBoxHeight}
        style={{ display: "block" }}
      >
        <defs>
          <marker
            id="dep-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="rgba(102,102,102,0.7)" />
          </marker>
        </defs>

        {/* Layer 1: Group backgrounds */}
        {layout.groups.map((group) => (
          <g key={`group-${group.baselineName}`}>
            <rect
              x={group.x}
              y={group.y}
              width={group.width}
              height={group.height}
              rx={6}
              ry={6}
              fill="var(--pf-v6-global--BackgroundColor--200, #f5f5f5)"
              stroke="var(--pf-v6-global--BorderColor--100, #d2d2d2)"
              strokeWidth={1}
              opacity={0.5}
            />
            <text
              x={group.x + 8}
              y={group.y + 16}
              fontSize={11}
              fill="var(--pf-v6-global--Color--200, #6a6e73)"
              fontFamily="var(--pf-v6-global--FontFamily--text)"
            >
              {group.baselineName}
            </text>
          </g>
        ))}

        {/* Layer 2: Edges — perpendicular-tangent bezier curves */}
        {layout.edges.map((edge) => (
          <path
            key={`edge-${edge.fromName}-${edge.toName}`}
            d={computeEdgePath(edge)}
            fill="none"
            stroke="rgba(102,102,102,0.6)"
            strokeWidth={1.5}
            markerEnd="url(#dep-arrow)"
          />
        ))}

        {/* Layer 3: Node cards */}
        {layout.nodes.map((node) => {
          const isSelected = selectedElement === node.name;
          const style = computeNodeStyle(node, isSelected);

          return (
            <g
              key={`node-${node.name}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (node.kind === "root") return;
                onSelectElement(isSelected ? null : node.name);
              }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={4}
                ry={4}
                fill={style.fillColor}
                stroke={style.borderColor}
                strokeWidth={style.strokeWidth}
              />
              <foreignObject
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 10px",
                    height: "100%",
                    overflow: "hidden",
                  }}
                >
                  <i
                    className={style.isBaselineOrRoot ? "fa-solid fa-layer-group" : "fa-solid fa-puzzle-piece"}
                    style={{
                      fontSize: "0.75rem",
                      color: style.iconColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        color: "#151515",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: node.version ? 1 : 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.3,
                      }}
                      title={node.name}
                    >
                      {node.name}
                    </span>
                    {node.version && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.5625rem",
                          color: "#6a6e73",
                          lineHeight: 1.2,
                          marginTop: "1px",
                        }}
                      >
                        v{node.version}
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
