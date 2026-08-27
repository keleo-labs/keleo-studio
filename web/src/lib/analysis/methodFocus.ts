/**
 * Method Focus analysis utilities
 * Calculates coverage scores for baseline alphas based on practice/method content
 */

import { groupByFocus } from "../ir";
import type { JsonDocument } from "../storage/types";

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

export interface ActivitySpaceScore {
  activitySpace: any;
  focusName: string;
  score: number;
  activityScores?: Array<{ activity: any; score: number }>;
}

export interface ActivitySpaceFocusGroup {
  focusObj: any;
  activitySpaces: ActivitySpaceScore[];
}

export interface ActivityScore {
  activity: any;
  focusName: string;
  activitySpaceName: string;
  score: number;
}

export interface ActivityFocusGroup {
  focusObj: any;
  activities: ActivityScore[];
}

/**
 * Calculate a simple completeness score for a document without full dependency resolution.
 * This is a fast approximation based on structural element counts.
 * Used for sorting in dashboard views where full alpha scoring would be too expensive.
 *
 * @param doc - The JsonDocument to score
 * @returns A numeric score (higher is more complete)
 */
export function calculateSimpleCompletenessScore(doc: JsonDocument | { body: unknown }): number {
  const body = doc.body;
  if (!body || typeof body !== "object") {
    return 0;
  }

  const obj = body as Record<string, unknown>;
  let score = 0;

  // Count alphas (weight: 3 points each)
  const alphas = Array.isArray(obj.alphas) ? obj.alphas : [];
  score += alphas.length * 3;

  // Count activities (weight: 2 points each)
  const activities = Array.isArray(obj.activities) ? obj.activities : [];
  score += activities.length * 2;

  // Count work products (weight: 2 points each)
  const workProducts = Array.isArray(obj.workProducts) ? obj.workProducts : [];
  score += workProducts.length * 2;

  // For methods with embedded practices, sum up their scores too
  if (Array.isArray(obj.practices)) {
    for (const practice of obj.practices) {
      if (practice && typeof practice === "object") {
        score += calculateSimpleCompletenessScore({ body: practice });
      }
    }
  }

  return score;
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

  // Build baseline alpha map from the ORIGINAL baseline, not the merged/pruned one
  // This ensures ALL baseline alphas are shown, even if not referenced in the extension
  const baselineGrouped = groupByFocus(baseline);
  const baselineAlphaMap = new Map<string, { alpha: any; focusName: string }>();

  // CRITICAL: Always include ALL alphas from the baseline's focuses array
  // This ensures complete baseline coverage is shown even when extension practices
  // don't reference all baseline alphas
  const baselineAlphas = baseline.alphas ?? [];
  for (const alpha of baselineAlphas) {
    const alphaName = String(alpha.name ?? "").trim();
    const alphaFocusName = String(alpha.focusName ?? "").trim();
    // Only add if it's NOT an extension alpha
    if (!extensionAlphasMap.has(alphaName)) {
      baselineAlphaMap.set(alphaName, { alpha, focusName: alphaFocusName });
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
      let maxScore = 0;

      // 6.1: Narrative Coverage (max 2 points)
      const narratives = Array.isArray(alpha.narratives) ? alpha.narratives : [];
      let nScore = 0;
      if (narratives.length >= 2) {
        nScore = 2;
      } else if (narratives.length === 1) {
        nScore = 1;
      }
      score += nScore;
      maxScore += 2;

      // 6.2: State Checklist Coverage (max 4 points)
      const states = Array.isArray(alpha.states) ? alpha.states : [];
      let stateScore = 0;
      const stateCount = states.length;
      if (stateCount > 0) {
        let statesWithChecklist = 0;
        for (const state of states) {
          const checklist = Array.isArray(state.checklist) ? state.checklist : [];
          if (checklist.length > 0) {
            statesWithChecklist += 1;
          }
        }
        stateScore = Math.round((4 * statesWithChecklist) / stateCount);
      }
      score += stateScore;
      maxScore += 4;

      // 6.3: Work Product Contribution (max 2 points)
      let wpScore = 0;
      for (const wp of workProducts) {
        const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
        for (const lod of lods) {
          const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
          const contributesToThisAlpha = contributesTo.some((contrib: any) => {
            const contribAlphaName = String(contrib.alphaName ?? "");
            return contribAlphaName === alphaName;
          });
          if (contributesToThisAlpha) {
            wpScore += 1;
            break;
          }
        }
      }
      if (wpScore > 2) wpScore = 2;
      score += wpScore;
      maxScore += 2;

      // 6.4: Activity Contribution (max 2 points)
      let aScore = 0;
      for (const activity of activities) {
        const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
        const contributesToThisAlpha = contributesTo.some((contrib: any) => {
          const contribAlphaName = String(contrib.alphaName ?? "");
          return contribAlphaName === alphaName;
        });
        if (contributesToThisAlpha) {
          aScore += 1;
        }
      }
      if (aScore > 2) aScore = 2;
      score += aScore;
      maxScore += 2;

      // 6.5: Contributing Alphas (max 2 points)
      let caScore = 0;
      for (const otherAlpha of alphas) {
        const otherContributesTo = String(otherAlpha.contributesTo ?? "").trim();
        if (otherContributesTo === alphaName) {
          caScore += 1;
        }
      }
      if (caScore > 1) caScore = 2;
      score += caScore;
      maxScore += 2;

      // 6.6: Normalize score to 0-5 range
      const normalizedScore = maxScore > 0 ? Math.round((5 * score) / maxScore) : 0;

      if (isExtensionAlpha) {
        // Extension alpha - add score to parent baseline alpha
        const extensionAlphaInfo = extensionAlphasMap.get(alphaName);
        const parentAlphaName = extensionAlphaInfo?.contributesTo ?? "";
        if (parentAlphaName && scores.has(parentAlphaName)) {
          const parentEntry = scores.get(parentAlphaName);
          if (parentEntry) {
            parentEntry.newAlphas = parentEntry.newAlphas || [];
            parentEntry.newAlphas.push({ alpha, score: normalizedScore });
            // Average the scores instead of summing
            const totalExtensionScore = parentEntry.newAlphas.reduce((sum, ext) => sum + ext.score, 0);
            const avgExtensionScore = Math.round(totalExtensionScore / parentEntry.newAlphas.length);
            // Combine parent's direct score with average extension score
            parentEntry.score = Math.min(3, Math.round((parentEntry.score + avgExtensionScore) / 2));
          }
        }
      } else if (isBaselineAlpha) {
        // Baseline alpha - set normalized score
        const existing = scores.get(alphaName);
        if (existing) {
          existing.score = normalizedScore;
        }
      }
    }
  }

  // Group by focus for display
  // Build focus map from both baseline and grouped structures to ensure all focuses are captured
  const focusMap = new Map<string, any>();

  // Add focuses from baseline
  const baselineFocuses = baseline.focuses ?? [];
  for (const focus of baselineFocuses) {
    const focusName = String(focus.name ?? "").trim();
    if (focusName && !focusMap.has(focusName)) {
      focusMap.set(focusName, focus);
    }
  }

  // Add focuses from grouped (may have additional focuses from extensions)
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

/**
 * Calculates activity space coverage scores for a practice or method.
 * Scores intrinsic coverage of each activity space based on the content
 * present in the grouped (merged) structure.
 *
 * @param _doc - The source document (unused, kept for API consistency)
 * @param baseline - The baseline document
 * @param grouped - The grouped structure (from groupByFocus)
 * @returns Map of focus names to their activity spaces with calculated scores
 */
export function calculateActivitySpaceScores(
  _doc: any,
  baseline: any,
  grouped: any[]
): Map<string, ActivitySpaceFocusGroup> {
  if (!baseline || !grouped) {
    return new Map();
  }

  // Collect all activity spaces from the grouped structure
  const spaceEntries: Array<{ space: any; focusName: string }> = [];
  for (const focus of grouped) {
    const focusName = String(focus.focusName ?? "").trim();
    const spaces = focus.activitySpaces ?? [];
    for (const space of spaces) {
      spaceEntries.push({ space, focusName });
    }
  }

  const scores = new Map<string, ActivitySpaceScore>();

  for (const { space, focusName } of spaceEntries) {
    const spaceName = String(space.name ?? "").trim();
    let score = 0;
    let maxScore = 0;

    // 1. Narrative Coverage (max 2 points)
    const narratives = Array.isArray(space.narratives) ? space.narratives : [];
    let nScore = 0;
    if (narratives.length >= 2) {
      nScore = 2;
    } else if (narratives.length === 1) {
      nScore = 1;
    }
    score += nScore;
    maxScore += 2;

    // 2. Activity Count (max 3 points)
    const activities = Array.isArray(space.activities) ? space.activities : [];
    let activityCountScore = 0;
    if (activities.length >= 5) {
      activityCountScore = 3;
    } else if (activities.length >= 3) {
      activityCountScore = 2;
    } else if (activities.length >= 1) {
      activityCountScore = 1;
    }
    score += activityCountScore;
    maxScore += 3;

    // 3. Alpha Contribution Coverage (max 2 points)
    const contributesTo = Array.isArray(space.contributesTo) ? space.contributesTo : [];
    const distinctAlphas = new Set(
      contributesTo.map((c: any) => String(c.alphaName ?? "").trim()).filter(Boolean)
    );
    let alphaContribScore = 0;
    if (distinctAlphas.size >= 2) {
      alphaContribScore = 2;
    } else if (distinctAlphas.size === 1) {
      alphaContribScore = 1;
    }
    score += alphaContribScore;
    maxScore += 2;

    // 4. Competency Diversity (max 2 points)
    const competencies = Array.isArray(space.requiredCompetencies)
      ? space.requiredCompetencies
      : [];
    const distinctCompetencies = new Set(
      competencies.map((c: any) => String(c ?? "").trim()).filter(Boolean)
    );
    let competencyScore = 0;
    if (distinctCompetencies.size >= 3) {
      competencyScore = 2;
    } else if (distinctCompetencies.size >= 1) {
      competencyScore = 1;
    }
    score += competencyScore;
    maxScore += 2;

    // 5. Persona Involvement (max 1 point)
    const involves = Array.isArray(space.involves) ? space.involves : [];
    const personaScore = involves.length > 0 ? 1 : 0;
    score += personaScore;
    maxScore += 1;

    // Normalize to 0-5
    let normalizedScore = maxScore > 0 ? Math.round((5 * score) / maxScore) : 0;

    // Score nested activities
    const activityScores: Array<{ activity: any; score: number }> = [];
    for (const activity of activities) {
      const actScore = calculateSingleActivityScore(activity);
      activityScores.push({ activity, score: actScore });
    }

    // Average space score with mean activity score
    if (activityScores.length > 0) {
      const totalActivityScore = activityScores.reduce((sum, a) => sum + a.score, 0);
      const avgActivityScore = Math.round(totalActivityScore / activityScores.length);
      normalizedScore = Math.round((normalizedScore + avgActivityScore) / 2);
    }

    scores.set(spaceName, {
      activitySpace: space,
      focusName,
      score: normalizedScore,
      activityScores,
    });
  }

  // Group by focus for display
  const focusMap = new Map<string, any>();
  const baselineFocuses = baseline.focuses ?? [];
  for (const focus of baselineFocuses) {
    const fn = String(focus.name ?? "").trim();
    if (fn && !focusMap.has(fn)) focusMap.set(fn, focus);
  }
  for (const groupedFocus of grouped) {
    const fn = String(groupedFocus.focusName ?? "");
    if (!focusMap.has(fn)) focusMap.set(fn, groupedFocus.focus);
  }

  const byFocus = new Map<string, ActivitySpaceFocusGroup>();
  scores.forEach(({ activitySpace, focusName, score, activityScores }) => {
    if (!byFocus.has(focusName)) {
      byFocus.set(focusName, {
        focusObj: focusMap.get(focusName) || null,
        activitySpaces: []
      });
    }
    byFocus.get(focusName)!.activitySpaces.push({
      activitySpace,
      focusName,
      score,
      activityScores
    });
  });

  return byFocus;
}

/**
 * Calculate an intrinsic coverage score for a single activity.
 *
 * @param activity - The activity to score
 * @returns Normalized score (0-5)
 */
function calculateSingleActivityScore(activity: any): number {
  let score = 0;
  let maxScore = 0;

  // 1. Narrative Coverage (max 2 points)
  const narratives = Array.isArray(activity.narratives) ? activity.narratives : [];
  if (narratives.length >= 2) {
    score += 2;
  } else if (narratives.length === 1) {
    score += 1;
  }
  maxScore += 2;

  // 2. Alpha State Contribution (max 3 points)
  const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
  if (contributesTo.length >= 3) {
    score += 3;
  } else if (contributesTo.length === 2) {
    score += 2;
  } else if (contributesTo.length === 1) {
    score += 1;
  }
  maxScore += 3;

  // 3. Work Product Contribution (max 3 points)
  const worksOn = Array.isArray(activity.worksOn) ? activity.worksOn : [];
  if (worksOn.length >= 3) {
    score += 3;
  } else if (worksOn.length === 2) {
    score += 2;
  } else if (worksOn.length === 1) {
    score += 1;
  }
  maxScore += 3;

  // 4. Recommended Competency Levels (max 2 points)
  const compLevels = Array.isArray(activity.recommendedCompetencyLevels)
    ? activity.recommendedCompetencyLevels
    : [];
  if (compLevels.length >= 2) {
    score += 2;
  } else if (compLevels.length === 1) {
    score += 1;
  }
  maxScore += 2;

  return maxScore > 0 ? Math.round((5 * score) / maxScore) : 0;
}
