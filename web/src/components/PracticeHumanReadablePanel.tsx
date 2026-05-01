/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import type { Method, PracticeBaseline, PracticeElementAlias } from "@/lib/types";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  groupByFocus,
  IMPLICIT_FOCUS_NAME,
  practiceElementDescriptionForDisplay,
} from "@/lib/ir";
import { flattenPracticeElementTags, normalizePracticeElementTags } from "@/lib/practiceElementTags";
import { parsePatternViewAlphaState } from "@/lib/patternView";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { useTheme } from "@/lib/theme";
import { useLanguagePack } from "@/lib/languagePack";
import type { LanguagePack } from "@/lib/languagePackTypes";
import {
  buildPatternMatrixAlphaRows,
  buildPatternMatrixCells,
  computeArrowHeightForWidthWithAlias,
  computeBlockHeightForWidthWithAlias,
  computePatternMatrixLayout,
  computeSwimlaneFocusHeadingLayout,
  computeSwimlaneFocusHeadingLayoutAliased,
  diagramTextCharLimits,
  layoutDiagramAliasedNameRows,
  PATTERN_MATRIX_LANE_TOGGLE_HEIGHT,
  SWIMLANE_FOCUS_HEADING,
  wrapDiagramTextLines,
  type DiagramAliasedNameRow,
} from "@/lib/patternMatrixDiagram";
import {
  ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS,
  alphaCardGeomAt,
  alphaContributesToEdges,
  augmentLaneAlphasWithCrossLaneContributesParents,
  computeAlphaContributorBelowLayout,
  contributeEdgePathD,
} from "@/lib/alphaContributesDiagram";
import { extendsBaselineDisplayName } from "@/lib/library/classify";
import {
  diagramMeasureName,
  EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
  getAliasedDisplay,
  type PracticeElementAliasLookup,
} from "@/lib/practiceElementAliasDisplay";
import { PracticeElementAliasesProvider, AliasedName, usePracticeElementAliasLookup } from "@/components/AliasedName";

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

/** Browse library: document-style headings and nested activity layout. Practice author keeps `default`. */
export type PracticeHumanReadableVariant = "default" | "browse";

const BROWSE = {
  docTitle: "text-3xl font-semibold tracking-tight text-[var(--text)]",
  docSubtitle: "mt-2 text-lg leading-relaxed text-[var(--muted)]",
  body: "text-[15px] leading-relaxed text-[var(--text)]",
  bodyMuted: "text-sm leading-relaxed text-[var(--muted)]",
  meta: "mt-3 text-sm text-[var(--muted)]",
  h2: "mt-10 border-t border-[var(--border)] pt-8 text-2xl font-semibold tracking-tight text-[var(--text)] first:mt-0 first:border-t-0 first:pt-0",
  h2Global: "mt-10 border-t border-[var(--border)] pt-8 text-2xl font-semibold tracking-tight text-[var(--text)]",
  h3: "mt-6 text-xl font-semibold text-[var(--text)]",
  h3Item: "mt-4 text-xl font-semibold text-[var(--text)]",
  h4: "mt-4 text-lg font-semibold text-[var(--text)]",
  h5: "mt-3 text-base font-semibold text-[var(--text)]",
} as const;

