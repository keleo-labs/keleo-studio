import { IMPLICIT_FOCUS_NAME, narrativeContextBulletLine, personaCompetencyDisplayRefs, practiceElementDescriptionForDisplay } from "@/lib/ir";
import { formatAPA7Citation } from "@/lib/citationUtils";
import { flattenPracticeElementTags } from "@/lib/practiceElementTags";
import { extendsBaselineDisplayName } from "@/lib/library/classify";
import {
  buildPracticeElementAliasLookup,
  formatAliasedNameHtml,
  type PracticeElementAliasLookup,
} from "@/lib/practiceElementAliasDisplay";
import type { LanguagePack } from "@/lib/languagePackTypes";
import { svgFocusActivityForGroup, svgFocusAlphasForGroup, svgPatternMatrix, svgKanbanPattern } from "@/lib/pdfSvgs";
import type { ThemeTokens } from "@/lib/themeTokens";
import { mergeNarrativeTypes } from "@/lib/methodMerge/compositePracticeFromMethod";
import type { Method, PracticeBaseline, PracticeElementAlias } from "@/lib/types";

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function alphaId(alphaName: string) {
  return `alpha-${slug(alphaName)}`;
}
function stateId(alphaName: string, stateName: string) {
  return `state-${slug(alphaName)}--${slug(stateName)}`;
}
function activitySpaceId(name: string) {
  return `activity-space-${slug(name)}`;
}
function competencyId(name: string) {
  return `competency-${slug(name)}`;
}
function workProductId(name: string) {
  return `work-product-${slug(name)}`;
}
function activityId(name: string) {
  return `activity-${slug(name)}`;
}
function narrativeTypeIdPdf(name: string) {
  return `narrative-type-${slug(name)}`;
}
function personaIdPdf(name: string) {
  return `persona-${slug(name)}`;
}
function personaGroupIdPdf(name: string) {
  return `persona-group-${slug(name)}`;
}
function patternId(name: string) {
  return `pattern-${slug(name)}`;
}

function browseSectionAlphasId() {
  return "browse-section-alphas";
}
function browseAlphasFocusSectionId(focusName: string) {
  return `browse-alphas-focus-${slug(focusName)}`;
}
function browseSectionActivitiesId() {
  return "browse-section-activities";
}
function browseActivitiesFocusSectionId(focusName: string) {
  return `browse-activities-focus-${slug(focusName)}`;
}

const PDF_SECTION_METHOD_PRACTICES = "browse-section-composing-practices";

