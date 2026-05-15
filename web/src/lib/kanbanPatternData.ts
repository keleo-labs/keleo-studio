/**
 * Kanban board data extraction from Pattern Views
 * Columns = PatternViews, Cards = Alpha States/Instances, Activities, Work Products
 */

import type { PracticeBaseline } from "@/lib/types";
import { parsePatternViewAlphaState } from "@/lib/patternView";

export type KanbanCardType = "alphaState" | "alphaInstance" | "activity" | "workProduct";

export type KanbanCard = {
  id: string;
  type: KanbanCardType;
  name: string;
  description?: string;
  /** For alphaState: stateName; for alphaInstance: instance name */
  subtitle?: string;
  /** Parent entity name (alpha name, work product name, etc.) */
  parentName?: string;
  metadata?: Record<string, unknown>;
};

export type KanbanColumn = {
  id: string;
  name: string;
  description?: string;
  seq: number;
  /** Alpha state cards for this pattern view */
  alphaStateCards: KanbanCard[];
  /** Alpha instance cards for this pattern view */
  alphaInstanceCards: KanbanCard[];
  /** Activity cards referenced in this pattern view */
  activityCards: KanbanCard[];
  /** Work product cards inferred from activities or explicit references */
  workProductCards: KanbanCard[];
  /** Narrative context for storytelling */
  narrative?: string;
};

/**
 * Extract Kanban board data from a pattern
 */
