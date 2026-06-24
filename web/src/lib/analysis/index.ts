/**
 * Business logic and analysis utilities.
 * Barrel export for clean imports.
 */

export {
  calculateAlphaScores,
  calculateActivitySpaceScores,
  calculateSimpleCompletenessScore
} from "./methodFocus";
export type {
  AlphaScore,
  FocusGroup as AlphaScoreFocusGroup,
  ActivitySpaceScore,
  ActivitySpaceFocusGroup,
  ActivityScore,
  ActivityFocusGroup
} from "./methodFocus";
export { extractPracticeNames } from "./extractPracticeNames";
export { relaxCardinalityInSchema } from "./schemaRelax";
