import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { parsePatternViewAlphaState } from "@/lib/patternView";
import type { DisplayAliasFn } from "@/lib/practiceReport";
import type { Practice, PracticeBaseline, Pattern, PatternView } from "@/lib/types";
import type { BookSection, ElementRegistry } from "./types";
import type { RenderContext } from "./renderElements";
import { renderActivity, renderAlpha, renderAlphaState, renderWorkProduct } from "./renderElements";
import { extractNarrativeProse, generatePartNumber, patternId, patternViewId } from "./utils";

/**
 * Organize practice body by Pattern.
 * Each Pattern becomes a Part, each PatternView becomes a Chapter.
 *
 * @param practice - Practice or PracticeBaseline to organize
 * @param registry - Element registry for tracking first mentions
 * @param volumeIndex - Which volume this is (for cross-references)
 * @param aliases - Alias lookup function
 * @returns Array of Part sections (body structure)
 */
export function organizeByPattern(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection[] {
  const patterns = Array.isArray(practice.patterns) ? practice.patterns : [];

  if (patterns.length === 0) {
    // No patterns - create a single part with all elements
    return [createDefaultPart(practice, registry, volumeIndex, aliases)];
  }

  const parts: BookSection[] = [];

  patterns.forEach((pattern, patternIdx) => {
    const part = createPartFromPattern(pattern, patternIdx, practice, registry, volumeIndex, aliases);
    parts.push(part);
  });

  return parts;
}

/**
 * Create a Part from a Pattern.
 * Pattern becomes the part, PatternViews become chapters.
 */
function createPartFromPattern(
  pattern: Pattern,
  patternIdx: number,
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection {
  const patternName = String(pattern.name ?? `Pattern ${patternIdx + 1}`);
  const partNumber = generatePartNumber(patternIdx);

  const part: BookSection = {
    kind: 'part',
    heading: aliases('Pattern', patternName),
    number: `Part ${partNumber}`,
    paragraphs: [],
    subsections: [],
    anchorId: patternId(patternName),
    pageBreakBefore: true,
  };

  // Part introduction (pattern description + narratives)
  const description = practiceElementDescriptionForDisplay(pattern);
  if (description) {
    part.paragraphs.push(description);
  }

  if (Array.isArray(pattern.narratives) && pattern.narratives.length > 0) {
    const prose = extractNarrativeProse(pattern.narratives);
    part.paragraphs.push(...prose);
  }

  // Pattern views become chapters
  const views = Array.isArray(pattern.patternViews) ? pattern.patternViews : [];
  views.forEach((view, viewIdx) => {
    const chapter = createChapterFromPatternView(
      pattern,
      view,
      viewIdx,
      partNumber,
      practice,
      registry,
      volumeIndex,
      aliases
    );
    part.subsections!.push(chapter);
  });

  return part;
}

/**
 * Create a Chapter from a PatternView.
 */
function createChapterFromPatternView(
  pattern: Pattern,
  view: PatternView,
  viewIdx: number,
  partNumber: string,
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection {
  const patternName = String(pattern.name ?? "Pattern");
  const viewName = String(view.name ?? `View ${viewIdx + 1}`);
  const chapterNumber = `${viewIdx + 1}`;

  const chapter: BookSection = {
    kind: 'chapter',
    heading: aliases('PatternView', viewName),
    number: chapterNumber,
    paragraphs: [],
    subsections: [],
    anchorId: patternViewId(patternName, viewName),
    pageBreakBefore: true,
  };

  // Chapter introduction (pattern view description + narrative contexts)
  const description = practiceElementDescriptionForDisplay(view);
  if (description) {
    chapter.paragraphs.push(description);
  }

  if (Array.isArray(view.narrativeContexts) && view.narrativeContexts.length > 0) {
    const sorted = [...view.narrativeContexts].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    sorted.forEach(ctx => {
      const text = typeof ctx.context === 'string' ? ctx.context.trim() : '';
      if (text) {
        chapter.paragraphs.push(text);
      }
    });
  }

  // Create render context
  const ctx: RenderContext = {
    registry,
    volumeIndex,
    partNumber: `Part ${partNumber}`,
    chapterNumber,
    aliases,
  };

  // Extract activities from pattern view
  const activityNames = Array.isArray(view.activities) ? view.activities : [];
  const activitySpaceNames = Array.isArray(view.activitySpaces) ? view.activitySpaces : [];
  const allActivityNames = [...activitySpaceNames, ...activityNames];

  if (allActivityNames.length > 0) {
    const activitiesSection: BookSection = {
      kind: 'section',
      heading: 'Activities',
      paragraphs: [],
      subsections: [],
      anchorId: `${chapter.anchorId}-activities`,
    };

    allActivityNames.forEach(actName => {
      const activity = findActivityByName(practice, String(actName));
      if (activity) {
        activitiesSection.subsections!.push(renderActivity(activity, ctx));
      }
    });

    if (activitiesSection.subsections!.length > 0) {
      chapter.subsections!.push(activitiesSection);
    }
  }

  // Extract alpha states from pattern view
  const alphaStates = Array.isArray(view.alphaStates) ? view.alphaStates : [];

  if (alphaStates.length > 0) {
    const alphasSection: BookSection = {
      kind: 'section',
      heading: 'Alpha States Achieved',
      paragraphs: [],
      subsections: [],
      anchorId: `${chapter.anchorId}-alphas`,
    };

    const processedAlphas = new Set<string>();

    alphaStates.forEach(as => {
      const parsed = parsePatternViewAlphaState(as);
      if (!parsed) return;

      const alphaName = String(parsed.alphaName);
      const stateName = String(parsed.stateName);

      // Find alpha in practice
      const alpha = findAlphaByName(practice, alphaName);
      if (!alpha) return;

      // Render full alpha on first mention, otherwise just the state
      if (!processedAlphas.has(alphaName)) {
        processedAlphas.add(alphaName);
        alphasSection.subsections!.push(renderAlpha(alpha, ctx));
      } else {
        // Just render the state as a progression indicator
        const state = alpha.states?.find(s => String(s.name) === stateName);
        if (state) {
          alphasSection.subsections!.push(renderAlphaState(alpha, state, ctx));
        }
      }
    });

    if (alphasSection.subsections!.length > 0) {
      chapter.subsections!.push(alphasSection);
    }
  }

  // Extract work products (from alpha instances evidence or activity worksOn)
  const workProducts = extractWorkProductsFromPatternView(view, practice);
  if (workProducts.length > 0) {
    const wpSection: BookSection = {
      kind: 'section',
      heading: 'Work Products',
      paragraphs: [],
      subsections: [],
      anchorId: `${chapter.anchorId}-work-products`,
    };

    workProducts.forEach(wp => {
      wpSection.subsections!.push(renderWorkProduct(wp, ctx));
    });

    chapter.subsections!.push(wpSection);
  }

  return chapter;
}

/**
 * Create a default part when no patterns are defined.
 */
function createDefaultPart(
  practice: Practice | PracticeBaseline,
  registry: ElementRegistry,
  volumeIndex: number,
  aliases: DisplayAliasFn,
): BookSection {
  const part: BookSection = {
    kind: 'part',
    heading: 'Practice Elements',
    number: 'Part I',
    paragraphs: ['This practice does not define patterns. The following sections describe the core practice elements.'],
    subsections: [],
    anchorId: 'default-part',
    pageBreakBefore: true,
  };

  const ctx: RenderContext = {
    registry,
    volumeIndex,
    partNumber: 'Part I',
    chapterNumber: '1',
    aliases,
  };

  // Add chapters for alphas, activities, work products
  const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];
  if (alphas.length > 0) {
    const alphasChapter: BookSection = {
      kind: 'chapter',
      heading: 'Alphas',
      number: '1',
      paragraphs: [],
      subsections: alphas.map(alpha => renderAlpha(alpha, ctx)),
      anchorId: 'alphas-chapter',
      pageBreakBefore: true,
    };
    part.subsections!.push(alphasChapter);
  }

  const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
  const activities = Array.isArray((practice as Practice).activities) ? (practice as Practice).activities : [];
  const allActivities = [
    ...activitySpaces.flatMap(as => Array.isArray(as.activities) ? as.activities : []),
    ...activities,
  ];

  if (allActivities.length > 0) {
    const activitiesChapter: BookSection = {
      kind: 'chapter',
      heading: 'Activities',
      number: '2',
      paragraphs: [],
      subsections: allActivities.map(activity => renderActivity(activity, ctx)),
      anchorId: 'activities-chapter',
      pageBreakBefore: true,
    };
    part.subsections!.push(activitiesChapter);
  }

  const workProducts = Array.isArray((practice as Practice).workProducts) ? (practice as Practice).workProducts : [];
  if (workProducts.length > 0) {
    const wpChapter: BookSection = {
      kind: 'chapter',
      heading: 'Work Products',
      number: '3',
      paragraphs: [],
      subsections: workProducts.map(wp => renderWorkProduct(wp, ctx)),
      anchorId: 'work-products-chapter',
      pageBreakBefore: true,
    };
    part.subsections!.push(wpChapter);
  }

  return part;
}

/**
 * Find activity by name in practice (handles nested and flat activity structures).
 */
function findActivityByName(practice: Practice | PracticeBaseline, name: string) {
  const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
  const flatActivities = Array.isArray((practice as Practice).activities) ? (practice as Practice).activities : [];

  // Search nested activities
  for (const space of activitySpaces) {
    const activities = Array.isArray(space.activities) ? space.activities : [];
    const found = activities.find(a => String(a.name) === name);
    if (found) return found;
  }

  // Search flat activities
  return flatActivities.find(a => String(a.name) === name);
}

/**
 * Find alpha by name in practice.
 */
function findAlphaByName(practice: Practice | PracticeBaseline, name: string) {
  const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];
  return alphas.find(a => String(a.name) === name);
}

/**
 * Extract unique work products referenced in pattern view.
 */
function extractWorkProductsFromPatternView(view: PatternView, practice: Practice | PracticeBaseline) {
  const wpNames = new Set<string>();
  const workProducts = [];

  // From alpha instances evidence
  const alphaInstances = Array.isArray(view.alphaInstances) ? view.alphaInstances : [];
  alphaInstances.forEach(ai => {
    const evidence = Array.isArray(ai.evidenceBy) ? ai.evidenceBy : [];
    evidence.forEach(wpi => {
      const wpName = String(wpi.workProductName ?? '');
      if (wpName) wpNames.add(wpName);
    });
  });

  // From activities worksOn
  const activityNames = Array.isArray(view.activities) ? view.activities : [];
  activityNames.forEach(actName => {
    const activity = findActivityByName(practice, String(actName));
    if (activity && Array.isArray(activity.worksOn)) {
      activity.worksOn.forEach(wo => {
        const wpName = String(wo.workProductName ?? '');
        if (wpName) wpNames.add(wpName);
      });
    }
  });

  // Find work product definitions
  const allWorkProducts = Array.isArray((practice as Practice).workProducts)
    ? (practice as Practice).workProducts
    : [];

  wpNames.forEach(name => {
    const wp = allWorkProducts.find(w => String(w.name) === name);
    if (wp) workProducts.push(wp);
  });

  return workProducts;
}
