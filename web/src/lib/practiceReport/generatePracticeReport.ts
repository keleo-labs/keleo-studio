import type {
  PatternViewAlphaState,
  PracticeBaseline,
  Practice,
  PracticeActivity,
  PracticeElementAlias,
} from "@/lib/types";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  narrativeContextRowDisplayText,
  practiceElementDescriptionForDisplay,
  isPracticeActivityNode,
  activitySpaceIdentityKey,
} from "@/lib/ir";

/** Enriched baseline plus practice overlays used for structured reporting (patterns, activities, work products, etc.). */
export type ReportRenderableDoc = PracticeBaseline &
  Partial<
    Pick<
      Practice,
      | "patterns"
      | "activities"
      | "workProducts"
      | "practiceElementAliases"
      | "personas"
      | "personaGroups"
      | "narrativeTypes"
      | "narratives"
    >
  >;

/** Narrative bullets (PrintNarrative): context-only {@link NarrativeContext.context}. Documents use optional bold {@link label}. */
export type PracticeReportBullet = { /** Bold lead (e.g. Documents); omit for PrintNarrative. */
  label?: string;
  text: string;
};

export type PracticeReportSection = {
  heading: string;
  /** Body paragraphs under this heading (no markdown). */
  paragraphs: string[];
  /** Narrative bullets: PrintNarrative emits context-only rows; Documents use labeled bullets. */
  bullets?: PracticeReportBullet[];
  subsections?: PracticeReportSection[];
};

export type PracticeReportPayload = {
  sections: PracticeReportSection[];
};

export type DisplayAliasFn = (elementType: string, canonicalName: string) => string;

export function buildDisplayAliasLookup(
  aliases: PracticeElementAlias[] | undefined | null,
): DisplayAliasFn {
  const map = new Map<string, string>();
  for (const a of aliases ?? []) {
    const t = String(a.practiceElementType ?? "").trim();
    const n = String(a.practiceElementName ?? "").trim();
    const alias = String(a.aliasName ?? "").trim();
    if (!t || !n || !alias) continue;
    map.set(`${t.toLowerCase()}::${activityKey(n)}`, alias);
  }
  return (elementType, canonicalName) => {
    const k = `${String(elementType).toLowerCase()}::${activityKey(canonicalName)}`;
    return map.get(k) ?? canonicalName;
  };
}

function activityKey(name: string): string {
  return String(name ?? "").trim().toLowerCase();
}

function overlayPracticeRoots(doc: unknown, enrichedBaseline: PracticeBaseline): ReportRenderableDoc {
  if (!doc || typeof doc !== "object") return enrichedBaseline as ReportRenderableDoc;
  const d = doc as Record<string, unknown>;
  return {
    ...enrichedBaseline,
    ...(Array.isArray(d.patterns) ? { patterns: d.patterns as ReportRenderableDoc["patterns"] } : {}),
    ...(Array.isArray(d.activities) ? { activities: d.activities as PracticeActivity[] } : {}),
    ...(Array.isArray(d.workProducts) ? { workProducts: d.workProducts as ReportRenderableDoc["workProducts"] } : {}),
    ...(Array.isArray(d.personas) ? { personas: d.personas as ReportRenderableDoc["personas"] } : {}),
    ...(Array.isArray(d.personaGroups) ? { personaGroups: d.personaGroups as ReportRenderableDoc["personaGroups"] } : {}),
    ...(Array.isArray(d.narrativeTypes) ? { narrativeTypes: d.narrativeTypes as ReportRenderableDoc["narrativeTypes"] } : {}),
    ...(Array.isArray(d.practiceElementAliases)
      ? { practiceElementAliases: d.practiceElementAliases as PracticeElementAlias[] }
      : {}),
    ...(Array.isArray((d as { narratives?: unknown }).narratives)
      ? { narratives: (d as { narratives: unknown[] }).narratives as Practice["narratives"] }
      : {}),
  };
}

/** Resolve baseline-shaped graph + practice overlays; aliases apply at presentation only. */
export function buildReportRenderableDoc(doc: unknown): ReportRenderableDoc | null {
  const baseline = asBaselineDocument(doc);
  if (!baseline) return null;
  const withActs = baselineWithPracticeActivities(doc, baseline);
  const enriched = enrichBaselineWithReferencedWrappers(doc, withActs);
  return overlayPracticeRoots(doc, enriched);
}

