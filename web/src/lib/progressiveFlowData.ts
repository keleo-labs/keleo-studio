/**
 * Progressive Flow Data Extraction (Horizontal Linear Flow)
 *
 * Creates horizontal flow diagrams showing PersonaGroup → Activity → State progression
 * One flow per PersonaGroup
 */

import { baselineWithPracticeActivities } from "./ir";

export type FlowNode = {
  type: "personaGroup" | "activity" | "alphaState";
  id: string;
  label: string;
  alphaName?: string; // For alphaState nodes
  stateName?: string; // For alphaState nodes
  stateSeq?: number;  // For sorting
  description?: string;
};

export type FlowLink = {
  sourceId: string;
  targetId: string;
};

export type PersonaGroupFlow = {
  personaGroupName: string;
  nodes: FlowNode[];
  links: FlowLink[];
};

export type ProgressiveFlowData = {
  flows: PersonaGroupFlow[]; // One flow per PersonaGroup
};

/**
 * Index alpha state sequences for sorting
 */
function indexAlphaStateSequences(alphas: any[]): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>();

  for (const alpha of alphas) {
    const alphaName = String(alpha.name ?? "").trim();
    if (!alphaName) continue;

    const stateMap = new Map<string, number>();
    const states = Array.isArray(alpha.states) ? alpha.states : [];

    for (const state of states) {
      const stateName = String(state.name ?? "").trim();
      const seq = typeof state.seq === "number" ? state.seq : 0;
      if (stateName) {
        stateMap.set(stateName, seq);
      }
    }

    index.set(alphaName, stateMap);
  }

  return index;
}

/**
 * Collect all activities from practice
 */
function collectAllActivities(practice: any): any[] {
  const activities: any[] = [];

  const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
  for (const space of activitySpaces) {
    const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
    activities.push(...spaceActivities);
  }

  const flatActivities = Array.isArray(practice.activities) ? practice.activities : [];
  activities.push(...flatActivities);

  return activities;
}

/**
 * Get minimum sequence number for sorting activities
 */
function getActivityMinSeq(
  activity: any,
  alphaStateSeq: Map<string, Map<string, number>>
): number {
  const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

  if (contributesTo.length === 0) return 999;

  let minSeq = Infinity;
  for (const contrib of contributesTo) {
    const alphaName = String(contrib.alphaName ?? "").trim();
    const stateName = String(contrib.stateName ?? "").trim();
    if (alphaName && stateName) {
      const seq = alphaStateSeq.get(alphaName)?.get(stateName);
      if (seq !== undefined) {
        minSeq = Math.min(minSeq, seq);
      }
    }
  }

  return minSeq === Infinity ? 999 : minSeq;
}

/**
 * Build flow for a single PersonaGroup
 */
function buildPersonaGroupFlow(
  personaGroupName: string,
  activities: any[],
  alphaStateSeq: Map<string, Map<string, number>>
): PersonaGroupFlow {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  // Add PersonaGroup node
  const pgNodeId = `pg:${personaGroupName}`;
  nodes.push({
    type: "personaGroup",
    id: pgNodeId,
    label: personaGroupName,
  });

  // Filter activities for this PersonaGroup
  const pgActivities = activities.filter((activity) => {
    const involves = Array.isArray(activity.involves) ? activity.involves : [];
    return involves.some((pg: any) => String(pg ?? "").trim() === personaGroupName);
  });

  // Sort activities by progression
  const sortedActivities = pgActivities
    .map((activity) => ({
      activity,
      minSeq: getActivityMinSeq(activity, alphaStateSeq),
    }))
    .sort((a, b) => {
      if (a.minSeq !== b.minSeq) return a.minSeq - b.minSeq;
      return String(a.activity.name ?? "").localeCompare(String(b.activity.name ?? ""));
    })
    .map((item) => item.activity);

  // Track first activity in each alpha thread for PersonaGroup linking
  const firstActivityPerAlpha = new Map<string, string>();

  // Build nodes and links
  for (const activity of sortedActivities) {
    const activityName = String(activity.name ?? "").trim();
    if (!activityName) continue;

    const activityId = `activity:${activityName}`;
    const description = String(activity.description ?? "").trim();

    // Add activity node
    nodes.push({
      type: "activity",
      id: activityId,
      label: activityName,
      description: description || undefined,
    });

    // Add alpha state nodes and links
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
    for (const contrib of contributesTo) {
      const alphaName = String(contrib.alphaName ?? "").trim();
      const stateName = String(contrib.stateName ?? "").trim();

      if (alphaName && stateName) {
        const stateSeq = alphaStateSeq.get(alphaName)?.get(stateName) ?? 0;
        const stateId = `state:${alphaName}:${stateName}`;

        // Track first activity for this alpha thread
        if (!firstActivityPerAlpha.has(alphaName)) {
          firstActivityPerAlpha.set(alphaName, activityId);
        }

        // Add state node if not already added
        if (!nodes.find((n) => n.id === stateId)) {
          nodes.push({
            type: "alphaState",
            id: stateId,
            label: `${alphaName}: ${stateName}`,
            alphaName,
            stateName,
            stateSeq,
          });
        }

        // Link from Activity to State (Activity comes BEFORE State)
        links.push({
          sourceId: activityId,
          targetId: stateId,
        });
      }
    }
  }

  // Link PersonaGroup only to first activity in each alpha thread
  for (const firstActivityId of Array.from(firstActivityPerAlpha.values())) {
    links.push({
      sourceId: pgNodeId,
      targetId: firstActivityId,
    });
  }

  return {
    personaGroupName,
    nodes,
    links,
  };
}

/**
 * Main extraction function
 */
export function extractProgressiveFlowData(practice: any): ProgressiveFlowData {
  const normalizedPractice = baselineWithPracticeActivities(practice, practice);

  const alphas = Array.isArray(normalizedPractice.alphas) ? normalizedPractice.alphas : [];
  const alphaStateSeq = indexAlphaStateSequences(alphas);

  const allActivities = collectAllActivities(normalizedPractice);

  // Get unique PersonaGroups from activities
  const personaGroupsSet = new Set<string>();
  for (const activity of allActivities) {
    const involves = Array.isArray(activity.involves) ? activity.involves : [];
    for (const pg of involves) {
      const pgName = String(pg ?? "").trim();
      if (pgName) personaGroupsSet.add(pgName);
    }
  }

  // Build flows for each PersonaGroup
  const flows: PersonaGroupFlow[] = [];
  for (const pgName of Array.from(personaGroupsSet).sort()) {
    const flow = buildPersonaGroupFlow(pgName, allActivities, alphaStateSeq);
    if (flow.nodes.length > 1) {
      // Only include if has activities
      flows.push(flow);
    }
  }

  return { flows };
}

/**
 * Calculate statistics
 */
export function calculateProgressiveFlowStats(data: ProgressiveFlowData) {
  return {
    personaGroupCount: data.flows.length,
    activityCount: data.flows.reduce(
      (sum, flow) => sum + flow.nodes.filter((n) => n.type === "activity").length,
      0
    ),
    stateCount: data.flows.reduce((sum, flow) => {
      const uniqueStates = new Set(flow.nodes.filter((n) => n.type === "alphaState").map((n) => n.id));
      return sum + uniqueStates.size;
    }, 0),
  };
}
