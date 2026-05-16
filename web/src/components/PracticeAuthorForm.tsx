"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LibraryRootKind } from "@/lib/library/classify";
import { classifyLibraryRoot } from "@/lib/library/classify";
import type { JsonDocumentMeta } from "@/lib/storage/types";
import {
  emptyAlphaInstance,
  emptyAlphaInstanceName,
  emptyEmbeddedWorkProductInstance,
  alphaContribution,
  checklistItem,
  competencyLevelRef,
  emptyActivity,
  emptyActivitySpace,
  emptyAlpha,
  emptyBaselinePractice,
  emptyCompetency,
  emptyCompetencyLevel,
  emptyExtensionPractice,
  emptyFocus,
  emptyLevelOfDetail,
  emptyNarrativeType,
  emptyPattern,
  emptyPatternView,
  emptyPersona,
  emptyPersonaGroup,
  emptyPracticeElementAlias,
  emptyState,
  emptyWorkProduct,
  emptyWorkProductInstanceName,
  patternViewReference,
  workProductContribution,
} from "@/lib/practiceFormDefaults";
import { practiceTagsBucketLines, practiceTagsFromBucketLines } from "@/lib/practiceElementTags";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { useLanguagePack } from "@/lib/languagePack";

type EnrichedLibraryDoc = JsonDocumentMeta & {
  libraryRootKind: LibraryRootKind;
  displayName: string;
  virtualFileCount?: number;
  baselineNameForPracticeLink?: string | null;
  practiceNameForDependencyLink?: string | null;
};

const inp: CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
};
const sel: CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  cursor: "pointer",
};
const lab: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--muted)",
  display: "block",
  marginBottom: 4,
};

function patchPracticeElementTagsBucket(
  prev: Record<string, unknown>,
  buckets: { domain: string; lifecycle: string; organizational: string },
): Record<string, unknown> {
  const tags = practiceTagsFromBucketLines(buckets.domain, buckets.lifecycle, buckets.organizational);
  if (tags === undefined) {
    const { tags: _removed, ...rest } = prev;
    return rest as Record<string, unknown>;
  }
  return { ...prev, tags };
}

/**
 * Names usable as symbolic focus links — aligned with preview focus grouping:
 * `focuses[].name`, plus every distinct `focusName` on alphas, activity spaces (and nested activities),
 * flat practice activities, and pattern views. Merged docs from `/resolve-for-render` often prune `focuses[]`
 * while slices still carry baseline focus names on alphas and spaces.
 */