/** PrintNarrative: one bullet per NarrativeContext — body is {@link NarrativeContext.context} only (spec; see ir narrativeContextRowDisplayText for interchange keys). */
function bulletsFromNarrativeContexts(raw: unknown): PracticeReportBullet[] {
  if (!Array.isArray(raw)) return [];
  const sorted = [...raw].sort(
    (a, b) =>
      (Number((a as { seq?: unknown }).seq ?? 0) || 0) - (Number((b as { seq?: unknown }).seq ?? 0) || 0),
  );
  const out: PracticeReportBullet[] = [];
  for (const row of sorted) {
    if (!row || typeof row !== "object") continue;
    const text = narrativeContextRowDisplayText(row).trim();
    if (!text) continue;
    out.push({ text });
  }
  return out;
}

/**
 * Spec {@link PrintNarrative}: Narrative.name AS heading, description AS normal, FOR EACH context bullet = context prose.
 * Recurses into nested `narratives` when present on a Narrative node.
 */
function printNarrativeSections(narrative: unknown, display: DisplayAliasFn): PracticeReportSection[] {
  if (!narrative || typeof narrative !== "object") return [];
  const n = narrative as Record<string, unknown>;
  const titleRaw = String(n.name ?? "").trim();
  const heading = titleRaw ? display("Narrative", titleRaw) : "Narrative";
  const desc =
    practiceElementDescriptionForDisplay(n)?.trim() ?? String(n.description ?? "").trim();
  const bullets = bulletsFromNarrativeContexts(n.narrativeContexts);
  const block: PracticeReportSection = {
    heading,
    paragraphs: desc ? [desc] : [],
    ...(bullets.length ? { bullets } : {}),
  };

  const nested = n.narratives;
  const rest: PracticeReportSection[] = [];
  if (Array.isArray(nested)) {
    for (const child of nested) rest.push(...printNarrativeSections(child, display));
  }

  return [block, ...rest];
}

function printAllNarratives(narratives: unknown, display: DisplayAliasFn): PracticeReportSection[] {
  if (!Array.isArray(narratives)) return [];
  const out: PracticeReportSection[] = [];
  for (const nar of narratives) out.push(...printNarrativeSections(nar, display));
  return out;
}

/** Introduction: practice description {@link GenerateFrontMatter} + PrintNarrative on root practice narratives. */
function generateIntroduction(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection {
  const rootDesc =
    practiceElementDescriptionForDisplay(doc)?.trim() ?? String(doc.description ?? "").trim() ?? "";

  const subsections =
    doc.narratives && Array.isArray(doc.narratives) && doc.narratives.length
      ? printAllNarratives(doc.narratives, display)
      : [];

  const paragraphs =
    rootDesc !== ""
      ? [rootDesc]
      : ['No practice description authored — populate the root PracticeElement "description" field.'];

  return {
    heading: "Introduction",
    paragraphs,
    ...(subsections.length ? { subsections } : {}),
  };
}

/** H2 Concerns → Focus → Alpha (only with narratives). */
function generateConcerns(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection {
  const focuses = [...(doc.focuses ?? [])].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? "")),
  );

  const focusSections: PracticeReportSection[] = [];
  for (const focus of focuses) {
    const fn = String(focus?.name ?? "").trim();
    if (!fn) continue;

    const fDesc =
      practiceElementDescriptionForDisplay(focus)?.trim() ?? String(focus?.description ?? "").trim();
    const alphaBlocks: PracticeReportSection[] = [];

    for (const alpha of doc.alphas ?? []) {
      if (String(alpha?.focusName ?? "").trim() !== fn) continue;
      const narrs = alpha?.narratives;
      if (!Array.isArray(narrs) || narrs.length === 0) continue;

      const aName = display("Alpha", String(alpha?.name ?? "").trim());
      const aDesc =
        practiceElementDescriptionForDisplay(alpha)?.trim() ??
        String(alpha?.description ?? "").trim() ??
        "";

      alphaBlocks.push({
        heading: aName,
        paragraphs: aDesc ? [aDesc] : [],
        subsections: printAllNarratives(narrs, display),
      });
    }

    focusSections.push({
      heading: display("Focus", fn),
      paragraphs: fDesc ? [fDesc] : [],
      ...(alphaBlocks.length ? { subsections: alphaBlocks } : {}),
    });
  }

  return {
    heading: "Concerns",
    paragraphs:
      focuses.length === 0
        ? ["No Focus rows authored — SEMAT swimlanes drive this section."]
        : ["Structural concerns keyed from Focus definitions; Alphas listed only when they carry embedded narratives."],
    subsections: focusSections.length ? focusSections : undefined,
  };
}