function renderMethodCompositionHtml(method: Method, t: LanguagePack, lookup: PracticeElementAliasLookup): string {
  const baseline = method.baselinePractice;
  const extensions = method.practices ?? [];
  const baselineDesc = String(baseline.description ?? "").trim();
  const extItems = extensions
    .map((p) => {
      const deps =
        Array.isArray(p.practiceDependencyNames) && p.practiceDependencyNames.length
          ? `<div class="muted" style="margin-top:4px;font-size:12px"><b>${esc(t.practiceDependencies)}:</b> ${(
              p.practiceDependencyNames as string[]
            )
              .map((x) => formatAliasedNameHtml(lookup, "Practice", x, esc))
              .join(", ")}</div>`
          : "";
      const extendsB =
        typeof p.baselinePracticeName === "string" && p.baselinePracticeName.trim() !== ""
          ? `<div class="muted" style="margin-top:6px;font-size:12px"><b>${esc(t.extendsBaseline)}:</b> <code>${formatAliasedNameHtml(
              lookup,
              "PracticeBaseline",
              String(p.baselinePracticeName).trim(),
              esc,
            )}</code></div>`
          : "";
      const pd = p.description?.trim?.()
        ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(p.description)}</div>`
        : "";
      return `<li style="margin:12px 0">
          <div style="font-weight:800">${formatAliasedNameHtml(lookup, "Practice", String(p.name ?? "—"), esc)}</div>
          ${pd}
          ${extendsB}
          ${deps}
        </li>`;
    })
    .join("");

  return `<div style="margin-top:18px;break-inside:avoid">
    <h2 id="${PDF_SECTION_METHOD_PRACTICES}" style="margin:0 0 8px;font-size:15px;font-weight:900">${esc(
      t.methodBrowseExtensionPracticesHeading,
    )}</h2>
    <ol style="margin:8px 0 0;padding-left:20px">
      <li style="margin:12px 0">
        <div style="font-weight:800">${formatAliasedNameHtml(lookup, "PracticeBaseline", baseline.name, esc)}</div>
        ${baselineDesc ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(baselineDesc)}</div>` : ""}
      </li>
      ${extItems}
    </ol>
  </div>`;
}

function seqInt(x: unknown): number {
  const n = Number(x);
  if (!Number.isFinite(n)) return 1;
  return Math.trunc(n);
}

function renderPdfEmbeddedNarrativeSubtree(narratives: unknown[]): string {
  if (!Array.isArray(narratives) || !narratives.length) return "";
  return narratives
    .map((raw) => {
      if (!raw || typeof raw !== "object") return "";
      const n = raw as Record<string, unknown>;
      const label =
        typeof n.name === "string" && n.name.trim()
          ? String(n.name).trim()
          : "—";
      const desc = practiceElementDescriptionForDisplay(n);
      const rawCtx = n.narrativeContexts;
      const ctxList = Array.isArray(rawCtx) ? rawCtx : [];
      const sorted = [...ctxList].sort(
        (a, b) =>
          (Number((a as { seq?: unknown })?.seq ?? 0) || 0) -
          (Number((b as { seq?: unknown })?.seq ?? 0) || 0),
      );
      const bullets = sorted
        .map((c) => {
          const line = narrativeContextBulletLine(c);
          return line ? `<li style="margin:3px 0">${esc(line)}</li>` : "";
        })
        .join("");
      const bulletBlock =
        bullets !== ""
          ? `<ul style="margin:6px 0 0;padding-left:18px;line-height:1.45;color:#111827">${bullets}</ul>`
          : "";
      const nestedRaw = n.narratives;
      const nested = Array.isArray(nestedRaw)
        ? `<div style="margin-top:8px;padding-left:10px;border-left:2px solid rgba(2,6,23,0.12)">${renderPdfEmbeddedNarrativeSubtree(
            nestedRaw as unknown[],
          )}</div>`
        : "";
      return `<section style="margin-top:12px;break-inside:avoid">
          <div style="font-weight:800">${esc(label)}</div>
          ${
            desc
              ? `<div class="muted" style="margin-top:4px;font-size:12px;line-height:1.45">${esc(desc)}</div>`
              : ""
          }
          ${bulletBlock}
          ${nested}
        </section>`;
    })
    .join("");
}

/** HTML for {@link PracticeElement.narratives} under the enclosing element&apos;s prose (PDF). */
function pdfPracticeElementNarrativesHtml(rec: unknown): string {
  if (!rec || typeof rec !== "object") return "";
  const n = (rec as { narratives?: unknown }).narratives;
  return Array.isArray(n) && n.length ? renderPdfEmbeddedNarrativeSubtree(n as unknown[]) : "";
}

function pdfMergedRootNarrativesHtml(baseline: PracticeBaseline, sourceDoc?: Record<string, unknown> | null): string {
  const aa = Array.isArray((baseline as { narratives?: unknown }).narratives)
    ? ((baseline as { narratives: unknown[] }).narratives as unknown[])
    : [];
  const bb =
    sourceDoc && Array.isArray(sourceDoc.narratives) ? (sourceDoc.narratives as unknown[]) : ([] as unknown[]);
  if (aa.length && bb.length) return renderPdfEmbeddedNarrativeSubtree([...aa, ...bb]);
  if (aa.length) return renderPdfEmbeddedNarrativeSubtree(aa);
  if (bb.length) return renderPdfEmbeddedNarrativeSubtree(bb as unknown[]);
  return "";
}

export function renderPdfHtml(args: {
  baseline: PracticeBaseline;
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  theme: ThemeTokens;
  t: LanguagePack;
  /** Original document for Practice-only fields (workProducts, baselinePracticeName, …). */
  sourceDoc?: Record<string, unknown> | null;
  /** Library method source: replaces extends/related meta with the composing-practices list (baseline first). */
  methodComposition?: Method | null;
  /** Narrative spine *catalog* (merged types section + TOC): only when the opened artifact is a baseline practice file. */
  showNarrativeSpineCatalog?: boolean;
}) {
  const { baseline, grouped, theme, t, sourceDoc, methodComposition, showNarrativeSpineCatalog = false } = args;
  const displayFocusName = (nm: string) => (nm === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : nm);
  const aliasLookup: PracticeElementAliasLookup = buildPracticeElementAliasLookup(
    Array.isArray(sourceDoc?.practiceElementAliases)
      ? (sourceDoc!.practiceElementAliases as PracticeElementAlias[])
      : undefined,
  );
  const focusSectionTitleHtml = (focusName: string) =>
    focusName === IMPLICIT_FOCUS_NAME
      ? esc(t.implicitFocusName)
      : formatAliasedNameHtml(aliasLookup, "Focus", focusName, esc);

  const css = `
  :root{
    --bg:${theme.bg};
    --panel:${theme.panel};
    --text:${theme.text};
    --muted:${theme.muted};
    --border:${theme.border};
    --accent:${theme.accent};
    color-scheme:${theme.colorScheme};
  }
  *{box-sizing:border-box}
  body{margin:0;padding:0;background:#fff;color:#0b1020;font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;}
  main{padding:0.6in;}
  h1{margin:0;font-size:22px}
  .muted{color:#4b5563}
  .section-title{font-weight:900;margin:18px 0 8px}
  .card{border:1px solid rgba(2,6,23,0.14);border-radius:10px;padding:10px;margin:10px 0}
  a{color:inherit;text-decoration:underline;text-decoration-color:rgba(109,40,217,0.6);text-underline-offset:2px}
  code{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;}
  svg{width:100%;height:auto;display:block;border:1px solid rgba(2,6,23,0.14);border-radius:10px}
  @page { size: A4; margin: 0; }
  `;

  const supportingAlphaNamesGlobal = new Set<string>();
  for (const gg of grouped) {
    for (const x of gg.alphas ?? []) {
      for (const raw of x.supportingAlphas ?? []) {
        const n = String(raw ?? "").trim();
        if (n) supportingAlphaNamesGlobal.add(n);
      }
    }
  }

  const mergedNarrativeTypesPdf = mergeNarrativeTypes(
    (baseline.narrativeTypes ?? []) as unknown[],
    Array.isArray(sourceDoc?.narrativeTypes) ? (sourceDoc!.narrativeTypes as unknown[]) : [],
  );

  const isActivityPdf = (s: any) =>
    s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";

  const buildPdfTableOfContentsHtml = (): string => {
    const browseOrphanActsIdForPdf = (parentSpaceName: string) => `browse-orphan-acts-${slug(parentSpaceName)}`;
    const chunks: string[] = [];
    chunks.push(`<li style="margin:4px 0"><a href="#practice-readable-title">${esc(t.browseTocOverview)}</a></li>`);
    if (methodComposition) {
      chunks.push(
        `<li style="margin:4px 0"><a href="#${esc(PDF_SECTION_METHOD_PRACTICES)}">${esc(
          t.methodBrowseExtensionPracticesHeading,
        )}</a></li>`,
      );
    }

    const alphaToc = grouped
      .map((g) => {
        const alphaList = g.alphas
          .filter((a: any) => !supportingAlphaNamesGlobal.has(String(a.name)))
            .map(
            (a: any) =>
              `<li style="margin:2px 0;font-size:11px"><a href="#${esc(alphaId(a.name))}">${formatAliasedNameHtml(
                aliasLookup,
                "Alpha",
                a.name,
                esc,
              )}</a></li>`,
          )
          .join("");
        return `<li style="margin:3px 0">
        <a href="#${esc(browseAlphasFocusSectionId(g.focusName))}" style="font-weight:800">${focusSectionTitleHtml(
          g.focusName,
        )}</a>
        ${
          alphaList
            ? `<ul style="margin:4px 0 0;padding-left:12px;list-style:none">${alphaList}</ul>`
            : ""
        }
      </li>`;
      })
      .join("");

    const activityToc = grouped
      .map((g) => {
        const items = g.activitySpaces as any[];
        const spaces = items.filter((s: any) => !isActivityPdf(s));
        const byParent = new Map<string, any[]>();
        for (const s of spaces) {
          byParent.set(String(s.name), [...(s.activities ?? [])]);
        }
        for (const s of items) {
          if (isActivityPdf(s)) {
            const p = String(s.activitySpaceName ?? "").trim();
            if (!p) continue;
            if (!byParent.has(p)) byParent.set(p, []);
            byParent.get(p)!.push(s);
          }
        }
        const spaceNames = new Set(spaces.map((s: any) => String(s.name)));
        const spaceList = spaces
          .map((s: any) => {
            const acts = (byParent.get(s.name) ?? [])
              .slice()
              .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
              .map(
                (act: any) =>
                  `<li style="margin:2px 0;font-size:10px"><a href="#${esc(activityId(act.name))}"><span class="muted">${formatAliasedNameHtml(
                    aliasLookup,
                    "Activity",
                    act.name,
                    esc,
                  )}</span></a></li>`,
              )
              .join("");
            return `<li style="margin:3px 0;font-size:11px"><a href="#${esc(activitySpaceId(s.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "ActivitySpace",
              s.name,
              esc,
            )}</a>${
              acts ? `<ul style="margin:4px 0 0;padding-left:12px;list-style:none">${acts}</ul>` : ""
            }</li>`;
          })
          .join("");

        const orphanBlocks = [...byParent.entries()]
          .filter(([p]) => p && !spaceNames.has(p))
          .map(
            ([parent, acts]) =>
              `<li style="margin:3px 0;font-size:11px"><a href="#${esc(browseOrphanActsIdForPdf(parent))}">${formatAliasedNameHtml(
                aliasLookup,
                "ActivitySpace",
                parent,
                esc,
              )}</a><span class="muted" style="font-size:10px"> — ${esc(t.practiceActivity)}</span>
            <ul style="margin:4px 0 0;padding-left:12px;list-style:none">
              ${acts
                .slice()
                .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
                .map(
                  (act: any) =>
                    `<li style="margin:2px 0;font-size:10px"><a href="#${esc(activityId(act.name))}"><span class="muted">${formatAliasedNameHtml(
                      aliasLookup,
                      "Activity",
                      act.name,
                      esc,
                    )}</span></a></li>`,
                )
                .join("")}
            </ul>
          </li>`,
          )
          .join("");

        const allSpaces = (spaceList || "") + (orphanBlocks || "");
        return `<li style="margin:3px 0">
        <a href="#${esc(browseActivitiesFocusSectionId(g.focusName))}" style="font-weight:800">${focusSectionTitleHtml(
          g.focusName,
        )}</a>
        ${
          allSpaces
            ? `<ul style="margin:4px 0 0;padding-left:12px;list-style:none">${allSpaces}</ul>`
            : ""
        }
      </li>`;
      })
      .join("");

    chunks.push(`<li style="margin:8px 0 6px">
        <a href="#${esc(browseSectionAlphasId())}" style="font-weight:800">${esc(t.sectionAlphas)}</a>
        <ul style="margin:4px 0 0;padding-left:12px;list-style:none">${alphaToc}</ul>
      </li>`);
    chunks.push(`<li style="margin:8px 0 6px">
        <a href="#${esc(browseSectionActivitiesId())}" style="font-weight:800">${esc(t.sectionActivities)}</a>
        <ul style="margin:4px 0 0;padding-left:12px;list-style:none">${activityToc}</ul>
      </li>`);

    const ps = Array.isArray(sourceDoc?.patterns) ? (sourceDoc!.patterns as any[]) : [];
    if (ps.length) {
      const pList = ps
        .map((p: any) => `<li style="margin:2px 0;font-size:11px"><a href="#${esc(patternId(p.name))}">${formatAliasedNameHtml(
          aliasLookup,
          "Pattern",
          p.name,
          esc,
        )}</a></li>`)
        .join("");
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-patterns" style="font-weight:800">${esc(t.patterns)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${pList}</ul>
      </li>`);
    }

    const compList = (baseline.competencies ?? [])
      .slice()
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
      .map(
        (c: any) =>
          `<li style="margin:2px 0;font-size:11px"><a href="#${esc(competencyId(c.name))}">${formatAliasedNameHtml(
            aliasLookup,
            "Competency",
            c.name,
            esc,
          )}</a></li>`,
      )
      .join("");
    if (compList) {
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-competencies" style="font-weight:800">${esc(t.competencies)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${compList}</ul>
      </li>`);
    }

    const wps = Array.isArray(sourceDoc?.workProducts) ? (sourceDoc!.workProducts as any[]) : [];
    if (wps.length) {
      const wpList = wps
        .map(
          (wp: any) =>
            `<li style="margin:2px 0;font-size:11px"><a href="#${esc(workProductId(wp.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "WorkProduct",
              wp.name,
              esc,
            )}</a></li>`,
        )
        .join("");
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-work-products" style="font-weight:800">${esc(t.workProducts)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${wpList}</ul>
      </li>`);
    }

    const pdfPersonas = Array.isArray(sourceDoc?.personas) ? (sourceDoc!.personas as any[]) : [];
    if (pdfPersonas.length) {
      const pList = pdfPersonas
        .map(
          (p: any) =>
            `<li style="margin:2px 0;font-size:11px"><a href="#${esc(personaIdPdf(p.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "Persona",
              p.name,
              esc,
            )}</a></li>`,
        )
        .join("");
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-personas" style="font-weight:800">${esc(t.personasHeading)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${pList}</ul>
      </li>`);
    }
    const pdfGroups = Array.isArray(sourceDoc?.personaGroups) ? (sourceDoc!.personaGroups as any[]) : [];
    if (pdfGroups.length) {
      const gList = pdfGroups
        .map(
          (pg: any) =>
            `<li style="margin:2px 0;font-size:11px"><a href="#${esc(personaGroupIdPdf(pg.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "PersonaGroup",
              pg.name,
              esc,
            )}</a></li>`,
        )
        .join("");
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-persona-groups" style="font-weight:800">${esc(t.personaGroupsHeading)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${gList}</ul>
      </li>`);
    }

    const ntypesForToc = showNarrativeSpineCatalog ? mergedNarrativeTypesPdf : [];
    if (ntypesForToc.length) {
      const ntList = (ntypesForToc as any[])
        .map(
          (nt: any) =>
            `<li style="margin:2px 0;font-size:11px"><a href="#${esc(narrativeTypeIdPdf(nt.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "NarrativeType",
              nt.name,
              esc,
            )}</a></li>`,
        )
        .join("");
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-narrative-types" style="font-weight:800">${esc(t.narrativeTypesHeading)}</a>
        <ul style="margin:6px 0 0;padding-left:12px;list-style:none">${ntList}</ul>
      </li>`);
    }

    // Citations TOC entry
    const citationsList = Array.isArray(sourceDoc?.citations) ? (sourceDoc!.citations as any[]) : [];
    if (citationsList.length > 0) {
      chunks.push(`<li style="margin:12px 0 6px;padding-top:8px;border-top:1px solid rgba(2,6,23,0.12)">
        <a href="#browse-section-citations" style="font-weight:800">References</a>
      </li>`);
    }

    return `<nav class="card" style="margin:14px 0;padding:12px;break-inside:avoid" aria-label="${esc(t.browseTableOfContents)}">
      <div style="font-weight:900;font-size:12px;letter-spacing:0.04em" class="muted">${esc(t.browseTableOfContents)}</div>
      <ul style="margin:8px 0 0;padding-left:0;list-style:none;font-size:12px;line-height:1.35">${chunks.join("")}</ul>
    </nav>`;
  };

  const pdfTableOfContents = buildPdfTableOfContentsHtml();

  const alphaDiagrams = grouped
    .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.alphas ?? []).length > 0)
    .map((g) =>
      svgFocusAlphasForGroup(baseline, g as any, theme, {
        focusLabel: g.focusName === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : undefined,
        aliasLookup,
      }),
    )
    .join("");
  const activityDiagrams = grouped
    .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.activitySpaces ?? []).length > 0)
    .map((g) =>
      svgFocusActivityForGroup(baseline, g as any, theme, {
        focusLabel: g.focusName === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : undefined,
        aliasLookup,
      }),
    )
    .join("");

  const alphaSections = grouped
    .map((g) => {
      const alphas = g.alphas
        .map((a: any) => {
          const states = (a.states ?? [])
            .slice()
            .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
            .map((s: any) => {
              const tagList = flattenPracticeElementTags(s.tags);
              const tags =
                tagList.length > 0
                  ? `<div class="muted" style="margin-top:4px;font-size:11px">${esc(t.tags)}: ${tagList
                      .map((x: string) => esc(x))
                      .join(", ")}</div>`
                  : "";
              const checklist = Array.isArray(s.checklist)
                ? s.checklist
                    .slice()
                    .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                    .map((ch: any) => {
                      const chd = practiceElementDescriptionForDisplay(ch);
                      const chNar = pdfPracticeElementNarrativesHtml(ch);
                      return `<li value="${seqInt(ch.seq)}"><b>${formatAliasedNameHtml(
                        aliasLookup,
                        "Checklist",
                        ch.name,
                        esc,
                      )}</b>${chd ? `<span class="muted"> — ${esc(chd)}</span>` : ""}${chNar}</li>`;
                    })
                    .join("")
                : "";
              const checklistBlock =
                checklist !== ""
                  ? `<div style="margin-top:6px"><div style="font-size:11px;font-weight:700" class="muted">${esc(
                      t.checklist,
                    )}</div><ol style="margin:4px 0 0;padding-left:18px;font-size:12px">${checklist}</ol></div>`
                  : "";
              const sd = practiceElementDescriptionForDisplay(s);
              return `<li id="${esc(stateId(a.name, s.name))}" value="${seqInt(s.seq)}"><a href="#${esc(
                stateId(a.name, s.name),
              )}"><b>${formatAliasedNameHtml(aliasLookup, "State", s.name, esc)}</b>${
                sd ? `<span class="muted" style="font-weight:400"> — ${esc(sd)}</span>` : ""
              }</a>${pdfPracticeElementNarrativesHtml(s)}${tags}${checklistBlock}</li>`;
            })
            .join("");

          const alphaTagList = flattenPracticeElementTags(a.tags);
          const alphaTags =
            alphaTagList.length > 0
              ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.tags)}: ${alphaTagList
                  .map((x: string) => esc(x))
                  .join(", ")}</div>`
              : "";

          const alphaRollup =
            typeof a.contributesTo === "string" && a.contributesTo.trim() !== ""
              ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.alphaContributesToAlpha)}: <a href="#${esc(
                  alphaId(a.contributesTo.trim()),
                )}"><code>${formatAliasedNameHtml(aliasLookup, "Alpha", a.contributesTo.trim(), esc)}</code></a></div>`
              : "";

          const supRaw = Array.isArray(a.supportingAlphas)
            ? (a.supportingAlphas as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
            : [];
          const supList = [...new Set(supRaw as string[])].sort((x: string, y: string) => x.localeCompare(y));
          const alphaSupporting =
            supList.length > 0
              ? supList
                  .map((nm: string) => {
                    const child = (g.alphas ?? []).find((x: any) => String(x?.name ?? "").trim() === nm);
                    const chAd = child ? practiceElementDescriptionForDisplay(child) : "";
                    const childTagList = child ? flattenPracticeElementTags(child.tags) : [];
                    const chTags =
                      childTagList.length > 0
                        ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.tags)}: ${childTagList
                            .map((x: string) => esc(x))
                            .join(", ")}</div>`
                        : "";
                    const chRoll =
                      child && typeof child.contributesTo === "string" && child.contributesTo.trim() !== ""
                        ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.alphaContributesToAlpha)}: <a href="#${esc(
                            alphaId(child.contributesTo.trim()),
                          )}"><code>${formatAliasedNameHtml(aliasLookup, "Alpha", child.contributesTo.trim(), esc)}</code></a></div>`
                        : "";
                    return `<div class="card" style="margin-top:10px;border-left:4px solid rgba(109,40,217,0.35)">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.04em" class="muted">${esc(t.alpha)}</div>
              <div style="font-weight:900;margin-top:4px"><a href="#${esc(alphaId(nm))}">${formatAliasedNameHtml(
                      aliasLookup,
                      "Alpha",
                      nm,
                      esc,
                    )}</a></div>
              <div class="muted" style="margin-top:6px;font-size:12px">${esc(t.withinRollupAlpha)}: <a href="#${esc(
                      alphaId(a.name),
                    )}"><code>${formatAliasedNameHtml(aliasLookup, "Alpha", a.name, esc)}</code></a></div>
              ${chAd ? `<div class="muted" style="margin-top:4px">${esc(chAd)}</div>` : ""}
              ${pdfPracticeElementNarrativesHtml(child)}
              ${chTags}
              ${chRoll}
            </div>`;
                  })
                  .join("")
              : "";

          const ad = practiceElementDescriptionForDisplay(a);
          return `
          <div class="card" id="${esc(alphaId(a.name))}">
            <div style="font-weight:900"><a href="#${esc(alphaId(a.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "Alpha",
              a.name,
              esc,
            )}</a></div>
            ${ad ? `<div class="muted" style="margin-top:4px">${esc(ad)}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(a)}
            ${alphaTags}
            ${alphaRollup}
            ${alphaSupporting}
            <ol style="margin:10px 0 0;padding-left:18px">${states}</ol>
          </div>`;
        })
        .join("");

      return `
      <div id="${esc(browseAlphasFocusSectionId(g.focusName))}" style="margin-top:18px">
        <div style="font-weight:900;font-size:16px">${focusSectionTitleHtml(g.focusName)}</div>
        ${
          g.focus && practiceElementDescriptionForDisplay(g.focus)
            ? `<div class="muted" style="margin-top:4px">${esc(practiceElementDescriptionForDisplay(g.focus))}</div>`
            : ""
        }
        ${pdfPracticeElementNarrativesHtml(g.focus)}
        ${alphas}
      </div>`;
    })
    .join("");

  const activitySections = grouped
    .map((g) => {
      const isActivity = (s: any) =>
        s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";

      const spaces = g.activitySpaces
        .map((s: any) => {
          const contributes =
            s.contributesTo?.length
              ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.contributesTo)}: ${s.contributesTo
                  .map(
                    (c: any) =>
                      `<a href="#${esc(stateId(c.alphaName, c.stateName))}"><code>${formatAliasedNameHtml(
                        aliasLookup,
                        "Alpha",
                        c.alphaName,
                        esc,
                      )}→${formatAliasedNameHtml(aliasLookup, "State", c.stateName, esc)}</code></a>`,
                  )
                  .join(", ")}</div>`
              : "";

          const required =
            s.requiredCompetencies?.length
              ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(t.requiredCompetencies)}: ${s.requiredCompetencies
                  .map((c: string) => `<a href="#${esc(competencyId(c))}"><code>${formatAliasedNameHtml(
                    aliasLookup,
                    "Competency",
                    c,
                    esc,
                  )}</code></a>`)
                  .join(", ")}</div>`
              : "";

          const involvesPg =
            s.involves?.length
              ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(t.activitySpaceInvolvesPersonaGroups)}: ${s.involves
                  .map(
                    (g: string) =>
                      `<a href="#${esc(personaGroupIdPdf(g))}"><code>${formatAliasedNameHtml(
                        aliasLookup,
                        "PersonaGroup",
                        g,
                        esc,
                      )}</code></a>`,
                  )
                  .join(", ")}</div>`
              : "";

          const tagsLine = (tags: unknown) => {
            const list = flattenPracticeElementTags(tags);
            return list.length
              ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.tags)}: ${list
                  .map((x: string) => esc(x))
                  .join(", ")}</div>`
              : "";
          };

          if (isActivity(s)) {
            const parent = String(s.activitySpaceName).trim();
            const worksOn =
              s.worksOn?.length
                ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(t.worksOn)}: ${s.worksOn
                    .map(
                      (w: any) =>
                        `<a href="#${esc(workProductId(w.workProductName))}"><code>${formatAliasedNameHtml(
                          aliasLookup,
                          "WorkProduct",
                          w.workProductName,
                          esc,
                        )}→${formatAliasedNameHtml(aliasLookup, "LevelOfDetail", w.levelOfDetailName, esc)}</code></a>`,
                    )
                    .join(", ")}</div>`
                : "";
            const rec =
              s.recommendedCompetencyLevels?.length
                ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(t.recommendedCompetencyLevels)}: ${s.recommendedCompetencyLevels
                    .map(
                      (r: any) =>
                        `<code>${formatAliasedNameHtml(aliasLookup, "Competency", r.competencyName, esc)} / ${formatAliasedNameHtml(
                          aliasLookup,
                          "CompetencyLevel",
                          r.competencyLevelName,
                          esc,
                        )}</code>`,
                    )
                    .join(", ")}</div>`
                : "";
            return `
          <div class="card" id="${esc(activityId(s.name))}" style="border-left:4px solid rgba(109,40,217,0.45)">
            <div style="font-size:11px;font-weight:800;letter-spacing:0.04em" class="muted">${esc(t.practiceActivity)}</div>
            <div style="font-weight:900;margin-top:4px">${formatAliasedNameHtml(aliasLookup, "Activity", s.name, esc)}</div>
            <div class="muted" style="margin-top:6px;font-size:12px">${esc(t.withinActivitySpace)}: <a href="#${esc(
              activitySpaceId(parent),
            )}"><code>${formatAliasedNameHtml(aliasLookup, "ActivitySpace", parent, esc)}</code></a></div>
            ${practiceElementDescriptionForDisplay(s) ? `<div class="muted" style="margin-top:4px">${esc(practiceElementDescriptionForDisplay(s))}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(s)}
            ${tagsLine(s.tags)}
            ${contributes}
            ${required}
            ${worksOn}
            ${rec}
          </div>`;
          }

          const nestedActs = (Array.isArray(s.activities) ? s.activities : [])
            .map((act: any) => {
              const ad = practiceElementDescriptionForDisplay(act);
              const actContributes =
                act.contributesTo?.length
                  ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.contributesTo)}: ${act.contributesTo
                      .map(
                        (c: any) =>
                          `<a href="#${esc(stateId(c.alphaName, c.stateName))}"><code>${formatAliasedNameHtml(
                            aliasLookup,
                            "Alpha",
                            c.alphaName,
                            esc,
                          )}→${formatAliasedNameHtml(aliasLookup, "State", c.stateName, esc)}</code></a>`,
                      )
                      .join(", ")}</div>`
                  : "";
              return `
            <div class="card" id="${esc(activityId(act.name))}" style="margin-top:10px;border-left:4px solid rgba(109,40,217,0.35)">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.04em" class="muted">${esc(t.practiceActivity)}</div>
              <div style="font-weight:900;margin-top:4px"><a href="#${esc(activityId(act.name))}">${formatAliasedNameHtml(
                aliasLookup,
                "Activity",
                act.name,
                esc,
              )}</a></div>
              <div class="muted" style="margin-top:6px;font-size:12px">${esc(t.withinActivitySpace)}: <a href="#${esc(
                activitySpaceId(s.name),
              )}"><code>${formatAliasedNameHtml(aliasLookup, "ActivitySpace", s.name, esc)}</code></a></div>
              ${ad ? `<div class="muted" style="margin-top:4px">${esc(ad)}</div>` : ""}
              ${pdfPracticeElementNarrativesHtml(act)}
              ${tagsLine(act.tags)}
              ${actContributes}
            </div>`;
            })
            .join("");

          const spd = practiceElementDescriptionForDisplay(s);
          return `
          <div class="card" id="${esc(activitySpaceId(s.name))}">
            <div style="font-weight:900"><a href="#${esc(activitySpaceId(s.name))}">${formatAliasedNameHtml(
              aliasLookup,
              "ActivitySpace",
              s.name,
              esc,
            )}</a></div>
            ${spd ? `<div class="muted" style="margin-top:4px">${esc(spd)}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(s)}
            ${tagsLine(s.tags)}
            ${contributes}
            ${required}
            ${involvesPg}
            ${nestedActs}
          </div>`;
        })
        .join("");

      return `
      <div id="${esc(browseActivitiesFocusSectionId(g.focusName))}" style="margin-top:18px">
        <div style="font-weight:900;font-size:16px">${focusSectionTitleHtml(g.focusName)}</div>
        ${
          g.focus && practiceElementDescriptionForDisplay(g.focus)
            ? `<div class="muted" style="margin-top:4px">${esc(practiceElementDescriptionForDisplay(g.focus))}</div>`
            : ""
        }
        ${pdfPracticeElementNarrativesHtml(g.focus)}
        ${spaces}
      </div>`;
    })
    .join("");

  const patternsHtml =
    Array.isArray(sourceDoc?.patterns) && (sourceDoc!.patterns as any[]).length
      ? (sourceDoc!.patterns as any[])
          .map((p: any) => {
            const patternTagList = flattenPracticeElementTags(p.tags);
            const tags =
              patternTagList.length > 0
                ? `<div class="muted" style="margin-top:4px;font-size:11px">${esc(t.tags)}: ${patternTagList
                    .map((x: string) => esc(x))
                    .join(", ")}</div>`
                : "";
            const matrix =
              Array.isArray(p.patternViews) && p.patternViews.length
                ? svgPatternMatrix({
                    pattern: p,
                    baseline,
                    theme,
                    laneLabels: { activitySpace: t.activitySpace, activity: t.practiceActivity },
                    aliasLookup,
                  })
                : "";
            const kanban =
              Array.isArray(p.patternViews) && p.patternViews.length
                ? svgKanbanPattern({
                    pattern: p,
                    baseline,
                    theme,
                    aliasLookup,
                  })
                : "";
            const pvBlocks =
              Array.isArray(p.patternViews) && p.patternViews.length
                ? [...p.patternViews]
                    .sort((a: any, b: any) => (Number(a.seq) || 0) - (Number(b.seq) || 0))
                    .map((pv: any) => {
                      const pvD = practiceElementDescriptionForDisplay(pv);
                      return `<section style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(2,6,23,0.12);break-inside:avoid"><div style="font-weight:800">${formatAliasedNameHtml(
                        aliasLookup,
                        "PatternView",
                        pv.name,
                        esc,
                      )}</div>${pvD ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(pvD)}</div>` : ""}${pdfPracticeElementNarrativesHtml(pv)}</section>`;
                    })
                    .join("")
                : "";
            return `<div class="card" id="${esc(patternId(p.name))}">
              <div style="font-weight:900"><a href="#${esc(patternId(p.name))}">${formatAliasedNameHtml(
                aliasLookup,
                "Pattern",
                p.name,
                esc,
              )}</a></div>
              ${practiceElementDescriptionForDisplay(p) ? `<div class="muted" style="margin-top:4px">${esc(practiceElementDescriptionForDisplay(p))}</div>` : ""}
              ${pdfPracticeElementNarrativesHtml(p)}
              ${tags}
              ${matrix}
              ${kanban}
              ${pvBlocks}
            </div>`;
          })
          .join("")
      : "";

  const focusSections = `
  <div class="section-title" id="${esc(browseSectionAlphasId())}">${esc(t.sectionAlphas)}</div>
  ${alphaDiagrams}
  ${alphaSections}
  <div class="section-title" id="${esc(browseSectionActivitiesId())}" style="margin-top:18px">${esc(
    t.sectionActivities,
  )}</div>
  ${activityDiagrams}
  ${activitySections}
  ${patternsHtml ? `<div class="section-title" id="browse-section-patterns">${esc(t.patterns)}</div>${patternsHtml}` : ""}
  `;

  const competencies = (baseline.competencies ?? [])
    .slice()
    .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
    .map((c: any) => {
      const competencyTagList = flattenPracticeElementTags(c.tags);
      const ctags =
        competencyTagList.length > 0
          ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.tags)}: ${competencyTagList
              .map((x: string) => esc(x))
              .join(", ")}</div>`
          : "";
      const levels = (c.levels ?? [])
        .slice()
        .sort((x: any, y: any) => (x.level ?? 0) - (y.level ?? 0))
        .map((lvl: any) => {
          const ld = practiceElementDescriptionForDisplay(lvl);
          return `<li><b>${formatAliasedNameHtml(aliasLookup, "CompetencyLevel", lvl.name, esc)} (Level ${esc(
            lvl.level,
          )})</b>${ld ? `: <span class="muted">${esc(ld)}</span>` : ""}${pdfPracticeElementNarrativesHtml(lvl)}</li>`;
        })
        .join("");
      const cd = practiceElementDescriptionForDisplay(c);
      return `
      <div class="card" id="${esc(competencyId(c.name))}">
        <div style="font-weight:900"><a href="#${esc(competencyId(c.name))}">${formatAliasedNameHtml(
          aliasLookup,
          "Competency",
          c.name,
          esc,
        )}</a></div>
        ${cd ? `<div class="muted" style="margin-top:4px">${esc(cd)}</div>` : ""}
        ${pdfPracticeElementNarrativesHtml(c)}
        ${ctags}
        ${
          levels
            ? `<div style="margin-top:10px;font-weight:900">${esc(t.levels)}</div><ol style="margin:6px 0 0;padding-left:18px">${levels}</ol>`
            : ""
        }
      </div>`;
    })
    .join("");

  const workProductsHtml =
    Array.isArray(sourceDoc?.workProducts) && (sourceDoc!.workProducts as any[]).length
      ? (sourceDoc!.workProducts as any[])
          .map((wp: any) => {
            const wpTagList = flattenPracticeElementTags(wp.tags);
            const wtags =
              wpTagList.length > 0
                ? `<div class="muted" style="margin-top:6px;font-size:12px">${esc(t.tags)}: ${wpTagList
                    .map((x: string) => esc(x))
                    .join(", ")}</div>`
                : "";
            const lods = (wp.levelsOfDetail ?? [])
              .slice()
              .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
              .map((lod: any) => {
                const lodContrib =
                  lod.contributesTo?.length
                    ? `<div class="muted" style="margin-top:4px;font-size:11px">${esc(t.contributesTo)}: ${lod.contributesTo
                        .map(
                          (x: any) =>
                            `<a href="#${esc(stateId(x.alphaName, x.stateName))}"><code>${formatAliasedNameHtml(
                              aliasLookup,
                              "Alpha",
                              x.alphaName,
                              esc,
                            )}→${formatAliasedNameHtml(aliasLookup, "State", x.stateName, esc)}</code></a>`,
                        )
                        .join(", ")}</div>`
                    : "";
                const lodCl =
                  Array.isArray(lod.checklist) && lod.checklist.length
                    ? `<div style="margin-top:6px"><div class="muted" style="font-size:11px;font-weight:700">${esc(
                        t.checklist,
                      )}</div><ol style="margin:4px 0 0;padding-left:16px;font-size:12px">${lod.checklist
                        .slice()
                        .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                        .map((ch: any) => {
                          const chd = practiceElementDescriptionForDisplay(ch);
                          const chNar = pdfPracticeElementNarrativesHtml(ch);
                          return `<li value="${seqInt(ch.seq)}"><b>${formatAliasedNameHtml(
                            aliasLookup,
                            "Checklist",
                            ch.name,
                            esc,
                          )}</b>${chd ? `<span class="muted"> — ${esc(chd)}</span>` : ""}${chNar}</li>`;
                        })
                        .join("")}</ol></div>`
                    : "";
                const lodd = practiceElementDescriptionForDisplay(lod);
                return `<li value="${seqInt(lod.seq)}" style="margin:8px 0;padding:8px;border:1px solid rgba(2,6,23,0.12);border-radius:8px;background:rgba(2,6,23,0.04)">
              <div style="font-weight:800">${formatAliasedNameHtml(aliasLookup, "LevelOfDetail", lod.name, esc)}</div>
              ${lodd ? `<div class="muted" style="margin-top:4px;font-size:12px">${esc(lodd)}</div>` : ""}
              ${pdfPracticeElementNarrativesHtml(lod)}
              ${lodContrib}
              ${lodCl}
            </li>`;
              })
              .join("");
            const wpd = practiceElementDescriptionForDisplay(wp);
            return `
        <div class="card" id="${esc(workProductId(wp.name))}">
          <div style="font-weight:900">${formatAliasedNameHtml(aliasLookup, "WorkProduct", wp.name, esc)}</div>
          ${wpd ? `<div class="muted" style="margin-top:4px">${esc(wpd)}</div>` : ""}
          ${pdfPracticeElementNarrativesHtml(wp)}
          ${wtags}
          <div style="margin-top:8px;font-weight:900">${esc(t.levels)}</div>
          <ol style="margin:6px 0 0;padding-left:18px">${lods}</ol>
        </div>`;
          })
          .join("")
      : "";

  const narrativeTypesPdfHtml =
    showNarrativeSpineCatalog && mergedNarrativeTypesPdf.length > 0
      ? `<div class="section-title" id="browse-section-narrative-types">${esc(t.narrativeTypesHeading)}</div>` +
        (mergedNarrativeTypesPdf as any[])
          .map((nt: any) => {
            const elems = Array.isArray(nt.narrativeElements)
              ? (nt.narrativeElements as any[])
                  .map(
                    (el: any) =>
                      `<li style="margin:6px 0">${formatAliasedNameHtml(aliasLookup, "NarrativeElement", el.name, esc)}${el?.howToUse ? `<span class="muted"> — ${esc(String(el.howToUse))}</span>` : ""}${pdfPracticeElementNarrativesHtml(el)}</li>`,
                  )
                  .join("")
              : "";
            const ntd = practiceElementDescriptionForDisplay(nt);
            return `<div class="card" id="${esc(narrativeTypeIdPdf(nt.name))}">
            <div style="font-weight:900">${formatAliasedNameHtml(aliasLookup, "NarrativeType", nt.name, esc)}</div>
            ${ntd ? `<div class="muted" style="margin-top:4px">${esc(ntd)}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(nt)}
            ${elems !== "" ? `<div style="margin-top:8px;font-weight:800">${esc(t.narrativeElementsHeading)}</div><ul style="margin:4px 0 0;padding-left:18px;font-size:12px">${elems}</ul>` : ""}
          </div>`;
          })
          .join("")
      : "";

  const citationsPdfHtml =
    Array.isArray(sourceDoc?.citations) && (sourceDoc!.citations as any[]).length > 0
      ? `<div class="section-title" id="browse-section-citations">References</div>` +
        `<ul style="list-style:none;padding:0;margin:8px 0">` +
        (sourceDoc!.citations as any[])
          .map((citation: any) => {
            return `<li style="margin:8px 0;line-height:1.6">${formatAPA7Citation(citation)}</li>`;
          })
          .join("") +
        `</ul>`
      : "";

  const personasNarrativeHtmlParts: string[] = [];
  const psPdf = Array.isArray(sourceDoc?.personas) ? (sourceDoc!.personas as any[]) : [];
  if (psPdf.length) {
    personasNarrativeHtmlParts.push(
      `<div class="section-title" id="browse-section-personas">${esc(t.personasHeading)}</div>` +
        psPdf
          .map((p: any) => {
            const pd = practiceElementDescriptionForDisplay(p);
            const compRows = personaCompetencyDisplayRefs(p);
            const comps =
              compRows.length > 0
                ? compRows
                    .map((r) => {
                      const cPart = formatAliasedNameHtml(aliasLookup, "Competency", r.competencyName, esc);
                      if (!String(r.competencyName ?? "").trim()) return "";
                      if (!r.competencyLevelName) return `<code>${cPart}</code>`;
                      return `<code>${cPart}→${formatAliasedNameHtml(aliasLookup, "CompetencyLevel", r.competencyLevelName, esc)}</code>`;
                    })
                    .filter(Boolean)
                    .join(", ")
                : "";
            return `<div class="card" id="${esc(personaIdPdf(p.name))}">
            <div style="font-weight:900">${formatAliasedNameHtml(aliasLookup, "Persona", p.name, esc)}</div>
            ${pd ? `<div class="muted" style="margin-top:4px">${esc(pd)}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(p)}
            ${comps ? `<div class="muted" style="margin-top:6px;font-size:12px"><b>${esc(t.recommendedCompetencyLevels)}:</b> ${comps}</div>` : ""}
          </div>`;
          })
          .join(""),
    );
  }
  const pgsPdf = Array.isArray(sourceDoc?.personaGroups) ? (sourceDoc!.personaGroups as any[]) : [];
  if (pgsPdf.length) {
    personasNarrativeHtmlParts.push(
      `<div class="section-title" id="browse-section-persona-groups">${esc(t.personaGroupsHeading)}</div>` +
        pgsPdf
          .map((pg: any) => {
            const gd = practiceElementDescriptionForDisplay(pg);
            const members = Array.isArray(pg.personaNames)
              ? pg.personaNames
                  .map((nm: any) => formatAliasedNameHtml(aliasLookup, "Persona", String(nm ?? ""), esc))
                  .join(", ")
              : "";
            return `<div class="card" id="${esc(personaGroupIdPdf(pg.name))}">
            <div style="font-weight:900">${formatAliasedNameHtml(aliasLookup, "PersonaGroup", pg.name, esc)}</div>
            ${gd ? `<div class="muted" style="margin-top:4px">${esc(gd)}</div>` : ""}
            ${pdfPracticeElementNarrativesHtml(pg)}
            ${members ? `<div class="muted" style="margin-top:6px;font-size:12px"><b>${esc(t.personaGroupMembers)}:</b> ${members}</div>` : ""}
          </div>`;
          })
          .join(""),
    );
  }
  const personasNarrativeHtml = personasNarrativeHtmlParts.length ? personasNarrativeHtmlParts.join("") : "";

  const keywordsLine =
    (baseline.keywords ?? []).length > 0
      ? `<div class="muted" style="margin-top:8px;font-size:12px"><b>${esc(t.keywords)}:</b> ${(baseline.keywords ?? [])
          .map((k: string) => esc(k))
          .join(", ")}</div>`
      : "";

  const provenanceBaseline = sourceDoc ? extendsBaselineDisplayName(sourceDoc) : null;
  const practiceMeta = methodComposition
    ? renderMethodCompositionHtml(methodComposition, t, aliasLookup)
    : (provenanceBaseline
        ? `<div class="muted" style="margin-top:6px;font-size:12px"><b>${esc(t.extendsBaseline)}:</b> <code>${formatAliasedNameHtml(
            aliasLookup,
            "PracticeBaseline",
            provenanceBaseline,
            esc,
          )}</code></div>`
        : "") +
      (Array.isArray(sourceDoc?.practiceDependencyNames) && (sourceDoc!.practiceDependencyNames as string[]).length
        ? `<div class="muted" style="margin-top:4px;font-size:12px"><b>${esc(t.practiceDependencies)}:</b> ${(
            sourceDoc!.practiceDependencyNames as string[]
          )
            .map((x) => formatAliasedNameHtml(aliasLookup, "Practice", x, esc))
            .join(", ")}</div>`
        : "");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <style>${css}</style>
    </head>
    <body>
      <main>
        <h1 id="practice-readable-title">${formatAliasedNameHtml(aliasLookup, "PracticeBaseline", baseline.name, esc)}</h1>
        <div class="muted" style="margin-top:6px">${esc(baseline.description)}</div>
        ${pdfMergedRootNarrativesHtml(baseline, sourceDoc ?? null)}
        <div class="muted" style="margin-top:8px;font-size:12px">Authors: ${esc(
          (baseline.authors ?? []).join(", "),
        )} • Version: ${esc(baseline.version ?? "")} • Updated: ${esc(baseline.updatedAt ?? "")}</div>
        ${keywordsLine}
        ${practiceMeta}
        ${pdfTableOfContents}

        ${focusSections}

        <div class="section-title" id="browse-section-competencies">${esc(t.competencies)}</div>
        ${competencies}
        ${
          workProductsHtml
            ? `<div class="section-title" id="browse-section-work-products">${esc(t.workProducts)}</div>${workProductsHtml}`
            : ""
        }
        ${personasNarrativeHtml}
        ${narrativeTypesPdfHtml}
        ${citationsPdfHtml}
      </main>
    </body>
  </html>`;
}