function collectFocusNameOptions(doc: Record<string, unknown>): string[] {
  const names = new Set<string>();

  for (const f of Array.isArray(doc.focuses) ? doc.focuses : []) {
    if (!f || typeof f !== "object") continue;
    const n = String((f as Record<string, unknown>).name ?? "").trim();
    if (n) names.add(n);
  }

  for (const a of Array.isArray(doc.alphas) ? doc.alphas : []) {
    if (!a || typeof a !== "object") continue;
    const n = String((a as Record<string, unknown>).focusName ?? "").trim();
    if (n) names.add(n);
  }

  for (const s of Array.isArray(doc.activitySpaces) ? doc.activitySpaces : []) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const n = String(o.focusName ?? "").trim();
    if (n) names.add(n);
    for (const act of Array.isArray(o.activities) ? o.activities : []) {
      if (!act || typeof act !== "object") continue;
      const fn = String((act as Record<string, unknown>).focusName ?? "").trim();
      if (fn) names.add(fn);
    }
  }

  for (const act of Array.isArray(doc.activities) ? doc.activities : []) {
    if (!act || typeof act !== "object") continue;
    const n = String((act as Record<string, unknown>).focusName ?? "").trim();
    if (n) names.add(n);
  }

  for (const pat of Array.isArray(doc.patterns) ? doc.patterns : []) {
    if (!pat || typeof pat !== "object") continue;
    const pvs = (pat as Record<string, unknown>).patternViews;
    if (!Array.isArray(pvs)) continue;
    for (const pv of pvs) {
      if (!pv || typeof pv !== "object") continue;
      const n = String((pv as Record<string, unknown>).focusName ?? "").trim();
      if (n) names.add(n);
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Collects all alpha names from the document for use in contributesTo dropdown
 */
function collectAlphaNameOptions(doc: Record<string, unknown>): string[] {
  const names = new Set<string>();

  for (const a of Array.isArray(doc.alphas) ? doc.alphas : []) {
    if (!a || typeof a !== "object") continue;
    const n = String((a as Record<string, unknown>).name ?? "").trim();
    if (n) names.add(n);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Full declared baseline Focus catalogue (`focuses[].name`), untouched by prune — standalone baseline docs or Method.embedded baseline. */
function extractDeclaredFocusNamesFromBaselineLibraryBody(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const root = classifyLibraryRoot(body);
  const o = body as Record<string, unknown>;
  let focusesHolder: Record<string, unknown> | null = null;
  if (root === "method") {
    const bp = o.baselinePractice;
    if (bp && typeof bp === "object") focusesHolder = bp as Record<string, unknown>;
  } else if (root === "baselinePractice") {
    focusesHolder = o;
  }
  if (!focusesHolder) return [];
  const fs = Array.isArray(focusesHolder.focuses) ? focusesHolder.focuses : [];
  const names = new Set<string>();
  for (const f of fs) {
    if (!f || typeof f !== "object") continue;
    const n = String((f as Record<string, unknown>).name ?? "").trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function FocusNameSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const trimmed = value.trim();
  const inList = options.includes(trimmed);
  const selVal = !trimmed ? "" : inList ? trimmed : "__custom__";
  const hasChoices = options.length > 0;
  return (
    <>
      <label style={lab}>{label}</label>
      {hasChoices ? (
        <>
          <select
            value={selVal}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") onChange("");
              else if (v !== "__custom__") onChange(v);
            }}
            style={{ ...sel, marginBottom: trimmed && !inList ? 8 : 0 }}
          >
            <option value="">— Select focus —</option>
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            {trimmed && !inList ? <option value="__custom__">Other / custom focus name</option> : null}
          </select>
          {trimmed && !inList ? (
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="focusName" style={inp} />
          ) : null}
        </>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Declare focuses in Focuses section (or rely on baseline merge)" style={inp} />
      )}
    </>
  );
}

function Btn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text)",
        padding: "6px 12px",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

/** Prefer explicit document shape when present; otherwise distinguish extension drafts (field present). */
export function inferPracticeDocKind(doc: Record<string, unknown> | null): "extension" | "baseline" {
  if (!doc) return "extension";
  if (Object.prototype.hasOwnProperty.call(doc, "baselinePracticeName")) return "extension";
  return "baseline";
}

export type PracticeAuthorFormProps = {
  doc: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  kind: "extension" | "baseline";
  onKindChange: (k: "extension" | "baseline") => void;
  /** When true, the extension vs. baseline document type control is hidden (e.g. editing a library-backed practice). */
  lockDocumentKind?: boolean;
};

export function PracticeAuthorForm({
  doc,
  onChange,
  kind,
  onKindChange,
  lockDocumentKind = false,
}: PracticeAuthorFormProps) {
  const { t } = useLanguagePack();
  const patch = useCallback((fn: (d: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...doc })), [doc, onChange]);

  const rd = doc as Record<string, unknown>;

  const s = useCallback((k: string): string => (typeof rd[k] === "string" ? (rd[k] as string) : ""), [rd]);

  const setRoot = useCallback((key: string, val: unknown) => patch((d) => ({ ...d, [key]: val })), [patch]);

  const getArr = useCallback((key: string): Record<string, unknown>[] => (Array.isArray(rd[key]) ? (rd[key] as Record<string, unknown>[]) : []), [rd]);

  const kindSwitch = useCallback(() => {
    const next = kind === "extension" ? "baseline" : "extension";
    if (!window.confirm(`Switch to ${next === "extension" ? "extension practice" : "full baseline"}? This resets the form to empty defaults.`)) return;
    onKindChange(next);
    onChange(next === "extension" ? emptyExtensionPractice() : emptyBaselinePractice());
  }, [kind, onChange, onKindChange]);

  const lineList = (key: string) => ({
    text: (Array.isArray(rd[key]) ? (rd[key] as string[]) : []).join("\n"),
    set: (t: string) =>
      setRoot(
        key,
        t
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
  });

  const authors = lineList("authors");
  const keywords = lineList("keywords");

  const [libDocs, setLibDocs] = useState<EnrichedLibraryDoc[]>([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/documents?details=1");
        if (!res.ok) {
          throw new Error((await res.text()) || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { documents?: EnrichedLibraryDoc[] };
        if (!cancelled) {
          setLibDocs(Array.isArray(data.documents) ? data.documents : []);
          setLibError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setLibError(e instanceof Error ? e.message : "Failed to load library");
      } finally {
        if (!cancelled) setLibLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const baselineOptions = useMemo(() => {
    const byName = new Map<string, { label: string }>();
    for (const row of libDocs) {
      const n = row.baselineNameForPracticeLink;
      if (!n) continue;
      const label = `${n} (${row.displayName ?? row.title})`;
      if (!byName.has(n)) byName.set(n, { label });
    }
    return [...byName.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, meta]) => ({ value, label: meta.label }));
  }, [libDocs]);

  const practiceOptionsSorted = useMemo(() => {
    const selfName = typeof rd.name === "string" ? rd.name.trim() : "";
    const names = new Set<string>();
    for (const row of libDocs) {
      const n = row.practiceNameForDependencyLink;
      if (!n || n === selfName) continue;
      names.add(n);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [libDocs, rd.name]);

  const baselineValue = s("baselinePracticeName").trim();
  const baselineInList = baselineOptions.some((o) => o.value === baselineValue);
  const baselineSelectValue = !baselineValue ? "" : baselineInList ? baselineValue : "__custom__";
  const practiceDeps = useMemo(
    () => (Array.isArray(rd.practiceDependencyNames) ? (rd.practiceDependencyNames as string[]) : []),
    [rd.practiceDependencyNames],
  );

  const [pendingDep, setPendingDep] = useState("");
  const [manualDep, setManualDep] = useState("");

  const addablePractices = useMemo(
    () => practiceOptionsSorted.filter((n) => !practiceDeps.includes(n)),
    [practiceDeps, practiceOptionsSorted],
  );

  const declaredFocusNames = useMemo(() => collectFocusNameOptions(rd), [rd]);

  const [resolvedMixFocusNames, setResolvedMixFocusNames] = useState<string[]>([]);

  const [baselineDeclaredFocusNames, setBaselineDeclaredFocusNames] = useState<string[]>([]);

  useEffect(() => {
    const bn = typeof rd.baselinePracticeName === "string" ? rd.baselinePracticeName.trim() : "";
    if (!bn) {
      setBaselineDeclaredFocusNames([]);
      return;
    }
    if (libError) {
      setBaselineDeclaredFocusNames([]);
      return;
    }
    if (libLoading) return;

    const row = libDocs.find((r) => r.baselineNameForPracticeLink === bn);
    if (!row?.id) {
      setBaselineDeclaredFocusNames([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(row.id)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { body?: unknown };
        const names = extractDeclaredFocusNamesFromBaselineLibraryBody(data.body);
        if (!cancelled) setBaselineDeclaredFocusNames(names);
      } catch {
        if (!cancelled) setBaselineDeclaredFocusNames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rd.baselinePracticeName, libDocs, libLoading, libError]);

  useEffect(() => {
    let cancelled = false;
    let tid: number | undefined;
    if (!practiceNeedsLibraryResolution(doc)) {
      setResolvedMixFocusNames([]);
      return () => {
        cancelled = true;
      };
    }
    tid = window.setTimeout(() => {
      (async () => {
        try {
          const res = await fetch("/api/documents/resolve-for-render", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ doc }),
          });
          const j = (await res.json()) as { resolved?: unknown; error?: string };
          if (cancelled) return;
          if (!res.ok || j.error || !j.resolved || typeof j.resolved !== "object") {
            setResolvedMixFocusNames([]);
            return;
          }
          setResolvedMixFocusNames(collectFocusNameOptions(j.resolved as Record<string, unknown>));
        } catch {
          if (!cancelled) setResolvedMixFocusNames([]);
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, [doc]);

  const focusOptions = useMemo(() => {
    const s = new Set<string>([...declaredFocusNames, ...resolvedMixFocusNames, ...baselineDeclaredFocusNames]);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [declaredFocusNames, resolvedMixFocusNames, baselineDeclaredFocusNames]);

  const alphaOptions = useMemo(() => {
    return collectAlphaNameOptions(rd);
  }, [rd]);

  const defaultFocusHint = focusOptions[0] ?? "";

  return (
    <div style={{ display: "grid", gap: 16, maxHeight: "min(70vh, 720px)", overflow: "auto", paddingRight: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
          {kind === "extension" ? "Extension practice" : "Practice baseline"}
        </span>
        {lockDocumentKind ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              maxWidth: 320,
              textAlign: "right",
              lineHeight: 1.35,
            }}
          >
            {t.documentTypeLockedHint}
          </span>
        ) : (
          <Btn onClick={kindSwitch}>Switch document type…</Btn>
        )}
      </div>

      <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
        <legend style={{ padding: "0 6px", fontWeight: 800 }}>Identity</legend>
        <label style={lab}>Name</label>
        <input value={s("name")} onChange={(e) => setRoot("name", e.target.value)} style={{ ...inp, marginBottom: 10 }} />
        <label style={lab}>Description</label>
        <textarea value={s("description")} onChange={(e) => setRoot("description", e.target.value)} style={{ ...inp, minHeight: 80, marginBottom: 10 }} />
        <label style={lab}>Tags — domain (one per line)</label>
        <textarea
          value={practiceTagsBucketLines(rd.tags).domain}
          onChange={(e) => {
            const cur = practiceTagsBucketLines(rd.tags);
            patch((d) =>
              patchPracticeElementTagsBucket(d, {
                domain: e.target.value,
                lifecycle: cur.lifecycle,
                organizational: cur.organizational,
              }),
            );
          }}
          style={{ ...inp, minHeight: 44, fontFamily: "inherit", marginBottom: 8 }}
        />
        <label style={lab}>Tags — lifecycle (one per line)</label>
        <textarea
          value={practiceTagsBucketLines(rd.tags).lifecycle}
          onChange={(e) => {
            const cur = practiceTagsBucketLines(rd.tags);
            patch((d) =>
              patchPracticeElementTagsBucket(d, {
                domain: cur.domain,
                lifecycle: e.target.value,
                organizational: cur.organizational,
              }),
            );
          }}
          style={{ ...inp, minHeight: 44, fontFamily: "inherit", marginBottom: 8 }}
        />
        <label style={lab}>Tags — organizational (one per line)</label>
        <textarea
          value={practiceTagsBucketLines(rd.tags).organizational}
          onChange={(e) => {
            const cur = practiceTagsBucketLines(rd.tags);
            patch((d) =>
              patchPracticeElementTagsBucket(d, {
                domain: cur.domain,
                lifecycle: cur.lifecycle,
                organizational: e.target.value,
              }),
            );
          }}
          style={{ ...inp, minHeight: 44, fontFamily: "inherit" }}
        />
      </fieldset>

      {kind === "extension" ? (
        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
          <legend style={{ padding: "0 6px", fontWeight: 800 }}>Baseline reference</legend>
          {libError ? (
            <div style={{ fontSize: 12, color: "rgba(251,191,36,0.95)", marginBottom: 8 }}>Library list unavailable: {libError}</div>
          ) : null}
          <label style={lab}>baselinePracticeName</label>
          {libLoading ? (
            <div style={{ ...inp, color: "var(--muted)" }}>Loading baselines from library…</div>
          ) : baselineOptions.length === 0 ? (
            <>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                No baseline or method documents found in the library. Enter the symbolic baseline name manually.
              </div>
              <input value={baselineValue} onChange={(e) => setRoot("baselinePracticeName", e.target.value)} style={inp} placeholder="Name of PracticeBaseline to extend" />
            </>
          ) : (
            <>
              <select
                value={baselineSelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || v === "__custom__") {
                    if (v === "") setRoot("baselinePracticeName", "");
                  } else {
                    setRoot("baselinePracticeName", v);
                  }
                }}
                style={{ ...sel, marginBottom: baselineValue && !baselineInList ? 8 : 0 }}
              >
                <option value="">— Select baseline practice —</option>
                {baselineOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                {baselineValue && !baselineInList ? (
                  <option value="__custom__">Other (custom name below)</option>
                ) : null}
              </select>
              {baselineValue && !baselineInList ? (
                <>
                  <label style={{ ...lab, marginTop: 10 }}>Custom baseline name</label>
                  <input
                    value={baselineValue}
                    onChange={(e) => setRoot("baselinePracticeName", e.target.value)}
                    style={inp}
                  />
                </>
              ) : null}
            </>
          )}
          <label style={{ ...lab, marginTop: 14 }}>practiceDependencyNames</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {practiceDeps.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>No dependent practices selected.</span>
            ) : (
              practiceDeps.map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  {d}
                  <button
                    type="button"
                    aria-label={`Remove ${d}`}
                    onClick={() =>
                      setRoot(
                        "practiceDependencyNames",
                        practiceDeps.filter((_, j) => j !== i),
                      )
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select
              value={pendingDep}
              onChange={(e) => setPendingDep(e.target.value)}
              style={{ ...sel, flex: "1 1 200px", minWidth: 180 }}
              disabled={libLoading || (!addablePractices.length && !libError)}
            >
              <option value="">
                {libLoading
                  ? "Loading…"
                  : addablePractices.length === 0 && !libError
                    ? "No other practices in library"
                    : "— Select practice to add —"}
              </option>
              {addablePractices.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Btn
              onClick={() => {
                if (!pendingDep || practiceDeps.includes(pendingDep)) return;
                setRoot("practiceDependencyNames", [...practiceDeps, pendingDep]);
                setPendingDep("");
              }}
            >
              Add practice
            </Btn>
          </div>
          <label style={{ ...lab, marginTop: 12 }}>Or add dependency by practice name</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              value={manualDep}
              onChange={(e) => setManualDep(e.target.value)}
              placeholder="Symbolic Practice.name"
              style={{ ...inp, flex: "1 1 200px", minWidth: 160 }}
            />
            <Btn
              onClick={() => {
                const t = manualDep.trim();
                const self = typeof rd.name === "string" ? rd.name.trim() : "";
                if (!t || practiceDeps.includes(t) || t === self) return;
                setRoot("practiceDependencyNames", [...practiceDeps, t]);
                setManualDep("");
              }}
            >
              Add by name
            </Btn>
          </div>
        </fieldset>
      ) : null}

      <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
        <legend style={{ padding: "0 6px", fontWeight: 800 }}>Metadata</legend>
        <label style={lab}>Version</label>
        <input value={s("version")} onChange={(e) => setRoot("version", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
        <label style={lab}>Authors (one per line)</label>
        <textarea value={authors.text} onChange={(e) => authors.set(e.target.value)} style={{ ...inp, minHeight: 44, marginBottom: 8, fontFamily: "inherit" }} />
        <label style={lab}>Keywords (one per line)</label>
        <textarea value={keywords.text} onChange={(e) => keywords.set(e.target.value)} style={{ ...inp, minHeight: 44, marginBottom: 8, fontFamily: "inherit" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={lab}>createdAt</label>
            <input value={s("createdAt")} onChange={(e) => setRoot("createdAt", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lab}>updatedAt</label>
            <input value={s("updatedAt")} onChange={(e) => setRoot("updatedAt", e.target.value)} style={inp} />
          </div>
        </div>
      </fieldset>

      <RepeatSection
        title="Focuses"
        items={getArr("focuses")}
        onReplace={(xs) => setRoot("focuses", xs)}
        addLabel="+ Add focus"
        renderItem={(focus, fi, mutate) => (
          <>
            <input
              placeholder="Focus name"
              value={typeof focus.name === "string" ? focus.name : ""}
              onChange={(e) =>
                mutate((f) =>
                  [...f.slice(0, fi), { ...focus, name: e.target.value }, ...f.slice(fi + 1)],
                )
              }
              style={{ ...inp, marginBottom: 6 }}
            />
            <textarea
              placeholder="Description"
              value={typeof focus.description === "string" ? focus.description : ""}
              onChange={(e) =>
                mutate((f) =>
                  [...f.slice(0, fi), { ...focus, description: e.target.value }, ...f.slice(fi + 1)],
                )
              }
              style={{ ...inp, minHeight: 56 }}
            />
          </>
        )}
        emptyItem={() => emptyFocus()}
      />

      <RepeatSection
        title="Alphas"
        items={getArr("alphas")}
        onReplace={(xs) => setRoot("alphas", xs)}
        addLabel="+ Add alpha (includes 3 starter states)"
        renderItem={(alpha, ai, mutate) => (
          <AlphaBlock
            alpha={alpha}
            focusHint={defaultFocusHint}
            focusOptions={focusOptions}
            alphaOptions={alphaOptions}
            onChange={(next) => mutate((list) => [...list.slice(0, ai), next, ...list.slice(ai + 1)])}
          />
        )}
        emptyItem={() => emptyAlpha(defaultFocusHint)}
      />

      <RepeatSection
        title="Competencies"
        items={getArr("competencies")}
        onReplace={(xs) => setRoot("competencies", xs)}
        addLabel="+ Add competency (includes one level)"
        renderItem={(c, i, mutate) => (
          <CompetencyBlock comp={c} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
        )}
        emptyItem={() => emptyCompetency()}
      />

      <RepeatSection
        title="Activity spaces"
        items={getArr("activitySpaces")}
        onReplace={(xs) => setRoot("activitySpaces", xs)}
        addLabel="+ Add activity space (includes one contributesTo slice & nested scaffolding)"
        renderItem={(sp, i, mutate) => (
          <ActivitySpaceBlock
            space={sp}
            focusHint={defaultFocusHint}
            focusOptions={focusOptions}
            alphaOptions={alphaOptions}
            onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])}
          />
        )}
        emptyItem={() => emptyActivitySpace(defaultFocusHint)}
      />

      <RepeatSection
        title="Flat activities (Practice.activities)"
        items={getArr("activities")}
        onReplace={(xs) => setRoot("activities", xs)}
        addLabel="+ Add activity"
        renderItem={(a, i, mutate) => (
          <ActivityBlock act={a} focusOptions={focusOptions} alphaOptions={alphaOptions} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
        )}
        emptyItem={() => emptyActivity("")}
      />

      <RepeatSection
        title="Work products"
        items={getArr("workProducts")}
        onReplace={(xs) => setRoot("workProducts", xs)}
        addLabel="+ Add work product (includes 2 levels of detail)"
        renderItem={(wp, i, mutate) => (
          <WorkProductBlock wp={wp} alphaOptions={alphaOptions} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
        )}
        emptyItem={() => emptyWorkProduct()}
      />

      {kind === "extension" ? (
        <>
          <RepeatSection
            title="Personas"
            items={getArr("personas")}
            onReplace={(xs) => setRoot("personas", xs)}
            addLabel="+ Add persona"
            renderItem={(p, i, mutate) => (
              <PersonaBlock persona={p} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
            )}
            emptyItem={() => emptyPersona()}
          />
          <RepeatSection
            title="Persona groups"
            items={getArr("personaGroups")}
            onReplace={(xs) => setRoot("personaGroups", xs)}
            addLabel="+ Add persona group"
            renderItem={(pg, i, mutate) => (
              <PersonaGroupBlock group={pg} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
            )}
            emptyItem={() => emptyPersonaGroup()}
          />
          <RepeatSection
            title="Alpha instance names (practice tags)"
            items={getArr("alphaInstances")}
            onReplace={(xs) => setRoot("alphaInstances", xs)}
            addLabel="+ Add alpha instance name"
            renderItem={(row, i, mutate) => (
              <AlphaInstanceNameBlock
                row={row}
                onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])}
              />
            )}
            emptyItem={() => emptyAlphaInstanceName()}
          />
          <RepeatSection
            title="Work product instance names (practice tags)"
            items={getArr("workProductInstances")}
            onReplace={(xs) => setRoot("workProductInstances", xs)}
            addLabel="+ Add work product instance name"
            renderItem={(row, i, mutate) => (
              <WorkProductInstanceNameBlock
                row={row}
                onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])}
              />
            )}
            emptyItem={() => emptyWorkProductInstanceName()}
          />
        </>
      ) : null}

      <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>Narratives</h3>
          <Btn onClick={() => setRoot("narrativeTypes", [...getArr("narrativeTypes"), emptyNarrativeType()])}>
            + Add Narrative
          </Btn>
        </div>
        {getArr("narrativeTypes").map((nt, i) => (
          <NarrativeTypeBlock
            key={i}
            nt={nt}
            index={i}
            onChange={(next) => {
              const arr = getArr("narrativeTypes");
              setRoot("narrativeTypes", [...arr.slice(0, i), next, ...arr.slice(i + 1)]);
            }}
            onRemove={() => {
              const arr = getArr("narrativeTypes");
              setRoot("narrativeTypes", arr.filter((_, j) => j !== i));
            }}
          />
        ))}
      </div>

      <RepeatSection
        title="Patterns"
        items={getArr("patterns")}
        onReplace={(xs) => setRoot("patterns", xs)}
        addLabel="+ Add pattern (includes one pattern view)"
        renderItem={(p, i, mutate) => (
          <PatternBlock pat={p} onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])} />
        )}
        emptyItem={() => emptyPattern()}
      />

      <RepeatSection
        title="Practice element aliases"
        items={getArr("practiceElementAliases")}
        onReplace={(xs) => setRoot("practiceElementAliases", xs)}
        addLabel="+ Add alias"
        renderItem={(alias, i, mutate) => (
          <PracticeElementAliasBlock
            alias={alias}
            onChange={(next) => mutate((list) => [...list.slice(0, i), next, ...list.slice(i + 1)])}
          />
        )}
        emptyItem={() => emptyPracticeElementAlias()}
      />
    </div>
  );
}

function sx(x: Record<string, unknown>, k: string): string {
  return typeof x[k] === "string" ? (x[k] as string) : "";
}
function ix(x: Record<string, unknown>, k: string): number {
  return typeof x[k] === "number" && Number.isFinite(x[k] as number) ? (x[k] as number) : 0;
}
function arr<T>(x: Record<string, unknown>, k: string): T[] {
  return Array.isArray(x[k]) ? (x[k] as T[]) : [];
}
function strArrFromLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
function linesFromStrArr(a: unknown): string {
  if (!Array.isArray(a)) return "";
  const lines = a.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const an = String(o.alphaName ?? "").trim();
      const sn = String(o.stateName ?? "").trim();
      if (an && sn) return `${an}→${sn}`;
      const raw = String(o.raw ?? "").trim();
      if (raw) return raw;
    }
    return String(item ?? "").trim();
  });
  return lines.filter(Boolean).join("\n");
}

function practiceElFields(
  el: Record<string, unknown>,
  onPatch: (fn: (e: Record<string, unknown>) => Record<string, unknown>) => void,
) {
  const tb = practiceTagsBucketLines(el.tags);
  return (
    <>
      <label style={lab}>Name</label>
      <input value={sx(el, "name")} onChange={(e) => onPatch((prev) => ({ ...prev, name: e.target.value }))} style={{ ...inp, marginBottom: 8 }} />
      <label style={lab}>Description</label>
      <textarea
        value={sx(el, "description")}
        onChange={(e) => onPatch((prev) => ({ ...prev, description: e.target.value }))}
        style={{ ...inp, minHeight: 48, marginBottom: 8 }}
      />
      <label style={lab}>Tags — domain (one per line)</label>
      <textarea
        value={tb.domain}
        onChange={(e) =>
          onPatch((prev) =>
            patchPracticeElementTagsBucket(prev, {
              domain: e.target.value,
              lifecycle: tb.lifecycle,
              organizational: tb.organizational,
            }),
          )
        }
        style={{ ...inp, minHeight: 36, fontFamily: "inherit", marginBottom: 6 }}
      />
      <label style={lab}>Tags — lifecycle (one per line)</label>
      <textarea
        value={tb.lifecycle}
        onChange={(e) =>
          onPatch((prev) =>
            patchPracticeElementTagsBucket(prev, {
              domain: tb.domain,
              lifecycle: e.target.value,
              organizational: tb.organizational,
            }),
          )
        }
        style={{ ...inp, minHeight: 36, fontFamily: "inherit", marginBottom: 6 }}
      />
      <label style={lab}>Tags — organizational (one per line)</label>
      <textarea
        value={tb.organizational}
        onChange={(e) =>
          onPatch((prev) =>
            patchPracticeElementTagsBucket(prev, {
              domain: tb.domain,
              lifecycle: tb.lifecycle,
              organizational: e.target.value,
            }),
          )
        }
        style={{ ...inp, minHeight: 36, fontFamily: "inherit" }}
      />
    </>
  );
}

function nextSeq(list: Record<string, unknown>[]): number {
  return list.reduce((m, row) => Math.max(m, ix(row, "seq")), 0) + 1;
}

function moveIndex<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/** Assign `seq` 1 … n from array order (preview and merge sort by seq). */
function withRenumberedSeq<T extends Record<string, unknown>>(list: T[]): T[] {
  return list.map((row, i) => ({ ...row, seq: i + 1 })) as T[];
}

function AlphaBlock({
  alpha,
  focusHint,
  focusOptions,
  alphaOptions,
  onChange,
}: {
  alpha: Record<string, unknown>;
  focusHint: string;
  focusOptions: string[];
  alphaOptions: string[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...alpha })), [alpha, onChange]);
  const states = arr<Record<string, unknown>>(alpha, "states");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(alpha, patch)}
      <FocusNameSelect
        label="focusName"
        options={focusOptions}
        value={sx(alpha, "focusName") || focusHint}
        onChange={(v) => patch((a) => ({ ...a, focusName: v }))}
      />
      <label style={lab}>contributesTo (optional alpha name)</label>
      <select
        value={sx(alpha, "contributesTo")}
        onChange={(e) => patch((a) => ({ ...a, contributesTo: e.target.value }))}
        style={sel}
      >
        <option value="">-- None (root alpha) --</option>
        {alphaOptions.map((alphaName) => (
          <option key={alphaName} value={alphaName}>
            {alphaName}
          </option>
        ))}
      </select>
      <RepeatSection
        title="States"
        items={states}
        onReplace={(xs) => patch((a) => ({ ...a, states: xs }))}
        addLabel="+ Add state"
        renumberSeq
        emptyItem={() => emptyState(1)}
        renderItem={(st, si, mutate) => (
          <StateBlock
            state={st}
            onChange={(next) => mutate((list) => [...list.slice(0, si), next, ...list.slice(si + 1)])}
          />
        )}
      />
    </div>
  );
}

function StateBlock({ state, onChange }: { state: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...state })), [state, onChange]);
  const checklist = arr<Record<string, unknown>>(state, "checklist");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(state, patch)}
      <RepeatSection
        title="Checklist items"
        items={checklist}
        onReplace={(xs) => patch((s) => ({ ...s, checklist: xs }))}
        addLabel="+ Add checklist item"
        renumberSeq
        emptyItem={() => checklistItem(1)}
        renderItem={(ch, ci, mutate) => (
          <div style={{ display: "grid", gap: 6 }}>
            <input
              placeholder="Name"
              value={sx(ch, "name")}
              onChange={(e) =>
                mutate((list) => [...list.slice(0, ci), { ...ch, name: e.target.value }, ...list.slice(ci + 1)])
              }
              style={inp}
            />
            <textarea
              placeholder="Description"
              value={sx(ch, "description")}
              onChange={(e) =>
                mutate((list) => [...list.slice(0, ci), { ...ch, description: e.target.value }, ...list.slice(ci + 1)])
              }
              style={{ ...inp, minHeight: 44 }}
            />
          </div>
        )}
      />
    </div>
  );
}

