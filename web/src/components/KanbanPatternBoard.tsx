"use client";

import { useEffect, useState } from "react";
import {
  extractKanbanPatternData,
  calculateKanbanStats,
  buildAlphaSwimLanes,
  type KanbanColumn,
  type KanbanCard,
  type KanbanCardType,
  type AlphaSwimLane,
} from "@/lib/kanbanPatternData";
import { findAsset } from "@/lib/assetUtils";
import type { Asset } from "@/lib/types";
import { IconAsset } from "@/components/IconAsset";

type KanbanPatternBoardProps = {
  pattern: any;
  baseline: any;
};

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CARD_COLORS: Record<KanbanCardType, { bg: string; border: string; badge: string }> = {
  alphaState: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-600 text-white",
  },
  alphaInstance: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-300 dark:border-green-700",
    badge: "bg-green-600 text-white",
  },
  activity: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-600 text-white",
  },
  workProduct: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-300 dark:border-orange-700",
    badge: "bg-orange-600 text-white",
  },
};

const CARD_LABELS: Record<KanbanCardType, string> = {
  alphaState: "Alpha State",
  alphaInstance: "Instance",
  activity: "Activity",
  workProduct: "Work Product",
};

function AlphaStateCard({ card }: { card: KanbanCard | null }) {
  if (!card) {
    return <div className="h-20 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50" />;
  }

  const colors = CARD_COLORS[card.type];
  const tooltipText = [
    `${card.name} → ${card.subtitle}`,
    card.description ? card.description : null
  ].filter(Boolean).join('\n\n');
  const linkTarget = `#alpha-${slug(card.name)}`;

  return (
    <a
      href={linkTarget}
      className={`${colors.bg} ${colors.border} border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-20 flex flex-col justify-between no-underline`}
      title={tooltipText}
    >
      <div>
        <h4 className="font-semibold text-sm text-[var(--text)] truncate">{card.subtitle}</h4>
        {card.description && (
          <p className="text-2xs text-[var(--muted)] line-clamp-2 mt-0.5">{card.description}</p>
        )}
      </div>
    </a>
  );
}

