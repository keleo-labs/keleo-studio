import type {
  PracticeBaseline,
  Narrative,
  Citation,
  PracticeActivity,
  WorkProduct,
  Pattern,
  Persona,
  PersonaGroup,
  Background,
  Test,
} from "@/lib/types";
import {
  practiceElementDescriptionForDisplay,
  narrativeContextBulletLine,
  patternViewNarrativeContextProseTexts,
  groupByFocus,
} from "@/lib/ir";
import { resolveWorkProductAncestors } from "@/lib/display/elementDisplay";
import {
  findActivitiesProgressingState,
  findWorkProductsEvidencingState,
} from "@/lib/analysis/stateProgression";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";
import { normalizePracticeElementTags } from "@/lib/display/elementDisplay";
import { elementPath, mdLink, relativeLinkFrom, slugify } from "./slugs";
import { findIconAsset, renderIconHtml } from "./fontIcons";

export type PageFile = { path: string; content: string };

function stateAnchor(
  alphaName: string,
  stateName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): string | null {
  const alpha = baseline.alphas.find((a) => a.name === alphaName);
  if (!alpha) return null;
  const sorted = [...alpha.states].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const idx = sorted.findIndex((s) => s.name === stateName);
  if (idx < 0) return null;
  return slugify(`${idx + 1}. ${display("State", stateName)}`);
}

function lodAnchor(
  wpName: string,
  lodName: string,
  workProducts: WorkProduct[],
  display: DisplayAliasFn,
): string | null {
  const wp = workProducts.find((w) => w.name === wpName);
  if (!wp) return null;
  const sorted = [...wp.levelsOfDetail].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const idx = sorted.findIndex((l) => l.name === lodName);
  if (idx < 0) return null;
  return slugify(`${idx + 1}. ${display("LevelOfDetail", lodName)}`);
}

function mdLinkWithAnchor(
  label: string,
  fromPath: string,
  toPath: string,
  anchor: string,
): string {
  return `[${label}](${relativeLinkFrom(fromPath, toPath)}#${anchor})`;
}

const FRONT_MATTER = `---
hide:
  - toc
---

`;