function CompetencyBlock({ comp, onChange }: { comp: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...comp })), [comp, onChange]);
  const levels = arr<Record<string, unknown>>(comp, "levels");
  const cname = sx(comp, "name");
  function syncLevelsName(nextCompName: string) {
    patch((c) => ({
      ...c,
      name: nextCompName,
      levels: arr<Record<string, unknown>>(c, "levels").map((lv) => ({ ...lv, competencyName: nextCompName })),
    }));
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={lab}>Name</label>
      <input value={cname} onChange={(e) => syncLevelsName(e.target.value)} style={{ ...inp, marginBottom: 8 }} />
      <label style={lab}>Description</label>
      <textarea
        value={sx(comp, "description")}
        onChange={(e) => patch((c) => ({ ...c, description: e.target.value }))}
        style={{ ...inp, minHeight: 48, marginBottom: 8 }}
      />
      <label style={lab}>Tags — domain (one per line)</label>
      <textarea
        value={practiceTagsBucketLines(comp.tags).domain}
        onChange={(e) => {
          const cur = practiceTagsBucketLines(comp.tags);
          patch((c) =>
            patchPracticeElementTagsBucket(c, {
              domain: e.target.value,
              lifecycle: cur.lifecycle,
              organizational: cur.organizational,
            }),
          );
        }}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit", marginBottom: 6 }}
      />
      <label style={lab}>Tags — lifecycle (one per line)</label>
      <textarea
        value={practiceTagsBucketLines(comp.tags).lifecycle}
        onChange={(e) => {
          const cur = practiceTagsBucketLines(comp.tags);
          patch((c) =>
            patchPracticeElementTagsBucket(c, {
              domain: cur.domain,
              lifecycle: e.target.value,
              organizational: cur.organizational,
            }),
          );
        }}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit", marginBottom: 6 }}
      />
      <label style={lab}>Tags — organizational (one per line)</label>
      <textarea
        value={practiceTagsBucketLines(comp.tags).organizational}
        onChange={(e) => {
          const cur = practiceTagsBucketLines(comp.tags);
          patch((c) =>
            patchPracticeElementTagsBucket(c, {
              domain: cur.domain,
              lifecycle: cur.lifecycle,
              organizational: e.target.value,
            }),
          );
        }}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit", marginBottom: 8 }}
      />
      <RepeatSection
        title="Levels"
        items={levels}
        onReplace={(xs) => patch((c) => ({ ...c, levels: xs.map((lv) => ({ ...lv, competencyName: cname })) }))}
        addLabel="+ Add level"
        emptyItem={() => emptyCompetencyLevel(nextSeq(levels), cname)}
        renderItem={(lv, li, mutate) => (
          <div style={{ display: "grid", gap: 6 }}>
            <label style={lab}>level</label>
            <input
              type="number"
              value={ix(lv, "level") || ""}
              onChange={(e) =>
                mutate((list) =>
                  [...list.slice(0, li), { ...lv, level: Number(e.target.value) || 0, competencyName: cname }, ...list.slice(li + 1)],
                )
              }
              style={inp}
            />
            <input value={sx(lv, "name")} onChange={(e) => mutate((list) => [...list.slice(0, li), { ...lv, name: e.target.value }, ...list.slice(li + 1)])} style={inp} />
            <textarea
              value={sx(lv, "description")}
              onChange={(e) => mutate((list) => [...list.slice(0, li), { ...lv, description: e.target.value }, ...list.slice(li + 1)])}
              style={{ ...inp, minHeight: 40 }}
            />
          </div>
        )}
      />
    </div>
  );
}

