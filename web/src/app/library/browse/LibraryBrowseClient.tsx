"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrowseView } from "@/components/browse/BrowseView";
import { ProjectManagementView } from "@/components/project/ProjectManagementView";
import { useLanguagePack } from "@/lib/display/languagePack";
import { preloadPracticeFonts } from "@/lib/display/fontLoader";

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
  libraryId,
  mode,
  onModeChange,
}: {
  libraryId: string;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const [merged, setMerged] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/library/browse/${encodeURIComponent(libraryId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        // Preload fonts before setting merged data
        if (data.merged) {
          preloadPracticeFonts(data.merged);
        }

        setMerged(data.merged);
      } catch {
        // Silently fail - error already handled in parent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--pf-v6-global--Color--200)" }}>Loading...</div>;
  }

  return (
    <>
      <ViewModeToolbar mode={mode} onModeChange={onModeChange} />
      {mode === "project-management" ? (
        <ProjectManagementView doc={merged} />
      ) : (
        <BrowseView libraryId={libraryId} />
      )}
    </>
  );
}

export function LibraryBrowseClient() {
  const searchParams = useSearchParams();
  const { t, packId } = useLanguagePack();
  const libraryId = searchParams.get("libraryId");
  const [docTitle, setDocTitle] = useState("");
  const [docName, setDocName] = useState("");
  const [rootKind, setRootKind] = useState<string>("unknown");
  const [baselinePracticeName, setBaselinePracticeName] = useState<string>("");
  const [dependencyCount, setDependencyCount] = useState<number>(0);
  const [needsMerge, setNeedsMerge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("browse");

  // Fetch metadata for display and PDF generation
  useEffect(() => {
    if (!libraryId) {
      setLoading(false);
      setError("No document selected. Open Browse from an item in Manage library.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/library/browse/${encodeURIComponent(libraryId)}`);
        if (!res.ok) {
          if (!cancelled) setError(`Could not load document (${res.status}).`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setDocTitle(typeof data.title === "string" ? data.title : "");
        setRootKind(data.metadata?.kind ?? "unknown");
        setNeedsMerge(data.metadata?.needsLibraryMerge ?? false);

        // Extract name from original doc
        const original = data.original;
        if (original && typeof original === "object") {
          setDocName(String((original as { name?: string }).name ?? ""));
          setBaselinePracticeName(String((original as { baselinePracticeName?: string }).baselinePracticeName ?? ""));
          const deps = (original as { practiceDependencyNames?: string[] }).practiceDependencyNames;
          setDependencyCount(Array.isArray(deps) ? deps.length : 0);
        }
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

  async function downloadBrowsePdf() {
    if (!libraryId) return;
    setPdfError(null);
    setPdfBusy(true);
    try {
      // Fetch the merged document for PDF generation
      const res = await fetch(`/api/library/browse/${encodeURIComponent(libraryId)}`);
      if (!res.ok) {
        setPdfError(`Failed to load document (${res.status})`);
        return;
      }
      const data = await res.json();

      const payload: Record<string, unknown> = {
        doc: data.merged,
        themeId: "light",
        packId
      };

      if (data.metadata?.methodComposition) {
        payload.methodComposition = data.metadata.methodComposition;
      }

      const pdfRes = await fetch("/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!pdfRes.ok) {
        const raw = await pdfRes.text().catch(() => "");
        let msg = `PDF failed (${pdfRes.status})`;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (typeof j.error === "string") msg = j.error;
        } catch {
          if (raw.trim()) msg = raw.trim().slice(0, 240);
        }
        setPdfError(msg);
        return;
      }

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = (docTitle || docName || "document").replace(/[^\w.\-]+/g, "_");
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Browse</h1>
          {!loading && !error && libraryId ? (
            <button
              type="button"
              disabled={pdfBusy}
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
        ) : !libraryId ? (
          <p className="mt-8 text-sm text-[var(--muted)]">No document selected. Open Browse from an item in Manage library.</p>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 sm:px-5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">Library title</p>
              <p className="mt-1 font-medium text-[var(--text)]">{docTitle || "—"}</p>
              <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">Detected shape</p>
              <p className="mt-1 font-mono text-sm text-[var(--text)]">{rootKind}</p>
            </div>

            {rootKind === "method" ? (
              <>
                <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-semibold text-[var(--text)]">Method (source)</h2>
                  <p className="mt-1 text-lg font-semibold">{docName}</p>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                    The view below is a <strong className="font-semibold text-[var(--text)]">single merged practice</strong> combining
                    the baseline and extension practices from this method.
                  </p>
                </section>

                <div>
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Merged practice view</h2>
                  <LibraryBrowseReadablePane
                    libraryId={libraryId}
                    mode={viewMode}
                    onModeChange={setViewMode}
                  />
                </div>
              </>
            ) : rootKind === "practice" && needsMerge ? (
              <>
                <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-semibold text-[var(--text)]">Merged for display</h2>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                    This extension practice was merged with baseline{" "}
                    <code className="text-[var(--text)]">
                      {baselinePracticeName || "—"}
                    </code>
                    {dependencyCount > 0
                      ? ` and ${dependencyCount} listed ${dependencyCount === 1 ? "dependency" : "dependencies"} `
                      : " "}
                    from the library so links such as <code className="text-[var(--text)]">contributesTo</code> point at baseline
                    alphas and other merged elements.
                  </p>
                </section>
                <LibraryBrowseReadablePane
                  libraryId={libraryId}
                  mode={viewMode}
                  onModeChange={setViewMode}
                />
              </>
            ) : (
              <LibraryBrowseReadablePane
                libraryId={libraryId}
                mode={viewMode}
                onModeChange={setViewMode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
