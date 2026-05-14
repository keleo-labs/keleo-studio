"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import KanbanPatternBoard from "@/components/KanbanPatternBoard";
import { useSearchParams } from "next/navigation";
import { asBaselineDocument, baselineWithPracticeActivities } from "@/lib/ir";

function FlowVisualizerInner() {
  const [practice, setPractice] = useState<any>(null);
  const [baseline, setBaseline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<string>("");
  const [selectedPattern, setSelectedPattern] = useState<number>(0);
  const [availablePractices, setAvailablePractices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");

  // Load available practices
  useEffect(() => {
    async function loadPractices() {
      try {
        const res = await fetch("/api/documents?details=1");
        if (!res.ok) throw new Error("Failed to load library");
        const data = await res.json();
        const practices = data.documents || [];
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

  // Load selected practice
  useEffect(() => {
    if (!selectedPractice) {
      setLoading(false);
      return;
    }

    async function loadPractice() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(selectedPractice)}`);
        if (!res.ok) throw new Error("Failed to load practice");
        const data = await res.json();
        const practiceBody = data.body;
        setPractice(practiceBody);

        // Extract baseline for pattern visualization
        const baselineDoc = asBaselineDocument(practiceBody);
        if (baselineDoc) {
          const enrichedBaseline = baselineWithPracticeActivities(practiceBody, baselineDoc);
          setBaseline(enrichedBaseline);
        } else {
          setBaseline(practiceBody);
        }

        // Reset pattern selection when practice changes
        setSelectedPattern(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load practice");
        setPractice(null);
        setBaseline(null);
      } finally {
        setLoading(false);
      }
    }

    loadPractice();
  }, [selectedPractice]);

  const patterns = practice?.patterns ?? [];
  const selectedPatternData = patterns[selectedPattern];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[1800px] px-6 py-8 md:px-10">
        {/* Header */}
        <header className="mb-8">
          <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Adoption framework
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Pattern Kanban Board
          </h1>
          <p className="mt-3 text-base text-[var(--muted)] max-w-2xl">
            Visualize pattern progression with <strong>Pattern Views</strong> as columns and{" "}
            <strong>Alpha States</strong>, <strong>Activities</strong>, and{" "}
            <strong>Work Products</strong> as cards
          </p>

          {/* Selectors */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {/* Practice Selector */}
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

            {/* Pattern Selector */}
            {patterns.length > 1 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="pattern-select"
                  className="text-sm font-medium text-[var(--text)]"
                >
                  Pattern:
                </label>
                <select
                  id="pattern-select"
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] min-w-[300px]"
                >
                  {patterns.map((pattern: any, idx: number) => (
                    <option key={idx} value={idx}>
                      {pattern.name || `Pattern ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

          {!loading && !error && practice && patterns.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <p className="text-lg font-medium mb-2">No Patterns Found</p>
              <p className="text-sm">
                This practice doesn't have any patterns defined. Patterns contain the pattern views
                that drive the Kanban board.
              </p>
            </div>
          )}

          {!loading && !error && selectedPatternData && baseline && (
            <KanbanPatternBoard pattern={selectedPatternData} baseline={baseline} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowVisualizerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <div className="text-[var(--muted)]">Loading...</div>
        </div>
      }
    >
      <FlowVisualizerInner />
    </Suspense>
  );
}