function ActivitySpaceBlock({
  space,
  focusHint,
  focusOptions,
  alphaOptions,
  onChange,
}: {
  space: Record<string, unknown>;
  focusHint: string;
  focusOptions: string[];
  alphaOptions: string[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...space })), [space, onChange]);
  const contributes = arr<Record<string, unknown>>(space, "contributesTo");
  const activities = arr<Record<string, unknown>>(space, "activities");
  const spaceName = sx(space, "name");
  const reqLines = linesFromStrArr(space.requiredCompetencies);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(space, patch)}
      <FocusNameSelect
        label="focusName"
        options={focusOptions}
        value={sx(space, "focusName") || focusHint}
        onChange={(v) => patch((s) => ({ ...s, focusName: v }))}
      />
      <label style={lab}>requiredCompetencies (one per line)</label>
      <textarea
        value={reqLines}
        onChange={(e) => patch((s) => ({ ...s, requiredCompetencies: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 40, fontFamily: "inherit" }}
      />
      <label style={lab}>involves — PersonaGroup.name (one per line)</label>
      <textarea
        value={linesFromStrArr(space.involves)}
        onChange={(e) => patch((s) => ({ ...s, involves: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit" }}
      />
      <RepeatSection
        title="contributesTo (alpha slices)"
        items={contributes}
        onReplace={(xs) => patch((s) => ({ ...s, contributesTo: xs.length ? xs : [alphaContribution()] }))}
        addLabel="+ Add alpha contribution"
        emptyItem={() => alphaContribution()}
        renderItem={(ct, ii, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={sx(ct, "alphaName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, alphaName: e.target.value }, ...list.slice(ii + 1)])}
              style={sel}
            >
              <option value="">-- Select alpha --</option>
              {alphaOptions.map((alphaName) => (
                <option key={alphaName} value={alphaName}>
                  {alphaName}
                </option>
              ))}
            </select>
            <input
              placeholder="stateName"
              value={sx(ct, "stateName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, stateName: e.target.value }, ...list.slice(ii + 1)])}
              style={inp}
            />
          </div>
        )}
      />
      <RepeatSection
        title="Nested activities"
        items={activities}
        onReplace={(xs) => patch((s) => ({ ...s, activities: xs }))}
        addLabel="+ Add nested activity"
        emptyItem={() => emptyActivity(spaceName)}
        renderItem={(act, ai, mutate) => (
          <ActivityBlockEmbedded
            act={act}
            parentSpaceName={spaceName}
            focusHint={sx(space, "focusName") || focusHint}
            focusOptions={focusOptions}
            alphaOptions={alphaOptions}
            onChange={(next) => mutate((list) => [...list.slice(0, ai), next, ...list.slice(ai + 1)])}
          />
        )}
      />
    </div>
  );
}

/** Activity nested under ActivitySpace (defaults parent ActivitySpace.name on activitySpaceName). */
function ActivityBlockEmbedded({
  act,
  parentSpaceName,
  focusHint,
  focusOptions,
  alphaOptions,
  onChange,
}: {
  act: Record<string, unknown>;
  parentSpaceName: string;
  focusHint: string;
  focusOptions: string[];
  alphaOptions: string[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...act })), [act, onChange]);
  return <ActivityCore patch={patch} el={act} activitySpaceDefault={parentSpaceName} focusDefault={focusHint} focusOptions={focusOptions} alphaOptions={alphaOptions} />;
}

/** Practice.activities swimlane rows (activitySpaceName required in interchange). */
function ActivityBlock({
  act,
  focusOptions,
  alphaOptions,
  onChange,
}: {
  act: Record<string, unknown>;
  focusOptions: string[];
  alphaOptions: string[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...act })), [act, onChange]);
  return <ActivityCore patch={patch} el={act} activitySpaceDefault="" focusDefault="" focusOptions={focusOptions} alphaOptions={alphaOptions} />;
}

function ActivityCore({
  patch,
  el,
  activitySpaceDefault,
  focusDefault,
  focusOptions,
  alphaOptions,
}: {
  patch: (fn: (x: Record<string, unknown>) => Record<string, unknown>) => void;
  el: Record<string, unknown>;
  activitySpaceDefault: string;
  focusDefault: string;
  focusOptions: string[];
  alphaOptions: string[];
}) {
  const contributes = arr<Record<string, unknown>>(el, "contributesTo");
  const req = linesFromStrArr(el.requiredCompetencies);
  const worksOn = arr<Record<string, unknown>>(el, "worksOn");
  const rec = arr<Record<string, unknown>>(el, "recommendedCompetencyLevels");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(el, patch)}
      <label style={lab}>activitySpaceName</label>
      <input
        value={sx(el, "activitySpaceName") || activitySpaceDefault}
        onChange={(e) => patch((a) => ({ ...a, activitySpaceName: e.target.value }))}
        style={inp}
      />
      <FocusNameSelect
        label="focusName"
        options={focusOptions}
        value={sx(el, "focusName") || focusDefault}
        onChange={(v) => patch((a) => ({ ...a, focusName: v }))}
      />
      <label style={lab}>requiredCompetencies (one per line)</label>
      <textarea
        value={req}
        onChange={(e) => patch((a) => ({ ...a, requiredCompetencies: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit" }}
      />
      <RepeatSection
        title="contributesTo"
        items={contributes}
        onReplace={(xs) => patch((a) => ({ ...a, contributesTo: xs }))}
        addLabel="+ Add alpha contribution"
        emptyItem={() => alphaContribution()}
        renderItem={(ct, ii, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={sx(ct, "alphaName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, alphaName: e.target.value }, ...list.slice(ii + 1)])}
              style={sel}
            >
              <option value="">-- Select alpha --</option>
              {alphaOptions.map((alphaName) => (
                <option key={alphaName} value={alphaName}>
                  {alphaName}
                </option>
              ))}
            </select>
            <input
              placeholder="stateName"
              value={sx(ct, "stateName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, stateName: e.target.value }, ...list.slice(ii + 1)])}
              style={inp}
            />
          </div>
        )}
      />
      <RepeatSection
        title="worksOn"
        items={worksOn}
        onReplace={(xs) => patch((a) => ({ ...a, worksOn: xs }))}
        addLabel="+ Add work-product slice"
        emptyItem={() => workProductContribution()}
        renderItem={(wo, wi, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="workProductName"
              value={sx(wo, "workProductName")}
              onChange={(e) => mutate((list) => [...list.slice(0, wi), { ...wo, workProductName: e.target.value }, ...list.slice(wi + 1)])}
              style={inp}
            />
            <input
              placeholder="levelOfDetailName"
              value={sx(wo, "levelOfDetailName")}
              onChange={(e) => mutate((list) => [...list.slice(0, wi), { ...wo, levelOfDetailName: e.target.value }, ...list.slice(wi + 1)])}
              style={inp}
            />
          </div>
        )}
      />
      <RepeatSection
        title="recommendedCompetencyLevels"
        items={rec}
        onReplace={(xs) => patch((a) => ({ ...a, recommendedCompetencyLevels: xs }))}
        addLabel="+ Add competency level ref"
        emptyItem={() => competencyLevelRef()}
        renderItem={(r, ri, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="competencyName"
              value={sx(r, "competencyName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ri), { ...r, competencyName: e.target.value }, ...list.slice(ri + 1)])}
              style={inp}
            />
            <input
              placeholder="competencyLevelName"
              value={sx(r, "competencyLevelName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ri), { ...r, competencyLevelName: e.target.value }, ...list.slice(ri + 1)])}
              style={inp}
            />
          </div>
        )}
      />
    </div>
  );
}

function WorkProductBlock({ wp, alphaOptions, onChange }: { wp: Record<string, unknown>; alphaOptions: string[]; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...wp })), [wp, onChange]);
  const lods = arr<Record<string, unknown>>(wp, "levelsOfDetail");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(wp, patch)}
      <RepeatSection
        title="levelsOfDetail"
        items={lods}
        onReplace={(xs) => patch((w) => ({ ...w, levelsOfDetail: xs.length >= 2 ? xs : [emptyLevelOfDetail(1), emptyLevelOfDetail(2)] }))}
        addLabel="+ Add level of detail"
        renumberSeq
        emptyItem={() => emptyLevelOfDetail(1)}
        renderItem={(lod, li, mutate) => (
          <LevelOfDetailBlock lod={lod} alphaOptions={alphaOptions} onChange={(next) => mutate((list) => [...list.slice(0, li), next, ...list.slice(li + 1)])} />
        )}
      />
    </div>
  );
}

function LevelOfDetailBlock({ lod, alphaOptions, onChange }: { lod: Record<string, unknown>; alphaOptions: string[]; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...lod })), [lod, onChange]);
  const checklist = arr<Record<string, unknown>>(lod, "checklist");
  const cts = arr<Record<string, unknown>>(lod, "contributesTo");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(lod, patch)}
      <RepeatSection
        title="contributesTo (min 1)"
        items={cts}
        onReplace={(xs) => patch((x) => ({ ...x, contributesTo: xs.length ? xs : [alphaContribution()] }))}
        addLabel="+ Add alpha contribution"
        emptyItem={() => alphaContribution()}
        renderItem={(ct, ii, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={sx(ct, "alphaName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, alphaName: e.target.value }, ...list.slice(ii + 1)])}
              style={sel}
            >
              <option value="">-- Select alpha --</option>
              {alphaOptions.map((alphaName) => (
                <option key={alphaName} value={alphaName}>
                  {alphaName}
                </option>
              ))}
            </select>
            <input
              placeholder="stateName"
              value={sx(ct, "stateName")}
              onChange={(e) => mutate((list) => [...list.slice(0, ii), { ...ct, stateName: e.target.value }, ...list.slice(ii + 1)])}
              style={inp}
            />
          </div>
        )}
      />
      <RepeatSection
        title="Checklist"
        items={checklist}
        onReplace={(xs) => patch((x) => ({ ...x, checklist: xs }))}
        addLabel="+ Item"
        renumberSeq
        emptyItem={() => checklistItem(1)}
        renderItem={(ch, ci, mutate) => (
          <div style={{ display: "grid", gap: 6 }}>
            <input
              placeholder="Name"
              value={sx(ch, "name")}
              onChange={(e) => mutate((list) => [...list.slice(0, ci), { ...ch, name: e.target.value }, ...list.slice(ci + 1)])}
              style={inp}
            />
            <textarea
              placeholder="Description"
              value={sx(ch, "description")}
              onChange={(e) => mutate((list) => [...list.slice(0, ci), { ...ch, description: e.target.value }, ...list.slice(ci + 1)])}
              style={{ ...inp, minHeight: 40 }}
            />
          </div>
        )}
      />
    </div>
  );
}

function NarrativeTypeBlock({
  nt,
  index,
  onChange,
  onRemove,
}: {
  nt: Record<string, unknown>;
  index: number;
  onChange: (next: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...nt })), [nt, onChange]);
  const els = arr<Record<string, unknown>>(nt, "narrativeElements");

  return (
    <div style={{ marginBottom: 24, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {/* Narrative header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          padding: 12,
          background: "rgba(0,0,0,0.05)",
          borderBottom: "1px solid var(--border)",
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700 }}>#{index + 1}</span>
        <div>
          <strong>{sx(nt, "name") || "(Unnamed Narrative)"}</strong>
          {sx(nt, "name") && <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 13 }}>[{sx(nt, "name")}]</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onRemove}
            style={{
              ...moveBtnStyle,
              background: "rgba(220,38,38,0.1)",
              borderColor: "rgba(220,38,38,0.3)",
              color: "rgb(220,38,38)",
            }}
            title="Remove narrative"
          >
            ×
          </button>
        </div>
      </div>

      {/* Narrative fields */}
      <div style={{ padding: 12, display: "grid", gap: 8, background: "white" }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "start" }}>
          <label style={{ ...lab, marginBottom: 0 }}>Narrative Name</label>
          <input value={sx(nt, "name")} onChange={(e) => patch((prev) => ({ ...prev, name: e.target.value }))} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "start" }}>
          <label style={{ ...lab, marginBottom: 0 }}>Description</label>
          <textarea
            value={sx(nt, "description")}
            onChange={(e) => patch((prev) => ({ ...prev, description: e.target.value }))}
            style={{ ...inp, minHeight: 60 }}
          />
        </div>
      </div>

      {/* Narrative Contexts section */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>Narrative Contexts</span>
          <Btn
            onClick={() =>
              patch((n) => ({
                ...n,
                narrativeElements: [...arr<Record<string, unknown>>(n, "narrativeElements"), { ...emptyPracticeElementStub(), howToUse: "" }],
              }))
            }
          >
            + Add Context
          </Btn>
        </div>

        {/* Contexts table */}
        {els.length > 0 && (
          <div style={{ border: "1px solid var(--border)", margin: 12, borderRadius: 6, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                  <th style={{ padding: 8, textAlign: "left", width: 40, borderBottom: "1px solid var(--border)" }}>#</th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Name</th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Description</th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>How to Use</th>
                  <th style={{ padding: 8, textAlign: "right", width: 100, borderBottom: "1px solid var(--border)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {els.map((el, i) => (
                  <tr key={i} style={{ borderBottom: i < els.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: 8 }}>{i + 1}</td>
                    <td style={{ padding: 8 }}>
                      <input
                        value={sx(el, "name")}
                        onChange={(e) =>
                          patch((n) => ({
                            ...n,
                            narrativeElements: [
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(0, i),
                              { ...el, name: e.target.value },
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(i + 1),
                            ],
                          }))
                        }
                        style={{ ...inp, padding: 6 }}
                        placeholder="Context name"
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <textarea
                        value={sx(el, "description")}
                        onChange={(e) =>
                          patch((n) => ({
                            ...n,
                            narrativeElements: [
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(0, i),
                              { ...el, description: e.target.value },
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(i + 1),
                            ],
                          }))
                        }
                        style={{ ...inp, minHeight: 40, padding: 6 }}
                        placeholder="Description"
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <textarea
                        value={sx(el, "howToUse")}
                        onChange={(e) =>
                          patch((n) => ({
                            ...n,
                            narrativeElements: [
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(0, i),
                              { ...el, howToUse: e.target.value },
                              ...arr<Record<string, unknown>>(n, "narrativeElements").slice(i + 1),
                            ],
                          }))
                        }
                        style={{ ...inp, minHeight: 40, padding: 6 }}
                        placeholder="How to use"
                      />
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() =>
                          patch((n) => ({
                            ...n,
                            narrativeElements: arr<Record<string, unknown>>(n, "narrativeElements").filter((_, j) => j !== i),
                          }))
                        }
                        style={{
                          ...moveBtnStyle,
                          background: "rgba(220,38,38,0.1)",
                          borderColor: "rgba(220,38,38,0.3)",
                          color: "rgb(220,38,38)",
                        }}
                        title="Remove context"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function emptyPracticeElementStub() {
  return { name: "", description: "" } as Record<string, unknown>;
}

function PersonaBlock({ persona, onChange }: { persona: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...persona })), [persona, onChange]);
  const comps = arr<Record<string, unknown>>(persona, "competencies");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(persona, patch)}
      <RepeatSection
        title="competencies (level refs)"
        items={comps}
        onReplace={(xs) => patch((p) => ({ ...p, competencies: xs }))}
        addLabel="+ competency level ref"
        emptyItem={() => competencyLevelRef()}
        renderItem={(r, i, mutate) => (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="competencyName"
              value={sx(r, "competencyName")}
              onChange={(e) => mutate((list) => [...list.slice(0, i), { ...r, competencyName: e.target.value }, ...list.slice(i + 1)])}
              style={inp}
            />
            <input
              placeholder="competencyLevelName"
              value={sx(r, "competencyLevelName")}
              onChange={(e) => mutate((list) => [...list.slice(0, i), { ...r, competencyLevelName: e.target.value }, ...list.slice(i + 1)])}
              style={inp}
            />
          </div>
        )}
      />
    </div>
  );
}

function PersonaGroupBlock({ group, onChange }: { group: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...group })), [group, onChange]);
  const lines = linesFromStrArr(group.personaNames);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(group, patch)}
      <label style={lab}>personaNames (one per line)</label>
      <textarea
        value={lines}
        onChange={(e) => patch((g) => ({ ...g, personaNames: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 56 }}
      />
    </div>
  );
}

function AlphaInstanceNameBlock({
  row,
  onChange,
}: {
  row: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...row })), [row, onChange]);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(row, patch)}
      <label style={lab}>alphaName</label>
      <input
        value={sx(row, "alphaName")}
        onChange={(e) => patch((r) => ({ ...r, alphaName: e.target.value }))}
        style={inp}
      />
    </div>
  );
}

