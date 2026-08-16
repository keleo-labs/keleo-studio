"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Title,
  Content,
  ContentVariants,
} from "@patternfly/react-core";
import { StarIcon, OutlinedStarIcon } from "@patternfly/react-icons";
import type { LibraryRootKind } from "@/lib/library/classify";
import { rootKindExtension } from "@/lib/library/classify";
import type { LibraryDocumentTags } from "@/lib/library/libraryDocumentTags";
import { useLanguagePack } from "@/lib/display/languagePack";
import { LibraryItemFocus } from "./LibraryItemFocus";
import { loadDashboardConfig, saveDashboardConfig } from "@/lib/data/dashboardConfig";

type EnrichedMeta = {
  /** Flat-store document ID (if available) or synthetic bundle ref. */
  id: string;
  title: string;
  kind: string;
  displayName: string;
  libraryRootKind: LibraryRootKind;
  virtualFileCount: number;
  libraryTags: LibraryDocumentTags;
  keywords: string[];
  updatedAt: string;
  createdAt: string;
  activeVersion?: string;
  availableVersions?: string[];
  bundleSlug?: string;
  bundleDocumentPath?: string;
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

/** Fetches all library documents with bodies and downloads a JSON array (bulk import expects this shape). */
async function downloadFullLibraryBodiesJson(filenameStem: string): Promise<void> {
  const res = await fetch("/api/documents?details=1&withBody=1");
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const data = (await res.json()) as { documents?: Array<{ body?: unknown; kind?: string }> };
  const allDocs = Array.isArray(data.documents) ? data.documents : [];
  // Filter out dashboard-config documents - only export library items
  const docs = allDocs.filter((d) => d.kind !== "dashboard-config");
  const bodies = docs.map((d) => (d.body === undefined ? null : d.body));
  const text = JSON.stringify(bodies, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugFileBase(filenameStem)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function collectSortedUniqueTags(groups: string[][]): string[] {
  const s = new Set<string>();
  for (const g of groups) {
    for (const raw of g) {
      const x = String(raw ?? "").trim();
      if (x) s.add(x);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

function toggleTagSelection(current: string[], tag: string): string[] {
  return current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag];
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

  // Add styles for hover states to avoid hydration issues
  const hoverStyles = `
    .lib-btn-primary:hover { background-color: var(--pf-v6-global--primary-color--200); }
    .lib-btn-secondary:hover { border-color: var(--pf-v6-global--primary-color--100); }
    .lib-btn-danger:hover { background-color: color-mix(in srgb, var(--pf-v6-global--danger-color--100) 10%, transparent); }
    .lib-btn-danger-filled:hover { background-color: color-mix(in srgb, var(--pf-v6-global--danger-color--100) 90%, black); }
    .lib-link:hover { text-decoration: underline; }
    .lib-folder-row:hover { background-color: var(--pf-v6-global--BackgroundColor--200); color: var(--pf-v6-global--Color--100); }
    .lib-tag-button:hover { background-color: var(--pf-v6-global--BackgroundColor--100); color: var(--pf-v6-global--Color--100); }
    .lib-expand-btn:hover { background-color: color-mix(in srgb, var(--pf-v6-global--BorderColor--100) 30%, transparent); color: var(--pf-v6-global--Color--100); }
    .lib-table-row:hover { background-color: color-mix(in srgb, var(--pf-v6-global--BackgroundColor--200) 40%, transparent); }
    .lib-row-link:hover { background-color: color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent); }
    .lib-row-link:focus-visible { outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--pf-v6-global--primary-color--100) 40%, transparent); }
    .lib-row-link:hover .lib-row-name { text-decoration: underline; }
    .lib-mode-btn:not(.active):hover { border-color: color-mix(in srgb, var(--pf-v6-global--primary-color--100) 50%, transparent); color: var(--pf-v6-global--Color--100); }
    .lib-input:focus { border-color: var(--pf-v6-global--primary-color--100); outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--pf-v6-global--primary-color--100) 25%, transparent); }
    .lib-input::placeholder { color: var(--pf-v6-global--Color--200); }
    .lib-file-input::file-selector-button { margin-right: 0.75rem; cursor: pointer; border-radius: var(--pf-v6-global--BorderRadius--sm); border: 0; background-color: color-mix(in srgb, var(--pf-v6-global--primary-color--100) 20%, transparent); padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 600; color: var(--pf-v6-global--Color--100); }
    .lib-file-input:hover::file-selector-button { background-color: color-mix(in srgb, var(--pf-v6-global--primary-color--100) 30%, transparent); }
    .lib-virtual-row:first-child { border-top: 0; }
    .lib-star-btn:hover { color: var(--pf-v6-global--palette--gold-400); }
    .lib-sort-header:hover { color: var(--pf-v6-global--Color--100); background-color: color-mix(in srgb, var(--pf-v6-global--BackgroundColor--200) 40%, transparent); }
  `;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportAllBusy, setExportAllBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportKeleoBusy, setExportKeleoBusy] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    type: 'bulk' | 'single';
    items: EnrichedMeta[];
  } | null>(null);

  const [domainTagFilter, setDomainTagFilter] = useState<string[]>([]);
  const [lifecycleTagFilter, setLifecycleTagFilter] = useState<string[]>([]);
  const [orgTagFilter, setOrgTagFilter] = useState<string[]>([]);
  const [keywordFilter, setKeywordFilter] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'name' | 'type' | 'elements' | 'updated'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dashboard config for starring
  const [dashboardConfigId, setDashboardConfigId] = useState<string>("");
  const [starredIds, setStarredIds] = useState<string[]>([]);

  // Installed bundles
  const [installedBundles, setInstalledBundles] = useState<Array<{ slug: string; name: string; version: string; description: string; documentCount: number }>>([]);
  const [removingBundle, setRemovingBundle] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setDownloadError(null);
    setDeleteError(null);
    try {
      // Primary source: bundle library index (covers all bundles + workspace)
      const [indexRes, docsRes, bundlesRes] = await Promise.all([
        fetch("/api/library/index"),
        fetch("/api/documents?details=1"),
        fetch("/api/bundles"),
      ]);

      if (!indexRes.ok) {
        setLoadError((await indexRes.text()) || `HTTP ${indexRes.status}`);
        setItems([]);
        return;
      }

      const indexData = (await indexRes.json()) as {
        entries?: Array<{
          name: string;
          documentType: LibraryRootKind;
          description: string;
          tags: LibraryDocumentTags;
          keywords: string[];
          elementCount: number;
          activeVersion: string;
          activeBundleSlug: string;
          activeDocumentPath: string;
          updatedAt: string;
          createdAt: string;
          versions: Array<{ version: string; bundleSlug: string; documentPath: string }>;
        }>;
        bundles?: typeof installedBundles;
      };

      // Cross-reference with flat store to get document IDs (for navigator links)
      const flatDocs: Array<{ id: string; title: string; kind: string; displayName?: string; updatedAt?: string }> = [];
      if (docsRes.ok) {
        const docsData = (await docsRes.json()) as { documents?: typeof flatDocs };
        if (Array.isArray(docsData.documents)) {
          flatDocs.push(...docsData.documents.filter((d) => d.kind !== "dashboard-config"));
        }
      }
      const flatByName = new Map<string, (typeof flatDocs)[0]>();
      for (const d of flatDocs) {
        const name = (d.displayName || d.title || "").trim().toLowerCase();
        if (name) flatByName.set(name, d);
      }

      const entries = Array.isArray(indexData.entries) ? indexData.entries : [];
      setItems(
        entries.map((e) => {
          const nameKey = e.name.trim().toLowerCase();
          const flat = flatByName.get(nameKey);
          return {
            id: flat?.id ?? `bundle:${e.activeBundleSlug}/${e.activeDocumentPath}`,
            title: e.name,
            kind: e.documentType,
            displayName: e.name,
            libraryRootKind: e.documentType,
            virtualFileCount: e.elementCount,
            libraryTags: e.tags ?? { domainTags: [], lifecycleTags: [], organizationalTags: [] },
            keywords: e.keywords ?? [],
            updatedAt: flat?.updatedAt || e.updatedAt || "",
            createdAt: e.createdAt || "",
            activeVersion: e.activeVersion,
            availableVersions: e.versions.map((v) => v.version),
            bundleSlug: e.activeBundleSlug,
            bundleDocumentPath: e.activeDocumentPath,
          };
        }),
      );

      // Set installed bundles for sidebar
      if (bundlesRes.ok) {
        const bundlesData = (await bundlesRes.json()) as { bundles?: typeof installedBundles };
        setInstalledBundles(Array.isArray(bundlesData.bundles) ? bundlesData.bundles : []);
      }

      // Load dashboard config for starring
      try {
        const dashboardConfig = await loadDashboardConfig();
        setDashboardConfigId(dashboardConfig.id);
        setStarredIds(dashboardConfig.config.starredDocumentIds || []);
      } catch (e) {
        console.error("Failed to load dashboard config:", e);
      }
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

  // Clear selection when filters change to avoid phantom selected items
  useEffect(() => {
    clearSelection();
  }, [folder, domainTagFilter, lifecycleTagFilter, orgTagFilter, keywordFilter]);

  const counts = useMemo(() => {
    const c: Record<LibraryRootKind, number> = {
      method: 0,
      baselinePractice: 0,
      practice: 0,
      project: 0,
      changeRequest: 0,
      changeSet: 0,
      unknown: 0,
    };
    for (const it of items) {
      c[it.libraryRootKind] += 1;
    }
    return c;
  }, [items]);

  const domainTagOptions = useMemo(() => collectSortedUniqueTags(items.map((it) => it.libraryTags.domainTags)), [items]);
  const lifecycleTagOptions = useMemo(
    () => collectSortedUniqueTags(items.map((it) => it.libraryTags.lifecycleTags)),
    [items],
  );
  const orgTagOptions = useMemo(
    () => collectSortedUniqueTags(items.map((it) => it.libraryTags.organizationalTags)),
    [items],
  );
  const keywordOptions = useMemo(
    () => collectSortedUniqueTags(items.map((it) => it.keywords || [])),
    [items],
  );

  const tagFilterActive =
    domainTagFilter.length > 0 || lifecycleTagFilter.length > 0 || orgTagFilter.length > 0 || keywordFilter.length > 0;

  // Toggle star status
  const toggleStar = useCallback(async (documentId: string) => {
    if (!dashboardConfigId) return;

    const newStarredIds = starredIds.includes(documentId)
      ? starredIds.filter((id) => id !== documentId)
      : [...starredIds, documentId];

    // Optimistic update
    setStarredIds(newStarredIds);

    try {
      const dashboardConfig = await loadDashboardConfig();
      await saveDashboardConfig(dashboardConfigId, {
        ...dashboardConfig.config,
        starredDocumentIds: newStarredIds,
      });
    } catch (e) {
      console.error("Failed to update starred status:", e);
      // Revert on error
      setStarredIds(starredIds);
    }
  }, [dashboardConfigId, starredIds]);

  const filtered = useMemo(() => {
    let list = folder === "all" ? items : items.filter((it) => it.libraryRootKind === folder);
    if (domainTagFilter.length > 0) {
      list = list.filter((it) => domainTagFilter.some((x) => it.libraryTags.domainTags.includes(x)));
    }
    if (lifecycleTagFilter.length > 0) {
      list = list.filter((it) => lifecycleTagFilter.some((x) => it.libraryTags.lifecycleTags.includes(x)));
    }
    if (orgTagFilter.length > 0) {
      list = list.filter((it) => orgTagFilter.some((x) => it.libraryTags.organizationalTags.includes(x)));
    }
    if (keywordFilter.length > 0) {
      list = list.filter((it) => keywordFilter.some((x) => (it.keywords || []).includes(x)));
    }

    // Apply sorting
    const sorted = [...list].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'type':
          comparison = a.libraryRootKind.localeCompare(b.libraryRootKind);
          break;
        case 'elements':
          comparison = a.virtualFileCount - b.virtualFileCount;
          break;
        case 'updated':
          comparison = a.updatedAt.localeCompare(b.updatedAt);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [items, folder, domainTagFilter, lifecycleTagFilter, orgTagFilter, keywordFilter, sortColumn, sortDirection]);

  const clearTagFilters = useCallback(() => {
    setDomainTagFilter([]);
    setLifecycleTagFilter([]);
    setOrgTagFilter([]);
    setKeywordFilter([]);
  }, []);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(filtered.map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  }

  function handleSort(column: 'name' | 'type' | 'elements' | 'updated') {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  async function removeBundle(slug: string) {
    if (slug === "_workspace") return;
    setRemovingBundle(slug);
    try {
      const res = await fetch(`/api/bundles/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (res.ok) {
        await refresh();
      }
    } catch {
      // ignore
    } finally {
      setRemovingBundle(null);
    }
  }

  function isBundleRef(id: string): boolean {
    return id.startsWith("bundle:");
  }

  function getNavigatorHref(item: EnrichedMeta): string {
    if (isBundleRef(item.id) && item.bundleSlug && item.bundleDocumentPath) {
      return `/navigator?bundle=${encodeURIComponent(item.bundleSlug)}&path=${encodeURIComponent(item.bundleDocumentPath)}`;
    }
    return `/navigator?libraryId=${encodeURIComponent(item.id)}`;
  }

  function getEditHref(id: string): string {
    const item = items.find((it) => it.id === id);
    if (!item) return "#";

    const idParam = isBundleRef(id) && item.bundleSlug && item.bundleDocumentPath
      ? `bundle=${encodeURIComponent(item.bundleSlug)}&path=${encodeURIComponent(item.bundleDocumentPath)}`
      : `libraryId=${encodeURIComponent(id)}`;

    if (item.libraryRootKind === "method") {
      return `/method-builder?${idParam}`;
    }

    return `/practice-author?${idParam}`;
  }

  function getDocumentApiUrl(item: EnrichedMeta): string {
    if (isBundleRef(item.id) && item.bundleSlug && item.bundleDocumentPath) {
      return `/api/library/document?bundle=${encodeURIComponent(item.bundleSlug)}&path=${encodeURIComponent(item.bundleDocumentPath)}`;
    }
    return `/api/documents/${encodeURIComponent(item.id)}`;
  }

  async function handleBulkDownload() {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      const item = items.find((it) => it.id === selectedIds[0]);
      if (!item) return;
      const url = getDocumentApiUrl(item);
      const res = await fetch(url);
      if (!res.ok) return;
      const doc = (await res.json()) as { body?: unknown };
      const text = JSON.stringify(doc.body ?? null, null, 2);
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `${slugFileBase(item.displayName || item.title || item.id)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dl);
      return;
    }

    // Multiple items - download as JSON array
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    const bodies: unknown[] = [];

    for (const item of selectedItems) {
      try {
        const res = await fetch(getDocumentApiUrl(item));
        if (res.ok) {
          const doc = await res.json();
          bodies.push(doc.body ?? null);
        }
      } catch (e) {
        console.error(`Failed to fetch ${item.id}:`, e);
      }
    }

    const text = JSON.stringify(bodies, null, 2);
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `library-export-${selectedItems.length}-items.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportKeleo() {
    if (selectedIds.length === 0) return;
    setExportKeleoBusy(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/documents/export-keleo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((errBody as { error?: string }).error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || (selectedIds.length === 1 ? "export.keleo" : "keleo-export.zip");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportKeleoBusy(false);
    }
  }

  function requestBulkDelete() {
    if (selectedIds.length === 0) return;

    const targets = items.filter((it) => selectedIds.includes(it.id));
    setDeleteConfirmData({ type: 'bulk', items: targets });
    setDeleteConfirmOpen(true);
  }

  async function handleBulkDelete() {
    if (!deleteConfirmData || deleteConfirmData.type !== 'bulk') return;

    const targets = deleteConfirmData.items;
    const countStr = String(targets.length);

    setDeleteConfirmOpen(false);

    setDeleteBusy(true);
    setDeleteError(null);
    const failures: string[] = [];

    for (const row of targets) {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(row.id)}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          let m = await res.text().catch(() => "");
          try {
            const j = JSON.parse(m) as { error?: string };
            if (j?.error) m = j.error;
          } catch {
            // If response is HTML (server error page), provide a clean error message
            if (m.trim().startsWith("<!DOCTYPE") || m.trim().startsWith("<html")) {
              m = "Server error";
            }
          }
          const label = row.displayName || row.title || row.id;
          failures.push(m ? `${label}: ${m}` : `${label} (HTTP ${res.status})`);
        }
      } catch (e: unknown) {
        const label = row.displayName || row.title || row.id;
        failures.push(`${label}: ${e instanceof Error ? e.message : t.libraryDeleteFailed}`);
      }
    }

    if (expandedId && selectedIds.includes(expandedId)) {
      setExpandedId(null);
    }

    clearSelection();
    await refresh();

    if (failures.length > 0) {
      const summary = `Failed to delete ${failures.length} of ${countStr} items.`;
      const detail = failures.slice(0, 3).join(" · ");
      setDeleteError(detail ? `${summary} ${detail}` : summary);
    }

    setDeleteBusy(false);
  }

  function requestSingleDelete(row: EnrichedMeta) {
    setDeleteConfirmData({ type: 'single', items: [row] });
    setDeleteConfirmOpen(true);
  }

  async function handleSingleDelete() {
    if (!deleteConfirmData || deleteConfirmData.type !== 'single' || deleteConfirmData.items.length === 0) return;

    const row = deleteConfirmData.items[0];
    setDeleteConfirmOpen(false);
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
          // If response is HTML (server error page), provide a clean error message
          if (m.trim().startsWith("<!DOCTYPE") || m.trim().startsWith("<html")) {
            m = "Server error";
          }
        }
        setDeleteError(m || `${t.libraryDeleteFailed} (${res.status})`);
        return;
      }
      if (expandedId === row.id) {
        setExpandedId(null);
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
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
      color: "var(--pf-v6-global--Color--100)",
      fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
    }}>
      <style dangerouslySetInnerHTML={{ __html: hoverStyles }} />
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "row",
        gap: 0,
        padding: "2.5rem 2.5rem",
      }}>
        {/* Sidebar — folder tree */}
        <aside style={{
          width: "16rem",
          flexShrink: 0,
          borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
          paddingRight: "1.5rem",
        }}>
          <Title headingLevel="h3" size="md" ouiaId="sidebar-browse-title" style={{
            textTransform: "uppercase",
            color: "var(--pf-v6-global--Color--200)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}>Browse</Title>
          <nav style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }} aria-label="Library folders">
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

          {!loading && !loadError ? (
            <div style={{
              marginTop: "2rem",
              borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
              paddingTop: "1.5rem",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                <Title headingLevel="h3" size="md" ouiaId="sidebar-filters-title" style={{
                  textTransform: "uppercase",
                  color: "var(--pf-v6-global--Color--200)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  {t.libraryTagFiltersHeading}
                </Title>
                {tagFilterActive ? (
                  <button
                    type="button"
                    onClick={clearTagFilters}
                    style={{
                      flexShrink: 0,
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      padding: "0.125rem 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--Color--200)",
                      cursor: "pointer",
                    }}
                    className="lib-btn-secondary"
                  >
                    {t.libraryClearTagFilters}
                  </button>
                ) : null}
              </div>
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <LibraryTagTreeSection
                  sectionLabel={t.tagsDomain}
                  options={domainTagOptions}
                  selected={domainTagFilter}
                  onToggle={(tag) => setDomainTagFilter((prev) => toggleTagSelection(prev, tag))}
                />
                <LibraryTagTreeSection
                  sectionLabel={t.tagsLifecycle}
                  options={lifecycleTagOptions}
                  selected={lifecycleTagFilter}
                  onToggle={(tag) => setLifecycleTagFilter((prev) => toggleTagSelection(prev, tag))}
                />
                <LibraryTagTreeSection
                  sectionLabel={t.tagsOrganizational}
                  options={orgTagOptions}
                  selected={orgTagFilter}
                  onToggle={(tag) => setOrgTagFilter((prev) => toggleTagSelection(prev, tag))}
                />
                <LibraryTagTreeSection
                  sectionLabel="Keywords"
                  options={keywordOptions}
                  selected={keywordFilter}
                  onToggle={(tag) => setKeywordFilter((prev) => toggleTagSelection(prev, tag))}
                />
              </div>
            </div>
          ) : null}

          {/* Installed bundles */}
          {installedBundles.filter(b => b.slug !== "_workspace").length > 0 ? (
            <div style={{
              marginTop: "2rem",
              borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
              paddingTop: "1.5rem",
            }}>
              <Title headingLevel="h3" size="md" style={{
                textTransform: "uppercase",
                color: "var(--pf-v6-global--Color--200)",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}>Bundles</Title>
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {installedBundles.filter(b => b.slug !== "_workspace").map((bundle) => (
                  <div
                    key={bundle.slug}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      padding: "0.5rem 0.625rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        color: "var(--pf-v6-global--Color--100)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {bundle.name}
                      </div>
                      <div style={{ color: "var(--pf-v6-global--Color--200)", fontFamily: "monospace", fontSize: "0.6875rem" }}>
                        v{bundle.version} &middot; {bundle.documentCount} docs
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={removingBundle === bundle.slug}
                      onClick={() => void removeBundle(bundle.slug)}
                      style={{
                        flexShrink: 0,
                        border: "none",
                        background: "none",
                        cursor: removingBundle === bundle.slug ? "wait" : "pointer",
                        fontSize: "0.6875rem",
                        color: "var(--pf-v6-global--danger-color--100)",
                        padding: "0.125rem 0.25rem",
                      }}
                      className="lib-btn-danger"
                      title={`Remove bundle "${bundle.name}"`}
                    >
                      {removingBundle === bundle.slug ? "..." : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* Main file list */}
        <div style={{ minWidth: 0, flex: 1, paddingLeft: "0.5rem" }}>
          <Title headingLevel="h1" size="4xl" ouiaId="page-title">Manage library</Title>
          <Content component={ContentVariants.p} ouiaId="page-description" style={{
            marginTop: "0.75rem",
            maxWidth: "42rem",
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--pf-v6-global--Color--200)",
          }}>
            Upload <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.keleo</code> bundles or{" "}
            <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.json</code> files to add practices, baselines, and methods to the library.
            You can also drop files into the <code style={{ color: "var(--pf-v6-global--Color--100)" }}>data/inbox/</code> directory to auto-import
            them on next load. Expand a row to see nested elements.
          </Content>

          <div style={{
            marginTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
            paddingBottom: "0.75rem",
          }}>
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>{breadcrumb}</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--primary-color--100)",
                  backgroundColor: "var(--pf-v6-global--primary-color--100)",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "white",
                  cursor: "pointer",
                }}
                className="lib-btn-primary"
              >
                Add to library
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--pf-v6-global--Color--100)",
                  cursor: "pointer",
                }}
                className="lib-btn-secondary"
              >
                Refresh
              </button>
              <button
                type="button"
                disabled={loading || !!loadError || items.length === 0 || exportAllBusy}
                title={
                  items.length === 0 && !loading && !loadError
                    ? "Add documents before exporting."
                    : "JSON array of every stored document body — use Add to library to re-import."
                }
                onClick={() => {
                  setDownloadError(null);
                  setExportAllBusy(true);
                  const stem = `adoption-library-${new Date().toISOString().slice(0, 10)}`;
                  void downloadFullLibraryBodiesJson(stem)
                    .catch((e: unknown) => {
                      setDownloadError(e instanceof Error ? e.message : "Export failed");
                    })
                    .finally(() => setExportAllBusy(false));
                }}
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--pf-v6-global--Color--100)",
                  cursor: "pointer",
                  opacity: (loading || !!loadError || items.length === 0 || exportAllBusy) ? 0.5 : 1,
                }}
                className="lib-btn-secondary"
              >
                {exportAllBusy ? t.libraryDownloadingAllJson : t.libraryDownloadAllJson}
              </button>
            </div>
          </div>

          <LibraryAddModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={refresh} />

          <DeleteConfirmModal
            open={deleteConfirmOpen}
            data={deleteConfirmData}
            onCancel={() => {
              setDeleteConfirmOpen(false);
              setDeleteConfirmData(null);
            }}
            onConfirm={async () => {
              if (deleteConfirmData?.type === 'bulk') {
                await handleBulkDelete();
              } else if (deleteConfirmData?.type === 'single') {
                await handleSingleDelete();
              }
              setDeleteConfirmData(null);
            }}
            busy={deleteBusy}
          />

          {deleteError ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--pf-v6-global--danger-color--100)" }} role="alert">
              {deleteError}
            </p>
          ) : null}

          {downloadError ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--pf-v6-global--danger-color--100)" }} role="alert">
              {downloadError}
            </p>
          ) : null}

          {loading ? (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>Loading library…</p>
          ) : loadError ? (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "var(--pf-v6-global--danger-color--100)" }}>{loadError}</p>
          ) : filtered.length === 0 ? (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
              {items.length > 0 ? (
                <>
                  {tagFilterActive ? (
                    <>
                      No documents match the selected tag filters and folder.{" "}
                      <button
                        type="button"
                        onClick={clearTagFilters}
                        style={{
                          fontWeight: 600,
                          color: "var(--pf-v6-global--link--Color)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        className="lib-link"
                      >
                        {t.libraryClearTagFilters}
                      </button>
                    </>
                  ) : folder !== "all" ? (
                    <>
                      No documents in this folder. Choose another folder in the sidebar, or use{" "}
                      <strong style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>Add to library</strong>.
                    </>
                  ) : (
                    "No matching documents."
                  )}
                </>
              ) : (
                <>
                  No documents yet. Use <strong style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>Add to library</strong>, open in{" "}
                  <Link href="/practice-author" style={{
                    fontWeight: 500,
                    color: "var(--pf-v6-global--link--Color)",
                  }}
                  className="lib-link">
                    Practice author
                  </Link>
                  , or POST to <code style={{ color: "var(--pf-v6-global--Color--100)" }}>/api/documents</code>.
                </>
              )}
            </p>
          ) : (
            <>
              {selectedIds.length > 0 && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
                    {selectedIds.length} selected
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleBulkDownload()}
                    style={{
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--Color--100)",
                      cursor: "pointer",
                    }}
                    className="lib-btn-secondary"
                  >
                    Download {selectedIds.length > 1 ? `(${selectedIds.length})` : ""}
                  </button>

                  <button
                    type="button"
                    disabled={exportKeleoBusy}
                    onClick={() => void handleExportKeleo()}
                    style={{
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--primary-color--100)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--primary-color--100)",
                      cursor: exportKeleoBusy ? "not-allowed" : "pointer",
                      opacity: exportKeleoBusy ? 0.5 : 1,
                    }}
                    className="lib-btn-secondary"
                  >
                    {exportKeleoBusy ? "Exporting…" : `Export .keleo${selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}`}
                  </button>

                  {selectedIds.length === 1 && (
                    <>
                      <Link
                        href={`/navigator?libraryId=${encodeURIComponent(selectedIds[0])}`}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--pf-v6-global--link--Color)",
                          textDecoration: "none",
                        }}
                        className="lib-link"
                      >
                        Navigate
                      </Link>
                      <Link
                        href={getEditHref(selectedIds[0])}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--pf-v6-global--link--Color)",
                          textDecoration: "none",
                        }}
                        className="lib-link"
                      >
                        Edit
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={requestBulkDelete}
                    disabled={deleteBusy}
                    style={{
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--danger-color--100)",
                      backgroundColor: "transparent",
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--danger-color--100)",
                      cursor: deleteBusy ? "not-allowed" : "pointer",
                      opacity: deleteBusy ? 0.5 : 1,
                    }}
                    className="lib-btn-danger"
                  >
                    Delete ({selectedIds.length})
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      border: "1px solid var(--pf-v6-global--BorderColor--100)",
                      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--pf-v6-global--Color--100)",
                      cursor: "pointer",
                    }}
                    className="lib-btn-secondary"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              <div style={{
                marginTop: "1rem",
                borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--pf-v6-global--Color--200)",
                  }}>
                    <th
                      style={{
                        width: "3rem",
                        padding: "0.75rem",
                        borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                        style={{ cursor: "pointer", width: "1rem", height: "1rem" }}
                        aria-label="Select all"
                      />
                    </th>
                    <th style={{ width: "2.5rem", padding: "0.625rem 0.75rem" }} aria-label="Expand" />
                    <th
                      style={{ minWidth: 0, padding: "0.625rem 0.75rem", cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort('name')}
                      className="lib-sort-header"
                    >
                      Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="hidden whitespace-nowrap sm:table-cell lib-sort-header"
                      style={{ padding: "0.625rem 0.75rem", cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort('type')}
                    >
                      Type {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="hidden whitespace-nowrap md:table-cell lib-sort-header"
                      style={{ padding: "0.625rem 0.75rem", cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort('elements')}
                    >
                      Elements {sortColumn === 'elements' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="hidden whitespace-nowrap md:table-cell"
                      style={{ padding: "0.625rem 0.75rem", userSelect: "none" }}
                    >
                      Versions
                    </th>
                    <th
                      className="min-w-0 whitespace-nowrap lib-sort-header"
                      style={{ padding: "0.625rem 0.5rem", cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort('updated')}
                    >
                      Updated {sortColumn === 'updated' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const ext = rootKindExtension(row.libraryRootKind);
                    const base = slugFileBase(row.displayName);
                    const filename = `${base}.${ext}`;
                    const navigatorHref = getNavigatorHref(row);
                    const open = expandedId === row.id;
                    const selected = selectedIds.includes(row.id);
                    return (
                      <Fragment key={row.id}>
                        <tr style={{
                          position: "relative",
                          zIndex: open ? 20 : 0,
                          borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                          backgroundColor: selected
                            ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 8%, transparent)"
                            : undefined,
                        }}
                        className="lib-table-row">
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelection(row.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: "pointer", width: "1rem", height: "1rem" }}
                              aria-label={`Select ${row.displayName || row.title}`}
                            />
                          </td>
                          <td style={{ padding: "0.25rem", verticalAlign: "middle" }}>
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? "Collapse" : "Expand nested elements"}
                              onClick={() => void toggleExpand(row.id)}
                              style={{
                                display: "flex",
                                height: "2rem",
                                width: "2rem",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                color: "var(--pf-v6-global--Color--200)",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                              }}
                              className="lib-expand-btn"
                            >
                              <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }} aria-hidden>
                                {open ? "▾" : "▸"}
                              </span>
                            </button>
                          </td>
                          <td style={{ minWidth: 0, padding: "0.5rem", fontWeight: 500 }} className="sm:px-3">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <Link
                                href={navigatorHref}
                                title="Browse this document"
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                  padding: "0.125rem 0.25rem",
                                  margin: "-0.125rem -0.25rem",
                                  textAlign: "left",
                                  textDecoration: "none",
                                }}
                                className="group lib-row-link"
                              >
                                <span style={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color: "var(--pf-v6-global--Color--100)",
                                }}
                                className="lib-row-name">
                                  {row.displayName}
                                </span>
                                <span style={{
                                  marginTop: "0.125rem",
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontFamily: "monospace",
                                  fontSize: "0.75rem",
                                  color: "var(--pf-v6-global--Color--200)",
                                }}>{filename}</span>
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void toggleStar(row.id);
                                }}
                                aria-label={starredIds.includes(row.id) ? "Unstar item" : "Star item"}
                                className="lib-star-btn"
                                style={{
                                  flexShrink: 0,
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  padding: "0.25rem",
                                  display: "flex",
                                  alignItems: "center",
                                  color: starredIds.includes(row.id)
                                    ? "var(--pf-v6-global--palette--gold-400)"
                                    : "var(--pf-v6-global--Color--200)",
                                }}
                              >
                                {starredIds.includes(row.id) ? (
                                  <StarIcon size="sm" />
                                ) : (
                                  <OutlinedStarIcon size="sm" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell" style={{ padding: "0.5rem 0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                            <span style={{
                              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                              border: "1px solid var(--pf-v6-global--BorderColor--100)",
                              backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                              padding: "0.125rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}>
                              {row.libraryRootKind === "unknown" ? "unknown" : row.libraryRootKind}
                            </span>
                          </td>
                          <td className="hidden md:table-cell" style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                            {row.virtualFileCount}
                          </td>
                          <td className="hidden md:table-cell" style={{ padding: "0.5rem 0.75rem" }}>
                            {row.availableVersions && row.availableVersions.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                {row.availableVersions.map((v) => (
                                  <span
                                    key={v}
                                    style={{
                                      display: "inline-block",
                                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                      border: v === row.activeVersion
                                        ? "1px solid var(--pf-v6-global--primary-color--100)"
                                        : "1px solid var(--pf-v6-global--BorderColor--100)",
                                      backgroundColor: v === row.activeVersion
                                        ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                        : "var(--pf-v6-global--BackgroundColor--100)",
                                      padding: "0.0625rem 0.375rem",
                                      fontSize: "0.6875rem",
                                      fontFamily: "monospace",
                                      color: v === row.activeVersion
                                        ? "var(--pf-v6-global--primary-color--100)"
                                        : "var(--pf-v6-global--Color--200)",
                                      cursor: "pointer",
                                    }}
                                    title={`Version ${v}${v === row.activeVersion ? " (active)" : ""}`}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontFamily: "monospace", fontSize: "0.6875rem", color: "var(--pf-v6-global--Color--200)" }}>—</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                            {formatDate(row.updatedAt)}
                          </td>
                        </tr>
                        {open ? (
                          <tr style={{
                            borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                          }}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <LibraryItemFocus documentId={row.id} apiUrl={isBundleRef(row.id) ? getDocumentApiUrl(row) : undefined} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LibraryAddModal(props: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ filename: string; ok: boolean; detail: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!props.open) {
      setPickedFiles([]);
      setError(null);
      setBusy(false);
      setProgress(null);
      setResults([]);
      setDragOver(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) props.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [props.open, props.onClose, busy]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter(
      (f) => f.name.endsWith(".keleo") || f.name.endsWith(".json"),
    );
    if (incoming.length === 0) {
      setError("Only .keleo and .json files are supported.");
      return;
    }
    setError(null);
    setPickedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !existing.has(f.name))];
    });
  }

  function removeFile(name: string) {
    setPickedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  async function handleUpload() {
    if (pickedFiles.length === 0) return;
    setBusy(true);
    setError(null);
    setResults([]);

    const formData = new FormData();
    for (const file of pickedFiles) {
      formData.append("files", file);
    }

    setProgress(`Uploading ${pickedFiles.length} file${pickedFiles.length > 1 ? "s" : ""}…`);

    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as {
        results?: Array<{
          filename: string;
          ok: boolean;
          bundle?: { name: string; documentCount: number };
          document?: string;
          error?: string;
        }>;
        error?: string;
      };

      if (data.error && !data.results) {
        setError(data.error);
        return;
      }

      const fileResults = (data.results ?? []).map((r) => ({
        filename: r.filename,
        ok: r.ok,
        detail: r.ok
          ? r.bundle
            ? `Installed bundle "${r.bundle.name}" (${r.bundle.documentCount} docs)`
            : `Saved "${r.document}"`
          : r.error ?? "Failed",
      }));

      setResults(fileResults);

      const anyOk = fileResults.some((r) => r.ok);
      if (anyOk) {
        await props.onSaved();
      }

      if (fileResults.every((r) => r.ok)) {
        setTimeout(() => props.onClose(), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (!props.open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <button
        type="button"
        aria-label="Close dialog"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(2px)",
          border: "none",
          cursor: "pointer",
        }}
        onClick={() => !busy && props.onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-upload-heading"
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          maxHeight: "min(90vh, 36rem)",
          width: "100%",
          maxWidth: "30rem",
          flexDirection: "column",
          borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          boxShadow: "var(--pf-v6-global--BoxShadow--xl)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
          padding: "0.75rem 1.25rem",
        }}>
          <Title headingLevel="h2" size="lg" id="library-upload-heading" style={{ letterSpacing: "-0.01em" }}>
            Add to library
          </Title>
          <button
            type="button"
            onClick={() => !busy && props.onClose()}
            style={{
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: "1px solid transparent",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--pf-v6-global--Color--200)",
              backgroundColor: "transparent",
              cursor: busy ? "not-allowed" : "pointer",
            }}
            className="lib-btn-secondary"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ minHeight: 0, flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}`,
              borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
              padding: "2rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragOver
                ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 5%, transparent)"
                : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", opacity: 0.5 }}>&#8593;</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
              Drop files here or click to browse
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", marginTop: "0.25rem" }}>
              .keleo bundles and .json documents
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".json,.keleo"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />

          {/* File list */}
          {pickedFiles.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--pf-v6-global--Color--200)",
                marginBottom: "0.5rem",
              }}>
                {pickedFiles.length} file{pickedFiles.length > 1 ? "s" : ""} selected
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {pickedFiles.map((f) => {
                  const result = results.find((r) => r.filename === f.name);
                  return (
                    <div
                      key={f.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        padding: "0.375rem 0.5rem",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                        backgroundColor: result
                          ? result.ok
                            ? "color-mix(in srgb, var(--pf-v6-global--success-color--100) 8%, transparent)"
                            : "color-mix(in srgb, var(--pf-v6-global--danger-color--100) 8%, transparent)"
                          : "var(--pf-v6-global--BackgroundColor--100)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "var(--pf-v6-global--Color--100)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {f.name}
                        </div>
                        {result && (
                          <div style={{
                            fontSize: "0.6875rem",
                            color: result.ok ? "var(--pf-v6-global--success-color--100)" : "var(--pf-v6-global--danger-color--100)",
                            marginTop: "0.125rem",
                          }}>
                            {result.detail}
                          </div>
                        )}
                      </div>
                      {!busy && results.length === 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                          style={{
                            flexShrink: 0,
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            color: "var(--pf-v6-global--Color--200)",
                            padding: "0 0.25rem",
                            lineHeight: 1,
                          }}
                          title="Remove file"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "var(--pf-v6-global--danger-color--100)",
            }}>
              {error}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
              {progress}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1.25rem",
          }}>
            <button
              type="button"
              onClick={() => !busy && props.onClose()}
              disabled={busy}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                backgroundColor: "transparent",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--100)",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.5 : 1,
              }}
              className="lib-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || pickedFiles.length === 0}
              onClick={() => void handleUpload()}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid var(--pf-v6-global--primary-color--100)",
                backgroundColor: "var(--pf-v6-global--primary-color--100)",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "white",
                cursor: (busy || pickedFiles.length === 0) ? "not-allowed" : "pointer",
                opacity: (busy || pickedFiles.length === 0) ? 0.5 : 1,
              }}
              className="lib-btn-primary"
            >
              {busy ? "Uploading…" : `Upload ${pickedFiles.length > 0 ? `(${pickedFiles.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal(props: {
  open: boolean;
  data: { type: 'bulk' | 'single'; items: EnrichedMeta[] } | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") props.onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [props.open, props.onCancel]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await props.onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  if (!props.open || !props.data) return null;

  const { type, items } = props.data;
  const isBulk = type === 'bulk';
  const count = items.length;
  const itemName = items[0]?.displayName || items[0]?.title || items[0]?.id || 'item';

  const title = isBulk && count > 1
    ? `Delete ${count} items?`
    : `Delete "${itemName}"?`;

  const message = isBulk && count > 1
    ? `You are about to permanently delete ${count} library items. This action cannot be undone.`
    : `You are about to permanently delete this library item. This action cannot be undone.`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(2px)",
          border: "none",
          cursor: "pointer",
        }}
        onClick={props.onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-heading"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "28rem",
          borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          boxShadow: "var(--pf-v6-global--BoxShadow--xl)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
            padding: "1rem 1.25rem",
          }}
        >
          <Title headingLevel="h2" size="lg" id="delete-confirm-heading">
            {title}
          </Title>
        </div>

        <div style={{ padding: "1.25rem" }}>
          <Content
            component={ContentVariants.p}
            style={{
              fontSize: "0.875rem",
              lineHeight: "1.6",
              color: "var(--pf-v6-global--Color--200)",
              marginBottom: "1.5rem",
            }}
          >
            {message}
          </Content>

          {isBulk && count > 1 && count <= 5 && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "0.75rem",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--pf-v6-global--Color--100)" }}>
                Items to be deleted:
              </div>
              <ul style={{ listStyle: "disc", paddingLeft: "1.25rem", color: "var(--pf-v6-global--Color--200)" }}>
                {items.map((item, idx) => (
                  <li key={idx}>{item.displayName || item.title || item.id}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={props.onCancel}
              disabled={confirming || props.busy}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--100)",
                cursor: (confirming || props.busy) ? "not-allowed" : "pointer",
                opacity: (confirming || props.busy) ? 0.5 : 1,
              }}
              className="lib-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={confirming || props.busy}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid #C9190B",
                backgroundColor: "#C9190B",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: (confirming || props.busy) ? "not-allowed" : "pointer",
                opacity: (confirming || props.busy) ? 0.5 : 1,
              }}
              className="lib-btn-danger-filled"
            >
              {confirming || props.busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryTagTreeSection(props: {
  sectionLabel: string;
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const selectedInSection = props.selected.filter((t) => props.options.includes(t)).length;
  return (
    <details style={{
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
    }}
    className="group">
      <summary style={{
        display: "flex",
        cursor: "pointer",
        listStyle: "none",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.5rem",
        textAlign: "left",
      }}
      className="lib-summary-no-marker">
        <span
          style={{
            display: "inline-flex",
            width: "1rem",
            flexShrink: 0,
            justifyContent: "center",
            fontFamily: "monospace",
            fontSize: "10px",
            lineHeight: 1,
            color: "var(--pf-v6-global--Color--200)",
            transition: "transform 0.15s",
          }}
          className="lib-rotate-open"
          aria-hidden
        >
          ▸
        </span>
        <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>{props.sectionLabel}</span>
        <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
          {selectedInSection}/{props.options.length}
        </span>
      </summary>
      <div style={{ borderTop: "1px solid var(--pf-v6-global--BorderColor--100)", paddingBottom: "0.5rem" }}>
        <ul style={{ marginTop: "0.25rem", marginLeft: "1.25rem", marginRight: "0.25rem", borderLeft: "1px solid var(--pf-v6-global--BorderColor--100)", paddingTop: "0.125rem", paddingBottom: "0.125rem", paddingLeft: "0.5rem" }} role="group">
          {props.options.length === 0 ? (
            <li style={{ padding: "0.25rem 0 0.25rem 0.25rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>—</li>
          ) : (
            props.options.map((tag) => {
              const on = props.selected.includes(tag);
              return (
                <li key={tag} style={{ display: "flex", minWidth: 0, alignItems: "stretch", gap: 0 }}>
                  <span style={{ marginTop: "0.65rem", height: "1px", width: "0.5rem", flexShrink: 0, alignSelf: "flex-start", borderTop: "1px solid var(--pf-v6-global--BorderColor--100)" }} aria-hidden />
                  <button
                    type="button"
                    aria-pressed={on}
                    title={tag}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onToggle(tag);
                    }}
                    style={{
                      minWidth: 0,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      padding: "0.25rem 0.375rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      lineHeight: 1.4,
                      transition: "all 0.2s ease",
                      backgroundColor: on ? "var(--pf-v6-global--primary-color--100)/18" : "transparent",
                      fontWeight: on ? 600 : 400,
                      color: on ? "var(--pf-v6-global--Color--100)" : "var(--pf-v6-global--Color--200)",
                      border: on ? "1px solid var(--pf-v6-global--primary-color--100)/35" : "1px solid transparent",
                      cursor: "pointer",
                    }}
                    className={on ? "" : "lib-tag-button"}
                  >
                    {tag}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </details>
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
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        padding: "0.5rem 0.75rem",
        textAlign: "left",
        fontSize: "0.875rem",
        fontWeight: 500,
        transition: "all 0.2s ease",
        backgroundColor: props.active ? "var(--pf-v6-global--primary-color--100)/15" : "transparent",
        color: props.active ? "var(--pf-v6-global--Color--100)" : "var(--pf-v6-global--Color--200)",
        border: props.active ? "1px solid var(--pf-v6-global--primary-color--100)/40" : "1px solid transparent",
        cursor: "pointer",
      }}
      className={props.active ? "" : "lib-folder-row"}
    >
      <span>{props.label}</span>
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8 }}>{props.count}</span>
    </button>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
