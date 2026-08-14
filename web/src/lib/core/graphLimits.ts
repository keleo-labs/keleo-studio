// Depth limits per the circular-reference-protection specification (Section 6.1).
// See: keleo-language/specifications/circular-reference-protection.md

export const GRAPH_DEPTH_LIMITS = {
  alphaHierarchy: 20,
  workProductContainment: 10,
  backgroundPrerequisites: 50,
  documentDependencies: 30,
  stateContribution: 20,
  supersedesChain: 100,
} as const;

export class CircularReferenceError extends Error {
  constructor(
    public readonly property: string,
    public readonly chain: string[],
    public readonly documentName?: string,
  ) {
    const cycle = chain.join(" → ");
    const ctx = documentName ? ` in "${documentName}"` : "";
    super(`Circular reference detected in ${property} chain: ${cycle}${ctx}`);
    this.name = "CircularReferenceError";
  }
}

export class DepthLimitExceededError extends Error {
  constructor(
    public readonly property: string,
    public readonly limit: number,
    public readonly elementName: string,
    public readonly path: string[],
  ) {
    super(
      `Depth limit (${limit}) exceeded at "${elementName}" in ${property} chain: ${path.join(" → ")}`,
    );
    this.name = "DepthLimitExceededError";
  }
}
