import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import type { DisplayAliasFn } from "@/lib/practiceReport";
import type {
  Alpha,
  State,
  PracticeActivity,
  WorkProduct,
  Competency,
  Persona,
} from "@/lib/types";
import type { BookSection, ElementRegistry, ElementFirstMention } from "./types";
import {
  extractNarrativeProse,
  isFirstMention,
  recordFirstMention,
  getCrossReference,
  alphaId,
  stateId,
  activityId,
  workProductId,
  competencyId,
  personaId,
} from "./utils";

/**
 * Context for rendering elements (passed through rendering pipeline).
 */
export type RenderContext = {
  registry: ElementRegistry;
  volumeIndex: number;
  partNumber: string;
  chapterNumber: string;
  aliases: DisplayAliasFn;
};

/**
 * Render an Activity section.
 * First mention: full description + narratives + competencies + work products
 * Subsequent mention: brief reference with cross-link
 */
export function renderActivity(
  activity: PracticeActivity,
  ctx: RenderContext,
): BookSection {
  const activityName = String(activity.name ?? "Untitled Activity");
  const firstMention = isFirstMention('activities', activityName, ctx.registry);

  const section: BookSection = {
    kind: 'section',
    heading: ctx.aliases('Activity', activityName),
    paragraphs: [],
    subsections: [],
    anchorId: activityId(activityName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(activity);
    if (description) {
      section.paragraphs.push(description);
    }

    // Narratives
    if (Array.isArray(activity.narratives) && activity.narratives.length > 0) {
      const prose = extractNarrativeProse(activity.narratives);
      section.paragraphs.push(...prose);
    }

    // Required competencies
    const requiredComps = Array.isArray(activity.requiredCompetencies) ? activity.requiredCompetencies : [];
    if (requiredComps.length > 0) {
      section.bullets = requiredComps.map(c => ({
        label: 'Required Competency',
        text: ctx.aliases('Competency', String(c)),
      }));
    }

    // Recommended competency levels
    const recommended = Array.isArray(activity.recommendedCompetencyLevels)
      ? activity.recommendedCompetencyLevels
      : [];
    if (recommended.length > 0) {
      const recSection: BookSection = {
        kind: 'subsection',
        heading: 'Recommended Competency Levels',
        paragraphs: [],
        bullets: recommended.map(cl => ({
          text: `${ctx.aliases('Competency', String(cl.competencyName))}: ${String(cl.competencyLevelName)}`,
        })),
        anchorId: `${activityId(activityName)}-competency-levels`,
      };
      section.subsections!.push(recSection);
    }

    // Work products produced (with hyperlinks to work products)
    const worksOn = Array.isArray(activity.worksOn) ? activity.worksOn : [];
    if (worksOn.length > 0) {
      const wpSection: BookSection = {
        kind: 'subsection',
        heading: 'Produces',
        paragraphs: [],
        bullets: worksOn.map(wp => {
          const wpName = String(wp.workProductName);
          const wpAnchor = workProductId(wpName);
          return {
            text: `<a href="#${wpAnchor}" class="xref">${ctx.aliases('WorkProduct', wpName)}</a> (${String(wp.levelOfDetailName)})`,
          };
        }),
        anchorId: `${activityId(activityName)}-produces`,
      };
      section.subsections!.push(wpSection);
    }

    // Contributes to alpha states (with hyperlinks to alphas)
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
    if (contributesTo.length > 0) {
      const ctSection: BookSection = {
        kind: 'subsection',
        heading: 'Advances',
        paragraphs: [],
        bullets: contributesTo.map(ac => {
          const alphaName = String(ac.alphaName);
          const alphaAnchor = alphaId(alphaName);
          const stateAnchor = stateId(alphaName, String(ac.stateName));
          return {
            text: `<a href="#${alphaAnchor}" class="xref">${ctx.aliases('Alpha', alphaName)}</a> → <a href="#${stateAnchor}" class="xref">${String(ac.stateName)}</a>`,
          };
        }),
        anchorId: `${activityId(activityName)}-advances`,
      };
      section.subsections!.push(ctSection);
    }

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: section.anchorId,
    };
    recordFirstMention('activities', activityName, ctx.registry, mention);
  } else {
    // Brief reference
    const xref = getCrossReference('activities', activityName, ctx.registry);
    section.paragraphs.push(
      `See ${xref ?? 'previous chapter'} for full details. ` +
      `This activity continues to produce work products and advance alpha states.`
    );
  }

  return section;
}

