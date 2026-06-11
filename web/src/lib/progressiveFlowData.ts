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
  assetNames?: Array<{ assetName: string; type: string }>;
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
 * Activities are repeated before each alpha state they contribute to
 */
function buildPersonaGroupFlow(
  personaGroupName: string,
  activities: any[],
  alphaStateSeq: Map<string, Map<string, number>>,
  alphas: any[]
): PersonaGroupFlow {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  // Build alpha lookup
  const alphaByName = new Map<string, any>();
  for (const alpha of alphas) {
    alphaByName.set(alpha.name, alpha);
  }

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

  // Build activity-state contributions grouped by alpha
  type AlphaThread = {
    alphaName: string;
    pairs: Array<{
      activityName: string;
      activityDescription: string;
      stateName: string;
      stateSeq: number;
    }>;
  };

  const alphaThreads = new Map<string, AlphaThread>();

  for (const activity of pgActivities) {
    const activityName = String(activity.name ?? "").trim();
    if (!activityName) continue;

    const description = String(activity.description ?? "").trim();
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

    for (const contrib of contributesTo) {
      const alphaName = String(contrib.alphaName ?? "").trim();
      const stateName = String(contrib.stateName ?? "").trim();

      if (alphaName && stateName) {
        const stateSeq = alphaStateSeq.get(alphaName)?.get(stateName) ?? 0;

        if (!alphaThreads.has(alphaName)) {
          alphaThreads.set(alphaName, { alphaName, pairs: [] });
        }

        alphaThreads.get(alphaName)!.pairs.push({
          activityName,
          activityDescription: description,
          stateName,
          stateSeq,
        });
      }
    }
  }

  // Sort pairs within each alpha thread by stateSeq
  for (const thread of alphaThreads.values()) {
    thread.pairs.sort((a, b) => {
      if (a.stateSeq !== b.stateSeq) return a.stateSeq - b.stateSeq;
      return a.stateName.localeCompare(b.stateName);
    });
  }

  // Sort alpha threads by the minimum stateSeq
  const sortedThreads = Array.from(alphaThreads.values()).sort((a, b) => {
    const minSeqA = Math.min(...a.pairs.map((p) => p.stateSeq));
    const minSeqB = Math.min(...b.pairs.map((p) => p.stateSeq));
    if (minSeqA !== minSeqB) return minSeqA - minSeqB;
    return a.alphaName.localeCompare(b.alphaName);
  });

  // Track first activity in each alpha for PersonaGroup linking
  const firstActivityPerAlpha = new Map<string, string>();

  // Build nodes and links for each alpha thread
  for (const thread of sortedThreads) {
    const { alphaName, pairs } = thread;
    let prevNodeId: string | null = null;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const { activityName, activityDescription, stateName, stateSeq } = pair;

      // Create unique activity node for this contribution
      const activityId = `activity:${activityName}:${alphaName}:${stateName}`;
      nodes.push({
        type: "activity",
        id: activityId,
        label: activityName,
        description: activityDescription || undefined,
      });

      // Track first activity for PersonaGroup linking
      if (i === 0) {
        firstActivityPerAlpha.set(alphaName, activityId);
      }

      // Create state node (unique per alpha state)
      const stateId = `state:${alphaName}:${stateName}`;
      if (!nodes.find((n) => n.id === stateId)) {
        const alpha = alphaByName.get(alphaName);
        nodes.push({
          type: "alphaState",
          id: stateId,
          label: `${alphaName}: ${stateName}`,
          alphaName,
          stateName,
          stateSeq,
          assetNames: alpha?.assetNames,
        });
      }

      // Link activity to state
      links.push({
        sourceId: activityId,
        targetId: stateId,
      });

      // Link previous state to current activity (sequential flow within alpha)
      if (prevNodeId) {
        links.push({
          sourceId: prevNodeId,
          targetId: activityId,
        });
      }

      prevNodeId = stateId;
    }
  }

  // Link PersonaGroup to first activity in each alpha thread
  for (const firstActivityId of firstActivityPerAlpha.values()) {
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
    const flow = buildPersonaGroupFlow(pgName, allActivities, alphaStateSeq, alphas);
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
