/**
 * Type definitions for book-structured method documentation.
 *
 * A Method is rendered as a multi-volume book series:
 * - Volume 0: Method Overview
 * - Volumes 1..N: Practice volumes (baseline + extensions)
 * - Final Volume: References & Appendices
 */

export type BookSectionKind = 'frontMatter' | 'part' | 'chapter' | 'section' | 'subsection' | 'backMatter';

export type BookSection = {
  kind: BookSectionKind;
  heading: string;
  number?: string;  // "Part I", "Chapter 2.3", "Section 2.3.1"
  paragraphs: string[];
  bullets?: BookBullet[];
  subsections?: BookSection[];
  anchorId: string;  // For TOC links and cross-references
  pageBreakBefore?: boolean;  // Force page break before this section
};

export type BookBullet = {
  label?: string;  // Optional bold lead-in
  text: string;
};

export type BookMetadata = {
  title: string;
  subtitle?: string;
  authors: string[];
  version: string;
  date: string;
  keywords: string[];
};

export type BookVolume = {
  metadata: BookMetadata;
  frontMatter: BookSection[];
  body: BookSection[];  // Parts containing chapters
  backMatter: BookSection[];
};

export type MethodBook = {
  series: BookMetadata;  // Method-level metadata
  volumes: BookVolume[];  // Volume 0 (overview) + practice volumes + final volume (references)
};

/**
 * Tracks first occurrence of each element across all volumes
 * to implement first-mention-full, subsequent-mention-brief pattern.
 */
export type ElementRegistry = {
  activities: Map<string, ElementFirstMention>;
  alphas: Map<string, ElementFirstMention>;
  alphaStates: Map<string, ElementFirstMention>;  // "AlphaName::StateName"
  workProducts: Map<string, ElementFirstMention>;
  competencies: Map<string, ElementFirstMention>;
  personas: Map<string, ElementFirstMention>;
};

export type ElementFirstMention = {
  volumeIndex: number;  // Which volume (0-indexed)
  partNumber: string;   // "Part I", "Part II", etc.
  chapterNumber: string;  // "1", "2.3", etc.
  sectionAnchor: string;  // HTML anchor for linking
};

/**
 * Organizing principle for practice body structure.
 */
export type OrganizingPrinciple = 'focus' | 'pattern' | 'hybrid' | 'methodBook';