/**
 * Render an Alpha section (full definition with all states).
 */
export function renderAlpha(
  alpha: Alpha,
  ctx: RenderContext,
): BookSection {
  const alphaName = String(alpha.name ?? "Untitled Alpha");
  const firstMention = isFirstMention('alphas', alphaName, ctx.registry);

  const section: BookSection = {
    kind: 'section',
    heading: ctx.aliases('Alpha', alphaName),
    paragraphs: [],
    subsections: [],
    anchorId: alphaId(alphaName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(alpha);
    if (description) {
      section.paragraphs.push(description);
    }

    // Narratives
    if (Array.isArray(alpha.narratives) && alpha.narratives.length > 0) {
      const prose = extractNarrativeProse(alpha.narratives);
      section.paragraphs.push(...prose);
    }

    // Focus
    if (alpha.focusName) {
      section.paragraphs.push(`Focus: ${ctx.aliases('Focus', String(alpha.focusName))}`);
    }

    // Specialization relationship
    if (alpha.contributesTo) {
      section.paragraphs.push(
        `Specializes: ${ctx.aliases('Alpha', String(alpha.contributesTo))}`
      );
    }

    // Semantic relationships
    if (Array.isArray(alpha.relatesTo) && alpha.relatesTo.length > 0) {
      const relBullets = alpha.relatesTo.map(rel => ({
        label: String(rel.relationship ?? 'relates to'),
        text: ctx.aliases('Alpha', String(rel.alphaName)),
      }));
      section.bullets = relBullets;
    }

    // States as subsections
    const states = Array.isArray(alpha.states) ? alpha.states : [];
    states.forEach(state => {
      section.subsections!.push(renderAlphaState(alpha, state, ctx));
    });

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: section.anchorId,
    };
    recordFirstMention('alphas', alphaName, ctx.registry, mention);
  } else {
    // Brief reference
    const xref = getCrossReference('alphas', alphaName, ctx.registry);
    section.paragraphs.push(
      `See ${xref ?? 'previous chapter'} for full alpha definition. ` +
      `This section shows the progression of this alpha through different states.`
    );
  }

  return section;
}

/**
 * Render an Alpha State subsection.
 */
export function renderAlphaState(
  alpha: Alpha,
  state: State,
  ctx: RenderContext,
): BookSection {
  const alphaName = String(alpha.name ?? "Untitled Alpha");
  const stateName = String(state.name ?? "Untitled State");
  const stateKey = `${alphaName}::${stateName}`;
  const firstMention = isFirstMention('alphaStates', stateKey, ctx.registry);

  const subsection: BookSection = {
    kind: 'subsection',
    heading: ctx.aliases('State', stateName),
    paragraphs: [],
    anchorId: stateId(alphaName, stateName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(state);
    if (description) {
      subsection.paragraphs.push(description);
    }

    // Narratives
    if (Array.isArray(state.narratives) && state.narratives.length > 0) {
      const prose = extractNarrativeProse(state.narratives);
      subsection.paragraphs.push(...prose);
    }

    // Checklist items
    const checklist = Array.isArray(state.checklist) ? state.checklist : [];
    if (checklist.length > 0) {
      subsection.bullets = checklist.map(item => {
        const itemDesc = practiceElementDescriptionForDisplay(item);
        const verif = item.verificationMethod ? ` (Verified by: ${item.verificationMethod})` : '';
        return {
          text: `${itemDesc ?? String(item.name)}${verif}`,
        };
      });
    }

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: subsection.anchorId,
    };
    recordFirstMention('alphaStates', stateKey, ctx.registry, mention);
  } else {
    // Brief reference with progression indicator
    subsection.paragraphs.push(
      `(Continued progression of ${ctx.aliases('Alpha', alphaName)} to ${ctx.aliases('State', stateName)} state)`
    );
  }

  return subsection;
}

/**
 * Render a Work Product section.
 */