function Card({ card }: { card: KanbanCard }) {
  const colors = CARD_COLORS[card.type];
  const isInferred = card.metadata?.inferred === true;

  const tooltipText = [
    card.subtitle ? `${card.name} - ${card.subtitle}` : card.name,
    isInferred ? (
      card.type === "activity"
        ? "Automatically inferred from activities that contribute to alpha states in this phase"
        : "Automatically inferred from activity outputs or work products that evidence alpha states"
    ) : null,
    card.description ? card.description : null
  ].filter(Boolean).join('\n\n');

  const linkTarget = card.type === "activity"
    ? `#activity-${slug(card.name)}`
    : `#workproduct-${slug(card.parentName || card.name)}`;

  return (
    <a
      href={linkTarget}
      className={`${colors.bg} ${colors.border} border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer no-underline block ${
        isInferred ? "opacity-90" : ""
      }`}
      title={tooltipText}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-sm text-[var(--text)] truncate">{card.name}</h4>
            {isInferred && (
              <span
                className="text-2xs bg-gray-500/20 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded"
                title={
                  card.type === "activity"
                    ? "Automatically inferred from activities that contribute to alpha states in this phase"
                    : "Automatically inferred from activity outputs or work products that evidence alpha states"
                }
              >
                auto
              </span>
            )}
          </div>
          {card.subtitle && (
            <p className="text-xs text-[var(--muted)] mt-0.5" title={card.subtitle}>{card.subtitle}</p>
          )}
        </div>
        <span
          className={`${colors.badge} text-2xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}
        >
          {CARD_LABELS[card.type]}
        </span>
      </div>
      {card.description && (
        <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1">{card.description}</p>
      )}
    </a>
  );
}

function CardSection({
  title,
  cards,
  emptyMessage,
}: {
  title: string;
  cards: KanbanCard[];
  emptyMessage?: string;
}) {
  if (cards.length === 0 && !emptyMessage) return null;

  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
        {title}
      </h4>
      {cards.length === 0 ? (
        <p className="text-xs text-[var(--muted)] italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KanbanPatternBoard({ pattern, baseline }: KanbanPatternBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [swimLanes, setSwimLanes] = useState<AlphaSwimLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (!pattern || !baseline) {
      setLoading(false);
      return;
    }

    try {
      const data = extractKanbanPatternData(pattern, baseline);
      setColumns(data);
      setSwimLanes(buildAlphaSwimLanes(data));
      // Collect assets from baseline and pattern
      const allAssets = [
        ...(baseline?.assets || []),
        ...(pattern?.assets || []),
      ];
      setAssets(allAssets);
      console.log(`[KanbanPatternBoard] Loaded ${allAssets.length} assets`);
    } catch (error) {
      console.error("Error extracting Kanban data:", error);
      setColumns([]);
      setSwimLanes([]);
    } finally {
      setLoading(false);
    }
  }, [pattern, baseline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-[var(--muted)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
          <p>Loading pattern board...</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[var(--muted)]">
        <p className="text-lg font-medium mb-2">No Pattern Views Available</p>
        <p className="text-sm text-center max-w-md">
          This pattern doesn't have any pattern views defined. Pattern views represent the temporal
          progression through the practice.
        </p>
      </div>
    );
  }

  const stats = calculateKanbanStats(columns);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-2xs text-[var(--muted)] uppercase tracking-wide">
                Pattern Views
              </div>
              <div className="text-lg font-bold text-[var(--text)]">{stats.columnCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-2xs text-[var(--muted)] uppercase tracking-wide">
                Alpha Swim Lanes
              </div>
              <div className="text-lg font-bold text-[var(--text)]">{swimLanes.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-2xs text-[var(--muted)] uppercase tracking-wide">Activities</div>
              <div className="text-lg font-bold text-[var(--text)]">{stats.totalActivities}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <div className="text-2xs text-[var(--muted)] uppercase tracking-wide">Artifacts</div>
              <div className="text-lg font-bold text-[var(--text)]">{stats.totalWorkProducts}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board with Swim Lanes */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0 min-w-full">
          {/* Column Headers */}
          <div className="flex gap-0 border-b-2 border-gray-300 dark:border-gray-600">
            {/* Row header column */}
            <div className="w-48 flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-800 border-r-2 border-gray-300 dark:border-gray-600">
              <h3 className="font-bold text-sm text-[var(--text)]">Alpha</h3>
            </div>
            {/* Pattern view columns */}
            {columns.map((column) => (
              <div
                key={column.id}
                className="w-64 flex-shrink-0 p-3 bg-[var(--panel)] border-r border-[var(--border)]"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-sm text-[var(--text)]">{column.name}</h3>
                  <span className="text-2xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                    #{column.seq}
                  </span>
                </div>
                {column.description && (
                  <p className="text-2xs text-[var(--muted)] mt-1">{column.description}</p>
                )}
                {column.narrative && (
                  <div className="mt-2 p-1.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded text-2xs text-blue-900 dark:text-blue-100 italic">
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
              className="flex gap-0 border-b border-[var(--border)] hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
            >
              {/* Row header */}
              <div className="w-48 flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-800/50 border-r-2 border-gray-300 dark:border-gray-600 flex items-center">
                {(() => {
                  const alpha = baseline?.alphas?.find((a: any) => a.name === lane.alphaName);
                  const iconRef = alpha?.assetNames?.find((ref: any) => ref.type === "icon");
                  const iconAsset = iconRef ? findAsset(iconRef.assetName, assets) : null;

                  return (
                    <div className="flex items-start gap-2 w-full">
                      {iconAsset && (
                        <IconAsset asset={iconAsset} size={20} className="flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[var(--text)]">{lane.alphaName}</h4>
                        <p className="text-2xs text-[var(--muted)]">→ State Progression</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* State cells */}
              {lane.stateByColumn.map((card, idx) => (
                <div
                  key={idx}
                  className="w-64 flex-shrink-0 p-2 border-r border-[var(--border)]"
                >
                  <AlphaStateCard card={card} />
                </div>
              ))}
            </div>
          ))}

          {/* Activities & Work Products Section */}
          <div className="flex gap-0 border-t-2 border-gray-300 dark:border-gray-600 mt-2">
            <div className="w-48 flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-800 border-r-2 border-gray-300 dark:border-gray-600">
              <h3 className="font-bold text-sm text-[var(--text)]">Work & Artifacts</h3>
            </div>
            {columns.map((column) => (
              <div
                key={column.id}
                className="w-64 flex-shrink-0 p-3 bg-[var(--panel)] border-r border-[var(--border)]"
              >
                <CardSection title="⚡ Activities" cards={column.activityCards} />
                <CardSection title="📄 Work Products" cards={column.workProductCards} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-[var(--panel)] border border-[var(--border)] rounded-lg">
        <h4 className="font-semibold text-sm text-[var(--text)] mb-3">Card Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(CARD_COLORS) as [KanbanCardType, typeof CARD_COLORS.alphaState][]).map(
            ([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${colors.badge}`} />
                <span className="text-sm text-[var(--text)]">{CARD_LABELS[type]}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📖 How to Read This Board
        </h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>
            • <strong>Horizontal rows (swim lanes)</strong> show how each alpha or work product progresses through
            states/levels across pattern views
          </li>
          <li>
            • <strong>Vertical columns</strong> represent Pattern Views (temporal phases)
          </li>
          <li>
            • Empty cells (dashed outline) indicate the alpha/work product doesn't appear in that phase
          </li>
          <li>
            • <strong>Instances</strong> use colon notation (<strong>instance : class</strong>): green cells for alpha instances, yellow cells for work product instances
          </li>
          <li>
            • <strong>Activities</strong> appear in the bottom section for each column
          </li>
          <li>
            • Items marked <span className="bg-gray-500/20 px-1 rounded text-xs">auto</span> are
            automatically inferred:
            <ul className="ml-4 mt-1">
              <li>
                - <strong>Activities</strong>: inferred from activities that contribute to shown
                alpha states
              </li>
              <li>
                - <strong>Work Products</strong>: inferred from shown activities' outputs OR from
                work products that evidence shown alpha states
              </li>
            </ul>
          </li>
          <li>
            • Read <strong>left-to-right</strong> for temporal progression,{" "}
            <strong>horizontally</strong> for alpha evolution
          </li>
        </ul>
      </div>
    </div>
  );
}