/** H2 Documents — work products as bold-name bullets. */
function generateDocuments(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection {
  const wps = doc.workProducts ?? [];
  const bullets: PracticeReportBullet[] = wps.map((wp: any) => ({
    label: display("WorkProduct", String(wp?.name ?? "").trim() || "(unnamed)"),
    text:
      (practiceElementDescriptionForDisplay(wp)?.trim() ?? String(wp?.description ?? "").trim()) || "—",
  }));

  return {
    heading: "Documents",
    paragraphs:
      bullets.length === 0 ? ["No work products declared on this practice snapshot."] : ["Formal deliverables named in schema order."],
    ...(bullets.length ? { bullets } : {}),
  };
}

function spaceActivityCount(spaceRow: unknown, flatActivities: PracticeActivity[] | undefined): number {
  if (!spaceRow || typeof spaceRow !== "object") return 0;
  const nested = Array.isArray((spaceRow as { activities?: unknown }).activities)
    ? ((spaceRow as { activities?: unknown }).activities as unknown[]).length
    : 0;
  const name = String((spaceRow as { name?: unknown }).name ?? "").trim();
  if (!name || !flatActivities?.length) return nested;
  const flat = flatActivities.filter(
    (a) => activitySpaceIdentityKey(a.activitySpaceName) === activitySpaceIdentityKey(name),
  ).length;
  return nested + flat;
}

/** Flat Practice.activities keyed into a space alongside nested rows. */
function mergedActivitiesForSpace(space: any, doc: ReportRenderableDoc): any[] {
  const sn = String(space?.name ?? "").trim();
  const nested = [...(space?.activities ?? [])];
  const flat =
    doc.activities?.filter(
      (a) =>
        activitySpaceIdentityKey(String(a.activitySpaceName ?? "").trim()) === activitySpaceIdentityKey(sn),
    ) ?? [];
  const byKey = new Map<string, any>();
  for (const a of nested) {
    const nm = String(a?.name ?? "").trim();
    if (nm) byKey.set(activityKey(nm), a);
  }
  for (const a of flat) {
    const nm = String(a?.name ?? "").trim();
    const k = activityKey(nm);
    if (nm && !byKey.has(k)) byKey.set(k, a);
  }
  return [...byKey.values()].sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
}

/** H2 Activities → Focus → ActivitySpace → Activity; PrintNarrative on spaces and activities when present. */
function generateActivities(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection {
  const focuses = [...(doc.focuses ?? [])].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? "")),
  );
  const focusSections: PracticeReportSection[] = [];

  for (const focus of focuses) {
    const fn = String(focus?.name ?? "").trim();
    if (!fn) continue;

    const spaces: PracticeReportSection[] = [];
    for (const row of doc.activitySpaces ?? []) {
      if (isPracticeActivityNode(row)) continue;
      const space = row as { name?: string; description?: string; focusName?: string; narratives?: unknown };
      if (String(space.focusName ?? "").trim() !== fn) continue;
      const nActs = spaceActivityCount(row, doc.activities as PracticeActivity[] | undefined);
      if (nActs <= 0) continue;

      const acts = mergedActivitiesForSpace(space, doc);
      const activityBlocks: PracticeReportSection[] = [];
      for (const act of acts) {
        const actNarr = (act as { narratives?: unknown }).narratives;
        const actNarrSubs = Array.isArray(actNarr) ? printAllNarratives(actNarr, display) : [];

        activityBlocks.push({
          heading: display("Activity", String((act as { name?: unknown })?.name ?? "").trim() || "Activity"),
          paragraphs: [
            (practiceElementDescriptionForDisplay(act)?.trim() ??
              String((act as { description?: unknown })?.description ?? "").trim()) ||
              "(No activity description authored.)",
          ],
          ...(actNarrSubs.length ? { subsections: actNarrSubs } : {}),
        });
      }

      const spaceNarrSubs = Array.isArray(space.narratives) ? printAllNarratives(space.narratives, display) : [];
      const underSpace: PracticeReportSection[] = [...spaceNarrSubs, ...activityBlocks];

      spaces.push({
        heading: display("ActivitySpace", String(space.name ?? "").trim() || fn),
        paragraphs: [
          (practiceElementDescriptionForDisplay(space)?.trim() ??
            String(space.description ?? "").trim()) ||
            "(Activity space prose not authored.)",
        ],
        ...(underSpace.length ? { subsections: underSpace } : {}),
      });
    }

    focusSections.push({
      heading: display("Focus", fn),
      paragraphs: [],
      ...(spaces.length ? { subsections: spaces } : {}),
    });
  }

  return {
    heading: "Activities",
    paragraphs:
      focuses.length === 0
        ? ["No Focus rows — activity spaces cannot be grouped by concern."]
        : ["Execution topography: nested activity spaces and activities under each Focus."],
    subsections: focusSections.length ? focusSections : undefined,
  };
}

