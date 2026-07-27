import type { Pattern, WorkProduct, Persona, PersonaGroup, Citation } from "@/lib/types";
import type { LibraryLookupIndex } from "@/lib/library/practiceDependencyResolution";
import { collectTransitiveMethodDependencies } from "@/lib/library/practiceDependencyResolution";
import { groupByFocus } from "@/lib/ir";
import {
  buildReportRenderableDoc,
  buildDisplayAliasLookup,
} from "@/lib/practiceReport/generatePracticeReport";
import {
  generateIntroductionPage,
  generatePracticePage,
  generateConcernsOverviewPage,
  generateActivitiesOverviewPage,
  generateReferencesPage,
  generatePatternPage,
  generateFocusConcernsPage,
  generateAlphaPage,
  generateFocusActivitiesPage,
  generateActivitySpacePage,
  generateActivityPage,
  generateWorkProductPage,
  generatePersonaGroupPage,
  generatePersonaPage,
  generateCompetencyPage,
  type PageFile,
} from "./markdownPages";
import {
  generateConcernsOverviewSvg,
  generateActivitiesOverviewSvg,
} from "./svgDiagrams";
import { generateMkdocsYaml } from "./mkdocsConfig";
import { slugify } from "./slugs";

export function generateStaticSite(
  doc: unknown,
  originalDoc?: unknown,
  libraryIndex?: LibraryLookupIndex,
): { files: Map<string, string>; practiceName: string } {
  const renderable = buildReportRenderableDoc(doc);
  if (!renderable) throw new Error("Cannot extract baseline from document");

  const baseline = renderable;
  const display = buildDisplayAliasLookup(renderable.practiceElementAliases);
  const practiceName = String((doc as any)?.name ?? baseline.name ?? "Practice");
  const prefix = slugify(practiceName);

  const files = new Map<string, string>();
  const addPage = (page: PageFile) => files.set(`${prefix}/${page.path}`, page.content);

  // Use original doc for narratives, practices, dependencies
  const src = (originalDoc ?? doc) as Record<string, unknown>;
  const transitiveDeps = libraryIndex
    ? collectTransitiveMethodDependencies(src, libraryIndex)
    : [];
  const practicePages = new Map<string, Record<string, unknown>>();

  // Inline practice objects
  if (Array.isArray(src.practices)) {
    for (const p of src.practices) {
      if (p && typeof p === "object" && (p as any).name) {
        practicePages.set(String((p as any).name), p as Record<string, unknown>);
      }
    }
  }

  // Named practices (lookup from library)
  if (Array.isArray(src.practiceNames) && libraryIndex) {
    for (const pn of src.practiceNames) {
      const name = String(pn ?? "").trim();
      if (!name || practicePages.has(name)) continue;
      const found = libraryIndex.practiceByName.get(name);
      if (found) practicePages.set(name, found as unknown as Record<string, unknown>);
    }
  }

  // Practice dependencies (lookup from library)
  if (Array.isArray(src.practiceDependencyNames) && libraryIndex) {
    for (const dep of src.practiceDependencyNames) {
      const name = String(dep ?? "").trim();
      if (!name || practicePages.has(name)) continue;
      const found = libraryIndex.practiceByName.get(name);
      if (found) practicePages.set(name, found as unknown as Record<string, unknown>);
    }
  }

  // Baseline practice
  const baselinePracticeName = String(src.baselinePracticeName ?? "").trim();
  const baselinePracticeObj = src.baselinePractice as Record<string, unknown> | undefined;
  if (baselinePracticeName && !practicePages.has(baselinePracticeName)) {
    if (baselinePracticeObj && typeof baselinePracticeObj === "object" && baselinePracticeObj.name) {
      practicePages.set(baselinePracticeName, baselinePracticeObj);
    } else if (libraryIndex) {
      const found = libraryIndex.baselineByName.get(baselinePracticeName);
      if (found) practicePages.set(baselinePracticeName, found as unknown as Record<string, unknown>);
    }
  }

  // Transitive practice dependencies (lookup from library)
  if (libraryIndex) {
    for (const dep of transitiveDeps) {
      if (practicePages.has(dep.name)) continue;
      const found = dep.role === "baselinePractice"
        ? libraryIndex.baselineByName.get(dep.name)
        : libraryIndex.practiceByName.get(dep.name);
      if (found) practicePages.set(dep.name, found as unknown as Record<string, unknown>);
    }
  }

  // Ensure every referenced practice has a page, even if not found in the library.
  // Collect all practice names referenced by the doc.
  const allReferencedNames = new Set<string>();
  if (Array.isArray(src.practices)) {
    for (const p of src.practices) {
      if (p && typeof p === "object" && (p as any).name) allReferencedNames.add(String((p as any).name));
    }
  }
  if (Array.isArray(src.practiceNames)) {
    for (const pn of src.practiceNames) {
      const name = String(pn ?? "").trim();
      if (name) allReferencedNames.add(name);
    }
  }
  if (Array.isArray(src.practiceDependencyNames)) {
    for (const dep of src.practiceDependencyNames) {
      const name = String(dep ?? "").trim();
      if (name) allReferencedNames.add(name);
    }
  }
  if (baselinePracticeName) allReferencedNames.add(baselinePracticeName);
  for (const dep of transitiveDeps) allReferencedNames.add(dep.name);

  for (const name of allReferencedNames) {
    if (!practicePages.has(name)) {
      practicePages.set(name, { name });
    }
  }

  addPage(generateIntroductionPage(src, baseline, display, transitiveDeps.length > 0 ? transitiveDeps : undefined));

  for (const [, practiceBody] of practicePages) {
    addPage(generatePracticePage(practiceBody, baseline));
  }

  // Overview pages with inline SVGs
  const concernsSvg = generateConcernsOverviewSvg(baseline, display);
  const activitiesSvg = generateActivitiesOverviewSvg(baseline, display);
  addPage(generateConcernsOverviewPage(concernsSvg));
  addPage(generateActivitiesOverviewPage(activitiesSvg));

  // References
  const citations = (baseline.citations ?? []) as Citation[];
  addPage(generateReferencesPage(citations));

  // Patterns
  const patterns = (renderable.patterns ?? []) as Pattern[];
  for (const pattern of patterns) {
    addPage(generatePatternPage(pattern, baseline, display));
  }

  // Group by focus for concerns and activities
  const groups = groupByFocus(baseline);
  const workProducts = (renderable.workProducts ?? []) as WorkProduct[];

  for (const group of groups) {
    // Concerns focus pages
    if (group.alphas.length > 0) {
      addPage(
        generateFocusConcernsPage(
          group.focusName,
          group.focus?.description ?? "",
          group.alphas,
          display,
        ),
      );

      for (const alpha of group.alphas) {
        addPage(generateAlphaPage(alpha, group.focusName, baseline, display, workProducts));
      }
    }

    // Activities focus pages
    if (group.activitySpaces.length > 0) {
      addPage(
        generateFocusActivitiesPage(
          group.focusName,
          group.focus?.description ?? "",
          group.activitySpaces,
          display,
        ),
      );

      for (const space of group.activitySpaces) {
        addPage(generateActivitySpacePage(space, group.focusName, baseline, display));

        for (const activity of space.activities ?? []) {
          addPage(
            generateActivityPage(activity, space.name, group.focusName, baseline, display, workProducts),
          );
        }
      }
    }
  }

  // Work Products
  for (const wp of workProducts) {
    addPage(generateWorkProductPage(wp, baseline, display));
  }

  // Persona Groups & Personas
  const personaGroups = (renderable.personaGroups ?? []) as PersonaGroup[];
  const personas = (renderable.personas ?? []) as Persona[];
  for (const pg of personaGroups) {
    addPage(generatePersonaGroupPage(pg, baseline, personas, display));

    const groupPersonas = personas.filter((p) => pg.personaNames?.includes(p.name));
    for (const persona of groupPersonas) {
      addPage(generatePersonaPage(persona, pg.name, baseline, display));
    }
  }

  // Competencies
  for (const comp of baseline.competencies ?? []) {
    addPage(generateCompetencyPage(comp, display));
  }

  // Custom stylesheet
  files.set(`${prefix}/docs/stylesheets/custom.css`, CUSTOM_CSS);

  // MkDocs config
  files.set(
    `${prefix}/mkdocs.yml`,
    generateMkdocsYaml(practiceName, baseline, patterns, workProducts, personaGroups, display, [...practicePages.keys()]),
  );

  return { files, practiceName };
}

const CUSTOM_CSS = ``;
