import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { parsePatternViewAlphaState } from "@/lib/converters/patternView";
import type { DisplayAliasFn } from "@/lib/practiceReport";
import type { Practice, PracticeBaseline, Pattern, PatternView, Alpha, Activity } from "@/lib/types";
import type { BookSection, ElementRegistry } from "./types";
import type { RenderContext } from "./renderElements";
import { renderActivity, renderAlpha } from "./renderElements";
import { extractNarrativeProse, generatePartNumber } from "./utils";

/**
 * Organize practice body according to the methodBook.md template structure.
 *
 * This creates a fixed three-part structure:
 * - PART I: VALUE ARCHITECTURE (Timeline Phases & Horizon Maps - from Patterns)
 * - PART II: SOLUTION ARCHITECTURE (Concerns & Progression Tracks - from Alphas)
 * - PART III: ENDEAVOR MANAGEMENT (Work Streams & Playbooks - from Activities)
 *
 * @param practice - Practice or PracticeBaseline to organize
 * @param registry - Element registry for tracking first mentions
 * @param volumeIndex - Which volume this is (for cross-references)
 * @param aliases - Alias lookup function
 * @returns Array of Part sections (body structure)
 */
export function organizeByMethodBook(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection[] {
  const parts: BookSection[] = [];

  // PART I: VALUE ARCHITECTURE - Timeline Phases & Horizon Maps (Patterns)
  const partI = createValueArchitecturePart(practice, registry, volumeIndex, aliases);
  if (partI) parts.push(partI);

  // PART II: SOLUTION ARCHITECTURE - Concerns & Progression Tracks (Alphas)
  const partII = createSolutionArchitecturePart(practice, registry, volumeIndex, aliases);
  if (partII) parts.push(partII);

  // PART III: ENDEAVOR MANAGEMENT - Work Streams & Playbooks (Activities)
  const partIII = createEndeavorManagementPart(practice, registry, volumeIndex, aliases);
  if (partIII) parts.push(partIII);

  return parts;
}

/**
 * PART I: VALUE ARCHITECTURE
 * Focuses on timeline phases, horizon maps, and patterns that define value delivery.
 */
function createValueArchitecturePart(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection | null {
  const patterns = Array.isArray(practice.patterns) ? practice.patterns : [];

  if (patterns.length === 0) {
    // No patterns - skip this part or create placeholder
    return null;
  }

  const partNumber = generatePartNumber(0); // Part I
  const part: BookSection = {
    kind: 'part',
    heading: 'VALUE ARCHITECTURE',
    number: `Part ${partNumber}`,
    paragraphs: [
      'Focuses on the business justification, timeline phases, and horizon maps governing value delivery.',
    ],
    subsections: [],
    anchorId: 'part-i-value',
    pageBreakBefore: true,
  };

  // Chapter 1: Timeline Phases & Horizon Maps (Patterns)
  const chapter1: BookSection = {
    kind: 'chapter',
    heading: 'Timeline Phases & Horizon Maps (Patterns)',
    number: '1',
    paragraphs: [
      'This chapter maps out the cross-cutting progression of practice execution across sequential lifecycle horizons.',
    ],
    subsections: [],
    anchorId: 'ch1-timeline-phases',
    pageBreakBefore: true,
  };

  const ctx: RenderContext = {
    registry,
    volumeIndex,
    partNumber: `Part ${partNumber}`,
    chapterNumber: '1',
    aliases,
  };

  // Each pattern becomes a section showing the roadmap/horizon
  patterns.forEach((pattern, idx) => {
    const patternSection = createPatternSection(pattern, idx, practice, ctx);
    chapter1.subsections!.push(patternSection);
  });

  part.subsections!.push(chapter1);

  return part;
}

/**
 * PART II: SOLUTION ARCHITECTURE
 * Encapsulates system design through alpha progression tracks.
 */
function createSolutionArchitecturePart(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection | null {
  const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];

  if (alphas.length === 0) {
    return null;
  }

  const partNumber = generatePartNumber(1); // Part II
  const part: BookSection = {
    kind: 'part',
    heading: 'SOLUTION ARCHITECTURE',
    number: `Part ${partNumber}`,
    paragraphs: [
      'Encapsulates system design, progression tracks, and maturity checkpoints.',
    ],
    subsections: [],
    anchorId: 'part-ii-solution',
    pageBreakBefore: true,
  };

  // Chapter 2: Concerns & Progression Tracks (Alphas)
  const chapter2: BookSection = {
    kind: 'chapter',
    heading: 'Concerns & Progression Tracks (Alphas)',
    number: '2',
    paragraphs: [
      'This chapter defines the essential elements of concern and their progression through maturity states.',
    ],
    subsections: [],
    anchorId: 'ch2-concerns-tracks',
    pageBreakBefore: true,
  };

  const ctx: RenderContext = {
    registry,
    volumeIndex,
    partNumber: `Part ${partNumber}`,
    chapterNumber: '2',
    aliases,
  };

  // Group alphas by focus area if available
  const alphasByFocus = groupAlphasByFocus(alphas, practice);

  // Each focus area or ungrouped set becomes a section
  Object.entries(alphasByFocus).forEach(([focusName, focusAlphas]) => {
    const focusSection = createAlphaTrackSection(focusName, focusAlphas, ctx);
    chapter2.subsections!.push(focusSection);
  });

  part.subsections!.push(chapter2);

  return part;
}

/**
 * PART III: ENDEAVOR MANAGEMENT & OPERATIONS
 * Governs practical execution through work streams and playbooks.
 */
function createEndeavorManagementPart(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection | null {
  const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
  const flatActivities = Array.isArray((practice as Practice).activities) ? (practice as Practice).activities : [];

  if (activitySpaces.length === 0 && flatActivities.length === 0) {
    return null;
  }

  const partNumber = generatePartNumber(2); // Part III
  const part: BookSection = {
    kind: 'part',
    heading: 'ENDEAVOR MANAGEMENT & OPERATIONS',
    number: `Part ${partNumber}`,
    paragraphs: [
      'Governs the practical execution of work through strategic work streams and operational playbooks.',
    ],
    subsections: [],
    anchorId: 'part-iii-endeavor',
    pageBreakBefore: true,
  };

  const ctx: RenderContext = {
    registry,
    volumeIndex,
    partNumber: `Part ${partNumber}`,
    chapterNumber: '3',
    aliases,
  };

  // Chapter 3: Strategic Work Stream Swimlanes (Activity Spaces)
  if (activitySpaces.length > 0) {
    const chapter3: BookSection = {
      kind: 'chapter',
      heading: 'Strategic Work Stream Swimlanes (Activity Spaces)',
      number: '3',
      paragraphs: [
        'This chapter defines the high-level work streams that coordinate execution across the practice.',
      ],
      subsections: [],
      anchorId: 'ch3-work-streams',
      pageBreakBefore: true,
    };

    activitySpaces.forEach((space, idx) => {
      const spaceSection = createActivitySpaceSection(space, idx, ctx);
      chapter3.subsections!.push(spaceSection);
    });

    part.subsections!.push(chapter3);
  }

  // Chapter 4: Operational Playbooks (Activities)
  const allActivities = [
    ...activitySpaces.flatMap(as => Array.isArray(as.activities) ? as.activities : []),
    ...flatActivities,
  ];

  if (allActivities.length > 0) {
    const chapter4: BookSection = {
      kind: 'chapter',
      heading: 'Operational Playbooks (Activities)',
      number: '4',
      paragraphs: [
        'This chapter provides detailed execution playbooks for operational activities.',
      ],
      subsections: [],
      anchorId: 'ch4-playbooks',
      pageBreakBefore: true,
    };

    const ctxCh4: RenderContext = {
      ...ctx,
      chapterNumber: '4',
    };

    allActivities.forEach(activity => {
      chapter4.subsections!.push(renderActivity(activity, ctxCh4));
    });

    part.subsections!.push(chapter4);
  }

  return part;
}

/**
 * Create a section for a Pattern (roadmap/horizon map).
 */
function createPatternSection(
  pattern: Pattern,
  patternIdx: number,
  practice: Practice | PracticeBaseline,
  ctx: RenderContext,
): BookSection {
  const patternName = String(pattern.name ?? `Pattern ${patternIdx + 1}`);

  const section: BookSection = {
    kind: 'section',
    heading: `🗓️ LIFECYCLE ROADMAP: ${ctx.aliases('Pattern', patternName)}`,
    paragraphs: [],
    subsections: [],
    anchorId: `pattern-${patternIdx + 1}`,
  };

  const description = practiceElementDescriptionForDisplay(pattern);
  if (description) {
    section.paragraphs.push(description);
  }

  if (Array.isArray(pattern.narratives) && pattern.narratives.length > 0) {
    const prose = extractNarrativeProse(pattern.narratives);
    section.paragraphs.push(...prose);
  }

  // Render pattern views as horizon phases
  const views = Array.isArray(pattern.patternViews) ? pattern.patternViews : [];
  views.forEach((view, viewIdx) => {
    const viewSection = createPatternViewHorizon(view, viewIdx, ctx);
    section.subsections!.push(viewSection);
  });

  return section;
}

/**
 * Create a horizon phase subsection from a PatternView.
 */
function createPatternViewHorizon(
  view: PatternView,
  viewIdx: number,
  ctx: RenderContext,
): BookSection {
  const viewName = String(view.name ?? `Phase ${viewIdx + 1}`);

  const subsection: BookSection = {
    kind: 'subsection',
    heading: `Phase ${viewIdx}: ${ctx.aliases('PatternView', viewName)}`,
    paragraphs: [],
    anchorId: `phase-${viewIdx}`,
  };

  const description = practiceElementDescriptionForDisplay(view);
  if (description) {
    subsection.paragraphs.push(description);
  }

  if (Array.isArray(view.narrativeContexts) && view.narrativeContexts.length > 0) {
    const sorted = [...view.narrativeContexts].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    sorted.forEach(ctx => {
      const text = typeof ctx.context === 'string' ? ctx.context.trim() : '';
      if (text) subsection.paragraphs.push(text);
    });
  }

  // List activities and alpha states as gates/milestones
  const activities = Array.isArray(view.activities) ? view.activities : [];
  const activitySpaces = Array.isArray(view.activitySpaces) ? view.activitySpaces : [];
  const alphaStates = Array.isArray(view.alphaStates) ? view.alphaStates : [];

  if (activities.length > 0 || activitySpaces.length > 0) {
    subsection.paragraphs.push(`**🛠️ Playbooks:** ${[...activitySpaces, ...activities].join(', ')}`);
  }

  if (alphaStates.length > 0) {
    const stateLabels = alphaStates.map(as => {
      const parsed = parsePatternViewAlphaState(as);
      return parsed ? `${parsed.alphaName}::${parsed.stateName}` : String(as);
    });
    subsection.paragraphs.push(`**📂 Evidence:** ${stateLabels.join(', ')}`);
  }

  return subsection;
}

/**
 * Group alphas by their focus area.
 */
function groupAlphasByFocus(
  alphas: Alpha[],
  practice: Practice | PracticeBaseline,
): Record<string, Alpha[]> {
  const focuses = Array.isArray(practice.focuses) ? practice.focuses : [];
  const grouped: Record<string, Alpha[]> = {};

  // Initialize with practice focuses
  focuses.forEach(focus => {
    const focusName = String(focus.name ?? 'Unnamed Focus');
    grouped[focusName] = [];
  });

  // Add ungrouped category
  grouped['Cross-Cutting Concerns'] = [];

  // Distribute alphas
  alphas.forEach(alpha => {
    const alphaFocus = String(alpha.focus ?? '');
    if (alphaFocus && grouped[alphaFocus]) {
      grouped[alphaFocus].push(alpha);
    } else {
      grouped['Cross-Cutting Concerns'].push(alpha);
    }
  });

  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) delete grouped[key];
  });

  return grouped;
}

