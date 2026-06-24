/**
 * Sankey flow diagram data extraction: Activities → WorkProducts → Alpha States
 */

import type { PracticeBaseline } from "@/lib/types";

export type SankeyNode = {
  id: string;
  name: string;
  category: "activity" | "workProduct" | "alphaState";
  description?: string;
  /** For activities: activitySpaceName; for workProducts: workProductName; for alphaState: alphaName */
  parentName?: string;
  assetNames?: Array<{ assetName: string; type: string }>;
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

export type SankeyFlowData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

/**
 * Extract Sankey flow data from a practice baseline or merged practice.
 * Flow: Activities → WorkProducts (at level of detail) → Alpha States
 */
export function extractSankeyFlowData(practice: any): SankeyFlowData {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nodeIds = new Set<string>();

  // Helper to add node if not exists
  const addNode = (node: SankeyNode) => {
    if (!nodeIds.has(node.id)) {
      nodes.push(node);
      nodeIds.add(node.id);
    }
  };

  // Helper to add link (increment value if exists)
  const addLink = (source: string, target: string) => {
    const existing = links.find((l) => l.source === source && l.target === target);
    if (existing) {
      existing.value += 1;
    } else {
      links.push({ source, target, value: 1 });
    }
  };

  // Build lookup indexes
  const alphaByName = new Map<string, any>();
  for (const alpha of practice.alphas ?? []) {
    alphaByName.set(alpha.name, alpha);
  }

  const workProductByName = new Map<string, any>();
  for (const wp of practice.workProducts ?? []) {
    workProductByName.set(wp.name, wp);
  }

  // Process Activities
  const activities = practice.activities ?? [];
  const activitySpaces = practice.activitySpaces ?? [];

  // Collect all activities (both flat and nested)
  const allActivities: any[] = [...activities];
  for (const space of activitySpaces) {
    if (Array.isArray(space.activities)) {
      allActivities.push(...space.activities);
    }
  }

  for (const activity of allActivities) {
    const activityId = `activity:${activity.name}`;
    addNode({
      id: activityId,
      name: activity.name,
      category: "activity",
      description: activity.description,
      parentName: activity.activitySpaceName,
    });

    // Link Activity → WorkProduct @ Level
    for (const wp of activity.worksOn ?? []) {
      const wpId = `workProduct:${wp.workProductName}@${wp.levelOfDetailName}`;
      const workProduct = workProductByName.get(wp.workProductName);
      addNode({
        id: wpId,
        name: `${wp.workProductName} (${wp.levelOfDetailName})`,
        category: "workProduct",
        parentName: wp.workProductName,
        assetNames: workProduct?.assetNames,
      });
      addLink(activityId, wpId);
    }
  }

  // Process WorkProducts to find their contributions to Alpha States
  const workProducts = practice.workProducts ?? [];

  for (const wp of workProducts) {
    for (const level of wp.levelsOfDetail ?? []) {
      const wpId = `workProduct:${wp.name}@${level.name}`;

      // Ensure the work product node exists (might not be linked from activities)
      if (!nodeIds.has(wpId)) {
        addNode({
          id: wpId,
          name: `${wp.name} (${level.name})`,
          category: "workProduct",
          description: level.description,
          parentName: wp.name,
        });
      }

      // Link WorkProduct → Alpha State
      for (const contrib of level.contributesTo ?? []) {
        const alphaStateId = `alphaState:${contrib.alphaName}→${contrib.stateName}`;
        const alpha = alphaByName.get(contrib.alphaName);
        addNode({
          id: alphaStateId,
          name: `${contrib.alphaName} → ${contrib.stateName}`,
          category: "alphaState",
          parentName: contrib.alphaName,
          assetNames: alpha?.assetNames,
        });
        addLink(wpId, alphaStateId);
      }
    }
  }

  // Also capture direct Activity → Alpha State contributions (bypass work products)
  for (const activity of allActivities) {
    const activityId = `activity:${activity.name}`;
    for (const contrib of activity.contributesTo ?? []) {
      const alphaStateId = `alphaState:${contrib.alphaName}→${contrib.stateName}`;

      // Only add direct link if there's no intermediate work product
      const hasWorkProductPath = links.some(
        (l) => l.source === activityId && l.target.startsWith("workProduct:")
      );

      if (!hasWorkProductPath) {
        const alpha = alphaByName.get(contrib.alphaName);
        addNode({
          id: alphaStateId,
          name: `${contrib.alphaName} → ${contrib.stateName}`,
          category: "alphaState",
          parentName: contrib.alphaName,
          assetNames: alpha?.assetNames,
        });
        addLink(activityId, alphaStateId);
      }
    }
  }

  return { nodes, links };
}

/**
 * Group nodes by category for vertical layout
 */
export function groupNodesByCategory(data: SankeyFlowData): {
  activities: SankeyNode[];
  workProducts: SankeyNode[];
  alphaStates: SankeyNode[];
} {
  return {
    activities: data.nodes.filter((n) => n.category === "activity"),
    workProducts: data.nodes.filter((n) => n.category === "workProduct"),
    alphaStates: data.nodes.filter((n) => n.category === "alphaState"),
  };
}

/**
 * Calculate statistics about the flow
 */
export function calculateFlowStats(data: SankeyFlowData) {
  const totalFlow = data.links.reduce((sum, l) => sum + l.value, 0);
  const groups = groupNodesByCategory(data);

  return {
    totalFlow,
    activityCount: groups.activities.length,
    workProductCount: groups.workProducts.length,
    alphaStateCount: groups.alphaStates.length,
    linkCount: data.links.length,
  };
}
