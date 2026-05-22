"use client";

import { useState, useEffect } from "react";
import { Content, ContentVariants } from "@patternfly/react-core";
import {
  extractProgressiveFlowData,
  calculateProgressiveFlowStats,
  type ProgressiveFlowData,
  type PersonaGroupFlow,
} from "@/lib/progressiveFlowData";

/**
 * Progressive Flow Diagram
 *
 * Horizontal linear flow visualization showing:
 * [PersonaGroup] → [Activity] → [Alpha:State] → [Activity] → [State] → ...
 * One flow per PersonaGroup
 */

/**
 * Horizontal Flow Component
 * Renders a single horizontal flow for one PersonaGroup
 * Activities are repeated before each alpha state they contribute to
 */
function HorizontalFlow({ flow }: { flow: PersonaGroupFlow }) {
  const nodeSpacing = 200;
  const nodeHeight = 60;
  const threadSpacing = 90;
  const startX = 20;
  const startY = 40;

  // Calculate node positions
  const nodePositions = new Map<string, { x: number; y: number }>();

  const personaGroupNode = flow.nodes.find(n => n.type === "personaGroup");
  if (!personaGroupNode) return null;

  // Position PersonaGroup node
  nodePositions.set(personaGroupNode.id, { x: startX, y: startY });

  // Group nodes by alpha to create threads
  type ThreadItem = {
    nodeId: string;
    stateSeq: number;
  };

  type Thread = {
    alphaName: string;
    items: ThreadItem[];
  };

  const threads: Thread[] = [];
  const alphaThreadMap = new Map<string, Thread>();

  // Build threads from the link structure
  // Each alpha state defines a thread
  for (const node of flow.nodes) {
    if (node.type === "alphaState" && node.alphaName) {
      if (!alphaThreadMap.has(node.alphaName)) {
        const thread: Thread = { alphaName: node.alphaName, items: [] };
        alphaThreadMap.set(node.alphaName, thread);
        threads.push(thread);
      }
    }
  }

  // Build sequential chains for each alpha
  // Follow links to construct: Activity -> State -> Activity -> State
  for (const thread of threads) {
    const { alphaName } = thread;
    const visited = new Set<string>();

    // Find activities that target states in this alpha
    const alphaActivities = flow.nodes.filter(n =>
      n.type === "activity" &&
      flow.links.some(link => {
        const target = flow.nodes.find(tn => tn.id === link.targetId);
        return link.sourceId === n.id &&
               target?.type === "alphaState" &&
               target.alphaName === alphaName;
      })
    );

    // Find the first activity (one not preceded by a state in this alpha)
    let currentActivityId: string | null = null;
    for (const activity of alphaActivities) {
      const incomingFromState = flow.links.some(link => {
        const source = flow.nodes.find(n => n.id === link.sourceId);
        return link.targetId === activity.id &&
               source?.type === "alphaState" &&
               source.alphaName === alphaName;
      });

      if (!incomingFromState) {
        currentActivityId = activity.id;
        break;
      }
    }

    // Follow the chain: Activity -> State -> Activity -> State
    while (currentActivityId && !visited.has(currentActivityId)) {
      visited.add(currentActivityId);

      const activityNode = flow.nodes.find(n => n.id === currentActivityId);
      if (!activityNode) break;

      // Find the state this activity leads to
      const stateLink = flow.links.find(link =>
        link.sourceId === currentActivityId &&
        flow.nodes.find(n => n.id === link.targetId && n.type === "alphaState" && n.alphaName === alphaName)
      );

      if (!stateLink) break;

      const stateNode = flow.nodes.find(n => n.id === stateLink.targetId);
      if (!stateNode || stateNode.type !== "alphaState") break;

      // Add activity and state to thread
      thread.items.push({ nodeId: currentActivityId, stateSeq: stateNode.stateSeq || 0 });
      thread.items.push({ nodeId: stateNode.id, stateSeq: stateNode.stateSeq || 0 });

      // Find next activity (one that comes after this state)
      const nextActivityLink = flow.links.find(link => link.sourceId === stateNode.id);
      currentActivityId = nextActivityLink?.targetId || null;

      if (visited.has(currentActivityId || "")) break;
    }
  }

  // Sort threads by minimum stateSeq
  threads.sort((a, b) => {
    const minSeqA = Math.min(...a.items.map(item => item.stateSeq), Infinity);
    const minSeqB = Math.min(...b.items.map(item => item.stateSeq), Infinity);
    return minSeqA - minSeqB;
  });

  // Position nodes in threads
  for (let threadIdx = 0; threadIdx < threads.length; threadIdx++) {
    const thread = threads[threadIdx];
    const threadY = startY + threadIdx * threadSpacing;
    let colIdx = 1; // Start after PersonaGroup

    for (const item of thread.items) {
      if (!nodePositions.has(item.nodeId)) {
        const x = startX + colIdx * nodeSpacing;
        nodePositions.set(item.nodeId, { x, y: threadY });
        colIdx++;
      }
    }
  }

  // Calculate SVG dimensions
  const maxX = Math.max(...Array.from(nodePositions.values()).map(p => p.x), startX) + 200;
  const maxY = Math.max(...Array.from(nodePositions.values()).map(p => p.y), startY) + 60;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--100)" }}>
        {flow.personaGroupName}
      </h4>
      <svg
        width={maxX}
        height={maxY}
        style={{
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          borderRadius: "4px",
        }}
      >
        {/* Render links first (background) */}
        <g className="links">
          {flow.links.map((link, idx) => {
            const sourcePos = nodePositions.get(link.sourceId);
            const targetPos = nodePositions.get(link.targetId);

            if (!sourcePos || !targetPos) return null;

            const sourceNode = flow.nodes.find(n => n.id === link.sourceId);
            const targetNode = flow.nodes.find(n => n.id === link.targetId);

            // Calculate connection points
            const sourceWidth = sourceNode?.type === "personaGroup" ? 160 : sourceNode?.type === "activity" ? 180 : 160;

            const x1 = sourcePos.x + sourceWidth;
            const y1 = sourcePos.y + nodeHeight / 2;
            const x2 = targetPos.x;
            const y2 = targetPos.y + nodeHeight / 2;

            // Bezier curve for smooth connections
            const dx = x2 - x1;
            const controlOffset = Math.min(dx / 2, 60);
            const cx1 = x1 + controlOffset;
            const cy1 = y1;
            const cx2 = x2 - controlOffset;
            const cy2 = y2;

            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            return (
              <path
                key={`link-${idx}`}
                d={pathD}
                stroke="#6b7280"
                strokeWidth={2.5}
                strokeDasharray="8 4"
                fill="none"
                opacity={0.6}
              />
            );
          })}
        </g>


        {/* Render nodes */}
        <g className="nodes">
          {flow.nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            if (node.type === "personaGroup") {
              const width = 160;
              const lines = wrapText(node.label, 18);

              return (
                <g key={node.id}>
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={width}
                    height={nodeHeight}
                    rx={4}
                    fill="rgba(139, 92, 246, 0.15)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                  {lines.map((line, idx) => (
                    <text
                      key={idx}
                      x={pos.x + width / 2}
                      y={pos.y + nodeHeight / 2 - (lines.length - 1) * 5 + idx * 13}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11px"
                      fontWeight="700"
                      fill="#8b5cf6"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            }

            if (node.type === "activity") {
              // Chevron arrow shape
              const width = 180;
              const notch = 20;
              const points = [
                `${pos.x},${pos.y}`,
                `${pos.x + width - notch},${pos.y}`,
                `${pos.x + width},${pos.y + nodeHeight / 2}`,
                `${pos.x + width - notch},${pos.y + nodeHeight}`,
                `${pos.x},${pos.y + nodeHeight}`,
              ].join(" ");

              const lines = wrapText(node.label, 22);

              return (
                <g key={node.id}>
                  <title>{node.description || node.label}</title>
                  <polygon
                    points={points}
                    fill="var(--pf-v6-global--primary-color--100)"
                    stroke="var(--pf-v6-global--BorderColor--100)"
                    strokeWidth={1.5}
                  />
                  {lines.map((line, idx) => (
                    <text
                      key={idx}
                      x={pos.x + width / 2}
                      y={pos.y + nodeHeight / 2 - (lines.length - 1) * 5 + idx * 13}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10px"
                      fontWeight="600"
                      fill="white"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            }

            if (node.type === "alphaState") {
              const width = 160;
              const alphaLines = wrapText(node.alphaName || "", 18);
              const stateLines = wrapText(node.stateName || "", 18);

              return (
                <g key={node.id}>
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={width}
                    height={nodeHeight}
                    rx={4}
                    fill="rgba(16, 185, 129, 0.15)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  {alphaLines.map((line, idx) => (
                    <text
                      key={`alpha-${idx}`}
                      x={pos.x + width / 2}
                      y={pos.y + nodeHeight / 2 - 12 - (alphaLines.length - 1) * 5 + idx * 12}
                      textAnchor="middle"
                      fontSize="10px"
                      fontWeight="700"
                      fill="#10b981"
                    >
                      {line}
                    </text>
                  ))}
                  {stateLines.map((line, idx) => (
                    <text
                      key={`state-${idx}`}
                      x={pos.x + width / 2}
                      y={pos.y + nodeHeight / 2 + 4 + idx * 11}
                      textAnchor="middle"
                      fontSize="9px"
                      fontWeight="400"
                      fill="#059669"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            }

            return null;
          })}
        </g>
      </svg>
    </div>
  );
}

/**
 * Legend Component
 */
function Legend() {
  return (
    <div style={{ marginBottom: "1rem", display: "flex", gap: "2rem", fontSize: "0.875rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg width="40" height="20">
          <polygon
            points="0,0 32,0 40,10 32,20 0,20"
            fill="var(--pf-v6-global--primary-color--100)"
            stroke="var(--pf-v6-global--BorderColor--100)"
            strokeWidth={1}
          />
        </svg>
        <span style={{ color: "var(--pf-v6-global--Color--200)" }}>Activity</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg width="40" height="20">
          <rect
            x={2}
            y={2}
            width={36}
            height={16}
            rx={2}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10b981"
            strokeWidth={2}
          />
        </svg>
        <span style={{ color: "var(--pf-v6-global--Color--200)" }}>Alpha State</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg width="40" height="20">
          <rect width={40} height={20} rx={2} fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" strokeWidth={2} />
        </svg>
        <span style={{ color: "var(--pf-v6-global--Color--200)" }}>PersonaGroup</span>
      </div>
    </div>
  );
}

/**
 * Statistics Component
 */
function Statistics({ flowData }: { flowData: ProgressiveFlowData }) {
  const stats = calculateProgressiveFlowStats(flowData);

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "0.75rem",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
        borderRadius: "4px",
        fontSize: "0.875rem",
        color: "var(--pf-v6-global--Color--200)",
      }}
    >
      <strong>{stats.personaGroupCount}</strong> PersonaGroups ·{" "}
      <strong>{stats.activityCount}</strong> Activities ·{" "}
      <strong>{stats.stateCount}</strong> States
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        color: "var(--pf-v6-global--Color--200)",
        border: "1px dashed var(--pf-v6-global--BorderColor--100)",
        borderRadius: "4px",
      }}
    >
      <Content component={ContentVariants.p}>
        No progressive flow data available. Ensure Activities are assigned to PersonaGroups and contribute to Alpha States.
      </Content>
    </div>
  );
}

/**
 * Text wrapping utility
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Text truncation utility (fallback)
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + "…";
}

/**
 * Main Progressive Flow Diagram Component
 */
export default function ProgressiveFlowDiagram({
  practice,
  width = 1400,
}: {
  practice: any;
  width?: number;
}) {
  const [flowData, setFlowData] = useState<ProgressiveFlowData | null>(null);

  // Extract data when practice changes
  useEffect(() => {
    try {
      const data = extractProgressiveFlowData(practice);
      setFlowData(data);
    } catch (error) {
      console.error("Error extracting progressive flow data:", error);
      setFlowData(null);
    }
  }, [practice]);

  if (!flowData || flowData.flows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="progressive-flow-diagram">
      <Legend />
      {flowData.flows.map((flow, idx) => (
        <HorizontalFlow key={idx} flow={flow} />
      ))}
      <Statistics flowData={flowData} />
    </div>
  );
}
