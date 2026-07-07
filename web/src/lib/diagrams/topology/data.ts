/**
 * Extract topology diagram data from practice/method
 * Shows only Alphas and their relationships via contributesTo and relatesTo
 */

export type TopologyNodeType = "alpha";

export type TopologyEdgeType = "contributesTo" | "relatesTo";

export interface TopologyNode {
  id: string;
  name: string;
  type: TopologyNodeType;
  description?: string;
  focusName?: string;
  isPlaceholder?: boolean;
  assetNames?: Array<{ assetName: string; type: string }>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: TopologyEdgeType;
  label?: string;
  relationshipType?: string; // For relatesTo edges, the specific relationship type
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

/**
 * Extract topology data from a practice or method
 * Only extracts Alphas and their contributesTo/relatesTo relationships
 */
export function extractTopologyData(practice: any): TopologyData {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const nodeIds = new Set<string>();

  if (!practice) {
    return { nodes, edges };
  }

  console.log("Extracting alpha topology from practice:", {
    name: practice.name,
    alphas: practice.alphas?.length || 0,
  });

  // Helper to add a node and track its ID
  function addNode(node: TopologyNode) {
    nodes.push(node);
    nodeIds.add(node.id);
  }

  // Helper to ensure a placeholder node exists for referenced alphas
  function ensurePlaceholderNode(alphaName: string, focusName?: string) {
    const id = `alpha:${alphaName}`;
    if (!nodeIds.has(id)) {
      addNode({
        id,
        name: alphaName,
        type: "alpha",
        description: "(Referenced from baseline or another practice)",
        focusName,
        states: [],
        isPlaceholder: true,
      });
    }
  }

  // Extract Alphas
  const alphas = practice.alphas || [];
  alphas.forEach((alpha: any) => {
    const alphaNode: TopologyNode = {
      id: `alpha:${alpha.name}`,
      name: alpha.name,
      type: "alpha",
      description: alpha.description,
      focusName: alpha.focusName,
      isPlaceholder: false,
      assetNames: alpha.assetNames,
    };

    addNode(alphaNode);

    // Add contributesTo edge if present
    if (alpha.contributesTo) {
      ensurePlaceholderNode(alpha.contributesTo, alpha.focusName);
      edges.push({
        id: `contributes:${alpha.name}->${alpha.contributesTo}`,
        source: `alpha:${alpha.name}`,
        target: `alpha:${alpha.contributesTo}`,
        type: "contributesTo",
        label: "contributes to",
      });
    }

    // Add relatesTo edges if present
    if (alpha.relatesTo && Array.isArray(alpha.relatesTo)) {
      alpha.relatesTo.forEach((relation: any) => {
        const relatedAlphaName = typeof relation === 'string' ? relation : relation.alphaName;
        const relationshipType = typeof relation === 'object' ? relation.relationship : undefined;

        ensurePlaceholderNode(relatedAlphaName);
        edges.push({
          id: `relates:${alpha.name}->${relatedAlphaName}:${relationshipType || 'relates'}`,
          source: `alpha:${alpha.name}`,
          target: `alpha:${relatedAlphaName}`,
          type: "relatesTo",
          label: relationshipType || "relates to",
          relationshipType,
        });
      });
    }
  });

  console.log("Extracted topology:", {
    nodes: nodes.length,
    edges: edges.length,
  });

  return { nodes, edges };
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
