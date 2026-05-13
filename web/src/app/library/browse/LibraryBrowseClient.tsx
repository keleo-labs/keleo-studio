"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrowseView } from "@/components/BrowseView";
import { ProjectManagementView } from "@/components/ProjectManagementView";
import { useLanguagePack } from "@/lib/languagePack";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { practiceNeedsLibraryResolution, methodNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";
import type { Method } from "@/lib/types";

type ViewMode = "browse" | "project-management";

function ViewModeToolbar({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const chip = (m: ViewMode, label: string) => (
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
      <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">View</span>
      <div className="flex flex-wrap gap-1.5">
        {chip("browse", "Browse")}
        {chip("project-management", "Project Management")}
      </div>
    </div>
  );
}

function LibraryBrowseReadablePane({
  browseDoc,
  methodComposition,
  mode,
  onModeChange,
}: {
  browseDoc: unknown;
  methodComposition?: Method | null;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  if (!browseDoc || typeof browseDoc !== "object") return null;
  return (
    <>
      <ViewModeToolbar mode={mode} onModeChange={onModeChange} />
      {mode === "project-management" ? (
        <ProjectManagementView doc={browseDoc} embed />
      ) : (
        <BrowseView doc={browseDoc} embed methodComposition={methodComposition ?? undefined} />
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
  const [viewMode, setViewMode] = useState<ViewMode>("browse");

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

  const needsLibraryMerge = useMemo(
    () =>
      Boolean(
        body &&
          typeof body === "object" &&
          ((classifyLibraryRoot(body) === "practice" && practiceNeedsLibraryResolution(body)) ||
            (classifyLibraryRoot(body) === "method" && methodNeedsLibraryResolution(body))),
      ),
    [body],
  );

  const {
    loading: libraryMergeRequestLoading,
    resolved: libraryMergedBody,
    error: libraryMergeRequestError,
  } = usePracticeLibraryResolveForRender(body, needsLibraryMerge);

  const rootKind = body ? classifyLibraryRoot(body) : "unknown";
  const browseDoc = useMemo(() => {
    if (!body || typeof body !== "object") return body;
    const kind = classifyLibraryRoot(body);

    if (kind === "method") {
      if (needsLibraryMerge) {
        if (libraryMergeRequestLoading) return null;
        if (libraryMergeRequestError) return body;
        const merged = libraryMergedBody ?? body;
        return merged != null && typeof merged === "object" ? merged : body;
      }
      return compositePracticeFromMethod(body as Method);
    }

    if (needsLibraryMerge) {
      if (libraryMergeRequestLoading) return null;
      if (libraryMergeRequestError) return body;
      const merged = libraryMergedBody ?? body;
      return merged != null && typeof merged === "object" ? merged : body;
    }
    return body;
  }, [body, needsLibraryMerge, libraryMergeRequestLoading, libraryMergeRequestError, libraryMergedBody]);

  const libraryMergeLoading = needsLibraryMerge && libraryMergeRequestLoading;
  const libraryMergeFailed = needsLibraryMerge && !libraryMergeRequestLoading && libraryMergeRequestError !== null;

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
              disabled={pdfBusy || libraryMergeLoading}
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

            {libraryMergeLoading ? (
              <p className="mt-6 text-sm text-[var(--muted)]">Merging baseline and dependencies from the library…</p>
            ) : null}
            {libraryMergeFailed && libraryMergeRequestError ? (
              <p className="mt-4 text-sm text-[var(--bad)]" role="alert">
                {libraryMergeRequestError} Showing the extension document only; baseline links may be missing.
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
                    mode={viewMode}
                    onModeChange={setViewMode}
                  />
                </div>
              </>
            ) : rootKind === "practice" && needsLibraryMerge && browseDoc && !libraryMergeRequestLoading && !libraryMergeRequestError ? (
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
                  mode={viewMode}
                  onModeChange={setViewMode}
                />
              </>
            ) : browseDoc && typeof browseDoc === "object" ? (
              <LibraryBrowseReadablePane
                browseDoc={browseDoc}
                mode={viewMode}
                onModeChange={setViewMode}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
