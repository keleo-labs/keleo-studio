/**
 * Extract topology diagram data from practice/method
 * Creates nodes and edges for visualization of practice elements and their relationships
 */

export type TopologyNodeType =
  | "alpha"
  | "alphaState"
  | "activity"
  | "activitySpace"
  | "workProduct"
  | "levelOfDetail"
  | "competency"
  | "competencyLevel";

export type TopologyEdgeType =
  | "contributes" // Alpha -> Alpha, Activity -> AlphaState
  | "evidences" // LevelOfDetail -> AlphaState
  | "worksOn" // Activity -> WorkProduct
  | "recommended" // CompetencyLevel -> Activity
  | "required"; // Competency -> Activity

export interface TopologyNode {
  id: string;
  name: string;
  type: TopologyNodeType;
  description?: string;
  parentId?: string; // For nested nodes (states within alphas, etc.)
  group?: string; // For visual grouping (e.g., activity space name)
  seq?: number; // Sequence number for states/levels
  isPlaceholder?: boolean; // True if this is a reference to a baseline element
  children?: TopologyNode[]; // Child nodes for compound nodes (alphas, work products, etc.)
  assetNames?: Array<{ assetName: string; type: string }>; // Asset references from practice element
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: TopologyEdgeType;
  label?: string;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

/**
 * Extract topology data from a practice or method
 */
export function extractTopologyData(practice: any): TopologyData {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const nodeIds = new Set<string>(); // Track all node IDs

  if (!practice) {
    return { nodes, edges };
  }

  console.log('Extracting topology from practice:', {
    name: practice.name,
    alphas: practice.alphas?.length || 0,
    competencies: practice.competencies?.length || 0,
    workProducts: practice.workProducts?.length || 0,
    activitySpaces: practice.activitySpaces?.length || 0,
  });

  // Helper to add a node and track its ID
  function addNode(node: TopologyNode) {
    nodes.push(node);
    nodeIds.add(node.id);
  }

  // Helper to ensure a node exists (create placeholder if missing)
  function ensureNode(id: string, type: TopologyNodeType, name?: string) {
    if (!nodeIds.has(id)) {
      const displayName = name || id.split(':').pop() || id;

      // For child node types, ensure parent exists and add as child
      if (type === 'alphaState' || type === 'levelOfDetail' || type === 'competencyLevel' || type === 'activity') {
        const parentType =
          type === 'alphaState' ? 'alpha' :
          type === 'levelOfDetail' ? 'workProduct' :
          type === 'competencyLevel' ? 'competency' :
          'activitySpace';

        // Extract parent name from ID (format: "parentType:parentName:childName")
        const parts = id.split(':');
        if (parts.length >= 3) {
          const parentName = parts[1];
          const parentId = `${parentType}:${parentName}`;

          // Create child node (not added to main array, only to parent's children)
          const childNode: TopologyNode = {
            id,
            name: displayName,
            type,
            description: '(Referenced from baseline or missing)',
            isPlaceholder: true,
            parentId: parentId,
          };
          nodeIds.add(id);

          // Ensure parent exists
          if (!nodeIds.has(parentId)) {
            // Create parent with this child
            addNode({
              id: parentId,
              name: parentName,
              type: parentType,
              description: '(Referenced from baseline or missing)',
              isPlaceholder: true,
              children: [childNode],
            });
          } else {
            // Parent exists, add child to it
            const parent = nodes.find(n => n.id === parentId);
            if (parent) {
              if (!parent.children) {
                parent.children = [];
              }
              parent.children.push(childNode);
            }
          }
          return; // Don't add child as standalone node
        }
      }

      // For parent nodes or nodes that don't fit the pattern, add as standalone
      addNode({
        id,
        name: displayName,
        type,
        description: '(Referenced from baseline or missing)',
        isPlaceholder: true,
        children: type === 'alpha' || type === 'workProduct' || type === 'competency' || type === 'activitySpace' ? [] : undefined,
      });
    }
  }

  // Build a map of which activities recommend each competency level
  const activitiesRecommendingLevel = new Map<string, string[]>();
  // Build a map of which activities require each competency
  const activitiesRequiringCompetency = new Map<string, string[]>();

  const allActivitiesForCompMapping: any[] = [
    ...(practice.activities || []),
    ...(practice.activitySpaces || []).flatMap((as: any) => as.activities || []),
  ];

  allActivitiesForCompMapping.forEach((activity: any) => {
    // Track recommended levels
    const recommendedLevels = activity.recommendedCompetencyLevels || [];
    recommendedLevels.forEach((cl: any) => {
      const levelKey = `${cl.competencyName}:${cl.competencyLevelName}`;
      if (!activitiesRecommendingLevel.has(levelKey)) {
        activitiesRecommendingLevel.set(levelKey, []);
      }
      activitiesRecommendingLevel.get(levelKey)!.push(activity.name);
    });

    // Track required competencies
    const requiredComps = activity.requiredCompetencies || [];
    requiredComps.forEach((compName: string) => {
      if (!activitiesRequiringCompetency.has(compName)) {
        activitiesRequiringCompetency.set(compName, []);
      }
      activitiesRequiringCompetency.get(compName)!.push(activity.name);
    });
  });

  // Extract Competencies and Levels
  // Create instances for:
  // 1. Each activity that recommends a specific level (with that level shown)
  // 2. Each activity that requires the competency (with no specific level shown)
  const competencies = practice.competencies || [];
  competencies.forEach((comp: any) => {
    const levels = comp.levels || [];

    // Create instances for recommended levels
    levels.forEach((level: any) => {
      const levelKey = `${comp.name}:${level.name}`;
      const activitiesForLevel = activitiesRecommendingLevel.get(levelKey) || [];

      if (activitiesForLevel.length > 0) {
        // Create a separate competency card for each activity that recommends this level
        activitiesForLevel.forEach((activityName: string) => {
          // Find all contributions for this activity to create the right instance IDs
          const activity = allActivitiesForCompMapping.find(a => a.name === activityName);
          const contributions = activity?.contributesTo || [];

          if (contributions.length > 0) {
            // Create an instance for each activity instance (one per alpha state)
            contributions.forEach((contrib: any) => {
              // Create the competency level tile node
              const levelNode: TopologyNode = {
                id: `compLevel:${comp.name}:${level.name}:recommended:${activityName}:${contrib.alphaName}:${contrib.stateName}`,
                name: level.name,
                type: "competencyLevel",
                description: level.description,
                seq: level.level,
              };
              nodeIds.add(levelNode.id);

              // Create competency card instance with just this level
              const compCardId = `competency:${comp.name}:${level.name}:recommended:${activityName}:${contrib.alphaName}:${contrib.stateName}`;
              addNode({
                id: compCardId,
                name: comp.name,
                type: "competency",
                description: `${comp.description} - ${level.name} recommended for ${activityName}`,
                children: [levelNode],
              });
            });
          } else {
            // Activity has no contributions, create single instance
            const levelNode: TopologyNode = {
              id: `compLevel:${comp.name}:${level.name}:recommended:${activityName}`,
              name: level.name,
              type: "competencyLevel",
              description: level.description,
              seq: level.level,
            };
            nodeIds.add(levelNode.id);

            const compCardId = `competency:${comp.name}:${level.name}:recommended:${activityName}`;
            addNode({
              id: compCardId,
              name: comp.name,
              type: "competency",
              description: `${comp.description} - ${level.name} recommended for ${activityName}`,
              children: [levelNode],
            });
          }
        });
      }
    });

    // Required competencies are hidden - no instances created
  });

  // Build a map of which activities contribute to each alpha state
  // We'll need this to link states to activities instead of directly to next states
  const activitiesContributingToState = new Map<string, string[]>();

  // Scan all activity spaces first to build the map
  const allActivitiesForMapping: any[] = [
    ...(practice.activities || []),
    ...(practice.activitySpaces || []).flatMap((as: any) => as.activities || []),
  ];

  allActivitiesForMapping.forEach((activity: any) => {
    const contributions = activity.contributesTo || [];
    contributions.forEach((contrib: any) => {
      const stateKey = `${contrib.alphaName}:${contrib.stateName}`;
      if (!activitiesContributingToState.has(stateKey)) {
        activitiesContributingToState.set(stateKey, []);
      }
      activitiesContributingToState.get(stateKey)!.push(activity.name);
    });
  });

  // Extract Alphas and their States
  // Each state gets its own card showing alpha name + state
  const alphas = practice.alphas || [];
  alphas.forEach((alpha: any) => {
    const states = alpha.states || [];
    const sortedStates = [...states].sort((a, b) => (a.seq || 0) - (b.seq || 0));

    sortedStates.forEach((state: any, index: number) => {
      // Create a state tile node
      const stateNode: TopologyNode = {
        id: `alphaState:${alpha.name}:${state.name}`,
        name: state.name,
        type: "alphaState",
        description: state.description,
        seq: state.seq,
      };
      nodeIds.add(stateNode.id);

      // Create an alpha card containing just this one state
      addNode({
        id: `alpha:${alpha.name}:${state.name}`,
        name: alpha.name,
        type: "alpha",
        description: `${alpha.description} - ${state.name}`,
        children: [stateNode],
        assetNames: alpha.assetNames,
      });

      // Link to next state in sequence - but link to activities if they exist
      if (index < sortedStates.length - 1) {
        const nextState = sortedStates[index + 1];
        const nextStateKey = `${alpha.name}:${nextState.name}`;
        const activitiesForNextState = activitiesContributingToState.get(nextStateKey) || [];

        if (activitiesForNextState.length > 0) {
          // Link current state to each activity that contributes to the next state
          activitiesForNextState.forEach((activityName: string) => {
            // Each activity may have multiple instances (one per contribution)
            // We want to link to the specific instance that contributes to the next state
            const activityInstanceId = `activity:${activityName}:${alpha.name}:${nextState.name}`;
            edges.push({
              id: `alpha-to-activity:${alpha.name}:${state.name}->${activityName}`,
              source: `alpha:${alpha.name}:${state.name}`,
              target: activityInstanceId,
              type: "contributes",
              label: "enables",
            });
          });
        } else {
          // No activities contribute to next state, link directly
          edges.push({
            id: `alpha-seq:${alpha.name}:${state.name}->${nextState.name}`,
            source: `alpha:${alpha.name}:${state.name}`,
            target: `alpha:${alpha.name}:${nextState.name}`,
            type: "contributes",
            label: "progresses to",
          });
        }
      }
    });

    // If alpha contributesTo another alpha, link the last state
    if (alpha.contributesTo && sortedStates.length > 0) {
      const lastState = sortedStates[sortedStates.length - 1];
      // This will create a placeholder for the target alpha if it doesn't exist
      const targetId = `alpha:${alpha.contributesTo}`;
      ensureNode(targetId, "alpha", alpha.contributesTo);
      edges.push({
        id: `alpha-contrib:${alpha.name}:${lastState.name}->${alpha.contributesTo}`,
        source: `alpha:${alpha.name}:${lastState.name}`,
        target: targetId,
        type: "contributes",
        label: "contributes",
      });
    }
  });

  // Build a map of which activities work on each work product
  const activitiesWorkingOnProduct = new Map<string, string[]>();

  allActivitiesForMapping.forEach((activity: any) => {
    const worksOn = activity.worksOn || [];
    worksOn.forEach((wp: any) => {
      const wpName = wp.workProductName;
      if (!activitiesWorkingOnProduct.has(wpName)) {
        activitiesWorkingOnProduct.set(wpName, []);
      }
      activitiesWorkingOnProduct.get(wpName)!.push(activity.name);
    });
  });

  // Extract Work Products and Levels of Detail
  const workProducts = practice.workProducts || [];
  workProducts.forEach((wp: any) => {
    const levels = wp.levelsOfDetail || [];

    // Create work product instances for each level of detail that evidences an alpha state
    levels.forEach((lod: any) => {
      const contributions = lod.contributesTo || [];

      if (contributions.length > 0) {
        // Create a separate work product card for each alpha state this LOD evidences
        contributions.forEach((contrib: any) => {
          const lodNode: TopologyNode = {
            id: `lod:${wp.name}:${lod.name}:${contrib.alphaName}:${contrib.stateName}`,
            name: lod.name,
            type: "levelOfDetail",
            description: lod.description,
            seq: lod.seq,
          };
          nodeIds.add(lodNode.id);

          const wpCardId = `workProduct:${wp.name}:${lod.name}:${contrib.alphaName}:${contrib.stateName}`;
          addNode({
            id: wpCardId,
            name: wp.name,
            type: "workProduct",
            description: `${wp.description} - ${lod.name}`,
            children: [lodNode],
            assetNames: wp.assetNames,
          });

          // Add LOD -> AlphaState edge (evidences)
          const alphaCardId = `alpha:${contrib.alphaName}:${contrib.stateName}`;
          if (!nodeIds.has(alphaCardId)) {
            ensureNode(alphaCardId, "alpha", contrib.alphaName);
          }

          edges.push({
            id: `${lodNode.id}->${contrib.alphaName}:${contrib.stateName}`,
            source: wpCardId,
            target: alphaCardId,
            type: "evidences",
            label: "evidences",
          });
        });
      }
    });

    // Create work product instances for each activity that works on it
    const activitiesForProduct = activitiesWorkingOnProduct.get(wp.name) || [];
    activitiesForProduct.forEach((activityName: string) => {
      const activity = allActivitiesForMapping.find(a => a.name === activityName);
      const contributions = activity?.contributesTo || [];

      if (contributions.length > 0) {
        // Create an instance for each activity instance (one per alpha state)
        contributions.forEach((contrib: any) => {
          // Create work product card instance (without LOD children for activity usage)
          const wpCardId = `workProduct:${wp.name}:activity:${activityName}:${contrib.alphaName}:${contrib.stateName}`;
          addNode({
            id: wpCardId,
            name: wp.name,
            type: "workProduct",
            description: `${wp.description} - for ${activityName}`,
            children: [], // Empty - activity works on the product as a whole
          });
        });
      } else {
        // Activity has no contributions, create single instance
        const wpCardId = `workProduct:${wp.name}:activity:${activityName}`;
        addNode({
          id: wpCardId,
          name: wp.name,
          type: "workProduct",
          description: `${wp.description} - for ${activityName}`,
          children: [],
        });
      }
    });
  });

  // Extract Activity Spaces and Activities
  // Each activity creates multiple cards, one for each alpha state it contributes to
  const activitySpaces = practice.activitySpaces || [];
  activitySpaces.forEach((as: any) => {
    const activities = as.activities || [];
    activities.forEach((activity: any) => {
      const contributions = activity.contributesTo || [];

      if (contributions.length === 0) {
        // Activity with no contributions - create a single card
        const activityNode: TopologyNode = {
          id: `activity:${activity.name}`,
          name: activity.name,
          type: "activity",
          description: activity.description,
          group: as.name,
        };
        nodeIds.add(activityNode.id);

        addNode({
          id: `activitySpace:${as.name}:${activity.name}`,
          name: as.name,
          type: "activitySpace",
          description: `${as.description} - ${activity.name}`,
          children: [activityNode],
        });

        // Process other relationships (not alpha contributions)
        processActivityRelationships(activity, activityNode.id, null);
      } else {
        // Create a separate card for each alpha state contribution
        contributions.forEach((contrib: any, index: number) => {
          const activityNodeId = `activity:${activity.name}:${contrib.alphaName}:${contrib.stateName}`;
          const activityNode: TopologyNode = {
            id: activityNodeId,
            name: activity.name,
            type: "activity",
            description: activity.description,
            group: as.name,
          };
          nodeIds.add(activityNodeId);

          const cardId = `activitySpace:${as.name}:${activity.name}:${contrib.alphaName}:${contrib.stateName}`;
          addNode({
            id: cardId,
            name: as.name,
            type: "activitySpace",
            description: `${as.description} - ${activity.name} → ${contrib.stateName}`,
            children: [activityNode],
          });

          // Process relationships for this specific instance
          processActivityRelationships(activity, activityNodeId, contrib);
        });
      }
    });
  });

  // Also process flat activities list (legacy support)
  const flatActivities = practice.activities || [];
  flatActivities.forEach((activity: any) => {
    const spaceName = activity.activitySpaceName || "Other";
    const contributions = activity.contributesTo || [];

    if (contributions.length === 0) {
      // Activity with no contributions - create a single card
      const activityNode: TopologyNode = {
        id: `activity:${activity.name}`,
        name: activity.name,
        type: "activity",
        description: activity.description,
        group: spaceName,
      };
      nodeIds.add(activityNode.id);

      addNode({
        id: `activitySpace:${spaceName}:${activity.name}`,
        name: spaceName,
        type: "activitySpace",
        description: `${spaceName} - ${activity.name}`,
        children: [activityNode],
      });

      processActivityRelationships(activity, activityNode.id, null);
    } else {
      // Create a separate card for each alpha state contribution
      contributions.forEach((contrib: any) => {
        const activityNodeId = `activity:${activity.name}:${contrib.alphaName}:${contrib.stateName}`;
        const activityNode: TopologyNode = {
          id: activityNodeId,
          name: activity.name,
          type: "activity",
          description: activity.description,
          group: spaceName,
        };
        nodeIds.add(activityNodeId);

        const cardId = `activitySpace:${spaceName}:${activity.name}:${contrib.alphaName}:${contrib.stateName}`;
        addNode({
          id: cardId,
          name: spaceName,
          type: "activitySpace",
          description: `${spaceName} - ${activity.name} → ${contrib.stateName}`,
          children: [activityNode],
        });

        processActivityRelationships(activity, activityNodeId, contrib);
      });
    }
  });

  return { nodes, edges };

  // Helper function to process activity relationships
  // specificContribution: if provided, only create edge for this contribution; if null, skip alpha contributions
  function processActivityRelationships(
    activity: any,
    activityId: string,
    specificContribution: any
  ): void {
    // Add Activity -> AlphaState edge (only for the specific contribution this instance handles)
    if (specificContribution) {
      const alphaCardId = `alpha:${specificContribution.alphaName}:${specificContribution.stateName}`;

      // Ensure the alpha card exists (it might be from baseline)
      if (!nodeIds.has(alphaCardId)) {
        ensureNode(alphaCardId, "alpha", specificContribution.alphaName);
      }

      edges.push({
        id: `${activityId}->${specificContribution.alphaName}:${specificContribution.stateName}`,
        source: activityId,
        target: alphaCardId,
        type: "contributes",
        label: "contributes",
      });
    }

    // Add Activity -> WorkProduct edges (worksOn)
    const worksOn = activity.worksOn || [];
    worksOn.forEach((wp: any) => {
      // Build the work product card ID that matches this specific activity instance
      let workProductCardId: string;

      if (specificContribution) {
        // Activity instance with specific contribution
        workProductCardId = `workProduct:${wp.workProductName}:activity:${activity.name}:${specificContribution.alphaName}:${specificContribution.stateName}`;
      } else {
        // Activity with no contributions
        workProductCardId = `workProduct:${wp.workProductName}:activity:${activity.name}`;
      }

      // Ensure the work product card exists
      if (!nodeIds.has(workProductCardId)) {
        ensureNode(workProductCardId, "workProduct", wp.workProductName);
      }

      edges.push({
        id: `${activityId}->${workProductCardId}`,
        source: activityId,
        target: workProductCardId,
        type: "worksOn",
        label: "works on",
      });
    });

    // Add CompetencyLevel -> Activity edges (recommended)
    const recommendedLevels = activity.recommendedCompetencyLevels || [];
    recommendedLevels.forEach((cl: any) => {
      // Build the competency card ID that matches this specific activity instance
      let competencyCardId: string;

      if (specificContribution) {
        // Activity instance with specific contribution
        competencyCardId = `competency:${cl.competencyName}:${cl.competencyLevelName}:recommended:${activity.name}:${specificContribution.alphaName}:${specificContribution.stateName}`;
      } else {
        // Activity with no contributions
        competencyCardId = `competency:${cl.competencyName}:${cl.competencyLevelName}:recommended:${activity.name}`;
      }

      // Ensure the competency card exists (it might be from baseline or not yet created)
      if (!nodeIds.has(competencyCardId)) {
        ensureNode(competencyCardId, "competency", cl.competencyName);
      }

      edges.push({
        id: `${competencyCardId}->${activityId}`,
        source: competencyCardId,
        target: activityId,
        type: "recommended",
        label: "recommended for",
      });
    });

    // Required competencies are hidden - no edges created
  }
}

/**
 * Calculate statistics about the topology
 */
export function calculateTopologyStats(data: TopologyData) {
  const nodesByType = data.nodes.reduce(
    (acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    },
    {} as Record<TopologyNodeType, number>
  );

  const edgesByType = data.edges.reduce(
    (acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    },
    {} as Record<TopologyEdgeType, number>
  );

  return {
    totalNodes: data.nodes.length,
    totalEdges: data.edges.length,
    nodesByType,
    edgesByType,
  };
}
