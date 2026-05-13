"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Title } from "@patternfly/react-core";
import {
  extractKanbanPatternData,
  calculateKanbanStats,
  buildAlphaSwimLanes,
  buildWorkProductSwimLanes,
  type KanbanColumn,
  type KanbanCard,
  type AlphaSwimLane,
  type WorkProductSwimLane,
} from "@/lib/kanbanPatternData";

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type KanbanPatternBoardPFProps = {
  pattern: any;
  baseline: any;
};

const CARD_COLORS = {
  alphaState: {
    bg: "var(--pf-v6-global--palette--purple-50)",
    border: "var(--pf-v6-global--palette--purple-300)",
    badge: "var(--pf-v6-global--palette--purple-600)",
  },
  alphaInstance: {
    bg: "var(--pf-v6-global--palette--green-50)",
    border: "var(--pf-v6-global--palette--green-300)",
    badge: "var(--pf-v6-global--palette--green-600)",
  },
  activity: {
    bg: "var(--pf-v6-global--palette--blue-50)",
    border: "var(--pf-v6-global--palette--blue-300)",
    badge: "var(--pf-v6-global--palette--blue-600)",
  },
  workProduct: {
    bg: "var(--pf-v6-global--palette--orange-50)",
    border: "var(--pf-v6-global--palette--orange-300)",
    badge: "var(--pf-v6-global--palette--orange-600)",
  },
};

