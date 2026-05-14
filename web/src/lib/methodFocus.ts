/**
 * Method Focus analysis utilities
 * Calculates coverage scores for baseline alphas based on practice/method content
 */

import { groupByFocus } from "./ir";

export interface AlphaScore {
  alpha: any;
  focusName: string;
  score: number;
  newAlphas?: Array<{ alpha: any; score: number }>;
}

export interface FocusGroup {
  focusObj: any;
  alphas: AlphaScore[];
}

/**
 * Calculates alpha coverage scores for a practice or method.
 *
 * @param doc - The source document (practice or method) containing work products and activities
 * @param baseline - The enriched baseline document with merged alphas
 * @param grouped - The grouped baseline structure (from groupByFocus)
 * @returns Map of focus names to their alphas with calculated scores
 */
export function calculateAlphaScores(
  doc: any,
  baseline: any,
  grouped: any[]
): Map<string, FocusGroup> {
  if (!baseline || !doc) {
    return new Map();
  }

  const sourceDocRecord = doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};

  // Build map of extension alphas (alphas with contributesTo property)
  const extensionAlphasMap = new Map<string, { alpha: any; contributesTo: string }>();
  for (const focus of grouped) {
    const alphas = focus.alphas ?? [];
    for (const alpha of alphas) {
      const alphaName = String(alpha.name ?? "").trim();
      const contributesTo = String(alpha.contributesTo ?? "").trim();
      if (contributesTo) {
        extensionAlphasMap.set(alphaName, { alpha, contributesTo });
      }
    }
  }

  // Build baseline alpha map (exclude extension alphas)
  const baselineGrouped = groupByFocus(baseline);
  const baselineAlphaMap = new Map<string, { alpha: any; focusName: string }>();
  for (const focus of baselineGrouped) {
    const focusName = String(focus.focusName ?? "");
    const alphas = focus.alphas ?? [];
    for (const alpha of alphas) {
      const alphaName = String(alpha.name ?? "");
      // Only add if it's NOT an extension alpha
      if (!extensionAlphasMap.has(alphaName)) {
        baselineAlphaMap.set(alphaName, { alpha, focusName });
      }
    }
  }

  // Get work products from the source document (handling both practices and methods)
  let workProducts: any[] = [];
  if (Array.isArray(sourceDocRecord.workProducts)) {
    workProducts = sourceDocRecord.workProducts;
  } else if (Array.isArray(sourceDocRecord.practices)) {
    // Method composition - collect work products from all practices
    for (const practice of sourceDocRecord.practices) {
      if (practice && Array.isArray(practice.workProducts)) {
        workProducts.push(...practice.workProducts);
      }
    }
  }

  // Get activities from grouped structure
  const activities: any[] = [];
  for (const focus of grouped) {
    const activitySpaces = focus.activitySpaces ?? [];
    for (const space of activitySpaces) {
      const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
      activities.push(...spaceActivities);
    }
  }

  // Initialize scores for all baseline alphas
  const scores = new Map<string, AlphaScore>();
  for (const [alphaName, { alpha, focusName }] of baselineAlphaMap) {
    scores.set(alphaName, { alpha, focusName, score: 0, newAlphas: [] });
  }

  // Calculate scores for each alpha in the practice/method
  for (const focus of grouped) {
    const alphas = focus.alphas ?? [];

    for (const alpha of alphas) {
      const alphaName = String(alpha.name ?? "");
      const isExtensionAlpha = extensionAlphasMap.has(alphaName);
      const isBaselineAlpha = baselineAlphaMap.has(alphaName);
      let score = 0;

      // +1 for each narrative on the alpha
      const narratives = Array.isArray(alpha.narratives) ? alpha.narratives : [];
      score += narratives.length;

      // +1 for each checklist in the alpha's states
      const states = Array.isArray(alpha.states) ? alpha.states : [];
      for (const state of states) {
        const checklist = Array.isArray(state.checklist) ? state.checklist : [];
        if (checklist.length > 0) {
          score += 1;
        }
      }

      // +1 for each work product that contributes to this alpha
      for (const wp of workProducts) {
        const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
        for (const lod of lods) {
          const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
          const contributesToThisAlpha = contributesTo.some((contrib: any) => {
            const contribAlphaName = String(contrib.alphaName ?? "");
            return contribAlphaName === alphaName;
          });
          if (contributesToThisAlpha) {
            score += 1;
            break; // Only count once per work product
          }
        }
      }

      // +1 for each activity that contributes to this alpha
      for (const activity of activities) {
        const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
        const contributesToThisAlpha = contributesTo.some((contrib: any) => {
          const contribAlphaName = String(contrib.alphaName ?? "");
          return contribAlphaName === alphaName;
        });
        if (contributesToThisAlpha) {
          score += 1;
          break; // Only count once per activity
        }
      }

      if (isExtensionAlpha) {
        // Extension alpha - add score to parent baseline alpha
        const extensionAlphaInfo = extensionAlphasMap.get(alphaName);
        const parentAlphaName = extensionAlphaInfo?.contributesTo ?? "";
        if (parentAlphaName && scores.has(parentAlphaName)) {
          const parentEntry = scores.get(parentAlphaName);
          if (parentEntry) {
            parentEntry.newAlphas = parentEntry.newAlphas || [];
            parentEntry.newAlphas.push({ alpha, score });
            parentEntry.score += score;
          }
        }
      } else if (isBaselineAlpha) {
        // Baseline alpha - add direct score
        const existing = scores.get(alphaName);
        if (existing) {
          existing.score += score;
        }
      }
    }
  }

  // Group by focus for display
  const focusMap = new Map<string, any>();
  for (const groupedFocus of grouped) {
    const focusName = String(groupedFocus.focusName ?? "");
    if (!focusMap.has(focusName)) {
      focusMap.set(focusName, groupedFocus.focus);
    }
  }

  const byFocus = new Map<string, FocusGroup>();
  scores.forEach(({ alpha, focusName, score, newAlphas }) => {
    if (!byFocus.has(focusName)) {
      byFocus.set(focusName, {
        focusObj: focusMap.get(focusName) || null,
        alphas: []
      });
    }
    byFocus.get(focusName)!.alphas.push({ alpha, focusName, score, newAlphas });
  });

  return byFocus;
}
