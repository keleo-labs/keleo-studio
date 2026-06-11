import { narrativeContextRowDisplayText } from "@/lib/ir";
import type { Narrative } from "@/lib/types";
import type { ElementRegistry, ElementFirstMention } from "./types";

/**
 * Generate hierarchical section numbering.
 *
 * @param partIndex - 0-indexed part number
 * @param chapterIndex - 0-indexed chapter number within part
 * @param sectionIndex - Optional 0-indexed section number within chapter
 * @param subsectionIndex - Optional 0-indexed subsection number within section
 * @returns Formatted section number (e.g., "I", "2.3", "2.3.1")
 */
export function generateSectionNumber(
  partIndex: number,
  chapterIndex: number,
  sectionIndex?: number,
  subsectionIndex?: number,
): string {
  const parts = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const partNum = parts[partIndex] ?? `Part ${partIndex + 1}`;

  if (sectionIndex === undefined) {
    return `${chapterIndex + 1}`;
  }
  if (subsectionIndex === undefined) {
    return `${chapterIndex + 1}.${sectionIndex + 1}`;
  }
  return `${chapterIndex + 1}.${sectionIndex + 1}.${subsectionIndex + 1}`;
}

/**
 * Generate part number label (Roman numerals).
 */
export function generatePartNumber(partIndex: number): string {
  const parts = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return parts[partIndex] ?? `${partIndex + 1}`;
}

/**
 * Extract narrative prose from nested narrative structure.
 * Combines description + narrative contexts in sequence order.
 *
 * @param narratives - Array of narrative objects
 * @returns Array of prose paragraphs (no AI generation, pure data extraction)
 */
export function extractNarrativeProse(narratives: Narrative[]): string[] {
  const prose: string[] = [];
  for (const narrative of narratives) {
    const desc = typeof narrative.description === 'string' ? narrative.description.trim() : '';
    if (desc) {
      prose.push(desc);
    }
    if (Array.isArray(narrative.narrativeContexts)) {
      const sorted = [...narrative.narrativeContexts].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      for (const ctx of sorted) {
        const text = narrativeContextRowDisplayText(ctx);
        if (text) {
          prose.push(text);
        }
      }
    }
    if (Array.isArray(narrative.narratives) && narrative.narratives.length > 0) {
      prose.push(...extractNarrativeProse(narrative.narratives));
    }
  }
  return prose;
}

/**
 * Check if this is the first mention of an element across all volumes.
 */
export function isFirstMention(
  elementType: keyof ElementRegistry,
  elementName: string,
  registry: ElementRegistry,
): boolean {
  return !registry[elementType].has(elementName);
}

/**
 * Record the first mention of an element.
 */
export function recordFirstMention(
  elementType: keyof ElementRegistry,
  elementName: string,
  registry: ElementRegistry,
  mention: ElementFirstMention,
): void {
  registry[elementType].set(elementName, mention);
}

/**
 * Get cross-reference text for a previously mentioned element.
 *
 * @returns Cross-reference string like "Chapter 2.3" or null if not found
 */
export function getCrossReference(
  elementType: keyof ElementRegistry,
  elementName: string,
  registry: ElementRegistry,
): string | null {
  const mention = registry[elementType].get(elementName);
  if (!mention) return null;
  return `Chapter ${mention.chapterNumber}`;
}

/**
 * Create a slug for anchor IDs.
 */
export function slug(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generate anchor ID for different element types.
 */
export function alphaId(alphaName: string): string {
  return `alpha-${slug(alphaName)}`;
}

export function stateId(alphaName: string, stateName: string): string {
  return `state-${slug(alphaName)}--${slug(stateName)}`;
}

export function activitySpaceId(name: string): string {
  return `activity-space-${slug(name)}`;
}

export function activityId(name: string): string {
  return `activity-${slug(name)}`;
}

export function workProductId(name: string): string {
  return `work-product-${slug(name)}`;
}

export function competencyId(name: string): string {
  return `competency-${slug(name)}`;
}

export function personaId(name: string): string {
  return `persona-${slug(name)}`;
}

export function patternId(name: string): string {
  return `pattern-${slug(name)}`;
}

export function patternViewId(patternName: string, viewName: string): string {
  return `pattern-${slug(patternName)}-view-${slug(viewName)}`;
}

/**
 * Create empty element registry.
 */
export function createElementRegistry(): ElementRegistry {
  return {
    activities: new Map(),
    alphas: new Map(),
    alphaStates: new Map(),
    workProducts: new Map(),
    competencies: new Map(),
    personas: new Map(),
  };
}