function WorkProductInstanceNameBlock({
  row,
  onChange,
}: {
  row: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...row })), [row, onChange]);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(row, patch)}
      <label style={lab}>workProductName</label>
      <input
        value={sx(row, "workProductName")}
        onChange={(e) => patch((r) => ({ ...r, workProductName: e.target.value }))}
        style={inp}
      />
    </div>
  );
}

function PatternBlock({ pat, onChange }: { pat: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...pat })), [pat, onChange]);
  const views = arr<Record<string, unknown>>(pat, "patternViews");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(pat, patch)}
      <label style={lab}>narrativeTypeName (optional)</label>
      <input
        value={sx(pat, "narrativeTypeName")}
        onChange={(e) => patch((p) => ({ ...p, narrativeTypeName: e.target.value }))}
        style={inp}
      />
      <RepeatSection
        title="patternViews"
        items={views}
        onReplace={(xs) => patch((p) => ({ ...p, patternViews: xs.length ? xs : [emptyPatternView(1)] }))}
        addLabel="+ Add pattern view"
        renumberSeq
        emptyItem={() => emptyPatternView(1)}
        renderItem={(v, vi, mutate) => (
          <PatternViewBlock view={v} onChange={(next) => mutate((list) => [...list.slice(0, vi), next, ...list.slice(vi + 1)])} />
        )}
      />
    </div>
  );
}

