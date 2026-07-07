"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import TopologyDiagram from "@/components/visualizations/diagrams/TopologyDiagram";
import { useSearchParams } from "next/navigation";
import { asBaselineDocument, baselineWithPracticeActivities } from "@/lib/ir";
import { preloadPracticeFonts } from "@/lib/display/fontLoader";

function TopologyViewerInner() {
  const [practice, setPractice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<string>("");
  const [availablePractices, setAvailablePractices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [practiceNameToIdMap, setPracticeNameToIdMap] = useState<Map<string, string>>(new Map());
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");

  // Load available practices and build name-to-ID map
  useEffect(() => {
    async function loadPractices() {
      try {
        const res = await fetch("/api/documents?details=1");
        if (!res.ok) throw new Error("Failed to load library");
        const data = await res.json();
        const allDocs = data.documents || [];
        // Filter out dashboard-config documents - only show library items
        const practices = allDocs.filter((d: any) => d.kind !== "dashboard-config");

        // Build name-to-ID map for baseline resolution
        const nameMap = new Map<string, string>();
        practices.forEach((p: any) => {
          // Map both the document name and displayName to the ID
          if (p.name) nameMap.set(p.name, p.id);
          if (p.displayName) nameMap.set(p.displayName, p.id);
          if (p.title) nameMap.set(p.title, p.id);
        });
        setPracticeNameToIdMap(nameMap);

        setAvailablePractices(
          practices.map((p: any) => ({
            id: p.id,
            name: p.displayName || p.title || p.id,
          }))
        );

        // Auto-select from URL or first practice
        if (libraryId) {
          setSelectedPractice(libraryId);
        } else if (practices.length > 0) {
          setSelectedPractice(practices[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load practices");
      }
    }
    loadPractices();
  }, [libraryId]);

  // Load selected practice and merge with baseline if needed
  useEffect(() => {
    if (!selectedPractice) {
      setLoading(false);
      return;
    }

    async function loadPracticeWithBaseline(practiceId: string): Promise<any> {
      const res = await fetch(`/api/documents/${encodeURIComponent(practiceId)}`);
      if (!res.ok) throw new Error(`Failed to load ${practiceId}`);
      const data = await res.json();
      return data.body;
    }

    async function mergeWithBaseline(practice: any): Promise<any> {
      // If practice has baselinePracticeName, load and merge with that baseline
      if (practice.baselinePracticeName && typeof practice.baselinePracticeName === 'string') {
        try {
          const baselineName = practice.baselinePracticeName;
          console.log(`Loading baseline: ${baselineName}`);

          // Look up the actual document ID from the name
          const baselineId = practiceNameToIdMap.get(baselineName) || baselineName;
          console.log(`Resolved baseline ID: ${baselineId}`);

          const baseline = await loadPracticeWithBaseline(baselineId);
          console.log('Baseline loaded:', {
            name: baseline.name,
            alphas: baseline.alphas?.length || 0,
            competencies: baseline.competencies?.length || 0,
            workProducts: baseline.workProducts?.length || 0,
          });

          // Recursively merge baseline's baseline if it has one
          const fullBaseline = await mergeWithBaseline(baseline);

          // Collect names of referenced baseline elements
          const referencedNames = {
            alphas: new Set<string>(),
            competencies: new Set<string>(),
            workProducts: new Set<string>(),
            activitySpaces: new Set<string>(),
            focuses: new Set<string>(),
          };

          // Scan activities to find what they reference
          const allActivities = [
            ...(practice.activities || []),
            ...(practice.activitySpaces || []).flatMap((as: any) => as.activities || []),
          ];

          allActivities.forEach((activity: any) => {
            // Referenced alphas (via contributesTo)
            (activity.contributesTo || []).forEach((contrib: any) => {
              if (contrib.alphaName) referencedNames.alphas.add(contrib.alphaName);
            });

            // Referenced competencies (via requiredCompetencies and recommendedCompetencyLevels)
            (activity.requiredCompetencies || []).forEach((comp: string) => {
              referencedNames.competencies.add(comp);
            });
            (activity.recommendedCompetencyLevels || []).forEach((cl: any) => {
              if (cl.competencyName) referencedNames.competencies.add(cl.competencyName);
            });

            // Referenced work products (via worksOn)
            (activity.worksOn || []).forEach((wp: any) => {
              if (wp.workProductName) referencedNames.workProducts.add(wp.workProductName);
            });

            // Referenced focus
            if (activity.focusName) referencedNames.focuses.add(activity.focusName);
          });

          // Also check work product levels of detail for alpha references
          (practice.workProducts || []).forEach((wp: any) => {
            (wp.levelsOfDetail || []).forEach((lod: any) => {
              (lod.contributesTo || []).forEach((contrib: any) => {
                if (contrib.alphaName) referencedNames.alphas.add(contrib.alphaName);
              });
            });
          });

          // Selectively merge: only include baseline items that are referenced OR defined in practice
          const selectiveMerge = (baseItems: any[] = [], practiceItems: any[] = [], referencedSet: Set<string>) => {
            const map = new Map();

            // Add only referenced baseline items
            baseItems.forEach(item => {
              if (item.name && referencedSet.has(item.name)) {
                map.set(item.name, item);
              }
            });

            // Add/override with practice items (practice always wins)
            practiceItems.forEach(item => {
              if (item.name) map.set(item.name, item);
            });

            return Array.from(map.values());
          };

          const merged = {
            ...practice,
            alphas: selectiveMerge(fullBaseline.alphas, practice.alphas, referencedNames.alphas),
            competencies: selectiveMerge(fullBaseline.competencies, practice.competencies, referencedNames.competencies),
            workProducts: selectiveMerge(fullBaseline.workProducts, practice.workProducts, referencedNames.workProducts),
            activitySpaces: selectiveMerge(fullBaseline.activitySpaces, practice.activitySpaces, referencedNames.activitySpaces),
            focuses: selectiveMerge(fullBaseline.focuses, practice.focuses, referencedNames.focuses),
            // Activities are always from the practice
            activities: practice.activities || [],
          };

          console.log('Merged practice:', {
            name: merged.name,
            alphas: merged.alphas?.length || 0,
            competencies: merged.competencies?.length || 0,
            workProducts: merged.workProducts?.length || 0,
          });

          return merged;
        } catch (err) {
          console.warn(`Could not load baseline ${practice.baselinePracticeName}:`, err);
          return practice;
        }
      }
      return practice;
    }

    async function loadPractice() {
      setLoading(true);
      setError(null);
      try {
        const practice = await loadPracticeWithBaseline(selectedPractice);
        const merged = await mergeWithBaseline(practice);

        // Apply activity enrichment
        const baselineDoc = asBaselineDocument(merged);
        const finalPractice = baselineDoc
          ? baselineWithPracticeActivities(merged, baselineDoc)
          : merged;

        // Preload fonts before rendering
        preloadPracticeFonts(finalPractice);

        setPractice(finalPractice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load practice");
        setPractice(null);
      } finally {
        setLoading(false);
      }
    }

    loadPractice();
  }, [selectedPractice]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[1800px] px-6 py-8 md:px-10">
        {/* Header */}
        <header className="mb-8">
          <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Practice visualization
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Alpha Topology Diagram
          </h1>
          <p className="mt-3 text-base text-[var(--muted)] max-w-2xl">
            Interactive network view showing Alphas and their relationships through contributesTo and relatesTo connections. Drag nodes,
            zoom, and hover to explore the alpha structure.
          </p>

          {/* Practice Selector */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {availablePractices.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="practice-select"
                  className="text-sm font-medium text-[var(--text)]"
                >
                  Practice:
                </label>
                <select
                  id="practice-select"
                  value={selectedPractice}
                  onChange={(e) => setSelectedPractice(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] min-w-[300px]"
                >
                  {availablePractices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Back to library link */}
            <Link
              href="/library"
              className="text-sm text-[var(--accent)] hover:underline ml-auto"
            >
              ← Back to Library
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
          {loading && (
            <div className="flex items-center justify-center h-96 text-[var(--muted)]">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
                <p>Loading practice data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && !practice && (
            <div className="text-center py-12 text-[var(--muted)]">
              <p>No practice selected. Please choose a practice from the library.</p>
            </div>
          )}

          {!loading && !error && practice && <TopologyDiagram practice={practice} />}
        </div>
      </div>
    </div>
  );
}

export default function TopologyViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <div className="text-[var(--muted)]">Loading...</div>
        </div>
      }
    >
      <TopologyViewerInner />
    </Suspense>
  );
}
