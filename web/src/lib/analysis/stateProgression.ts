import type { PracticeBaseline } from "@/lib/types";

/**
 * Finds all activities that contribute to (progress) a specific alpha state
 */
export function findActivitiesProgressingState(
  alphaName: string,
  stateName: string,
  baseline: PracticeBaseline
): string[] {
  const progressedBy: string[] = [];

  // Collect all activities from activity spaces and flat activities array
  const allActivities: any[] = [];

  // Get activities from activity spaces
  for (const space of baseline.activitySpaces || []) {
    if (space.activities) {
      allActivities.push(...space.activities);
    }
  }

  // Also check flat activities array (legacy support)
  if ("activities" in baseline && Array.isArray((baseline as any).activities)) {
    allActivities.push(...(baseline as any).activities);
  }

  // Find activities that contribute to this state
  for (const activity of allActivities) {
    const activityName = String(activity.name ?? "");
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

    for (const contrib of contributesTo) {
      const contribAlphaName = String(contrib.alphaName ?? "");
      const contribStateName = String(contrib.stateName ?? "");

      if (contribAlphaName === alphaName && contribStateName === stateName) {
        progressedBy.push(activityName);
        break; // Only add each activity once per state
      }
    }
  }

  return progressedBy;
}

/**
 * Finds all work product levels of detail that contribute to (evidence) a specific alpha state
 */
export function findWorkProductsEvidencingState(
  alphaName: string,
  stateName: string,
  baseline: PracticeBaseline
): Array<{ workProductName: string; levelOfDetailName: string }> {
  const evidencedBy: Array<{ workProductName: string; levelOfDetailName: string }> = [];

  for (const wp of baseline.workProducts || []) {
    const wpName = String(wp.name ?? "");
    const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];

    for (const lod of lods) {
      const lodName = String(lod.name ?? "");
      const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];

      for (const contrib of contributesTo) {
        const contribAlphaName = String(contrib.alphaName ?? "");
        const contribStateName = String(contrib.stateName ?? "");

        if (contribAlphaName === alphaName && contribStateName === stateName) {
          evidencedBy.push({
            workProductName: wpName,
            levelOfDetailName: lodName
          });
          break; // Only add each LOD once per state
        }
      }
    }
  }

  return evidencedBy;
}