function parseAlphaStateSlice(entry: PatternViewAlphaState): { alphaName: string; stateName: string } | null {
  if (entry && typeof entry === "object") {
    const alphaName = String((entry as { alphaName?: unknown }).alphaName ?? "").trim();
    const stateName = String((entry as { stateName?: unknown }).stateName ?? "").trim();
    if (alphaName && stateName) return { alphaName, stateName };
    return null;
  }
  if (typeof entry === "string") {
    const raw = entry.trim();
    const seps = [/→/, /->/, /=>/, /\u2192/];
    for (const re of seps) {
      if (re.test(raw)) {
        const [a, s] = raw.split(re).map((x) => x.trim());
        if (a && s) return { alphaName: a, stateName: s };
      }
    }
  }
  return null;
}

function alphaStateSignature(pairs: { alphaName: string; stateName: string }[]): Set<string> {
  const set = new Set<string>();
  for (const { alphaName, stateName } of pairs) {
    set.add(`${activityKey(alphaName)}⇥${activityKey(stateName)}`);
  }
  return set;
}

function collectActivitiesByName(doc: ReportRenderableDoc): Map<string, any> {
  const m = new Map<string, any>();
  const add = (act: any) => {
    const n = String(act?.name ?? "").trim();
    if (!n && !Object.keys(act ?? {}).length) return;
    if (n) m.set(n, act);
  };
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) {
      add(row);
      continue;
    }
    for (const act of row.activities ?? []) add(act);
  }
  for (const act of doc.activities ?? []) add(act);
  return m;
}

function findParentSpace(doc: ReportRenderableDoc, activity: any): any | null {
  const asn = String(activity?.activitySpaceName ?? "").trim();
  if (asn) {
    for (const row of doc.activitySpaces ?? []) {
      if (isPracticeActivityNode(row)) continue;
      if (String(row?.name ?? "").trim() === asn) return row;
    }
  }
  const an = String(activity?.name ?? "").trim();
  if (!an) return null;
  for (const row of doc.activitySpaces ?? []) {
    if (isPracticeActivityNode(row)) continue;
    for (const cand of row.activities ?? []) {
      if (String(cand?.name ?? "").trim() === an) return row;
    }
  }
  return null;
}

function findAlpha(doc: ReportRenderableDoc, alphaName: string): any | undefined {
  return doc.alphas?.find((a) => String(a?.name ?? "").trim() === alphaName.trim());
}

function checklistProseFromState(doc: ReportRenderableDoc, alphaName: string, stateName: string): string | null {
  const alpha = findAlpha(doc, alphaName);
  const st =
    alpha?.states?.filter((x: unknown) => x)?.find((s: any) => String(s?.name ?? "").trim() === stateName.trim()) ??
    null;
  const checklist = Array.isArray(st?.checklist) ? st.checklist : [];
  if (!checklist.length) return null;
  return checklist
    .map((c: any) => {
      const n = String(c?.name ?? "").trim();
      const d = practiceElementDescriptionForDisplay(c)?.trim();
      if (n && d) return `${n}: ${d}`;
      return n || d || "";
    })
    .filter(Boolean)
    .join("; ");
}

