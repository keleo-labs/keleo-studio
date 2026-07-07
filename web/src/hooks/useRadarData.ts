/**
 * Hook for fetching pre-computed radar chart data from the server
 */

import { useState, useEffect } from "react";
import type { RadarDataset } from "@/lib/diagrams/radarChart/data";

interface RadarDataResponse {
  spines: RadarDataset["spines"];
  maxScore: number;
  focusSegments: RadarDataset["focusSegments"];
  metadata: {
    documentId: string;
    resolved: boolean;
    cached: boolean;
    cachedAt?: string;
  };
}

interface UseRadarDataResult {
  data: RadarDataset | null;
  loading: boolean;
  error: string | null;
  metadata: RadarDataResponse["metadata"] | null;
}

export function useRadarData(
  documentId: string | null | undefined,
  options?: {
    resolveLibrary?: boolean;
    fixedMaxScore?: number;
    focusOrder?: string[];
  }
): UseRadarDataResult {
  const { resolveLibrary = true, fixedMaxScore, focusOrder } = options || {};

  const [data, setData] = useState<RadarDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<RadarDataResponse["metadata"] | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      setError(null);
      setMetadata(null);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/diagrams/radar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId,
            resolveLibrary,
            fixedMaxScore,
            focusOrder
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: RadarDataResponse = await response.json();

        if (!cancelled) {
          setData({
            spines: result.spines,
            maxScore: result.maxScore,
            focusSegments: result.focusSegments
          });
          setMetadata(result.metadata);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to fetch radar chart data";
          setError(message);
          console.error("Radar chart data fetch error:", e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [documentId, resolveLibrary, fixedMaxScore, focusOrder]);

  return { data, loading, error, metadata };
}
