"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PracticeHumanReadablePanel } from "@/components/PracticeHumanReadablePanel";
import { FullPracticeView } from "@/components/FullPracticeView";
import { BusinessOutcomeView } from "@/components/business-view";
import { PractitionerExecutionView } from "@/components/delivery-view";
import { SalesStatementOfWorkView } from "@/components/sow-view";
import { useLanguagePack } from "@/lib/languagePack";
import type { LanguagePack } from "@/lib/languagePackTypes";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";
import { buildReadablePracticePreviewDoc } from "@/lib/ir";
import type { Method } from "@/lib/types";

type ReadablePreviewMode = "classic" | "browse" | "full" | "business" | "delivery" | "sow";

function BrowseReadableToolbar({
  mode,
  onModeChange,
  t,
}: {
  mode: ReadablePreviewMode;
  onModeChange: (m: ReadablePreviewMode) => void;
  t: LanguagePack;
}) {
  const chip = (m: ReadablePreviewMode, label: string) => (
    <button
      key={m}
      type="button"
      onClick={() => onModeChange(m)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        mode === m
          ? "bg-[var(--accent)]/20 text-[var(--text)] ring-1 ring-[var(--accent)]/40"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
      <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t.renderedView}</span>
      <div className="flex flex-wrap gap-1.5">
        {chip("classic", t.readablePreviewClassic)}
        {chip("browse", t.readablePreviewBrowse)}
        {chip("full", t.readablePreviewFullDocument)}
        {chip("business", t.readablePreviewBusiness)}
        {chip("delivery", t.readablePreviewDelivery)}
        {chip("sow", t.readablePreviewSow)}
      </div>
    </div>
  );
}

function LibraryBrowseReadablePane({
  browseDoc,
  methodComposition,
  mode,
  onModeChange,
  t,
}: {
  browseDoc: unknown;
  methodComposition?: Method | null;
  mode: ReadablePreviewMode;
  onModeChange: (m: ReadablePreviewMode) => void;
  t: LanguagePack;
}) {
  const previewDoc = useMemo(() => buildReadablePracticePreviewDoc(browseDoc), [browseDoc]);
  if (!browseDoc || typeof browseDoc !== "object") return null;
  return (
    <>
      <BrowseReadableToolbar mode={mode} onModeChange={onModeChange} t={t} />
      {mode === "full" ? (
        <FullPracticeView doc={browseDoc} embed methodComposition={methodComposition ?? undefined} />
      ) : mode === "business" ? (
        previewDoc ? (
          <BusinessOutcomeView doc={previewDoc} />
        ) : (
          <p className="text-sm text-[var(--muted)]">{t.nothingToRender}</p>
        )
      ) : mode === "delivery" ? (
        previewDoc ? (
          <PractitionerExecutionView doc={previewDoc} />
        ) : (
          <p className="text-sm text-[var(--muted)]">{t.nothingToRender}</p>
        )
      ) : mode === "sow" ? (
        previewDoc ? (
          <SalesStatementOfWorkView doc={previewDoc} />
        ) : (
          <p className="text-sm text-[var(--muted)]">{t.nothingToRender}</p>
        )
      ) : (
        <PracticeHumanReadablePanel
          doc={browseDoc}
          variant={mode === "browse" ? "browse" : "default"}
          methodComposition={methodComposition ?? undefined}
        />
      )}
    </>
  );
}