/** Phase title + prose from PatternView narrativeContexts per revised spec (first element name headlines the chapter). */
function patternViewPhaseNameAndContext(pv: unknown): { phaseName: string; phaseContext: string } {
  if (!pv || typeof pv !== "object") return { phaseName: "", phaseContext: "" };
  const o = pv as { name?: unknown; seq?: unknown; narrativeContexts?: unknown };
  const fallbackName =
    String(o.name ?? "").trim() ||
    `Lifecycle phase (seq ${Number(o.seq ?? 0) || 0})`;
  const raw = o.narrativeContexts;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { phaseName: fallbackName, phaseContext: "" };
  }
  const sorted = [...raw].sort(
    (a, b) =>
      (Number((a as { seq?: unknown }).seq ?? 0) || 0) - (Number((b as { seq?: unknown }).seq ?? 0) || 0),
  );
  const firstEl = sorted[0];
  const label =
    typeof firstEl === "object" && firstEl
      ? String((firstEl as { narrativeElementName?: unknown }).narrativeElementName ?? "").trim()
      : "";
  const proseParts = sorted
    .map((c) => narrativeContextRowDisplayText(c).trim())
    .filter(Boolean);
  return {
    phaseName: label || fallbackName,
    phaseContext: proseParts.join(" "),
  };
}

function formatInvolves(involved: unknown, display: DisplayAliasFn): string {
  if (!Array.isArray(involved) || !involved.length) return "accountable persona groups";
  return involved
    .map((name) => display("PersonaGroup", String(name ?? "").trim()))
    .filter(Boolean)
    .join(", ");
}

function contributesTargetState(act: unknown): { alphaName: string; stateName: string } | null {
  if (!act || typeof act !== "object") return null;
  const list = Array.isArray((act as { contributesTo?: unknown }).contributesTo)
    ? (act as { contributesTo: unknown[] }).contributesTo
    : [];
  const first = list[0];
  if (first && typeof first === "object") {
    const alphaName = String((first as { alphaName?: unknown }).alphaName ?? "").trim();
    const stateName = String((first as { stateName?: unknown }).stateName ?? "").trim();
    if (alphaName && stateName) return { alphaName, stateName };
  }
  return null;
}

function primaryWorkProductDisplay(doc: ReportRenderableDoc, act: unknown, display: DisplayAliasFn): string {
  if (!act || typeof act !== "object") return "(author worksOn linkage to a work product)";
  const refs = (act as { worksOn?: unknown }).worksOn;
  if (!Array.isArray(refs) || refs.length === 0) return "(author worksOn linkage to a work product)";
  const first = refs[0] as { workProductName?: unknown };
  const wn = String(first?.workProductName ?? "").trim();
  return wn ? display("WorkProduct", wn) : "(named work product)";
}