function PatternViewBlock({
  view,
  onChange,
}: {
  view: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...view })), [view, onChange]);
  const ast = linesFromStrArr(view.alphaStates);
  const ain = arr<Record<string, unknown>>(view, "alphaInstances");
  /* alphaStates can mix strings + objects; we edit as lines of tokens */

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(view, patch)}
      <label style={lab}>narrativeElementName (optional)</label>
      <input
        value={sx(view, "narrativeElementName")}
        onChange={(e) => patch((v) => ({ ...v, narrativeElementName: e.target.value }))}
        style={inp}
      />

      <label style={lab}>alphaStates (one token per line; alpha→state shortcuts ok)</label>
      <textarea
        value={ast}
        onChange={(e) => patch((x) => ({ ...x, alphaStates: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 48, fontFamily: "inherit" }}
      />
      <RepeatSection
        title="alphaInstances"
        items={ain}
        onReplace={(xs) => patch((v) => ({ ...v, alphaInstances: xs }))}
        addLabel="+ Add alpha instance row"
        renderItem={(inst, ii, mutate) => (
          <PatternViewAlphaInstanceBlock
            inst={inst}
            onChange={(next) => mutate((list) => [...list.slice(0, ii), next, ...list.slice(ii + 1)])}
          />
        )}
        emptyItem={() => emptyAlphaInstance()}
      />
      <label style={lab}>activitySpaces (one per line)</label>
      <textarea
        value={linesFromStrArr(view.activitySpaces)}
        onChange={(e) => patch((x) => ({ ...x, activitySpaces: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit" }}
      />
      <label style={lab}>activities (one per line)</label>
      <textarea
        value={linesFromStrArr(view.activities)}
        onChange={(e) => patch((x) => ({ ...x, activities: strArrFromLines(e.target.value) }))}
        style={{ ...inp, minHeight: 36, fontFamily: "inherit" }}
      />
    </div>
  );
}

function PatternViewAlphaInstanceBlock({
  inst,
  onChange,
}: {
  inst: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...inst })), [inst, onChange]);
  const evid = arr<Record<string, unknown>>(inst, "evidenceBy");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(inst, patch)}
      <label style={lab}>alphaName</label>
      <input
        value={sx(inst, "alphaName")}
        onChange={(e) => patch((r) => ({ ...r, alphaName: e.target.value }))}
        style={inp}
      />
      <label style={lab}>stateName</label>
      <input
        value={sx(inst, "stateName")}
        onChange={(e) => patch((r) => ({ ...r, stateName: e.target.value }))}
        style={inp}
      />
      <RepeatSection
        title="evidenceBy"
        items={evid}
        onReplace={(xs) => patch((r) => ({ ...r, evidenceBy: xs }))}
        addLabel="+ embedded work-product instance"
        emptyItem={() => emptyEmbeddedWorkProductInstance()}
        renderItem={(wp, wi, mutate) => (
          <EmbeddedWorkProductInstanceBlock
            row={wp}
            onChange={(next) => mutate((list) => [...list.slice(0, wi), next, ...list.slice(wi + 1)])}
          />
        )}
      />
    </div>
  );
}

