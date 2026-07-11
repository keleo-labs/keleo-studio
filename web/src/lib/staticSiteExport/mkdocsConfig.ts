import type { PracticeBaseline, Pattern, WorkProduct, PersonaGroup } from "@/lib/types";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";
import { groupByFocus } from "@/lib/ir";
import { slugify } from "./slugs";
import { collectFontCdnUrls } from "./fontIcons";

function yamlEscape(s: string): string {
  if (/[:#\[\]{}&*!|>'"%@`]/.test(s) || s.trim() !== s) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

function renderAlphaNavTree(
  alphas: { name: string; contributesTo?: string }[],
  parentName: string | undefined,
  focusSlug: string,
  display: DisplayAliasFn,
  indent: string,
): string[] {
  const children = alphas.filter((a) => {
    if (parentName === undefined) {
      return !a.contributesTo || !alphas.some((o) => o.name === a.contributesTo);
    }
    return a.contributesTo === parentName;
  });

  const out: string[] = [];
  for (const alpha of children) {
    const hasChildren = alphas.some((a) => a.contributesTo === alpha.name);
    const label = yamlEscape(display("Alpha", alpha.name));
    const path = `concerns/${focusSlug}/${slugify(alpha.name)}.md`;

    if (hasChildren) {
      out.push(`${indent}- ${label}:`);
      out.push(`${indent}  - ${path}`);
      out.push(...renderAlphaNavTree(alphas, alpha.name, focusSlug, display, indent + "  "));
    } else {
      out.push(`${indent}- ${label}: ${path}`);
    }
  }
  return out;
}

export function generateMkdocsYaml(
  practiceName: string,
  baseline: PracticeBaseline,
  patterns: Pattern[],
  workProducts: WorkProduct[],
  personaGroups: PersonaGroup[],
  display: DisplayAliasFn,
): string {
  const lines: string[] = [
    `site_name: ${yamlEscape(practiceName)}`,
    `theme:`,
    `  name: material`,
    `  palette:`,
    `    scheme: default`,
    ``,
    `markdown_extensions:`,
    `  - toc:`,
    `      title: On this page`,
    ``,
  ];

  // Font CDN stylesheets
  const fontUrls = collectFontCdnUrls(baseline.assets ?? []);
  if (fontUrls.length > 0) {
    lines.push(`extra_css:`);
    for (const url of fontUrls) {
      lines.push(`  - ${url}`);
    }
    lines.push(``);
  }

  lines.push(
    `nav:`,
    `  - Introduction: index.md`,
  );

  // Patterns
  if (patterns.length) {
    lines.push(`  - Patterns:`);
    for (const p of patterns) {
      lines.push(`    - ${yamlEscape(display("Pattern", p.name))}: patterns/${slugify(p.name)}.md`);
    }
  }

  // Concerns (by focus) — tree structure via contributesTo
  const groups = groupByFocus(baseline);
  const concernsFocuses = groups.filter((g) => g.alphas.length > 0);
  if (concernsFocuses.length) {
    lines.push(`  - Concerns:`);
    lines.push(`    - Overview: concerns/overview.md`);
    for (const g of concernsFocuses) {
      const fs = slugify(g.focusName);
      lines.push(`    - ${yamlEscape(g.focusName)}:`);
      lines.push(`      - Overview: concerns/${fs}/index.md`);
      lines.push(...renderAlphaNavTree(g.alphas, undefined, fs, display, "      "));
    }
  }

  // Activities (by focus)
  const activityFocuses = groups.filter((g) => g.activitySpaces.length > 0);
  if (activityFocuses.length) {
    lines.push(`  - Activities:`);
    lines.push(`    - Overview: activities/overview.md`);
    for (const g of activityFocuses) {
      const fs = slugify(g.focusName);
      lines.push(`    - ${yamlEscape(g.focusName)}:`);
      lines.push(`      - Overview: activities/${fs}/index.md`);
      for (const space of g.activitySpaces) {
        const ss = slugify(space.name);
        lines.push(`      - ${yamlEscape(display("ActivitySpace", space.name))}:`);
        lines.push(`        - Overview: activities/${fs}/${ss}/index.md`);
        for (const act of space.activities ?? []) {
          lines.push(`        - ${yamlEscape(display("Activity", act.name))}: activities/${fs}/${ss}/${slugify(act.name)}.md`);
        }
      }
    }
  }

  // Work Products
  if (workProducts.length) {
    lines.push(`  - Work Products:`);
    for (const wp of workProducts) {
      lines.push(`    - ${yamlEscape(display("WorkProduct", wp.name))}: work-products/${slugify(wp.name)}.md`);
    }
  }

  // Personas
  if (personaGroups.length) {
    lines.push(`  - Personas:`);
    for (const pg of personaGroups) {
      lines.push(`    - ${yamlEscape(display("PersonaGroup", pg.name))}: personas/${slugify(pg.name)}/index.md`);
    }
  }

  // Competencies
  if (baseline.competencies?.length) {
    lines.push(`  - Competencies:`);
    for (const c of baseline.competencies) {
      lines.push(`    - ${yamlEscape(display("Competency", c.name))}: competencies/${slugify(c.name)}.md`);
    }
  }

  // References
  lines.push(`  - References: references.md`);

  lines.push("");
  return lines.join("\n");
}
