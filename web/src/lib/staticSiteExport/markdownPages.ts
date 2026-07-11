import type {
  PracticeBaseline,
  Narrative,
  Citation,
  PracticeActivity,
  WorkProduct,
  Pattern,
  Persona,
  PersonaGroup,
} from "@/lib/types";
import {
  practiceElementDescriptionForDisplay,
  narrativeContextBulletLine,
  patternViewNarrativeContextProseTexts,
  groupByFocus,
} from "@/lib/ir";
import {
  findActivitiesProgressingState,
  findWorkProductsEvidencingState,
} from "@/lib/analysis/stateProgression";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";
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
        lines.push("");
        for (const c of cited) {
          const refPath = elementPath("references");
          const anchor = slugify(String(c.name));
          lines.push(
            `> See: ${mdLinkWithAnchor(String(c.name), fromPath, refPath, anchor)}`,
          );
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

export function generateIntroductionPage(
  doc: Record<string, unknown>,
  baseline: PracticeBaseline,
): PageFile {
  const pagePath = elementPath("introduction");
  const name = String(doc.name ?? baseline.name ?? "Practice");
  const desc = practiceElementDescriptionForDisplay(doc as any) ||
    practiceElementDescriptionForDisplay(baseline);
  const citations = (baseline.citations ?? []) as Citation[];

  const lines: string[] = [`# ${name}`];
  if (desc) lines.push("", desc);

  const narratives = (doc as any).narratives ?? baseline.narratives;
  if (Array.isArray(narratives) && narratives.length) {
    lines.push("", renderNarrativesToMd(narratives, 2, pagePath, citations));
  }

  const practices: Array<{ name: string }> = [];
  if (Array.isArray((doc as any).practices)) {
    for (const p of (doc as any).practices) {
      if (p?.name) practices.push({ name: String(p.name) });
    }
  }
  if (Array.isArray((doc as any).practiceNames)) {
    for (const pn of (doc as any).practiceNames) {
      if (typeof pn === "string" && pn.trim()) practices.push({ name: pn.trim() });
    }
  }
  if (practices.length) {
    lines.push("", "## Practices", "");
    for (const p of practices) {
      lines.push(`- ${p.name}`);
    }
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
): PageFile {
  const pagePath = elementPath("references");
  const lines: string[] = ["# References"];

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
    if (proseTexts.length) {
      lines.push("", `### ${display("PatternView", v.name)}`, "");
      const vDesc = practiceElementDescriptionForDisplay(v);
      if (vDesc) lines.push(vDesc, "");
      for (let i = 0; i < proseTexts.length; i++) {
        lines.push(`${i + 1}. ${stripHtml(proseTexts[i])}`);
      }
    }
  }

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

  // Common Instances (alpha instances matching this alpha)
  const alphaInstances = ((baseline as any).alphaInstances ?? []).filter(
    (i: any) => i.alphaName === alpha.name,
  );
  if (alphaInstances.length) {
    lines.push("", "## Common Instances", "");
    for (const inst of alphaInstances) {
      lines.push(`- **${inst.name}:** ${inst.description ?? ""}`);
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

      // Checklist
      const checklist = [...(state.checklist ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );
      if (checklist.length) {
        lines.push("", "**Checklist:**", "");
        for (const item of checklist) {
          lines.push(`- [ ] ${item.name}${item.description ? `: ${item.description}` : ""}`);
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
            `- ${mdLink(display("WorkProduct", ev.workProductName), pagePath, wpPath)} — ${lodText}`,
          );
        }
      }

      lines.push("");
    }
  }

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
        `- ${mdLink(display("WorkProduct", wo.workProductName), pagePath, wpPath)} — ${lodText}`,
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
      lines.push(`- **${inst.name}:** ${inst.description ?? ""}`);
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

      // Checklist
      const checklist = [...(lod.checklist ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );
      if (checklist.length) {
        lines.push("", "**Checklist:**", "");
        for (const item of checklist) {
          lines.push(`- [ ] ${item.name}${item.description ? `: ${item.description}` : ""}`);
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

  lines.push("");
  return { path: pagePath, content: withToc(lines.join("\n")) };
}
