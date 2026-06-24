import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import type { Method } from "@/lib/types";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  groupByFocus,
  IMPLICIT_FOCUS_NAME,
  practiceElementDescriptionForDisplay,
  personaCompetencyDisplayRefs,
} from "@/lib/ir";
import { normalizePracticeElementTags } from "@/lib/display/elementDisplay";
import { isStandaloneBaselinePracticeArtifact } from "@/lib/library/classify";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { formatPatternViewAlphaInstance, formatPatternViewAlphaState } from "@/lib/converters/patternView";
import { useLanguagePack } from "@/lib/display/languagePack";
// ---------------------------------------------------------
// Red Hat / PatternFly Design System UI Mocks
// ---------------------------------------------------------

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function RHAlert({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: ReactNode;
  variant?: "info" | "warning" | "danger" | "success";
}) {
  const variantStyles = {
    info: { borderColor: "#2b9af3", bg: "#e7f1fa", iconText: "#0066cc" },
    warning: { borderColor: "#f0ab00", bg: "#fdf7e7", iconText: "#795600" },
    danger: { borderColor: "#c9190b", bg: "#faeae8", iconText: "#a30000" },
    success: { borderColor: "#3e8635", bg: "#f3faf2", iconText: "#1e4f28" },
  };
  const theme = variantStyles[variant];

  return (
    <div
      style={{
        borderTop: `2px solid ${theme.borderColor}`,
        backgroundColor: theme.bg,
        padding: "16px 24px",
        margin: "24px 0",
        fontFamily: 'RedHatText, "Overpass", sans-serif',
      }}
    >
      <strong style={{ color: theme.iconText, display: "block", marginBottom: "8px", fontSize: "16px" }}>
        {title}
      </strong>
      <div style={{ fontSize: "14px", color: "#151515", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function RHBadge({
  children,
  color = "blue",
}: {
  children: ReactNode;
  color?: "blue" | "gray" | "red" | "green";
}) {
  const colorMap = {
    blue: { bg: "#e7f1fa", text: "#0066cc" },
    gray: { bg: "#f0f0f0", text: "#151515" },
    red: { bg: "#faeae8", text: "#c9190b" },
    green: { bg: "#e6f6eb", text: "#1e4f28" },
  };
  return (
    <span
      style={{
        backgroundColor: colorMap[color].bg,
        color: colorMap[color].text,
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 600,
        marginRight: "6px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------
// Semantic Sub-Components
// ---------------------------------------------------------

function TagsGroup({ tags }: { tags: any }) {
  const n = normalizePracticeElementTags(tags);
  if (!n) return null;

  return (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", margin: "16px 0" }}>
      {n.domainTags && n.domainTags.length > 0 && (
        <div>
          <strong style={{ fontSize: "12px", color: "#6a6e73", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Domain
          </strong>
          {n.domainTags.map((t) => (
            <RHBadge key={t} color="blue">{t}</RHBadge>
          ))}
        </div>
      )}
      {n.lifecycleTags && n.lifecycleTags.length > 0 && (
        <div>
          <strong style={{ fontSize: "12px", color: "#6a6e73", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Lifecycle
          </strong>
          {n.lifecycleTags.map((t) => (
            <RHBadge key={t} color="green">{t}</RHBadge>
          ))}
        </div>
      )}
      {n.organizationalTags && n.organizationalTags.length > 0 && (
        <div>
          <strong style={{ fontSize: "12px", color: "#6a6e73", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Organization
          </strong>
          {n.organizationalTags.map((t) => (
            <RHBadge key={t} color="gray">{t}</RHBadge>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistTable({ checklist }: { checklist: any[] }) {
  if (!checklist || checklist.length === 0) return null;

  return (
    <div style={{ marginTop: "16px", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #d2d2d2" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #d2d2d2", textAlign: "left" }}>
            <th style={{ padding: "12px 16px" }}>Sequence item</th>
            <th style={{ padding: "12px 16px" }}>Verification / evidence</th>
          </tr>
        </thead>
        <tbody>
          {checklist
            .slice()
            .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
            .map((ch, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #d2d2d2" }}>
                <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                  <strong style={{ display: "block", color: "#151515" }}>{ch.name}</strong>
                  <span style={{ color: "#6a6e73", fontSize: "13px" }}>{practiceElementDescriptionForDisplay(ch)}</span>
                </td>
                <td style={{ padding: "12px 16px", verticalAlign: "top", fontSize: "13px" }}>
                  {ch.verificationMethod && (
                    <div style={{ marginBottom: "6px" }}>
                      <strong>Method:</strong> <code>{ch.verificationMethod}</code>
                    </div>
                  )}
                  {ch.evidencedBy && ch.evidencedBy.length > 0 && (
                    <div style={{ color: "#151515" }}>
                      <strong>Evidenced by:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        {ch.evidencedBy.map((e: any, i: number) => (
                          <li key={i}>
                            {e.workProductName} → {e.levelOfDetailName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------
// Main Document Layout
// ---------------------------------------------------------

export function FullPracticeView({
  doc,
  methodComposition,
  embed = false,
}: {
  doc: unknown;
  methodComposition?: Method | null;
  /** Nested preview pane: avoid forcing full viewport height and sticky sidebar quirks. */
  embed?: boolean;
}) {
  const { t } = useLanguagePack();
  const shouldResolveLibrary = useMemo(() => practiceNeedsLibraryResolution(doc), [doc]);
  const { loading: resolveBusy, resolved: libraryResolved } = usePracticeLibraryResolveForRender(doc, shouldResolveLibrary);

  const effectiveDoc = shouldResolveLibrary ? (libraryResolved ?? doc) : doc;
  const baseline = useMemo(() => (effectiveDoc ? asBaselineDocument(effectiveDoc) : null), [effectiveDoc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !effectiveDoc) return null;
    const withActivities = baselineWithPracticeActivities(effectiveDoc, baseline);
    return enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
  }, [baseline, effectiveDoc]);

  const grouped = useMemo(() => (baselineForRender ? groupByFocus(baselineForRender) : []), [baselineForRender]);
  const sourceDocRecord = effectiveDoc && typeof effectiveDoc === "object" ? (effectiveDoc as Record<string, unknown>) : {};
  const patterns = Array.isArray(sourceDocRecord.patterns) ? (sourceDocRecord.patterns as Record<string, unknown>[]) : [];
  const competencies = baseline?.competencies ?? [];
  const showNarrativeSpineCatalog = isStandaloneBaselinePracticeArtifact(doc);
  const narrativeTypesList = showNarrativeSpineCatalog ? (baselineForRender?.narrativeTypes ?? []) : [];
  const personasList = Array.isArray(sourceDocRecord.personas) ? sourceDocRecord.personas : [];
  const personaGroupsList = Array.isArray(sourceDocRecord.personaGroups) ? sourceDocRecord.personaGroups : [];

  if (shouldResolveLibrary && resolveBusy) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--muted)" }}>
        Merging baseline and dependencies from the library…
      </div>
    );
  }

  if (!baselineForRender || !baseline) {
    return (
      <div style={{ padding: embed ? 16 : 48, color: "var(--muted)" }}>
        {t.nothingToRender}
      </div>
    );
  }

  const authorsDisplay = Array.isArray(baseline.authors)
    ? baseline.authors.map((a) => String(a ?? "").trim()).filter(Boolean).join(", ")
    : "";

  // Common Nav Styles
  const navItemStyle: CSSProperties = {
    display: "block",
    padding: "8px 16px",
    color: "#151515",
    textDecoration: "none",
    borderLeft: "2px solid transparent",
    fontSize: "14px",
    marginBottom: "4px"
  };

  return (
    <div
      style={{
        display: "flex",
        fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
        color: "#151515",
        background: "#ffffff",
        minHeight: embed ? undefined : "100vh",
        lineHeight: 1.6,
      }}
    >
      {/* 1. Sticky Left Sidebar Navigation */}
      <nav
        style={{
          width: embed ? 220 : 280,
          flexShrink: 0,
          borderRight: "1px solid #d2d2d2",
          backgroundColor: "#f5f5f5",
          padding: embed ? "16px 0" : "32px 0",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: embed ? "auto" : "100vh",
          maxHeight: embed ? "min(70vh, 560px)" : undefined,
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "0 24px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, textTransform: "uppercase", color: "#6a6e73" }}>
            Documentation
          </h2>
        </div>
        <a href="#overview" style={navItemStyle}>Overview & Foundations</a>
        {grouped.map((g) => (
          <div key={`nav-${g.focusName}`}>
            <div style={{ padding: "16px 24px 8px", fontSize: "12px", fontWeight: "bold", color: "#6a6e73", textTransform: "uppercase" }}>
              {g.focusName === IMPLICIT_FOCUS_NAME ? "Implicit Focus" : g.focusName}
            </div>
            {g.alphas?.length > 0 && <a href={`#alphas-${slug(g.focusName)}`} style={{ ...navItemStyle, paddingLeft: "32px" }}>Alphas & States</a>}
            {g.activitySpaces?.length > 0 && <a href={`#activities-${slug(g.focusName)}`} style={{ ...navItemStyle, paddingLeft: "32px" }}>Activity Spaces</a>}
          </div>
        ))}
        {patterns.length > 0 ? (
          <a href="#section-patterns" style={{ ...navItemStyle, marginTop: "16px" }}>
            {t.patterns}
          </a>
        ) : null}
        {competencies.length > 0 ? <a href="#section-competencies" style={navItemStyle}>{t.competencies}</a> : null}
        {Array.isArray(sourceDocRecord.workProducts) && sourceDocRecord.workProducts.length > 0 ? (
          <a href="#work-products" style={navItemStyle}>
            {t.workProducts}
          </a>
        ) : null}
        {narrativeTypesList.length > 0 ? (
          <a href="#section-narrative-types" style={navItemStyle}>
            {t.narrativeTypesHeading}
          </a>
        ) : null}
        {personasList.length > 0 || personaGroupsList.length > 0 ? (
          <a href="#section-personas" style={navItemStyle}>
            {t.personasHeading}
          </a>
        ) : null}
        {personaGroupsList.length > 0 ? (
          <a href="#section-persona-groups" style={{ ...navItemStyle, paddingLeft: "40px" }}>
            {t.personaGroupsHeading}
          </a>
        ) : null}
      </nav>

      {/* 2. Main Content Area */}
      <main style={{ flex: 1, padding: embed ? "24px 20px" : "48px 64px", maxWidth: embed ? "none" : "1200px", minWidth: 0 }}>
        
        {/* Document Header */}
        <div id="overview" style={{ borderBottom: "2px solid #d2d2d2", paddingBottom: "24px", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 700, margin: "0 0 16px 0", color: "#151515" }}>
            {baseline.name}
          </h1>
          <p style={{ fontSize: "18px", color: "#393f44" }}>{baseline.description}</p>
          <div style={{ marginTop: "16px", fontSize: "14px", color: "#6a6e73" }}>
            <strong>Authors:</strong> {authorsDisplay || "—"} | <strong>Version:</strong> {baseline.version ?? "—"} |{" "}
            <strong>Updated:</strong> {baseline.updatedAt ?? "—"}
          </div>
          <TagsGroup tags={baseline.tags} />
        </div>

        <RHAlert title="Architectural Context & Ontology" variant="info">
          The elements detailed in this document are derived from an object management meta-model. By adhering strictly to orthogonal tagging, dynamic state-gating, and decoupled strategic execution mapping, this methodology document functions as a prescriptive operational engine rather than static documentation.
        </RHAlert>

        {/* 3. Focus Iterations (Alphas & Activities) */}
        {grouped.map((g) => (
          <section key={`focus-sec-${g.focusName}`} style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              Focus: {g.focusName === IMPLICIT_FOCUS_NAME ? "Implicit Framework" : g.focusName}
            </h2>
            
            {/* Alphas */}
            {g.alphas?.length > 0 && (
              <div id={`alphas-${slug(g.focusName)}`}>
                <h3 style={{ fontSize: "22px", fontWeight: 700, margin: "32px 0 16px 0" }}>Alphas & Trajectories</h3>
                <RHAlert variant="warning" title="State Progression and the Guidance Function">
                  Alphas represent the essential elements of an endeavor. Their states form an acyclic graph of dependencies. Each state’s <strong>checklist</strong> can name a verification method and evidentiary work-product links.
                </RHAlert>

                {g.alphas.map((alpha: any) => (
                  <div key={alpha.name} style={{ backgroundColor: "#fafafa", border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}>
                    <h4 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0", color: "#0066cc" }}>
                      Alpha: {alpha.name}
                    </h4>
                    <p style={{ fontSize: "15px", color: "#151515" }}>{practiceElementDescriptionForDisplay(alpha)}</p>
                    <TagsGroup tags={alpha.tags} />
                    
                    {alpha.states?.length > 0 && (
                      <div style={{ marginTop: "24px" }}>
                        <h5 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px" }}>Defined States</h5>
                        {alpha.states.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0)).map((state: any) => (
                          <div key={state.name} style={{ margin: "16px 0", paddingLeft: "16px", borderLeft: "4px solid #0066cc" }}>
                            <strong style={{ fontSize: "16px" }}>State: {state.name}</strong>
                            <p style={{ margin: "4px 0 12px 0", fontSize: "14px", color: "#393f44" }}>{practiceElementDescriptionForDisplay(state)}</p>
                            <ChecklistTable checklist={state.checklist} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Activity Spaces */}
            {g.activitySpaces?.length > 0 && (
              <div id={`activities-${slug(g.focusName)}`} style={{ marginTop: "48px" }}>
                <h3 style={{ fontSize: "22px", fontWeight: 700, margin: "32px 0 16px 0" }}>Activity Spaces</h3>
                <RHAlert variant="info" title="Execution Boundaries">
                  Activity Spaces act as immutable governance frameworks. Nested <strong>Activities</strong> define specific actionable swimlanes. This decoupling permits exchanging execution methods (e.g., Agile vs. Waterfall) while preserving top-level reporting.
                </RHAlert>

                {g.activitySpaces.map((space: any) => (
                  <div key={space.name} style={{ border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}>
                    <h4 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>{space.name}</h4>
                    <p style={{ fontSize: "15px", color: "#393f44" }}>{practiceElementDescriptionForDisplay(space)}</p>

                    {Array.isArray(space.involves) && space.involves.length > 0 ? (
                      <div style={{ marginTop: "12px", fontSize: "14px", color: "#393f44" }}>
                        <strong>{t.activitySpaceInvolvesPersonaGroups}:</strong>{" "}
                        {space.involves.map((g: unknown, ix: number) => (
                          <span key={`${String(g)}:${ix}`}>
                            <a
                              href={`#persona-group-${slug(String(g ?? ""))}`}
                              style={{ color: "#0066cc", textDecoration: "underline" }}
                            >
                              {String(g ?? "").trim()}
                            </a>
                            {ix < (space.involves as unknown[]).length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {space.activities?.length > 0 && (
                      <div style={{ marginTop: "24px" }}>
                        <strong style={{ display: "block", marginBottom: "12px", fontSize: "16px" }}>Activities under this space:</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          {space.activities.map((act: any) => (
                            <div key={act.name} style={{ backgroundColor: "#f5f5f5", padding: "16px", border: "1px solid #e0e0e0" }}>
                              <strong style={{ fontSize: "15px", display: "block", color: "#0066cc" }}>{act.name}</strong>
                              <p style={{ fontSize: "13px", margin: "8px 0" }}>{practiceElementDescriptionForDisplay(act)}</p>
                              {act.requiredCompetencies?.length > 0 && (
                                <div style={{ fontSize: "12px", color: "#6a6e73", marginTop: "12px" }}>
                                  <strong>Requires:</strong> {act.requiredCompetencies.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {patterns.length > 0 ? (
          <section id="section-patterns" style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              {t.patterns}
            </h2>
            <RHAlert variant="info" title="Lifecycle orchestration">
              <strong>Patterns</strong> group one or more <strong>PatternViews</strong>. Each view binds alpha states and execution lanes (activity spaces and activities) for a slice of the methodology lifecycle.
            </RHAlert>
            {patterns.map((p) => {
              const pRecord = p as Record<string, unknown>;
              const name = String(pRecord.name ?? "Pattern");
              const views = Array.isArray(pRecord.patternViews) ? (pRecord.patternViews as Record<string, unknown>[]) : [];
              return (
                <div
                  key={name}
                  id={`pattern-${slug(name)}`}
                  style={{ backgroundColor: "#fafafa", border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}
                >
                  <h3 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px 0", color: "#151515" }}>{name}</h3>
                  {practiceElementDescriptionForDisplay(pRecord) ? (
                    <p style={{ fontSize: "15px", color: "#393f44", marginBottom: "16px" }}>{practiceElementDescriptionForDisplay(pRecord)}</p>
                  ) : null}
                  {typeof pRecord.narrativeTypeName === "string" && String(pRecord.narrativeTypeName).trim() ? (
                    <p style={{ fontSize: "13px", color: "#393f44", margin: "0 0 8px 0" }}>
                      <strong>{t.patternNarrativeTypeName}:</strong>{" "}
                      <code style={{ fontSize: "13px", backgroundColor: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                        {String(pRecord.narrativeTypeName).trim()}
                      </code>
                    </p>
                  ) : null}
                  <TagsGroup tags={pRecord.tags} />
                  <div
                    style={{
                      marginTop: "24px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6a6e73",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t.patternViewsHeading}
                  </div>
                  {views
                    .slice()
                    .sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0))
                    .map((pv, vi) => {
                      const pvName = String(pv.name ?? `View ${vi + 1}`);
                      const alphaStates = Array.isArray(pv.alphaStates) ? pv.alphaStates : [];
                      const actSpaces = Array.isArray(pv.activitySpaces)
                        ? pv.activitySpaces.map((raw) => String(raw ?? "").trim()).filter(Boolean)
                        : [];
                      const acts = Array.isArray(pv.activities)
                        ? pv.activities.map((raw) => String(raw ?? "").trim()).filter(Boolean)
                        : [];
                      const alphaInstances = Array.isArray(pv.alphaInstances) ? pv.alphaInstances : [];
                      return (
                        <div
                          key={`${name}-${pv.seq ?? vi}-${pvName}`}
                          style={{
                            marginTop: vi === 0 ? 0 : 20,
                            padding: "20px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e0e0e0",
                            borderLeft: "4px solid #0066cc",
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
                            <h4 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0066cc" }}>{pvName}</h4>
                            {pv.seq !== undefined ? <RHBadge color="gray">seq {String(pv.seq)}</RHBadge> : null}
                          </div>
                          {practiceElementDescriptionForDisplay(pv) ? (
                            <p style={{ fontSize: "14px", color: "#393f44", margin: "0 0 16px 0" }}>{practiceElementDescriptionForDisplay(pv)}</p>
                          ) : null}
                          <TagsGroup tags={pv.tags} />
                          {typeof pv.narrativeElementName === "string" && String(pv.narrativeElementName).trim() ? (
                            <p style={{ fontSize: "13px", color: "#393f44", margin: "0 0 12px 0" }}>
                              <strong>{t.patternViewNarrativeElementName}:</strong>{" "}
                              <code style={{ fontSize: "13px", backgroundColor: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                                {String(pv.narrativeElementName).trim()}
                              </code>
                            </p>
                          ) : null}
                          {alphaStates.length > 0 ? (
                            <div style={{ marginTop: "16px" }}>
                              <strong style={{ fontSize: "13px", color: "#6a6e73", display: "block", marginBottom: "8px" }}>
                                {t.patternViewAlphaStates}
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#151515" }}>
                                {alphaStates.map((raw: unknown, idx: number) => (
                                  <li key={idx} style={{ marginBottom: "4px" }}>
                                    <code style={{ fontSize: "13px", backgroundColor: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                                      {formatPatternViewAlphaState(raw)}
                                    </code>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {alphaInstances.length > 0 ? (
                            <div style={{ marginTop: "16px" }}>
                              <strong style={{ fontSize: "13px", color: "#6a6e73", display: "block", marginBottom: "8px" }}>
                                {t.patternViewAlphaInstances}
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#151515" }}>
                                {alphaInstances.map((raw: unknown, idx: number) => (
                                  <li key={idx} style={{ marginBottom: "4px" }}>
                                    <code style={{ fontSize: "13px", backgroundColor: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                                      {formatPatternViewAlphaInstance(raw)}
                                    </code>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {actSpaces.length > 0 ? (
                            <div style={{ marginTop: "16px" }}>
                              <strong style={{ fontSize: "13px", color: "#6a6e73", display: "block", marginBottom: "8px" }}>
                                {t.patternViewActivitySpaces}
                              </strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {actSpaces.map((label, idx) => (
                                  <RHBadge key={`${label}-${idx}`} color="blue">
                                    {label}
                                  </RHBadge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {acts.length > 0 ? (
                            <div style={{ marginTop: "16px" }}>
                              <strong style={{ fontSize: "13px", color: "#6a6e73", display: "block", marginBottom: "8px" }}>
                                {t.patternViewActivities}
                              </strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {acts.map((label, idx) => (
                                  <RHBadge key={`${label}-${idx}`} color="green">
                                    {label}
                                  </RHBadge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </section>
        ) : null}

        {competencies.length > 0 ? (
          <section id="section-competencies" style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              {t.competencies}
            </h2>
            <RHAlert variant="success" title="Capability catalog">
              <strong>Competencies</strong> describe reusable capability areas. Ordered <strong>levels</strong> express maturity; activities may reference them as recommended proficiency targets.
            </RHAlert>
            {competencies
              .slice()
              .sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")))
              .map((c: any) => (
                <div
                  key={String(c.name)}
                  style={{ backgroundColor: "#fafafa", border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}
                >
                  <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0", color: "#1e4f28" }}>{String(c.name ?? "Competency")}</h3>
                  {practiceElementDescriptionForDisplay(c) ? (
                    <p style={{ fontSize: "15px", color: "#393f44", marginBottom: "16px" }}>{practiceElementDescriptionForDisplay(c)}</p>
                  ) : null}
                  <TagsGroup tags={c.tags} />
                  {Array.isArray(c.levels) && c.levels.length > 0 ? (
                    <div style={{ marginTop: "20px" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", marginBottom: "16px" }}>
                        {t.levels}
                      </h4>
                      {c.levels
                        .slice()
                        .sort((x: any, y: any) => (Number(x.level) || 0) - (Number(y.level) || 0))
                        .map((lvl: any) => (
                          <div
                            key={`${String(c.name)}:${lvl.level}:${String(lvl.name)}`}
                            style={{ margin: "12px 0", paddingLeft: "16px", borderLeft: "4px solid #3e8635" }}
                          >
                            <strong style={{ fontSize: "15px", color: "#151515" }}>
                              {String(lvl.name ?? "Level")}{" "}
                              <span style={{ color: "#6a6e73", fontWeight: 600 }}>(Level {lvl.level ?? "—"})</span>
                            </strong>
                            {practiceElementDescriptionForDisplay(lvl) ? (
                              <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#393f44" }}>{practiceElementDescriptionForDisplay(lvl)}</p>
                            ) : null}
                            <TagsGroup tags={lvl.tags} />
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}
          </section>
        ) : null}

        {/* 4. Work Products */}
        {Array.isArray(sourceDocRecord?.workProducts) && sourceDocRecord.workProducts.length > 0 && (
          <section id="work-products" style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              {t.workProducts}
            </h2>
            <RHAlert variant="info" title="Parallel Branching Metadata">
              A Work Product provides the empirical evidence necessary to validate Alpha state progressions. Enterprise execution supports parallelized states to ensure experimental implementations do not corrupt main Alpha calculations.
            </RHAlert>

            {sourceDocRecord.workProducts.map((wp: any) => (
              <div key={wp.name} style={{ backgroundColor: "#fafafa", border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>{wp.name}</h3>
                <p style={{ fontSize: "15px", color: "#151515" }}>{practiceElementDescriptionForDisplay(wp)}</p>
                <TagsGroup tags={wp.tags} />

                {wp.levelsOfDetail?.length > 0 && (
                  <div style={{ marginTop: "24px" }}>
                    <h5 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Levels of Detail</h5>
                    {wp.levelsOfDetail.slice().sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0)).map((lod: any) => (
                      <div key={lod.name} style={{ margin: "16px 0", paddingLeft: "16px", borderLeft: "4px solid #3e8635" }}>
                        <strong style={{ fontSize: "16px" }}>Level: {lod.name}</strong>
                        <p style={{ margin: "4px 0 12px 0", fontSize: "14px", color: "#393f44" }}>{practiceElementDescriptionForDisplay(lod)}</p>
                        <ChecklistTable checklist={lod.checklist} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {narrativeTypesList.length > 0 ? (
          <section id="section-narrative-types" style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              {t.narrativeTypesHeading}
            </h2>
            <RHAlert variant="info" title="Narrative spine">
              Narrative spine types group ordered <strong>narrative elements</strong>; patterns may optionally reference a spine via{" "}
              <code>narrativeTypeName</code> and <code>narrativeElementName</code> on views.
            </RHAlert>
            {narrativeTypesList.map((nt: Record<string, unknown>) => (
              <div
                key={String(nt.name ?? "")}
                style={{ backgroundColor: "#fafafa", border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px" }}
              >
                <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>{String(nt.name ?? "")}</h3>
                {practiceElementDescriptionForDisplay(nt) ? (
                  <p style={{ fontSize: "15px", color: "#151515" }}>{practiceElementDescriptionForDisplay(nt)}</p>
                ) : null}
                <TagsGroup tags={nt.tags} />
                {Array.isArray(nt.narrativeElements) && nt.narrativeElements.length ? (
                  <div style={{ marginTop: "20px" }}>
                    <strong style={{ fontSize: "14px", color: "#6a6e73", display: "block", marginBottom: "8px" }}>
                      Narrative elements
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#151515" }}>
                      {(nt.narrativeElements as Record<string, unknown>[]).map((el) => (
                        <li key={String(el.name ?? "")} style={{ marginBottom: "8px" }}>
                          <strong>{String(el.name ?? "")}</strong>
                          {typeof el.howToUse === "string" && el.howToUse.trim() ? (
                            <span style={{ color: "#6a6e73" }}> — {el.howToUse.trim()}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {personasList.length > 0 || personaGroupsList.length > 0 ? (
          <section id="section-personas" style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, borderBottom: "1px solid #d2d2d2", paddingBottom: "8px", margin: "48px 0 24px 0" }}>
              {t.personasHeading}
            </h2>
            {personasList.length > 0 ? (
              <>
                {personasList.map((pers: Record<string, unknown>) => {
                  const competencyRows = personaCompetencyDisplayRefs(pers);
                  return (
                  <div
                    key={String(pers.name ?? "")}
                    style={{ border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px", backgroundColor: "#fafafa" }}
                  >
                    <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>{String(pers.name ?? "")}</h3>
                    {practiceElementDescriptionForDisplay(pers) ? (
                      <p style={{ fontSize: "15px", color: "#151515" }}>{practiceElementDescriptionForDisplay(pers)}</p>
                    ) : null}
                    <TagsGroup tags={pers.tags} />
                    {competencyRows.length ? (
                      <div style={{ marginTop: "16px", fontSize: "14px", color: "#393f44" }}>
                        <strong>{t.recommendedCompetencyLevels}:</strong>
                        <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                          {competencyRows.map((r, i) => (
                            <li key={i}>
                              {r.competencyName}
                              {r.competencyLevelName ? ` → ${r.competencyLevelName}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  );
                })}
              </>
            ) : null}
            {personaGroupsList.length > 0 ? (
              <>
                <h3
                  id="section-persona-groups"
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    borderBottom: "1px solid #d2d2d2",
                    paddingBottom: "8px",
                    marginTop: personasList.length ? "40px" : "0",
                    marginBottom: "24px",
                  }}
                >
                  {t.personaGroupsHeading}
                </h3>
                {personaGroupsList.map((pg: Record<string, unknown>) => (
                  <div
                    key={String(pg.name ?? "")}
                    id={`persona-group-${slug(String(pg.name ?? ""))}`}
                    style={{ border: "1px solid #d2d2d2", padding: "24px", marginBottom: "24px", backgroundColor: "#fafafa" }}
                  >
                    <h4 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>{String(pg.name ?? "")}</h4>
                    {practiceElementDescriptionForDisplay(pg) ? (
                      <p style={{ fontSize: "15px", color: "#151515" }}>{practiceElementDescriptionForDisplay(pg)}</p>
                    ) : null}
                    <TagsGroup tags={pg.tags} />
                    {Array.isArray(pg.personaNames) && pg.personaNames.length ? (
                      <p style={{ marginTop: "12px", fontSize: "14px", color: "#393f44" }}>
                        <strong>{t.personaGroupMembers}:</strong>{" "}
                        {pg.personaNames.map((nm) => String(nm ?? "").trim()).filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
          </section>
        ) : null}

        {methodComposition ? (
          <section style={{ marginBottom: "64px", padding: "24px", border: "1px solid #d2d2d2", backgroundColor: "#fafafa" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 16px 0" }}>{t.methodBrowseExtensionPracticesHeading}</h2>
            <p style={{ fontSize: "14px", color: "#393f44", marginBottom: 12 }}>
              <strong>{t.extendsBaseline}:</strong> {methodComposition.baselinePractice?.name ?? "—"}
            </p>
            {Array.isArray(methodComposition.practices) && methodComposition.practices.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {methodComposition.practices.map((p, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <strong>{typeof p.name === "string" ? p.name : "—"}</strong>
                    {p.description?.trim?.() ? (
                      <span style={{ display: "block", fontSize: 13, color: "#6a6e73", marginTop: 4 }}>{p.description}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ fontSize: 14, color: "#6a6e73" }}>{t.practiceDependencies}: —</p>
            )}
          </section>
        ) : null}

      </main>
    </div>
  );
}