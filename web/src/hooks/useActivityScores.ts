/**
 * Hook for fetching pre-calculated activity space scores from the server
 */

import { useState, useEffect } from "react";
import type { ActivitySpaceFocusGroup } from "@/lib/analysis/methodFocus";

interface ActivityScoresResponse {
  scoresByFocus: Record<string, ActivitySpaceFocusGroup>;
  metadata: {
    documentId: string;
    resolved: boolean;
    cached: boolean;
    cachedAt?: string;
  };
}

interface UseActivityScoresResult {
  scoresByFocus: Map<string, ActivitySpaceFocusGroup> | null;
  loading: boolean;
  error: string | null;
  metadata: ActivityScoresResponse["metadata"] | null;
}

export function useActivityScores(
  documentId: string | null | undefined,
  resolveLibrary = true
): UseActivityScoresResult {
  const [scoresByFocus, setScoresByFocus] = useState<Map<string, ActivitySpaceFocusGroup> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ActivityScoresResponse["metadata"] | null>(null);

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
        const response = await fetch("/api/analysis/activity-scores", {
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

        const data: ActivityScoresResponse = await response.json();

        if (!cancelled) {
          // Convert plain object back to Map
          const scoresMap = new Map<string, ActivitySpaceFocusGroup>();
          Object.entries(data.scoresByFocus).forEach(([key, value]) => {
            scoresMap.set(key, value);
          });

          setScoresByFocus(scoresMap);
          setMetadata(data.metadata);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to fetch activity scores";
          setError(message);
          console.error("Activity scores fetch error:", e);
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
