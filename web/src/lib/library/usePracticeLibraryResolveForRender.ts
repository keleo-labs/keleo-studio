"use client";

import { useEffect, useState } from "react";
import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import { fetchResolvePracticeForRender } from "@/lib/library/resolvePracticeForRenderApi";

/**
 * Loads merged practice + browse dependency artifacts from the library via
 * {@link fetchResolvePracticeForRender}. Use `enabled` to scope when the request runs
 * (e.g. browse TOC-only vs extension practice merge).
 */
export function usePracticeLibraryResolveForRender(
  doc: unknown,
  enabled: boolean,
): {
  loading: boolean;
  /** Populated when the last request succeeded; otherwise `undefined`. */
  resolved: unknown | undefined;
  dependencyArtifacts: BrowseDependencyArtifact[];
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<unknown | undefined>(undefined);
  const [dependencyArtifacts, setDependencyArtifacts] = useState<BrowseDependencyArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setResolved(undefined);
      setDependencyArtifacts([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setResolved(undefined);
    setError(null);
    setDependencyArtifacts([]);
    setLoading(true);

    void (async () => {
      const result = await fetchResolvePracticeForRender(doc);
      if (cancelled) return;
      setDependencyArtifacts(result.dependencyArtifacts);
      setLoading(false);
      if (result.ok) {
        setResolved(result.resolved);
        setError(result.error ?? null);
      } else {
        setResolved(undefined);
        setError(result.error ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, enabled]);

  return { loading, resolved, dependencyArtifacts, error };
}