function AlphaStateCell({ card }: { card: KanbanCard | null }) {
  if (!card) {
    return (
      <div
        style={{
          minHeight: "2.5rem",
          padding: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  // For instances, show "Instance : Alpha" plus state; for generic states, show just state name
  const isInstance = card.type === "alphaInstance";
  const displayText = isInstance ? card.name : (card.subtitle || "");
  const linkTarget = isInstance ? `#alpha-${slug(card.parentName || card.name)}` : `#alpha-${slug(card.name)}`;
  const tooltipText = card.description || (isInstance ? `${card.name} ${card.subtitle || ""}` : `${card.name} → ${card.subtitle}`);

  return (
    <div style={{ padding: "0.5rem" }}>
      <a
        href={linkTarget}
        style={{
          textDecoration: "none",
          display: "inline-block",
        }}
        title={tooltipText}
      >
        <span
          style={{
            display: "inline-block",
            padding: "0.125rem 0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "#FFFFFF",
            backgroundColor: isInstance ? "#3E8635" : "#8B4DAD",
            borderRadius: "3px",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
            maxWidth: "100%",
          }}
        >
          {displayText}
          {isInstance && card.subtitle && (
            <div style={{ fontSize: "0.75rem", opacity: 0.9, marginTop: "0.125rem" }}>
              {card.subtitle}
            </div>
          )}
        </span>
      </a>
    </div>
  );
}

function WorkProductStateCell({ card }: { card: KanbanCard | null }) {
  if (!card) {
    return (
      <div
        style={{
          minHeight: "2.5rem",
          padding: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  // For instances, show "Instance : WorkProduct" plus level; for generic work products, show just level name
  const isInstance = card.metadata?.isInstance === true;
  const displayText = isInstance ? card.name : (card.subtitle || "");
  const linkTarget = `#workproduct-${slug(card.parentName || card.name)}`;
  const tooltipText = card.description || (isInstance ? `${card.name} (${card.subtitle})` : `${card.name} (${card.subtitle})`);

  return (
    <div style={{ padding: "0.5rem" }}>
      <a
        href={linkTarget}
        style={{
          textDecoration: "none",
          display: "inline-block",
        }}
        title={tooltipText}
      >
        <span
          style={{
            display: "inline-block",
            padding: "0.125rem 0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "#FFFFFF",
            backgroundColor: isInstance ? "#F0AB00" : "#EC7A08",
            borderRadius: "3px",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
            maxWidth: "100%",
          }}
        >
          {displayText}
          {isInstance && card.subtitle && (
            <div style={{ fontSize: "0.75rem", opacity: 0.9, marginTop: "0.125rem" }}>
              ({card.subtitle})
            </div>
          )}
        </span>
      </a>
    </div>
  );
}

function ActivityCard({ card }: { card: KanbanCard }) {
  const linkTarget = `#activity-${slug(card.name)}`;
  const tooltipText = card.description || card.name;

  return (
    <div style={{ marginBottom: "0.375rem" }}>
      <a
        href={linkTarget}
        style={{
          textDecoration: "none",
          display: "inline-block",
        }}
        title={tooltipText}
      >
        <span
          style={{
            display: "inline-block",
            padding: "0.125rem 0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "#FFFFFF",
            backgroundColor: "#06C",
            borderRadius: "3px",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
            maxWidth: "100%",
          }}
        >
          {card.name}
        </span>
      </a>
    </div>
  );
}

export default function KanbanPatternBoardPF({ pattern, baseline }: KanbanPatternBoardPFProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [swimLanes, setSwimLanes] = useState<AlphaSwimLane[]>([]);
  const [workProductSwimLanes, setWorkProductSwimLanes] = useState<WorkProductSwimLane[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pattern || !baseline) {
      setLoading(false);
      return;
    }

    try {
      const data = extractKanbanPatternData(pattern, baseline);
      setColumns(data);
      setSwimLanes(buildAlphaSwimLanes(data));
      setWorkProductSwimLanes(buildWorkProductSwimLanes(data));
    } catch (error) {
      console.error("Error extracting Kanban data:", error);
      setColumns([]);
      setSwimLanes([]);
      setWorkProductSwimLanes([]);
    } finally {
      setLoading(false);
    }
  }, [pattern, baseline]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "24rem", color: "var(--pf-v6-global--Color--200)" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "2rem",
              height: "2rem",
              border: "4px solid currentColor",
              borderRightColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "1rem",
            }}
          />
          <p>Loading pattern board...</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "24rem",
          color: "var(--pf-v6-global--Color--200)",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "0.5rem" }}>No Pattern Views Available</p>
        <p style={{ fontSize: "0.875rem", textAlign: "center", maxWidth: "28rem" }}>
          This pattern doesn't have any pattern views defined. Pattern views represent the temporal
          progression through the practice.
        </p>
      </div>
    );
  }

  const stats = calculateKanbanStats(columns);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "linear-gradient(90deg, var(--pf-v6-global--palette--purple-50), var(--pf-v6-global--palette--blue-50))",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
          border: "1px solid var(--pf-v6-global--palette--purple-200)",
        }}
      >
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>📊</span>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", fontWeight: 600 }}>
                Pattern Views
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{stats.columnCount}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🎯</span>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", fontWeight: 600 }}>
                Alpha Swim Lanes
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{swimLanes.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>⚡</span>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", fontWeight: 600 }}>Activities</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{stats.totalActivities}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>📄</span>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", textTransform: "uppercase", fontWeight: 600 }}>WP Swim Lanes</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{workProductSwimLanes.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board with Swim Lanes */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 0, minWidth: "100%" }}>
          {/* Column Headers */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--pf-v6-global--BorderColor--100)" }}>
            {/* Row header column */}
            <div
              style={{
                width: "12rem",
                flexShrink: 0,
                padding: "0.75rem",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                borderRight: "2px solid var(--pf-v6-global--BorderColor--100)",
              }}
            >
              <h4 style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>Alpha</h4>
            </div>
            {/* Pattern view columns */}
            {columns.map((column) => (
              <div
                key={column.id}
                style={{
                  width: "16rem",
                  flexShrink: 0,
                  padding: "0.75rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <h4 style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>{column.name}</h4>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--primary-color--100)",
                      backgroundColor: "var(--pf-v6-global--primary-color--100)",
                      opacity: 0.1,
                      padding: "0.125rem 0.375rem",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    }}
                  >
                    #{column.seq}
                  </span>
                </div>
                {column.description && (
                  <p style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", margin: "0.25rem 0 0 0" }}>
                    {column.description}
                  </p>
                )}
                {column.narrative && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.375rem",
                      backgroundColor: "var(--pf-v6-global--palette--blue-50)",
                      border: "1px solid var(--pf-v6-global--palette--blue-200)",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      fontSize: "0.625rem",
                      color: "var(--pf-v6-global--palette--blue-700)",
                      fontStyle: "italic",
                    }}
                  >
                    💡 {column.narrative}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Alpha Swim Lanes */}
          {swimLanes.map((lane) => (
            <div
              key={lane.alphaName}
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
              }}
            >
              {/* Row header */}
              <div
                style={{
                  width: "12rem",
                  flexShrink: 0,
                  padding: "0.75rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                  borderRight: "2px solid var(--pf-v6-global--BorderColor--100)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div>
                  <a
                    href={`#alpha-${slug(lane.alphaName)}`}
                    style={{ textDecoration: "none", display: "inline-block" }}
                    title={lane.alphaName}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.125rem 0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        lineHeight: 1.4,
                        color: "#FFFFFF",
                        backgroundColor: "#8B4DAD",
                        borderRadius: "3px",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        hyphens: "auto",
                        maxWidth: "10rem",
                      }}
                    >
                      {lane.alphaName}
                    </span>
                  </a>
                  <p style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", margin: "0.25rem 0 0 0" }}>→ State Progression</p>
                </div>
              </div>
              {/* State cells */}
              {lane.stateByColumn.map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    width: "16rem",
                    flexShrink: 0,
                    padding: "0.5rem",
                    borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
                  }}
                >
                  <AlphaStateCell card={card} />
                </div>
              ))}
            </div>
          ))}

          {/* Work Product Swim Lanes */}
          {workProductSwimLanes.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 0, borderTop: "2px solid var(--pf-v6-global--BorderColor--100)", borderBottom: "2px solid var(--pf-v6-global--BorderColor--100)", marginTop: "0.5rem" }}>
                <div
                  style={{
                    width: "12rem",
                    flexShrink: 0,
                    padding: "0.75rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                    borderRight: "2px solid var(--pf-v6-global--BorderColor--100)",
                  }}
                >
                  <h4 style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>Work Product</h4>
                </div>
                {/* Pattern view columns (headers for work products, can be empty or minimal) */}
                {columns.map((column) => (
                  <div
                    key={column.id}
                    style={{
                      width: "16rem",
                      flexShrink: 0,
                      padding: "0.75rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
                    }}
                  />
                ))}
              </div>

              {workProductSwimLanes.map((lane) => (
                <div
                  key={lane.workProductName}
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                  }}
                >
                  {/* Row header */}
                  <div
                    style={{
                      width: "12rem",
                      flexShrink: 0,
                      padding: "0.75rem",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                      borderRight: "2px solid var(--pf-v6-global--BorderColor--100)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <a
                        href={`#workproduct-${slug(lane.workProductName)}`}
                        style={{ textDecoration: "none", display: "inline-block" }}
                        title={lane.workProductName}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.125rem 0.5rem",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: "#FFFFFF",
                            backgroundColor: "#EC7A08",
                            borderRadius: "3px",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            hyphens: "auto",
                            maxWidth: "10rem",
                          }}
                        >
                          {lane.workProductName}
                        </span>
                      </a>
                      <p style={{ fontSize: "0.625rem", color: "var(--pf-v6-global--Color--200)", margin: "0.25rem 0 0 0" }}>→ Level Progression</p>
                    </div>
                  </div>
                  {/* Level cells */}
                  {lane.levelByColumn.map((card, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: "16rem",
                        flexShrink: 0,
                        padding: "0.5rem",
                        borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
                      }}
                    >
                      <WorkProductStateCell card={card} />
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Activities Section */}
          <div style={{ display: "flex", gap: 0, borderTop: "2px solid var(--pf-v6-global--BorderColor--100)", marginTop: "0.5rem" }}>
            <div
              style={{
                width: "12rem",
                flexShrink: 0,
                padding: "0.75rem",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                borderRight: "2px solid var(--pf-v6-global--BorderColor--100)",
              }}
            >
              <h4 style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>Activities</h4>
            </div>
            {columns.map((column) => (
              <div
                key={column.id}
                style={{
                  width: "16rem",
                  flexShrink: 0,
                  padding: "0.75rem",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
                }}
              >
                {/* Activities */}
                {column.activityCards.length > 0 ? (
                  <div>
                    {column.activityCards.map((card) => (
                      <ActivityCard key={card.id} card={card} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
                    No activities
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "var(--pf-v6-global--palette--blue-50)",
          border: "1px solid var(--pf-v6-global--palette--blue-200)",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        }}
      >
        <h5 style={{ fontWeight: 600, color: "var(--pf-v6-global--palette--blue-700)", marginBottom: "0.5rem", marginTop: 0 }}>
          📖 How to Read This Board
        </h5>
        <ul style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--palette--blue-700)", marginBottom: 0, paddingLeft: "1.25rem" }}>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Vertical columns</strong> represent Pattern Views (temporal phases) — read left-to-right for chronological progression
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Alpha swim lanes (top section)</strong>: Each row shows how an alpha progresses through states across pattern views. Purple cells show generic states; green cells show specific instances using <strong>instance : alpha</strong> notation.
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Work Product swim lanes (middle section)</strong>: Each row shows how a work product evolves through levels of detail across pattern views. Orange cells show generic levels; yellow cells show specific instances using <strong>instance : workProduct</strong> notation.
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Activities (bottom section)</strong>: Work performed in each pattern view to advance alphas and produce work products
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            Empty cells indicate the alpha or work product doesn't appear in that phase
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Click any label</strong> to jump to the element's full definition elsewhere in the document
          </li>
          <li style={{ marginBottom: "0.25rem" }}>
            <strong>Hover over labels</strong> to see descriptions in tooltips
          </li>
          <li>
            Read <strong>horizontally</strong> across swim lanes to track progression of individual alphas or work products
          </li>
        </ul>
      </div>
    </div>
  );
}
