import { useState, useEffect } from "react";

export type NarrativeTypeInfo = {
  name: string;
  narrativeElements: Array<{ name: string; description?: string }>;
};

export function useBaselineNarrativeTypes(baselineId: string | null | undefined) {
  const [narrativeTypes, setNarrativeTypes] = useState<NarrativeTypeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baselineId) {
      setNarrativeTypes([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/baselines/${encodeURIComponent(baselineId)}/narrative-types`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to load narrative types" }));
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setNarrativeTypes(data.narrativeTypes || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baselineId]);

  return { narrativeTypes, loading, error };
}