export function extractKanbanPatternData(
  pattern: any,
  baseline: any
): KanbanColumn[] {
  if (!pattern || !pattern.patternViews) {
    return [];
  }

  const patternViews = Array.isArray(pattern.patternViews) ? pattern.patternViews : [];

  // Build lookup indexes from baseline
  const alphaByName = new Map<string, any>();
  const activityByName = new Map<string, any>();
  const workProductByName = new Map<string, any>();

  for (const alpha of baseline?.alphas ?? []) {
    alphaByName.set(String(alpha.name ?? "").trim(), alpha);
  }

  // Collect activities from both flat list and nested in activity spaces
  const allActivities = [...(baseline?.activities ?? [])];
  for (const space of baseline?.activitySpaces ?? []) {
    if (Array.isArray(space.activities)) {
      allActivities.push(...space.activities);
    }
  }

  for (const activity of allActivities) {
    activityByName.set(String(activity.name ?? "").trim(), activity);
  }

  for (const wp of baseline?.workProducts ?? []) {
    workProductByName.set(String(wp.name ?? "").trim(), wp);
  }

  // Build columns from pattern views
  const columns: KanbanColumn[] = [];

  for (const pv of patternViews) {
    const column: KanbanColumn = {
      id: `pv:${pv.name}`,
      name: pv.name ?? "",
      description: pv.description,
      seq: pv.seq ?? 0,
      alphaStateCards: [],
      alphaInstanceCards: [],
      activityCards: [],
      workProductCards: [],
    };

    // Extract narrative if present
    if (Array.isArray(pv.narrativeContexts) && pv.narrativeContexts.length > 0) {
      column.narrative = pv.narrativeContexts
        .map((nc: any) => String(nc.context ?? "").trim())
        .filter(Boolean)
        .join(" ");
    }

    // Track added cards to prevent duplicates
    const addedWorkProductIds = new Set<string>();
    const addedActivityIds = new Set<string>();

    // 1. Extract alpha states
    for (const alphaStateRef of pv.alphaStates ?? []) {
      const parsed = parsePatternViewAlphaState(alphaStateRef);
      if (!parsed) continue;

      const alpha = alphaByName.get(parsed.alphaName);
      const state = alpha?.states?.find(
        (s: any) => String(s.name ?? "").trim() === parsed.stateName.trim()
      );

      column.alphaStateCards.push({
        id: `alphaState:${parsed.alphaName}→${parsed.stateName}`,
        type: "alphaState",
        name: parsed.alphaName,
        subtitle: parsed.stateName,
        description: state?.description,
        parentName: parsed.alphaName,
      });
    }

    // 2. Extract alpha instances
    for (const instance of pv.alphaInstances ?? []) {
      const alphaName = String(instance.alphaName ?? "").trim();
      const instanceName = String(instance.name ?? "").trim();
      const stateName = String(instance.stateName ?? "").trim();

      column.alphaInstanceCards.push({
        id: `alphaInstance:${instanceName}`,
        type: "alphaInstance",
        name: `${instanceName} : ${alphaName}`,
        subtitle: stateName ? `at ${stateName}` : undefined,
        description: instance.description,
        parentName: alphaName,
      });

      // Extract work product instances from evidenceBy
      for (const wpInstance of instance.evidenceBy ?? []) {
        const wpName = String(wpInstance.workProductName ?? "").trim();
        const wpInstanceName = String(wpInstance.name ?? "").trim();
        const levelName = String(wpInstance.levelOfDetailName ?? "").trim();
        if (!wpName || !wpInstanceName) continue;

        const cardId = `workProductInstance:${wpInstanceName}@${levelName}`;
        if (addedWorkProductIds.has(cardId)) continue;
        addedWorkProductIds.add(cardId);

        const wp = workProductByName.get(wpName);
        const level = wp?.levelsOfDetail?.find(
          (l: any) => String(l.name ?? "").trim() === levelName
        );

        column.workProductCards.push({
          id: cardId,
          type: "workProduct",
          name: `${wpInstanceName} : ${wpName}`,
          subtitle: levelName,
          description: wpInstance.description || level?.description || wp?.description,
          parentName: wpName,
          metadata: {
            isInstance: true,
            inferred: false,
          },
        });
      }
    }

    // 3. Extract activities (explicitly referenced)
    const activityRefs = [
      ...(pv.activitySpaces ?? []),
      ...(pv.activities ?? []),
    ];

    // Helper to add work product card
    const addWorkProductCard = (wpName: string, levelName: string, inferred = false) => {
      const cardId = `workProduct:${wpName}@${levelName}`;

      // Skip if already added
      if (addedWorkProductIds.has(cardId)) return;
      addedWorkProductIds.add(cardId);

      const wp = workProductByName.get(wpName);
      const level = wp?.levelsOfDetail?.find(
        (l: any) => String(l.name ?? "").trim() === levelName
      );

      column.workProductCards.push({
        id: cardId,
        type: "workProduct",
        name: wpName,
        subtitle: levelName,
        description: level?.description || wp?.description,
        parentName: wpName,
        metadata: {
          inferred,
        },
      });
    };

    // Helper to add an activity card
    const addActivityCard = (activity: any, activityName: string, inferred = false) => {
      const activityId = `activity:${activityName}`;

      // Skip if already added
      if (addedActivityIds.has(activityId)) return;
      addedActivityIds.add(activityId);

      column.activityCards.push({
        id: activityId,
        type: "activity",
        name: activityName,
        description: activity.description,
        parentName: activity.activitySpaceName,
        metadata: {
          worksOn: activity.worksOn,
          contributesTo: activity.contributesTo,
          inferred,
        },
      });

      // Extract work products from this activity
      for (const wpRef of activity.worksOn ?? []) {
        const wpName = String(wpRef.workProductName ?? "").trim();
        const levelName = String(wpRef.levelOfDetailName ?? "").trim();
        if (!wpName) continue;

        addWorkProductCard(wpName, levelName, inferred);
      }
    };

    // Add explicitly referenced activities
    for (const activityRef of activityRefs) {
      const activityName = String(activityRef ?? "").trim();
      if (!activityName) continue;

      const activity = activityByName.get(activityName);
      if (activity) {
        addActivityCard(activity, activityName, false);
      }
    }

    // 3b. Infer activities that contribute to any alpha state in this pattern view
    const alphaStatesInView = new Set<string>();
    for (const alphaStateRef of pv.alphaStates ?? []) {
      const parsed = parsePatternViewAlphaState(alphaStateRef);
      if (parsed) {
        alphaStatesInView.add(`${parsed.alphaName}::${parsed.stateName}`);
      }
    }

    // Also include alpha states from instances
    for (const instance of pv.alphaInstances ?? []) {
      const alphaName = String(instance.alphaName ?? "").trim();
      const stateName = String(instance.stateName ?? "").trim();
      if (alphaName && stateName) {
        alphaStatesInView.add(`${alphaName}::${stateName}`);
      }
    }

    // Find activities that contribute to these alpha states
    for (const activity of allActivities) {
      const activityName = String(activity.name ?? "").trim();
      if (!activityName) continue;

      // Check if this activity contributes to any alpha state in this view
      for (const contrib of activity.contributesTo ?? []) {
        const contribAlpha = String(contrib.alphaName ?? "").trim();
        const contribState = String(contrib.stateName ?? "").trim();
        const contribKey = `${contribAlpha}::${contribState}`;

        if (alphaStatesInView.has(contribKey)) {
          addActivityCard(activity, activityName, true);
          break; // Found a match, no need to check other contributions
        }
      }
    }

    // 4b. Infer work products that contribute to alpha states in this view
    // This catches work products that might not be produced by any activity shown
    for (const wp of baseline?.workProducts ?? []) {
      const wpName = String(wp.name ?? "").trim();
      if (!wpName) continue;

      for (const level of wp.levelsOfDetail ?? []) {
        const levelName = String(level.name ?? "").trim();
        if (!levelName) continue;

        // Check if this work product level contributes to any alpha state in this view
        for (const contrib of level.contributesTo ?? []) {
          const contribAlpha = String(contrib.alphaName ?? "").trim();
          const contribState = String(contrib.stateName ?? "").trim();
          const contribKey = `${contribAlpha}::${contribState}`;

          if (alphaStatesInView.has(contribKey)) {
            addWorkProductCard(wpName, levelName, true);
            break; // Found a match, no need to check other contributions
          }
        }
      }
    }

    columns.push(column);
  }

  // Sort columns by sequence
  columns.sort((a, b) => a.seq - b.seq);

  return columns;
}

