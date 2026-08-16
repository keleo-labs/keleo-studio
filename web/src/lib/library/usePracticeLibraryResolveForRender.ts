"use client";

import { useEffect, useState } from "react";
import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import type { VersionWarning } from "@/lib/library/dependencyVersionCheck";
import type { DependencyDiagramLayout } from "@/lib/diagrams/dependencyTree";
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
  resolved: unknown | undefined;
  dependencyArtifacts: BrowseDependencyArtifact[];
  versionWarnings: VersionWarning[];
  schemaWarning?: string;
  dependencyDiagramLayout?: DependencyDiagramLayout;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<unknown | undefined>(undefined);
  const [dependencyArtifacts, setDependencyArtifacts] = useState<BrowseDependencyArtifact[]>([]);
  const [versionWarnings, setVersionWarnings] = useState<VersionWarning[]>([]);
  const [schemaWarning, setSchemaWarning] = useState<string | undefined>(undefined);
  const [dependencyDiagramLayout, setDependencyDiagramLayout] = useState<DependencyDiagramLayout | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setResolved(undefined);
      setDependencyArtifacts([]);
      setVersionWarnings([]);
      setSchemaWarning(undefined);
      setDependencyDiagramLayout(undefined);
      setError(null);
      return;
    }

    let cancelled = false;
    setResolved(undefined);
    setError(null);
    setDependencyArtifacts([]);
    setVersionWarnings([]);
    setSchemaWarning(undefined);
    setDependencyDiagramLayout(undefined);
    setLoading(true);

    void (async () => {
      const result = await fetchResolvePracticeForRender(doc);
      if (cancelled) return;
      setDependencyArtifacts(result.dependencyArtifacts);
      setVersionWarnings(result.versionWarnings);
      setSchemaWarning(result.schemaWarning);
      setDependencyDiagramLayout(result.dependencyDiagramLayout);
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

  return { loading, resolved, dependencyArtifacts, versionWarnings, schemaWarning, dependencyDiagramLayout, error };
}