/** Dedupe alpha→state links by pair (same as mergeContribs in compositePracticeFromMethod). */
function dedupeContributesToRefs(raw: unknown): { alphaName: string; stateName: string }[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  const seen = new Set<string>();
  const out: { alphaName: string; stateName: string }[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const alphaName = String((c as { alphaName?: unknown }).alphaName ?? "").trim();
    if (!alphaName) continue;
    const stateName = String((c as { stateName?: unknown }).stateName ?? "");
    const k = `${alphaName}::${stateName}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ alphaName, stateName });
  }
  return out;
}

/** Browse IR: structured tag buckets (domain / lifecycle / organizational) when present; omits empty buckets. */
function IrBrowseTagsBlock({ tags, t, className = "mt-2" }: { tags: unknown; t: LanguagePack; className?: string }) {
  const n = normalizePracticeElementTags(tags);
  if (!n) return null;
  const rows: { label: string; items: string[] }[] = [];
  if (n.domainTags?.length) rows.push({ label: t.tagsDomain, items: n.domainTags });
  if (n.lifecycleTags?.length) rows.push({ label: t.tagsLifecycle, items: n.lifecycleTags });
  if (n.organizationalTags?.length) rows.push({ label: t.tagsOrganizational, items: n.organizationalTags });
  if (!rows.length) return null;
  return (
    <div className={`${className} space-y-1`}>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-start gap-2">
          <span className="min-w-[6.75rem] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {row.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {row.items.map((x, xi) => (
              <span key={`${row.label}-${xi}-${slug(x)}`} style={tag()}>
                {x}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Browse IR: optional checklist gate metadata from language.schema.json Checklist. */
function IrBrowseChecklistSchemaBlock({
  ch,
  t,
  workProductId,
}: {
  ch: any;
  t: LanguagePack;
  workProductId: (n: string) => string;
}) {
  const blockRow =
    typeof ch.isBlocking === "boolean" ? (
      <div key="block" className="text-[11px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{t.checklistBlocking}: </span>
        {ch.isBlocking ? "true" : "false"}
      </div>
    ) : null;
  const vmRow =
    typeof ch.verificationMethod === "string" && ch.verificationMethod.trim() ? (
      <div key="vm" className="text-[11px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{t.checklistVerificationMethod}: </span>
        <code>{ch.verificationMethod.trim()}</code>
      </div>
    ) : null;
  const erRow =
    typeof ch.evidenceRequired === "boolean" ? (
      <div key="er" className="text-[11px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{t.checklistEvidenceRequired}: </span>
        {ch.evidenceRequired ? "true" : "false"}
      </div>
    ) : null;

  const thresholdWeight =
    typeof ch.thresholdWeighting === "number" && Number.isFinite(ch.thresholdWeighting) ? (
      <div key="tw" className="text-[11px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{t.checklistThresholdWeight}: </span>
        {ch.thresholdWeighting}
      </div>
    ) : null;

  const metaInSchemaOrder: ReactNode[] = [];
  if (blockRow) metaInSchemaOrder.push(blockRow);
  if (thresholdWeight) metaInSchemaOrder.push(thresholdWeight);
  if (vmRow) metaInSchemaOrder.push(vmRow);
  if (erRow) metaInSchemaOrder.push(erRow);

  const ev = Array.isArray(ch.evidencedBy) ? ch.evidencedBy : [];
  const evBlock =
    ev.length > 0 ? (
      <div className="mt-1 text-[11px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{t.checklistEvidencedBy}: </span>
        {ev.map((w: any, idx: number) => (
          <span key={`${String(w?.workProductName)}:${String(w?.levelOfDetailName)}:${idx}`}>
            <a href={`#${workProductId(String(w?.workProductName ?? "").trim())}`} style={linkStyle()}>
              <code>
                <AliasedName kind="WorkProduct" name={String(w?.workProductName ?? "").trim()} browse />→
                <AliasedName kind="LevelOfDetail" name={String(w?.levelOfDetailName ?? "").trim()} browse />
              </code>
            </a>
            {idx < ev.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>
    ) : null;

  if (!metaInSchemaOrder.length && !evBlock) return null;
  return (
    <div className="mt-1.5 space-y-0.5 border-l-2 border-[var(--border)]/70 pl-2">
      {metaInSchemaOrder}
      {evBlock}
    </div>
  );
}

/** True when checklist row has tags or schema metadata worth showing behind a click. */
function browseChecklistHasExpandableFields(ch: unknown): boolean {
  if (normalizePracticeElementTags((ch as { tags?: unknown })?.tags)) return true;
  const c = ch as Record<string, unknown>;
  if (typeof c?.isBlocking === "boolean") return true;
  if (typeof c?.verificationMethod === "string" && String(c.verificationMethod).trim() !== "") return true;
  if (typeof c?.evidenceRequired === "boolean") return true;
  if (typeof c?.thresholdWeighting === "number" && Number.isFinite(c.thresholdWeighting)) return true;
  if (Array.isArray(c?.evidencedBy) && (c.evidencedBy as unknown[]).length > 0) return true;
  return false;
}

/** Browse IR: checklist items as bullets; name bold + description visible; tags & schema in `<details>`. */
function IrBrowseChecklistBullets({
  checklist,
  t,
  workProductId,
  listClassName,
  itemKeyPrefix,
}: {
  checklist: any[];
  t: LanguagePack;
  workProductId: (n: string) => string;
  listClassName: string;
  itemKeyPrefix: string;
}) {
  const sorted = checklist.slice().sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0));
  return (
    <ul className={listClassName}>
      {sorted.map((ch: any, chIdx: number) => {
        const desc = practiceElementDescriptionForDisplay(ch);
        const expandable = browseChecklistHasExpandableFields(ch);
        const headline = (
          <>
            <span className="font-bold">
              <AliasedName kind="Checklist" name={ch.name} browse />
            </span>
            {desc ? <span className="font-normal"> {desc}</span> : null}
          </>
        );
        return (
          <li key={`${itemKeyPrefix}-${chIdx}-${slug(String(ch.name ?? ""))}`}>
            {expandable ? (
              <details className="rounded-sm">
                <summary className="cursor-pointer list-none leading-snug [&::-webkit-details-marker]:hidden">
                  {headline}
                </summary>
                <div className="mt-2 space-y-2 border-l-2 border-[var(--border)]/70 pl-2.5">
                  <IrBrowseTagsBlock tags={ch.tags} t={t} className="mt-0" />
                  <IrBrowseChecklistSchemaBlock ch={ch} t={t} workProductId={workProductId} />
                </div>
              </details>
            ) : (
              <div className="leading-snug">{headline}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function IrBrowsePatternViewsSection({
  pattern,
  t,
  stateId,
  activitySpaceId,
  activityId,
}: {
  pattern: any;
  t: LanguagePack;
  stateId: (a: string, s: string) => string;
  activitySpaceId: (n: string) => string;
  activityId: (n: string) => string;
}) {
  const views = Array.isArray(pattern.patternViews) ? [...pattern.patternViews] : [];
  if (!views.length) return null;
  views.sort((a: any, b: any) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
  return (
    <details className="mt-4 rounded-lg border border-[var(--border)]/80 bg-[var(--panel)]/40 px-3 py-2">
      <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
        {t.patternViewsHeading}
        <span className="ml-1.5 font-normal tabular-nums">({views.length})</span>
      </summary>
      <ul className="mt-3 list-none space-y-4 border-t border-[var(--border)]/60 pt-3 pl-0">
        {views.map((pv: any) => (
          <li key={String(pv.name)}>
            <div className="font-semibold text-[var(--text)]">
              <AliasedName kind="PatternView" name={String(pv.name)} browse />
            </div>
            {practiceElementDescriptionForDisplay(pv) ? (
              <p className={`mt-1 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(pv)}</p>
            ) : null}
            <IrBrowseTagsBlock tags={pv.tags} t={t} className="mt-1.5" />
            <div className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">{t.patternViewAlphaStates}: </span>
              {(pv.alphaStates ?? []).length ? (
                (pv.alphaStates as unknown[]).map((raw, idx, arr) => {
                  const parsed = parsePatternViewAlphaState(raw);
                  const sep = idx < arr.length - 1 ? ", " : "";
                  if (parsed) {
                    return (
                      <span key={`pv-${String(pv.name)}-as-${idx}`}>
                        <a href={`#${stateId(parsed.alphaName, parsed.stateName)}`} style={linkStyle()}>
                          <code>
                            <AliasedName kind="Alpha" name={parsed.alphaName} browse />→
                            <AliasedName kind="State" name={parsed.stateName} browse />
                          </code>
                        </a>
                        {sep}
                      </span>
                    );
                  }
                  return (
                    <span key={`pv-${String(pv.name)}-raw-${idx}`}>
                      <code>{String(raw)}</code>
                      {sep}
                    </span>
                  );
                })
              ) : (
                <span className="italic">—</span>
              )}
            </div>
            {Array.isArray(pv.activitySpaces) && pv.activitySpaces.length ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">{t.patternViewActivitySpaces}: </span>
                {pv.activitySpaces.map((nm: unknown, idx: number) => (
                  <span key={`${String(nm)}-${idx}`}>
                    <a href={`#${activitySpaceId(String(nm ?? "").trim())}`} style={linkStyle()}>
                      <code>
                        <AliasedName kind="ActivitySpace" name={String(nm ?? "").trim()} browse />
                      </code>
                    </a>
                    {idx < pv.activitySpaces.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}
            {Array.isArray(pv.activities) && pv.activities.length ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">{t.patternViewActivities}: </span>
                {pv.activities.map((nm: unknown, idx: number) => (
                  <span key={`${String(nm)}-act-${idx}`}>
                    <a href={`#${activityId(String(nm ?? "").trim())}`} style={linkStyle()}>
                      <code>
                        <AliasedName kind="Activity" name={String(nm ?? "").trim()} browse />
                      </code>
                    </a>
                    {idx < pv.activities.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

type FocusGroup = { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] };

export function PracticeHumanReadablePanel({
  doc,
  variant = "default",
  methodComposition,
}: {
  doc: unknown;
  variant?: PracticeHumanReadableVariant;
  /** When set (e.g. library browse of a method), replaces “extends foundation” / related practices with this list. */
  methodComposition?: Method | null;
}) {
  const { t } = useLanguagePack();
  const shouldResolveLibrary = useMemo(() => practiceNeedsLibraryResolution(doc), [doc]);
  const [libraryResolvedDoc, setLibraryResolvedDoc] = useState<unknown | null>(null);
  const [libraryResolveNote, setLibraryResolveNote] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldResolveLibrary) {
      setLibraryResolvedDoc(null);
      setLibraryResolveNote(null);
      return;
    }
    let cancelled = false;
    setLibraryResolvedDoc(null);
    setLibraryResolveNote(null);
    (async () => {
      try {
        const res = await fetch("/api/documents/resolve-for-render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ doc }),
        });
        const j = (await res.json().catch(() => null)) as { resolved?: unknown; error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setLibraryResolveNote(typeof j?.error === "string" ? j.error : `Library merge failed (${res.status}).`);
          return;
        }
        if (j?.error) setLibraryResolveNote(j.error);
        else if (j && "resolved" in j) setLibraryResolvedDoc(j.resolved);
      } catch (e) {
        if (!cancelled) setLibraryResolveNote(e instanceof Error ? e.message : "Library merge failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, shouldResolveLibrary]);

  const effectiveDoc = useMemo(() => {
    if (!shouldResolveLibrary) return doc;
    if (libraryResolvedDoc !== null) return libraryResolvedDoc;
    return doc;
  }, [doc, shouldResolveLibrary, libraryResolvedDoc]);

  const baseline = useMemo(() => (effectiveDoc ? asBaselineDocument(effectiveDoc) : null), [effectiveDoc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !effectiveDoc) return null;
    const withActivities = baselineWithPracticeActivities(effectiveDoc, baseline);
    return enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
  }, [baseline, effectiveDoc]);
  const grouped = useMemo(
    () => (baselineForRender ? groupByFocus(baselineForRender) : []),
    [baselineForRender],
  );
  const supportingAlphaNamesGlobalBrowse = useMemo(() => {
    const s = new Set<string>();
    for (const gg of grouped) {
      for (const x of gg.alphas ?? []) {
        for (const raw of x.supportingAlphas ?? []) {
          const n = String(raw ?? "").trim();
          if (n) s.add(n);
        }
      }
    }
    return s;
  }, [grouped]);

  const sourceDocRecord =
    effectiveDoc && typeof effectiveDoc === "object" ? (effectiveDoc as Record<string, unknown>) : null;

  return (
    <PracticeElementAliasesProvider
      aliases={
        Array.isArray(sourceDocRecord?.practiceElementAliases)
          ? (sourceDocRecord.practiceElementAliases as PracticeElementAlias[])
          : undefined
      }
    >
      <section style={panel}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{t.renderedView}</div>
      {shouldResolveLibrary && libraryResolvedDoc === null && !libraryResolveNote ? (
        <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>Merging baseline and dependencies from the library…</div>
      ) : null}
      {libraryResolveNote ? (
        <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>{libraryResolveNote}</div>
      ) : null}
      {!baselineForRender ? (
        <div style={{ color: "var(--muted)" }}>{t.nothingToRender}</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {variant === "browse" ? (
            <BrowseTableOfContents
              grouped={grouped}
              baseline={baselineForRender}
              sourceDoc={sourceDocRecord}
              t={t}
              supportingAlphaNamesGlobal={supportingAlphaNamesGlobalBrowse}
              methodComposition={methodComposition ?? undefined}
            />
          ) : null}
          <PracticeBaselineView
            baseline={baselineForRender}
            grouped={grouped}
            sourceDoc={sourceDocRecord}
            variant={variant}
            methodComposition={methodComposition ?? undefined}
          />
        </div>
      )}
    </section>
    </PracticeElementAliasesProvider>
  );
}

const BROWSE_SECTION_ALPHAS = "browse-section-alphas";
const BROWSE_SECTION_ACTIVITIES = "browse-section-activities";
const BROWSE_SECTION_METHOD_PRACTICES = "browse-section-composing-practices";
const BROWSE_SECTION_ALIASES = "browse-section-aliases";

function browseAlphasFocusSectionId(focusName: string) {
  return `browse-alphas-focus-${slug(focusName)}`;
}

function browseActivitiesFocusSectionId(focusName: string) {
  return `browse-activities-focus-${slug(focusName)}`;
}

function browseOrphanActsId(parentSpaceName: string) {
  return `browse-orphan-acts-${slug(parentSpaceName)}`;
}

function MethodComposingPracticesBrowse({ method, t }: { method: Method; t: LanguagePack }) {
  const baseline = method.baselinePractice;
  const extensions = method.practices ?? [];
  return (
    <section
      id={BROWSE_SECTION_METHOD_PRACTICES}
      aria-label={t.methodBrowseExtensionPracticesHeading}
      className="mt-6 scroll-mt-4 border-t border-[var(--border)] pt-6"
    >
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t.methodBrowseExtensionPracticesHeading}</h2>
      <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm marker:text-[var(--muted)]">
        <li className="pl-2">
          <span className="font-semibold text-[var(--text)]">
            <AliasedName kind="PracticeBaseline" name={baseline.name} browse />
          </span>
          {String(baseline.description ?? "").trim() ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{baseline.description}</p>
          ) : null}
        </li>
        {extensions.map((p, idx) => (
          <li key={`meth-practice-${idx}-${p.name ?? ""}`} className="pl-2">
            <span className="font-semibold text-[var(--text)]">
              <AliasedName kind="Practice" name={typeof p.name === "string" ? p.name : "—"} browse />
            </span>
            {p.description?.trim?.() ? (
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{p.description}</p>
            ) : null}
            {typeof p.baselinePracticeName === "string" && p.baselinePracticeName.trim() !== "" ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]/90">{t.extendsBaseline}: </span>
                <code className="text-[var(--text)]">{p.baselinePracticeName}</code>
              </p>
            ) : null}
            {Array.isArray(p.practiceDependencyNames) && (p.practiceDependencyNames ?? []).length ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]/90">{t.practiceDependencies}: </span>
                {(p.practiceDependencyNames as string[]).join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Library browse: in-page anchors for swimlanes, alphas, spaces, activities, and global sections. */
function BrowseTableOfContents({
  grouped,
  baseline,
  sourceDoc,
  t,
  supportingAlphaNamesGlobal,
  methodComposition,
}: {
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  baseline: PracticeBaseline;
  sourceDoc: Record<string, unknown> | null | undefined;
  t: LanguagePack;
  supportingAlphaNamesGlobal: Set<string>;
  methodComposition?: Method;
}) {
  const displayFocusName = (nm: string) => (nm === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : nm);
  const alphaId = (alphaName: string) => `alpha-${slug(alphaName)}`;
  const activitySpaceId = (name: string) => `activity-space-${slug(name)}`;
  const competencyId = (name: string) => `competency-${slug(name)}`;
  const workProductId = (name: string) => `work-product-${slug(name)}`;
  const activityId = (name: string) => `activity-${slug(name)}`;
  const narrativeTypeIdBrowse = (name: string) => `narrative-type-${slug(name)}`;
  const personaIdBrowseFn = (name: string) => `persona-${slug(name)}`;
  const personaGroupIdBrowseFn = (name: string) => `persona-group-${slug(name)}`;
  const patternId = (name: string) => `pattern-${slug(name)}`;

  const isPracticeActivity = (s: any) =>
    s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";

  const tocLink = "font-medium text-[var(--accent)] underline-offset-2 hover:underline";
  const tocSubLink = "text-[13px] font-normal text-[var(--accent)] underline-offset-2 hover:underline";
  const tocLeafLink =
    "text-[13px] font-normal text-[var(--muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline";

  const hasCompetencies = (baseline.competencies ?? []).length > 0;
  const workProducts = Array.isArray(sourceDoc?.workProducts) ? (sourceDoc!.workProducts as any[]) : [];
  const narrativeTypesBrowse = baseline.narrativeTypes ?? [];
  const personasBrowse = Array.isArray(sourceDoc?.personas) ? (sourceDoc!.personas as any[]) : [];
  const personaGroupsBrowse = Array.isArray(sourceDoc?.personaGroups) ? (sourceDoc!.personaGroups as any[]) : [];
  const patterns = Array.isArray(sourceDoc?.patterns) ? (sourceDoc!.patterns as any[]) : [];
  const aliases = Array.isArray(sourceDoc?.practiceElementAliases)
    ? (sourceDoc!.practiceElementAliases as PracticeElementAlias[])
    : [];

  return (
    <nav
      aria-label={t.browseTableOfContents}
      className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 sm:px-5"
    >
      <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t.browseTableOfContents}</p>
      <ul className="mt-2 list-none space-y-2 p-0 text-sm text-[var(--text)]">
        <li>
          <a href="#practice-readable-title" className={tocLink}>
            {t.browseTocOverview}
          </a>
        </li>
        {methodComposition ? (
          <li>
            <a href={`#${BROWSE_SECTION_METHOD_PRACTICES}`} className={tocLink}>
              {t.methodBrowseExtensionPracticesHeading}
            </a>
          </li>
        ) : null}
        <li>
          <a href={`#${BROWSE_SECTION_ALPHAS}`} className={tocLink}>
            {t.sectionAlphas}
          </a>
          <ul className="mt-1.5 list-none space-y-2 border-l border-[var(--border)]/80 py-0.5 pl-3">
            {grouped.map((g) => (
              <li key={`toc-alphas-focus-${g.focusName}`}>
                <a href={`#${browseAlphasFocusSectionId(g.focusName)}`} className={tocSubLink}>
                  {g.focusName === IMPLICIT_FOCUS_NAME ? (
                    displayFocusName(g.focusName)
                  ) : (
                    <AliasedName kind="Focus" name={g.focusName} browse />
                  )}
                </a>
                <ul className="mt-1 list-none space-y-0.5 p-0">
                  {g.alphas
                    .filter((a: any) => !supportingAlphaNamesGlobal.has(String(a.name)))
                    .map((a: any) => (
                      <li key={`${g.focusName}-toc-alpha-${a.name}`}>
                        <a href={`#${alphaId(a.name)}`} className={tocSubLink}>
                          <AliasedName kind="Alpha" name={String(a.name)} browse />
                        </a>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <a href={`#${BROWSE_SECTION_ACTIVITIES}`} className={tocLink}>
            {t.sectionActivities}
          </a>
          <ul className="mt-1.5 list-none space-y-2 border-l border-[var(--border)]/80 py-0.5 pl-3">
            {grouped.map((g) => {
              const items = g.activitySpaces as any[];
              const spaces = items.filter((s: any) => !isPracticeActivity(s));
              const byParent = new Map<string, any[]>();
              for (const s of spaces) {
                byParent.set(String(s.name), [...(s.activities ?? [])]);
              }
              for (const s of items) {
                if (isPracticeActivity(s)) {
                  const p = String(s.activitySpaceName ?? "").trim();
                  if (!p) continue;
                  if (!byParent.has(p)) byParent.set(p, []);
                  byParent.get(p)!.push(s);
                }
              }
              const spaceNames = new Set(spaces.map((s: any) => String(s.name)));
              const orphans = [...byParent.entries()].filter(([p]) => p && !spaceNames.has(p));
              return (
                <li key={`toc-activities-focus-${g.focusName}`}>
                  <a href={`#${browseActivitiesFocusSectionId(g.focusName)}`} className={tocSubLink}>
                    {g.focusName === IMPLICIT_FOCUS_NAME ? (
                      displayFocusName(g.focusName)
                    ) : (
                      <AliasedName kind="Focus" name={g.focusName} browse />
                    )}
                  </a>
                  <ul className="mt-1 list-none space-y-1.5 p-0">
                    {spaces.map((s: any) => (
                      <li key={`${g.focusName}-toc-space-${s.name}`}>
                        <a href={`#${activitySpaceId(s.name)}`} className={tocSubLink}>
                          <AliasedName kind="ActivitySpace" name={String(s.name)} browse />
                        </a>
                        <ul className="mt-0.5 list-none space-y-0.5 p-0 pl-2">
                          {(byParent.get(s.name) ?? [])
                            .slice()
                            .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
                            .map((act: any) => (
                              <li key={`${g.focusName}-toc-act-${s.name}-${act.name}`}>
                                <a href={`#${activityId(act.name)}`} className={tocLeafLink}>
                                  <AliasedName kind="Activity" name={String(act.name)} browse />
                                </a>
                              </li>
                            ))}
                        </ul>
                      </li>
                    ))}
                    {orphans.map(([parent, acts]) => (
                      <li key={`${g.focusName}-toc-orphan-${parent}`}>
                        <a href={`#${browseOrphanActsId(parent)}`} className={tocSubLink}>
                          <AliasedName kind="ActivitySpace" name={String(parent)} browse />
                          <span className="ml-1 font-normal text-[var(--muted)]">({t.practiceActivity})</span>
                        </a>
                        <ul className="mt-0.5 list-none space-y-0.5 p-0 pl-2">
                          {acts
                            .slice()
                            .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
                            .map((act: any) => (
                              <li key={`${g.focusName}-toc-orphan-act-${parent}-${act.name}`}>
                                <a href={`#${activityId(act.name)}`} className={tocLeafLink}>
                                  <AliasedName kind="Activity" name={String(act.name)} browse />
                                </a>
                              </li>
                            ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </li>
        {patterns.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-patterns" className={tocLink}>
              {t.patterns}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {patterns.map((p: any) => (
                <li key={`toc-pattern-${p.name}`}>
                  <a href={`#${patternId(p.name)}`} className={tocSubLink}>
                    <AliasedName kind="Pattern" name={String(p.name)} browse />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {hasCompetencies ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-competencies" className={tocLink}>
              {t.competencies}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {(baseline.competencies ?? [])
                .slice()
                .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
                .map((c: any) => (
                  <li key={`toc-comp-${c.name}`}>
                    <a href={`#${competencyId(c.name)}`} className={tocSubLink}>
                      <AliasedName kind="Competency" name={String(c.name)} browse />
                    </a>
                  </li>
                ))}
            </ul>
          </li>
        ) : null}
        {workProducts.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-work-products" className={tocLink}>
              {t.workProducts}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {workProducts.map((wp: any) => (
                <li key={`toc-wp-${wp.name}`}>
                  <a href={`#${workProductId(wp.name)}`} className={tocSubLink}>
                    <AliasedName kind="WorkProduct" name={String(wp.name)} browse />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {narrativeTypesBrowse.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-narrative-types" className={tocLink}>
              {t.narrativeTypesHeading}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {narrativeTypesBrowse.map((nt: any) => (
                <li key={`toc-nt-${nt.name}`}>
                  <a href={`#${narrativeTypeIdBrowse(String(nt.name))}`} className={tocSubLink}>
                    <AliasedName kind="NarrativeType" name={String(nt.name)} browse />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {personasBrowse.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-personas" className={tocLink}>
              {t.personasHeading}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {personasBrowse.map((p: any) => (
                <li key={`toc-persona-${p.name}`}>
                  <a href={`#${personaIdBrowseFn(String(p.name))}`} className={tocSubLink}>
                    <AliasedName kind="Persona" name={String(p.name)} browse />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {personaGroupsBrowse.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href="#browse-section-persona-groups" className={tocLink}>
              {t.personaGroupsHeading}
            </a>
            <ul className="mt-1 list-none space-y-0.5 border-l border-[var(--border)]/80 py-0.5 pl-3">
              {personaGroupsBrowse.map((pg: any) => (
                <li key={`toc-pg-${pg.name}`}>
                  <a href={`#${personaGroupIdBrowseFn(String(pg.name))}`} className={tocSubLink}>
                    <AliasedName kind="PersonaGroup" name={String(pg.name)} browse />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {aliases.length ? (
          <li className="border-t border-[var(--border)]/70 pt-2">
            <a href={`#${BROWSE_SECTION_ALIASES}`} className={tocLink}>
              {t.practiceElementAliasesHeading}
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

/** Text layout for library browse: heading scale, expandable states, activities nested under spaces. */
function BrowsePracticeFocusSections({
  baseline,
  grouped,
  t,
}: {
  baseline: PracticeBaseline;
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  t: LanguagePack;
}) {
  const displayFocusName = (nm: string) => (nm === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : nm);
  const lookup = usePracticeElementAliasLookup();
  const alphaId = (alphaName: string) => `alpha-${slug(alphaName)}`;
  const stateId = (alphaName: string, stateName: string) => `state-${slug(alphaName)}--${slug(stateName)}`;
  const activitySpaceId = (name: string) => `activity-space-${slug(name)}`;
  const competencyId = (name: string) => `competency-${slug(name)}`;
  const personaGroupId = (name: string) => `persona-group-${slug(name)}`;
  const workProductId = (name: string) => `work-product-${slug(name)}`;
  const activityId = (name: string) => `activity-${slug(name)}`;

  const isPracticeActivity = (s: any) =>
    s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";

  const browseActivityBody = (s: any) => {
    const contributesTo = dedupeContributesToRefs(s.contributesTo);
    return (
      <>
        {practiceElementDescriptionForDisplay(s) ? (
          <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(s)}</p>
        ) : null}
        <IrBrowseTagsBlock tags={s.tags} t={t} />
        {typeof s.activitySpaceName === "string" && s.activitySpaceName.trim() !== "" ? (
          <p className={`mt-2 ${BROWSE.bodyMuted}`}>
            {t.activityParentSpace}:{" "}
            <a href={`#${activitySpaceId(s.activitySpaceName.trim())}`} style={linkStyle()}>
              <code>
                <AliasedName kind="ActivitySpace" name={s.activitySpaceName.trim()} browse />
              </code>
            </a>
          </p>
        ) : null}
        {contributesTo.length ? (
          <p className={`mt-2 ${BROWSE.bodyMuted}`}>
            {t.contributesTo}:{" "}
            {contributesTo.map((c, idx) => (
              <span key={`${c.alphaName}:${c.stateName}`}>
                <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                  <code>
                    <AliasedName kind="Alpha" name={c.alphaName} browse />→
                    <AliasedName kind="State" name={c.stateName} browse />
                  </code>
                </a>
                {idx < contributesTo.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
        {s.requiredCompetencies?.length ? (
          <p className={`mt-2 ${BROWSE.bodyMuted}`}>
            {t.requiredCompetencies}:{" "}
            {s.requiredCompetencies.map((c: string, idx: number) => (
              <span key={c}>
                <a href={`#${competencyId(c)}`} style={linkStyle()}>
                  <code>
                    <AliasedName kind="Competency" name={c} browse />
                  </code>
                </a>
                {idx < s.requiredCompetencies.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
        {s.worksOn?.length ? (
          <p className={`mt-2 ${BROWSE.bodyMuted}`}>
            {t.worksOn}:{" "}
            {s.worksOn.map((w: any, idx: number) => (
              <span key={`${w.workProductName}:${w.levelOfDetailName}:${idx}`}>
                <a href={`#${workProductId(w.workProductName)}`} style={linkStyle()}>
                  <code>
                    <AliasedName kind="WorkProduct" name={w.workProductName} browse />→
                    <AliasedName kind="LevelOfDetail" name={w.levelOfDetailName} browse />
                  </code>
                </a>
                {idx < s.worksOn.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
        {s.recommendedCompetencyLevels?.length ? (
          <p className={`mt-2 ${BROWSE.bodyMuted}`}>
            {t.recommendedCompetencyLevels}:{" "}
            {s.recommendedCompetencyLevels.map((r: any, idx: number) => (
              <span key={`${r.competencyName}:${r.competencyLevelName}:${idx}`}>
                <code>
                  <AliasedName kind="Competency" name={r.competencyName} browse /> /{" "}
                  <AliasedName kind="CompetencyLevel" name={r.competencyLevelName} browse />
                </code>
                {idx < s.recommendedCompetencyLevels.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
      </>
    );
  };

  const alphaByNameAll = new Map<string, any>();
  for (const gg of grouped) {
    for (const x of gg.alphas ?? []) {
      if (x?.name) alphaByNameAll.set(String(x.name), x);
    }
  }

  const browseSupportingAlphaBody = (child: any) => (
    <>
      {practiceElementDescriptionForDisplay(child) ? (
        <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(child)}</p>
      ) : null}
      <IrBrowseTagsBlock tags={child.tags} t={t} />
      {typeof child.contributesTo === "string" && child.contributesTo.trim() !== "" ? (
        <p className={`mt-2 ${BROWSE.bodyMuted}`}>
          {t.alphaContributesToAlpha}:{" "}
          <a href={`#${alphaId(child.contributesTo.trim())}`} style={linkStyle()}>
            <code>
              <AliasedName kind="Alpha" name={child.contributesTo.trim()} browse />
            </code>
          </a>
        </p>
      ) : null}
    </>
  );

  const browseAlphaStatesDetails = (alpha: any) =>
    (alpha.states ?? []).length ? (
      <details className="mt-3 rounded-md border border-[var(--border)]/70 bg-[var(--panel)] px-2.5">
        <summary className="cursor-pointer select-none list-none py-2 text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
          {t.alphaStatesSection}
          <span className="ml-1.5 font-normal tabular-nums text-[var(--muted)]">({(alpha.states ?? []).length})</span>
        </summary>
        <div className="border-t border-[var(--border)]/60 pb-2 pt-1">
          <ul className="list-outside list-disc space-y-1.5 pl-4 text-[13px] leading-snug marker:text-[var(--muted)]">
            {alpha.states
              .slice()
              .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
              .map((st: any, stIdx: number) => (
                <li key={`browse-st-${slug(alpha.name)}-${stIdx}-${String(st.seq ?? "")}-${slug(String(st.name ?? ""))}`} className="pl-0.5">
                  <details id={stateId(alpha.name, st.name)} className="group">
                    <summary className="cursor-pointer list-none pr-2 text-[13px] leading-snug text-[var(--text)] [&::-webkit-details-marker]:hidden">
                      <span className="font-bold">
                        <AliasedName kind="State" name={st.name} browse />
                      </span>
                      {practiceElementDescriptionForDisplay(st) ? (
                        <span className="font-normal"> — {practiceElementDescriptionForDisplay(st)}</span>
                      ) : null}
                    </summary>
                    <div className="ml-0 mt-1.5 border-l-2 border-[var(--border)] pl-2.5">
                      <IrBrowseTagsBlock tags={st.tags} t={t} className="mt-1.5" />
                      {Array.isArray(st.checklist) && st.checklist.length ? (
                        <IrBrowseChecklistBullets
                          checklist={st.checklist}
                          t={t}
                          workProductId={workProductId}
                          listClassName="ml-3 mt-2 list-outside list-disc space-y-2 pl-4 text-[13px] leading-snug marker:text-[var(--muted)]"
                          itemKeyPrefix={`browse-ch-${slug(alpha.name)}-${stIdx}-${String(st.seq ?? "")}`}
                        />
                      ) : null}
                    </div>
                  </details>
                </li>
              ))}
          </ul>
        </div>
      </details>
    ) : null;

  const supportingAlphaNamesGlobal = new Set<string>();
  for (const gg of grouped) {
    for (const x of gg.alphas ?? []) {
      for (const raw of x.supportingAlphas ?? []) {
        const n = String(raw ?? "").trim();
        if (n) supportingAlphaNamesGlobal.add(n);
      }
    }
  }

  const focusGroupHeading = (i: number) =>
    i === 0 ? `${BROWSE.h3} mt-4` : `${BROWSE.h3} mt-10 border-t border-[var(--border)] pt-6`;

  return (
    <div className="flex flex-col">
      <h2 id={BROWSE_SECTION_ALPHAS} className={`${BROWSE.h2} scroll-mt-4`}>
        {t.sectionAlphas}
      </h2>
      <div className="mt-2 flex flex-col gap-3">
        {grouped
          .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.alphas ?? []).length > 0)
          .map((g) => (
          <DiagramForSingleFocusAlpha
            key={`alphas-diagram-${g.focusName}`}
            baseline={baseline}
            g={g}
            fitToWidth
            focusLabel={g.focusName === IMPLICIT_FOCUS_NAME ? displayFocusName(g.focusName) : undefined}
          />
        ))}
      </div>
      {grouped.map((g, gi) => (
        <div key={`${g.focusName}-alphas`} className="scroll-mt-4">
          <h3 id={browseAlphasFocusSectionId(g.focusName)} className={focusGroupHeading(gi)}>
            {g.focusName === IMPLICIT_FOCUS_NAME ? (
              displayFocusName(g.focusName)
            ) : (
              <AliasedName kind="Focus" name={g.focusName} browse />
            )}
          </h3>
          {g.focus && practiceElementDescriptionForDisplay(g.focus) ? (
            <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(g.focus)}</p>
          ) : null}
          <IrBrowseTagsBlock tags={g.focus?.tags} t={t} />
          <div className="mt-2 flex flex-col gap-8">
            {g.alphas
              .filter((a: any) => !supportingAlphaNamesGlobal.has(String(a.name)))
              .map((a: any) => (
                <section key={a.name} id={alphaId(a.name)}>
                  <h4 className={BROWSE.h4}>
                    <a href={`#${alphaId(a.name)}`} style={linkStyle()}>
                      <AliasedName kind="Alpha" name={a.name} browse />
                    </a>
                  </h4>
                  {practiceElementDescriptionForDisplay(a) ? (
                    <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(a)}</p>
                  ) : null}
                  <IrBrowseTagsBlock tags={a.tags} t={t} />
                  {Array.isArray(a.supportingAlphas) && a.supportingAlphas.length ? (
                    <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                      {t.alphaSupportingAlphas}:{" "}
                      {(a.supportingAlphas as unknown[])
                        .map((x) => String(x ?? "").trim())
                        .filter(Boolean)
                        .map((nm, idx, arr) => (
                          <span key={`${a.name}-sup-${nm}`}>
                            <a href={`#${alphaId(nm)}`} style={linkStyle()}>
                              <code>
                                <AliasedName kind="Alpha" name={nm} browse />
                              </code>
                            </a>
                            {idx < arr.length - 1 ? ", " : ""}
                          </span>
                        ))}
                    </p>
                  ) : null}
                  {typeof a.contributesTo === "string" && a.contributesTo.trim() !== "" ? (
                    <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                      {t.alphaContributesToAlpha}:{" "}
                      <a href={`#${alphaId(a.contributesTo.trim())}`} style={linkStyle()}>
                        <code>
                          <AliasedName kind="Alpha" name={a.contributesTo.trim()} browse />
                        </code>
                      </a>
                    </p>
                  ) : null}
                  {browseAlphaStatesDetails(a)}
                  {(() => {
                    const supportingNames = Array.isArray(a.supportingAlphas)
                      ? a.supportingAlphas.map((x: string) => String(x ?? "").trim()).filter(Boolean)
                      : [];
                    if (!supportingNames.length) return null;
                    const sorted = supportingNames.slice().sort((x: string, y: string) => x.localeCompare(y));
                    return (
                      <details open className="mt-3 rounded-md border border-[var(--border)]/70 bg-[var(--panel)] px-2.5">
                        <summary className="cursor-pointer select-none list-none py-2 text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
                          {t.alphaSupportingAlphas}
                          <span className="ml-1.5 font-normal tabular-nums text-[var(--muted)]">({sorted.length})</span>
                        </summary>
                        <div className="flex flex-col gap-3 border-t border-[var(--border)]/60 pb-2 pt-2">
                          {sorted.map((nm: string) => {
                            const child = alphaByNameAll.get(nm);
                            return (
                              <div
                                key={`${a.name}-supporting-${nm}`}
                                id={alphaId(nm)}
                                className="ml-3 border-l-2 border-[var(--border)] pl-3"
                                role="group"
                                aria-label={`${t.alphaSupportingAlphas}: ${nm}`}
                              >
                                <h5 className="text-[15px] font-semibold text-[var(--text)]">
                                  <a href={`#${alphaId(nm)}`} style={linkStyle()}>
                                    <AliasedName kind="Alpha" name={nm} browse />
                                  </a>
                                </h5>
                                {child ? browseSupportingAlphaBody(child) : null}
                                {child ? browseAlphaStatesDetails(child) : null}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })()}
                </section>
              ))}
          </div>
        </div>
      ))}

      <h2 id={BROWSE_SECTION_ACTIVITIES} className={`${BROWSE.h2Global} scroll-mt-4`}>
        {t.sectionActivities}
      </h2>
      <div className="mt-2 flex flex-col gap-3">
        {grouped
          .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.activitySpaces ?? []).length > 0)
          .map((g) => (
          <DiagramForSingleFocusActivity
            key={`activities-diagram-${g.focusName}`}
            baseline={baseline}
            g={g}
            fitToWidth
            focusLabel={g.focusName === IMPLICIT_FOCUS_NAME ? displayFocusName(g.focusName) : undefined}
          />
        ))}
      </div>
      {grouped.map((g, gai) => {
        const items = g.activitySpaces as any[];
        const spaces = items.filter((s: any) => !isPracticeActivity(s));
        const byParent = new Map<string, any[]>();
        for (const s of spaces) {
          byParent.set(String(s.name), [...(s.activities ?? [])]);
        }
        for (const s of items) {
          if (isPracticeActivity(s)) {
            const p = String(s.activitySpaceName ?? "").trim();
            if (!p) continue;
            if (!byParent.has(p)) byParent.set(p, []);
            byParent.get(p)!.push(s);
          }
        }
        const spaceNames = new Set(spaces.map((s: any) => String(s.name)));
        return (
          <div key={`${g.focusName}-activities`} className="scroll-mt-4">
            <h3 id={browseActivitiesFocusSectionId(g.focusName)} className={focusGroupHeading(gai)}>
              {g.focusName === IMPLICIT_FOCUS_NAME ? (
                displayFocusName(g.focusName)
              ) : (
                <AliasedName kind="Focus" name={g.focusName} browse />
              )}
            </h3>
            {g.focus && practiceElementDescriptionForDisplay(g.focus) ? (
              <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(g.focus)}</p>
            ) : null}
            <div className="mt-2 flex flex-col gap-8">
              {spaces.map((s: any) => (
                <section key={s.name} id={activitySpaceId(s.name)}>
                  <h4 className={BROWSE.h4}>
                    <a href={`#${activitySpaceId(s.name)}`} style={linkStyle()}>
                      <AliasedName kind="ActivitySpace" name={s.name} browse />
                    </a>
                  </h4>
                  {practiceElementDescriptionForDisplay(s) ? (
                    <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(s)}</p>
                  ) : null}
                  <IrBrowseTagsBlock tags={s.tags} t={t} />
                  {dedupeContributesToRefs(s.contributesTo).length ? (
                    <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                      {t.contributesTo}:{" "}
                      {dedupeContributesToRefs(s.contributesTo).map((c, idx, arr) => (
                        <span key={`${c.alphaName}:${c.stateName}`}>
                          <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                            <code>
                              <AliasedName kind="Alpha" name={c.alphaName} browse />→
                              <AliasedName kind="State" name={c.stateName} browse />
                            </code>
                          </a>
                          {idx < arr.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {s.requiredCompetencies?.length ? (
                    <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                      {t.requiredCompetencies}:{" "}
                      {s.requiredCompetencies.map((c: string, idx: number) => (
                        <span key={c}>
                          <a href={`#${competencyId(c)}`} style={linkStyle()}>
                            <code>
                              <AliasedName kind="Competency" name={c} browse />
                            </code>
                          </a>
                          {idx < s.requiredCompetencies.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {s.involves?.length ? (
                    <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                      {t.activitySpaceInvolvesPersonaGroups}:{" "}
                      {s.involves.map((g: string, idx: number) => (
                        <span key={g}>
                          <a href={`#${personaGroupId(g)}`} style={linkStyle()}>
                            <code>
                              <AliasedName kind="PersonaGroup" name={g} browse />
                            </code>
                          </a>
                          {idx < s.involves.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {(byParent.get(s.name) ?? [])
                    .slice()
                    .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
                    .map((act: any) => (
                      <div
                        key={act.name}
                        id={activityId(act.name)}
                        className="ml-4 mt-4 border-l-2 border-[var(--border)] pl-4"
                      >
                        <h5 className={BROWSE.h5}>
                          <a href={`#${activityId(act.name)}`} style={linkStyle()}>
                            <AliasedName kind="Activity" name={act.name} browse />
                          </a>
                        </h5>
                        {browseActivityBody(act)}
                      </div>
                    ))}
                </section>
              ))}
            </div>

            {[...byParent.entries()]
              .filter(([p]) => p && !spaceNames.has(p))
              .map(([parent, acts]) => (
                <div key={`orphan-${g.focusName}-${parent}`} id={browseOrphanActsId(parent)} className="mt-10 scroll-mt-4">
                  <h4 className={BROWSE.h4}>
                    <AliasedName kind="ActivitySpace" name={parent} browse />
                  </h4>
                  <p className={`mt-1 ${BROWSE.bodyMuted}`}>
                    Activities list this activity space; no matching space in this focus.
                  </p>
                  {acts
                    .slice()
                    .sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
                    .map((act: any) => (
                      <div
                        key={act.name}
                        id={activityId(act.name)}
                        className="ml-4 mt-4 border-l-2 border-[var(--border)] pl-4"
                      >
                        <h5 className={BROWSE.h5}>
                          <a href={`#${activityId(act.name)}`} style={linkStyle()}>
                            <AliasedName kind="Activity" name={act.name} browse />
                          </a>
                        </h5>
                        {browseActivityBody(act)}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function PracticeBaselineView({
  baseline,
  grouped,
  sourceDoc,
  variant = "default",
  methodComposition,
}: {
  baseline: PracticeBaseline;
  grouped: { focusName: string; focus: any | null; alphas: any[]; activitySpaces: any[] }[];
  /** Original parsed document (for Practice-only fields: baselinePracticeName, workProducts, …). */
  sourceDoc?: Record<string, unknown> | null;
  variant?: PracticeHumanReadableVariant;
  methodComposition?: Method;
}) {
  const { t } = useLanguagePack();
  const browse = variant === "browse";
  const browsePracticeElementAliases: PracticeElementAlias[] = Array.isArray(sourceDoc?.practiceElementAliases)
    ? (sourceDoc!.practiceElementAliases as PracticeElementAlias[])
    : [];
  const aliasLookup = usePracticeElementAliasLookup();
  const displayFocusName = (nm: string) => (nm === IMPLICIT_FOCUS_NAME ? t.implicitFocusName : nm);

  const provenanceExtBaseline = extendsBaselineDisplayName(sourceDoc ?? null);
  const alphaId = (alphaName: string) => `alpha-${slug(alphaName)}`;
  const stateId = (alphaName: string, stateName: string) => `state-${slug(alphaName)}--${slug(stateName)}`;
  const activitySpaceId = (name: string) => `activity-space-${slug(name)}`;
  const competencyId = (name: string) => `competency-${slug(name)}`;
  const workProductId = (name: string) => `work-product-${slug(name)}`;
  const activityId = (name: string) => `activity-${slug(name)}`;
  const narrativeTypeIdPv = (name: string) => `narrative-type-${slug(name)}`;
  const personaIdPv = (name: string) => `persona-${slug(name)}`;
  const personaGroupIdPv = (name: string) => `persona-group-${slug(name)}`;
  const patternId = (name: string) => `pattern-${slug(name)}`;

  const isPracticeActivity = (s: any) =>
    s && typeof s.activitySpaceName === "string" && String(s.activitySpaceName).trim() !== "";

  const lookupAlphaAcrossFocus = (nm: string) => {
    for (const gg of grouped) {
      const hit = (gg.alphas ?? []).find((x: any) => String(x?.name) === nm);
      if (hit) return hit;
    }
    return null as any;
  };

  const supportingAlphaNamesGlobal = useMemo(() => {
    const s = new Set<string>();
    for (const gg of grouped) {
      for (const x of gg.alphas ?? []) {
        for (const raw of x.supportingAlphas ?? []) {
          const n = String(raw ?? "").trim();
          if (n) s.add(n);
        }
      }
    }
    return s;
  }, [grouped]);

  const defaultAlphaStatesDetails = (alpha: any) =>
    (alpha.states ?? []).length ? (
      <details className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]/50 px-2">
        <summary className="cursor-pointer select-none list-none py-2.5 text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
          {t.alphaStatesSection}
          <span className="ml-1.5 font-normal tabular-nums">({(alpha.states ?? []).length})</span>
        </summary>
        <div className="border-t border-[var(--border)]/70 px-1 pb-2 pt-1">
          <ol className="m-0 list-decimal space-y-1.5 pl-5 text-[12px] leading-snug text-[var(--text)] marker:text-[var(--muted)]">
            {alpha.states
              .slice()
              .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
              .map((s: any, stateIdx: number) => (
                  <li
                    key={`alpha-state-${slug(alpha.name)}-${stateIdx}-${String(s.seq ?? "")}-${slug(String(s.name ?? ""))}`}
                    id={stateId(alpha.name, s.name)}
                    style={{ marginBottom: 6 }}
                  >
                    <a href={`#${stateId(alpha.name, s.name)}`} style={{ ...linkStyle(), fontSize: 12, lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 700 }}>
                        <AliasedName kind="State" name={s.name} browse={browse} />
                      </span>
                      {practiceElementDescriptionForDisplay(s) ? (
                        <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                          {" "}
                          — {practiceElementDescriptionForDisplay(s)}
                        </span>
                      ) : null}
                    </a>
                    {flattenPracticeElementTags(s.tags).length ? (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                        {flattenPracticeElementTags(s.tags).map((x: string, ti: number) => (
                          <span key={`${stateIdx}-tag-${ti}-${slug(x)}`} style={tag()}>
                            {x}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(s.checklist) && s.checklist.length ? (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{t.checklist}</div>
                        <ol style={{ margin: "3px 0 0", paddingLeft: 16, fontSize: 11, lineHeight: 1.35 }}>
                          {s.checklist
                            .slice()
                            .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                            .map((ch: any, chIdx: number) => (
                                <li
                                  key={`chk-${slug(alpha.name)}-${stateIdx}-${String(s.seq ?? "")}-${chIdx}-${String(ch.seq ?? "")}-${slug(String(ch.name ?? ""))}`}
                                  style={{ marginBottom: 3 }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    <AliasedName kind="Checklist" name={ch.name} browse={browse} />
                                  </span>
                                  {practiceElementDescriptionForDisplay(ch) ? (
                                    <span style={{ color: "var(--muted)" }}> — {practiceElementDescriptionForDisplay(ch)}</span>
                                  ) : null}
                                </li>
                            ))}
                        </ol>
                      </div>
                    ) : null}
                  </li>
              ))}
          </ol>
        </div>
      </details>
    ) : null;

  return (
    <div className={browse ? "flex flex-col gap-6" : ""} style={browse ? undefined : { display: "grid", gap: 14 }}>
      <div>
        {browse ? (
          <>
            <p id="practice-readable-title" className={`${BROWSE.docTitle} scroll-mt-4`}>
              <AliasedName kind="PracticeBaseline" name={baseline.name} browse />
            </p>
            {baseline.description ? <p className={BROWSE.docSubtitle}>{baseline.description}</p> : null}
            <IrBrowseTagsBlock tags={baseline.tags} t={t} className="mt-4" />
            <p className={BROWSE.meta}>
              Authors: {(baseline.authors ?? []).join(", ")} • Version: {baseline.version ?? ""} • Updated:{" "}
              {baseline.updatedAt ?? ""}
            </p>
            {(baseline.keywords ?? []).length ? (
              <p className={BROWSE.meta}>
                <span className="font-semibold">{t.keywords}: </span>
                {(baseline.keywords ?? []).join(", ")}
              </p>
            ) : null}
            {methodComposition ? (
              <MethodComposingPracticesBrowse method={methodComposition} t={t} />
            ) : (
              <>
                {provenanceExtBaseline ? (
                  <p className={BROWSE.meta}>
                    <span className="font-semibold">{t.extendsBaseline}: </span>
                    <code>{provenanceExtBaseline}</code>
                  </p>
                ) : null}
                {Array.isArray(sourceDoc?.practiceDependencyNames) &&
                (sourceDoc!.practiceDependencyNames as string[]).length ? (
                  <p className={BROWSE.meta}>
                    <span className="font-semibold">{t.practiceDependencies}: </span>
                    {(sourceDoc!.practiceDependencyNames as string[]).join(", ")}
                  </p>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              <AliasedName kind="PracticeBaseline" name={baseline.name} browse={false} />
            </div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>{baseline.description}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {flattenPracticeElementTags(baseline.tags).map((tagLabel, ti) => (
                <span key={`baseline-tag-${ti}-${slug(tagLabel)}`} style={tag()}>
                  {tagLabel}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
              Authors: {(baseline.authors ?? []).join(", ")} • Version: {baseline.version ?? ""} • Updated: {baseline.updatedAt ?? ""}
            </div>
            {(baseline.keywords ?? []).length ? (
              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{t.keywords}: </span>
                {(baseline.keywords ?? []).join(", ")}
              </div>
            ) : null}
            {provenanceExtBaseline ? (
              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{t.extendsBaseline}: </span>
                <code>{provenanceExtBaseline}</code>
              </div>
            ) : null}
            {Array.isArray(sourceDoc?.practiceDependencyNames) && (sourceDoc!.practiceDependencyNames as string[]).length ? (
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{t.practiceDependencies}: </span>
                {(sourceDoc!.practiceDependencyNames as string[]).join(", ")}
              </div>
            ) : null}
          </>
        )}
      </div>

      {browse ? (
        <BrowsePracticeFocusSections baseline={baseline} grouped={grouped} t={t} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            id={BROWSE_SECTION_ALPHAS}
            style={{ fontSize: 16, fontWeight: 800, borderTop: "1px solid var(--border)", paddingTop: 14 }}
          >
            {t.sectionAlphas}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {grouped
              .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.alphas ?? []).length > 0)
              .map((g) => (
              <DiagramForSingleFocusAlpha
                key={`alphas-diagram-${g.focusName}`}
                baseline={baseline}
                g={g}
                fitToWidth
                focusLabel={displayFocusName(g.focusName)}
              />
            ))}
          </div>
          {grouped.map((g) => (
            <div
              key={`${g.focusName}-alphas`}
              id={browseAlphasFocusSectionId(g.focusName)}
              style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}
            >
              <div style={{ fontSize: 16, fontWeight: 800 }}>{displayFocusName(g.focusName)}</div>
            {g.focus && practiceElementDescriptionForDisplay(g.focus) ? (
              <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(g.focus)}</div>
            ) : null}

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {g.alphas
                  .filter((a: any) => !supportingAlphaNamesGlobal.has(String(a.name)))
                  .map((a: any) => (
                  <div
                    key={a.name}
                    id={alphaId(a.name)}
                    style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10 }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      <a href={`#${alphaId(a.name)}`} style={linkStyle()}>
                        {a.name}
                      </a>
                    </div>
                    {practiceElementDescriptionForDisplay(a) ? (
                      <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(a)}</div>
                    ) : null}
                    {flattenPracticeElementTags(a.tags).length ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                        {flattenPracticeElementTags(a.tags).map((x, ti) => (
                          <span key={`${a.name}-tag-${ti}-${slug(x)}`} style={tag()}>
                            {x}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {typeof a.contributesTo === "string" && a.contributesTo.trim() !== "" ? (
                      <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                        {t.alphaContributesToAlpha}:{" "}
                        <a href={`#${alphaId(a.contributesTo.trim())}`} style={linkStyle()}>
                          <code>{a.contributesTo.trim()}</code>
                        </a>
                      </div>
                    ) : null}
                    {defaultAlphaStatesDetails(a)}
                    {(() => {
                      const supportingNames = Array.isArray(a.supportingAlphas)
                        ? a.supportingAlphas.map((x: string) => String(x ?? "").trim()).filter(Boolean)
                        : [];
                      if (!supportingNames.length) return null;
                      const sorted = supportingNames.slice().sort((x: string, y: string) => x.localeCompare(y));
                      return (
                        <details open className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]/50 px-2">
                          <summary className="cursor-pointer select-none list-none py-2.5 text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
                            {t.alphaSupportingAlphas}
                            <span className="ml-1.5 font-normal tabular-nums">({sorted.length})</span>
                          </summary>
                          <div className="flex flex-col gap-2.5 border-t border-[var(--border)]/70 px-1 py-2">
                            {sorted.map((nm: string) => {
                              const child = lookupAlphaAcrossFocus(nm);
                              return (
                                <div
                                  key={`${a.name}-supporting-${nm}`}
                                  id={alphaId(nm)}
                                  role="group"
                                  aria-label={`${t.alphaSupportingAlphas}: ${nm}`}
                                  style={{
                                    padding: 10,
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    borderLeft: "4px solid rgba(139, 92, 246, 0.65)",
                                  }}
                                >
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.04em" }}>
                                    {t.alpha}
                                  </div>
                                  <div style={{ fontWeight: 800, marginTop: 3, fontSize: 14 }}>
                                    <a href={`#${alphaId(nm)}`} style={linkStyle()}>
                                      {nm}
                                    </a>
                                  </div>
                                  <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
                                    {t.withinRollupAlpha}:{" "}
                                    <a href={`#${alphaId(a.name)}`} style={linkStyle()}>
                                      <code>{a.name}</code>
                                    </a>
                                  </div>
                                  {child && practiceElementDescriptionForDisplay(child) ? (
                                    <div style={{ color: "var(--muted)", marginTop: 5, fontSize: 12 }}>
                                      {practiceElementDescriptionForDisplay(child)}
                                    </div>
                                  ) : null}
                                  {child && flattenPracticeElementTags(child.tags).length ? (
                                    <div
                                      style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
                                    >
                                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                                      {flattenPracticeElementTags(child.tags).map((x: string, ti: number) => (
                                        <span key={`supporting-tag-${nm}-${ti}-${slug(x)}`} style={tag()}>
                                          {x}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  {child && typeof child.contributesTo === "string" && child.contributesTo.trim() !== "" ? (
                                    <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                                      {t.alphaContributesToAlpha}:{" "}
                                      <a href={`#${alphaId(child.contributesTo.trim())}`} style={linkStyle()}>
                                        <code>{child.contributesTo.trim()}</code>
                                      </a>
                                    </div>
                                  ) : null}
                                  {child ? defaultAlphaStatesDetails(child) : null}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
          ))}

          <div
            id={BROWSE_SECTION_ACTIVITIES}
            style={{ fontSize: 16, fontWeight: 800, borderTop: "1px solid var(--border)", paddingTop: 14 }}
          >
            {t.sectionActivities}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {grouped
              .filter((g) => g.focusName !== IMPLICIT_FOCUS_NAME || (g.activitySpaces ?? []).length > 0)
              .map((g) => (
              <DiagramForSingleFocusActivity
                key={`activities-diagram-${g.focusName}`}
                baseline={baseline}
                g={g}
                fitToWidth
                focusLabel={displayFocusName(g.focusName)}
              />
            ))}
          </div>
          {grouped.map((g) => (
            <div
              key={`${g.focusName}-act`}
              id={browseActivitiesFocusSectionId(g.focusName)}
              style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}
            >
              <div style={{ fontSize: 16, fontWeight: 800 }}>{displayFocusName(g.focusName)}</div>
              {g.focus && practiceElementDescriptionForDisplay(g.focus) ? (
                <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(g.focus)}</div>
              ) : null}
              <div style={{ display: "grid", gap: 10 }}>
                {g.activitySpaces.map((s: any) => {
                  if (isPracticeActivity(s)) {
                    const parent = String(s.activitySpaceName).trim();
                    return (
                      <div
                        key={`activity:${s.name}`}
                        id={activityId(s.name)}
                        style={{
                          padding: 12,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          borderLeft: "4px solid rgba(139, 92, 246, 0.65)",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.04em" }}>
                          {t.practiceActivity}
                        </div>
                        <div style={{ fontWeight: 800, marginTop: 4 }}>
                          <AliasedName kind="Activity" name={s.name} browse={browse} />
                        </div>
                        <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                          {t.withinActivitySpace}:{" "}
                          <a href={`#${activitySpaceId(parent)}`} style={linkStyle()}>
                            <code>
                              <AliasedName kind="ActivitySpace" name={parent} browse={browse} />
                            </code>
                          </a>
                        </div>
                        {practiceElementDescriptionForDisplay(s) ? (
                          <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(s)}</div>
                        ) : null}
                        {flattenPracticeElementTags(s.tags).length ? (
                          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                            {flattenPracticeElementTags(s.tags).map((x: string, ti: number) => (
                              <span key={`aspace-${slug(s.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                                {x}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {dedupeContributesToRefs(s.contributesTo).length ? (
                          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                            {t.contributesTo}:{" "}
                            {dedupeContributesToRefs(s.contributesTo).map((c, idx, arr) => (
                              <span key={`${c.alphaName}:${c.stateName}`}>
                                <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                                  <code>
                                    <AliasedName kind="Alpha" name={c.alphaName} browse={browse} />→
                                    <AliasedName kind="State" name={c.stateName} browse={browse} />
                                  </code>
                                </a>
                                {idx < arr.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {s.requiredCompetencies?.length ? (
                          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                            {t.requiredCompetencies}:{" "}
                            {s.requiredCompetencies.map((c: string, idx: number) => (
                              <span key={c}>
                                <a href={`#${competencyId(c)}`} style={linkStyle()}>
                                  <code>{c}</code>
                                </a>
                                {idx < s.requiredCompetencies.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {s.worksOn?.length ? (
                          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                            {t.worksOn}:{" "}
                            {s.worksOn.map((w: any, idx: number) => (
                              <span key={`${w.workProductName}:${w.levelOfDetailName}:${idx}`}>
                                <a href={`#${workProductId(w.workProductName)}`} style={linkStyle()}>
                                  <code>
                                    <AliasedName kind="WorkProduct" name={w.workProductName} browse={browse} />→
                                        <AliasedName kind="LevelOfDetail" name={w.levelOfDetailName} browse={browse} />
                                  </code>
                                </a>
                                {idx < s.worksOn.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {s.recommendedCompetencyLevels?.length ? (
                          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                            {t.recommendedCompetencyLevels}:{" "}
                            {s.recommendedCompetencyLevels.map((r: any, idx: number) => (
                              <span key={`${r.competencyName}:${r.competencyLevelName}:${idx}`}>
                                <code>
                                  <AliasedName kind="Competency" name={r.competencyName} browse={browse} /> /{" "}
                                  <AliasedName kind="CompetencyLevel" name={r.competencyLevelName} browse={browse} />
                                </code>
                                {idx < s.recommendedCompetencyLevels.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={s.name}
                      id={activitySpaceId(s.name)}
                      style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10 }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        <a href={`#${activitySpaceId(s.name)}`} style={linkStyle()}>
                          {s.name}
                        </a>
                      </div>
                      {practiceElementDescriptionForDisplay(s) ? (
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(s)}</div>
                      ) : null}
                      {flattenPracticeElementTags(s.tags).length ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                          {flattenPracticeElementTags(s.tags).map((x: string, ti: number) => (
                            <span key={`aspace-${slug(s.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                              {x}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {dedupeContributesToRefs(s.contributesTo).length ? (
                        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                          {t.contributesTo}:{" "}
                          {dedupeContributesToRefs(s.contributesTo).map((c, idx, arr) => (
                            <span key={`${c.alphaName}:${c.stateName}`}>
                              <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                                <code>
                                  <AliasedName kind="Alpha" name={c.alphaName} browse={browse} />→
                                    <AliasedName kind="State" name={c.stateName} browse={browse} />
                                </code>
                              </a>
                              {idx < arr.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {s.requiredCompetencies?.length ? (
                        <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                          {t.requiredCompetencies}:{" "}
                          {s.requiredCompetencies.map((c: string, idx: number) => (
                            <span key={c}>
                              <a href={`#${competencyId(c)}`} style={linkStyle()}>
                                <code>{c}</code>
                              </a>
                              {idx < s.requiredCompetencies.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {s.involves?.length ? (
                        <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                          {t.activitySpaceInvolvesPersonaGroups}:{" "}
                          {s.involves.map((g: string, idx: number) => (
                            <span key={g}>
                              <a href={`#${personaGroupIdPv(g)}`} style={linkStyle()}>
                                <code>
                                  <AliasedName kind="PersonaGroup" name={g} browse={browse} />
                                </code>
                              </a>
                              {idx < s.involves.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {(s.activities ?? []).map((act: any) => {
                        const parent = String(s.name).trim();
                        return (
                          <div
                            key={`nested:${parent}:${act.name}`}
                            id={activityId(act.name)}
                            style={{
                              marginTop: 10,
                              padding: 12,
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              borderLeft: "4px solid rgba(139, 92, 246, 0.65)",
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.04em" }}>
                              {t.practiceActivity}
                            </div>
                            <div style={{ fontWeight: 800, marginTop: 4 }}>{act.name}</div>
                            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                              {t.withinActivitySpace}:{" "}
                              <a href={`#${activitySpaceId(parent)}`} style={linkStyle()}>
                                <code>{parent}</code>
                              </a>
                            </div>
                            {practiceElementDescriptionForDisplay(act) ? (
                              <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(act)}</div>
                            ) : null}
                            {flattenPracticeElementTags(act.tags).length ? (
                              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                                {flattenPracticeElementTags(act.tags).map((x: string, ti: number) => (
                                  <span key={`activity-${slug(parent)}-${slug(act.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                                    {x}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {dedupeContributesToRefs(act.contributesTo).length ? (
                              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                                {t.contributesTo}:{" "}
                                {dedupeContributesToRefs(act.contributesTo).map((c, idx, arr) => (
                                  <span key={`${c.alphaName}:${c.stateName}`}>
                                    <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                                      <code>
                                        <AliasedName kind="Alpha" name={c.alphaName} browse={browse} />→
                                    <AliasedName kind="State" name={c.stateName} browse={browse} />
                                      </code>
                                    </a>
                                    {idx < arr.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {act.requiredCompetencies?.length ? (
                              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                                {t.requiredCompetencies}:{" "}
                                {act.requiredCompetencies.map((c: string, idx: number) => (
                                  <span key={c}>
                                    <a href={`#${competencyId(c)}`} style={linkStyle()}>
                                      <code>{c}</code>
                                    </a>
                                    {idx < act.requiredCompetencies.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {act.worksOn?.length ? (
                              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                                {t.worksOn}:{" "}
                                {act.worksOn.map((w: any, idx: number) => (
                                  <span key={`${w.workProductName}:${w.levelOfDetailName}:${idx}`}>
                                    <a href={`#${workProductId(w.workProductName)}`} style={linkStyle()}>
                                      <code>
                                        <AliasedName kind="WorkProduct" name={w.workProductName} browse={browse} />→
                                        <AliasedName kind="LevelOfDetail" name={w.levelOfDetailName} browse={browse} />
                                      </code>
                                    </a>
                                    {idx < act.worksOn.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {act.recommendedCompetencyLevels?.length ? (
                              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                                {t.recommendedCompetencyLevels}:{" "}
                                {act.recommendedCompetencyLevels.map((r: any, idx: number) => (
                                  <span key={`${r.competencyName}:${r.competencyLevelName}:${idx}`}>
                                    <code>
                                      <AliasedName kind="Competency" name={r.competencyName} browse={browse} /> /{" "}
                                      <AliasedName kind="CompetencyLevel" name={r.competencyLevelName} browse={browse} />
                                    </code>
                                    {idx < act.recommendedCompetencyLevels.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
        ))}
        </div>
      )}

      {Array.isArray(sourceDoc?.patterns) && (sourceDoc!.patterns as any[]).length ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          {browse ? (
            <h2 id="browse-section-patterns" className={`${BROWSE.h2Global} scroll-mt-4`}>
              {t.patterns}
            </h2>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 800 }}>{t.patterns}</div>
          )}
          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            {(sourceDoc!.patterns as any[]).map((p: any) => (
              <div
                key={p.name}
                id={patternId(p.name)}
                style={
                  browse
                    ? { marginTop: 8 }
                    : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                }
              >
                {browse ? (
                  <h3 className={BROWSE.h3Item}>
                    <AliasedName kind="Pattern" name={p.name} browse />
                  </h3>
                ) : (
                  <div style={{ fontWeight: 800 }}>
                    <AliasedName kind="Pattern" name={p.name} browse={false} />
                  </div>
                )}
                {practiceElementDescriptionForDisplay(p) ? (
                  browse ? (
                    <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(p)}</p>
                  ) : (
                    <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(p)}</div>
                  )
                ) : null}
                {browse ? (
                  <IrBrowseTagsBlock tags={p.tags} t={t} />
                ) : flattenPracticeElementTags(p.tags).length ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                    {flattenPracticeElementTags(p.tags).map((x: string, ti: number) => (
                      <span key={`pattern-${slug(p.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                        {x}
                      </span>
                    ))}
                  </div>
                ) : null}
                {browse ? (
                  <IrBrowsePatternViewsSection
                    pattern={p}
                    t={t}
                    stateId={stateId}
                    activitySpaceId={activitySpaceId}
                    activityId={activityId}
                  />
                ) : null}

                <DiagramPatternMatrix pattern={p} baseline={baseline} fitToWidth />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        {browse ? (
          <h2 id="browse-section-competencies" className={`${BROWSE.h2Global} scroll-mt-4`}>
            {t.competencies}
          </h2>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 800 }}>{t.competencies}</div>
        )}
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {(baseline.competencies ?? [])
            .slice()
            .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
            .map((c: any) => (
              <div
                key={c.name}
                id={competencyId(c.name)}
                style={
                  browse
                    ? { marginTop: 8 }
                    : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                }
              >
                {browse ? (
                  <h3 className={BROWSE.h3Item}>
                    <a href={`#${competencyId(c.name)}`} style={linkStyle()}>
                      <AliasedName kind="Competency" name={c.name} browse />
                    </a>
                  </h3>
                ) : (
                  <div style={{ fontWeight: 800 }}>
                    <a href={`#${competencyId(c.name)}`} style={linkStyle()}>
                      <AliasedName kind="Competency" name={c.name} browse={false} />
                    </a>
                  </div>
                )}
                {practiceElementDescriptionForDisplay(c) ? (
                  browse ? (
                    <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(c)}</p>
                  ) : (
                    <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(c)}</div>
                  )
                ) : null}
                {browse ? (
                  <IrBrowseTagsBlock tags={c.tags} t={t} />
                ) : flattenPracticeElementTags(c.tags).length ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                    {flattenPracticeElementTags(c.tags).map((x: string, ti: number) => (
                      <span key={`competency-${slug(c.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                        {x}
                      </span>
                    ))}
                  </div>
                ) : null}
                {Array.isArray(c.levels) && c.levels.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.levels}</div>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {c.levels
                        .slice()
                        .sort((x: any, y: any) => (x.level ?? 0) - (y.level ?? 0))
                        .map((lvl: any) => (
                          <li key={`${c.name}:${lvl.level}:${lvl.name}`} style={{ marginBottom: 6 }}>
                            <b>
                              <AliasedName kind="CompetencyLevel" name={lvl.name} browse={browse} /> (Level {lvl.level})
                            </b>
                            {practiceElementDescriptionForDisplay(lvl) ? (
                              <span style={{ color: "var(--muted)" }}>: {practiceElementDescriptionForDisplay(lvl)}</span>
                            ) : null}
                            {browse ? <IrBrowseTagsBlock tags={lvl.tags} t={t} className="mt-1.5" /> : null}
                          </li>
                        ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>

      {Array.isArray(sourceDoc?.workProducts) && (sourceDoc!.workProducts as any[]).length ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          {browse ? (
            <h2 id="browse-section-work-products" className={`${BROWSE.h2Global} scroll-mt-4`}>
              {t.workProducts}
            </h2>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 800 }}>{t.workProducts}</div>
          )}
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {(sourceDoc!.workProducts as any[]).map((wp: any) => (
              <div
                key={wp.name}
                id={workProductId(wp.name)}
                style={
                  browse
                    ? { marginTop: 8 }
                    : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                }
              >
                {browse ? (
                  <h3 className={BROWSE.h3Item}>
                    <AliasedName kind="WorkProduct" name={wp.name} browse />
                  </h3>
                ) : (
                  <div style={{ fontWeight: 800 }}>
                    <AliasedName kind="WorkProduct" name={wp.name} browse={false} />
                  </div>
                )}
                {practiceElementDescriptionForDisplay(wp) ? (
                  browse ? (
                    <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(wp)}</p>
                  ) : (
                    <div style={{ color: "var(--muted)", marginTop: 6 }}>{practiceElementDescriptionForDisplay(wp)}</div>
                  )
                ) : null}
                {browse ? (
                  <IrBrowseTagsBlock tags={wp.tags} t={t} />
                ) : flattenPracticeElementTags(wp.tags).length ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.tags}:</span>
                    {flattenPracticeElementTags(wp.tags).map((x: string, ti: number) => (
                      <span key={`workproduct-${slug(wp.name)}-tag-${ti}-${slug(x)}`} style={tag()}>
                        {x}
                      </span>
                    ))}
                  </div>
                ) : null}
                {browse ? (
                  <>
                    <p className="mt-4 text-sm font-semibold text-[var(--text)]">{t.levels}</p>
                    <ul className="mt-2 list-outside list-disc space-y-4 pl-5 text-[15px] marker:text-[var(--muted)]">
                      {(wp.levelsOfDetail ?? [])
                        .slice()
                        .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                        .map((lod: any) => (
                          <li key={lod.name}>
                            <span className="font-semibold text-[var(--text)]">
                              <AliasedName kind="LevelOfDetail" name={lod.name} browse />
                            </span>
                            {practiceElementDescriptionForDisplay(lod) ? (
                              <p className={`mt-1 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(lod)}</p>
                            ) : null}
                            <IrBrowseTagsBlock tags={lod.tags} t={t} />
                            {dedupeContributesToRefs(lod.contributesTo).length ? (
                              <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                                {t.contributesTo}:{" "}
                                {dedupeContributesToRefs(lod.contributesTo).map((c, idx, arr) => (
                                  <span key={`${lod.name}:${c.alphaName}:${c.stateName}`}>
                                    <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                                      <code>
                                        <AliasedName kind="Alpha" name={c.alphaName} browse={browse} />→
                                    <AliasedName kind="State" name={c.stateName} browse={browse} />
                                      </code>
                                    </a>
                                    {idx < arr.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </p>
                            ) : null}
                            {Array.isArray(lod.checklist) && lod.checklist.length ? (
                              <IrBrowseChecklistBullets
                                checklist={lod.checklist}
                                t={t}
                                workProductId={workProductId}
                                listClassName="ml-4 mt-2 list-outside list-disc space-y-3 pl-5 text-[15px] leading-snug marker:text-[var(--muted)]"
                                itemKeyPrefix={`browse-wp-${slug(wp.name)}--${slug(lod.name)}`}
                              />
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <div style={{ marginTop: 10, fontWeight: 700 }}>{t.levels}</div>
                    <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {(wp.levelsOfDetail ?? [])
                        .slice()
                        .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                        .map((lod: any) => (
                            <li
                              key={lod.name}
                              style={{
                                marginBottom: 10,
                                padding: 10,
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                background: "rgba(0,0,0,0.12)",
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>
                                <AliasedName kind="LevelOfDetail" name={lod.name} browse={browse} />
                              </div>
                              {practiceElementDescriptionForDisplay(lod) ? (
                                <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
                                  {practiceElementDescriptionForDisplay(lod)}
                                </div>
                              ) : null}
                              {dedupeContributesToRefs(lod.contributesTo).length ? (
                                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                                  {t.contributesTo}:{" "}
                                  {dedupeContributesToRefs(lod.contributesTo).map((c, idx, arr) => (
                                    <span key={`${lod.name}:${c.alphaName}:${c.stateName}`}>
                                      <a href={`#${stateId(c.alphaName, c.stateName)}`} style={linkStyle()}>
                                        <code>
                                          <AliasedName kind="Alpha" name={c.alphaName} browse={browse} />→
                                    <AliasedName kind="State" name={c.stateName} browse={browse} />
                                        </code>
                                      </a>
                                      {idx < arr.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {Array.isArray(lod.checklist) && lod.checklist.length ? (
                                <div style={{ marginTop: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{t.checklist}</div>
                                  <ol style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 13 }}>
                                    {lod.checklist
                                      .slice()
                                      .sort((x: any, y: any) => (x.seq ?? 0) - (y.seq ?? 0))
                                      .map((ch: any) => (
                                          <li key={`${lod.name}:${ch.name}`}>
                                            <b>{ch.name}</b>
                                            {practiceElementDescriptionForDisplay(ch) ? (
                                              <span style={{ color: "var(--muted)" }}> — {practiceElementDescriptionForDisplay(ch)}</span>
                                            ) : null}
                                          </li>
                                      ))}
                                  </ol>
                                </div>
                              ) : null}
                            </li>
                        ))}
                    </ol>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(baseline.narrativeTypes ?? []).length > 0 ||
      (Array.isArray(sourceDoc?.personas) && (sourceDoc!.personas as any[]).length > 0) ||
      (Array.isArray(sourceDoc?.personaGroups) && (sourceDoc!.personaGroups as any[]).length > 0) ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          {(baseline.narrativeTypes ?? []).length > 0 ? (
            <>
              {browse ? (
                <h2 id="browse-section-narrative-types" className={`${BROWSE.h2Global} scroll-mt-4`}>
                  {t.narrativeTypesHeading}
                </h2>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 800 }}>{t.narrativeTypesHeading}</div>
              )}
              <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                {(baseline.narrativeTypes ?? []).map((nt: any) => (
                  <div
                    key={String(nt.name)}
                    id={narrativeTypeIdPv(String(nt.name))}
                    style={
                      browse
                        ? { marginTop: 8 }
                        : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                    }
                  >
                    {browse ? (
                      <h3 className={BROWSE.h3Item}>
                        <a href={`#${narrativeTypeIdPv(String(nt.name))}`} style={linkStyle()}>
                          <AliasedName kind="NarrativeType" name={String(nt.name)} browse />
                        </a>
                      </h3>
                    ) : (
                      <div style={{ fontWeight: 800 }}>
                        <AliasedName kind="NarrativeType" name={String(nt.name)} browse={false} />
                      </div>
                    )}
                    {practiceElementDescriptionForDisplay(nt) ? (
                      browse ? (
                        <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(nt)}</p>
                      ) : (
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>
                          {practiceElementDescriptionForDisplay(nt)}
                        </div>
                      )
                    ) : null}
                    {browse ? <IrBrowseTagsBlock tags={nt.tags} t={t} /> : null}
                    {Array.isArray(nt.narrativeElements) && nt.narrativeElements.length ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.narrativeElementsHeading}</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--muted)" }}>
                          {(nt.narrativeElements as any[]).map((el: any) => (
                            <li key={`${String(nt.name)}:${String(el.name)}`}>
                              <strong style={{ color: "var(--text)" }}>{String(el.name)}</strong>
                              {practiceElementDescriptionForDisplay(el) ? (
                                <span> — {practiceElementDescriptionForDisplay(el)}</span>
                              ) : null}
                              {el?.howToUse ? (
                                <div style={{ fontSize: 12, marginTop: 4 }}>{String(el.howToUse)}</div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {Array.isArray(sourceDoc?.personas) && (sourceDoc!.personas as any[]).length ? (
            <>
              {browse ? (
                <h2 id="browse-section-personas" className={`${BROWSE.h2Global} mt-10 scroll-mt-4`}>
                  {t.personasHeading}
                </h2>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 16 }}>{t.personasHeading}</div>
              )}
              <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                {(sourceDoc!.personas as any[]).map((p: any) => (
                  <div
                    key={String(p.name)}
                    id={personaIdPv(String(p.name))}
                    style={
                      browse
                        ? { marginTop: 8 }
                        : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                    }
                  >
                    {browse ? (
                      <h3 className={BROWSE.h3Item}>
                        <a href={`#${personaIdPv(String(p.name))}`} style={linkStyle()}>
                          <AliasedName kind="Persona" name={String(p.name)} browse />
                        </a>
                      </h3>
                    ) : (
                      <div style={{ fontWeight: 800 }}>
                        <AliasedName kind="Persona" name={String(p.name)} browse={false} />
                      </div>
                    )}
                    {practiceElementDescriptionForDisplay(p) ? (
                      browse ? (
                        <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(p)}</p>
                      ) : (
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>
                          {practiceElementDescriptionForDisplay(p)}
                        </div>
                      )
                    ) : null}
                    {browse ? <IrBrowseTagsBlock tags={p.tags} t={t} /> : null}
                    {Array.isArray(p.competencies) && p.competencies.length ? (
                      <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                        {t.recommendedCompetencyLevels}:{" "}
                        {p.competencies.map((r: any, ri: number) => (
                          <span key={`${String(p.name)}:rc:${ri}`}>
                            <code>
                              <AliasedName kind="Competency" name={String(r?.competencyName ?? "")} browse={browse} />/
                              <AliasedName
                                kind="CompetencyLevel"
                                name={String(r?.competencyLevelName ?? "")}
                                browse={browse}
                              />
                            </code>
                            {ri < p.competencies.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {Array.isArray(sourceDoc?.personaGroups) && (sourceDoc!.personaGroups as any[]).length ? (
            <>
              {browse ? (
                <h2 id="browse-section-persona-groups" className={`${BROWSE.h2Global} mt-10 scroll-mt-4`}>
                  {t.personaGroupsHeading}
                </h2>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 16 }}>{t.personaGroupsHeading}</div>
              )}
              <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                {(sourceDoc!.personaGroups as any[]).map((pg: any) => (
                  <div
                    key={String(pg.name)}
                    id={personaGroupIdPv(String(pg.name))}
                    style={
                      browse
                        ? { marginTop: 8 }
                        : { padding: 12, border: "1px solid var(--border)", borderRadius: 10 }
                    }
                  >
                    {browse ? (
                      <h3 className={BROWSE.h3Item}>
                        <a href={`#${personaGroupIdPv(String(pg.name))}`} style={linkStyle()}>
                          <AliasedName kind="PersonaGroup" name={String(pg.name)} browse />
                        </a>
                      </h3>
                    ) : (
                      <div style={{ fontWeight: 800 }}>
                        <AliasedName kind="PersonaGroup" name={String(pg.name)} browse={false} />
                      </div>
                    )}
                    {practiceElementDescriptionForDisplay(pg) ? (
                      browse ? (
                        <p className={`mt-2 ${BROWSE.body}`}>{practiceElementDescriptionForDisplay(pg)}</p>
                      ) : (
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>
                          {practiceElementDescriptionForDisplay(pg)}
                        </div>
                      )
                    ) : null}
                    {browse ? <IrBrowseTagsBlock tags={pg.tags} t={t} /> : null}
                    {Array.isArray(pg.personaNames) && pg.personaNames.length ? (
                      <p className={`mt-2 ${BROWSE.bodyMuted}`}>
                        {t.personaGroupMembers}:{" "}
                        {pg.personaNames.map((nm: unknown, gi: number) => (
                          <span key={`${String(pg.name)}:pg:${gi}:${String(nm)}`}>
                            <AliasedName kind="Persona" name={String(nm)} browse={browse} />
                            {gi < (pg.personaNames as unknown[]).length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {browse && browsePracticeElementAliases.length ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <h2 id={BROWSE_SECTION_ALIASES} className={`${BROWSE.h2Global} scroll-mt-4`}>
            {t.practiceElementAliasesHeading}
          </h2>
          <ul className={`mt-3 list-none space-y-2 p-0 ${BROWSE.body}`}>
            {browsePracticeElementAliases.map((row, idx) => {
              const pet = String(row.practiceElementType ?? "").trim();
              const pen = String(row.practiceElementName ?? "").trim();
              const aliasNm = String(row.aliasName ?? "").trim();
              return (
                <li key={`browse-alias-${idx}-${pet}-${pen}-${aliasNm}`}>
                  <span className="font-semibold text-[var(--text)]">{pet || "—"}</span>
                  {" · "}
                  <code>{pen || "—"}</code>
                  {" → "}
                  <code>{aliasNm || "—"}</code>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function isActivitySpaceNodeFlatActivity(s: any) {
  return s && "activitySpaceName" in s && String((s as any).activitySpaceName ?? "").trim() !== "";
}

function buildActivitiesByParentMap(baseline: PracticeBaseline) {
  const allSpaces = (baseline.activitySpaces ?? []) as any[];
  const spaces = allSpaces.filter((s) => !isActivitySpaceNodeFlatActivity(s));
  const activitiesByParent = new Map<string, any[]>();
  for (const s of spaces) {
    activitiesByParent.set(String(s.name), [...(s.activities ?? [])]);
  }
  for (const s of allSpaces) {
    if (!isActivitySpaceNodeFlatActivity(s)) continue;
    const parent = String((s as any).activitySpaceName).trim();
    if (!activitiesByParent.has(parent)) activitiesByParent.set(parent, []);
    activitiesByParent.get(parent)!.push(s);
  }
  return activitiesByParent;
}

/** Pattern views as columns; one row per baseline alpha; slices + lanes grouped per PatternView.alphaStates slice. */
function DiagramPatternMatrix({
  pattern,
  baseline,
  fitToWidth = true,
}: {
  pattern: any;
  baseline: PracticeBaseline;
  fitToWidth?: boolean;
}) {
  const cellPad = 10;
  const blockGap = 8;
  const blockStackGap = 8;
  const chipGapBetweenLanes = 8;

  const { theme } = useTheme();
  const { t } = useLanguagePack();
  const lookup = usePracticeElementAliasLookup();
  const measureName = useCallback((kind: string, name: string) => diagramMeasureName(lookup, kind, name), [lookup]);
  const patternSectionHref = diagramHrefPattern(String(pattern?.name ?? ""));
  const labelColW = 200;
  const colW = 240;

  const rowAlphaNames = useMemo(() => buildPatternMatrixAlphaRows(baseline), [baseline]);

  const { views, cellBlocks } = useMemo(
    () =>
      buildPatternMatrixCells(pattern?.patternViews, baseline, rowAlphaNames, {
        activitySpace: t.activitySpace,
        activity: t.practiceActivity,
      }),
    [pattern?.patternViews, baseline, rowAlphaNames, t.activitySpace, t.practiceActivity],
  );

  const hasAnyLanes = useMemo(
    () => cellBlocks.some((row) => row.some((cell) => cell.some((b) => b.lanes.length > 0))),
    [cellBlocks],
  );

  /** Slice keys `{ri}-{cj}-{bk}` where `lanes` exist — used when collapsing one slice during “expand all”. */
  const sliceKeysWithLanes = useMemo(() => {
    const keys: string[] = [];
    cellBlocks.forEach((row, ri) => {
      row.forEach((cell, cj) => {
        cell.forEach((_b, bk) => {
          if ((_b?.lanes ?? []).length > 0) keys.push(`${ri}-${cj}-${bk}`);
        });
      });
    });
    return keys;
  }, [cellBlocks]);

  const [expandAllLanes, setExpandAllLanes] = useState(false);
  const [openLaneSlices, setOpenLaneSlices] = useState<Record<string, boolean>>({});

  const lanesExpandedFn = useCallback(
    (ri: number, cj: number, bk: number) => expandAllLanes || Boolean(openLaneSlices[`${ri}-${cj}-${bk}`]),
    [expandAllLanes, openLaneSlices],
  );

  const layout = useMemo(
    () =>
      computePatternMatrixLayout(views, cellBlocks, {
        labelColW,
        colW,
        headerTopPad: 18,
        cellPadding: cellPad,
        chipGap: chipGapBetweenLanes,
        minRowH: 56,
        blockGap,
        blockStackGap,
        lanesExpanded: lanesExpandedFn,
        measureName,
        aliasLookup: lookup,
      }),
    [
      views,
      cellBlocks,
      labelColW,
      colW,
      cellPad,
      chipGapBetweenLanes,
      blockGap,
      blockStackGap,
      lanesExpandedFn,
      measureName,
      lookup,
    ],
  );

  const alphaFocusByRow = useMemo(() => {
    const m = new Map<number, string>();
    for (let ri = 0; ri < rowAlphaNames.length; ri++) {
      const nm = rowAlphaNames[ri].trim();
      const found = baseline.alphas?.find((a) => String(a.name).trim() === nm);
      m.set(ri, String(found?.focusName ?? "").trim());
    }
    return m;
  }, [baseline.alphas, rowAlphaNames]);

  if (!views.length || !rowAlphaNames.length) return null;

  const { width, height, headerH, rowHeights, chipInnerW } = layout;
  const nC = views.length;
  const nR = rowAlphaNames.length;
  const chipW = chipInnerW + 8;

  const gridLines = (
    <g>
      {Array.from({ length: nC + 1 }, (_, j) => {
        const x = labelColW + j * colW;
        return <line key={`v-${j}`} x1={x} y1={0} x2={x} y2={height} stroke="var(--border)" strokeWidth={1} />;
      })}
      {(() => {
        const lines: ReactNode[] = [];
        let hy = headerH;
        lines.push(<line key="h-0" x1={0} y1={hy} x2={width} y2={hy} stroke="var(--border)" strokeWidth={1} />);
        for (let ri = 0; ri < nR; ri++) {
          hy += rowHeights[ri] ?? 56;
          lines.push(<line key={`h-${ri + 1}`} x1={0} y1={hy} x2={width} y2={hy} stroke="var(--border)" strokeWidth={1} />);
        }
        return lines;
      })()}
    </g>
  );

  let rowY = headerH;
  const rowBands: ReactNode[] = [];
  const rowContent: ReactNode[] = [];

  for (let ri = 0; ri < nR; ri++) {
    const rowH = rowHeights[ri] ?? 56;
    const focusNm = alphaFocusByRow.get(ri) ?? "";
    const laneFill = (focusNm && theme.focusSwimlaneFill[focusNm]) || "var(--panel)";
    rowBands.push(
      <rect key={`lane-${ri}`} x={0} y={rowY} width={width} height={rowH} fill={laneFill} stroke="none" />,
    );

    const labelPrimary = diagramMeasureName(lookup, "Alpha", rowAlphaNames[ri]);
    const labelMaxChars = Math.max(8, Math.floor((labelColW - 20) / 7));
    const labelLines = wrapLines(labelPrimary, labelMaxChars);
    const labelLineH = 16;
    const labelStartY = rowY + Math.max(12, (rowH - labelLines.length * labelLineH) / 2);
    const rowAlphaHref = diagramHrefAlpha(rowAlphaNames[ri]);
    const labelTexts = labelLines.map((ln, i) => (
      <text key={i} x={12} y={labelStartY + i * labelLineH} fill="var(--text)" fontSize={14} fontWeight={800}>
        {ln}
      </text>
    ));
    rowContent.push(
      <g key={`lab-${ri}`}>
        {rowAlphaHref ? (
          <a href={rowAlphaHref} className="diagram-matrix-row-label-link">
            <g>{labelTexts}</g>
          </a>
        ) : (
          <g>{labelTexts}</g>
        )}
      </g>,
    );

    for (let cj = 0; cj < nC; cj++) {
      const x0 = labelColW + cj * colW;
      const blocks = cellBlocks[ri][cj];
      let cy = rowY + cellPad;
      blocks.forEach((b, bk) => {
        const ak = `${ri}-${cj}-${bk}`;
        const chChip = computeBlockHeightForWidthWithAlias(
          lookup,
          "Alpha",
          b.alphaName,
          measureName("State", b.stateName),
          chipW,
          8,
          8,
        );
        const sliceTop = cy;
        const lanes = b.lanes;
        const exp = lanesExpandedFn(ri, cj, bk);

        rowContent.push(
          <g key={`cell-${ak}-slice`} transform={`translate(${x0 + 12}, ${sliceTop})`}>
            <rect x={0} y={0} width={chipW} height={chChip} rx={12} ry={12} fill="rgba(0,0,0,0.18)" stroke="var(--border)" />
            {renderWrappedText(
              b.alphaName,
              b.stateName,
              chipW,
              8,
              8,
              false,
              "Alpha",
              "State",
              lookup,
              diagramHrefAlpha(b.alphaName),
              diagramHrefState(b.alphaName, b.stateName),
            )}
          </g>,
        );

        if (lanes.length > 0) {
          rowContent.push(
            <foreignObject
              key={`lane-chev-${ak}`}
              x={x0 + cellPad}
              y={sliceTop}
              width={colW - 2 * cellPad}
              height={Math.max(chChip, PATTERN_MATRIX_LANE_TOGGLE_HEIGHT)}
            >
              <div
                {...({ xmlns: "http://www.w3.org/1999/xhtml" } as Record<string, unknown>)}
                style={{
                  margin: 0,
                  padding: 0,
                  height: "100%",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "flex-start",
                  pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "auto", paddingRight: 2 }}>
                  <button
                    type="button"
                    aria-expanded={exp}
                    title={
                      exp
                        ? t.patternMatrixHideSliceLanes
                        : t.patternMatrixShowLanesCount.replace(/\{count\}/g, String(lanes.length))
                    }
                    aria-label={
                      exp
                        ? t.patternMatrixHideSliceLanes
                        : t.patternMatrixShowLanesCount.replace(/\{count\}/g, String(lanes.length))
                    }
                    className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border bg-[var(--bg)] shadow-sm ${
                      exp
                        ? "border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent)]/35"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]/70"
                    }`}
                    style={{ cursor: "pointer", lineHeight: 1 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (exp) {
                        setExpandAllLanes(false);
                        setOpenLaneSlices(() => {
                          const next: Record<string, boolean> = {};
                          for (const sk of sliceKeysWithLanes) {
                            if (sk !== ak) next[sk] = true;
                          }
                          return next;
                        });
                      } else {
                        setExpandAllLanes(false);
                        setOpenLaneSlices((prev) => ({ ...prev, [ak]: true }));
                      }
                    }}
                  >
                    {exp ? (
                      <span className="block text-[12px] font-bold leading-none text-[var(--accent)]" aria-hidden>
                        &#9660;
                      </span>
                    ) : (
                      <span className="block pl-px text-[12px] font-bold leading-none" aria-hidden>
                        &#9654;
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </foreignObject>,
          );
        }

        cy += chChip;

        if (lanes.length > 0 && exp) {
          cy += blockGap;
          lanes.forEach((lane, lk) => {
            const lh = computeArrowHeightForWidthWithAlias(
              lookup,
              lane.kind === "activitySpace" ? "ActivitySpace" : "Activity",
              lane.laneName,
              lane.secondary,
              chipW,
              8,
              8,
            );
            rowContent.push(
              <g key={`cell-${ak}-lane-${lk}`} transform={`translate(${x0 + 12}, ${cy})`}>
                <ArrowBlock width={chipW} height={lh} dashed={lane.kind === "activitySpace"} />
                {renderWrappedText(
                  lane.laneName,
                  lane.secondary,
                  chipW,
                  8,
                  8,
                  true,
                  lane.kind === "activitySpace" ? "ActivitySpace" : "Activity",
                  undefined,
                  lookup,
                  lane.kind === "activitySpace"
                    ? diagramHrefActivitySpace(lane.laneName)
                    : diagramHrefActivity(lane.laneName),
                )}
              </g>,
            );
            cy += lh;
            if (lk < lanes.length - 1) cy += chipGapBetweenLanes;
          });
        }

        if (bk < blocks.length - 1) cy += blockStackGap;
      });
    }
    rowY += rowH;
  }

  const toolbarControls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/30 px-3 py-2">
      <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t.patternViewLanes}</span>
      <button
        type="button"
        onClick={() => {
          setExpandAllLanes(true);
        }}
        className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)]"
      >
        {t.patternMatrixExpandAllLanes}
      </button>
      <button
        type="button"
        onClick={() => {
          setExpandAllLanes(false);
          setOpenLaneSlices({});
        }}
        className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)]"
      >
        {t.patternMatrixCollapseAllLanes}
      </button>
    </div>
  );

  return (
    <div
      style={{
        marginTop: 12,
        overflowX: fitToWidth ? "visible" : "auto",
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--panel)",
      }}
    >
      {hasAnyLanes ? toolbarControls : null}
      <svg
        width={fitToWidth ? "100%" : width}
        height={fitToWidth ? undefined : height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        style={{
          display: "block",
          background: "transparent",
          ...(fitToWidth ? { maxWidth: width } : null),
        }}
      >
        <g>
          <rect x={0} y={0} width={width} height={headerH} fill="rgba(0,0,0,0.06)" stroke="var(--border)" />
          <rect x={0} y={0} width={labelColW} height={headerH} fill="rgba(0,0,0,0.04)" stroke="var(--border)" />
          {views.map((pv: any, j: number) => (
            <g key={`hdr-${pv.name}-${j}`} transform={`translate(${labelColW + j * colW}, 0)`}>
              {renderWrappedText(
                pv.name,
                practiceElementDescriptionForDisplay(pv),
                colW - 16,
                8,
                8,
                false,
                "PatternView",
                undefined,
                lookup,
                patternSectionHref,
              )}
            </g>
          ))}
          {rowBands}
          {rowContent}
          {gridLines}
        </g>
      </svg>
    </div>
  );
}

/** One focus swimlane for alphas, aligned with PDF per-section diagrams. */
function DiagramForSingleFocusAlpha({
  baseline,
  g,
  fitToWidth = true,
  focusLabel,
}: {
  baseline: PracticeBaseline;
  g: FocusGroup;
  fitToWidth?: boolean;
  focusLabel?: string;
}) {
  const { theme } = useTheme();
  const { t } = useLanguagePack();
  const lookup = usePracticeElementAliasLookup();
  const contribArrowId = `alpha-contrib-${useId().replace(/\W/g, "")}`;
  const cardW = 260;
  const cardGap = 12;

  const focus =
    (baseline.focuses ?? []).find((f) => f.name === g.focusName) ?? ({ name: g.focusName, description: "" } as any);
  const implicitFocusLane = g.focusName === IMPLICIT_FOCUS_NAME;
  const focusTitleForImplicitHeading = focusLabel ?? t.implicitFocusName;
  const focusDesc = practiceElementDescriptionForDisplay(focus);
  const alphas = augmentLaneAlphasWithCrossLaneContributesParents(g.alphas ?? [], baseline.alphas ?? []);
  const alphaHeights = alphas.map((a: any) =>
    computeBlockHeightForWidthWithAlias(
      lookup,
      "Alpha",
      a.name,
      practiceElementDescriptionForDisplay(a),
      cardW,
      10,
      10,
    ),
  );
  const layoutProvisional = computeAlphaContributorBelowLayout(alphas, alphaHeights, {
    headerH: SWIMLANE_FOCUS_HEADING.minHeight,
    cardW,
    cardGap,
    rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
    bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
  });
  const laneWidth = layoutProvisional.width;
  const headingPlain = implicitFocusLane
    ? computeSwimlaneFocusHeadingLayout(focusTitleForImplicitHeading, focusDesc, laneWidth)
    : null;
  const headingAliased = !implicitFocusLane
    ? computeSwimlaneFocusHeadingLayoutAliased(lookup, "Focus", focus.name, focusDesc, laneWidth)
    : null;
  const headerH = (headingPlain ?? headingAliased)!.headerH;
  const layout = computeAlphaContributorBelowLayout(alphas, alphaHeights, {
    headerH,
    cardW,
    cardGap,
    rowGap: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.rowGap,
    bottomPad: ALPHA_CONTRIBUTES_LAYOUT_DEFAULTS.bottomPad,
  });
  const contribEdges = alphaContributesToEdges(alphas);
  const width = layout.width;
  const height = Math.max(180, layout.height);
  const laneFill = theme.focusSwimlaneFill[focus.name] ?? "var(--panel)";

  const geoms = alphas.map((_: any, idx: number) =>
    alphaCardGeomAt(layout.x[idx], layout.y[idx], alphaHeights[idx] ?? 96, cardW),
  );

  return (
    <div
      style={{
        overflowX: fitToWidth ? "visible" : "auto",
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: laneFill,
      }}
    >
      <svg
        width={fitToWidth ? "100%" : width}
        height={fitToWidth ? undefined : height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        style={{
          display: "block",
          background: "transparent",
          ...(fitToWidth ? { maxWidth: width } : null),
        }}
      >
        <defs>
          <marker
            id={contribArrowId}
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 9 4.5 L 0 9 z" fill="var(--accent)" />
          </marker>
        </defs>
        <g>
          {headingPlain ? (
            renderSwimlaneFocusHeading(
              headingPlain.nameLines,
              headingPlain.descLines,
              headingPlain.textX,
              diagramHrefBrowseAlphasFocus(g.focusName),
            )
          ) : (
            renderSwimlaneFocusHeadingAliased(
              headingAliased!.nameRows,
              headingAliased!.descLines,
              headingAliased!.textX,
              diagramHrefBrowseAlphasFocus(g.focusName),
            )
          )}

          {alphas.map((a: any, idx: number) => {
            const x = layout.x[idx] ?? cardGap;
            const y = layout.y[idx] ?? headerH;
            const h = alphaHeights[idx] ?? 96;
            return (
              <g key={a.name} transform={`translate(${x}, ${y})`}>
                <rect
                  x={0}
                  y={0}
                  width={cardW}
                  height={h}
                  rx={14}
                  ry={14}
                  fill="rgba(0,0,0,0.18)"
                  stroke="var(--border)"
                />
                {renderWrappedText(
                  a.name,
                  practiceElementDescriptionForDisplay(a),
                  cardW,
                  10,
                  10,
                  false,
                  "Alpha",
                  undefined,
                  lookup,
                  diagramHrefAlpha(a.name),
                )}
              </g>
            );
          })}

          {contribEdges.length ? (
            <g fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.92}>
              {contribEdges.map(({ child, parent }, ei) => {
                const d = contributeEdgePathD(geoms[child], geoms[parent], ei);
                return (
                  <path
                    key={`${alphas[child]?.name ?? child}-to-${alphas[parent]?.name ?? parent}`}
                    d={d}
                    markerEnd={`url(#${contribArrowId})`}
                  />
                );
              })}
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

/** One focus swimlane for activity spaces, aligned with PDF per-section diagrams. */
function DiagramForSingleFocusActivity({
  baseline,
  g,
  fitToWidth = true,
  focusLabel,
}: {
  baseline: PracticeBaseline;
  g: FocusGroup;
  fitToWidth?: boolean;
  focusLabel?: string;
}) {
  const { theme } = useTheme();
  const { t } = useLanguagePack();
  const lookup = usePracticeElementAliasLookup();
  const activitiesByParent = useMemo(() => buildActivitiesByParentMap(baseline), [baseline]);
  const focus =
    (baseline.focuses ?? []).find((f) => f.name === g.focusName) ?? ({ name: g.focusName, description: "" } as any);
  const implicitFocusLane = g.focusName === IMPLICIT_FOCUS_NAME;
  const focusTitleForImplicitHeading = focusLabel ?? t.implicitFocusName;
  const focusDesc = practiceElementDescriptionForDisplay(focus);
  const laneSpaces = (g.activitySpaces ?? []).filter((s: any) => !isActivitySpaceNodeFlatActivity(s));

  const arrowW = 260;
  const arrowGap = 14;
  const maxArrows = Math.max(1, laneSpaces.length);
  const width = maxArrows * (arrowW + arrowGap) + arrowGap;
  const headingPlain = implicitFocusLane
    ? computeSwimlaneFocusHeadingLayout(focusTitleForImplicitHeading, focusDesc, width)
    : null;
  const headingAliased = !implicitFocusLane
    ? computeSwimlaneFocusHeadingLayoutAliased(lookup, "Focus", focus.name, focusDesc, width)
    : null;
  const headerH = (headingPlain ?? headingAliased)!.headerH;

  let maxColumn = headerH + 10;
  for (const s of laneSpaces) {
    const sH = computeArrowHeightForWidthWithAlias(
      lookup,
      "ActivitySpace",
      s.name,
      practiceElementDescriptionForDisplay(s),
      arrowW,
      10,
      10,
    );
    const kids = (activitiesByParent.get(s.name) ?? []) as any[];
    const kidHeights = kids.map((a) =>
      computeArrowHeightForWidthWithAlias(
        lookup,
        "Activity",
        a.name,
        practiceElementDescriptionForDisplay(a),
        arrowW,
        10,
        10,
      ),
    );
    const total = headerH + sH + 14 + kidHeights.reduce((sum, h) => sum + h + 10, 0) + 18;
    maxColumn = Math.max(maxColumn, total);
  }
  const laneH = Math.max(200, maxColumn);
  const height = laneH;
  const laneFill = theme.focusSwimlaneFill[focus.name] ?? "var(--panel)";

  return (
    <div
      style={{
        overflowX: fitToWidth ? "visible" : "auto",
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: laneFill,
      }}
    >
      <svg
        width={fitToWidth ? "100%" : width}
        height={fitToWidth ? undefined : height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        style={{
          display: "block",
          background: "transparent",
          ...(fitToWidth ? { maxWidth: width } : null),
        }}
      >
        <g>
          {headingPlain ? (
            renderSwimlaneFocusHeading(
              headingPlain.nameLines,
              headingPlain.descLines,
              headingPlain.textX,
              diagramHrefBrowseActivitiesFocus(g.focusName),
            )
          ) : (
            renderSwimlaneFocusHeadingAliased(
              headingAliased!.nameRows,
              headingAliased!.descLines,
              headingAliased!.textX,
              diagramHrefBrowseActivitiesFocus(g.focusName),
            )
          )}

          {laneSpaces.map((s: any, idx: number) => {
            const x = arrowGap + idx * (arrowW + arrowGap);
            const y = headerH;
            const kids = (activitiesByParent.get(s.name) ?? [])
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)));
            const sH = computeArrowHeightForWidthWithAlias(
              lookup,
              "ActivitySpace",
              s.name,
              practiceElementDescriptionForDisplay(s),
              arrowW,
              10,
              10,
            );

            return (
              <g key={s.name} transform={`translate(${x}, ${y})`}>
                <ArrowBlock width={arrowW} height={sH} dashed />
                {renderWrappedText(
                  s.name,
                  practiceElementDescriptionForDisplay(s),
                  arrowW,
                  10,
                  10,
                  true,
                  "ActivitySpace",
                  undefined,
                  lookup,
                  diagramHrefActivitySpace(s.name),
                )}

                {kids.map((a: any, k: number) => {
                  const aH = computeArrowHeightForWidthWithAlias(
                    lookup,
                    "Activity",
                    a.name,
                    practiceElementDescriptionForDisplay(a),
                    arrowW,
                    10,
                    10,
                  );
                  const yy =
                    sH +
                    14 +
                    kids.slice(0, k).reduce(
                      (sum: number, it: any) =>
                        sum +
                        computeArrowHeightForWidthWithAlias(
                          lookup,
                          "Activity",
                          it.name,
                          practiceElementDescriptionForDisplay(it),
                          arrowW,
                          10,
                          10,
                        ) +
                        10,
                      0,
                    );
                  if (yy + aH > laneH - 12) return null;
                  return (
                    <g key={a.name} transform={`translate(0, ${yy})`}>
                      <ArrowBlock width={arrowW} height={aH} dashed={false} />
                      {renderWrappedText(
                        a.name,
                        practiceElementDescriptionForDisplay(a),
                        arrowW,
                        10,
                        10,
                        true,
                        "Activity",
                        undefined,
                        lookup,
                        diagramHrefActivity(a.name),
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function renderSwimlaneFocusHeading(nameLines: string[], descLines: string[], textX: number, nameHref?: string) {
  const H = SWIMLANE_FOCUS_HEADING;
  const yName0 = H.padTop + H.nameFirstBaselineDy;
  const nameBlock = (
    <g>
      {nameLines.map((ln, i) => (
        <text key={`sfh-n-${i}`} x={textX} y={yName0 + i * H.nameLineH} fill="var(--text)" fontSize="16" fontWeight="800">
          {ln}
        </text>
      ))}
    </g>
  );
  return (
    <g>
      {nameHref ? (
        <a href={nameHref} className="diagram-swimlane-heading-link">
          {nameBlock}
        </a>
      ) : (
        nameBlock
      )}
      {descLines.map((ln, i) => (
        <text
          key={`sfh-d-${i}`}
          x={textX}
          y={yName0 + nameLines.length * H.nameLineH + H.nameDescGap + i * H.descLineH}
          fill="var(--muted)"
          fontSize="12"
          fontWeight="400"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function renderSwimlaneFocusHeadingAliased(nameRows: DiagramAliasedNameRow[], descLines: string[], textX: number, nameHref?: string) {
  const H = SWIMLANE_FOCUS_HEADING;
  const yName0 = H.padTop + H.nameFirstBaselineDy;
  const nameBlock = (
    <g>
      {nameRows.map((row, i) => {
        const y = yName0 + i * H.nameLineH;
        if (row.type === "primary") {
          return (
            <text key={`sfh-n-${i}`} x={textX} y={y} fill="var(--text)" fontSize="16" fontWeight="800">
              {row.text}
            </text>
          );
        }
        if (row.type === "primaryWithCanonical") {
          return (
            <text key={`sfh-n-${i}`} x={textX} y={y} fill="var(--text)" fontSize="16" fontWeight="800">
              {row.primary}
              <tspan fontSize={14} fontStyle="italic" fontWeight={500} fill="var(--muted)">
                {` (${row.canonical})`}
              </tspan>
            </text>
          );
        }
        return (
          <text key={`sfh-n-${i}`} x={textX} y={y} fill="var(--muted)" fontSize={14} fontStyle="italic" fontWeight={500}>
            {row.text}
          </text>
        );
      })}
    </g>
  );
  return (
    <g>
      {nameHref ? (
        <a href={nameHref} className="diagram-swimlane-heading-link">
          {nameBlock}
        </a>
      ) : (
        nameBlock
      )}
      {descLines.map((ln, i) => (
        <text
          key={`sfh-d-${i}`}
          x={textX}
          y={yName0 + nameRows.length * H.nameLineH + H.nameDescGap + i * H.descLineH}
          fill="var(--muted)"
          fontSize="12"
          fontWeight="400"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function ArrowBlock({ width, height, dashed }: { width: number; height: number; dashed: boolean }) {
  const notch = Math.min(42, Math.floor(width * 0.18));
  const points = [
    `0,0`,
    `${width - notch},0`,
    `${width},${height / 2}`,
    `${width - notch},${height}`,
    `0,${height}`,
  ].join(" ");

  return (
    <polygon
      points={points}
      fill="rgba(0,0,0,0.18)"
      stroke="var(--border)"
      strokeWidth={1.5}
      strokeDasharray={dashed ? "6 6" : undefined}
    />
  );
}

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Fragment `#…` URLs aligned with `PracticeBaselineView` / browse TOC element ids. */
function diagramHrefAlpha(alphaName: string): string | undefined {
  const n = String(alphaName ?? "").trim();
  return n ? `#alpha-${slug(n)}` : undefined;
}

function diagramHrefState(alphaName: string, stateName: string): string | undefined {
  const a = String(alphaName ?? "").trim();
  if (!a) return undefined;
  return `#state-${slug(a)}--${slug(stateName)}`;
}

function diagramHrefActivitySpace(name: string): string | undefined {
  const n = String(name ?? "").trim();
  return n ? `#activity-space-${slug(n)}` : undefined;
}

function diagramHrefActivity(name: string): string | undefined {
  const n = String(name ?? "").trim();
  return n ? `#activity-${slug(n)}` : undefined;
}

function diagramHrefPattern(patternName: string): string | undefined {
  const n = String(patternName ?? "").trim();
  return n ? `#pattern-${slug(n)}` : undefined;
}

function diagramHrefBrowseAlphasFocus(focusName: string): string | undefined {
  const n = String(focusName ?? "").trim();
  return n ? `#browse-alphas-focus-${slug(n)}` : undefined;
}

function diagramHrefBrowseActivitiesFocus(focusName: string): string | undefined {
  const n = String(focusName ?? "").trim();
  return n ? `#browse-activities-focus-${slug(n)}` : undefined;
}

function wrapSvgResourceLink(href: string | undefined, className: string, inner: ReactNode): ReactNode {
  if (!href) return inner;
  return (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

function linkStyle(): React.CSSProperties {
  return {
    color: "inherit",
    textDecoration: "underline",
    textDecorationColor: "rgba(139,92,246,0.6)",
    textUnderlineOffset: 2,
  };
}

function wrapLines(text: unknown, maxChars: number) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function computeBlockHeight(name: unknown, desc: unknown, nameMaxChars: number, descMaxChars: number) {
  const nameLines = wrapLines(name, nameMaxChars);
  const descLines = wrapLines(desc, descMaxChars);
  const nameLineH = 18;
  const descLineH = 16;
  const top = 14;
  const bottom = 28;
  const gap = 8;
  return top + nameLines.length * nameLineH + gap + descLines.length * descLineH + bottom;
}

function computeArrowHeight(name: unknown, desc: unknown, nameMaxChars: number, descMaxChars: number) {
  return Math.max(74, computeBlockHeight(name, desc, nameMaxChars, descMaxChars));
}

function countNameLinesForWrap(
  canonical: string,
  nameKind: string | undefined,
  lookup: PracticeElementAliasLookup,
  maxChars: number,
): number {
  if (!nameKind) return wrapDiagramTextLines(canonical, maxChars).length;
  return layoutDiagramAliasedNameRows(lookup, nameKind, canonical, maxChars).length;
}

function renderAliasedSvgTextBlock(
  canonical: string,
  kind: string | undefined,
  lookup: PracticeElementAliasLookup,
  maxChars: number,
  x: number,
  y0: number,
  lineH: number,
  fontSize: number,
  fontWeight: string | number,
  fill: string,
  keyPrefix: string,
  href?: string,
): ReactNode {
  const nodes: ReactNode[] = !kind
    ? wrapDiagramTextLines(canonical, maxChars).map((ln, i) => (
        <text key={`${keyPrefix}-${i}`} x={x} y={y0 + i * lineH} fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
          {ln}
        </text>
      ))
    : layoutDiagramAliasedNameRows(lookup, kind, canonical, maxChars).map((row, i) => {
        const y = y0 + i * lineH;
        if (row.type === "primary") {
          return (
            <text key={`${keyPrefix}-${i}`} x={x} y={y} fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
              {row.text}
            </text>
          );
        }
        if (row.type === "primaryWithCanonical") {
          return (
            <text key={`${keyPrefix}-${i}`} x={x} y={y} fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
              {row.primary}
              <tspan fontSize={Math.max(10, fontSize - 2)} fontStyle="italic" fontWeight={500} fill="var(--muted)">
                {` (${row.canonical})`}
              </tspan>
            </text>
          );
        }
        return (
          <text
            key={`${keyPrefix}-${i}`}
            x={x}
            y={y}
            fill="var(--muted)"
            fontSize={Math.max(10, fontSize - 2)}
            fontStyle="italic"
            fontWeight={500}
          >
            {row.text}
          </text>
        );
      });

  return wrapSvgResourceLink(href, "diagram-inline-resource-link", <g>{nodes}</g>);
}

function renderWrappedText(
  name: unknown,
  desc: unknown,
  blockW: number,
  padX: number,
  padY: number,
  chevron = false,
  nameKind?: string,
  descKind?: string,
  lookup: PracticeElementAliasLookup = EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
  nameHref?: string,
  descHref?: string,
) {
  const { nameMaxChars, descMaxChars } = diagramTextCharLimits(blockW, padX, chevron);
  const nameLineH = 18;
  const descLineH = 16;
  const gap = 8;
  const x = padX + 2;
  const y0 = padY + 22;
  const nameCanon = String(name ?? "");
  const descCanon = String(desc ?? "");
  const nNameLines = countNameLinesForWrap(nameCanon, nameKind, lookup, nameMaxChars);
  const nameEls = renderAliasedSvgTextBlock(
    nameCanon,
    nameKind,
    lookup,
    nameMaxChars,
    x,
    y0,
    nameLineH,
    14,
    800,
    "var(--text)",
    "n",
    nameHref,
  );
  const descY = y0 + nNameLines * nameLineH + gap;
  const descPlainLines = wrapDiagramTextLines(descCanon, descMaxChars).map((ln, i) => (
    <text key={`d-${i}`} x={x} y={descY + i * descLineH} fill="var(--muted)" fontSize={12}>
      {ln}
    </text>
  ));
  const descEls = descKind
    ? renderAliasedSvgTextBlock(
        descCanon,
        descKind,
        lookup,
        descMaxChars,
        x,
        descY,
        descLineH,
        12,
        400,
        "var(--muted)",
        "d",
        descHref,
      )
    : wrapSvgResourceLink(descHref, "diagram-inline-resource-link", <g>{descPlainLines}</g>);
  return (
    <g>
      {nameEls}
      {descEls}
    </g>
  );
}
function tag(): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    padding: "3px 8px",
    borderRadius: 999,
    color: "var(--muted)",
    fontSize: 12,
  };
}
