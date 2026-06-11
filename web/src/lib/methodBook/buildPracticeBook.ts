import { buildDisplayAliasLookup } from "@/lib/practiceReport";
import type { Practice, PracticeBaseline } from "@/lib/types";
import type { MethodBook, BookVolume, OrganizingPrinciple, ElementRegistry, BookMetadata } from "./types";
import { createElementRegistry } from "./utils";
import {
  generatePracticeVolumeFrontMatter,
  generateTableOfContents,
} from "./generateFrontMatter";
import { organizeByPattern } from "./organizerPattern";
import { generateReferencesVolume } from "./generateReferencesVolume";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";

/**
 * Build a book from a single Practice or PracticeBaseline.
 *
 * Structure for single practice:
 * - Volume 0: Practice Overview (name, description, narratives)
 * - Final Volume: References & Appendices (with baseline in Appendix B if extension practice)
 *
 * @param practice - Single Practice or PracticeBaseline
 * @param organizingPrinciple - How to organize practice body ('pattern', 'focus', 'hybrid')
 * @returns MethodBook with 2 volumes (overview + practice content + appendices)
 */
export function buildPracticeBook(
  practice: Practice | PracticeBaseline,
  organizingPrinciple: OrganizingPrinciple = 'pattern',
): MethodBook {
  // Create shared element registry for tracking first mentions
  const registry: ElementRegistry = createElementRegistry();

  // Build alias lookup
  const aliases = buildDisplayAliasLookup((practice as Practice).practiceElementAliases);

  const isPractice = 'baselinePracticeName' in practice;
  const practiceDoc = practice as Practice;

  // Build series metadata
  const seriesMetadata: BookMetadata = {
    title: String(practice.name ?? "Untitled Practice"),
    subtitle: isPractice ? "Extension Practice" : "Baseline Practice",
    authors: Array.isArray(practice.authors) ? practice.authors : [],
    version: String(practice.version ?? "1.0.0"),
    date: String(practice.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: Array.isArray(practice.keywords) ? practice.keywords : [],
  };

  // Create volumes array
  const volumes: BookVolume[] = [];

  // Volume 0: Practice content with front matter
  const practiceVolume = buildSinglePracticeVolume(
    practice,
    registry,
    0,
    organizingPrinciple,
    aliases,
    isPractice
  );
  volumes.push(practiceVolume);

  // Volume 1: References & Appendices
  // For baseline practices, pass empty array (no baseline to reference)
  // For extension practices, create a minimal method structure to get baseline
  const finalVolumeNumber = 1;
  let referencesVolume: BookVolume;

  if (isPractice && practiceDoc.baselinePracticeName) {
    // Extension practice - we need to show baseline in appendix
    // Note: We can't fully resolve baseline here without library access
    // So we'll create a minimal references volume
    referencesVolume = generatePracticeReferencesVolume(
      practice,
      [practice], // Just this practice
      registry,
      aliases,
      finalVolumeNumber
    );
  } else {
    // Baseline practice - no baseline to reference
    referencesVolume = generatePracticeReferencesVolume(
      practice,
      [practice],
      registry,
      aliases,
      finalVolumeNumber
    );
  }

  volumes.push(referencesVolume);

  return {
    series: seriesMetadata,
    volumes,
  };
}

/**
 * Build a single practice volume with full content
 */
function buildSinglePracticeVolume(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeNumber: number,
  organizingPrinciple: OrganizingPrinciple,
  aliases: ReturnType<typeof buildDisplayAliasLookup>,
  isExtensionPractice: boolean
): BookVolume {
  const metadata: BookMetadata = {
    title: String(practice.name ?? "Untitled Practice"),
    subtitle: isExtensionPractice ? "Extension Practice" : "Baseline Practice",
    authors: Array.isArray(practice.authors) ? practice.authors : [],
    version: String(practice.version ?? "1.0.0"),
    date: String(practice.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: Array.isArray(practice.keywords) ? practice.keywords : [],
  };

  // Generate front matter
  const frontMatter = generatePracticeVolumeFrontMatter(practice, volumeNumber, aliases);

  // Generate body based on organizing principle
  let body;
  switch (organizingPrinciple) {
    case 'pattern':
      body = organizeByPattern(practice, registry, volumeNumber, aliases);
      break;
    case 'focus':
      // TODO: Implement focus-based organizer
      body = organizeByPattern(practice, registry, volumeNumber, aliases);
      break;
    case 'hybrid':
      // TODO: Implement hybrid organizer
      body = organizeByPattern(practice, registry, volumeNumber, aliases);
      break;
    default:
      body = organizeByPattern(practice, registry, volumeNumber, aliases);
  }

  // Generate table of contents from body
  const toc = generateTableOfContents(body);
  frontMatter.splice(1, 0, toc);  // Insert TOC after title page

  return {
    metadata,
    frontMatter,
    body,
    backMatter: [],
  };
}

/**
 * Generate References & Appendices volume for a single practice
 */
function generatePracticeReferencesVolume(
  practice: Practice | PracticeBaseline,
  allPractices: (Practice | PracticeBaseline)[],
  registry: ElementRegistry,
  aliases: ReturnType<typeof buildDisplayAliasLookup>,
  volumeNumber: number
): BookVolume {
  const metadata: BookMetadata = {
    title: `References & Appendices for ${practice.name}`,
    subtitle: `Volume ${volumeNumber}`,
    authors: Array.isArray(practice.authors) ? practice.authors : [],
    version: String(practice.version ?? "1.0.0"),
    date: String(practice.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: [],
  };

  const frontMatter = [
    {
      kind: 'frontMatter' as const,
      heading: `Volume ${volumeNumber}: References & Appendices`,
      paragraphs: [
        `References and Appendices for ${practice.name}`,
        'This volume contains citations, competency glossary, persona roster, and element index for this practice.',
      ],
      anchorId: `volume-${volumeNumber}-title`,
    },
  ];

  // Import appendix generators
  const {
    generateAppendixA_Citations,
    generateAppendixC_CompetencyGlossary,
    generateAppendixD_PersonaRoster,
    generateAppendixE_ElementIndex,
  } = require('./generateReferencesVolume');

  const citations = Array.isArray(practice.citations) ? practice.citations : [];

  const body = [
    generateAppendixA_Citations(citations),
    generateAppendixC_CompetencyGlossary(allPractices, aliases),
    generateAppendixD_PersonaRoster(allPractices, aliases),
    generateAppendixE_ElementIndex(registry, aliases),
  ];

  return {
    metadata,
    frontMatter,
    body,
    backMatter: [],
  };
}
