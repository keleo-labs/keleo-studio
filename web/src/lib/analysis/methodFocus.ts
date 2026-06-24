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
      let nScore = 1;
      for (const narrative of narratives) {
        nScore += 1;
      }
      if (nScore > 1) nScore = 2;
      score += nScore;
      maxScore += 2;

      // 6.2: State Checklist Coverage (max 4 points)
      const states = Array.isArray(alpha.states) ? alpha.states : [];
      let stateScore = 0;
      const stateCount = states.length;
      for (const state of states) {
        const checklist = Array.isArray(state.checklist) ? state.checklist : [];
        if (checklist.length > 0) {
          stateScore += 1;
        }
      }
      if (stateCount > 0) {
        stateScore = Math.floor(stateScore / stateCount);
      }
      // Cap at 4
      if (stateScore > 4) stateScore = 4;
      score += stateScore;
      maxScore += 4;

      // 6.3: Work Product Contribution (max 2 points)
      let wpScore = 0;
      for (const wp of workProducts) {
        const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
        let hasContribution = false;
        for (const lod of lods) {
          const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
          const contributesToThisAlpha = contributesTo.some((contrib: any) => {
            const contribAlphaName = String(contrib.alphaName ?? "");
            return contribAlphaName === alphaName;
          });
          if (contributesToThisAlpha) {
            hasContribution = true;
            break;
          }
        }
        if (hasContribution) {
          wpScore += 1;
          break; // Only count once per work product
        }
      }
      if (wpScore > 1) wpScore = 2;
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
          break; // Only count once per activity
        }
      }
      if (aScore > 1) aScore = 2;
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
 * Only scores properties that are ADDED BY the extension practice,
 * not those that already exist in the baseline.
 *
 * Compares the GROUPED structure (merged activities) against the BASELINE structure
 * to identify what's new.
 *
 * @param _doc - The merged/resolved document (unused, kept for API consistency)
 * @param baseline - The pure baseline document (before merge)
 * @param grouped - The grouped merged structure (from groupByFocus)
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

  // Build baseline activity space map from the PURE baseline (before merge)
  const baselineActivitySpaceMap = new Map<string, any>();
  const baselineActivitySpaces = baseline.activitySpaces ?? [];
  for (const activitySpace of baselineActivitySpaces) {
    const spaceName = String(activitySpace.name ?? "").trim();
    baselineActivitySpaceMap.set(spaceName, activitySpace);
  }


  // Initialize scores for all baseline activity spaces
  const scores = new Map<string, ActivitySpaceScore>();

  // First, set all baseline activity spaces to score 0
  for (const [spaceName, baselineSpace] of baselineActivitySpaceMap) {
    const focusName = String(baselineSpace.focusName ?? "").trim();
    scores.set(spaceName, {
      activitySpace: baselineSpace,
      focusName,
      score: 0,
      activityScores: []
    });
  }

  // Now score each baseline activity space by comparing grouped (merged) vs baseline
  for (const [spaceName, baselineSpace] of baselineActivitySpaceMap) {
    let score = 0;
    let maxScore = 0;

    // Find the merged activity space from the grouped structure
    let mergedSpace: any = null;
    for (const focus of grouped) {
      const spaces = focus.activitySpaces ?? [];
      mergedSpace = spaces.find((s: any) => String(s.name ?? "").trim() === spaceName);
      if (mergedSpace) break;
    }


    // 1. Narrative Coverage (max 2 points) - only count narratives ADDED by extension
    const mergedNarratives = mergedSpace && Array.isArray(mergedSpace.narratives)
      ? mergedSpace.narratives
      : [];
    const baselineNarratives = Array.isArray(baselineSpace.narratives) ? baselineSpace.narratives : [];
    const addedNarrativesCount = Math.max(0, mergedNarratives.length - baselineNarratives.length);
    let nScore = 0;
    if (addedNarrativesCount > 0) {
      nScore = 1;
      if (addedNarrativesCount > 1) {
        nScore = 2;
      }
    }
    score += nScore;
    maxScore += 2;

    // 2. Activity Count Coverage (max 3 points) - only count activities ADDED by extension
    const mergedSpaceActivities = mergedSpace && Array.isArray(mergedSpace.activities)
      ? mergedSpace.activities
      : [];
    const baselineSpaceActivities = Array.isArray(baselineSpace.activities) ? baselineSpace.activities : [];
    const addedActivitiesCount = Math.max(0, mergedSpaceActivities.length - baselineSpaceActivities.length);
    let activityCountScore = 0;
    if (addedActivitiesCount >= 5) {
      activityCountScore = 3;
    } else if (addedActivitiesCount >= 3) {
      activityCountScore = 2;
    } else if (addedActivitiesCount >= 1) {
      activityCountScore = 1;
    }
    score += activityCountScore;
    maxScore += 3;

    // 3. Alpha Contribution Coverage (max 2 points) - only count NEW alpha contributions
    const mergedContributesTo = mergedSpace && Array.isArray(mergedSpace.contributesTo)
      ? mergedSpace.contributesTo
      : [];
    const baselineContributesTo = Array.isArray(baselineSpace.contributesTo) ? baselineSpace.contributesTo : [];
    const baselineAlphaSet = new Set(
      baselineContributesTo.map((c: any) => `${c.alphaName}:${c.stateName}`)
    );
    const addedAlphas = new Set<string>();
    for (const contrib of mergedContributesTo) {
      const key = `${contrib.alphaName}:${contrib.stateName}`;
      if (!baselineAlphaSet.has(key)) {
        addedAlphas.add(String(contrib.alphaName ?? "").trim());
      }
    }
    let alphaContribScore = 0;
    if (addedAlphas.size >= 2) {
      alphaContribScore = 2;
    } else if (addedAlphas.size === 1) {
      alphaContribScore = 1;
    }
    score += alphaContribScore;
    maxScore += 2;

    // 4. Competency Diversity (max 2 points) - only count NEW competencies
    const mergedCompetencies = mergedSpace && Array.isArray(mergedSpace.requiredCompetencies)
      ? mergedSpace.requiredCompetencies
      : [];
    const baselineCompetencies = Array.isArray(baselineSpace.requiredCompetencies)
      ? baselineSpace.requiredCompetencies
      : [];
    const baselineCompSet = new Set(baselineCompetencies.map((c: string) => c.trim()));
    const addedCompetencies = new Set<string>();
    for (const comp of mergedCompetencies) {
      const compName = String(comp ?? "").trim();
      if (compName && !baselineCompSet.has(compName)) {
        addedCompetencies.add(compName);
      }
    }
    let competencyScore = 0;
    if (addedCompetencies.size >= 3) {
      competencyScore = 2;
    } else if (addedCompetencies.size === 2) {
      competencyScore = 1;
    }
    score += competencyScore;
    maxScore += 2;

    // 5. PersonaGroup Involvement (max 1 point) - only count NEW personas
    const mergedInvolves = mergedSpace && Array.isArray(mergedSpace.involves)
      ? mergedSpace.involves
      : [];
    const baselineInvolves = Array.isArray(baselineSpace.involves) ? baselineSpace.involves : [];
    const baselineInvolvesSet = new Set(baselineInvolves.map((p: string) => p.trim()));
    const addedPersonas = mergedInvolves.filter((p: string) =>
      !baselineInvolvesSet.has(String(p ?? "").trim())
    );
    const personaScore = addedPersonas.length > 0 ? 1 : 0;
    score += personaScore;
    maxScore += 1;

    // 6. Normalize score to 0-5 range
    const normalizedScore = maxScore > 0 ? Math.round((5 * score) / maxScore) : 0;

    // Update the score for this activity space
    const existing = scores.get(spaceName);
    if (existing) {
      existing.score = normalizedScore;

      // Calculate scores for nested activities (comparing merged vs baseline)
      // Only score activities that were ADDED (not in baseline)
      const baselineActivityNames = new Set(
        baselineSpaceActivities.map((a: any) => String(a.name ?? "").trim())
      );
      const addedActivities = mergedSpaceActivities.filter(
        (a: any) => !baselineActivityNames.has(String(a.name ?? "").trim())
      );

      for (const addedActivity of addedActivities) {
        const activityScore = calculateSingleActivityScore(addedActivity, baselineSpace);
        existing.activityScores = existing.activityScores || [];
        existing.activityScores.push({ activity: addedActivity, score: activityScore });
      }

      // Average activity space score with average of nested activity scores
      if (existing.activityScores.length > 0) {
        const totalActivityScore = existing.activityScores.reduce((sum, act) => sum + act.score, 0);
        const avgActivityScore = Math.round(totalActivityScore / existing.activityScores.length);
        // Combine space's direct score with average activity score
        existing.score = Math.round((existing.score + avgActivityScore) / 2);
      }
    }
  }

  // Group by focus for display
  // Build focus map from both baseline and grouped structures
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
 * Helper function to calculate a score for a single activity.
 * Only scores properties that are ADDED by the source activity,
 * not those that already exist in a baseline activity with the same name.
 *
 * @param activity - The source activity to score
 * @param baselineSpace - The baseline activity space (to check for existing activities)
 * @returns Normalized score (0-5)
 */
