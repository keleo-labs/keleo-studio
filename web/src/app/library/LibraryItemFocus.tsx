"use client";

import { useMemo, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  groupByFocus,
  practiceElementDescriptionForDisplay,
} from "@/lib/ir";
import { documentNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import type { AlphaScore } from "@/lib/analysis/methodFocus";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";
import { classifyLibraryRoot } from "@/lib/library/classify";
import type { Method } from "@/lib/types";
import { useAlphaScores } from "@/hooks/useAlphaScores";

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getColorStyle(score: number): CSSProperties {
  // Score is now 0-3 (no focus, low, mid, high)
  if (score === 0) {
    // No focus - very light gray
    return {
      backgroundColor: "#F5F5F5",
      borderColor: "#D2D2D2",
      color: "#8C8C8C",
      opacity: 0.6,
    };
  } else if (score === 1) {
    // Low focus - light blue
    return {
      backgroundColor: "#E7F1FA",
      borderColor: "#73BCF7",
      color: "#004368",
    };
  } else if (score === 2) {
    // Mid focus - medium blue
    return {
      backgroundColor: "#BEE1F4",
      borderColor: "#2B9AF3",
      color: "#002952",
    };
  } else {
    // High focus (3) - dark blue
    return {
      backgroundColor: "#73BCF7",
      borderColor: "#06C",
      color: "#FFFFFF",
    };
  }
}

export function LibraryItemFocus({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [flattenError, setFlattenError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`);
        if (!res.ok) {
          throw new Error(`Failed to load document (${res.status})`);
        }
        const data = await res.json();
        setDoc(data.body);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void loadDocument();
  }, [documentId]);

  // Resolve library dependencies FIRST (same as LibraryBrowseClient)
  const shouldResolveLibrary = useMemo(() => {
    return documentNeedsLibraryResolution(doc);
  }, [doc]);
  const { loading: resolveBusy, resolved: libraryResolved } = usePracticeLibraryResolveForRender(doc, shouldResolveLibrary);

  // Then flatten method into a merged practice AFTER library resolution (same as LibraryBrowseClient)
  const { effectiveDoc, flattenError: flattenErr } = useMemo(() => {
    if (!doc || typeof doc !== "object") return { effectiveDoc: doc, flattenError: null };

    const kind = classifyLibraryRoot(doc);

    // For methods, use library-resolved version if available
    if (kind === "method") {
      if (shouldResolveLibrary) {
        if (resolveBusy) return { effectiveDoc: null, flattenError: null };
        // Use the library-resolved version which is already fully merged
        const merged = libraryResolved ?? doc;
        return { effectiveDoc: merged != null && typeof merged === "object" ? merged : doc, flattenError: null };
      }
      // No library resolution needed - call compositePracticeFromMethod directly
      try {
        return { effectiveDoc: compositePracticeFromMethod(doc as Method), flattenError: null };
      } catch (e) {
        // Method is malformed or incomplete (e.g., missing baseline)
        const msg = e instanceof Error ? e.message : "Failed to process method";
        console.warn(`Failed to flatten method "${(doc as any).name}":`, msg);
        return { effectiveDoc: null, flattenError: msg };
      }
    }

    // For practices (baselines), use library-resolved version if needed
    if (shouldResolveLibrary) {
      if (resolveBusy) return { effectiveDoc: null, flattenError: null };
      const merged = libraryResolved ?? doc;
      return { effectiveDoc: merged != null && typeof merged === "object" ? merged : doc, flattenError: null };
    }

    return { effectiveDoc: doc, flattenError: null };
  }, [doc, shouldResolveLibrary, libraryResolved, resolveBusy]);

  // Set flatten error state when it changes
  useEffect(() => {
    setFlattenError(flattenErr);
  }, [flattenErr]);

  const { baseline, grouped } = useMemo(() => {
    if (!effectiveDoc) return { baseline: null, grouped: [] };
    const bl = asBaselineDocument(effectiveDoc);
    if (!bl) return { baseline: null, grouped: [] };
    const withActivities = baselineWithPracticeActivities(effectiveDoc, bl);
    const enriched = enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
    const grp = groupByFocus(enriched);
    return { baseline: enriched, grouped: grp };
  }, [effectiveDoc]);

  // Use server-side alpha scores (pre-computed and cached)
  const { scoresByFocus: alphasByFocus, loading: scoresLoading } = useAlphaScores(documentId, true);

  if (loading || resolveBusy || scoresLoading) {
    return (
      <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
        Loading coverage...
      </div>
    );
  }

  if (error || flattenError) {
    return (
      <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--pf-v6-global--danger-color--100)" }}>
        {error || flattenError}
      </div>
    );
  }

  if (!alphasByFocus || alphasByFocus.size === 0) {
    return (
      <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
        No baseline alphas found.
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      {Array.from(alphasByFocus.entries()).map(([focusName, { focusObj, alphas }], idx) => {
        const focusDescription = focusObj ? (practiceElementDescriptionForDisplay(focusObj) ?? "") : "";
        return (
          <div key={idx} style={{ marginBottom: idx < alphasByFocus.size - 1 ? "1.5rem" : "0" }}>
            <div style={{
              color: "var(--pf-v6-global--Color--100)",
              marginBottom: "0.5rem",
              lineHeight: "1.4"
            }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{focusName}</span>
              {focusDescription && (
                <span style={{ fontSize: "0.6875rem", fontWeight: 400, fontStyle: "italic", color: "var(--pf-v6-global--Color--200)" }}>
                  {" "}{focusDescription}
                </span>
              )}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "0.75rem"
            }}>
              {alphas.map(({ alpha, score }: AlphaScore, alphaIdx: number) => {
                const alphaName = String(alpha.name ?? "");
                const description = practiceElementDescriptionForDisplay(alpha) ?? "";
                const colorStyle = getColorStyle(score);

                return (
                  <div
                    key={alphaIdx}
                    title={`${alphaName}\n${description || 'No description'}\nCoverage score: ${score}`}
                    style={{
                      ...colorStyle,
                      border: "2px solid",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      padding: "0.625rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      minHeight: "70px",
                      cursor: "default",
                      position: "relative",
                    }}
                  >
                    <div style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      lineHeight: 1.3,
                      letterSpacing: "0.2px",
                    }}>
                      {alphaName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