export function renderWorkProduct(
  workProduct: WorkProduct,
  ctx: RenderContext,
): BookSection {
  const wpName = String(workProduct.name ?? "Untitled Work Product");
  const firstMention = isFirstMention('workProducts', wpName, ctx.registry);

  const section: BookSection = {
    kind: 'section',
    heading: ctx.aliases('WorkProduct', wpName),
    paragraphs: [],
    subsections: [],
    anchorId: workProductId(wpName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(workProduct);
    if (description) {
      section.paragraphs.push(description);
    }

    // Narratives
    if (Array.isArray(workProduct.narratives) && workProduct.narratives.length > 0) {
      const prose = extractNarrativeProse(workProduct.narratives);
      section.paragraphs.push(...prose);
    }

    // Levels of detail as subsections
    const levels = Array.isArray(workProduct.levelsOfDetail) ? workProduct.levelsOfDetail : [];
    levels.forEach(lod => {
      const lodName = String(lod.name ?? "Untitled Level");
      const lodDesc = practiceElementDescriptionForDisplay(lod);
      const lodSubsection: BookSection = {
        kind: 'subsection',
        heading: lodName,
        paragraphs: lodDesc ? [lodDesc] : [],
        anchorId: `${workProductId(wpName)}-${lodName.toLowerCase().replace(/\s+/g, '-')}`,
      };

      // Checklist for this level
      const checklist = Array.isArray(lod.checklist) ? lod.checklist : [];
      if (checklist.length > 0) {
        lodSubsection.bullets = checklist.map(item => ({
          text: practiceElementDescriptionForDisplay(item) ?? String(item.name),
        }));
      }

      // Contributes to alpha states
      const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
      if (contributesTo.length > 0) {
        lodSubsection.paragraphs.push(
          `Evidences: ${contributesTo.map(ac =>
            `${ctx.aliases('Alpha', String(ac.alphaName))} → ${String(ac.stateName)}`
          ).join(', ')}`
        );
      }

      section.subsections!.push(lodSubsection);
    });

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: section.anchorId,
    };
    recordFirstMention('workProducts', wpName, ctx.registry, mention);
  } else {
    // Brief reference
    const xref = getCrossReference('workProducts', wpName, ctx.registry);
    section.paragraphs.push(
      `See ${xref ?? 'previous chapter'} for full work product definition and levels of detail.`
    );
  }

  return section;
}

/**
 * Render a Competency section.
 */
export function renderCompetency(
  competency: Competency,
  ctx: RenderContext,
): BookSection {
  const compName = String(competency.name ?? "Untitled Competency");
  const firstMention = isFirstMention('competencies', compName, ctx.registry);

  const section: BookSection = {
    kind: 'section',
    heading: ctx.aliases('Competency', compName),
    paragraphs: [],
    anchorId: competencyId(compName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(competency);
    if (description) {
      section.paragraphs.push(description);
    }

    // Levels
    const levels = Array.isArray(competency.levels) ? competency.levels : [];
    if (levels.length > 0) {
      section.bullets = levels
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
        .map(level => ({
          label: `Level ${level.level}: ${String(level.name)}`,
          text: practiceElementDescriptionForDisplay(level) ?? '',
        }));
    }

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: section.anchorId,
    };
    recordFirstMention('competencies', compName, ctx.registry, mention);
  } else {
    // Brief reference
    const xref = getCrossReference('competencies', compName, ctx.registry);
    section.paragraphs.push(
      `See ${xref ?? 'previous chapter'} for full competency definition and levels.`
    );
  }

  return section;
}

/**
 * Render a Persona section.
 */
export function renderPersona(
  persona: Persona,
  ctx: RenderContext,
): BookSection {
  const personaName = String(persona.name ?? "Untitled Persona");
  const firstMention = isFirstMention('personas', personaName, ctx.registry);

  const section: BookSection = {
    kind: 'section',
    heading: ctx.aliases('Persona', personaName),
    paragraphs: [],
    anchorId: personaId(personaName),
  };

  if (firstMention) {
    // Full rendering
    const description = practiceElementDescriptionForDisplay(persona);
    if (description) {
      section.paragraphs.push(description);
    }

    // Competencies
    const competencies = Array.isArray(persona.competencies) ? persona.competencies : [];
    if (competencies.length > 0) {
      section.bullets = competencies.map(cl => ({
        text: `${ctx.aliases('Competency', String(cl.competencyName))}: ${String(cl.competencyLevelName)}`,
      }));
    }

    // Record in registry
    const mention: ElementFirstMention = {
      volumeIndex: ctx.volumeIndex,
      partNumber: ctx.partNumber,
      chapterNumber: ctx.chapterNumber,
      sectionAnchor: section.anchorId,
    };
    recordFirstMention('personas', personaName, ctx.registry, mention);
  } else {
    // Brief reference
    const xref = getCrossReference('personas', personaName, ctx.registry);
    section.paragraphs.push(
      `See ${xref ?? 'previous chapter'} for full persona profile and competencies.`
    );
  }

  return section;
}
