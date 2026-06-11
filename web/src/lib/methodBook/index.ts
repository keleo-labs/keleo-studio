/**
 * Method Book Generation
 *
 * Transforms a Method into a multi-volume book series with traditional publishing structure:
 * - Volume 0: Method Overview
 * - Volumes 1..N: Practice volumes (baseline + extensions)
 * - Final Volume: References & Appendices
 *
 * All content is programmatically generated from JSON data (no AI/LLM required).
 */

export { buildMethodBook } from "./buildMethodBook";
export { buildPracticeBook } from "./buildPracticeBook";
export { renderMethodBookHtml } from "./renderBookHtml";
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
