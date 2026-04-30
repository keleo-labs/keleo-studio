/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateAgainstSchema } from "@/lib/validate";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  buildIndexes,
  enrichBaselineWithReferencedWrappers,
} from "@/lib/ir";
import { PracticeHumanReadablePanel } from "@/components/PracticeHumanReadablePanel";
import { inferPracticeDocKind, PracticeAuthorForm } from "@/components/PracticeAuthorForm";
import { displayNameForBody, storageKindForBody } from "@/lib/library/classify";
import { emptyExtensionPractice } from "@/lib/practiceFormDefaults";
import { useTheme } from "@/lib/theme";
import { useLanguagePack } from "@/lib/languagePack";

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

/** Matches the form column scroll area; preview scrolls horizontally for wide diagrams and vertically for long docs. */
const previewViewport: React.CSSProperties = {
  alignSelf: "start",
  width: "100%",
  height: "min(70vh, 720px)",
  minHeight: 0,
  overflow: "auto",
};

function linkStyle(): React.CSSProperties {
  return {
    color: "inherit",
    textDecoration: "underline",
    textDecorationColor: "rgba(139,92,246,0.6)",
    textUnderlineOffset: 2,
  };
}

function button(kind: "solid" | "ghost" = "ghost"): React.CSSProperties {
  return {
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: kind === "solid" ? "var(--accent)" : "transparent",
    color: kind === "solid" ? "white" : "var(--text)",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function issueBox(kind: "bad" | "warn"): React.CSSProperties {
  return {
    border: `1px solid ${kind === "bad" ? "rgba(251,113,133,0.6)" : "rgba(251,191,36,0.5)"}`,
    background: kind === "bad" ? "rgba(251,113,133,0.12)" : "rgba(251,191,36,0.10)",
    borderRadius: 10,
    padding: 12,
    color: "var(--text)",
  };
}



function PracticeAuthorPageInner() {
  const [doc, setDoc] = useState<Record<string, unknown>>(() => emptyExtensionPractice());
  const [editorMode, setEditorMode] = useState<"form" | "json">("form");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonDraftError, setJsonDraftError] = useState<string | null>(null);
  const [libraryDirty, setLibraryDirty] = useState(false);
  const [librarySaveBusy, setLibrarySaveBusy] = useState(false);
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);
  const [libraryDiscardBusy, setLibraryDiscardBusy] = useState(false);
  const [libraryDiscardError, setLibraryDiscardError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ path: string; message: string }[]>([]);
  const [refIssues, setRefIssues] = useState<any[]>([]);
  const [kind, setKind] = useState<"extension" | "baseline">("extension");
  const { themeId } = useTheme();
  const { packId, t } = useLanguagePack();
  const searchParams = useSearchParams();
  const router = useRouter();
  const libraryId = searchParams.get("libraryId");

  const isLibrarySession = Boolean(libraryId);

  const runValidation = useCallback(async (parsed: unknown) => {
    const result = await validateAgainstSchema(parsed);
    setValidationIssues(!result.ok ? result.issues : !result.relaxedOk ? result.relaxedIssues : []);
    const b = asBaselineDocument(parsed);
    if (b) {
      const withActivities = baselineWithPracticeActivities(parsed, b);
      setRefIssues(buildIndexes(enrichBaselineWithReferencedWrappers(parsed, withActivities)).issues);
    } else {
      setRefIssues([]);
    }
  }, []);

  const resolveBodyForSave = useCallback((): Record<string, unknown> | null => {
    if (editorMode === "json") {
      try {
        const p: unknown = JSON.parse(jsonDraft);
        if (p === null || typeof p !== "object" || Array.isArray(p)) {
          setLibrarySaveError("Document must be a JSON object.");
          return null;
        }
        setLibrarySaveError(null);
        return p as Record<string, unknown>;
      } catch (e: unknown) {
        setLibrarySaveError(e instanceof Error ? e.message : "Invalid JSON");
        return null;
      }
    }
    return doc;
  }, [editorMode, jsonDraft, doc]);

  const commitJsonDraft = useCallback((): boolean => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonDraftError("Document must be a JSON object.");
        return false;
      }
      const asDoc = parsed as Record<string, unknown>;
      setDoc(asDoc);
      setKind(inferPracticeDocKind(asDoc));
      if (libraryId) setLibraryDirty(true);
      void runValidation(parsed);
      setJsonDraftError(null);
      return true;
    } catch (e: unknown) {
      setJsonDraftError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  }, [jsonDraft, libraryId, runValidation]);

  useEffect(() => {
    const id = libraryId;
    if (!id) return;
    let cancelled = false;
    const openJsonFromQuery =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("editor") === "json";
    void (async () => {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!cancelled) {
            setValidationIssues([{ path: "", message: `Library document not found (${res.status})` }]);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const parsed = data.body;
        const asDoc = parsed as Record<string, unknown>;
        setDoc(asDoc);
        setKind(inferPracticeDocKind(asDoc));
        setLibraryDirty(false);
        setLibrarySaveError(null);
        setLibraryDiscardError(null);
        setJsonDraft(JSON.stringify(asDoc ?? {}, null, 2));
        setJsonDraftError(null);
        setEditorMode(openJsonFromQuery ? "json" : "form");
        await runValidation(parsed);
        if (!cancelled && openJsonFromQuery) {
          router.replace(`/practice-author?libraryId=${encodeURIComponent(id)}`, { scroll: false });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load library document";
          setValidationIssues([{ path: "", message: msg }]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryId, runValidation, router]);

  const saveToLibrary = useCallback(async () => {
    const bodyToSave = resolveBodyForSave();
    if (!bodyToSave) return;

    setLibrarySaveBusy(true);
    setLibrarySaveError(null);
    try {
      if (!libraryId) {
        const title = displayNameForBody(bodyToSave, "Practice");
        const storageKind = storageKindForBody(bodyToSave);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind: storageKind, body: bodyToSave }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          let msg = txt;
          try {
            const j = JSON.parse(txt) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* keep txt */
          }
          setLibrarySaveError(msg || `${res.status}`);
          return;
        }
        const created = (await res.json()) as { id?: string };
        if (!created.id) {
          setLibrarySaveError(t.saveMissingDocumentId);
          return;
        }
        router.replace(`/practice-author?libraryId=${encodeURIComponent(created.id)}`);
        return;
      }

      const res = await fetch(`/api/documents/${encodeURIComponent(libraryId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyToSave }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt;
        try {
          const j = JSON.parse(txt) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep txt */
        }
        setLibrarySaveError(msg || `${res.status}`);
        return;
      }
      setDoc(bodyToSave);
      setKind(inferPracticeDocKind(bodyToSave));
      setJsonDraft(JSON.stringify(bodyToSave, null, 2));
      void runValidation(bodyToSave);
      setLibraryDirty(false);
    } catch (e: unknown) {
      setLibrarySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLibrarySaveBusy(false);
    }
  }, [resolveBodyForSave, libraryId, router, runValidation, t]);

  const discardLibraryChanges = useCallback(async () => {
    if (!libraryId) return;
    if (libraryDirty && !window.confirm(t.discardLibraryConfirm)) return;
    setLibraryDiscardBusy(true);
    setLibraryDiscardError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(libraryId)}`);
      if (!res.ok) {
        setLibraryDiscardError(`${t.discardFailed} (${res.status})`);
        return;
      }
      const data = (await res.json()) as { body?: unknown };
      const parsed = data.body ?? {};
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setLibraryDiscardError(t.discardFailed);
        return;
      }
      const asDoc = parsed as Record<string, unknown>;
      setDoc(asDoc);
      setKind(inferPracticeDocKind(asDoc));
      setJsonDraft(JSON.stringify(asDoc, null, 2));
      setJsonDraftError(null);
      setLibraryDirty(false);
      setEditorMode("form");
      await runValidation(parsed);
    } catch (e: unknown) {
      setLibraryDiscardError(e instanceof Error ? e.message : t.discardFailed);
    } finally {
      setLibraryDiscardBusy(false);
    }
  }, [libraryId, libraryDirty, runValidation, t]);

  /** Practice-only slice (or Method embedded baseline / full baseline doc); activities appended from Practice.activities. */
  const baseline = useMemo(() => (doc ? asBaselineDocument(doc) : null), [doc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !doc) return null;
    const withActivities = baselineWithPracticeActivities(doc, baseline);
    return enrichBaselineWithReferencedWrappers(doc, withActivities);
  }, [baseline, doc]);

  async function loadExample() {
    const res = await fetch("/examples/platform-adoption-kernel.json");
    const txt = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(txt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid example JSON";
      setValidationIssues([{ path: "", message: msg }]);
      return;
    }
    const asDoc = parsed as Record<string, unknown>;
    setDoc(asDoc);
    setKind(inferPracticeDocKind(asDoc));
    setEditorMode("form");
    setLibraryDirty(false);
    await runValidation(parsed);
  }

  async function validateAndLoad() {
    await runValidation(doc);
  }

  async function downloadPdf() {
    if (!doc || !baselineForRender) return;
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doc, themeId, packId }),
    });
    if (!res.ok) {
      const txt = await res.text();
      setValidationIssues([{ path: "", message: `PDF generation failed: ${txt}` }]);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baselineForRender.name}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Link
          href="/"
          style={{
            ...linkStyle(),
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </Link>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 16, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{t.appTitle}</div>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            {t.appSubtitle}
          </div>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 13 }}>
            {isLibrarySession ? (
              <>
                <span style={{ color: "var(--text)" }}>{t.editingLibraryDocument}</span> Use the structured form or{" "}
                <strong style={{ fontWeight: 600 }}>Edit as JSON</strong>; then <strong style={{ fontWeight: 600 }}>Save to library</strong>{" "}
                or <strong style={{ fontWeight: 600 }}>Discard changes</strong> to stay in sync with storage.
              </>
            ) : (
              <>
                <span style={{ color: "var(--text)" }}>{t.practiceAuthorStandaloneLead}</span> Use the structured form or switch to{" "}
                <strong style={{ fontWeight: 600 }}>Edit as JSON</strong>. Validate &amp; Render runs schema checks and refreshes the preview.
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/preferences" style={{ ...linkStyle(), fontSize: 13, fontWeight: 700, color: "var(--muted)", textDecoration: "none" }}>
            Preferences
          </Link>
          <button
            type="button"
            onClick={() => void saveToLibrary()}
            disabled={librarySaveBusy || libraryDiscardBusy || (isLibrarySession && !libraryDirty)}
            title={
              isLibrarySession
                ? libraryDirty
                  ? "Save changes to stored library JSON"
                  : "No unsaved edits"
                : "Save the current practice as a new library document"
            }
            style={{
              ...button("solid"),
              cursor:
                librarySaveBusy || libraryDiscardBusy || (isLibrarySession && !libraryDirty)
                  ? isLibrarySession && !libraryDirty
                    ? "not-allowed"
                    : "wait"
                  : "pointer",
              opacity:
                isLibrarySession && !libraryDirty && !librarySaveBusy ? 0.55 : 1,
            }}
          >
            {librarySaveBusy ? t.savingLabel : t.saveToLibrary}
          </button>
          {isLibrarySession ? (
            <>
              <button
                type="button"
                onClick={() => void discardLibraryChanges()}
                disabled={librarySaveBusy || libraryDiscardBusy || !libraryDirty}
                style={{
                  ...button(),
                  cursor: libraryDiscardBusy ? "wait" : libraryDirty ? "pointer" : "not-allowed",
                  opacity: libraryDirty ? 1 : 0.55,
                }}
              >
                {libraryDiscardBusy ? "…" : t.discardLibraryChanges}
              </button>
              {libraryDirty ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>Unsaved</span>
              ) : null}
            </>
          ) : null}
          <button onClick={loadExample} style={button()}>
            {t.loadExample}
          </button>
          <button onClick={validateAndLoad} style={button("solid")}>
            {t.validateAndRender}
          </button>
          <button onClick={downloadPdf} disabled={!baselineForRender} style={button()}>
            {t.downloadPdf}
          </button>
        </div>
      </div>

      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <section style={{ ...panel, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Practice document</div>
            <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  if (editorMode === "json") {
                    if (commitJsonDraft()) setEditorMode("form");
                  }
                }}
                style={button(editorMode === "form" ? "solid" : "ghost")}
              >
                {t.editAsForm}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editorMode === "form") {
                    setJsonDraft(JSON.stringify(doc, null, 2));
                    setJsonDraftError(null);
                    setEditorMode("json");
                  }
                }}
                style={button(editorMode === "json" ? "solid" : "ghost")}
              >
                {t.editAsJson}
              </button>
              {editorMode === "json" ? (
                <button type="button" onClick={() => commitJsonDraft()} style={button("solid")}>
                  {t.applyJsonToDocument}
                </button>
              ) : null}
            </div>
          </div>
          {librarySaveError ? (
            <div style={{ ...issueBox("bad"), marginBottom: 12 }}>
              <strong>{t.saveFailedPrefix}:</strong> {librarySaveError}
            </div>
          ) : null}
          {libraryDiscardError ? (
            <div style={{ ...issueBox("bad"), marginBottom: 12 }}>{libraryDiscardError}</div>
          ) : null}
          {editorMode === "form" ? (
            <PracticeAuthorForm
              doc={doc}
              onChange={(next) => {
                setDoc(next);
                if (libraryId) setLibraryDirty(true);
              }}
              kind={kind}
              onKindChange={setKind}
              lockDocumentKind={isLibrarySession}
            />
          ) : (
            <>
              <div
                style={{
                  flex: "1 1 auto",
                  minHeight: "min(70vh, 720px)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <textarea
                  value={jsonDraft}
                  onChange={(e) => {
                    setJsonDraft(e.target.value);
                    setJsonDraftError(null);
                    if (libraryId) setLibraryDirty(true);
                  }}
                  spellCheck={false}
                  aria-label={t.editAsJson}
                  style={{
                    flex: 1,
                    width: "100%",
                    minHeight: 320,
                    fontSize: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--text)",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {jsonDraftError ? (
                <div style={{ ...issueBox("bad"), marginTop: 8 }}>{jsonDraftError}</div>
              ) : null}
            </>
          )}
          {(validationIssues.length > 0 || refIssues.length > 0) && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {validationIssues.length > 0 && (
                <div style={issueBox("bad")}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.schemaIssuesTitle}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {validationIssues.slice(0, 8).map((i, idx) => (
                      <li key={idx}>
                        <code>{i.path}</code> {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {refIssues.length > 0 && (
                <div style={issueBox("warn")}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.refIssuesTitle}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {refIssues.slice(0, 8).map((i: any, idx: number) => (
                      <li key={idx}>
                        <code>{i.type}</code> {i.ref} {i.context ? <span style={{ color: "var(--muted)" }}>({i.context})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="no-print" style={previewViewport}>
          <PracticeHumanReadablePanel doc={doc} />
        </div>
      </div>

      {/* PDF is generated server-side via /api/pdf (Playwright) */}

    </main>
  );
}


export default function PracticeAuthorPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24, color: "var(--muted)" }}>Loading…</main>
      }
    >
      <PracticeAuthorPageInner />
    </Suspense>
  );
}

