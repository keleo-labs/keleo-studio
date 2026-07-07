/**
 * Hook for fetching pre-calculated alpha scores from the server
 */

import { useState, useEffect } from "react";
import type { FocusGroup } from "@/lib/analysis/methodFocus";

interface AlphaScoresResponse {
  scoresByFocus: Record<string, FocusGroup>;
  metadata: {
    documentId: string;
    resolved: boolean;
    cached: boolean;
    cachedAt?: string;
  };
}

interface UseAlphaScoresResult {
  scoresByFocus: Map<string, FocusGroup> | null;
  loading: boolean;
  error: string | null;
  metadata: AlphaScoresResponse["metadata"] | null;
}

export function useAlphaScores(
  documentId: string | null | undefined,
  resolveLibrary = true
): UseAlphaScoresResult {
  const [scoresByFocus, setScoresByFocus] = useState<Map<string, FocusGroup> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AlphaScoresResponse["metadata"] | null>(null);

  useEffect(() => {
    if (!documentId) {
      setScoresByFocus(null);
      setLoading(false);
      setError(null);
      setMetadata(null);
      return;
    }

    let cancelled = false;

    async function fetchScores() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/analysis/alpha-scores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId, resolveLibrary }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: AlphaScoresResponse = await response.json();

        if (!cancelled) {
          // Convert plain object back to Map
          const scoresMap = new Map<string, FocusGroup>();
          Object.entries(data.scoresByFocus).forEach(([key, value]) => {
            scoresMap.set(key, value);
          });

          setScoresByFocus(scoresMap);
          setMetadata(data.metadata);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to fetch alpha scores";
          setError(message);
          console.error("Alpha scores fetch error:", e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchScores();

    return () => {
      cancelled = true;
    };
  }, [documentId, resolveLibrary]);

  return { scoresByFocus, loading, error, metadata };
}