function EmbeddedWorkProductInstanceBlock({
  row,
  onChange,
}: {
  row: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const patch = useCallback((fn: (x: Record<string, unknown>) => Record<string, unknown>) => onChange(fn({ ...row })), [row, onChange]);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {practiceElFields(row, patch)}
      <label style={lab}>workProductName</label>
      <input
        value={sx(row, "workProductName")}
        onChange={(e) => patch((r) => ({ ...r, workProductName: e.target.value }))}
        style={inp}
      />
      <label style={lab}>levelOfDetailName</label>
      <input
        value={sx(row, "levelOfDetailName")}
        onChange={(e) => patch((r) => ({ ...r, levelOfDetailName: e.target.value }))}
        style={inp}
      />
    </div>
  );
}

function PracticeElementAliasBlock({ alias, onChange }: { alias: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const elementTypes = [
    "Alpha",
    "ActivitySpace",
    "Activity",
    "WorkProduct",
    "Focus",
    "Pattern",
    "PatternView",
    "Persona",
    "PersonaGroup",
    "Competency",
    "Practice",
    "PracticeBaseline",
  ];

  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
      <div>
        <label style={lab}>Element Type</label>
        <select
          value={sx(alias, "practiceElementType")}
          onChange={(e) => onChange({ ...alias, practiceElementType: e.target.value })}
          style={sel}
        >
          <option value="">-- Select type --</option>
          {elementTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={lab}>Original Name</label>
        <input
          placeholder="Original element name"
          value={sx(alias, "practiceElementName")}
          onChange={(e) => onChange({ ...alias, practiceElementName: e.target.value })}
          style={inp}
        />
      </div>
      <div>
        <label style={lab}>Alias Name</label>
        <input
          placeholder="Display alias"
          value={sx(alias, "aliasName")}
          onChange={(e) => onChange({ ...alias, aliasName: e.target.value })}
          style={inp}
        />
      </div>
    </div>
  );
}

const moveBtnStyle: CSSProperties = {
  fontSize: 14,
  minWidth: 32,
  padding: "4px 8px",
  cursor: "pointer",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
};

function RepeatSection<T extends Record<string, unknown>>({
  title,
  items,
  onReplace,
  renderItem,
  emptyItem,
  addLabel,
  renumberSeq = false,
}: {
  title: string;
  items: T[];
  onReplace: (next: T[]) => void;
  renderItem: (item: T, index: number, mutate: (fn: (list: T[]) => T[]) => void) => ReactNode;
  emptyItem: () => T;
  addLabel: string;
  renumberSeq?: boolean;
}) {
  const normalize = useCallback(
    (list: T[]): T[] => (renumberSeq ? (withRenumberedSeq(list) as T[]) : list),
    [renumberSeq],
  );

  const mutateList = useCallback(
    (fn: (list: T[]) => T[]) => {
      onReplace(normalize(fn([...items])));
    },
    [items, onReplace, normalize],
  );
  return (
    <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
      <legend style={{ padding: "0 6px", fontWeight: 800 }}>{title}</legend>
      {items.map((it, idx) => (
        <details
          key={idx}
          open={items.length <= 8}
          style={{
            marginBottom: 12,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 8,
            background: "rgba(0,0,0,0.12)",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {title.replace(/s$/, "")} {idx + 1}
          </summary>
          <div style={{ marginTop: 8 }}>
            {renderItem(it, idx, mutateList)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
              {renumberSeq && items.length > 1 ? (
                <>
                  <button
                    type="button"
                    title="Move up"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => onReplace(normalize(moveIndex(items, idx, idx - 1) as T[]))}
                    style={{
                      ...moveBtnStyle,
                      opacity: idx === 0 ? 0.45 : 1,
                      cursor: idx === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    aria-label="Move down"
                    disabled={idx === items.length - 1}
                    onClick={() => onReplace(normalize(moveIndex(items, idx, idx + 1) as T[]))}
                    style={{
                      ...moveBtnStyle,
                      opacity: idx === items.length - 1 ? 0.45 : 1,
                      cursor: idx === items.length - 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ↓
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => onReplace(normalize(items.filter((_, j) => j !== idx)))}
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </details>
      ))}
      <Btn onClick={() => onReplace(normalize([...items, emptyItem()]))}>{addLabel}</Btn>
    </fieldset>
  );
}
