import { formatAPA7Citation } from "@/lib/citationUtils";
import { buildElementSourceMap, isBaselineElement } from "@/lib/elementSourceTracking";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import type { DisplayAliasFn } from "@/lib/practiceReport";
import type { Method, Practice, PracticeBaseline, Citation, Competency, Persona, PersonaGroup } from "@/lib/types";
import type { BookVolume, BookSection, ElementRegistry } from "./types";
import { alphaId, competencyId, personaId, slug } from "./utils";

/**
 * Generate the final volume: References & Appendices.
 * Contains all citations, baseline element reference, competency glossary, persona roster, and element index.
 */
export function generateReferencesVolume(
  method: Method,
  allPractices: (Practice | PracticeBaseline)[],
  registry: ElementRegistry,
  aliases: DisplayAliasFn,
  volumeNumber: number,
): BookVolume {
  const metadata = {
    title: `References & Appendices for ${method.name}`,
    subtitle: `Volume ${volumeNumber}`,
    authors: Array.isArray(method.baselinePractice?.authors) ? method.baselinePractice.authors : [],
    version: String(method.baselinePractice?.version ?? "1.0.0"),
    date: String(method.baselinePractice?.updatedAt ?? new Date().toISOString().split('T')[0]),
    keywords: [],
  };

  const frontMatter: BookSection[] = [
    {
      kind: 'frontMatter',
      heading: `Volume ${volumeNumber}: References & Appendices`,
      paragraphs: [
        `References and Appendices for ${method.name}`,
        'This volume contains the complete citation bibliography, baseline element reference, ' +
        'competency glossary, persona roster, and cross-practice element index for all practices in this method.'
      ],
      anchorId: `volume-${volumeNumber}-title`,
    },
  ];

  const body: BookSection[] = [
    generateAppendixA_Citations(method.citations ?? []),
    generateAppendixB_BaselineReference(method.baselinePractice, allPractices, registry, aliases),
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

/**
 * Appendix A: Complete Citation Bibliography
 */
export function generateAppendixA_Citations(citations: Citation[]): BookSection {
  const sorted = [...citations].sort((a, b) => {
    const authA = Array.isArray(a.authors) && a.authors.length > 0 ? a.authors[0] : '';
    const authB = Array.isArray(b.authors) && b.authors.length > 0 ? b.authors[0] : '';
    if (authA !== authB) return authA.localeCompare(authB);
    return (String(a.date ?? '')).localeCompare(String(b.date ?? ''));
  });

  return {
    kind: 'backMatter',
    heading: 'Appendix A: Complete Citation Bibliography',
    paragraphs: [
      'The following references are cited throughout the practice volumes in this series.'
    ],
    bullets: sorted.map(c => ({
      text: formatAPA7Citation(c),
    })),
    anchorId: 'appendix-a-citations',
    pageBreakBefore: true,
  };
}

/**
 * Appendix B: Baseline Practice Element Reference
 * Shows the complete baseline practice since it's not a standalone volume.
 */
export function generateAppendixB_BaselineReference(
  baseline: PracticeBaseline,
  allPractices: (Practice | PracticeBaseline)[],
  registry: ElementRegistry,
  aliases: DisplayAliasFn,
): BookSection {
  const subsections: BookSection[] = [];

  // B.1: Focuses - show ALL baseline focuses
  const focuses = Array.isArray(baseline.focuses) ? baseline.focuses : [];

  if (focuses.length > 0) {
    subsections.push({
      kind: 'subsection',
      heading: 'B.1: Focuses',
      paragraphs: [],
      bullets: focuses.map(f => ({
        label: aliases('Focus', String(f.name)),
        text: practiceElementDescriptionForDisplay(f) ?? '',
      })),
      anchorId: 'appendix-b1-focuses',
    });
  }

  // B.2: Alphas (with states) - show ALL baseline alphas
  const alphas = Array.isArray(baseline.alphas) ? baseline.alphas : [];

  if (alphas.length > 0) {
    const alphaSubsections = alphas.map(alpha => {
      const alphaSection: BookSection = {
        kind: 'subsection',
        heading: aliases('Alpha', String(alpha.name)),
        paragraphs: [practiceElementDescriptionForDisplay(alpha) ?? ''],
        anchorId: `${alphaId(String(alpha.name))}-baseline-ref`,
      };

      // List states
      const states = Array.isArray(alpha.states) ? alpha.states : [];
      if (states.length > 0) {
        alphaSection.bullets = states.map(state => ({
          label: String(state.name),
          text: practiceElementDescriptionForDisplay(state) ?? '',
        }));
      }

      return alphaSection;
    });

    subsections.push({
      kind: 'subsection',
      heading: 'B.2: Alphas',
      paragraphs: [],
      subsections: alphaSubsections,
      anchorId: 'appendix-b2-alphas',
    });
  }

  // B.3: Activity Spaces (with activities) - show ALL baseline activity spaces
  const activitySpaces = Array.isArray(baseline.activitySpaces) ? baseline.activitySpaces : [];

  if (activitySpaces.length > 0) {
    const asSubsections = activitySpaces.map(activitySpace => {
      const asSection: BookSection = {
        kind: 'subsection',
        heading: aliases('ActivitySpace', String(activitySpace.name)),
        paragraphs: [practiceElementDescriptionForDisplay(activitySpace) ?? ''],
        anchorId: `activity-space-${slug(activitySpace.name)}-baseline-ref`,
      };

      // List activities
      const activities = Array.isArray(activitySpace.activities) ? activitySpace.activities : [];
      if (activities.length > 0) {
        asSection.bullets = activities.map(activity => ({
          label: aliases('Activity', String(activity.name)),
          text: practiceElementDescriptionForDisplay(activity) ?? '',
        }));
      }

      return asSection;
    });

    subsections.push({
      kind: 'subsection',
      heading: 'B.3: Activity Spaces',
      paragraphs: [],
      subsections: asSubsections,
      anchorId: 'appendix-b3-activity-spaces',
    });
  }

  // B.4: Competencies (with levels) - show ALL baseline competencies
  const competencies = Array.isArray(baseline.competencies) ? baseline.competencies : [];

  if (competencies.length > 0) {
    const compSubsections = competencies.map(competency => {
      const compSection: BookSection = {
        kind: 'subsection',
        heading: aliases('Competency', String(competency.name)),
        paragraphs: [practiceElementDescriptionForDisplay(competency) ?? ''],
        anchorId: `${competencyId(String(competency.name))}-baseline-ref`,
      };

      // List levels
      const levels = Array.isArray(competency.levels) ? competency.levels : [];
      if (levels.length > 0) {
        compSection.bullets = levels
          .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
          .map(level => ({
            label: `Level ${level.level}: ${String(level.name)}`,
            text: practiceElementDescriptionForDisplay(level) ?? '',
          }));
      }

      return compSection;
    });

    subsections.push({
      kind: 'subsection',
      heading: 'B.4: Competencies',
      paragraphs: [],
      subsections: compSubsections,
      anchorId: 'appendix-b4-competencies',
    });
  }

  return {
    kind: 'backMatter',
    heading: `Appendix B: Baseline Practice Reference — ${baseline.name}`,
    paragraphs: [
      'This appendix contains the complete baseline practice that all extension practices in this method build upon. ' +
      'The baseline provides the foundational elements (focuses, alphas, activity spaces, and competencies) ' +
      'that are extended and elaborated by the practice volumes.'
    ],
    subsections,
    anchorId: 'appendix-b-baseline',
    pageBreakBefore: true,
  };
}

/**
 * Appendix C: Competency Glossary
 */
export function generateAppendixC_CompetencyGlossary(
  allPractices: (Practice | PracticeBaseline)[],
  aliases: DisplayAliasFn,
): BookSection {
  const competencyMap = new Map<string, Competency>();

  // Collect all competencies from all practices
  allPractices.forEach(practice => {
    const comps = Array.isArray(practice.competencies) ? practice.competencies : [];
    comps.forEach(comp => {
      const name = String(comp.name);
      if (!competencyMap.has(name)) {
        competencyMap.set(name, comp);
      }
    });
  });

  const sortedCompetencies = Array.from(competencyMap.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  const subsections = sortedCompetencies.map(competency => {
    const section: BookSection = {
      kind: 'subsection',
      heading: aliases('Competency', String(competency.name)),
      paragraphs: [practiceElementDescriptionForDisplay(competency) ?? ''],
      anchorId: `${competencyId(String(competency.name))}-glossary`,
    };

    const levels = Array.isArray(competency.levels) ? competency.levels : [];
    if (levels.length > 0) {
      section.bullets = levels
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
        .map(level => ({
          label: `Level ${level.level}: ${String(level.name)}`,
          text: practiceElementDescriptionForDisplay(level) ?? '',
        }));
    }

    return section;
  });

  return {
    kind: 'backMatter',
    heading: 'Appendix C: Competency Glossary',
    paragraphs: [
      'Alphabetical list of all competencies with levels across all practices in this method.'
    ],
    subsections,
    anchorId: 'appendix-c-competencies',
    pageBreakBefore: true,
  };
}

/**
 * Appendix D: Persona Roster
 */
export function generateAppendixD_PersonaRoster(
  allPractices: (Practice | PracticeBaseline)[],
  aliases: DisplayAliasFn,
): BookSection {
  const personaMap = new Map<string, Persona>();
  const personaGroupMap = new Map<string, PersonaGroup>();

  // Collect all personas and persona groups from all practices
  allPractices.forEach(practice => {
    const p = practice as Practice;
    if (Array.isArray(p.personas)) {
      p.personas.forEach(persona => {
        const name = String(persona.name);
        if (!personaMap.has(name)) {
          personaMap.set(name, persona);
        }
      });
    }
    if (Array.isArray(p.personaGroups)) {
      p.personaGroups.forEach(pg => {
        const name = String(pg.name);
        if (!personaGroupMap.has(name)) {
          personaGroupMap.set(name, pg);
        }
      });
    }
  });

  const subsections: BookSection[] = [];

  // D.1: Individual Personas
  const sortedPersonas = Array.from(personaMap.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  if (sortedPersonas.length > 0) {
    const personaSubsections = sortedPersonas.map(persona => {
      const section: BookSection = {
        kind: 'subsection',
        heading: aliases('Persona', String(persona.name)),
        paragraphs: [practiceElementDescriptionForDisplay(persona) ?? ''],
        anchorId: `${personaId(String(persona.name))}-roster`,
      };

      const competencies = Array.isArray(persona.competencies) ? persona.competencies : [];
      if (competencies.length > 0) {
        section.bullets = competencies.map(cl => ({
          text: `${aliases('Competency', String(cl.competencyName))}: ${String(cl.competencyLevelName)}`,
        }));
      }

      return section;
    });

    subsections.push({
      kind: 'subsection',
      heading: 'D.1: Individual Personas',
      paragraphs: [],
      subsections: personaSubsections,
      anchorId: 'appendix-d1-personas',
    });
  }

  // D.2: Persona Groups
  const sortedPersonaGroups = Array.from(personaGroupMap.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  if (sortedPersonaGroups.length > 0) {
    const pgSubsections = sortedPersonaGroups.map(pg => {
      const personaNames = Array.isArray(pg.personaNames) ? pg.personaNames : [];
      return {
        kind: 'subsection' as const,
        heading: aliases('PersonaGroup', String(pg.name)),
        paragraphs: [practiceElementDescriptionForDisplay(pg) ?? ''],
        bullets: personaNames.map(pName => ({
          text: aliases('Persona', String(pName)),
        })),
        anchorId: `persona-group-${slug(pg.name)}-roster`,
      };
    });

    subsections.push({
      kind: 'subsection',
      heading: 'D.2: Persona Groups',
      paragraphs: [],
      subsections: pgSubsections,
      anchorId: 'appendix-d2-persona-groups',
    });
  }

  return {
    kind: 'backMatter',
    heading: 'Appendix D: Persona Roster',
    paragraphs: [
      'Complete list of personas and persona groups with competency profiles from all practices.'
    ],
    subsections,
    anchorId: 'appendix-d-personas',
    pageBreakBefore: true,
  };
}

/**
 * Appendix E: Cross-Practice Element Index
 */
export function generateAppendixE_ElementIndex(
  registry: ElementRegistry,
  aliases: DisplayAliasFn,
): BookSection {
  const allElements: { name: string; type: string; volumeRef: string }[] = [];

  // Activities
  for (const [name, ref] of registry.activities) {
    allElements.push({
      name: aliases('Activity', name),
      type: 'Activity',
      volumeRef: `Volume ${ref.volumeIndex + 1}, ${ref.chapterNumber}`,
    });
  }

  // Alphas
  for (const [name, ref] of registry.alphas) {
    allElements.push({
      name: aliases('Alpha', name),
      type: 'Alpha',
      volumeRef: `Volume ${ref.volumeIndex + 1}, ${ref.chapterNumber}`,
    });
  }

  // Work Products
  for (const [name, ref] of registry.workProducts) {
    allElements.push({
      name: aliases('WorkProduct', name),
      type: 'Work Product',
      volumeRef: `Volume ${ref.volumeIndex + 1}, ${ref.chapterNumber}`,
    });
  }

  // Competencies
  for (const [name, ref] of registry.competencies) {
    allElements.push({
      name: aliases('Competency', name),
      type: 'Competency',
      volumeRef: `Volume ${ref.volumeIndex + 1}, ${ref.chapterNumber}`,
    });
  }

  // Personas
  for (const [name, ref] of registry.personas) {
    allElements.push({
      name: aliases('Persona', name),
      type: 'Persona',
      volumeRef: `Volume ${ref.volumeIndex + 1}, ${ref.chapterNumber}`,
    });
  }

  // Sort alphabetically
  allElements.sort((a, b) => a.name.localeCompare(b.name));

  return {
    kind: 'backMatter',
    heading: 'Appendix E: Cross-Practice Element Index',
    paragraphs: [
      'Alphabetical index of all practice elements with volume and chapter references where they are first defined.'
    ],
    bullets: allElements.map(el => ({
      label: `${el.name} (${el.type})`,
      text: el.volumeRef,
    })),
    anchorId: 'appendix-e-index',
    pageBreakBefore: true,
  };
}