/**
 * Create a section for an alpha progression track.
 */
function createAlphaTrackSection(
  focusName: string,
  alphas: Alpha[],
  ctx: RenderContext,
): BookSection {
  const section: BookSection = {
    kind: 'section',
    heading: `🗺️ TRACK: ${focusName.toUpperCase()}`,
    paragraphs: [],
    subsections: [],
    anchorId: `track-${focusName.toLowerCase().replace(/\s+/g, '-')}`,
  };

  // Render each alpha with its states
  alphas.forEach(alpha => {
    section.subsections!.push(renderAlpha(alpha, ctx));
  });

  return section;
}

/**
 * Create a section for an activity space (work stream).
 */
function createActivitySpaceSection(
  space: { name: string; description?: string; activities?: Activity[] },
  spaceIdx: number,
  ctx: RenderContext,
): BookSection {
  const spaceName = String(space.name ?? `Work Stream ${spaceIdx + 1}`);

  const section: BookSection = {
    kind: 'section',
    heading: `Swimlane: ${ctx.aliases('ActivitySpace', spaceName)}`,
    paragraphs: [],
    subsections: [],
    anchorId: `swimlane-${spaceIdx + 1}`,
  };

  const description = typeof space.description === 'string' ? space.description.trim() : '';
  if (description) {
    section.paragraphs.push(description);
  }

  // List contained activities
  const activities = Array.isArray(space.activities) ? space.activities : [];
  if (activities.length > 0) {
    const activityNames = activities.map(a => String(a.name)).join(', ');
    section.paragraphs.push(`**Operational Playbooks:** ${activityNames}`);
  }

  return section;
}
