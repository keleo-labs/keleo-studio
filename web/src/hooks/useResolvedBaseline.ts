import { useMemo, useState } from "react";
import { findBaselineInLibrary, buildLibraryLookupIndex, findPracticeInLibrary } from "@/lib/library/practiceDependencyResolution";
import type { PracticeBaseline } from "@/lib/types";

export type BaselineResolutionResult = {
  baseline: PracticeBaseline | null;
  dependencies: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
};

/**
 * Resolves and loads the baseline practice for an extension practice.
 * Also resolves practice dependencies if present.
 */
export function useResolvedBaseline(
  extensionDoc: Record<string, unknown>,
  libraryBodies: unknown[]
): BaselineResolutionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    const baselineName = typeof extensionDoc.baselinePracticeName === "string"
      ? extensionDoc.baselinePracticeName
      : null;

    try {
      setLoading(true);
      const index = buildLibraryLookupIndex(libraryBodies);

      // Load baseline if specified
      let baseline: PracticeBaseline | null = null;
      if (baselineName) {
        baseline = findBaselineInLibrary(index, baselineName);
        if (!baseline) {
          setError(`Baseline "${baselineName}" not found in library`);
          setLoading(false);
          return { baseline: null, dependencies: [], loading: false, error: `Baseline "${baselineName}" not found` };
        }
      }

      // Load dependencies if present (independent of baseline)
      const depNames = Array.isArray(extensionDoc.practiceDependencyNames)
        ? (extensionDoc.practiceDependencyNames as string[])
        : [];
      const dependencies = depNames
        .map(name => {
          const trimmed = name.trim();
          return trimmed ? findPracticeInLibrary(index, trimmed) : null;
        })
        .filter(Boolean) as Record<string, unknown>[];

      setLoading(false);
      setError(null);
      return { baseline, dependencies, loading: false, error: null };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setLoading(false);
      return { baseline: null, dependencies: [], loading: false, error: errMsg };
    }
  }, [extensionDoc, libraryBodies]);

  return result;
}
