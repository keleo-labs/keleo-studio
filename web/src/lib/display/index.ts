/**
 * Display utilities - UI transformations, formatting, theming.
 * Barrel export for clean imports.
 */

// Citations
export { formatAPA7Citation, formatInTextCitation, getCitationsForNarrative } from "./citations";

// Assets
export { findAsset, findAssetsByType } from "./assets";

// Element display (aliases and tags)
export {
  buildPracticeElementAliasLookup,
  getAliasedDisplay,
  diagramMeasureName,
  formatAliasedNameHtml,
  EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
  synthesizedPracticeElementTags,
  normalizePracticeElementTags,
  mergePracticeElementTags,
  flattenPracticeElementTags,
  isSynthesizedPracticeElementTags,
  practiceTagsBucketLines,
  practiceTagsFromBucketLines,
  SYNTHESIZED_TAG,
  type PracticeElementAliasLookup,
} from "./elementDisplay";

// Source tracking
export { buildElementSourceMap, findElementSource } from "./sourceTracking";

// Theme and language pack hooks
export { useTheme } from "./theme";
export { useLanguagePack } from "./languagePack";

// Font loading
export { loadFontFromAsset, preloadPracticeFonts } from "./fontLoader";

// SVG rendering
export { renderIconInSvg } from "./renderIconInSvg";
