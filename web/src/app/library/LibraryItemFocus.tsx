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
import { calculateAlphaScores, type AlphaScore } from "@/lib/analysis/methodFocus";
import { compositePracticeFromMethod } from "@/lib/methodMerge/compositePracticeFromMethod";
import { classifyLibraryRoot } from "@/lib/library/classify";
import type { Method } from "@/lib/types";

function slug(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SCORE_STYLES: CSSProperties[] = [
  { backgroundColor: "#F5F5F5", borderColor: "#D2D2D2", color: "#8C8C8C", opacity: 0.6 },
  { backgroundColor: "#EDF4FA", borderColor: "#73BCF7", color: "#004368" },
  { backgroundColor: "#D2E4F4", borderColor: "#73BCF7", color: "#004368" },
  { backgroundColor: "#BEE1F4", borderColor: "#2B9AF3", color: "#002952" },
  { backgroundColor: "#8BC8F7", borderColor: "#06C", color: "#002952" },
  { backgroundColor: "#519DE9", borderColor: "#06C", color: "#FFFFFF" },
];

function getColorStyle(score: number): CSSProperties {
  const clamped = Math.max(0, Math.min(score, SCORE_STYLES.length - 1));
  return SCORE_STYLES[clamped];
}

export function LibraryItemFocus({ documentId, apiUrl }: { documentId: string; apiUrl?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [flattenError, setFlattenError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);
        const url = apiUrl || `/api/documents/${encodeURIComponent(documentId)}`;
        const res = await fetch(url);
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
  }, [documentId, apiUrl]);

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

  const alphasByFocus = useMemo(() => {
    if (!effectiveDoc || !baseline || grouped.length === 0) return new Map();
    return calculateAlphaScores(effectiveDoc, baseline, grouped);
  }, [effectiveDoc, baseline, grouped]);

  if (loading || resolveBusy) {
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
