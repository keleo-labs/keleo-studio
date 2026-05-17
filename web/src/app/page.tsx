"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Title, Button, Spinner } from "@patternfly/react-core";
import { PlusCircleIcon } from "@patternfly/react-icons";
import { DashboardSectionCarousel } from "@/components/DashboardSectionCarousel";
import { DashboardSectionEditor } from "@/components/DashboardSectionEditor";
import {
  loadDashboardConfig,
  saveDashboardConfig,
  filterDocuments,
  sortDocuments,
  collectUniqueTags,
  type DashboardConfig,
  type DashboardConfigDocument,
  type DashboardSection,
  type EnrichedMeta,
} from "@/lib/dashboardConfig";
import { calculateSimpleCompletenessScore } from "@/lib/methodFocus";

export default function DashboardPage() {
  const [configId, setConfigId] = useState<string>("");
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [documents, setDocuments] = useState<EnrichedMeta[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Use ref to prevent double-loading in React StrictMode
  const hasLoaded = useRef(false);

  // Load dashboard config and documents on mount - ONLY ONCE
  useEffect(() => {
    // Prevent double-load in StrictMode
    if (hasLoaded.current) {
      console.log("[Dashboard Page] Already loaded, skipping");
      // Still need to set loading to false if we skip
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      console.log("[Dashboard Page] Loading data...");

      try {
        // Load config
        const dashboardConfigDoc = await loadDashboardConfig();

        if (cancelled) return;

        console.log("[Dashboard Page] Config loaded:", dashboardConfigDoc.id);
        setConfigId(dashboardConfigDoc.id);
        setConfig(dashboardConfigDoc.config);

        // Load documents
        const documentsResponse = await fetch("/api/documents?details=1", {
          cache: "no-store",
        });

        if (cancelled) return;

        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          if (cancelled) return;

          const allDocs = data.documents || [];
          console.log(`[Dashboard Page] Loaded ${allDocs.length} total documents`);

          // Filter out dashboard-config documents
          const docs = allDocs.filter(
            (doc: EnrichedMeta) => doc.kind !== "dashboard-config"
          );

          console.log(`[Dashboard Page] After filtering: ${docs.length} library documents`);
          if (allDocs.length !== docs.length) {
            console.log(`[Dashboard Page] Filtered out ${allDocs.length - docs.length} dashboard-config documents`);
          }

          setDocuments(docs);

          // Calculate scores for all documents
          const scoreMap = new Map<string, number>();
          for (const doc of docs) {
            const score = calculateSimpleCompletenessScore(doc);
            scoreMap.set(doc.id, score);
          }
          setScores(scoreMap);
        }

        // Mark as loaded only after successful completion
        hasLoaded.current = true;
      } catch (error) {
        console.error("[Dashboard Page] Failed to load:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []); // Empty deps - run only once

  // Handle toggling star status
  const handleToggleStar = useCallback(
    async (documentId: string) => {
      if (!config || !configId) return;

      const newStarredIds = config.starredDocumentIds.includes(documentId)
        ? config.starredDocumentIds.filter((id) => id !== documentId)
        : [...config.starredDocumentIds, documentId];

      const newConfig = {
        ...config,
        starredDocumentIds: newStarredIds,
      };

      // Optimistic update
      setConfig(newConfig);

      try {
        await saveDashboardConfig(configId, newConfig);
      } catch (error) {
        console.error("[Dashboard Page] Failed to save star:", error);
        // Revert on error
        setConfig(config);
      }
    },
    [config, configId]
  );

  // Handle saving a section (create or update)
  const handleSaveSection = useCallback(
    async (section: DashboardSection) => {
      if (!config || !configId) return;

      const existingIndex = config.sections.findIndex((s) => s.id === section.id);
      let newSections: DashboardSection[];

      if (existingIndex >= 0) {
        // Update existing section
        newSections = [...config.sections];
        newSections[existingIndex] = section;
      } else {
        // Add new section at the end
        const maxSeq = Math.max(0, ...config.sections.map((s) => s.seq));
        newSections = [...config.sections, { ...section, seq: maxSeq + 1 }];
      }

      const newConfig = {
        ...config,
        sections: newSections,
      };

      // Optimistic update
      setConfig(newConfig);
      setEditingSectionId(null);

      try {
        await saveDashboardConfig(configId, newConfig);
      } catch (error) {
        console.error("[Dashboard Page] Failed to save section:", error);
        // Revert on error
        setConfig(config);
      }
    },
    [config, configId]
  );

  // Handle deleting a section
  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      if (!config || !configId) return;

      const newSections = config.sections.filter((s) => s.id !== sectionId);
      const newConfig = {
        ...config,
        sections: newSections,
      };

      // Optimistic update
      setConfig(newConfig);

      try {
        await saveDashboardConfig(configId, newConfig);
      } catch (error) {
        console.error("[Dashboard Page] Failed to delete section:", error);
        // Revert on error
        setConfig(config);
      }
    },
    [config, configId]
  );

  // Handle moving a section up
  const handleMoveUp = useCallback(
    async (sectionId: string) => {
      if (!config || !configId) return;

      const sorted = [...config.sections].sort((a, b) => a.seq - b.seq);
      const currentIndex = sorted.findIndex((s) => s.id === sectionId);

      if (currentIndex <= 0) return; // Already at top

      // Swap seq values with previous section
      const newSections = config.sections.map((s) => {
        if (s.id === sorted[currentIndex].id) {
          return { ...s, seq: sorted[currentIndex - 1].seq };
        }
        if (s.id === sorted[currentIndex - 1].id) {
          return { ...s, seq: sorted[currentIndex].seq };
        }
        return s;
      });

      const newConfig = {
        ...config,
        sections: newSections,
      };

      // Optimistic update
      setConfig(newConfig);

      try {
        await saveDashboardConfig(configId, newConfig);
      } catch (error) {
        console.error("[Dashboard Page] Failed to move section:", error);
        // Revert on error
        setConfig(config);
      }
    },
    [config, configId]
  );

  // Handle moving a section down
  const handleMoveDown = useCallback(
    async (sectionId: string) => {
      if (!config || !configId) return;

      const sorted = [...config.sections].sort((a, b) => a.seq - b.seq);
      const currentIndex = sorted.findIndex((s) => s.id === sectionId);

      if (currentIndex < 0 || currentIndex >= sorted.length - 1) return; // Already at bottom

      // Swap seq values with next section
      const newSections = config.sections.map((s) => {
        if (s.id === sorted[currentIndex].id) {
          return { ...s, seq: sorted[currentIndex + 1].seq };
        }
        if (s.id === sorted[currentIndex + 1].id) {
          return { ...s, seq: sorted[currentIndex].seq };
        }
        return s;
      });

      const newConfig = {
        ...config,
        sections: newSections,
      };

      // Optimistic update
      setConfig(newConfig);

      try {
        await saveDashboardConfig(configId, newConfig);
      } catch (error) {
        console.error("[Dashboard Page] Failed to move section:", error);
        // Revert on error
        setConfig(config);
      }
    },
    [config, configId]
  );

  // Collect available tags for the editor (memoized to prevent recalculation)
  const availableTags = useMemo(
    () => ({
      domain: collectUniqueTags(documents, "domainTags"),
      lifecycle: collectUniqueTags(documents, "lifecycleTags"),
      organizational: collectUniqueTags(documents, "organizationalTags"),
    }),
    [documents]
  );

  // Get the section being edited
  const editingSection = editingSectionId
    ? config?.sections.find((s) => s.id === editingSectionId)
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <Spinner size="xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p style={{ color: "var(--bad)" }}>Failed to load dashboard configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Curated library
            </p>
            <Title
              headingLevel="h1"
              size="3xl"
              style={{
                marginTop: "0.75rem",
                color: "var(--text)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
            >
              Library
            </Title>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Your curated practice and method collections
            </p>
          </div>
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setEditingSectionId("new")}
          >
            New Section
          </Button>
        </header>

        {/* Sections */}
        {config.sections.length === 0 ? (
          <div
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              backgroundColor: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
            }}
          >
            <p
              style={{
                color: "var(--muted)",
                fontSize: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              No sections yet. Create your first section to organize your library.
            </p>
            <Button variant="primary" onClick={() => setEditingSectionId("new")}>
              Create Section
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {config.sections
              .sort((a, b) => a.seq - b.seq)
              .map((section, index, sortedArray) => {
                // Filter and sort documents for this section
                const filtered = filterDocuments(
                  documents,
                  section.filters,
                  config.starredDocumentIds
                );
                const sorted = sortDocuments(
                  filtered,
                  section.sortBy,
                  config.starredDocumentIds,
                  scores
                );
                const limited = section.maxItems
                  ? sorted.slice(0, section.maxItems)
                  : sorted;

                return (
                  <DashboardSectionCarousel
                    key={section.id}
                    section={section}
                    documents={limited}
                    starredIds={config.starredDocumentIds}
                    scores={scores}
                    onToggleStar={handleToggleStar}
                    onEditSection={() => setEditingSectionId(section.id)}
                    onDeleteSection={() => handleDeleteSection(section.id)}
                    onMoveUp={() => handleMoveUp(section.id)}
                    onMoveDown={() => handleMoveDown(section.id)}
                    canMoveUp={index > 0}
                    canMoveDown={index < sortedArray.length - 1}
                  />
                );
              })}
          </div>
        )}
      </div>

      {/* Section editor modal */}
      {editingSectionId && (
        <DashboardSectionEditor
          section={editingSection}
          availableTags={availableTags}
          onSave={handleSaveSection}
          onCancel={() => setEditingSectionId(null)}
        />
      )}
    </div>
  );
}