/**
 * Alpha swim lane: one row showing how an alpha progresses across pattern views
 */
export type AlphaSwimLane = {
  /** Unique identifier for this alpha (alpha name) */
  alphaName: string;
  /** Alpha state card per column (null if alpha doesn't appear in that column) */
  stateByColumn: (KanbanCard | null)[];
};

/**
 * Build alpha swim lanes showing horizontal progression across columns
 * Each lane represents one alpha, with its states at each pattern view
 */
export function buildAlphaSwimLanes(columns: KanbanColumn[]): AlphaSwimLane[] {
  // Collect all unique alpha names across all columns
  const allAlphaNames = new Set<string>();
  for (const col of columns) {
    for (const card of col.alphaStateCards) {
      if (card.parentName) {
        allAlphaNames.add(card.parentName);
      }
    }
    for (const card of col.alphaInstanceCards) {
      if (card.parentName) {
        allAlphaNames.add(card.parentName);
      }
    }
  }

  // Sort alpha names for consistent ordering (alphabetically for now)
  const sortedAlphaNames = Array.from(allAlphaNames).sort();

  // Build swim lanes
  const swimLanes: AlphaSwimLane[] = [];

  for (const alphaName of sortedAlphaNames) {
    const stateByColumn: (KanbanCard | null)[] = [];

    for (const col of columns) {
      // Find the alpha state card for this alpha in this column
      const stateCard = col.alphaStateCards.find(
        (card) => card.parentName === alphaName
      );
      const instanceCard = col.alphaInstanceCards.find(
        (card) => card.parentName === alphaName
      );

      // Prefer instance card if it exists, otherwise state card
      stateByColumn.push(instanceCard || stateCard || null);
    }

    swimLanes.push({
      alphaName,
      stateByColumn,
    });
  }

  return swimLanes;
}

/**
 * Work product swim lane: one row showing how a work product progresses through levels across pattern views
 */
export type WorkProductSwimLane = {
  /** Unique identifier for this work product (work product name) */
  workProductName: string;
  /** Work product level card per column (null if work product doesn't appear in that column) */
  levelByColumn: (KanbanCard | null)[];
};

/**
 * Build work product swim lanes showing horizontal progression across columns
 * Each lane represents one work product, with its levels of detail at each pattern view
 */
export function buildWorkProductSwimLanes(columns: KanbanColumn[]): WorkProductSwimLane[] {
  // Collect all unique work product names across all columns
  const allWorkProductNames = new Set<string>();
  for (const col of columns) {
    for (const card of col.workProductCards) {
      if (card.parentName) {
        allWorkProductNames.add(card.parentName);
      }
    }
  }

  // Sort work product names for consistent ordering (alphabetically for now)
  const sortedWorkProductNames = Array.from(allWorkProductNames).sort();

  // Build swim lanes
  const swimLanes: WorkProductSwimLane[] = [];

  for (const workProductName of sortedWorkProductNames) {
    const levelByColumn: (KanbanCard | null)[] = [];

    for (const col of columns) {
      // Find the work product card for this work product in this column
      const wpCard = col.workProductCards.find(
        (card) => card.parentName === workProductName
      );

      levelByColumn.push(wpCard || null);
    }

    swimLanes.push({
      workProductName,
      levelByColumn,
    });
  }

  return swimLanes;
}

/**
 * Get statistics about the Kanban board
 */
export function calculateKanbanStats(columns: KanbanColumn[]) {
  let totalAlphaStates = 0;
  let totalAlphaInstances = 0;
  let totalActivities = 0;
  let totalWorkProducts = 0;

  for (const col of columns) {
    totalAlphaStates += col.alphaStateCards.length;
    totalAlphaInstances += col.alphaInstanceCards.length;
    totalActivities += col.activityCards.length;
    totalWorkProducts += col.workProductCards.length;
  }

  return {
    columnCount: columns.length,
    totalAlphaStates,
    totalAlphaInstances,
    totalActivities,
    totalWorkProducts,
    totalCards:
      totalAlphaStates + totalAlphaInstances + totalActivities + totalWorkProducts,
  };
}