/** Lifecycle STAR: pruning; phase from narrativeContexts; activities array only per spec wording. */
function generateLifecycle(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection | null {
  const patterns = [...(doc.patterns ?? [])];
  const lifecycle = patterns.find((p) => String(p?.narrativeTypeName ?? "").trim().toLowerCase() === "lifecycle");
  if (!lifecycle || !Array.isArray(lifecycle.patternViews)) return null;

  const actByName = collectActivitiesByName(doc);
  const views = [...lifecycle.patternViews].sort(
    (a, b) => (Number(a?.seq ?? 0) || 0) - (Number(b?.seq ?? 0) || 0),
  );

  const chapters: PracticeReportSection[] = [];
  let prevSig = new Set<string>();

  for (const pv of views) {
    const pairs: { alphaName: string; stateName: string }[] = [];
    for (const entry of pv.alphaStates ?? []) {
      const p = parseAlphaStateSlice(entry as PatternViewAlphaState);
      if (p) pairs.push(p);
    }
    const currSig = alphaStateSignature(pairs);
    const delta = [...currSig].filter((k) => !prevSig.has(k));
    prevSig = currSig;

    const { phaseName, phaseContext } = patternViewPhaseNameAndContext(pv);
    const chapterParas: string[] = [];

    let transitionNote = "";
    if (delta.length && pairs.length) {
      const readable = pairs
        .filter((pair) => delta.includes(`${activityKey(pair.alphaName)}⇥${activityKey(pair.stateName)}`))
        .map(({ alphaName, stateName }) => `${display("Alpha", alphaName)} → ${stateName}`)
        .join("; ");
      if (readable) transitionNote = `Advancing lifecycle focus: ${readable}.`;
    }

    const introLead = [transitionNote, phaseContext].filter(Boolean).join(" ").trim();
    if (introLead) chapterParas.push(introLead);

    const activityNames = [...(pv.activities ?? [])]
      .map((x: unknown) => String(x ?? "").trim())
      .filter(Boolean);
    const seenActs = new Set<string>();

    for (const nm of activityNames) {
      const nmKey = activityKey(nm);
      if (seenActs.has(nmKey)) continue;
      seenActs.add(nmKey);
      const activity =
        actByName.get(nm) ?? [...actByName.entries()].find(([k]) => activityKey(k) === nmKey)?.[1];
      if (!activity) continue;

      const space = findParentSpace(doc, activity);
      const spaceDesc =
        (practiceElementDescriptionForDisplay(space)?.trim() ??
          String(space?.description ?? "").trim()) ||
        "(activity space prose not authored)";
      const situation = `Operating within the strategic bounds of ${spaceDesc}`;

      const actLabel = display("Activity", String(activity?.name ?? "").trim());
      const actDesc =
        (practiceElementDescriptionForDisplay(activity)?.trim() ??
          String(activity?.description ?? "").trim()) ||
        "";
      const task = `The objective is to ${actLabel}${actDesc ? `, which involves ${actDesc}` : ""}`;

      const involves = formatInvolves(activity?.involves, display);
      const contrib = contributesTargetState(activity);
      const ck =
        contrib != null ? checklistProseFromState(doc, contrib.alphaName, contrib.stateName) : null;
      const checklistText = ck ?? "(checklist authoring on linked alpha-state)";
      const action = `The ${involves} will execute the necessary validation steps, specifically: ${checklistText}.`;

      const targetState =
        contrib != null ? String(contrib.stateName ?? "").trim() || contrib.stateName : "(target state)";
      const wpName = primaryWorkProductDisplay(doc, activity, display);
      const result = `Successful execution results in achieving the ${targetState} state, evidenced by the creation of the ${wpName}.`;

      chapterParas.push([situation, task, action, result].join(" "));
    }

    chapters.push({
      heading: `${display("Pattern", String(lifecycle.name ?? "").trim() || "Lifecycle")} · ${phaseName}`,
      paragraphs: chapterParas.length
        ? chapterParas
        : ["Symbolic activities referenced on `patternViews[].activities[]` resolve here when present."],
    });
  }

  return {
    heading: "Lifecycle Execution (STAR Narrative Loop)",
    paragraphs: ["Phases keyed from pattern-view narrativeContexts; STAR paragraphs emitted per symbolic activity reference."],
    subsections: chapters,
  };
}

/** Terminal-completion hint for conclusion pass. */
const TERMINAL_STATE_NAME_HINT = /benefit accrued|optimized|retired|sustained|embedded|value established/i;

function generateConclusion(doc: ReportRenderableDoc, display: DisplayAliasFn): PracticeReportSection {
  const paragraphs: string[] = [
    "Completion criteria from terminal alpha-state checklists (culminating states that signal realized or stabilized outcomes).",
  ];

  let anyExplicit = false;
  for (const alpha of doc.alphas ?? []) {
    const states = [...(alpha?.states ?? [])].sort(
      (a, b) => (Number(a?.seq ?? 0) || 0) - (Number(b?.seq ?? 0) || 0),
    );
    if (!states.length) continue;
    const last = states[states.length - 1];
    const sn = String(last?.name ?? "").trim();
    if (!sn || !TERMINAL_STATE_NAME_HINT.test(sn)) continue;

    const ck = checklistProseFromState(doc, String(alpha?.name ?? ""), sn);
    if (!ck) continue;
    anyExplicit = true;
    paragraphs.push(
      `To definitively finalize the ${display("Alpha", String(alpha?.name ?? "").trim())} workflow and close the endeavor, the organization must quantitatively validate that: ${ck}`,
    );
  }

  if (!anyExplicit)
    paragraphs.push(
      'Author culminating checklist language on terminal states whose names evoke benefit-realization (for example "Benefit Accrued").',
    );

  return { heading: "Conclusion and Next Steps", paragraphs };
}

/** Rev. doc-gen-spec: Introduction + Concerns + Documents + Activities, then STAR lifecycle + conclusion. */
export function buildPracticeReport(doc: unknown): PracticeReportPayload | null {
  const merged = buildReportRenderableDoc(doc);
  if (!merged) return null;
  const display = buildDisplayAliasLookup(merged.practiceElementAliases ?? []);

  const sections: PracticeReportSection[] = [
    generateIntroduction(merged, display),
    generateConcerns(merged, display),
    generateDocuments(merged, display),
    generateActivities(merged, display),
  ];
  const lc = generateLifecycle(merged, display);
  if (lc) sections.push(lc);
  sections.push(generateConclusion(merged, display));
  return { sections };
}
