import type { Pattern, WorkProduct, Persona, PersonaGroup, Citation } from "@/lib/types";
import { groupByFocus } from "@/lib/ir";
import {
  buildReportRenderableDoc,
  buildDisplayAliasLookup,
} from "@/lib/practiceReport/generatePracticeReport";
import {
  generateIntroductionPage,
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
): { files: Map<string, string>; practiceName: string } {
  const renderable = buildReportRenderableDoc(doc);
  if (!renderable) throw new Error("Cannot extract baseline from document");

  const baseline = renderable;
  const display = buildDisplayAliasLookup(renderable.practiceElementAliases);
  const practiceName = String((doc as any)?.name ?? baseline.name ?? "Practice");
  const prefix = slugify(practiceName);

  const files = new Map<string, string>();
  const addPage = (page: PageFile) => files.set(`${prefix}/${page.path}`, page.content);

  // Introduction
  addPage(generateIntroductionPage(doc as Record<string, unknown>, baseline));

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

  // MkDocs config
  files.set(
    `${prefix}/mkdocs.yml`,
    generateMkdocsYaml(practiceName, baseline, patterns, workProducts, personaGroups, display),
  );

  return { files, practiceName };
}
