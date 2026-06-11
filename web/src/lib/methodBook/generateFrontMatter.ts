import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import type { DisplayAliasFn } from "@/lib/practiceReport";
import type { BookSection, BookVolume, BookMetadata } from "./types";
import { extractNarrativeProse, slug } from "./utils";

/**
 * Generate Volume 0: Method Overview.
 * This is a lightweight introduction to the series with no full chapters.
 */
export function generateMethodOverviewVolume(method: Method): BookVolume {
  const metadata: BookMetadata = {
    title: String(method.name ?? "Untitled Method"),
    subtitle: "Volume 0: Method Overview",
    authors: Array.isArray(method.baselinePractice?.authors) ? method.baselinePractice.authors : [],
    version: String(method.baselinePractice?.version ?? "1.0.0"),
    date: String(method.baselinePractice?.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: Array.isArray(method.baselinePractice?.keywords) ? method.baselinePractice.keywords : [],
  };

  const frontMatter: BookSection[] = [
    generateMethodTitlePage(method),
    generateMethodPreface(method),
  ];

  const body: BookSection[] = [
    generateMethodCompositionSection(method),
  ];

  return {
    metadata,
    frontMatter,
    body,
    backMatter: [],
  };
}

/**
 * Generate title page for Method overview.
 */
function generateMethodTitlePage(method: Method): BookSection {
  const description = practiceElementDescriptionForDisplay(method) ?? "";
  const baseline = method.baselinePractice;

  const paragraphs: string[] = [];
  if (description) {
    paragraphs.push(description);
  }

  const authors = Array.isArray(baseline?.authors) ? baseline.authors : [];
  if (authors.length > 0) {
    paragraphs.push(`Authors: ${authors.join(", ")}`);
  }

  const version = String(baseline?.version ?? "1.0.0");
  const date = String(baseline?.updatedAt ?? new Date().toISOString().split('T')[0]);
  paragraphs.push(`Version ${version} • ${date}`);

  return {
    kind: 'frontMatter',
    heading: String(method.name ?? "Untitled Method"),
    paragraphs,
    anchorId: 'title-page',
    pageBreakBefore: false,
  };
}

/**
 * Generate preface from Method-level narratives.
 */
function generateMethodPreface(method: Method): BookSection {
  const narratives = Array.isArray(method.narratives) ? method.narratives : [];
  const prose = extractNarrativeProse(narratives);

  return {
    kind: 'frontMatter',
    heading: 'Preface',
    paragraphs: prose.length > 0 ? prose : [
      'This method provides a comprehensive framework for practice-based work. ' +
      'The following volumes detail the baseline practice and extension practices that compose this method.'
    ],
    anchorId: 'preface',
  };
}

/**
 * Generate method composition overview section.
 */
function generateMethodCompositionSection(method: Method): BookSection {
  const baseline = method.baselinePractice;
  const practices = Array.isArray(method.practices) ? method.practices : [];

  const bullets = [];

  // Extension practices as volumes
  practices.forEach((p, idx) => {
    bullets.push({
      label: `Volume ${idx + 1}: ${p.name}`,
      text: practiceElementDescriptionForDisplay(p) ?? '(Extension practice)',
    });
  });

  // Final volume with baseline in appendix
  bullets.push({
    label: `Volume ${practices.length + 1}: References & Appendices`,
    text: `Complete citation bibliography, baseline practice reference (${baseline.name}), competency glossary, persona roster, and cross-practice index.`,
  });

  return {
    kind: 'frontMatter',
    heading: 'Series Overview',
    paragraphs: [
      'This method is composed of the following volumes:',
    ],
    bullets,
    anchorId: 'series-overview',
  };
}

/**
 * Generate front matter for a practice volume (baseline or extension).
 */
export function generatePracticeVolumeFrontMatter(
  practice: Practice | PracticeBaseline,
  volumeNumber: number,
  lookup: DisplayAliasFn,
): BookSection[] {
  return [
    generatePracticeTitlePage(practice, volumeNumber),
    generatePracticePreface(practice),
    generatePracticeRelationshipToSeries(practice, lookup),
  ];
}

/**
 * Generate title page for practice volume.
 */
function generatePracticeTitlePage(
  practice: Practice | PracticeBaseline,
  volumeNumber: number,
): BookSection {
  const description = practiceElementDescriptionForDisplay(practice) ?? "";
  const paragraphs: string[] = [];

  if (description) {
    paragraphs.push(description);
  }

  const authors = Array.isArray(practice.authors) ? practice.authors : [];
  if (authors.length > 0) {
    paragraphs.push(`Authors: ${authors.join(", ")}`);
  }

  const version = String(practice.version ?? "1.0.0");
  const date = String(practice.updatedAt ?? new Date().toISOString().split('T')[0]);
  paragraphs.push(`Version ${version} • ${date}`);

  return {
    kind: 'frontMatter',
    heading: `Volume ${volumeNumber}: ${practice.name}`,
    paragraphs,
    anchorId: `volume-${volumeNumber}-title`,
    pageBreakBefore: false,
  };
}

/**
 * Generate preface from practice-level narratives.
 */
function generatePracticePreface(practice: Practice | PracticeBaseline): BookSection {
  const narratives = Array.isArray(practice.narratives) ? practice.narratives : [];
  const prose = extractNarrativeProse(narratives);

  return {
    kind: 'frontMatter',
    heading: 'Preface',
    paragraphs: prose.length > 0 ? prose : [
      'This practice provides structured guidance for achieving specific outcomes. ' +
      'The following chapters detail the patterns, activities, and work products that comprise this practice.'
    ],
    anchorId: 'preface',
  };
}

/**
 * Generate relationship to series section (baseline reference, dependencies).
 */
function generatePracticeRelationshipToSeries(
  practice: Practice | PracticeBaseline,
  lookup: DisplayAliasFn,
): BookSection {
  const isPractice = 'baselinePracticeName' in practice;

  if (!isPractice) {
    // This is a baseline practice
    return {
      kind: 'frontMatter',
      heading: 'About This Practice',
      paragraphs: [
        'This is the baseline practice that provides the foundation for this method. ' +
        'Extension practices in subsequent volumes build upon the elements defined here.'
      ],
      anchorId: 'about-practice',
    };
  }

  const p = practice as Practice;
  const paragraphs: string[] = [];
  const bullets = [];

  if (p.baselinePracticeName) {
    paragraphs.push(
      `This practice extends the baseline practice: ${lookup('PracticeBaseline', p.baselinePracticeName)}`
    );
  }

  if (Array.isArray(p.practiceDependencyNames) && p.practiceDependencyNames.length > 0) {
    paragraphs.push('This practice also depends on the following practices:');
    p.practiceDependencyNames.forEach(dep => {
      bullets.push({
        text: lookup('Practice', dep),
      });
    });
  }

  return {
    kind: 'frontMatter',
    heading: 'Relationship to Series',
    paragraphs,
    bullets: bullets.length > 0 ? bullets : undefined,
    anchorId: 'relationship-to-series',
  };
}

/**
 * Generate front matter for References & Appendices volume.
 */
export function generateReferencesVolumeFrontMatter(method: Method, volumeNumber: number): BookSection[] {
  return [
    {
      kind: 'frontMatter',
      heading: `Volume ${volumeNumber}: References & Appendices`,
      paragraphs: [
        `References and Appendices for ${method.name}`,
        'This volume contains the complete citation bibliography, baseline element reference, ' +
        'competency glossary, persona roster, and cross-practice element index for all practices in this method.'
      ],
      anchorId: `volume-${volumeNumber}-title`,
      pageBreakBefore: false,
    },
  ];
}

/**
 * Generate table of contents from body sections.
 * Recursively builds TOC with proper indentation and hyperlinks.
 */
export function generateTableOfContents(body: BookSection[]): BookSection {
  const tocBullets = [];

  function addToToc(section: BookSection, depth: number) {
    const indent = '  '.repeat(depth);
    const number = section.number ? `${section.number}. ` : '';
    const anchor = section.anchorId ? `<a href="#${section.anchorId}" class="toc-link">${section.heading}</a>` : section.heading;
    tocBullets.push({
      text: `${indent}${number}${anchor}`,
    });

    if (section.subsections) {
      section.subsections.forEach(sub => addToToc(sub, depth + 1));
    }
  }

  body.forEach(section => addToToc(section, 0));

  return {
    kind: 'frontMatter',
    heading: 'Table of Contents',
    paragraphs: [],
    bullets: tocBullets,
    anchorId: 'table-of-contents',
  };
}
