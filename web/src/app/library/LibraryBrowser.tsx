"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryRootKind } from "@/lib/library/classify";
import { displayNameForBody, rootKindExtension, storageKindForBody } from "@/lib/library/classify";
import { listVirtualElementFiles, type VirtualFileRow } from "@/lib/library/virtualElementFiles";
import type { JsonDocumentMeta } from "@/lib/storage/types";
import { useLanguagePack } from "@/lib/languagePack";

type EnrichedMeta = JsonDocumentMeta & {
  libraryRootKind: LibraryRootKind;
  displayName: string;
  virtualFileCount: number;
};

type FolderId = "all" | LibraryRootKind;

function slugFileBase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 80) || "untitled";
}

/** Fetches the stored document and downloads the JSON body (language document). */
async function downloadLibraryDocumentJson(id: string, filenameBase: string): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const doc = (await res.json()) as { body?: unknown };
  const text = JSON.stringify(doc.body ?? null, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugFileBase(filenameBase)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extBadge(ext: string): string {
  return `.${ext}`;
}

function folderLabel(id: FolderId): string {
  switch (id) {
    case "method":
      return "Methods";
    case "baselinePractice":
      return "Baseline practices";
    case "practice":
      return "Practices";
    case "unknown":
      return "Other";
    default:
      return "All items";
  }
}

export function LibraryBrowser() {
  const { t } = useLanguagePack();
  const [folder, setFolder] = useState<FolderId>("all");
  const [items, setItems] = useState<EnrichedMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [virtualRows, setVirtualRows] = useState<VirtualFileRow[] | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setDownloadError(null);
    setDeleteError(null);
    try {
      const res = await fetch("/api/documents?details=1");
      if (!res.ok) {
        setLoadError((await res.text()) || `HTTP ${res.status}`);
        setItems([]);
        return;
      }
      const data = (await res.json()) as { documents?: EnrichedMeta[] };
      setItems(Array.isArray(data.documents) ? data.documents : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load library");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    const c: Record<LibraryRootKind, number> = {
      method: 0,
      baselinePractice: 0,
      practice: 0,
      unknown: 0,
    };
    for (const it of items) {
      c[it.libraryRootKind] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (folder === "all") return items;
    return items.filter((it) => it.libraryRootKind === folder);
  }, [items, folder]);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setVirtualRows(null);
      setExpandError(null);
      return;
    }
    setExpandedId(id);
    setVirtualRows(null);
    setExpandError(null);
    setExpandLoading(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
      if (!res.ok) {
        setExpandError(`Could not open document (${res.status})`);
        setExpandLoading(false);
        return;
      }
      const doc = (await res.json()) as { body?: unknown };
      setVirtualRows(listVirtualElementFiles(doc.body));
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setExpandLoading(false);
    }
  }

  async function confirmAndDeletePractice(row: EnrichedMeta) {
    const label = row.displayName || row.title || row.id;
    const msg = t.libraryDeleteConfirm.replace("{name}", label);
    if (!window.confirm(msg)) return;
    setDeleteBusyId(row.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        let m = await res.text().catch(() => "");
        try {
          const j = JSON.parse(m) as { error?: string };
          if (j?.error) m = j.error;
        } catch {
          /* keep */
        }
        setDeleteError(m || `${t.libraryDeleteFailed} (${res.status})`);
        return;
      }
      if (expandedId === row.id) {
        setExpandedId(null);
        setVirtualRows(null);
        setExpandError(null);
      }
      await refresh();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : t.libraryDeleteFailed);
    } finally {
      setDeleteBusyId(null);
    }
  }

  const breadcrumb = folder === "all" ? "Library" : `Library / ${folderLabel(folder)}`;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex max-w-content flex-col gap-0 px-4 py-10 md:flex-row md:px-10">
        {/* Sidebar — folder tree */}
        <aside className="mb-8 w-full shrink-0 border-b border-[var(--border)] pb-8 md:mb-0 md:w-56 md:border-b-0 md:border-r md:pb-0 md:pr-6">
          <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">Browse</p>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Library folders">
            <FolderRow
              active={folder === "all"}
              label={folderLabel("all")}
              count={items.length}
              onClick={() => setFolder("all")}
            />
            {(
              ["method", "baselinePractice", "practice", "unknown"] satisfies LibraryRootKind[]
            ).map((k) => (
              <FolderRow
                key={k}
                active={folder === k}
                label={folderLabel(k)}
                count={counts[k]}
                onClick={() => setFolder(k)}
              />
            ))}
          </nav>
        </aside>

        {/* Main file list */}
        <div className="min-w-0 flex-1 md:pl-2">
          <p className="text-sm text-[var(--muted)]">
            <Link href="/" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
              ← Dashboard
            </Link>
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Manage library</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Stored JSON is grouped like a file browser. Root documents use{" "}
            <code className="text-[var(--text)]">.method</code>,{" "}
            <code className="text-[var(--text)]">.baseline</code>, or{" "}
            <code className="text-[var(--text)]">.practice</code>. Expand a row to see nested practice elements with
            distinct pseudo-types (e.g. <code className="text-[var(--text)]">.focus</code>,{" "}
            <code className="text-[var(--text)]">.alpha</code>, <code className="text-[var(--text)]">.activity</code>).
            Use the <strong className="font-semibold text-[var(--text)]">Add to library</strong> button to paste JSON or
            upload a <code className="text-[var(--text)]">.json</code> file. You can import a single document or a JSON
            array of methods, baseline practices, and/or extension practices—each array element is stored as its own library
            item.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <p className="font-mono text-xs text-[var(--muted)]">{breadcrumb}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent)]"
              >
                Add to library
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                Refresh
              </button>
            </div>
          </div>

          <LibraryAddModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={refresh} />

          {deleteError ? (
            <p className="mt-4 text-xs text-[var(--bad)]" role="alert">
              {deleteError}
            </p>
          ) : null}

          {downloadError ? (
            <p className="mt-4 text-xs text-[var(--bad)]" role="alert">
              {downloadError}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm text-[var(--muted)]">Loading library…</p>
          ) : loadError ? (
            <p className="mt-8 text-sm text-[var(--bad)]">{loadError}</p>
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-sm text-[var(--muted)]">
              {items.length > 0 ? (
                <>
                  No documents in this folder. Choose another folder in the sidebar, or use{" "}
                  <strong className="font-semibold text-[var(--text)]">Add to library</strong>.
                </>
              ) : (
                <>
                  No documents yet. Use <strong className="font-semibold text-[var(--text)]">Add to library</strong>, open in{" "}
                  <Link href="/practice-author" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                    Practice author
                  </Link>
                  , or POST to <code className="text-[var(--text)]">/api/documents</code>.
                </>
              )}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel)]">
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <th className="w-10 px-3 py-2.5" aria-label="Expand" />
                    <th className="min-w-0 max-w-[14rem] px-3 py-2.5 sm:max-w-[18rem]">Name</th>
                    <th className="hidden whitespace-nowrap px-3 py-2.5 sm:table-cell">Type</th>
                    <th className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">Elements</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Updated</th>
                    <th className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const ext = rootKindExtension(row.libraryRootKind);
                    const base = slugFileBase(row.displayName);
                    const filename = `${base}.${ext}`;
                    const browseHref = `/library/browse?libraryId=${encodeURIComponent(row.id)}`;
                    const open = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr className="border-b border-[var(--border)]/80 transition hover:bg-[var(--bg)]/40">
                          <td className="px-1 py-2 align-middle">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? "Collapse" : "Expand nested elements"}
                              onClick={() => void toggleExpand(row.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--border)]/30 hover:text-[var(--text)]"
                            >
                              <span className="font-mono text-xs" aria-hidden>
                                {open ? "▾" : "▸"}
                              </span>
                            </button>
                          </td>
                          <td className="min-w-0 max-w-[14rem] truncate px-2 py-2 font-medium sm:max-w-[18rem]">
                            <Link
                              href={browseHref}
                              title="Browse this document"
                              className="group inline-block max-w-full rounded-md px-1 py-0.5 -mx-1 -my-0.5 text-left hover:bg-[var(--accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                            >
                              <span className="text-[var(--text)] underline-offset-4 group-hover:underline">
                                {row.displayName}
                              </span>
                              <span className="ml-2 font-mono text-xs text-[var(--muted)]">{filename}</span>
                            </Link>
                          </td>
                          <td className="hidden px-3 py-2 text-[var(--muted)] sm:table-cell">
                            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)]/50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide">
                              {row.libraryRootKind === "unknown" ? "unknown" : row.libraryRootKind}
                            </span>
                          </td>
                          <td className="hidden px-3 py-2 font-mono text-xs text-[var(--muted)] md:table-cell">
                            {row.virtualFileCount}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--muted)]">
                            {formatDate(row.updatedAt)}
                          </td>
                          <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right align-middle">
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setDownloadError(null);
                                  void downloadLibraryDocumentJson(row.id, row.displayName).catch((e: unknown) => {
                                    setDownloadError(e instanceof Error ? e.message : "Download failed");
                                  });
                                }}
                                className="whitespace-nowrap bg-transparent text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                              >
                                Download
                              </button>
                              <Link
                                href={browseHref}
                                className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                              >
                                Browse
                              </Link>
                              {row.libraryRootKind === "method" ? (
                                <Link
                                  href={`/method-builder?libraryId=${encodeURIComponent(row.id)}`}
                                  className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                                >
                                  Edit method
                                </Link>
                              ) : (
                                <Link
                                  href={`/practice-author?libraryId=${encodeURIComponent(row.id)}&editor=json`}
                                  className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                                >
                                  Edit JSON
                                </Link>
                              )}
                              <Link
                                href={`/practice-author?libraryId=${encodeURIComponent(row.id)}`}
                                className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                              >
                                Author
                              </Link>
                              <button
                                type="button"
                                disabled={deleteBusyId !== null}
                                onClick={() => void confirmAndDeletePractice(row)}
                                className="whitespace-nowrap bg-transparent text-xs font-semibold text-[var(--bad)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deleteBusyId === row.id ? t.libraryDeleting : t.libraryDelete}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="border-b border-[var(--border)]/80 bg-[var(--bg)]/25">
                            <td colSpan={6} className="px-0 py-0">
                              {expandLoading ? (
                                <p className="px-4 py-3 text-xs text-[var(--muted)]">Loading structure…</p>
                              ) : expandError ? (
                                <p className="px-4 py-3 text-xs text-[var(--bad)]">{expandError}</p>
                              ) : virtualRows && virtualRows.length ? (
                                <ul className="max-h-80 overflow-auto py-1 font-mono text-xs">
                                  {virtualRows.map((v) => (
                                    <li
                                      key={v.id}
                                      className="flex items-baseline gap-2 border-t border-[var(--border)]/40 px-4 py-1.5 first:border-t-0"
                                      style={{ paddingLeft: `${12 + v.depth * 14}px` }}
                                    >
                                      <span className="shrink-0 text-[var(--muted)]" aria-hidden>
                                        └
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-[var(--text)]">{v.label}</span>
                                      <span className="shrink-0 text-[var(--muted)]">{extBadge(v.ext)}</span>
                                      <span className="hidden max-w-[40%] truncate text-[var(--muted)] sm:inline">
                                        {v.path}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="px-4 py-3 text-xs text-[var(--muted)]">
                                  No baseline-shaped content to enumerate (empty or unrecognized JSON).
                                </p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LibraryAddModal(props: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [pasteText, setPasteText] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [titleOverride, setTitleOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!props.open) {
      setMode("paste");
      setPasteText("");
      setPickedFile(null);
      setTitleOverride("");
      setError(null);
      setBusy(false);
      setSaveProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [props.open, props.onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    let raw: string;
    if (mode === "paste") {
      raw = pasteText.trim();
      if (!raw) {
        setError("Paste JSON into the text area, or switch to file upload.");
        return;
      }
    } else {
      if (!pickedFile) {
        setError("Choose a JSON file.");
        return;
      }
      try {
        raw = await pickedFile.text();
      } catch {
        setError("Could not read the selected file.");
        return;
      }
      if (!raw.trim()) {
        setError("The file is empty.");
        return;
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }

    const fileStem =
      mode === "file" && pickedFile
        ? pickedFile.name.replace(/\.json$/i, "").replace(/[-_]+/g, " ").trim()
        : "";
    const titleTrim = titleOverride.trim();

    let bodies: Record<string, unknown>[];
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        setError("JSON array is empty. Add one or more method, baseline practice, or practice objects.");
        return;
      }
      bodies = [];
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
          setError(
            `Item at index ${i} must be a JSON object (each entry should be one method, baseline practice, or practice document).`,
          );
          return;
        }
        bodies.push(item as Record<string, unknown>);
      }
    } else if (parsed === null || typeof parsed !== "object") {
      setError("JSON must be an object or an array of objects at the root.");
      return;
    } else {
      bodies = [parsed as Record<string, unknown>];
    }

    setBusy(true);
    setSaveProgress(null);
    try {
      const failures: string[] = [];
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const inferredTitle = displayNameForBody(
          body,
          bodies.length > 1
            ? fileStem
              ? `${fileStem} (${i + 1})`
              : `Imported ${i + 1}`
            : fileStem || "Imported",
        );
        const title = bodies.length === 1 ? titleTrim || inferredTitle : inferredTitle;
        const kind = storageKindForBody(body);

        if (bodies.length > 1) {
          setSaveProgress(`Saving ${i + 1} of ${bodies.length}…`);
        }

        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind, body }),
        });
        if (!res.ok) {
          let msg = await res.text();
          try {
            const j = JSON.parse(msg) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* keep raw */
          }
          failures.push(`#${i + 1} (${title}): ${msg || `HTTP ${res.status}`}`);
        }
      }

      if (failures.length > 0) {
        const saved = bodies.length - failures.length;
        setError(
          saved === 0
            ? failures.join(" ")
            : `Saved ${saved} of ${bodies.length}. ${failures.join(" ")}`,
        );
        if (saved > 0) {
          setPasteText("");
          setPickedFile(null);
          setTitleOverride("");
          if (fileRef.current) fileRef.current.value = "";
          await props.onSaved();
        }
        return;
      }

      setPasteText("");
      setPickedFile(null);
      setTitleOverride("");
      if (fileRef.current) fileRef.current.value = "";
      await props.onSaved();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
      setSaveProgress(null);
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-upload-heading"
        className="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <h2 id="library-upload-heading" className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Add to library
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--bg)]/50 hover:text-[var(--text)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Paste valid JSON or pick a file. Root value may be one document, or a{" "}
            <strong className="font-semibold text-[var(--text)]">JSON array</strong> of documents—each element becomes its own
            library item (method, baseline practice, or extension practice). Per-item storage kind is inferred from shape.
            Title defaults to each document&apos;s <code className="text-[var(--text)]">name</code> (or the filename); optional
            title below applies only when importing a <strong className="font-semibold text-[var(--text)]">single</strong>{" "}
            object.
          </p>

          <form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="JSON source">
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              mode === "paste"
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
            }`}
          >
            Paste JSON
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              mode === "file"
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
            }`}
          >
            Upload file
          </button>
        </div>

        {mode === "paste" ? (
          <div>
            <label htmlFor="library-paste-json" className="sr-only">
              JSON to import
            </label>
            <textarea
              id="library-paste-json"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='{ "name": "…", … } or [ { … }, { … } ]'
              spellCheck={false}
              rows={12}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="library-file-json" className="block text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              JSON file
            </label>
            <input
              ref={fileRef}
              id="library-file-json"
              type="file"
              accept=".json,application/json,text/json"
              className="mt-2 block w-full max-w-md cursor-pointer text-xs text-[var(--muted)] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--accent)]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--text)] hover:file:bg-[var(--accent)]/30"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPickedFile(f);
                setError(null);
              }}
            />
            {pickedFile ? (
              <p className="mt-2 font-mono text-2xs text-[var(--muted)]">Selected: {pickedFile.name}</p>
            ) : null}
          </div>
        )}

        <div>
          <label htmlFor="library-title-override" className="block text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Title <span className="font-normal normal-case text-[var(--muted)]">(optional)</span>
          </label>
          <input
            id="library-title-override"
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="Single import only: overrides title when root is one object"
            className="mt-1.5 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
          />
        </div>

            {error ? <p className="text-xs text-[var(--bad)]">{error}</p> : null}
            {saveProgress ? <p className="text-xs text-[var(--muted)]">{saveProgress}</p> : null}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/90 px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? saveProgress || "Saving…" : "Save to library"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FolderRow(props: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        props.active
          ? "bg-[var(--accent)]/15 text-[var(--text)] ring-1 ring-[var(--accent)]/40"
          : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--text)]"
      }`}
    >
      <span>{props.label}</span>
      <span className="font-mono text-2xs opacity-80">{props.count}</span>
    </button>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
