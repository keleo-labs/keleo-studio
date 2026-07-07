/**
 * Radar chart data transformation for practice/method alpha coverage
 */

import type { FocusGroup } from "../../analysis/methodFocus";

export interface RadarSpine {
  /** Alpha name */
  label: string;
  /** Alpha description for tooltips */
  description: string;
  /** Coverage score */
  value: number;
  /** Focus name (Value, Solution, Endeavor) */
  focus: string;
  /** Angle in degrees (0-360) */
  angle: number;
  /** Index within the radar */
  index: number;
}

export interface RadarDataset {
  spines: RadarSpine[];
  /** Maximum score across all spines for normalization */
  maxScore: number;
  /** Focus grouping info for visual segmentation */
  focusSegments: Array<{
    focusName: string;
    startIndex: number;
    endIndex: number;
    color: string;
  }>;
}

/**
 * Transform alpha scores into radar chart format
 * Spines are ordered by focus grouping (Value, Solution, Endeavor)
 */
export function transformAlphaScoresToRadar(
  alphasByFocus: Map<string, FocusGroup>,
  options?: {
    /** Fixed max score for consistent scaling across charts */
    fixedMaxScore?: number;
    /** Focus ordering (default: ["Value", "Solution", "Endeavor"]) */
    focusOrder?: string[];
  }
): RadarDataset {
  const focusOrder = options?.focusOrder || ["Value", "Solution", "Endeavor"];
  const spines: RadarSpine[] = [];
  const focusSegments: RadarDataset["focusSegments"] = [];

  let globalMaxScore = 0;
  let currentIndex = 0;

  // Group by focus in specified order
  for (const focusName of focusOrder) {
    const focusGroup = alphasByFocus.get(focusName);
    if (!focusGroup || focusGroup.alphas.length === 0) continue;

    const startIndex = currentIndex;

    // Add each alpha as a spine
    for (const alphaScore of focusGroup.alphas) {
      const alphaName = String(alphaScore.alpha.name ?? "");
      const description = alphaScore.alpha.description ?? "";
      const score = alphaScore.score;

      globalMaxScore = Math.max(globalMaxScore, score);

      spines.push({
        label: alphaName,
        description,
        value: score,
        focus: focusName,
        angle: 0, // Will be calculated below
        index: currentIndex,
      });

      currentIndex++;
    }

    const endIndex = currentIndex - 1;

    focusSegments.push({
      focusName,
      startIndex,
      endIndex,
      color: getFocusColor(focusName),
    });
  }

  // Calculate angles for each spine (evenly distributed)
  const angleStep = 360 / spines.length;
  spines.forEach((spine, i) => {
    spine.angle = i * angleStep;
  });

  const maxScore = options?.fixedMaxScore ?? Math.max(globalMaxScore, 10);

  return { spines, maxScore, focusSegments };
}

function getFocusColor(focusName: string): string {
  const colorMap: Record<string, string> = {
    Value: "rgba(74, 222, 128, 0.3)",
    Solution: "rgba(250, 204, 21, 0.3)",
    Endeavor: "rgba(56, 189, 248, 0.3)",
  };
  return colorMap[focusName] || "rgba(128, 128, 128, 0.3)";
}

export function getFocusStrokeColor(focusName: string): string {
  const colorMap: Record<string, string> = {
    Value: "#4ade80",
    Solution: "#facc15",
    Endeavor: "#38bdf8",
  };
  return colorMap[focusName] || "#888888";
}

export function getFocusSolidColor(focusName: string): string {
  const colorMap: Record<string, string> = {
    Value: "#4ade80",
    Solution: "#facc15",
    Endeavor: "#38bdf8",
  };
  return colorMap[focusName] || "#888888";
}

/**
 * Create initialism from alpha name
 * Examples: "Platform" -> "P", "Platform Asset" -> "PA", "Way Of Working" -> "WOW"
 */
export function createInitialism(name: string): string {
  // Split by spaces and extract first letter of each word
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word - check for capital letters (camelCase/PascalCase)
    const capitals = name.match(/[A-Z]/g);
    if (capitals && capitals.length > 1) {
      return capitals.join('');
    }
    // Just return first letter if single word with no capitals
    return name.charAt(0).toUpperCase();
  }

  // Multiple words - use first letter of each word
  return words.map(word => word.charAt(0).toUpperCase()).join('');
}
