/**
 * Hook for fetching pre-computed Sankey diagram data from the server
 */

import { useState, useEffect } from "react";
import type { SankeyFlowData } from "@/lib/diagrams/sankey/data";

interface SankeyDataResponse {
  nodes: SankeyFlowData["nodes"];
  links: SankeyFlowData["links"];
  statistics: {
    totalFlow: number;
    activityCount: number;
    workProductCount: number;
    alphaStateCount: number;
    linkCount: number;
  };
  metadata: {
    documentId: string;
    resolved: boolean;
    cached: boolean;
    cachedAt?: string;
  };
}

interface UseSankeyDataResult {
  data: SankeyFlowData | null;
  statistics: SankeyDataResponse["statistics"] | null;
  loading: boolean;
  error: string | null;
  metadata: SankeyDataResponse["metadata"] | null;
}

export function useSankeyData(
  documentId: string | null | undefined,
  resolveLibrary = true
): UseSankeyDataResult {
  const [data, setData] = useState<SankeyFlowData | null>(null);
  const [statistics, setStatistics] = useState<SankeyDataResponse["statistics"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SankeyDataResponse["metadata"] | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setStatistics(null);
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
        const response = await fetch("/api/diagrams/sankey", {
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

        const result: SankeyDataResponse = await response.json();

        if (!cancelled) {
          setData({
            nodes: result.nodes,
            links: result.links
          });
          setStatistics(result.statistics);
          setMetadata(result.metadata);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to fetch Sankey data";
          setError(message);
          console.error("Sankey data fetch error:", e);
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
  }, [documentId, resolveLibrary]);

  return { data, statistics, loading, error, metadata };
}
