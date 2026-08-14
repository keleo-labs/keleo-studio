import type {
  PracticeBaseline,
  Narrative,
  WorkProduct,
  Background,
  Test,
} from "@/lib/types";
import {
  practiceElementDescriptionForDisplay,
  narrativeContextBulletLine,
} from "@/lib/ir";
import { resolveWorkProductAncestors } from "@/lib/display/elementDisplay";
import type { DisplayAliasFn } from "@/lib/practiceReport/generatePracticeReport";

function heading(depth: number, text: string): string {
  return "#".repeat(Math.min(depth, 6)) + " " + text;
}

function blockquoteGuidance(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return "";
  return trimmed
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function guidanceBlock(label: string, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return blockquoteGuidance(`**[Guidance — ${label}]**\n\n${trimmed}`);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function renderKeywordList(keyword: string, items: string[]): string {
  if (!items.length) return "";
  return items.map((item) => `- **${keyword}** ${item}`).join("\n");
}

function qualifiedName(
  wpName: string,
  display: DisplayAliasFn,
  workProducts: WorkProduct[] | undefined,
): string {
  const ancestors = resolveWorkProductAncestors(wpName, workProducts);
  if (!ancestors.length) return display("WorkProduct", wpName);
  return (
    ancestors.map((a) => display("WorkProduct", a)).join(" ⊃ ") +
    " ⊃ " +
    display("WorkProduct", wpName)
  );
}

// --- Template-specific renderers (link-free versions of markdownPages helpers) ---

function renderBackgroundForTemplate(
  bg: Background | undefined,
  display: DisplayAliasFn,
  baseline: PracticeBaseline,
): string {
  if (!bg) return "";
  const hasContent =
    bg.given?.length ||
    bg.alphaStates?.length ||
    bg.workProductLevels?.length ||
    bg.alphaInstanceStates?.length ||
    bg.workProductInstanceLevels?.length;
  if (!hasContent) return "";

  const lines: string[] = ["**Prerequisites:**"];

  if (bg.given?.length) {
    lines.push("", renderKeywordList("Given", bg.given));
  }
  if (bg.alphaStates?.length) {
    lines.push("", "*Required concern states:*");
    for (const as of bg.alphaStates) {
      lines.push(
        `- ${display("Alpha", as.alphaName)} — ${display("State", as.stateName)}`,
      );
    }
  }
  if (bg.workProductLevels?.length) {
    lines.push("", "*Required work product levels:*");
    for (const wpl of bg.workProductLevels) {
      lines.push(
        `- ${display("WorkProduct", wpl.workProductName)} — ${display("LevelOfDetail", wpl.levelOfDetailName)}`,
      );
    }
  }
  if (bg.alphaInstanceStates?.length) {
    lines.push("", "*Required instance states:*");
    for (const ais of bg.alphaInstanceStates) {
      lines.push(`- ${ais.instanceName} — ${ais.stateName}`);
    }
  }
  if (bg.workProductInstanceLevels?.length) {
    lines.push("", "*Required instance levels:*");
    for (const wil of bg.workProductInstanceLevels) {
      lines.push(`- ${wil.instanceName} — ${wil.levelOfDetailName}`);
    }
  }

  return lines.join("\n");
}

function renderNarrativesForTemplate(
  narratives: Narrative[] | undefined,
  headingLevel: number,
): string {
  if (!narratives?.length) return "";
  const lines: string[] = [];

  for (const n of narratives) {
    const name = String(n.name ?? "").trim();
    if (name) lines.push(heading(headingLevel, name));

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

    if (n.narratives?.length) {
      lines.push(
        "",
        renderNarrativesForTemplate(n.narratives, headingLevel + 1),
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function renderTestForTemplate(test: Test | undefined): string {
  if (!test) return "";
  const hasContent = test.given?.length || test.when?.length || test.then?.length;
  if (!hasContent && !test.name && !test.description) return "";

  const lines: string[] = [];
  if (test.name) lines.push(`**${test.name}**`);
  const desc = practiceElementDescriptionForDisplay(test);
  if (desc) lines.push(desc);

  if (test.given?.length) lines.push(renderKeywordList("Given", test.given));
  if (test.when?.length) lines.push(renderKeywordList("When", test.when));
  if (test.then?.length) lines.push(renderKeywordList("Then", test.then));

  return lines.join("\n");
}

function renderExamplesForTemplate(examples: Test[] | undefined): string {
  if (!examples?.length) return "";
  const lines: string[] = [];
  for (const ex of examples) {
    if (ex.name) lines.push(`**${ex.name}**`);
    const desc = practiceElementDescriptionForDisplay(ex);
    if (desc) lines.push(desc);
    if (ex.given?.length) lines.push(renderKeywordList("Given", ex.given));
    if (ex.when?.length) lines.push(renderKeywordList("When", ex.when));
    if (ex.then?.length) lines.push(renderKeywordList("Then", ex.then));
    lines.push("");
  }
  return lines.join("\n");
}

// --- Activity lookup ---

interface ActivityMatch {
  name: string;
  description: string;
  involves: string[];
  competencies: string[];
  test?: Test;
  examples?: Test[];
}

function findActivitiesForWorkProduct(
  wpName: string,
  baseline: PracticeBaseline,
): ActivityMatch[] {
  const matches: ActivityMatch[] = [];
  const seen = new Set<string>();

  for (const space of baseline.activitySpaces ?? []) {
    for (const activity of space.activities ?? []) {
      if (seen.has(activity.name)) continue;
      const worksOn = activity.worksOn ?? [];
      if (worksOn.some((w: any) => w.workProductName === wpName)) {
        seen.add(activity.name);
        matches.push({
          name: activity.name,
          description: practiceElementDescriptionForDisplay(activity) ?? "",
          involves: activity.involves ?? [],
          competencies: (activity.recommendedCompetencyLevels ?? []).map(
            (c: any) => `${c.competencyName} (${c.competencyLevelName})`,
          ),
          test: activity.test,
          examples: activity.examples,
        });
      }
    }
  }

  return matches;
}

// --- Main generator ---

export function generateWorkProductTemplate(
  wp: WorkProduct,
  baseline: PracticeBaseline,
  display: DisplayAliasFn,
  options?: { headingDepth?: number; seen?: Set<string> },
): string {
  const h = options?.headingDepth ?? 1;
  const seen = options?.seen ?? new Set<string>();

  if (seen.has(wp.name) || h > 10) return "";
  seen.add(wp.name);

  const lines: string[] = [];
  const wpDisplayName = qualifiedName(wp.name, display, baseline.workProducts);

  // --- 1. Title ---
  lines.push(heading(h, wpDisplayName));
  const desc = practiceElementDescriptionForDisplay(wp);
  if (desc) {
    lines.push("");
    lines.push(
      blockquoteGuidance(
        `**[Guidance]** ${desc}\n\nDelete guidance blocks (lines starting with ">") as you complete each section.`,
      ),
    );
  }

  // --- 2. Purpose & Context ---
  const contextParts: string[] = [];

  // Alpha state contributions (why this WP matters)
  const alphaContributions = new Map<string, Set<string>>();
  for (const lod of wp.levelsOfDetail ?? []) {
    for (const contrib of lod.contributesTo ?? []) {
      const states = alphaContributions.get(contrib.alphaName) ?? new Set();
      states.add(contrib.stateName);
      alphaContributions.set(contrib.alphaName, states);
    }
  }
  if (alphaContributions.size > 0) {
    contextParts.push("**Advances these concerns:**");
    for (const [alphaName, states] of alphaContributions) {
      const alpha = baseline.alphas?.find((a) => a.name === alphaName);
      const alphaDisplay = display("Alpha", alphaName);
      const stateNames = [...states].map((s) => display("State", s)).join(", ");
      const alphaDesc = alpha
        ? practiceElementDescriptionForDisplay(alpha)
        : "";
      contextParts.push(
        `- **${alphaDisplay}** (${stateNames})${alphaDesc ? ` — ${alphaDesc}` : ""}`,
      );
    }
  }

  // Related activities (who produces this)
  const activities = findActivitiesForWorkProduct(wp.name, baseline);
  if (activities.length > 0) {
    contextParts.push("", "**Produced/updated by:**");
    for (const act of activities) {
      let line = `- **${display("Activity", act.name)}**`;
      if (act.description) line += ` — ${act.description}`;
      if (act.involves.length > 0) {
        line += ` *(${act.involves.map((pg) => display("PersonaGroup", pg)).join(", ")})*`;
      }
      contextParts.push(line);
    }
  }

  // Common examples (work product instances)
  const instances = ((baseline as any).workProductInstances ?? []).filter(
    (i: any) => i.workProductName === wp.name,
  );
  if (instances.length > 0) {
    contextParts.push("", "**Common examples:**");
    for (const inst of instances) {
      contextParts.push(
        `- **${inst.name}**${inst.description ? `: ${inst.description}` : ""}`,
      );
    }
  }

  if (contextParts.length > 0) {
    lines.push("");
    lines.push(guidanceBlock("Purpose & Context", contextParts.join("\n")));
  }

  // --- 3. Body sections from narratives or activities ---
  const hasNarratives = wp.narratives && wp.narratives.length > 0;

  if (hasNarratives) {
    // Narratives drive the body sections — each narrative context becomes a section
    for (const narrative of wp.narratives!) {
      const contexts = [...(narrative.narrativeContexts ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );

      if (contexts.length > 0) {
        for (const ctx of contexts) {
          const contextText = narrativeContextBulletLine(ctx);
          if (!contextText) continue;

          const sectionName =
            (ctx as any).narrativeElementName ?? `Section`;
          lines.push("");
          lines.push(heading(h + 1, sectionName));
          lines.push("");
          lines.push(guidanceBlock("Narrative", stripHtml(contextText)));
          lines.push("");
          lines.push("*[Your content here]*");
          lines.push("");
        }
      }

      // Render sub-narratives as additional sections
      if (narrative.narratives?.length) {
        const subNarrativeMd = renderNarrativesForTemplate(
          narrative.narratives,
          h + 1,
        );
        if (subNarrativeMd.trim()) {
          lines.push("");
          lines.push(blockquoteGuidance(subNarrativeMd));
        }
      }
    }
  } else if (activities.length > 0) {
    // Fallback: activities drive the body sections
    for (const act of activities) {
      lines.push("");
      lines.push(heading(h + 1, display("Activity", act.name)));

      const actGuidance: string[] = [];
      if (act.description) actGuidance.push(act.description);

      const testMd = renderTestForTemplate(act.test);
      if (testMd) actGuidance.push("", "**Verification:**", testMd);

      const examplesMd = renderExamplesForTemplate(act.examples);
      if (examplesMd) actGuidance.push("", "**Examples:**", examplesMd);

      if (actGuidance.length > 0) {
        lines.push("");
        lines.push(guidanceBlock("Activity", actGuidance.join("\n")));
      }

      lines.push("");
      lines.push("*[Your content here]*");
      lines.push("");
    }
  } else {
    // No narratives or activities — blank body
    lines.push("");
    lines.push(heading(h + 1, "Content"));
    lines.push("");
    lines.push(
      blockquoteGuidance(
        "**[Guidance]** Add your content below. Refer to the quality checklist at the end for completeness criteria.",
      ),
    );
    lines.push("");
    lines.push("*[Your content here]*");
    lines.push("");
  }

  // --- 4. Child work product templates (recursive) ---
  const children = (baseline.workProducts ?? []).filter(
    (child) => child.partOf === wp.name,
  );
  for (const child of children) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(
      generateWorkProductTemplate(child, baseline, display, {
        headingDepth: h + 1,
        seen,
      }),
    );
  }

  // --- 5. Quality Checklist ---
  const lods = [...(wp.levelsOfDetail ?? [])].sort(
    (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
  );
  if (lods.length > 0) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(heading(h + 1, "Quality Checklist"));
    lines.push("");
    lines.push(
      blockquoteGuidance(
        "**[Guidance]** Use this checklist to assess the maturity of this document. " +
          "Each level of detail represents progressive depth and quality.",
      ),
    );

    for (const lod of lods) {
      const lodDisplay = display("LevelOfDetail", lod.name);
      const lodDesc = practiceElementDescriptionForDisplay(lod);
      lines.push("");
      lines.push(heading(h + 2, `Level ${lod.seq}: ${lodDisplay}`));

      if (lodDesc) {
        lines.push("");
        lines.push(blockquoteGuidance(`**[Guidance]** ${lodDesc}`));
      }

      // Prerequisites
      const bgMd = renderBackgroundForTemplate(
        lod.background,
        display,
        baseline,
      );
      if (bgMd) {
        lines.push("");
        lines.push(blockquoteGuidance(bgMd));
      }

      // LOD narratives
      if (lod.narratives?.length) {
        const lodNarrMd = renderNarrativesForTemplate(lod.narratives, h + 3);
        if (lodNarrMd.trim()) {
          lines.push("");
          lines.push(blockquoteGuidance(lodNarrMd));
        }
      }

      // Checklist items
      const checklist = [...(lod.checklist ?? [])].sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
      );
      if (checklist.length > 0) {
        lines.push("");
        for (const item of checklist) {
          const itemDesc = practiceElementDescriptionForDisplay(item);
          let checkLine = `- [ ] **${item.name}**`;
          if (itemDesc) checkLine += ` — ${itemDesc}`;
          lines.push(checkLine);

          // Verification method
          if (item.verificationMethod) {
            lines.push(
              `    > *Verification: ${item.verificationMethod.replace(/-/g, " ")}*`,
            );
          }

          // Test scenario
          const testMd = renderTestForTemplate(item.test);
          if (testMd) {
            lines.push(
              ...testMd
                .split("\n")
                .map((l) => `    > ${l}`),
            );
          }

          // Examples
          const exMd = renderExamplesForTemplate(item.examples);
          if (exMd) {
            lines.push(
              ...exMd
                .split("\n")
                .filter((l) => l.trim())
                .map((l) => `    > ${l}`),
            );
          }
        }
      }

      // Contributes to
      if (lod.contributesTo?.length) {
        lines.push("");
        lines.push(
          blockquoteGuidance(
            "**Completing this level evidences:** " +
              lod.contributesTo
                .map(
                  (c) =>
                    `${display("Alpha", c.alphaName)} → ${display("State", c.stateName)}`,
                )
                .join(", "),
          ),
        );
      }
    }
  }

  // --- 6. Revision Log (top-level only) ---
  if (h === 1) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(heading(h + 1, "Revision Log"));
    lines.push("");
    lines.push("| Date | Author | Changes |");
    lines.push("|------|--------|---------|");
    lines.push("|      |        |         |");
  }

  lines.push("");
  return lines.join("\n");
}
