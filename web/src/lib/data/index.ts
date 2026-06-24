/**
 * Configuration data and constants - themes, language packs, navigation, defaults.
 * Barrel export for clean imports.
 */

export { THEMES, type ThemeId, type ThemeTokens } from "./themeTokens";
export { PACKS } from "./languagePacksData";
export type { LanguagePack, LanguagePackId, LanguagePackTheme } from "./languagePackTypes";
export { NAVIGATION_CONFIG } from "./navigationConfig";
export { DASHBOARD_CONFIG } from "./dashboardConfig";
export { emptyExtensionPractice, emptyBaselinePractice } from "./practiceFormDefaults";