function calculateSingleActivityScore(activity: any, baselineSpace: any): number {
  let score = 0;
  let maxScore = 0;

  // Find if this activity exists in the baseline
  const activityName = String(activity.name ?? "").trim();
  const baselineActivities = Array.isArray(baselineSpace.activities) ? baselineSpace.activities : [];
  const baselineActivity = baselineActivities.find(
    (a: any) => String(a.name ?? "").trim() === activityName
  );

  // 1. Narrative Coverage (max 2 points) - only count ADDED narratives
  const narratives = Array.isArray(activity.narratives) ? activity.narratives : [];
  const baselineNarratives = baselineActivity && Array.isArray(baselineActivity.narratives)
    ? baselineActivity.narratives
    : [];
  const addedNarrativesCount = narratives.length - baselineNarratives.length;
  let nScore = 0;
  if (addedNarrativesCount > 0) {
    nScore = 1;
    if (addedNarrativesCount > 1) {
      nScore = 2;
    }
  } else if (!baselineActivity && narratives.length > 0) {
    // If this is a completely new activity (not in baseline), score its narratives
    nScore = narratives.length >= 2 ? 2 : 1;
  }
  score += nScore;
  maxScore += 2;

  // 2. Alpha State Contribution (max 3 points) - only count NEW contributions
  const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
  const baselineContributesTo = baselineActivity && Array.isArray(baselineActivity.contributesTo)
    ? baselineActivity.contributesTo
    : [];
  const baselineContribSet = new Set(
    baselineContributesTo.map((c: any) => `${c.alphaName}:${c.stateName}`)
  );
  const addedContribs = contributesTo.filter((c: any) => {
    const key = `${c.alphaName}:${c.stateName}`;
    return !baselineContribSet.has(key);
  });
  let alphaContribScore = 0;
  const contribCount = baselineActivity ? addedContribs.length : contributesTo.length;
  if (contribCount >= 3) {
    alphaContribScore = 3;
  } else if (contribCount === 2) {
    alphaContribScore = 2;
  } else if (contribCount === 1) {
    alphaContribScore = 1;
  }
  score += alphaContribScore;
  maxScore += 3;

  // 3. Work Product Contribution (max 3 points) - only count NEW work products
  const worksOn = Array.isArray(activity.worksOn) ? activity.worksOn : [];
  const baselineWorksOn = baselineActivity && Array.isArray(baselineActivity.worksOn)
    ? baselineActivity.worksOn
    : [];
  const baselineWorksOnSet = new Set(
    baselineWorksOn.map((w: any) => `${w.workProductName}:${w.levelOfDetailName}`)
  );
  const addedWorksOn = worksOn.filter((w: any) => {
    const key = `${w.workProductName}:${w.levelOfDetailName}`;
    return !baselineWorksOnSet.has(key);
  });
  let workProductScore = 0;
  const worksOnCount = baselineActivity ? addedWorksOn.length : worksOn.length;
  if (worksOnCount >= 3) {
    workProductScore = 3;
  } else if (worksOnCount === 2) {
    workProductScore = 2;
  } else if (worksOnCount === 1) {
    workProductScore = 1;
  }
  score += workProductScore;
  maxScore += 3;

  // 4. Recommended Competency Levels (max 2 points) - only count NEW levels
  const recommendedCompetencyLevels = Array.isArray(activity.recommendedCompetencyLevels)
    ? activity.recommendedCompetencyLevels
    : [];
  const baselineCompLevels = baselineActivity && Array.isArray(baselineActivity.recommendedCompetencyLevels)
    ? baselineActivity.recommendedCompetencyLevels
    : [];
  const baselineCompLevelSet = new Set(
    baselineCompLevels.map((c: any) => `${c.competencyName}:${c.competencyLevelName}`)
  );
  const addedCompLevels = recommendedCompetencyLevels.filter((c: any) => {
    const key = `${c.competencyName}:${c.competencyLevelName}`;
    return !baselineCompLevelSet.has(key);
  });
  let competencyLevelScore = 0;
  const compLevelCount = baselineActivity ? addedCompLevels.length : recommendedCompetencyLevels.length;
  if (compLevelCount >= 2) {
    competencyLevelScore = 2;
  } else if (compLevelCount === 1) {
    competencyLevelScore = 1;
  }
  score += competencyLevelScore;
  maxScore += 2;

  // 5. Normalize score to 0-5 range
  const normalizedScore = maxScore > 0 ? Math.round((5 * score) / maxScore) : 0;

  return normalizedScore;
}
