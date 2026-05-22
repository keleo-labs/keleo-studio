import { narrativeContextRowDisplayText, practiceElementDescriptionForDisplay, groupByFocus } from "@/lib/ir";
import type { LanguagePack } from "@/lib/languagePackTypes";
import type { ThemeTokens } from "@/lib/themeTokens";
import type { Method, Citation } from "@/lib/types";
import { svgKanbanPattern } from "@/lib/pdfSvgs";
import { getCitationsForNarrative, formatInTextCitation, formatAPA7Citation } from "@/lib/citationUtils";

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

type RenderContext = {
  theme: ThemeTokens;
  t: LanguagePack;
  sourceDoc: Record<string, unknown>;
  originalDoc: Record<string, unknown>;
  baseline: any;
  grouped: any[];
  methodComposition?: Method;
  citations: Citation[];
};

// Build alpha hierarchy based on contributesTo relationships
function buildAlphaHierarchy(alphas: any[]): { roots: any[]; childrenMap: Map<string, any[]> } {
  const childrenMap = new Map<string, any[]>();
  const roots: any[] = [];
  const alphasByName = new Map<string, any>();

  for (const alpha of alphas) {
    const name = String(alpha.name ?? "").trim();
    if (name) {
      alphasByName.set(name, alpha);
    }
  }

  for (const alpha of alphas) {
    const name = String(alpha.name ?? "").trim();
    const contributesTo = String(alpha.contributesTo ?? "").trim();

    if (!contributesTo || !alphasByName.has(contributesTo)) {
      roots.push(alpha);
    } else {
      if (!childrenMap.has(contributesTo)) {
        childrenMap.set(contributesTo, []);
      }
      childrenMap.get(contributesTo)!.push(alpha);
    }
  }

  return { roots, childrenMap };
}