export function LibraryBrowseClient() {
  const searchParams = useSearchParams();
  const { t, packId } = useLanguagePack();
  const libraryId = searchParams.get("libraryId");
  const [docTitle, setDocTitle] = useState("");
  const [body, setBody] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [readablePreview, setReadablePreview] = useState<ReadablePreviewMode>("browse");

  /** Library merge for extension practices (baseline + deps from other stored docs). */
  const [practiceResolved, setPracticeResolved] = useState<{
    phase: "idle" | "loading" | "done" | "error";
    doc?: unknown;
    errorMessage?: string;
  }>({ phase: "idle" });

  useEffect(() => {
    if (!libraryId) {
      setLoading(false);
      setError("No document selected. Open Browse from an item in Manage library.");
      setBody(null);
      setDocTitle("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(libraryId)}`);
        if (!res.ok) {
          if (!cancelled) setError(`Could not load document (${res.status}).`);
          return;
        }
        const data = (await res.json()) as { title?: string; body?: unknown };
        if (cancelled) return;
        setDocTitle(typeof data.title === "string" ? data.title : "");
        setBody(data.body ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  const needsPracticeLibraryMerge = useMemo(
    () =>
      Boolean(
        body &&
          typeof body === "object" &&
          classifyLibraryRoot(body) === "practice" &&
          practiceNeedsLibraryResolution(body),
      ),
    [body],
  );

  useEffect(() => {
    if (!body || typeof body !== "object") {
      setPracticeResolved({ phase: "idle" });
      return;
    }
    if (classifyLibraryRoot(body) !== "practice" || !practiceNeedsLibraryResolution(body)) {
      setPracticeResolved({ phase: "idle" });
      return;
    }
    let cancelled = false;
    setPracticeResolved({ phase: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/documents/resolve-for-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc: body }),
        });
        const data = (await res.json().catch(() => ({}))) as { resolved?: unknown; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setPracticeResolved({
            phase: "error",
            errorMessage: data.error || `Could not merge library baseline (${res.status}).`,
          });
          return;
        }
        setPracticeResolved({ phase: "done", doc: data.resolved ?? body });
      } catch (e) {
        if (!cancelled) {
          setPracticeResolved({
            phase: "error",
            errorMessage: e instanceof Error ? e.message : "Baseline merge failed.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [body]);

  const rootKind = body ? classifyLibraryRoot(body) : "unknown";
  const browseDoc = useMemo(() => {
    if (!body || typeof body !== "object") return body;
    if (classifyLibraryRoot(body) === "method") return compositePracticeFromMethod(body as Method);
    if (needsPracticeLibraryMerge) {
      if (practiceResolved.phase === "done" && practiceResolved.doc != null && typeof practiceResolved.doc === "object") {
        return practiceResolved.doc;
      }
      if (practiceResolved.phase === "error") return body;
      return null;
    }
    return body;
  }, [body, needsPracticeLibraryMerge, practiceResolved]);

  const practiceMergeLoading =
    needsPracticeLibraryMerge &&
    practiceResolved.phase !== "done" &&
    practiceResolved.phase !== "error";
  const practiceMergeFailed = needsPracticeLibraryMerge && practiceResolved.phase === "error";

  async function downloadBrowsePdf() {
    const doc = browseDoc;
    if (!doc || typeof doc !== "object") return;
    setPdfError(null);
    setPdfBusy(true);
    try {
      const payload: Record<string, unknown> = { doc, themeId: "light", packId };
      if (body && typeof body === "object" && classifyLibraryRoot(body) === "method") {
        payload.methodComposition = body;
      }
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let msg = `PDF failed (${res.status})`;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (typeof j.error === "string") msg = j.error;
        } catch {
          if (raw.trim()) msg = raw.trim().slice(0, 240);
        }
        setPdfError(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = (docTitle || (doc as { name?: string }).name || "document").replace(/[^\w.\-]+/g, "_");
      a.download = `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-content px-4 py-10 md:px-10">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
          <Link href="/library" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
            ← Manage library
          </Link>
          <span aria-hidden className="text-[var(--border)]">
            ·
          </span>
          <Link href="/" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
            Dashboard
          </Link>
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Browse</h1>
          {!loading && !error && body && typeof body === "object" && browseDoc != null ? (
            <button
              type="button"
              disabled={pdfBusy || practiceMergeLoading}
              onClick={() => void downloadBrowsePdf()}
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:bg-[var(--muted)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfBusy ? "…" : t.downloadPdf}
            </button>
          ) : null}
        </div>
        {pdfError ? <p className="mt-2 text-sm text-[var(--bad)]">{pdfError}</p> : null}
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Human-readable view of a library document. For <strong className="font-semibold text-[var(--text)]">methods</strong>, the
          embedded baseline and all extension practices are merged into one composite practice (matching elements by
          type and name), then rendered like Practice author. For <strong className="font-semibold text-[var(--text)]">extension practices</strong>{" "}
          with <code className="text-[var(--text)]">baselinePracticeName</code> (and optional dependencies), the baseline and
          dependencies are loaded from other library items and merged for this view so symbolic links (for example{" "}
          <code className="text-[var(--text)]">contributesTo</code>) resolve to baseline elements. Standalone baselines render as-is.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>
        ) : error ? (
          <p className="mt-8 text-sm text-[var(--bad)]">{error}</p>
        ) : !body || typeof body !== "object" ? (
          <p className="mt-8 text-sm text-[var(--muted)]">This document has no JSON body to display.</p>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 sm:px-5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">Library title</p>
              <p className="mt-1 font-medium text-[var(--text)]">{docTitle || "—"}</p>
              <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">Detected shape</p>
              <p className="mt-1 font-mono text-sm text-[var(--text)]">{rootKind}</p>
            </div>

            {practiceMergeLoading ? (
              <p className="mt-6 text-sm text-[var(--muted)]">Merging baseline and dependencies from the library…</p>
            ) : null}
            {practiceMergeFailed && practiceResolved.errorMessage ? (
              <p className="mt-4 text-sm text-[var(--bad)]" role="alert">
                {practiceResolved.errorMessage} Showing the extension document only; baseline links may be missing.
              </p>
            ) : null}

            {rootKind === "method" ? (
              <>
                <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-semibold text-[var(--text)]">Method (source)</h2>
                  <p className="mt-1 text-lg font-semibold">{(body as Method).name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{(body as Method).description}</p>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                    The view below is a <strong className="font-semibold text-[var(--text)]">single merged practice</strong>: baseline{" "}
                    <code className="text-[var(--text)]">{(body as Method).baselinePractice?.name}</code>
                    {Array.isArray((body as Method).practices) && (body as Method).practices!.length
                      ? ` plus ${(body as Method).practices!.length} extension practice(s), merged by element name.`
                      : " only."}
                  </p>
                </section>

                <div>
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Merged practice view</h2>
                  <LibraryBrowseReadablePane
                    browseDoc={browseDoc}
                    methodComposition={body as Method}
                    mode={readablePreview}
                    onModeChange={setReadablePreview}
                    t={t}
                  />
                </div>
              </>
            ) : rootKind === "practice" && needsPracticeLibraryMerge && practiceResolved.phase === "done" && browseDoc ? (
              <>
                <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-semibold text-[var(--text)]">Merged for display</h2>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                    This extension practice was merged with baseline{" "}
                    <code className="text-[var(--text)]">
                      {String((body as { baselinePracticeName?: string }).baselinePracticeName ?? "").trim() || "—"}
                    </code>
                    {(() => {
                      const deps = (body as { practiceDependencyNames?: string[] }).practiceDependencyNames;
                      const n = Array.isArray(deps) ? deps.length : 0;
                      if (!n) return " ";
                      return ` and ${n} listed ${n === 1 ? "dependency" : "dependencies"} `;
                    })()}
                    from the library so links such as <code className="text-[var(--text)]">contributesTo</code> point at baseline
                    alphas and other merged elements.
                  </p>
                </section>
                <LibraryBrowseReadablePane
                  browseDoc={browseDoc}
                  mode={readablePreview}
                  onModeChange={setReadablePreview}
                  t={t}
                />
              </>
            ) : browseDoc && typeof browseDoc === "object" ? (
              <LibraryBrowseReadablePane
                browseDoc={browseDoc}
                mode={readablePreview}
                onModeChange={setReadablePreview}
                t={t}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
