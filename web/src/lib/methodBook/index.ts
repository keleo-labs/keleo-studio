/**
 * Method Book Generation
 *
 * Transforms a Method into a multi-volume book series with traditional publishing structure:
 * - Volume 0: Method Overview
 * - Volumes 1..N: Practice volumes (baseline + extensions)
 * - Final Volume: References & Appendices
 *
 * All content is programmatically generated from JSON data (no AI/LLM required).
 *
 * Organizing Principles:
 * - 'pattern': Pattern-based organization (default)
 * - 'methodBook': Fixed three-part structure (VALUE, SOLUTION, ENDEAVOR) per docs/methodBook.md
 * - 'focus': Focus-based organization (not yet implemented)
 * - 'hybrid': Hybrid pattern+focus organization (not yet implemented)
 */

export { buildMethodBook } from "./buildMethodBook";
export { buildPracticeBook } from "./buildPracticeBook";
export { renderMethodBookHtml } from "./renderBookHtml";
export { organizeByPattern } from "./organizerPattern";
export { organizeByMethodBook } from "./organizerMethodBook";
export type {
  MethodBook,
  BookVolume,
  BookSection,
  BookMetadata,
  BookBullet,
  ElementRegistry,
  ElementFirstMention,
  OrganizingPrinciple,
} from "./types";
