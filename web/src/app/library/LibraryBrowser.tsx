"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Title,
  Card,
  CardBody,
  Button,
  Label,
  Content,
  ContentVariants,
} from "@patternfly/react-core";
import { StarIcon, OutlinedStarIcon } from "@patternfly/react-icons";
import type { LibraryRootKind } from "@/lib/library/classify";
import { displayNameForBody, rootKindExtension, storageKindForBody } from "@/lib/library/classify";
import type { LibraryDocumentTags } from "@/lib/library/libraryDocumentTags";
import type { JsonDocumentMeta } from "@/lib/storage/types";
import { useLanguagePack } from "@/lib/display/languagePack";
import { LibraryItemFocus } from "./LibraryItemFocus";
import { loadDashboardConfig, saveDashboardConfig } from "@/lib/data/dashboardConfig";

type EnrichedMeta = JsonDocumentMeta & {
  libraryRootKind: LibraryRootKind;
  displayName: string;
  virtualFileCount: number;
  libraryTags: LibraryDocumentTags;
  keywords?: string[];
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setDownloadError(null);
    setDeleteError(null);
    try {
      // Load library items with body to extract keywords
      const res = await fetch("/api/documents?details=1&withBody=1");
      if (!res.ok) {
        setLoadError((await res.text()) || `HTTP ${res.status}`);
        setItems([]);
        return;
      }
      const data = (await res.json()) as { documents?: Array<EnrichedMeta & { body?: unknown }> };
      const allDocs = Array.isArray(data.documents) ? data.documents : [];
      // Filter out dashboard-config documents - only show library items
      const docs = allDocs.filter((d) => d.kind !== "dashboard-config");
      setItems(
        docs.map((d) => {
          // Extract keywords from body
          const keywords: string[] = [];
          if (d.body && typeof d.body === "object") {
            const bodyObj = d.body as Record<string, unknown>;
            if (Array.isArray(bodyObj.keywords)) {
              keywords.push(...bodyObj.keywords.filter((k): k is string => typeof k === "string"));
            }
          }
          return {
            ...d,
            libraryTags: d.libraryTags ?? { domainTags: [], lifecycleTags: [], organizationalTags: [] },
            keywords,
          };
        }),
      );

      // Load dashboard config for starring
      try {
        const dashboardConfig = await loadDashboardConfig();
        setDashboardConfigId(dashboardConfig.id);
        setStarredIds(dashboardConfig.config.starredDocumentIds || []);
      } catch (e) {
        console.error("Failed to load dashboard config:", e);
        // Continue without starring functionality
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

  function getEditHref(id: string): string {
    const item = items.find((it) => it.id === id);
    if (!item) return "#";

    if (item.libraryRootKind === "method") {
      return `/method-builder?libraryId=${encodeURIComponent(id)}`;
    }

    // For practices - go to practice editor
    return `/practice-author?libraryId=${encodeURIComponent(id)}`;
  }

  async function handleBulkDownload() {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      // Single item - use existing function
      const item = items.find((it) => it.id === selectedIds[0]);
      if (!item) return;
      await downloadLibraryDocumentJson(item.id, item.displayName || item.title || item.id);
      return;
    }

    // Multiple items - download as JSON array
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    const bodies: unknown[] = [];

    for (const item of selectedItems) {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(item.id)}`);
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
            Stored JSON is grouped like a file browser. Root documents use{" "}
            <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.method</code>,{" "}
            <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.baseline</code>, or{" "}
            <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.practice</code>. Expand a row to see nested practice elements with
            distinct pseudo-types (e.g. <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.focus</code>,{" "}
            <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.alpha</code>, <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.activity</code>).
            Use the <strong style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>Add to library</strong> button to paste JSON or
            upload a <code style={{ color: "var(--pf-v6-global--Color--100)" }}>.json</code> file. You can import a single document or a JSON
            array of methods, baseline practices, and/or extension practices—each array element is stored as its own library
            item. When adding a method, its individual practices are automatically extracted and added separately to the library.
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
                    const navigatorHref = `/navigator?libraryId=${encodeURIComponent(row.id)}`;
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
                          <td style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                            {formatDate(row.updatedAt)}
                          </td>
                        </tr>
                        {open ? (
                          <tr style={{
                            borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
                          }}>
                            <td colSpan={6} style={{ padding: 0 }}>
                              <LibraryItemFocus documentId={row.id} />
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
      let savedCount = 0;

      // Fetch existing documents to check for duplicates by title AND kind (type)
      setSaveProgress("Loading existing library items…");
      const listRes = await fetch("/api/documents");
      const listData = listRes.ok ? await listRes.json() : { documents: [] };
      const existingDocs: Array<{ id: string; title: string; kind: string }> = Array.isArray(listData.documents) ? listData.documents : [];
      // Map by "title|kind" to allow same title for different types
      const titleKindToId = new Map(existingDocs.map(d => [`${d.title.toLowerCase()}|${d.kind}`, d.id]));

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

        // Check if document with same title AND kind already exists
        const compositeKey = `${title.toLowerCase()}|${kind}`;
        const existingId = titleKindToId.get(compositeKey);
        let res: Response;

        if (existingId) {
          // Update existing document with same name and type
          res = await fetch(`/api/documents/${encodeURIComponent(existingId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, kind, body }),
          });
        } else {
          // Create new document
          res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, kind, body }),
          });
        }

        if (!res.ok) {
          let msg = await res.text();
          try {
            const j = JSON.parse(msg) as { error?: string; issues?: Array<{ path?: string; message?: string }> };
            if (j?.error) {
              msg = j.error;
              // If validation issues are provided, append them
              if (j.issues && Array.isArray(j.issues) && j.issues.length > 0) {
                // Deduplicate issues by creating unique key from path + message
                const uniqueIssues = Array.from(
                  new Map(
                    j.issues.map((issue) => {
                      const path = issue.path || "";
                      const message = issue.message || "Invalid value";
                      return [`${path}::${message}`, { path, message }];
                    })
                  ).values()
                );

                const issueList = uniqueIssues
                  .slice(0, 8) // Show up to 8 unique issues
                  .map((issue) => {
                    // Convert empty or root paths to something readable
                    let displayPath = issue.path;
                    if (!displayPath || displayPath === "" || displayPath === "#" || displayPath === "/") {
                      displayPath = "Document root";
                    } else {
                      // Make the path more readable: /alphas/2/states/0 -> alphas[2].states[0]
                      displayPath = displayPath
                        .replace(/^\//, "") // Remove leading slash
                        .replace(/\/(\d+)/g, "[$1]") // Convert /2 to [2]
                        .replace(/\//g, "."); // Convert / to .
                    }
                    return `<strong>${displayPath}</strong>: ${issue.message}`;
                  });

                const remaining = uniqueIssues.length > 8 ? `... and ${uniqueIssues.length - 8} more issue(s)` : "";

                // Join with newlines and a special separator that we'll handle in display
                msg = `${msg}||ISSUES||${issueList.join("||ISSUE||")}${remaining ? "||ISSUE||" + remaining : ""}`;
              }
            }
          } catch {
            // If response is HTML (server error page), provide a clean error message
            if (msg.trim().startsWith("<!DOCTYPE") || msg.trim().startsWith("<html")) {
              msg = "Server error";
            }
          }
          failures.push(`#${i + 1} (${title}): ${msg || `HTTP ${res.status}`}`);
        } else {
          savedCount++;
          // Update the map with the new document if it was created
          if (!existingId) {
            const newDoc = await res.json();
            if (newDoc?.id) {
              titleKindToId.set(compositeKey, newDoc.id);
            }
          }
        }

        // If this is a Method with practices, extract and save each practice separately
        if (kind === "method" && typeof body === "object" && body !== null) {
          const methodBody = body as Record<string, unknown>;
          const practices = methodBody.practices;

          if (Array.isArray(practices) && practices.length > 0) {
            setSaveProgress(`Extracting ${practices.length} practice(s) from ${title}…`);

            // Get the method name from the body
            const methodName = typeof body.name === "string" ? body.name : title;

            for (let j = 0; j < practices.length; j++) {
              const practice = practices[j];
              if (practice && typeof practice === "object" && !Array.isArray(practice)) {
                const practiceBody = practice as Record<string, unknown>;
                const practiceName = typeof practiceBody.name === "string" ? practiceBody.name : `Practice ${j + 1}`;
                const practiceTitle = `${practiceName} (from ${title})`;
                const practiceKind = "practice";

                // Add method name to practice keywords
                const existingKeywords = Array.isArray(practiceBody.keywords)
                  ? practiceBody.keywords.filter(k => typeof k === "string")
                  : [];
                const methodKeyword = methodName.trim();
                const updatedKeywords = existingKeywords.includes(methodKeyword)
                  ? existingKeywords
                  : [...existingKeywords, methodKeyword];

                // Create enriched practice body with method name in keywords
                // Ensure 'kind' is set for standalone practice validation
                const enrichedPractice = {
                  ...practiceBody,
                  kind: "practice",
                  keywords: updatedKeywords
                };

                // Check if practice with same title AND kind already exists
                const practiceCompositeKey = `${practiceTitle.toLowerCase()}|${practiceKind}`;
                const existingPracticeId = titleKindToId.get(practiceCompositeKey);
                let practiceRes: Response;

                if (existingPracticeId) {
                  // Update existing practice with same name and type
                  practiceRes = await fetch(`/api/documents/${encodeURIComponent(existingPracticeId)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: practiceTitle,
                      kind: practiceKind,
                      body: enrichedPractice
                    }),
                  });
                } else {
                  // Create new practice
                  practiceRes = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: practiceTitle,
                      kind: practiceKind,
                      body: enrichedPractice
                    }),
                  });
                }

                if (!practiceRes.ok) {
                  let msg = await practiceRes.text();
                  try {
                    const j = JSON.parse(msg) as { error?: string };
                    if (j?.error) msg = j.error;
                  } catch {
                    // If response is HTML (server error page), provide a clean error message
                    if (msg.trim().startsWith("<!DOCTYPE") || msg.trim().startsWith("<html")) {
                      msg = "Server error";
                    }
                  }
                  failures.push(`Practice "${practiceName}": ${msg || `HTTP ${practiceRes.status}`}`);
                } else {
                  savedCount++;
                  // Update the map with the new practice if it was created
                  if (!existingPracticeId) {
                    const newPractice = await practiceRes.json();
                    if (newPractice?.id) {
                      titleKindToId.set(practiceCompositeKey, newPractice.id);
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (failures.length > 0) {
        setError(
          savedCount === 0
            ? failures.join(" ")
            : `Saved ${savedCount} item(s). Errors: ${failures.join(" ")}`,
        );
        if (savedCount > 0) {
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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} className="sm:p-6">
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
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-upload-heading"
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          maxHeight: "min(90vh, 40rem)",
          width: "100%",
          maxWidth: "32rem",
          flexDirection: "column",
          borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
          border: "1px solid var(--pf-v6-global--BorderColor--100)",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
          boxShadow: "var(--pf-v6-global--BoxShadow--xl)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.75rem",
          borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
          padding: "0.75rem 1rem",
        }}
        className="sm:px-5">
          <Title headingLevel="h2" size="lg" style={{ letterSpacing: "-0.01em" }}>
            Add to library
          </Title>
          <button
            type="button"
            onClick={props.onClose}
            style={{
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: "1px solid transparent",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--pf-v6-global--Color--200)",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
            className="lib-btn-secondary"
          >
            Close
          </button>
        </div>
        <div style={{ minHeight: 0, flex: 1, overflowY: "auto", padding: "1rem" }} className="sm:px-5 sm:py-5">
          <Content component={ContentVariants.p} style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--200)" }}>
            Paste valid JSON or pick a file. Root value may be one document, or a{" "}
            <strong style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>JSON array</strong> of documents—each element becomes its own
            library item (method, baseline practice, or extension practice). Per-item storage kind is inferred from shape.
            Title defaults to each document&apos;s <code style={{ color: "var(--pf-v6-global--Color--100)" }}>name</code> (or the filename); optional
            title below applies only when importing a <strong style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>single</strong>{" "}
            object.
          </Content>
          <Content component={ContentVariants.p} style={{ marginTop: "0.5rem", fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--link--Color)" }}>
            <strong style={{ fontWeight: 600 }}>Method extraction:</strong> When you add a Method to the library, the individual practices
            from the method&apos;s <code style={{ color: "var(--pf-v6-global--Color--100)" }}>practices</code> array are automatically extracted and saved
            separately to the library for easy reference and reuse.
          </Content>

          <form style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }} onSubmit={(e) => void onSubmit(e)}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }} role="group" aria-label="JSON source">
          <button
            type="button"
            onClick={() => setMode("paste")}
            style={{
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: mode === "paste" ? "1px solid var(--pf-v6-global--primary-color--100)" : "1px solid var(--pf-v6-global--BorderColor--100)",
              padding: "0.375rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              transition: "all 0.2s ease",
              backgroundColor: mode === "paste" ? "var(--pf-v6-global--primary-color--100)/15" : "transparent",
              color: mode === "paste" ? "var(--pf-v6-global--Color--100)" : "var(--pf-v6-global--Color--200)",
              cursor: "pointer",
            }}
            className={mode === "paste" ? "active" : "lib-mode-btn"}
          >
            Paste JSON
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            style={{
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: mode === "file" ? "1px solid var(--pf-v6-global--primary-color--100)" : "1px solid var(--pf-v6-global--BorderColor--100)",
              padding: "0.375rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              transition: "all 0.2s ease",
              backgroundColor: mode === "file" ? "var(--pf-v6-global--primary-color--100)/15" : "transparent",
              color: mode === "file" ? "var(--pf-v6-global--Color--100)" : "var(--pf-v6-global--Color--200)",
              cursor: "pointer",
            }}
            className={mode === "file" ? "active" : "lib-mode-btn"}
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
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                padding: "0.5rem 0.75rem",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                lineHeight: 1.6,
                color: "var(--pf-v6-global--Color--100)",
              }}
              className="lib-input"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="library-file-json" style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--pf-v6-global--Color--200)",
            }}>
              JSON file
            </label>
            <input
              ref={fileRef}
              id="library-file-json"
              type="file"
              accept=".json,application/json,text/json"
              style={{
                marginTop: "0.5rem",
                display: "block",
                width: "100%",
                maxWidth: "28rem",
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "var(--pf-v6-global--Color--200)",
              }}
              className="lib-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPickedFile(f);
                setError(null);
              }}
            />
            {pickedFile ? (
              <p style={{ marginTop: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>Selected: {pickedFile.name}</p>
            ) : null}
          </div>
        )}

        <div>
          <label htmlFor="library-title-override" style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--pf-v6-global--Color--200)",
          }}>
            Title <span style={{ fontWeight: 400, textTransform: "none", color: "var(--pf-v6-global--Color--200)" }}>(optional)</span>
          </label>
          <input
            id="library-title-override"
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="Single import only: overrides title when root is one object"
            style={{
              marginTop: "0.375rem",
              width: "100%",
              maxWidth: "28rem",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: "1px solid var(--pf-v6-global--BorderColor--100)",
              backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "var(--pf-v6-global--Color--100)",
            }}
            className="placeholder:text-[var(--pf-v6-global--Color--200)] focus:border-[var(--pf-v6-global--primary-color--100)] focus:outline-none focus:ring-2 focus:ring-[var(--pf-v6-global--primary-color--100)]/25"
          />
        </div>

            {error ? (
              <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--danger-color--100)" }}>
                {error.includes("||ISSUES||") ? (
                  // Format validation errors with bullet list
                  (() => {
                    const [mainError, issuesStr] = error.split("||ISSUES||");
                    const issues = issuesStr ? issuesStr.split("||ISSUE||") : [];
                    return (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{mainError}</div>
                        {issues.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: "1.25rem", listStyleType: "disc" }}>
                            {issues.map((issue, idx) => (
                              <li key={idx} style={{ marginBottom: "0.25rem" }} dangerouslySetInnerHTML={{ __html: issue }} />
                            ))}
                          </ul>
                        )}
                      </>
                    );
                  })()
                ) : (
                  // Plain error message
                  error
                )}
              </div>
            ) : null}
            {saveProgress ? <p style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>{saveProgress}</p> : null}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", paddingTop: "0.25rem" }}>
              <button
                type="button"
                onClick={props.onClose}
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  backgroundColor: "transparent",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--pf-v6-global--Color--100)",
                  cursor: "pointer",
                }}
                className="lib-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--primary-color--100)",
                  backgroundColor: "var(--pf-v6-global--primary-color--100)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "white",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.5 : 1,
                }}
                className="lib-btn-primary"
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
