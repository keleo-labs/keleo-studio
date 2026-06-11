import { buildDisplayAliasLookup } from "@/lib/practiceReport";
import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import type { MethodBook, BookVolume, OrganizingPrinciple, ElementRegistry } from "./types";
import { createElementRegistry } from "./utils";
import {
  generateMethodOverviewVolume,
  generatePracticeVolumeFrontMatter,
  generateReferencesVolumeFrontMatter,
  generateTableOfContents,
} from "./generateFrontMatter";
import { organizeByPattern } from "./organizerPattern";
import { generateReferencesVolume } from "./generateReferencesVolume";

/**
 * Build a complete Method Book from a Method composition.
 *
 * Structure:
 * - Volume 0: Method Overview
 * - Volume 1: Baseline Practice
 * - Volumes 2..N: Extension Practices
 * - Final Volume: References & Appendices
 *
 * @param method - Method composition (baselinePractice + practices)
 * @param organizingPrinciple - How to organize practice bodies ('pattern', 'focus', 'hybrid')
 * @returns Complete MethodBook with N+2 volumes
 */
export function buildMethodBook(
  method: Method,
  organizingPrinciple: OrganizingPrinciple = 'pattern',
): MethodBook {
  // Create shared element registry for tracking first mentions across volumes
  const registry: ElementRegistry = createElementRegistry();

  // Build alias lookup (will use method-level aliases if present)
  const aliases = buildDisplayAliasLookup(method.baselinePractice?.practiceElementAliases);

  // Collect practices - ONLY extensions, baseline goes to appendix
  const baseline = method.baselinePractice;
  const extensions = Array.isArray(method.practices) ? method.practices : [];
  const allPracticesIncludingBaseline: (Practice | PracticeBaseline)[] = [baseline, ...extensions];

  // Create volumes array
  const volumes: BookVolume[] = [];

  // Volume 0: Method Overview
  const methodOverview = generateMethodOverviewVolume(method);
  volumes.push(methodOverview);

  // Volumes 1..N: Extension Practice Volumes ONLY (baseline is in appendix)
  extensions.forEach((practice, idx) => {
    const volumeNumber = idx + 1;  // Volume 1 = first extension, Volume 2 = second extension, etc.
    const practiceVolume = buildPracticeVolume(
      practice,
      registry,
      volumeNumber,
      organizingPrinciple,
      aliases
    );
    volumes.push(practiceVolume);
  });

  // Final Volume: References & Appendices (includes baseline in Appendix B)
  const finalVolumeNumber = extensions.length + 1;
  const referencesVolume = generateReferencesVolume(
    method,
    allPracticesIncludingBaseline,
    registry,
    aliases,
    finalVolumeNumber
  );
  volumes.push(referencesVolume);

  // Build series metadata
  const seriesMetadata = {
    title: String(method.name ?? "Untitled Method"),
    subtitle: "A Multi-Volume Practice Series",
    authors: Array.isArray(baseline.authors) ? baseline.authors : [],
    version: String(baseline.version ?? "1.0.0"),
    date: String(baseline.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: Array.isArray(baseline.keywords) ? baseline.keywords : [],
  };

  return {
    series: seriesMetadata,
    volumes,
  };
}

/**
 * Build a single practice volume (baseline or extension).
 */
function buildPracticeVolume(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeNumber: number,
  organizingPrinciple: OrganizingPrinciple,
  aliases: ReturnType<typeof buildDisplayAliasLookup>,
): BookVolume {
  // Build metadata
  const metadata = {
    title: String(practice.name ?? `Volume ${volumeNumber}`),
    subtitle: `Volume ${volumeNumber}`,
    authors: Array.isArray(practice.authors) ? practice.authors : [],
    version: String(practice.version ?? "1.0.0"),
    date: String(practice.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: Array.isArray(practice.keywords) ? practice.keywords : [],
  };

  // Generate front matter
  const frontMatter = generatePracticeVolumeFrontMatter(practice, volumeNumber, aliases);

  // Generate body based on organizing principle
  const body = buildPracticeBody(practice, registry, volumeNumber, organizingPrinciple, aliases);

  // Generate table of contents from body
  const toc = generateTableOfContents(body);
  frontMatter.splice(1, 0, toc);  // Insert TOC after title page

  // No back matter for practice volumes (deferred to final volume)
  const backMatter = [];

  return {
    metadata,
    frontMatter,
    body,
    backMatter,
  };
}

/**
 * Build practice body based on organizing principle.
 */
function buildPracticeBody(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  organizingPrinciple: OrganizingPrinciple,
  aliases: ReturnType<typeof buildDisplayAliasLookup>,
) {
  switch (organizingPrinciple) {
    case 'pattern':
      return organizeByPattern(practice, registry, volumeIndex, aliases);

    case 'focus':
      // TODO: Implement focus-based organizer
      // For now, fall back to pattern
      return organizeByPattern(practice, registry, volumeIndex, aliases);

    case 'hybrid':
      // TODO: Implement hybrid organizer
      // For now, fall back to pattern
      return organizeByPattern(practice, registry, volumeIndex, aliases);

    default:
      return organizeByPattern(practice, registry, volumeIndex, aliases);
  }
}
