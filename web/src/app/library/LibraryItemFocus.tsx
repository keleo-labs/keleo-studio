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
import { practiceNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { calculateAlphaScores } from "@/lib/methodFocus";
import type { AlphaScore } from "@/lib/methodFocus";
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

function getColorStyle(score: number): CSSProperties {
  if (score === 0) {
    return {
      backgroundColor: "#F5F5F5",
      borderColor: "#D2D2D2",
      color: "#8C8C8C",
      opacity: 0.6,
    };
  } else if (score <= 2) {
    return {
      backgroundColor: "#E7F1FA",
      borderColor: "#73BCF7",
      color: "#004368",
    };
  } else if (score <= 5) {
    return {
      backgroundColor: "#BEE1F4",
      borderColor: "#2B9AF3",
      color: "#002952",
    };
  } else {
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
  const shouldResolveLibrary = useMemo(() => practiceNeedsLibraryResolution(doc), [doc]);
  const { loading: resolveBusy, resolved: libraryResolved } = usePracticeLibraryResolveForRender(doc, shouldResolveLibrary);

  // Then flatten method into a merged practice AFTER library resolution (same as LibraryBrowseClient)
  const { effectiveDoc, flattenError: flattenErr } = useMemo(() => {
    const resolvedDoc = shouldResolveLibrary ? (libraryResolved ?? doc) : doc;
    if (!resolvedDoc || typeof resolvedDoc !== "object") return { effectiveDoc: resolvedDoc, flattenError: null };

    const kind = classifyLibraryRoot(resolvedDoc);
    if (kind === "method") {
      try {
        return { effectiveDoc: compositePracticeFromMethod(resolvedDoc as Method), flattenError: null };
      } catch (e) {
        // Method is malformed or incomplete (e.g., missing baseline)
        const msg = e instanceof Error ? e.message : "Failed to process method";
        console.warn(`Failed to flatten method "${(resolvedDoc as any).name}":`, msg);
        return { effectiveDoc: null, flattenError: msg };
      }
    }
    return { effectiveDoc: resolvedDoc, flattenError: null };
  }, [doc, shouldResolveLibrary, libraryResolved]);

  // Set flatten error state when it changes
  useEffect(() => {
    setFlattenError(flattenErr);
  }, [flattenErr]);

  const { baseline, grouped, sourceDocRecord } = useMemo(() => {
    if (!effectiveDoc) return { baseline: null, grouped: [], sourceDocRecord: {} };
    const bl = asBaselineDocument(effectiveDoc);
    if (!bl) return { baseline: null, grouped: [], sourceDocRecord: {} };
    const withActivities = baselineWithPracticeActivities(effectiveDoc, bl);
    const enriched = enrichBaselineWithReferencedWrappers(effectiveDoc, withActivities);
    const grp = groupByFocus(enriched);
    const sourceDoc = effectiveDoc && typeof effectiveDoc === "object" ? (effectiveDoc as Record<string, unknown>) : {};
    return { baseline: enriched, grouped: grp, sourceDocRecord: sourceDoc };
  }, [effectiveDoc]);

  const alphasByFocus = useMemo(() => {
    return calculateAlphaScores(sourceDocRecord, baseline, grouped);
  }, [baseline, grouped, sourceDocRecord]);

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

  if (alphasByFocus.size === 0) {
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