function withToc(content: string): string {
  const firstNewline = content.indexOf("\n");
  if (firstNewline === -1) return FRONT_MATTER + content + "\n\n[TOC]\n";
  return (
    FRONT_MATTER +
    content.slice(0, firstNewline) +
    "\n\n[TOC]\n" +
    content.slice(firstNewline)
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function qualifiedWpName(
  wpName: string,
  display: DisplayAliasFn,
  workProducts: WorkProduct[] | undefined,
): string {
  const ancestors = resolveWorkProductAncestors(wpName, workProducts);
  if (!ancestors.length) return display("WorkProduct", wpName);
  return ancestors.map(a => display("WorkProduct", a)).join(" ⊃ ") + " ⊃ " + display("WorkProduct", wpName);
}

function renderKeywordList(keyword: string, items: string[]): string {
  if (!items.length) return "";
  const lines: string[] = [];
  for (const item of items) {
    lines.push(`- **${keyword}** ${item}`);
  }
  return lines.join("\n");
}

function renderBackgroundMd(
  bg: Background | undefined,
  headingLevel: number,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  fromPath: string,
  workProducts: WorkProduct[],
): string {
  if (!bg) return "";
  const hasContent =
    bg.given?.length ||
    bg.alphaStates?.length ||
    bg.workProductLevels?.length ||
    bg.alphaInstanceStates?.length ||
    bg.workProductInstanceLevels?.length;
  if (!hasContent) return "";

  const hashes = "#".repeat(headingLevel);
  const lines: string[] = [`${hashes} Prerequisites`];

  if (bg.given?.length) {
    lines.push("", renderKeywordList("Given", bg.given));
  }

  if (bg.alphaStates?.length) {
    lines.push("", "**Required Concern States:**", "");
    for (const as of bg.alphaStates) {
      const alphaObj = baseline.alphas.find((a) => a.name === as.alphaName);
      const alphaFocus = alphaObj?.focusName ?? "";
      const alphaPath = elementPath("alpha", as.alphaName, alphaFocus);
      const anchor = stateAnchor(as.alphaName, as.stateName, baseline, display);
      const stateText = anchor
        ? mdLinkWithAnchor(display("State", as.stateName), fromPath, alphaPath, anchor)
        : display("State", as.stateName);
      lines.push(`- ${mdLink(display("Alpha", as.alphaName), fromPath, alphaPath)} — ${stateText}`);
    }
  }

  if (bg.workProductLevels?.length) {
    lines.push("", "**Required Work Product Levels:**", "");
    for (const wpl of bg.workProductLevels) {
      const wpPath = elementPath("workProduct", wpl.workProductName);
      const anchor = lodAnchor(wpl.workProductName, wpl.levelOfDetailName, workProducts, display);
      const lodText = anchor
        ? mdLinkWithAnchor(display("LevelOfDetail", wpl.levelOfDetailName), fromPath, wpPath, anchor)
        : display("LevelOfDetail", wpl.levelOfDetailName);
      lines.push(`- ${mdLink(qualifiedWpName(wpl.workProductName, display, workProducts), fromPath, wpPath)} — ${lodText}`);
    }
  }

  if (bg.alphaInstanceStates?.length) {
    lines.push("", "**Required Instance States:**", "");
    for (const ais of bg.alphaInstanceStates) {
      lines.push(`- ${ais.instanceName} — ${ais.stateName}`);
    }
  }

  if (bg.workProductInstanceLevels?.length) {
    lines.push("", "**Required Instance Levels:**", "");
    for (const wil of bg.workProductInstanceLevels) {
      lines.push(`- ${wil.instanceName} — ${wil.levelOfDetailName}`);
    }
  }

  return lines.join("\n");
}

function renderTestMd(
  test: Test | undefined,
  headingLevel: number,
  heading: string,
): string {
  if (!test) return "";
  const hasContent = test.given?.length || test.when?.length || test.then?.length;
  if (!hasContent && !test.name && !test.description) return "";

  const hashes = "#".repeat(headingLevel);
  const lines: string[] = [`${hashes} ${heading}`];

  if (test.name) lines.push("", `**${test.name}**`);
  const desc = practiceElementDescriptionForDisplay(test);
  if (desc) lines.push("", desc);

  if (test.given?.length) lines.push("", renderKeywordList("Given", test.given));
  if (test.when?.length) lines.push("", renderKeywordList("When", test.when));
  if (test.then?.length) lines.push("", renderKeywordList("Then", test.then));

  return lines.join("\n");
}

function renderTestCompactMd(test: Test | undefined): string {
  if (!test) return "";
  const hasContent = test.given?.length || test.when?.length || test.then?.length;
  if (!hasContent) return "";

  const parts: string[] = [];
  if (test.given?.length) parts.push(renderKeywordList("Given", test.given));
  if (test.when?.length) parts.push(renderKeywordList("When", test.when));
  if (test.then?.length) parts.push(renderKeywordList("Then", test.then));
  return parts.join("\n");
}

function renderExamplesMd(
  examples: Test[] | undefined,
  headingLevel: number,
): string {
  if (!examples?.length) return "";

  const hashes = "#".repeat(headingLevel);
  const lines: string[] = [`${hashes} Examples`];

  for (const ex of examples) {
    if (ex.name) lines.push("", `**${ex.name}**`);
    const desc = practiceElementDescriptionForDisplay(ex);
    if (desc) lines.push("", desc);

    if (ex.given?.length) lines.push("", renderKeywordList("Given", ex.given));
    if (ex.when?.length) lines.push("", renderKeywordList("When", ex.when));
    if (ex.then?.length) lines.push("", renderKeywordList("Then", ex.then));
    lines.push("");
  }

  return lines.join("\n");
}

function renderNarrativesToMd(
  narratives: Narrative[] | undefined,
  headingLevel: number,
  fromPath: string,
  allCitations: Citation[],
): string {
  if (!narratives?.length) return "";
  const lines: string[] = [];
  const hashes = "#".repeat(headingLevel);

  for (const n of narratives) {
    const name = String(n.name ?? "").trim();
    if (name) lines.push(`${hashes} ${name}`);

    const desc = String(n.description ?? "").trim();
    if (desc) lines.push("", stripHtml(desc));

    const contexts = [...(n.narrativeContexts ?? [])].sort(
      (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
    );
    if (contexts.length) {
      lines.push("");
      for (let i = 0; i < contexts.length; i++) {
        const text = narrativeContextBulletLine(contexts[i]);
        if (text) lines.push(`${i + 1}. ${stripHtml(text)}`);
      }
    }

    if (n.citationNames?.length && allCitations.length) {
      const cited = allCitations.filter((c) =>
        n.citationNames!.some(
          (cn) => String(c.name).toLowerCase().trim() === String(cn).toLowerCase().trim(),
        ),
      );
      if (cited.length) {
        lines.push("", "**Further Reading**", "");
        for (const c of cited) {
          const authors = Array.isArray(c.authors) ? c.authors.join(", ") : "";
          const date = String(c.date ?? "");
          const label = `${c.name} (${authors}, ${date})`;
          const refPath = elementPath("references");
          const anchor = slugify(String(c.name));
          lines.push(`- ${mdLinkWithAnchor(label, fromPath, refPath, anchor)}`);
        }
      }
    }

    if (n.narratives?.length) {
      lines.push(
        "",
        renderNarrativesToMd(n.narratives, headingLevel + 1, fromPath, allCitations),
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function renderTagsToMd(tags: unknown): string {
  const normalized = normalizePracticeElementTags(tags);
  if (!normalized) return "";
  const all = [
    ...(normalized.domainTags ?? []),
    ...(normalized.lifecycleTags ?? []),
    ...(normalized.organizationalTags ?? []),
  ];
  if (!all.length) return "";
  return `**Tags:** ${all.map((t) => `\`${t}\``).join(" ")}`;
}

export function generateIntroductionPage(
  doc: Record<string, unknown>,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  dependencySvg?: string,
): PageFile {
  const pagePath = elementPath("introduction");
  const name = String(doc.name ?? baseline.name ?? "Practice");
  const desc = practiceElementDescriptionForDisplay(doc as any) ||
    practiceElementDescriptionForDisplay(baseline);
  const citations = (baseline.citations ?? []) as Citation[];

  const lines: string[] = [`# ${name}`];

  const metaTop: string[] = [];
  if (baseline.version) {
    let versionStr = `Version ${baseline.version}`;
    if (baseline.schemaVersion) versionStr += ` *(schema ${baseline.schemaVersion})*`;
    metaTop.push(versionStr);
  } else if (baseline.schemaVersion) {
    metaTop.push(`*Schema ${baseline.schemaVersion}*`);
  }
  if (baseline.authors?.length) metaTop.push(baseline.authors.join(", "));
  if (metaTop.length) lines.push("", `*${metaTop.join(" · ")}*`);

  if (desc) lines.push("", desc);

  const narratives = (doc as any).narratives ?? baseline.narratives;
  if (Array.isArray(narratives) && narratives.length) {
    lines.push("", renderNarrativesToMd(narratives, 2, pagePath, citations));
  }

  if (dependencySvg) {
    lines.push("", "## Practice Dependencies", "", dependencySvg);
  }

  const acknowledgements = (baseline.acknowledgements ?? []) as { name: string; description?: string; url?: string }[];
  if (acknowledgements.length) {
    lines.push("", "## Acknowledgements", "");
    for (const ack of acknowledgements) {
      let entry = `**${ack.name}**`;
      const ackDesc = String(ack.description ?? "").trim();
      if (ackDesc) entry += ` — ${ackDesc}`;
      if (ack.url) entry += ` [Link](${ack.url})`;
      lines.push(entry, "");
    }
  }

  const metaBottom: string[] = [];
  if (baseline.keywords?.length) {
    metaBottom.push(baseline.keywords.map(kw => `\`${kw}\``).join(" "));
  }
  const dateItems: string[] = [];
  if (baseline.createdAt) dateItems.push(`Created: ${baseline.createdAt}`);
  if (baseline.updatedAt) dateItems.push(`Updated: ${baseline.updatedAt}`);
  if (dateItems.length) metaBottom.push(dateItems.join(" · "));
  if (metaBottom.length) lines.push("", "---", "", metaBottom.join("  \n"));

  const tagsMd = renderTagsToMd((doc as any).tags ?? baseline.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generatePracticePage(
  practice: Record<string, unknown>,
  baseline: PracticeBaseline,
): PageFile {
  const name = String(practice.name ?? "Practice");
  const pagePath = elementPath("practice", name);
  const desc = practiceElementDescriptionForDisplay(practice as any);
  const citations = (baseline.citations ?? []) as Citation[];

  const lines: string[] = [`# ${name}`];
  if (desc) lines.push("", desc);

  const narratives = practice.narratives;
  if (Array.isArray(narratives) && narratives.length) {
    lines.push("", renderNarrativesToMd(narratives, 2, pagePath, citations));
  }

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateConcernsOverviewPage(svgContent: string): PageFile {
  const pagePath = elementPath("overview-concerns");
  const lines: string[] = [
    "# Overview of Concerns",
    "",
    svgContent,
    "",
  ];
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateActivitiesOverviewPage(svgContent: string): PageFile {
  const pagePath = elementPath("overview-activities");
  const lines: string[] = [
    "# Overview of Activities",
    "",
    svgContent,
    "",
  ];
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateReferencesPage(
  citations: Citation[],
  baseline?: PracticeBaseline,
): PageFile {
  const pagePath = elementPath("references");
  const lines: string[] = ["# References"];

  if (baseline) {
    const metaTop: string[] = [];
    if (baseline.version) {
      let versionStr = `Version ${baseline.version}`;
      if (baseline.schemaVersion) versionStr += ` *(schema ${baseline.schemaVersion})*`;
      metaTop.push(versionStr);
    } else if (baseline.schemaVersion) {
      metaTop.push(`*Schema ${baseline.schemaVersion}*`);
    }
    if (baseline.authors?.length) metaTop.push(baseline.authors.join(", "));
    if (metaTop.length) lines.push("", `*${metaTop.join(" · ")}*`);
  }

  if (!citations.length) {
    lines.push("", "No references.");
    return { path: pagePath, content: withToc(lines.join("\n")) };
  }

  const sorted = [...citations].sort((a, b) => {
    const aa = (a.authors ?? []).join(", ");
    const bb = (b.authors ?? []).join(", ");
    return aa.localeCompare(bb);
  });

  lines.push("");
  for (const c of sorted) {
    const anchor = slugify(String(c.name));
    let entry = "";
    if (c.authors?.length) entry += c.authors.join(", ");
    if (c.date) entry += entry ? ` (${c.date})` : `(${c.date})`;
    if (c.name) entry += entry ? `. *${c.name}*` : `*${c.name}*`;
    const desc = String(c.description ?? "").trim();
    if (desc) entry += entry ? `. ${desc}` : desc;
    if (c.source) entry += entry ? `. ${c.source}` : c.source;
    if (c.url) entry += ` [Link](${c.url})`;

    lines.push(`<a id="${anchor}"></a>`, "", entry || "(No citation details)", "");
  }

  const acknowledgements = (baseline?.acknowledgements ?? []) as { name: string; description?: string; url?: string }[];
  if (acknowledgements.length) {
    lines.push("## Acknowledgements", "");
    for (const ack of acknowledgements) {
      let entry = `**${ack.name}**`;
      const desc = String(ack.description ?? "").trim();
      if (desc) entry += ` — ${desc}`;
      if (ack.url) entry += ` [Link](${ack.url})`;
      lines.push(entry, "");
    }
  }

  if (baseline) {
    const metaBottom: string[] = [];
    if (baseline.keywords?.length) {
      metaBottom.push(baseline.keywords.map(kw => `\`${kw}\``).join(" "));
    }
    const dateItems: string[] = [];
    if (baseline.createdAt) dateItems.push(`Created: ${baseline.createdAt}`);
    if (baseline.updatedAt) dateItems.push(`Updated: ${baseline.updatedAt}`);
    if (dateItems.length) metaBottom.push(dateItems.join(" · "));
    if (metaBottom.length) lines.push("---", "", metaBottom.join("  \n"));
  }

  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generatePatternPage(
  pattern: Pattern,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("pattern", pattern.name);
  const lines: string[] = [`# ${display("Pattern", pattern.name)}`];
  const desc = practiceElementDescriptionForDisplay(pattern);
  if (desc) lines.push("", desc);
  const citations = (baseline.citations ?? []) as Citation[];

  if (pattern.narratives?.length) {
    lines.push("", renderNarrativesToMd(pattern.narratives, 2, pagePath, citations));
  }

  // Alpha instance names
  if (pattern.alphaInstanceNames?.length) {
    lines.push("", "## Concern Instances", "");
    for (const inst of pattern.alphaInstanceNames) {
      const instDesc = practiceElementDescriptionForDisplay(inst);
      lines.push(`- **${inst.name}** (${display("Alpha", inst.alphaName)})${instDesc ? `: ${instDesc}` : ""}`);
    }
  }

  // Work product instance names
  if (pattern.workProductInstanceNames?.length) {
    lines.push("", "## Work Product Instances", "");
    for (const inst of pattern.workProductInstanceNames) {
      const instDesc = practiceElementDescriptionForDisplay(inst);
      lines.push(`- **${inst.name}** (${display("WorkProduct", inst.workProductName)})${instDesc ? `: ${instDesc}` : ""}`);
    }
  }

  const views = [...pattern.patternViews].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  // Collect all referenced alphas
  const alphaNames = new Set<string>();
  for (const v of views) {
    for (const as of v.alphaStates ?? []) {
      const aName = typeof as === "string" ? as.split("->")[0]?.trim() : as.alphaName;
      if (aName) alphaNames.add(aName);
    }
  }

  const alphaList = [...alphaNames];
  if (alphaList.length && views.length) {
    lines.push("", "## Pattern Matrix", "");
    // Table header — link each alpha to its page
    const headerCells = alphaList.map((a) => {
      const alphaObj = baseline.alphas.find((al) => al.name === a);
      if (alphaObj) {
        const alphaPath = elementPath("alpha", a, alphaObj.focusName);
        return mdLink(display("Alpha", a), pagePath, alphaPath);
      }
      return display("Alpha", a);
    });
    const header = `| View | ${headerCells.join(" | ")} |`;
    const separator = `|---|${alphaList.map(() => "---").join("|")}|`;
    lines.push(header, separator);

    for (const v of views) {
      const viewName = display("PatternView", v.name);
      const cells: string[] = [viewName];
      for (const alphaName of alphaList) {
        const matching = (v.alphaStates ?? [])
          .filter((as) => {
            const aName = typeof as === "string" ? as.split("->")[0]?.trim() : as.alphaName;
            return aName === alphaName;
          })
          .map((as) => {
            const sName = typeof as === "string" ? as.split("->")[1]?.trim() : as.stateName;
            if (!sName) return "";
            const anchor = stateAnchor(alphaName, sName, baseline, display);
            if (anchor) {
              const alphaObj = baseline.alphas.find((al) => al.name === alphaName);
              const alphaPath = elementPath("alpha", alphaName, alphaObj?.focusName);
              return mdLinkWithAnchor(display("State", sName), pagePath, alphaPath, anchor);
            }
            return display("State", sName);
          })
          .filter(Boolean);
        cells.push(matching.join(", ") || "—");
      }
      lines.push(`| ${cells.join(" | ")} |`);
    }
  }

  // Pattern view details
  for (const v of views) {
    const proseTexts = patternViewNarrativeContextProseTexts(v);
    const hasExtras = v.activitySpaces?.length || v.activities?.length || v.alphaInstances?.length;
    if (proseTexts.length || hasExtras) {
      lines.push("", `### ${display("PatternView", v.name)}`);
      const vDesc = practiceElementDescriptionForDisplay(v);
      if (vDesc) lines.push("", vDesc);
      if (proseTexts.length) {
        lines.push("");
        for (let i = 0; i < proseTexts.length; i++) {
          lines.push(`${i + 1}. ${stripHtml(proseTexts[i])}`);
        }
      }
      if (v.activitySpaces?.length) {
        lines.push("", "**Activity Spaces:** " + v.activitySpaces.map((as) => display("ActivitySpace", as)).join(", "));
      }
      if (v.activities?.length) {
        lines.push("", "**Activities:** " + v.activities.map((a) => display("Activity", a)).join(", "));
      }
      if (v.alphaInstances?.length) {
        lines.push("", "**Instance Outcomes:**", "");
        for (const inst of v.alphaInstances) {
          const instDesc = practiceElementDescriptionForDisplay(inst);
          lines.push(`- **${inst.name}**${inst.stateName ? ` — ${inst.stateName}` : ""}${instDesc ? `: ${instDesc}` : ""}`);
        }
      }
    }
  }

  const tagsMd = renderTagsToMd(pattern.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateFocusConcernsPage(
  focusName: string,
  focusDescription: string,
  alphas: PracticeBaseline["alphas"],
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("focus-concerns", undefined, focusName);
  const lines: string[] = [`# ${focusName}`];
  if (focusDescription) lines.push("", focusDescription);

  lines.push("", "## Concerns", "");
  for (const alpha of alphas) {
    const alphaPath = elementPath("alpha", alpha.name, focusName);
    lines.push(`- ${mdLink(display("Alpha", alpha.name), pagePath, alphaPath)}`);
  }

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateAlphaPage(
  alpha: PracticeBaseline["alphas"][0],
  focusName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  workProducts: WorkProduct[],
): PageFile {
  const pagePath = elementPath("alpha", alpha.name, focusName);
  const displayName = display("Alpha", alpha.name);
  const assets = baseline.assets ?? [];
  const iconAsset = findIconAsset(alpha.assetNames, assets);
  const iconPrefix = iconAsset ? renderIconHtml(iconAsset, 20) + " " : "";
  const lines: string[] = [`# ${iconPrefix}${displayName}`];
  const desc = practiceElementDescriptionForDisplay(alpha);
  if (desc) lines.push("", desc);
  const citations = (baseline.citations ?? []) as Citation[];

  if (alpha.narratives?.length) {
    lines.push("", renderNarrativesToMd(alpha.narratives, 2, pagePath, citations));
  }

  // Common Examples (alpha instances matching this alpha)
  const alphaInstances = ((baseline as any).alphaInstances ?? []).filter(
    (i: any) => i.alphaName === alpha.name,
  );
  if (alphaInstances.length) {
    lines.push("", "## Common Examples", "");
    for (const inst of alphaInstances) {
      let line = `- **${inst.name}:** ${inst.description ?? ""}`;
      if (inst.links?.length) {
        line += " " + inst.links.map((l: any) => l.uri ? `[${l.name}](${l.uri})` : l.name).join(", ");
      }
      lines.push(line);
    }
  }

  // Related alphas
  if (alpha.relatesTo?.length) {
    lines.push("", "## Related Concerns", "");
    for (const rel of alpha.relatesTo) {
      const relAlpha = baseline.alphas.find((a) => a.name === rel.alphaName);
      if (relAlpha) {
        const relFocus = relAlpha.focusName;
        const relPath = elementPath("alpha", relAlpha.name, relFocus);
        lines.push(`- ${rel.relationship}: ${mdLink(display("Alpha", rel.alphaName), pagePath, relPath)}`);
      } else {
        lines.push(`- ${rel.relationship}: ${display("Alpha", rel.alphaName)}`);
      }
    }
  }

  // Contributing sub-alphas
  const children = baseline.alphas.filter((a) => a.contributesTo === alpha.name);
  if (children.length) {
    lines.push("", "## Contributing Concerns", "");
    for (const child of children) {
      const childPath = elementPath("alpha", child.name, child.focusName);
      lines.push(`- ${mdLink(display("Alpha", child.name), pagePath, childPath)}`);
    }
  }

  // Parent alpha
  if (alpha.contributesTo) {
    const parent = baseline.alphas.find((a) => a.name === alpha.contributesTo);
    if (parent) {
      const parentPath = elementPath("alpha", parent.name, parent.focusName);
      lines.push("", `**Contributes to:** ${mdLink(display("Alpha", parent.name), pagePath, parentPath)}`);
    }
  }

  // Supporting alphas
  if (alpha.supportingAlphas?.length) {
    lines.push("", "## Supporting Concerns", "");
    for (const sa of alpha.supportingAlphas) {
      const saObj = baseline.alphas.find((a) => a.name === sa);
      if (saObj) {
        const saPath = elementPath("alpha", sa, saObj.focusName);
        lines.push(`- ${mdLink(display("Alpha", sa), pagePath, saPath)}`);
      } else {
        lines.push(`- ${display("Alpha", sa)}`);
      }
    }
  }

  // Variants
  if (alpha.variants?.length) {
    lines.push("", "## Variants", "");
    for (const variant of alpha.variants) {
      const vDesc = practiceElementDescriptionForDisplay(variant);
      lines.push(`- **${display("Alpha", variant.name)}**${vDesc ? `: ${vDesc}` : ""}`);
    }
  }

  // States table
  const states = [...alpha.states].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  if (states.length) {
    lines.push("", "## States", "");

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const stateName = display("State", state.name);
      lines.push(`### ${i + 1}. ${stateName}`);

      const stateDesc = practiceElementDescriptionForDisplay(state);
      if (stateDesc) lines.push("", stateDesc);

      if (state.narratives?.length) {
        lines.push("", renderNarrativesToMd(state.narratives, 4, pagePath, citations));
      }

      if (state.contributesToState) {
        lines.push("", `**Contributes to:** ${display("State", state.contributesToState)}`);
      }

      const stateBgMd = renderBackgroundMd(state.background, 4, baseline, display, pagePath, workProducts);
      if (stateBgMd) lines.push("", stateBgMd);

      // Checklist
      const checklist = [...(state.checklist ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );
      if (checklist.length) {
        lines.push("", "**Checklist:**", "");
        for (const item of checklist) {
          lines.push(`- [ ] **${item.name}**${item.description ? `: ${item.description}` : ""}`);
          if (item.narratives?.length) {
            lines.push("", renderNarrativesToMd(item.narratives, 5, pagePath, citations));
          }
          const itemTestMd = renderTestCompactMd(item.test);
          if (itemTestMd) lines.push("", itemTestMd);
          const itemExMd = renderExamplesMd(item.examples, 5);
          if (itemExMd) lines.push("", itemExMd);
        }
      }

      // Progressed by
      const progressedBy = findActivitiesProgressingState(
        alpha.name,
        state.name,
        baseline,
      );
      if (progressedBy.length) {
        lines.push("", "**Progressed by:**", "");
        for (const actName of progressedBy) {
          // Find activity's location
          const actLink = findActivityLink(actName, baseline, display, pagePath);
          lines.push(`- ${actLink}`);
        }
      }

      // Evidenced by
      const evidencedBy = findWorkProductsEvidencingState(
        alpha.name,
        state.name,
        baseline,
      );
      if (evidencedBy.length) {
        lines.push("", "**Evidenced by:**", "");
        for (const ev of evidencedBy) {
          const wpPath = elementPath("workProduct", ev.workProductName);
          const anchor = lodAnchor(ev.workProductName, ev.levelOfDetailName, workProducts, display);
          const lodText = anchor
            ? mdLinkWithAnchor(display("LevelOfDetail", ev.levelOfDetailName), pagePath, wpPath, anchor)
            : display("LevelOfDetail", ev.levelOfDetailName);
          lines.push(
            `- ${mdLink(qualifiedWpName(ev.workProductName, display, workProducts), pagePath, wpPath)} — ${lodText}`,
          );
        }
      }

      lines.push("");
    }
  }

  const tagsMd = renderTagsToMd(alpha.tags);
  if (tagsMd) lines.push("", tagsMd);

  return { path: pagePath, content: withToc(lines.join("\n")) };
}

function findActivityLink(
  activityName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  fromPath: string,
): string {
  for (const space of baseline.activitySpaces ?? []) {
    for (const act of space.activities ?? []) {
      if (act.name === activityName) {
        const actPath = elementPath("activity", act.name, space.focusName, space.name);
        return mdLink(display("Activity", activityName), fromPath, actPath);
      }
    }
  }
  return display("Activity", activityName);
}

export function generateFocusActivitiesPage(
  focusName: string,
  focusDescription: string,
  activitySpaces: PracticeBaseline["activitySpaces"],
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("focus-activities", undefined, focusName);
  const lines: string[] = [`# ${focusName} — Activities`];
  if (focusDescription) lines.push("", focusDescription);

  lines.push("", "## Activity Spaces", "");
  for (const space of activitySpaces) {
    const spacePath = elementPath("activitySpace", space.name, focusName);
    lines.push(`- ${mdLink(display("ActivitySpace", space.name), pagePath, spacePath)}`);
  }

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateActivitySpacePage(
  space: PracticeBaseline["activitySpaces"][0],
  focusName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  workProducts: WorkProduct[],
): PageFile {
  const pagePath = elementPath("activitySpace", space.name, focusName);
  const displayName = display("ActivitySpace", space.name);
  const assets = baseline.assets ?? [];
  const iconAsset = findIconAsset(space.assetNames, assets);
  const iconPrefix = iconAsset ? renderIconHtml(iconAsset, 20) + " " : "";
  const lines: string[] = [`# ${iconPrefix}${displayName}`];
  const desc = practiceElementDescriptionForDisplay(space);
  if (desc) lines.push("", desc);
  const citations = (baseline.citations ?? []) as Citation[];

  if ((space as any).narratives?.length) {
    lines.push("", renderNarrativesToMd((space as any).narratives, 2, pagePath, citations));
  }

  // ContributesTo
  if (space.contributesTo?.length) {
    lines.push("", "## Contributes To", "");
    for (const ct of space.contributesTo) {
      const alphaObj = baseline.alphas.find((a) => a.name === ct.alphaName);
      const alphaFocus = alphaObj?.focusName ?? focusName;
      const alphaPath = elementPath("alpha", ct.alphaName, alphaFocus);
      const anchor = stateAnchor(ct.alphaName, ct.stateName, baseline, display);
      const stateText = anchor
        ? mdLinkWithAnchor(display("State", ct.stateName), pagePath, alphaPath, anchor)
        : display("State", ct.stateName);
      lines.push(`- ${mdLink(display("Alpha", ct.alphaName), pagePath, alphaPath)} — ${stateText}`);
    }
  }

  // Activities
  const activities = space.activities ?? [];
  if (activities.length) {
    lines.push("", "## Activities", "");
    for (const act of activities) {
      const actPath = elementPath("activity", act.name, focusName, space.name);
      lines.push(`- ${mdLink(display("Activity", act.name), pagePath, actPath)}`);
    }
  }

  // Involves
  if (space.involves?.length) {
    lines.push("", "## Involves", "");
    for (const pgName of space.involves) {
      const pgPath = elementPath("personaGroup", pgName);
      lines.push(`- ${mdLink(display("PersonaGroup", pgName), pagePath, pgPath)}`);
    }
  }

  // Required Competencies
  if (space.requiredCompetencies?.length) {
    lines.push("", "## Required Competencies", "");
    for (const cn of space.requiredCompetencies) {
      const compPath = elementPath("competency", cn);
      lines.push(`- ${mdLink(display("Competency", cn), pagePath, compPath)}`);
    }
  }

  const bgMd = renderBackgroundMd(space.background, 2, baseline, display, pagePath, workProducts);
  if (bgMd) lines.push("", bgMd);

  const tagsMd = renderTagsToMd(space.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateActivityPage(
  activity: PracticeActivity,
  spaceName: string,
  focusName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  workProducts: WorkProduct[],
): PageFile {
  const pagePath = elementPath("activity", activity.name, focusName, spaceName);
  const displayName = display("Activity", activity.name);
  const assets = baseline.assets ?? [];
  const iconAsset = findIconAsset(activity.assetNames, assets);
  const iconPrefix = iconAsset ? renderIconHtml(iconAsset, 20) + " " : "";
  const lines: string[] = [`# ${iconPrefix}${displayName}`];
  const desc = practiceElementDescriptionForDisplay(activity);
  if (desc) lines.push("", desc);
  const citations = (baseline.citations ?? []) as Citation[];

  if (activity.narratives?.length) {
    lines.push("", renderNarrativesToMd(activity.narratives, 2, pagePath, citations));
  }

  // Contributes to
  if (activity.contributesTo?.length) {
    lines.push("", "## Contributes To", "");
    for (const ct of activity.contributesTo) {
      const alphaObj = baseline.alphas.find((a) => a.name === ct.alphaName);
      const alphaFocus = alphaObj?.focusName ?? focusName;
      const alphaPath = elementPath("alpha", ct.alphaName, alphaFocus);
      const anchor = stateAnchor(ct.alphaName, ct.stateName, baseline, display);
      const stateText = anchor
        ? mdLinkWithAnchor(display("State", ct.stateName), pagePath, alphaPath, anchor)
        : display("State", ct.stateName);
      lines.push(`- ${mdLink(display("Alpha", ct.alphaName), pagePath, alphaPath)} — ${stateText}`);
    }
  }

  // Works on
  if (activity.worksOn?.length) {
    lines.push("", "## Works On", "");
    for (const wo of activity.worksOn) {
      const wpPath = elementPath("workProduct", wo.workProductName);
      const anchor = lodAnchor(wo.workProductName, wo.levelOfDetailName, workProducts, display);
      const lodText = anchor
        ? mdLinkWithAnchor(display("LevelOfDetail", wo.levelOfDetailName), pagePath, wpPath, anchor)
        : display("LevelOfDetail", wo.levelOfDetailName);
      lines.push(
        `- ${mdLink(qualifiedWpName(wo.workProductName, display, workProducts), pagePath, wpPath)} — ${lodText}`,
      );
    }
  }

  // Involves
  if (activity.involves?.length) {
    lines.push("", "## Involves", "");
    for (const pgName of activity.involves) {
      const pgPath = elementPath("personaGroup", pgName);
      lines.push(`- ${mdLink(display("PersonaGroup", pgName), pagePath, pgPath)}`);
    }
  }

  // Competencies
  if (activity.recommendedCompetencyLevels?.length) {
    lines.push("", "## Competencies", "");
    for (const cl of activity.recommendedCompetencyLevels) {
      const compPath = elementPath("competency", cl.competencyName);
      lines.push(
        `- ${mdLink(display("Competency", cl.competencyName), pagePath, compPath)} — ${cl.competencyLevelName}`,
      );
    }
  }

  if (activity.requiredCompetencies?.length) {
    lines.push("", "## Required Competencies", "");
    for (const cn of activity.requiredCompetencies) {
      const compPath = elementPath("competency", cn);
      lines.push(`- ${mdLink(display("Competency", cn), pagePath, compPath)}`);
    }
  }

  const bgMd = renderBackgroundMd(activity.background, 2, baseline, display, pagePath, workProducts);
  if (bgMd) lines.push("", bgMd);

  const testMd = renderTestMd(activity.test, 2, "Verification");
  if (testMd) lines.push("", testMd);

  const exMd = renderExamplesMd(activity.examples, 2);
  if (exMd) lines.push("", exMd);

  const tagsMd = renderTagsToMd(activity.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateWorkProductPage(
  wp: WorkProduct,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("workProduct", wp.name);
  const displayName = display("WorkProduct", wp.name);
  const assets = baseline.assets ?? [];
  const iconAsset = findIconAsset(wp.assetNames, assets);
  const iconPrefix = iconAsset ? renderIconHtml(iconAsset, 20) + " " : "";
  const lines: string[] = [`# ${iconPrefix}${displayName}`];
  const desc = practiceElementDescriptionForDisplay(wp);
  if (desc) lines.push("", desc);
  if (wp.partOf) {
    const parentPath = elementPath("workProduct", wp.partOf);
    lines.push("", `**Part of:** ${mdLink(display("WorkProduct", wp.partOf), pagePath, parentPath)}`);
  }
  const childWps = (baseline.workProducts ?? []).filter((w) => w.partOf === wp.name);
  if (childWps.length) {
    lines.push("", "## Includes", "");
    for (const child of childWps) {
      const childPath = elementPath("workProduct", child.name);
      const childDesc = practiceElementDescriptionForDisplay(child);
      lines.push(`- ${mdLink(display("WorkProduct", child.name), pagePath, childPath)}${childDesc ? ` — ${childDesc}` : ""}`);
    }
  }

  const templatePath = `docs/templates/${slugify(wp.name)}.md`;
  lines.push("", mdLink("Download document template", pagePath, templatePath));

  const citations = (baseline.citations ?? []) as Citation[];

  if (wp.narratives?.length) {
    lines.push("", renderNarrativesToMd(wp.narratives, 2, pagePath, citations));
  }

  // Common Examples (work product instances matching this work product)
  const wpInstances = ((baseline as any).workProductInstances ?? []).filter(
    (i: any) => i.workProductName === wp.name,
  );
  if (wpInstances.length) {
    lines.push("", "## Common Examples", "");
    for (const inst of wpInstances) {
      let line = `- **${inst.name}:** ${inst.description ?? ""}`;
      if (inst.links?.length) {
        line += " " + inst.links.map((l: any) => l.uri ? `[${l.name}](${l.uri})` : l.name).join(", ");
      }
      lines.push(line);
    }
  }

  const lods = [...wp.levelsOfDetail].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  if (lods.length) {
    lines.push("", "## Levels of Detail", "");

    for (let i = 0; i < lods.length; i++) {
      const lod = lods[i];
      const lodName = display("LevelOfDetail", lod.name);
      lines.push(`### ${i + 1}. ${lodName}`);

      const lodDesc = practiceElementDescriptionForDisplay(lod);
      if (lodDesc) lines.push("", lodDesc);

      if (lod.narratives?.length) {
        lines.push("", renderNarrativesToMd(lod.narratives, 4, pagePath, citations));
      }

      const lodBgMd = renderBackgroundMd(lod.background, 4, baseline, display, pagePath, [wp]);
      if (lodBgMd) lines.push("", lodBgMd);

      // Checklist
      const checklist = [...(lod.checklist ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );
      if (checklist.length) {
        lines.push("", "**Checklist:**", "");
        for (const item of checklist) {
          lines.push(`- [ ] **${item.name}**${item.description ? `: ${item.description}` : ""}`);
          if (item.narratives?.length) {
            lines.push("", renderNarrativesToMd(item.narratives, 5, pagePath, citations));
          }
          const itemTestMd = renderTestCompactMd(item.test);
          if (itemTestMd) lines.push("", itemTestMd);
          const itemExMd = renderExamplesMd(item.examples, 5);
          if (itemExMd) lines.push("", itemExMd);
        }
      }

      // Contributes to
      if (lod.contributesTo?.length) {
        lines.push("", "**Contributes to:**", "");
        for (const ct of lod.contributesTo) {
          const alphaObj = baseline.alphas.find((a) => a.name === ct.alphaName);
          const alphaFocus = alphaObj?.focusName ?? "";
          const alphaPath = elementPath("alpha", ct.alphaName, alphaFocus);
          const anchor = stateAnchor(ct.alphaName, ct.stateName, baseline, display);
          const stateText = anchor
            ? mdLinkWithAnchor(display("State", ct.stateName), pagePath, alphaPath, anchor)
            : display("State", ct.stateName);
          lines.push(`- ${mdLink(display("Alpha", ct.alphaName), pagePath, alphaPath)} — ${stateText}`);
        }
      }

      // Developed by (activities whose worksOn references this LOD)
      const developedBy: string[] = [];
      for (const space of baseline.activitySpaces ?? []) {
        for (const act of space.activities ?? []) {
          if (act.worksOn?.some(
            (wo) => wo.workProductName === wp.name && wo.levelOfDetailName === lod.name,
          )) {
            developedBy.push(act.name);
          }
        }
      }
      if (developedBy.length) {
        lines.push("", "**Developed by:**", "");
        for (const actName of developedBy) {
          const actLink = findActivityLink(actName, baseline, display, pagePath);
          lines.push(`- ${actLink}`);
        }
      }

      lines.push("");
    }
  }

  const tagsMd = renderTagsToMd(wp.tags);
  if (tagsMd) lines.push("", tagsMd);

  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generatePersonaGroupPage(
  group: PersonaGroup,
  baseline: PracticeBaseline,
  personas: Persona[],
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("personaGroup", group.name);
  const displayName = display("PersonaGroup", group.name);
  const lines: string[] = [`# ${displayName}`];
  const desc = practiceElementDescriptionForDisplay(group);
  if (desc) lines.push("", desc);

  if ((group as any).narratives?.length) {
    const citations = (baseline.citations ?? []) as Citation[];
    lines.push("", renderNarrativesToMd((group as any).narratives, 2, pagePath, citations));
  }

  const groupPersonas = personas.filter((p) =>
    group.personaNames?.includes(p.name),
  );
  if (groupPersonas.length) {
    lines.push("", "## Personas", "");
    for (const p of groupPersonas) {
      const pPath = elementPath("persona", p.name, undefined, group.name);
      lines.push(`- ${mdLink(display("Persona", p.name), pagePath, pPath)}`);
    }
  }

  const tagsMd = renderTagsToMd((group as any).tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generatePersonaPage(
  persona: Persona,
  groupName: string,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("persona", persona.name, undefined, groupName);
  const displayName = display("Persona", persona.name);
  const lines: string[] = [`# ${displayName}`];
  const desc = practiceElementDescriptionForDisplay(persona);
  if (desc) lines.push("", desc);
  const citations = (baseline.citations ?? []) as Citation[];

  if (persona.narratives?.length) {
    lines.push("", renderNarrativesToMd(persona.narratives, 2, pagePath, citations));
  }

  if (persona.competencies?.length) {
    lines.push("", "## Competencies", "");
    for (const cl of persona.competencies) {
      const compPath = elementPath("competency", cl.competencyName);
      lines.push(
        `- ${mdLink(display("Competency", cl.competencyName), pagePath, compPath)}${cl.competencyLevelName ? ` — ${cl.competencyLevelName}` : ""}`,
      );
    }
  }

  const tagsMd = renderTagsToMd(persona.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}

export function generateCompetencyPage(
  competency: PracticeBaseline["competencies"][0],
  display: DisplayAliasFn,
): PageFile {
  const pagePath = elementPath("competency", competency.name);
  const displayName = display("Competency", competency.name);
  const lines: string[] = [`# ${displayName}`];
  const desc = practiceElementDescriptionForDisplay(competency);
  if (desc) lines.push("", desc);

  const levels = [...competency.levels].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  if (levels.length) {
    lines.push("", "## Skill Levels", "");
    lines.push("| Level | Name | Description |");
    lines.push("|---|---|---|");
    for (const lv of levels) {
      const lvDesc = practiceElementDescriptionForDisplay(lv);
      lines.push(`| ${lv.level} | ${lv.name} | ${lvDesc} |`);
    }
  }

  const tagsMd = renderTagsToMd(competency.tags);
  if (tagsMd) lines.push("", tagsMd);

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}