function renderNarrativeCompact(narrative: any, allCitations: Citation[] = []): string {
  const narrativeName = String(narrative.name ?? "");
  const description = practiceElementDescriptionForDisplay(narrative) ?? "";
  const contexts = Array.isArray(narrative.narrativeContexts) ? narrative.narrativeContexts : [];

  // Get citations for this narrative
  const narrativeCitations = getCitationsForNarrative(narrative, allCitations);
  const hasCitations = narrativeCitations.length > 0;

  if (!narrativeName && !description && contexts.length === 0 && !hasCitations) {
    return "";
  }

  let html = '<div style="margin-top:1rem;padding:0.75rem;background:#f0f7ff;border-left:3px solid #0066cc;border-radius:4px;">';

  if (narrativeName) {
    html += `<div style="font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#0066cc;">${esc(narrativeName)}</div>`;
  }

  if (description) {
    html += `<div style="margin-bottom:${contexts.length > 0 || hasCitations ? "0.75rem" : "0"};font-size:0.875rem;color:#666;">${esc(description)}</div>`;
  }

  if (contexts.length > 0) {
    html += `<div style="font-size:0.875rem;margin-bottom:${hasCitations ? "0.75rem" : "0"};">`;
    const sorted = contexts.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0));
    sorted.forEach((ctx: any, idx: number) => {
      const text = narrativeContextRowDisplayText(ctx);
      if (text) {
        const seq = ctx.seq ?? idx + 1;
        html += `<div style="display:flex;margin-bottom:${idx < sorted.length - 1 ? "0.5rem" : "0"};">`;
        html += `<div style="min-width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;background:#0066cc;color:white;border-radius:50%;font-size:0.75rem;font-weight:600;margin-right:0.5rem;flex-shrink:0;">${seq}</div>`;
        html += `<div style="flex:1;">${esc(text)}</div>`;
        html += '</div>';
      }
    });
    html += '</div>';
  }

  // Further Reading section
  if (hasCitations) {
    html += '<div>';
    html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#666;">Further Reading</div>';
    html += '<ul style="margin:0;padding-left:1.5rem;font-size:0.75rem;list-style:disc;">';
    narrativeCitations.forEach((citation: Citation) => {
      const citationName = String(citation.name ?? "");
      const citationUrl = citation.url;
      const inTextCitation = formatInTextCitation(citation);

      html += '<li style="margin-bottom:0.25rem;">';
      html += `<a href="${citationUrl || `#citation-${slug(citationName)}`}" style="color:#0066cc;text-decoration:underline;">`;
      html += esc(citationName);
      if (citationUrl) {
        html += '<span style="margin-left:0.25rem;font-size:0.7em;vertical-align:super;">↗</span>';
      }
      html += '</a>';
      if (inTextCitation) {
        html += `<span style="margin-left:0.5rem;color:#666;">${esc(inTextCitation)}</span>`;
      }
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function renderNarratives(narratives: any[] | undefined, allCitations: Citation[] = []): string {
  if (!Array.isArray(narratives) || narratives.length === 0) {
    return "";
  }
  return narratives.map(n => renderNarrativeCompact(n, allCitations)).join("");
}

function renderCitationsSection(citations: Citation[]): string {
  if (!Array.isArray(citations) || citations.length === 0) {
    return "";
  }

  let html = '<div style="margin-top:1.5rem;padding:1.5rem;background:#f0f7ff;border-left:3px solid #0066cc;border-radius:4px;">';
  html += '<h4 style="font-size:1.25rem;font-weight:700;margin:0 0 1rem 0;">References</h4>';
  html += '<ul style="margin:0;padding-left:1.5rem;font-size:0.875rem;list-style:none;">';

  citations.forEach((citation: Citation) => {
    const citationName = String(citation.name ?? "");
    html += `<li id="citation-${slug(citationName)}" style="margin-bottom:0.5rem;line-height:1.6;">`;
    html += formatAPA7Citation(citation);
    html += '</li>';
  });

  html += '</ul>';
  html += '</div>';

  return html;
}

function renderStateBlock(state: any, alphaName: string, workProducts: any[], activities: any[], index: number): string {
  const name = String(state.name ?? "");
  const description = practiceElementDescriptionForDisplay(state) ?? "";
  const checklist = Array.isArray(state.checklist)
    ? state.checklist.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  // Find activities that progress this state
  const progressedBy: Array<string> = [];
  for (const activity of activities) {
    const activityName = String(activity.name ?? "");
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
    for (const contrib of contributesTo) {
      const contribAlphaName = String(contrib.alphaName ?? "");
      const contribStateName = String(contrib.stateName ?? "");
      if (contribAlphaName === alphaName && contribStateName === name) {
        progressedBy.push(activityName);
        break;
      }
    }
  }

  // Find evidenced by
  const evidencedBy: Array<{ workProductName: string; lodName: string }> = [];
  for (const wp of workProducts) {
    const wpName = String(wp.name ?? "");
    const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
    for (const lod of lods) {
      const lodName = String(lod.name ?? "");
      const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
      for (const contrib of contributesTo) {
        const contribAlphaName = String(contrib.alphaName ?? "");
        const contribStateName = String(contrib.stateName ?? "");
        if (contribAlphaName === alphaName && contribStateName === name) {
          evidencedBy.push({ workProductName: wpName, lodName });
          break;
        }
      }
    }
  }

  let html = '<div style="position:relative;padding-left:3rem;margin-bottom:2rem;">';

  // State indicator
  html += `<div style="position:absolute;left:0.5rem;top:0.5rem;width:2rem;height:2rem;border-radius:50%;background:#0066cc;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;">${index + 1}</div>`;

  html += '<div style="padding:1rem;border:1px solid #d2d2d2;border-radius:4px;background:#fff;">';
  html += `<div style="font-weight:600;font-size:1rem;margin-bottom:0.5rem;">${esc(name)}</div>`;

  if (description) {
    html += `<div style="margin-bottom:1rem;font-size:0.875rem;color:#666;">${esc(description)}</div>`;
  }

  if (checklist.length > 0) {
    html += `<div style="margin-bottom:${progressedBy.length > 0 || evidencedBy.length > 0 ? "1rem" : "0"};">`;
    html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#6a6e73;">Checklist</div>';
    html += '<ul style="margin:0;padding-left:1.5rem;list-style:none;">';
    checklist.forEach((item: any) => {
      const itemName = String(item.name ?? "");
      const itemDesc = practiceElementDescriptionForDisplay(item) ?? "";
      html += '<li style="margin-bottom:0.5rem;">';
      html += '<div style="display:flex;align-items:flex-start;">';
      html += '<span style="color:#0066cc;margin-right:0.5rem;">✓</span>';
      html += `<div><strong>${esc(itemName)}:</strong> ${esc(itemDesc)}</div>`;
      html += '</div>';
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }

  if (progressedBy.length > 0) {
    html += `<div style="margin-bottom:${evidencedBy.length > 0 ? "1rem" : "0"};">`;
    html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#6a6e73;">Progressed By</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">';
    progressedBy.forEach((activityName) => {
      html += `<a href="#activity-${slug(activityName)}" style="text-decoration:none;">`;
      html += `<span style="background:#e6f6eb;color:#1e4f28;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;display:inline-block;">${esc(activityName)}</span>`;
      html += '</a>';
    });
    html += '</div>';
    html += '</div>';
  }

  if (evidencedBy.length > 0) {
    html += '<div>';
    html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#6a6e73;">Evidenced By</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">';
    evidencedBy.forEach((evidence) => {
      html += `<a href="#workproduct-${slug(evidence.workProductName)}" style="text-decoration:none;">`;
      html += `<span style="background:#e6f6eb;color:#1e4f28;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;display:inline-block;">${esc(evidence.workProductName)} → ${esc(evidence.lodName)}</span>`;
      html += '</a>';
    });
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  html += '</div>';

  return html;
}

function renderAlphaBlock(alpha: any, childrenMap: Map<string, any[]>, workProducts: any[], activities: any[], depth: number = 0, practiceAlphaNames?: Set<string>, allCitations: Citation[] = []): string {
  const name = String(alpha.name ?? "");
  const description = practiceElementDescriptionForDisplay(alpha) ?? "";
  const narratives = alpha.narratives;
  const states = Array.isArray(alpha.states)
    ? alpha.states.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
    : [];

  const children = childrenMap.get(name) ?? [];
  const marginLeft = depth > 0 ? `${depth * 2}rem` : "0";

  // Check if this alpha is defined in the practice (not from a dependency)
  const isPracticeDefined = !practiceAlphaNames || practiceAlphaNames.has(name.trim());

  // If not practice-defined, render simplified view (just name and description)
  if (!isPracticeDefined) {
    let html = `<div id="alpha-${slug(name)}" style="margin-bottom:1.5rem;margin-left:${marginLeft};${depth > 0 ? 'border-left:3px solid #d2d2d2;' : ''}padding:1.5rem;background:#f5f5f5;border:1px solid #d2d2d2;border-radius:4px;opacity:0.8;">`;

    html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
    html += `<h${depth + 4} style="font-size:${depth === 0 ? '1.25rem' : '1rem'};font-weight:700;margin:0;">${esc(name)}</h${depth + 4}>`;
    html += '<span style="background:#f0f0f0;color:#151515;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">Referenced</span>';
    if (depth > 0) {
      const contributesTo = String(alpha.contributesTo ?? "");
      html += `<a href="#alpha-${slug(contributesTo)}" style="text-decoration:none;">`;
      html += `<span style="background:#f0f0f0;color:#151515;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">Specializes ${esc(contributesTo)}</span>`;
      html += '</a>';
    }
    html += '</div>';

    if (description) {
      html += `<div style="margin-bottom:0;color:#666;">${esc(description)}</div>`;
    }

    html += '</div>';

    // Render children
    if (children.length > 0) {
      children.forEach((child: any) => {
        html += renderAlphaBlock(child, childrenMap, workProducts, activities, depth + 1, practiceAlphaNames, allCitations);
      });
    }

    return html;
  }

  // Practice-defined alpha - render full view
  let html = `<div id="alpha-${slug(name)}" style="margin-bottom:1.5rem;margin-left:${marginLeft};${depth > 0 ? 'border-left:3px solid #d2d2d2;' : ''}padding:1.5rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;">`;

  html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
  html += `<h${depth + 4} style="font-size:${depth === 0 ? '1.25rem' : '1rem'};font-weight:700;margin:0;">${esc(name)}</h${depth + 4}>`;
  if (depth > 0) {
    const contributesTo = String(alpha.contributesTo ?? "");
    html += `<a href="#alpha-${slug(contributesTo)}" style="text-decoration:none;">`;
    html += `<span style="background:#f0f0f0;color:#151515;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">Specializes ${esc(contributesTo)}</span>`;
    html += '</a>';
  }
  html += '</div>';

  if (description) {
    html += `<div style="margin-bottom:1rem;color:#666;">${esc(description)}</div>`;
  }

  html += renderNarratives(narratives, allCitations);

  if (states.length > 0) {
    html += '<h5 style="font-size:1rem;font-weight:700;margin:1.5rem 0 1rem 0;">State Progression</h5>';
    html += '<div style="position:relative;">';
    // Progress line
    html += '<div style="position:absolute;left:1rem;top:2rem;bottom:2rem;width:2px;background:#d2d2d2;"></div>';
    states.forEach((state: any, idx: number) => {
      html += renderStateBlock(state, name, workProducts, activities, idx);
    });
    html += '</div>';
  }

  html += '</div>';

  // Render children
  if (children.length > 0) {
    children.forEach((child: any) => {
      html += renderAlphaBlock(child, childrenMap, workProducts, activities, depth + 1, practiceAlphaNames, allCitations);
    });
  }

  return html;
}

function renderOutlineSection(ctx: RenderContext): string {
  const patterns = Array.isArray(ctx.sourceDoc.patterns) ? ctx.sourceDoc.patterns : [];
  const workProducts = Array.isArray(ctx.sourceDoc.workProducts) ? ctx.sourceDoc.workProducts : [];
  const personas = Array.isArray(ctx.sourceDoc.personas) ? ctx.sourceDoc.personas : [];
  const personaGroups = Array.isArray(ctx.sourceDoc.personaGroups) ? ctx.sourceDoc.personaGroups : [];

  // Sort patterns same as renderLifecycleOrchestration
  const sortedPatterns = patterns.slice().sort((a: any, b: any) => {
    const aIsLifecycle = a.type === "lifecycle" || a.category === "lifecycle" ||
      String(a.name ?? "").toLowerCase().includes("lifecycle");
    const bIsLifecycle = b.type === "lifecycle" || b.category === "lifecycle" ||
      String(b.name ?? "").toLowerCase().includes("lifecycle");
    if (aIsLifecycle && !bIsLifecycle) return -1;
    if (!aIsLifecycle && bIsLifecycle) return 1;
    const aCount = Array.isArray(a.patternViews) ? a.patternViews.length : 0;
    const bCount = Array.isArray(b.patternViews) ? b.patternViews.length : 0;
    return bCount - aCount;
  });

  const hasPatterns = patterns.length > 0;
  const hasAlphas = ctx.grouped.some((g: any) => g.alphas?.length > 0);
  const hasWorkProducts = workProducts.length > 0;
  const hasActivities = ctx.grouped.some((g: any) => g.activitySpaces?.length > 0);
  const hasPeople = personas.length > 0 || personaGroups.length > 0;

  let html = '<section id="outline" style="margin-bottom:3rem;">';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1.5rem;">Report Outline</h2>';
  html += '<div style="padding:1.5rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;">';
  html += '<ul style="margin:0;padding-left:1.5rem;list-style:none;">';

  html += '<li style="margin-bottom:1rem;">';
  html += '<a href="#executive-context" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">1. Executive Context</a>';
  html += '<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Method identity and strategic narratives</div>';
  html += '</li>';

  html += '<li style="margin-bottom:1rem;">';
  html += '<a href="#method-focus" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">2. Method Focus</a>';
  html += '<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Primary focus areas and unaddressed concepts</div>';
  html += '</li>';

  if (hasPatterns) {
    html += '<li style="margin-bottom:1rem;">';
    html += '<a href="#lifecycle-orchestration" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">3. Lifecycle Orchestration</a>';
    html += '<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Temporal phases and chronological roadmap</div>';
    if (sortedPatterns.length > 0) {
      html += '<div style="margin-left:1.5rem;margin-top:0.5rem;">';
      sortedPatterns.forEach((pattern: any) => {
        const patternName = String(pattern.name ?? "Pattern");
        html += `<div style="font-size:0.875rem;margin-bottom:0.25rem;"><a href="#pattern-${slug(patternName)}" style="color:#0066cc;text-decoration:none;">→ ${esc(patternName)}</a></div>`;
      });
      html += '</div>';
    }
    html += '</li>';
  }

  if (hasAlphas) {
    html += '<li style="margin-bottom:1rem;">';
    html += '<a href="#core-concepts" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">4. Core Concepts & Progression</a>';
    html += '<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Areas of concern and sequential states</div>';
    ctx.grouped.forEach((focus: any) => {
      const focusName = String(focus.focusName ?? "");
      const alphas = focus.alphas ?? [];
      if (alphas.length === 0) return;
      html += '<div style="margin-left:1.5rem;margin-top:0.5rem;">';
      html += `<a href="#focus-${slug(focusName)}" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:0.875rem;">→ ${esc(focusName)}</a>`;
      html += `<div style="margin-left:1rem;margin-top:0.25rem;font-size:0.75rem;color:#666;">${alphas.length} alpha${alphas.length !== 1 ? 's' : ''}</div>`;
      html += '</div>';
    });
    html += '</li>';
  }

  if (hasWorkProducts) {
    html += '<li style="margin-bottom:1rem;">';
    html += '<a href="#evidentiary-artifacts" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">5. Evidentiary Artifacts</a>';
    html += `<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Physical deliverables (${workProducts.length} work product${workProducts.length !== 1 ? 's' : ''})</div>`;
    html += '</li>';
  }

  if (hasActivities || hasPeople) {
    html += '<li style="margin-bottom:1rem;">';
    html += '<a href="#execution-roles" style="color:#0066cc;text-decoration:none;font-weight:600;font-size:1rem;">6. Execution & Roles</a>';
    html += '<div style="margin-left:1.5rem;margin-top:0.5rem;font-size:0.875rem;color:#666;">Workflows, competencies, and people</div>';
    html += '</li>';
  }

  html += '</ul>';
  html += '</div>';
  html += '</section>';
  return html;
}

function renderExecutiveContext(ctx: RenderContext): string {
  const name = String(ctx.baseline.name ?? "Unnamed Practice");
  const description = practiceElementDescriptionForDisplay(ctx.baseline) ?? "";
  const version = String(ctx.baseline.version ?? "—");
  const authors = Array.isArray(ctx.baseline.authors)
    ? ctx.baseline.authors.map((a: unknown) => String(a ?? "").trim()).filter(Boolean).join(", ")
    : "—";
  const updatedAt = String(ctx.baseline.updatedAt ?? "—");
  const narratives = Array.isArray(ctx.baseline.narratives) ? ctx.baseline.narratives : [];
  const practices = ctx.methodComposition?.practices ?? [];
  const isMethod = ctx.methodComposition != null;

  let html = '<section id="executive-context" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#0066cc;color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 1 of 5</span>';
  html += '</div>';

  html += `<h1 style="font-size:3rem;font-weight:700;margin-bottom:1rem;">${esc(name)}</h1>`;
  html += `<p style="font-size:1.125rem;color:#666;margin-bottom:2rem;">${esc(description || "No description provided.")}</p>`;

  html += '<div style="padding:1rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:2rem;">';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;">';
  html += '<div>';
  html += '<div style="font-size:0.75rem;color:#666;text-transform:uppercase;margin-bottom:0.25rem;">Version</div>';
  html += `<div style="font-weight:600;">${esc(version)}</div>`;
  html += '</div>';
  html += '<div>';
  html += '<div style="font-size:0.75rem;color:#666;text-transform:uppercase;margin-bottom:0.25rem;">Authors</div>';
  html += `<div style="font-weight:600;">${esc(authors)}</div>`;
  html += '</div>';
  html += '<div>';
  html += '<div style="font-size:0.75rem;color:#666;text-transform:uppercase;margin-bottom:0.25rem;">Updated</div>';
  html += `<div style="font-weight:600;">${esc(updatedAt)}</div>`;
  html += '</div>';
  html += '</div>';
  html += '</div>';

  if (narratives.length > 0) {
    html += '<h2 style="font-size:1.5rem;font-weight:700;margin-top:3rem;margin-bottom:1rem;">Strategic Context</h2>';
    narratives.forEach((narrative: any) => {
      html += renderNarrativeCompact(narrative, ctx.citations);
    });
  }

  // Add citations section
  if (ctx.citations && ctx.citations.length > 0) {
    html += renderCitationsSection(ctx.citations);
  }

  if (practices.length > 0) {
    html += '<h2 style="font-size:1.5rem;font-weight:700;margin-top:3rem;margin-bottom:1rem;">Included Practices</h2>';
    html += `<p style="margin-bottom:1.5rem;color:#666;">This ${isMethod ? 'method' : 'composition'} combines the following practices:</p>`;

    practices.forEach((practice: any) => {
      const practiceName = String(practice.name ?? "Unnamed Practice");
      const practiceDescription = practiceElementDescriptionForDisplay(practice) ?? "";
      const practiceNarratives = Array.isArray(practice.narratives) ? practice.narratives : [];

      html += '<div style="padding:1rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:1.5rem;">';
      html += `<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">${esc(practiceName)}</h3>`;
      if (practiceDescription) {
        html += `<p style="margin-bottom:${practiceNarratives.length > 0 ? '1rem' : '0'};color:#666;">${esc(practiceDescription)}</p>`;
      }
      if (practiceNarratives.length > 0) {
        practiceNarratives.forEach((narrative: any) => {
          html += renderNarrativeCompact(narrative, ctx.citations);
        });
      }
      html += '</div>';
    });
  }

  html += '</section>';
  return html;
}

function renderMethodFocus(ctx: RenderContext): string {
  // Build map of alphas from practice/method that have contributesTo property (these are extension alphas)
  // Check all alphas in grouped (includes alphas from all practices in the composition)
  const extensionAlphasMap = new Map<string, { alpha: any; contributesTo: string }>();
  for (const focus of ctx.grouped) {
    const alphas = focus.alphas ?? [];
    for (const alpha of alphas) {
      const alphaName = String(alpha.name ?? "").trim();
      const contributesTo = String(alpha.contributesTo ?? "").trim();
      if (contributesTo) {
        extensionAlphasMap.set(alphaName, { alpha, contributesTo });
      }
    }
  }

  // Build baseline alpha map for reference (all alphas in the merged baseline, excluding extension alphas)
  const baselineAlphaMap = new Map<string, { alpha: any; focusName: string }>();
  if (ctx.baseline) {
    const baselineGrouped = groupByFocus(ctx.baseline);
    for (const focus of baselineGrouped) {
      const focusName = String(focus.focusName ?? "");
      const alphas = focus.alphas ?? [];
      for (const alpha of alphas) {
        const alphaName = String(alpha.name ?? "");
        // Only add to baselineAlphaMap if it's NOT an extension alpha
        if (!extensionAlphasMap.has(alphaName)) {
          baselineAlphaMap.set(alphaName, { alpha, focusName });
        }
      }
    }
  }

  // Calculate alpha scores for baseline alphas based on method/practice contributions
  const alphaScores = new Map<string, { alpha: any; focusName: string; score: number; extensionAlphas: Array<{ alpha: any; score: number }> }>();

  const workProducts = Array.isArray(ctx.sourceDoc.workProducts) ? ctx.sourceDoc.workProducts : [];

  // Get all activities from grouped structure
  const activities: any[] = [];
  for (const focus of ctx.grouped) {
    const activitySpaces = focus.activitySpaces ?? [];
    for (const space of activitySpaces) {
      const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
      activities.push(...spaceActivities);
    }
  }

  // Initialize scores for all baseline alphas
  for (const [alphaName, { alpha, focusName }] of baselineAlphaMap) {
    alphaScores.set(alphaName, { alpha, focusName, score: 0, extensionAlphas: [] });
  }

  // Calculate scores for each alpha in the practice/method
  for (const focus of ctx.grouped) {
    const focusName = String(focus.focusName ?? "");
    const alphas = focus.alphas ?? [];

    for (const alpha of alphas) {
      const alphaName = String(alpha.name ?? "");
      const isExtensionAlpha = extensionAlphasMap.has(alphaName);
      const isBaselineAlpha = baselineAlphaMap.has(alphaName);
      let score = 0;

      // +1 for each narrative on the alpha (from method/practice, not baseline)
      const narratives = Array.isArray(alpha.narratives) ? alpha.narratives : [];
      score += narratives.length;

      // +1 for each checklist in the alpha's states (from method/practice, not baseline)
      const states = Array.isArray(alpha.states) ? alpha.states : [];
      for (const state of states) {
        const checklist = Array.isArray(state.checklist) ? state.checklist : [];
        if (checklist.length > 0) {
          score += 1;
        }
      }

      // +1 for each work product that contributes to this alpha (or its states)
      for (const wp of workProducts) {
        const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
        for (const lod of lods) {
          const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];
          const contributesToThisAlpha = contributesTo.some((contrib: any) => {
            const contribAlphaName = String(contrib.alphaName ?? "");
            return contribAlphaName === alphaName;
          });
          if (contributesToThisAlpha) {
            score += 1;
            break; // Only count once per work product
          }
        }
      }

      // +1 for each activity that contributes to this alpha (or its states)
      for (const activity of activities) {
        const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
        const contributesToThisAlpha = contributesTo.some((contrib: any) => {
          const contribAlphaName = String(contrib.alphaName ?? "");
          return contribAlphaName === alphaName;
        });
        if (contributesToThisAlpha) {
          score += 1;
          break; // Only count once per activity
        }
      }

      if (isExtensionAlpha) {
        // This is an extension alpha that contributes to a baseline alpha
        const extensionAlphaInfo = extensionAlphasMap.get(alphaName);
        const parentAlphaName = extensionAlphaInfo?.contributesTo ?? "";
        if (parentAlphaName && alphaScores.has(parentAlphaName)) {
          const parentEntry = alphaScores.get(parentAlphaName);
          if (parentEntry) {
            parentEntry.extensionAlphas.push({ alpha, score });
            parentEntry.score += score; // Add extension alpha score to parent
          }
        }
      } else if (isBaselineAlpha) {
        // Add baseline alpha's direct score to any existing score from extension alphas
        const existing = alphaScores.get(alphaName);
        if (existing) {
          existing.score += score;
        }
      }
    }
  }

  // Group baseline alphas by focus for display
  const alphasByFocus = new Map<string, { focusObj: any; alphas: Array<{ alpha: any; score: number; extensionAlphas: Array<{ alpha: any; score: number }> }> }>();

  // First, create a map of focus names to focus objects from grouped
  const focusMap = new Map<string, any>();
  for (const groupedFocus of ctx.grouped) {
    const focusName = String(groupedFocus.focusName ?? "");
    if (!focusMap.has(focusName)) {
      // groupedFocus.focus is the actual focus object with description
      focusMap.set(focusName, groupedFocus.focus);
    }
  }

  alphaScores.forEach(({ alpha, focusName, score, extensionAlphas }) => {
    if (!alphasByFocus.has(focusName)) {
      alphasByFocus.set(focusName, {
        focusObj: focusMap.get(focusName) || null,
        alphas: []
      });
    }
    alphasByFocus.get(focusName)!.alphas.push({ alpha, score, extensionAlphas });
  });

  if (alphasByFocus.size === 0) {
    return "";
  }

  // Helper function to get color style based on score
  function getColorStyle(score: number): { backgroundColor: string; borderColor: string; color: string; opacity?: string } {
    if (score === 0) {
      return {
        backgroundColor: "#F5F5F5",
        borderColor: "#D2D2D2",
        color: "#8C8C8C",
        opacity: "0.6",
      };
    } else if (score <= 2) {
      return {
        backgroundColor: "#E7F1FA",
        borderColor: "#73BCF7",
        color: "#004368",
      };
    } else if (score <= 5) {
      return {
        backgroundColor: "#BEE1F4",
        borderColor: "#2B9AF3",
        color: "#002952",
      };
    } else {
      return {
        backgroundColor: "#73BCF7",
        borderColor: "#06C",
        color: "#FFFFFF",
      };
    }
  }

  const isMethod = ctx.methodComposition != null;

  let html = '<section id="method-focus" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#4caf50;color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 2 of 6</span>';
  html += '</div>';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;">Method Focus</h2>';
  html += `<p style="margin-bottom:2rem;color:#666;">Where this ${isMethod ? 'method' : 'practice'} focuses its guidance and which areas it does not address.</p>`;

  // Tile-based Coverage Overview
  html += '<div style="padding:1.5rem;background:#fff;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:3rem;">';

  Array.from(alphasByFocus.entries()).forEach(([focusName, { focusObj, alphas }], idx) => {
    const focusDescription = focusObj ? (practiceElementDescriptionForDisplay(focusObj) ?? "") : "";
    html += `<div style="margin-bottom:${idx < alphasByFocus.size - 1 ? '1.5rem' : '0'};">`;
    html += '<div style="color:#151515;margin-bottom:0.5rem;line-height:1.4;">';
    html += `<span style="font-size:0.75rem;font-weight:700;">${esc(focusName)}:</span>`;
    if (focusDescription) {
      html += ` <span style="font-size:0.6875rem;font-weight:400;font-style:italic;">${esc(focusDescription)}</span>`;
    }
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:0.75rem;">';

    alphas.forEach(({ alpha, score, extensionAlphas }) => {
      const alphaName = String(alpha.name ?? "");
      const description = practiceElementDescriptionForDisplay(alpha) ?? "";
      const colorStyle = getColorStyle(score);
      const hasExtensionAlphas = extensionAlphas.length > 0;

      html += '<div style="display:flex;flex-direction:column;gap:0.375rem;">';

      // Main baseline alpha tile
      const opacityStyle = colorStyle.opacity ? `opacity:${colorStyle.opacity};` : '';
      html += `<a href="#alpha-${slug(alphaName)}" style="background-color:${colorStyle.backgroundColor};border:3px solid ${colorStyle.borderColor};color:${colorStyle.color};${opacityStyle}border-radius:4px;padding:0.75rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:65px;text-decoration:none;position:relative;" title="${esc(alphaName + (description ? '\n' + description : '') + '\nScore: ' + score + (hasExtensionAlphas ? '\n+ ' + extensionAlphas.length + ' contributing alpha(s)' : ''))}">`;

      // Baseline indicator badge
      html += '<div style="position:absolute;top:3px;left:3px;background-color:#F0AB00;color:white;font-size:0.5rem;font-weight:700;padding:2px 4px;border-radius:3px;line-height:1;">';
      html += 'BASE';
      html += '</div>';

      html += '<div style="font-size:0.75rem;font-weight:600;line-height:1.3;letter-spacing:0.1px;">';
      html += esc(alphaName);
      html += '</div>';
      html += '</a>';

      // Extension contributing alphas below with connecting line
      if (hasExtensionAlphas) {
        html += '<div style="display:flex;flex-direction:column;gap:0.375rem;padding-left:0.75rem;border-left:2px dashed #d2d2d2;">';

        extensionAlphas.forEach((extensionAlpha) => {
          const extensionAlphaName = String(extensionAlpha.alpha.name ?? "");
          const extensionColorStyle = getColorStyle(extensionAlpha.score);
          const extensionDescription = practiceElementDescriptionForDisplay(extensionAlpha.alpha) ?? "";
          const extOpacityStyle = extensionColorStyle.opacity ? `opacity:${extensionColorStyle.opacity};` : '';

          html += '<div style="position:relative;">';

          // Connecting line to parent
          html += '<div style="position:absolute;left:-0.75rem;top:50%;width:0.75rem;height:2px;background-color:#d2d2d2;"></div>';

          html += `<a href="#alpha-${slug(extensionAlphaName)}" style="background-color:${extensionColorStyle.backgroundColor};border:2px solid ${extensionColorStyle.borderColor};color:${extensionColorStyle.color};${extOpacityStyle}border-radius:4px;padding:0.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;text-decoration:none;position:relative;min-height:40px;" title="${esc(extensionAlphaName + (extensionDescription ? '\n' + extensionDescription : '') + '\nContributes to: ' + alphaName + '\nScore: ' + extensionAlpha.score)}">`;

          // Extension alpha indicator
          html += '<div style="position:absolute;top:3px;left:3px;background-color:#A18FFF;color:white;font-size:0.5rem;font-weight:700;padding:2px 4px;border-radius:3px;line-height:1;">';
          html += 'EXT';
          html += '</div>';

          html += '<div style="font-size:0.6875rem;font-weight:600;line-height:1.3;letter-spacing:0.1px;padding-top:0.75rem;">';
          html += esc(extensionAlphaName);
          html += '</div>';
          html += '</a>';
          html += '</div>';
        });

        html += '</div>';
      }

      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
  });

  // Legend
  html += '<div style="border-top:1px solid #d2d2d2;margin-top:1.5rem;padding-top:1rem;"></div>';
  html += '<div style="display:flex;gap:2rem;font-size:0.75rem;color:#666;flex-wrap:wrap;">';

  // Alpha Type Legend
  html += '<div style="display:flex;align-items:center;gap:1rem;">';
  html += '<div style="font-weight:600;color:#151515;">Alpha Type:</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="background-color:#F0AB00;color:white;font-size:0.625rem;font-weight:700;padding:2px 6px;border-radius:3px;">BASE</div>';
  html += '<span>Baseline</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="background-color:#A18FFF;color:white;font-size:0.625rem;font-weight:700;padding:2px 6px;border-radius:3px;">EXT</div>';
  html += '<span>Extension</span>';
  html += '</div>';
  html += '</div>';

  html += '<div style="width:1px;height:auto;background:#d2d2d2;"></div>';

  // Coverage Level Legend
  html += '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">';
  html += '<div style="font-weight:600;color:#151515;">Coverage:</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="width:20px;height:20px;background-color:#F5F5F5;border:2px solid #D2D2D2;border-radius:4px;opacity:0.6;"></div>';
  html += '<span>None</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="width:20px;height:20px;background-color:#E7F1FA;border:2px solid #73BCF7;border-radius:4px;"></div>';
  html += '<span>Light (1-2)</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="width:20px;height:20px;background-color:#BEE1F4;border:2px solid #2B9AF3;border-radius:4px;"></div>';
  html += '<span>Medium (3-5)</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
  html += '<div style="width:20px;height:20px;background-color:#73BCF7;border:2px solid #06C;border-radius:4px;"></div>';
  html += '<span>Strong (6+)</span>';
  html += '</div>';
  html += '</div>';

  html += '</div>';
  html += '</div>';

  html += '</section>';
  return html;
}

function renderLifecycleOrchestration(ctx: RenderContext): string {
  const patterns = Array.isArray(ctx.sourceDoc.patterns) ? ctx.sourceDoc.patterns : [];

  if (patterns.length === 0) return "";

  // Sort patterns: lifecycle first, then non-lifecycle, then by patternViews count descending
  const sortedPatterns = patterns.slice().sort((a: any, b: any) => {
    // Check if pattern is lifecycle (check type, category, or name)
    const aIsLifecycle = a.type === "lifecycle" || a.category === "lifecycle" ||
      String(a.name ?? "").toLowerCase().includes("lifecycle");
    const bIsLifecycle = b.type === "lifecycle" || b.category === "lifecycle" ||
      String(b.name ?? "").toLowerCase().includes("lifecycle");

    // Lifecycle patterns come first
    if (aIsLifecycle && !bIsLifecycle) return -1;
    if (!aIsLifecycle && bIsLifecycle) return 1;

    // Then sort by patternViews count descending
    const aCount = Array.isArray(a.patternViews) ? a.patternViews.length : 0;
    const bCount = Array.isArray(b.patternViews) ? b.patternViews.length : 0;
    return bCount - aCount;
  });

  let html = '<section id="lifecycle-orchestration" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#9c27b0;color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 3 of 6</span>';
  html += '</div>';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;">Lifecycle Orchestration</h2>';
  html += '<p style="margin-bottom:2rem;color:#666;">Temporal phases providing a chronological roadmap for methodology execution.</p>';

  sortedPatterns.forEach((pattern: any) => {
    const name = String(pattern.name ?? "Pattern");
    const description = practiceElementDescriptionForDisplay(pattern) ?? "";
    const narratives = pattern.narratives;
    const patternViews = Array.isArray(pattern.patternViews)
      ? pattern.patternViews.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
      : [];

    html += `<div id="pattern-${slug(name)}" style="margin-bottom:2rem;padding:1.5rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;">`;
    html += `<h3 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">${esc(name)}</h3>`;
    if (description) {
      html += `<p style="margin-bottom:1rem;color:#666;">${esc(description)}</p>`;
    }
    html += renderNarratives(narratives, ctx.citations);

    // Add Kanban visualization if pattern has views
    if (patternViews.length > 0) {
      const kanban = svgKanbanPattern({
        pattern,
        baseline: ctx.baseline,
        theme: ctx.theme,
      });
      if (kanban) {
        html += kanban;
      }
      html += '<h4 style="font-size:1rem;font-weight:700;margin:1.5rem 0 1rem 0;">Phases</h4>';
      patternViews.forEach((view: any) => {
        const viewName = String(view.name ?? "Phase");
        const viewDesc = practiceElementDescriptionForDisplay(view) ?? "";
        const seq = view.seq !== undefined ? `${view.seq}` : "";
        const alphaStates = Array.isArray(view.alphaStates) ? view.alphaStates : [];
        const activities = Array.isArray(view.activities) ? view.activities : [];
        const narrativeContexts = Array.isArray(view.narrativeContexts) ? view.narrativeContexts : [];

        html += '<div style="padding:1.5rem;border:1px solid #d2d2d2;border-left:4px solid #0066cc;border-radius:4px;background:#fff;margin-bottom:1rem;">';
        html += '<div style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.5rem;">';
        if (seq) {
          html += `<span style="font-size:0.75rem;font-weight:600;color:#666;text-transform:uppercase;">Phase ${esc(seq)}</span>`;
        }
        html += `<h5 style="font-size:1rem;font-weight:700;margin:0;">${esc(viewName)}</h5>`;
        html += '</div>';

        if (viewDesc) {
          html += `<p style="margin-bottom:1rem;font-size:0.875rem;color:#666;">${esc(viewDesc)}</p>`;
        }

        if (narrativeContexts.length > 0) {
          html += '<div style="margin-bottom:1rem;padding:0.75rem;background:#f0f7ff;border-left:3px solid #0066cc;border-radius:4px;">';
          html += '<div style="font-size:0.875rem;">';
          narrativeContexts
            .slice()
            .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
            .forEach((ctx: any, idx: number) => {
              const text = narrativeContextRowDisplayText(ctx);
              if (text) {
                html += `<div style="display:flex;margin-bottom:${idx < narrativeContexts.length - 1 ? "0.5rem" : "0"};">`;
                html += `<div style="min-width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;background:#0066cc;color:white;border-radius:50%;font-size:0.75rem;font-weight:600;margin-right:0.5rem;flex-shrink:0;">${ctx.seq ?? idx + 1}</div>`;
                html += `<div style="flex:1;">${esc(text)}</div>`;
                html += '</div>';
              }
            });
          html += '</div>';
          html += '</div>';
        }

        if (alphaStates.length > 0) {
          html += '<div style="margin-bottom:1rem;">';
          html += '<div style="font-size:0.75rem;font-weight:600;color:#666;margin-bottom:0.5rem;text-transform:uppercase;">Target States</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">';
          alphaStates.forEach((state: any) => {
            const alphaName = String(state.alphaName ?? "");
            const stateName = String(state.stateName ?? "");
            html += `<a href="#alpha-${slug(alphaName)}" style="text-decoration:none;">`;
            html += `<span style="background:#e7f1fa;color:#0066cc;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(alphaName)} → ${esc(stateName)}</span>`;
            html += '</a>';
          });
          html += '</div>';
          html += '</div>';
        }

        if (activities.length > 0) {
          html += '<div>';
          html += '<div style="font-size:0.75rem;font-weight:600;color:#666;margin-bottom:0.5rem;text-transform:uppercase;">Activities</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">';
          activities.forEach((activity: any) => {
            const activityName = String(activity ?? "");
            html += `<a href="#activity-${slug(activityName)}" style="text-decoration:none;">`;
            html += `<span style="background:#e6f6eb;color:#1e4f28;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(activityName)}</span>`;
            html += '</a>';
          });
          html += '</div>';
          html += '</div>';
        }

        html += '</div>';
      });
    }

    html += '</div>';
  });

  html += '</section>';
  return html;
}

function renderCoreConceptsSection(ctx: RenderContext): string {
  const workProducts = Array.isArray(ctx.sourceDoc.workProducts) ? ctx.sourceDoc.workProducts : [];

  // Extract all activities from all activitySpaces across all focuses
  const activities: any[] = [];
  for (const focus of ctx.grouped) {
    const activitySpaces = focus.activitySpaces ?? [];
    for (const space of activitySpaces) {
      const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
      activities.push(...spaceActivities);
    }
  }

  // Build a set of alpha names from the original practice document or method's practices
  const practiceAlphaNames = new Set<string>();

  if (ctx.methodComposition) {
    // For methods, collect alphas from all the method's extension practices (not the baseline)
    const practices = Array.isArray(ctx.methodComposition.practices) ? ctx.methodComposition.practices : [];
    for (const practice of practices) {
      const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];
      for (const alpha of alphas) {
        const name = String(alpha.name ?? "").trim();
        if (name) practiceAlphaNames.add(name);
      }
    }
  } else {
    // For standalone practices, use the practice's own alphas
    const alphas = Array.isArray(ctx.originalDoc.alphas) ? ctx.originalDoc.alphas : [];
    for (const alpha of alphas) {
      const name = String(alpha.name ?? "").trim();
      if (name) practiceAlphaNames.add(name);
    }
  }

  let html = '<section id="core-concepts" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#ff8c00;color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 4 of 6</span>';
  html += '</div>';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;">Core Concepts & Progression</h2>';
  html += '<p style="margin-bottom:2rem;color:#666;">Abstract areas of concern and their sequential states of maturity.</p>';

  ctx.grouped.forEach((focus: any) => {
    const focusName = String(focus.focusName ?? "");
    const alphas = focus.alphas ?? [];

    if (alphas.length === 0) return;

    const { roots, childrenMap } = buildAlphaHierarchy(alphas);

    html += `<div id="focus-${slug(focusName)}" style="margin-bottom:3rem;">`;
    html += `<h3 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem;color:#0066cc;">${esc(focusName)}</h3>`;

    roots.forEach((alpha: any) => {
      html += renderAlphaBlock(alpha, childrenMap, workProducts, activities, 0, practiceAlphaNames, ctx.citations || []);
    });

    html += '</div>';
  });

  html += '</section>';
  return html;
}

function renderWorkProductsSection(ctx: RenderContext): string {
  const workProducts = Array.isArray(ctx.sourceDoc.workProducts) ? ctx.sourceDoc.workProducts : [];

  if (workProducts.length === 0) return "";

  let html = '<section id="evidentiary-artifacts" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#008b8b;color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 5 of 6</span>';
  html += '</div>';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;">Evidentiary Artifacts</h2>';
  html += '<p style="margin-bottom:2rem;color:#666;">Physical deliverables that prove the maturation of core concepts.</p>';

  workProducts.forEach((wp: any) => {
    const name = String(wp.name ?? "");
    const description = practiceElementDescriptionForDisplay(wp) ?? "";
    const narratives = wp.narratives;
    const lods = Array.isArray(wp.levelsOfDetail)
      ? wp.levelsOfDetail.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
      : [];

    html += `<div id="workproduct-${slug(name)}" style="margin-bottom:1.5rem;padding:1.5rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;">`;
    html += `<h4 style="font-size:1.25rem;font-weight:700;margin:0 0 0.5rem 0;">${esc(name)}</h4>`;

    if (description) {
      html += `<div style="margin-bottom:1rem;color:#666;">${esc(description)}</div>`;
    }

    html += renderNarratives(narratives, ctx.citations);

    if (lods.length > 0) {
      html += '<h5 style="font-size:1rem;font-weight:700;margin:1.5rem 0 1rem 0;">Levels of Detail</h5>';
      lods.forEach((lod: any) => {
        const lodName = String(lod.name ?? "");
        const lodDesc = practiceElementDescriptionForDisplay(lod) ?? "";
        const checklist = Array.isArray(lod.checklist)
          ? lod.checklist.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
          : [];
        const contributesTo = Array.isArray(lod.contributesTo) ? lod.contributesTo : [];

        html += '<div style="padding:1rem;border:1px solid #d2d2d2;border-radius:4px;background:#fff;margin-bottom:1rem;">';
        html += `<div style="font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;">${esc(lodName)}</div>`;

        if (lodDesc) {
          html += `<div style="margin-bottom:1rem;font-size:0.875rem;color:#666;">${esc(lodDesc)}</div>`;
        }

        if (contributesTo.length > 0) {
          html += `<div style="margin-bottom:${checklist.length > 0 ? "1rem" : "0"};">`;
          html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#6a6e73;">Provides Evidence For</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">';
          contributesTo.forEach((contrib: any) => {
            const alphaName = String(contrib.alphaName ?? "");
            const stateName = String(contrib.stateName ?? "");
            html += `<a href="#alpha-${slug(alphaName)}" style="text-decoration:none;">`;
            html += `<span style="background:#e7f1fa;color:#0066cc;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(alphaName)} → ${esc(stateName)}</span>`;
            html += '</a>';
          });
          html += '</div>';
          html += '</div>';
        }

        if (checklist.length > 0) {
          html += '<div>';
          html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#6a6e73;">Criteria</div>';
          html += '<ul style="margin:0;padding-left:1.5rem;list-style:none;">';
          checklist.forEach((item: any) => {
            const itemName = String(item.name ?? "");
            const itemDesc = practiceElementDescriptionForDisplay(item) ?? "";
            html += '<li style="margin-bottom:0.25rem;font-size:0.875rem;">';
            html += '<div style="display:flex;align-items:flex-start;">';
            html += '<span style="color:#0066cc;margin-right:0.5rem;">✓</span>';
            html += `<div><strong>${esc(itemName)}:</strong> ${esc(itemDesc)}</div>`;
            html += '</div>';
            html += '</li>';
          });
          html += '</ul>';
          html += '</div>';
        }

        html += '</div>';
      });
    }

    html += '</div>';
  });

  html += '</section>';
  return html;
}

function renderExecutionAndRoles(ctx: RenderContext): string {
  const personas = Array.isArray(ctx.sourceDoc.personas) ? ctx.sourceDoc.personas : [];
  const personaGroups = Array.isArray(ctx.sourceDoc.personaGroups) ? ctx.sourceDoc.personaGroups : [];
  const competencies = Array.isArray(ctx.sourceDoc.competencies) ? ctx.sourceDoc.competencies : [];
  const hasActivities = ctx.grouped.some((g: any) => g.activitySpaces?.length > 0);

  if (!hasActivities && personas.length === 0 && personaGroups.length === 0) {
    return "";
  }

  // Build a set of activity space names from the original practice document or method's practices
  const practiceActivitySpaceNames = new Set<string>();

  if (ctx.methodComposition) {
    // For methods, collect activity spaces from all the method's extension practices (not the baseline)
    const practices = Array.isArray(ctx.methodComposition.practices) ? ctx.methodComposition.practices : [];
    for (const practice of practices) {
      const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
      for (const space of activitySpaces) {
        const name = String(space.name ?? "").trim();
        if (name) practiceActivitySpaceNames.add(name);
      }
    }
  } else {
    // For standalone practices, use the practice's own activity spaces
    const activitySpaces = Array.isArray(ctx.originalDoc.activitySpaces) ? ctx.originalDoc.activitySpaces : [];
    for (const space of activitySpaces) {
      const name = String(space.name ?? "").trim();
      if (name) practiceActivitySpaceNames.add(name);
    }
  }

  let html = '<section id="execution-roles" style="page-break-before:always;margin-bottom:3rem;">';
  html += '<div style="margin-bottom:1.5rem;">';
  html += '<span style="background:#ffc107;color:#151515;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">Part 6 of 6</span>';
  html += '</div>';
  html += '<h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;">Execution & Roles</h2>';
  html += '<p style="margin-bottom:2rem;color:#666;">Specific workflows, who executes them, and the competencies required.</p>';

  // Activities
  if (hasActivities) {
    html += '<h3 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem;">Activities</h3>';
    ctx.grouped.forEach((focus: any) => {
      const activitySpaces = focus.activitySpaces ?? [];
      if (activitySpaces.length === 0) return;

      const focusName = String(focus.focusName ?? "");
      html += `<div id="activities-${slug(focusName)}" style="margin-bottom:2rem;">`;
      html += `<h4 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;color:#0066cc;">${esc(focusName)}</h4>`;

      activitySpaces.forEach((space: any) => {
        const spaceName = String(space.name ?? "");
        const spaceDesc = practiceElementDescriptionForDisplay(space) ?? "";
        const spaceNarratives = space.narratives;
        const activities = Array.isArray(space.activities) ? space.activities : [];

        // Check if this activity space is defined in the practice (not from a dependency)
        const isPracticeDefined = practiceActivitySpaceNames.has(spaceName.trim());
        const hasActivities = activities.length > 0;

        // If not practice-defined AND has no activities, render simplified view (just name and description)
        if (!isPracticeDefined && !hasActivities) {
          html += '<div style="margin-bottom:1rem;padding:1.5rem;background:#f5f5f5;border:1px solid #d2d2d2;border-radius:4px;opacity:0.8;">';
          html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
          html += `<h5 style="font-size:1rem;font-weight:700;margin:0;">${esc(spaceName)}</h5>`;
          html += '<span style="background:#f0f0f0;color:#151515;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">Referenced</span>';
          html += '</div>';
          if (spaceDesc) {
            html += `<p style="margin-bottom:0;font-size:0.875rem;color:#666;">${esc(spaceDesc)}</p>`;
          }
          html += '</div>';
          return;
        }

        // Practice-defined OR has activities - render full view
        html += '<div style="margin-bottom:1rem;padding:1.5rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;">';
        html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
        html += `<h5 style="font-size:1rem;font-weight:700;margin:0;">${esc(spaceName)}</h5>`;
        if (!isPracticeDefined && hasActivities) {
          html += '<span style="background:#f0f0f0;color:#151515;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">Referenced (with activities)</span>';
        }
        html += '</div>';
        if (spaceDesc) {
          html += `<p style="margin-bottom:1rem;font-size:0.875rem;color:#666;">${esc(spaceDesc)}</p>`;
        }
        html += renderNarratives(spaceNarratives, ctx.citations);

        if (activities.length > 0) {
          activities.forEach((activity: any) => {
            const actName = String(activity.name ?? "");
            const actDesc = practiceElementDescriptionForDisplay(activity) ?? "";
            const actNarratives = activity.narratives;
            const worksOn = Array.isArray(activity.worksOn) ? activity.worksOn : [];
            const requiredCompetencies = Array.isArray(activity.requiredCompetencies) ? activity.requiredCompetencies : [];
            const recommendedCompetencyLevels = Array.isArray(activity.recommendedCompetencyLevels) ? activity.recommendedCompetencyLevels : [];
            const involves = Array.isArray(activity.involves) ? activity.involves : [];
            const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

            html += `<div id="activity-${slug(actName)}" style="padding:0.75rem;border:1px solid #d2d2d2;border-radius:4px;background:#fff;margin-top:0.75rem;">`;
            html += `<div style="font-weight:600;font-size:0.875rem;margin-bottom:0.25rem;">${esc(actName)}</div>`;
            if (actDesc) {
              html += `<p style="font-size:0.75rem;margin-bottom:0.5rem;color:#666;">${esc(actDesc)}</p>`;
            }
            html += renderNarratives(actNarratives, ctx.citations);

            if (worksOn.length > 0) {
              html += '<div style="margin-top:0.75rem;">';
              html += '<div style="font-size:0.625rem;font-weight:600;margin-bottom:0.25rem;text-transform:uppercase;color:#666;">Works On</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
              worksOn.forEach((wp: any) => {
                const wpName = String(wp.workProductName ?? "");
                const lodName = String(wp.levelOfDetailName ?? "");
                html += `<a href="#workproduct-${slug(wpName)}" style="text-decoration:none;">`;
                html += `<span style="background:#e6f6eb;color:#1e4f28;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(wpName)}${lodName ? ` → ${esc(lodName)}` : ""}</span>`;
                html += '</a>';
              });
              html += '</div>';
              html += '</div>';
            }

            if (requiredCompetencies.length > 0) {
              html += '<div style="margin-top:0.75rem;">';
              html += '<div style="font-size:0.625rem;font-weight:600;margin-bottom:0.25rem;text-transform:uppercase;color:#666;">Required Competencies</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
              requiredCompetencies.forEach((comp: any) => {
                const compName = String(comp ?? "");
                html += `<a href="#competency-${slug(compName)}" style="text-decoration:none;">`;
                html += `<span style="background:#e1bee7;color:#4a148c;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(compName)}</span>`;
                html += '</a>';
              });
              html += '</div>';
              html += '</div>';
            }

            if (recommendedCompetencyLevels.length > 0) {
              html += '<div style="margin-top:0.75rem;">';
              html += '<div style="font-size:0.625rem;font-weight:600;margin-bottom:0.25rem;text-transform:uppercase;color:#666;">Recommended Competency Levels</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
              recommendedCompetencyLevels.forEach((comp: any) => {
                const compName = String(comp.competencyName ?? "");
                const levelName = String(comp.competencyLevelName ?? "");
                html += `<a href="#competency-${slug(compName)}" style="text-decoration:none;">`;
                html += `<span style="background:#e1bee7;color:#4a148c;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(compName)}${levelName ? ` → ${esc(levelName)}` : ""}</span>`;
                html += '</a>';
              });
              html += '</div>';
              html += '</div>';
            }

            if (involves.length > 0) {
              html += '<div style="margin-top:0.75rem;">';
              html += '<div style="font-size:0.625rem;font-weight:600;margin-bottom:0.25rem;text-transform:uppercase;color:#666;">Involves</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
              involves.forEach((pg: any) => {
                const pgName = String(pg ?? "");
                html += `<a href="#personagroup-${slug(pgName)}" style="text-decoration:none;">`;
                html += `<span style="background:#e7f1fa;color:#0066cc;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(pgName)}</span>`;
                html += '</a>';
              });
              html += '</div>';
              html += '</div>';
            }

            if (contributesTo.length > 0) {
              html += '<div style="margin-top:0.75rem;">';
              html += '<div style="font-size:0.625rem;font-weight:600;margin-bottom:0.25rem;text-transform:uppercase;color:#666;">Contributes To</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
              contributesTo.forEach((target: any) => {
                const alphaName = String(target.alphaName ?? "");
                const stateName = String(target.stateName ?? "");
                html += `<a href="#alpha-${slug(alphaName)}" style="text-decoration:none;">`;
                html += `<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(alphaName)} → ${esc(stateName)}</span>`;
                html += '</a>';
              });
              html += '</div>';
              html += '</div>';
            }

            html += '</div>';
          });
        }

        html += '</div>';
      });

      html += '</div>';
    });
  }

  // Personas
  if (personas.length > 0) {
    html += '<h3 id="personas-section" style="font-size:1.5rem;font-weight:700;margin:3rem 0 1.5rem 0;">Personas</h3>';
    personas.forEach((persona: any) => {
      const name = String(persona.name ?? "");
      const description = practiceElementDescriptionForDisplay(persona) ?? "";
      const narratives = persona.narratives;
      const personaCompetencies = Array.isArray(persona.competencies) ? persona.competencies : [];

      html += `<div id="persona-${slug(name)}" style="padding:1rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:1rem;">`;
      html += `<h5 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">${esc(name)}</h5>`;
      if (description) {
        html += `<p style="font-size:0.875rem;margin-bottom:0.75rem;color:#666;">${esc(description)}</p>`;
      }
      html += renderNarratives(narratives, ctx.citations);
      if (personaCompetencies.length > 0) {
        html += '<div style="margin-top:0.75rem;">';
        html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#666;">Required Competencies</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
        personaCompetencies.forEach((comp: any) => {
          const compName = String(comp.competencyName ?? "");
          const levelName = String(comp.competencyLevelName ?? "");
          html += `<a href="#competency-${slug(compName)}" style="text-decoration:none;">`;
          html += `<span style="background:#e1bee7;color:#4a148c;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(compName)}${levelName ? ` (${esc(levelName)})` : ""}</span>`;
          html += '</a>';
        });
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
  }

  // Persona Groups
  if (personaGroups.length > 0) {
    html += '<h3 style="font-size:1.5rem;font-weight:700;margin:3rem 0 1.5rem 0;">Persona Groups</h3>';
    personaGroups.forEach((group: any) => {
      const name = String(group.name ?? "");
      const description = practiceElementDescriptionForDisplay(group) ?? "";
      const narratives = group.narratives;
      const personaNames = Array.isArray(group.personaNames) ? group.personaNames : [];

      html += `<div id="personagroup-${slug(name)}" style="padding:1rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:1rem;">`;
      html += `<h5 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">${esc(name)}</h5>`;
      if (description) {
        html += `<p style="font-size:0.875rem;margin-bottom:0.75rem;color:#666;">${esc(description)}</p>`;
      }
      html += renderNarratives(narratives, ctx.citations);
      if (personaNames.length > 0) {
        html += '<div style="margin-top:0.75rem;">';
        html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#666;">Members</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">';
        personaNames.forEach((pname: any) => {
          const personaName = String(pname ?? "");
          html += `<a href="#persona-${slug(personaName)}" style="text-decoration:none;">`;
          html += `<span style="background:#e7f1fa;color:#0066cc;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${esc(personaName)}</span>`;
          html += '</a>';
        });
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
  }

  // Competencies
  if (competencies.length > 0) {
    html += '<h3 style="font-size:1.5rem;font-weight:700;margin:3rem 0 1.5rem 0;">Competencies</h3>';
    competencies.forEach((competency: any) => {
      const name = String(competency.name ?? "");
      const description = practiceElementDescriptionForDisplay(competency) ?? "";
      const narratives = competency.narratives;
      const levels = Array.isArray(competency.levels)
        ? competency.levels.slice().sort((a: any, b: any) => (a.level ?? 0) - (b.level ?? 0))
        : [];

      html += `<div id="competency-${slug(name)}" style="padding:1rem;background:#fafafa;border:1px solid #d2d2d2;border-radius:4px;margin-bottom:1rem;">`;
      html += `<h5 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">${esc(name)}</h5>`;
      if (description) {
        html += `<p style="font-size:0.875rem;margin-bottom:0.75rem;color:#666;">${esc(description)}</p>`;
      }
      html += renderNarratives(narratives, ctx.citations);
      if (levels.length > 0) {
        html += '<div style="margin-top:0.75rem;">';
        html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;text-transform:uppercase;color:#666;">Levels</div>';
        html += '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
        levels.forEach((level: any, idx: number) => {
          const levelName = String(level.name ?? "");
          const levelNum = level.level ?? idx + 1;
          const levelDesc = practiceElementDescriptionForDisplay(level) ?? "";
          html += `<div style="font-size:0.75rem;"><strong>Level ${levelNum} - ${esc(levelName)}:</strong> ${esc(levelDesc)}</div>`;
        });
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
  }

  html += '</section>';
  return html;
}

export function renderBrowsePdfHtml(ctx: RenderContext): string {
  const name = String(ctx.baseline.name ?? "Unnamed Practice");
  const version = String(ctx.baseline.version ?? "—");
  const authors = Array.isArray(ctx.baseline.authors)
    ? ctx.baseline.authors.map((a: unknown) => String(a ?? "").trim()).filter(Boolean).join(", ")
    : "—";
  const updatedAt = String(ctx.baseline.updatedAt ?? "—");

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(name)}</title>
  <style>
    @page {
      size: A4;
      margin: 1cm;
      @top-center {
        content: "${esc(name)}";
        font-family: "Red Hat Text", Arial, sans-serif;
        font-size: 10pt;
        color: #666;
        border-bottom: 1px solid #d2d2d2;
        padding-bottom: 0.5cm;
      }
      @bottom-center {
        content: "Version: ${esc(version)} | Authors: ${esc(authors)} | Updated: ${esc(updatedAt)} | Page " counter(page) " of " counter(pages);
        font-family: "Red Hat Text", Arial, sans-serif;
        font-size: 9pt;
        color: #666;
        border-top: 1px solid #d2d2d2;
        padding-top: 0.5cm;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: "Red Hat Text", "Overpass", Arial, sans-serif;
      color: #151515;
      background: #ffffff;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      line-height: 1.2;
      margin-top: 0;
    }

    h1 { font-size: 2.25rem; }
    h2 { font-size: 2rem; }
    h3 { font-size: 1.5rem; }
    h4 { font-size: 1.25rem; }
    h5 { font-size: 1rem; }

    p {
      margin: 0 0 1rem 0;
    }

    a {
      color: #0066cc;
      text-decoration: underline;
    }

    code {
      font-family: "Courier New", monospace;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    ul, ol {
      margin: 0;
      padding-left: 1.5rem;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
`;

  // Title page
  html += '<div style="min-height:90vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">';
  html += `<h1 style="font-size:3rem;margin-bottom:2rem;">${esc(name)}</h1>`;
  html += '<div style="font-size:1.25rem;color:#666;margin-bottom:3rem;">';
  html += `<div>Version: ${esc(version)}</div>`;
  html += `<div>Authors: ${esc(authors)}</div>`;
  html += `<div>Updated: ${esc(updatedAt)}</div>`;
  html += '</div>';
  html += '</div>';

  // All sections
  html += renderOutlineSection(ctx);
  html += renderExecutiveContext(ctx);
  html += renderMethodFocus(ctx);
  html += renderLifecycleOrchestration(ctx);
  html += renderCoreConceptsSection(ctx);
  html += renderWorkProductsSection(ctx);
  html += renderExecutionAndRoles(ctx);

  html += '</body></html>';

  return html;
}
