"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Spinner, Title } from "@patternfly/react-core";
import { usePracticeLibraryResolveForRender } from "@/lib/library/usePracticeLibraryResolveForRender";
import { documentNeedsLibraryResolution } from "@/lib/library/practiceDependencyResolution";
import { asBaselineDocument, groupByFocus } from "@/lib/ir";
import { checkSchemaCompatibility } from "@/lib/core/schemaVersion";
import type { PracticeBaseline } from "@/lib/types";
import { NavigatorLayout } from "@/components/navigator/NavigatorLayout";
import { PracticeElementAliasesProvider } from "@/components/common/AliasedName";
import { useAlphaScores } from "@/hooks/useAlphaScores";
import { useActivityScores } from "@/hooks/useActivityScores";

type NavigatorMode = "concerns" | "activities";

export function PracticeNavigatorClient() {
  const params = useSearchParams();
  const router = useRouter();

  const libraryId = params.get("libraryId");
  const mode = (params.get("mode") || "concerns") as NavigatorMode;
  const selectedFocus = params.get("focus");
  const selectedElement = params.get("selected") || "__introduction__";
  const secondaryElement = params.get("secondary");

  // Load the document first
  const [doc, setDoc] = useState<unknown>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    if (!libraryId) {
      setDocLoading(false);
      return;
    }

    let cancelled = false;
    setDocLoading(true);
    setDocError(null);

    fetch(`/api/documents/${encodeURIComponent(libraryId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(`Failed to load document: ${res.status}`);
        }
        const data = await res.json();
        setDoc(data.body);
        setDocLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setDocError(err instanceof Error ? err.message : String(err));
        setDocLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  // Determine if we need to resolve library dependencies
  const shouldResolve = useMemo(() => {
    return documentNeedsLibraryResolution(doc);
  }, [doc]);

  // Resolve library dependencies if needed
  const {
    loading: resolveLoading,
    resolved,
    dependencyArtifacts,
    versionWarnings: resolveVersionWarnings,
    schemaWarning: resolveSchemaWarning,
    error: resolveError,
  } = usePracticeLibraryResolveForRender(doc, shouldResolve);

  // Get the source document (for method composition info)
  const sourceDoc = useMemo(() => {
    return shouldResolve ? resolved : doc;
  }, [shouldResolve, resolved, doc]);

  // Extract baseline from the loaded/resolved document
  const baseline = useMemo(() => {
    if (!sourceDoc) return null;
    return asBaselineDocument(sourceDoc);
  }, [sourceDoc]);

  // Group elements by focus for navigation
  const groupedByFocus = useMemo(() => {
    if (!baseline) return [];
    return groupByFocus(baseline);
  }, [baseline]);

  // Use server-side pre-computed scores (cached)
  const { scoresByFocus: alphaScores, loading: alphaScoresLoading } = useAlphaScores(
    libraryId || undefined,
    true
  );
  const { scoresByFocus: activitySpaceScores, loading: activityScoresLoading } = useActivityScores(
    libraryId || undefined,
    true
  );

  const loading = docLoading || (shouldResolve && resolveLoading) || alphaScoresLoading || activityScoresLoading;
  const error = docError || resolveError;

  const versionWarnings = shouldResolve ? resolveVersionWarnings : [];
  const schemaWarning = useMemo(() => {
    if (shouldResolve) return resolveSchemaWarning;
    if (!doc || typeof doc !== "object") return undefined;
    const sv = (doc as Record<string, unknown>).schemaVersion;
    if (typeof sv !== "string") return undefined;
    return checkSchemaCompatibility(sv).warning;
  }, [shouldResolve, resolveSchemaWarning, doc]);

  // Extract aliases from the source document (resolved practice)
  const aliases = useMemo(() => {
    if (!sourceDoc || typeof sourceDoc !== "object") return undefined;
    const aliases = (sourceDoc as any).practiceElementAliases;
    return Array.isArray(aliases) ? aliases : undefined;
  }, [sourceDoc]);

  // Handler for updating URL params
  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(params);
    if (value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    router.push(`?${newParams.toString()}`);
  };

  const setMode = (newMode: NavigatorMode) => updateParam("mode", newMode);
  const setSelectedFocus = (focus: string | null) => updateParam("focus", focus);
  const setSelectedElement = (element: string | null) => updateParam("selected", element);
  const setSecondaryElement = (element: string | null) => updateParam("secondary", element);

  // Combined navigation handler to update both selected and secondary in one URL update
  const navigateToElement = (elementName: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set("selected", elementName);
    newParams.delete("secondary"); // Close secondary panel
    router.push(`?${newParams.toString()}`);
  };

  // Error states
  if (!libraryId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Title headingLevel="h1" size="2xl">
          Practice Navigator
        </Title>
        <p style={{ marginTop: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
          No document selected. Please select a practice or method from the library.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
        }}
      >
        <Spinner size="xl" aria-label="Loading practice" />
        <p style={{ color: "var(--pf-v6-global--Color--200)" }}>
          Loading practice...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Title headingLevel="h1" size="2xl" style={{ color: "var(--pf-v6-global--danger-color--100)" }}>
          Error Loading Practice
        </Title>
        <p style={{ marginTop: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!baseline) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Title headingLevel="h1" size="2xl">
          Practice Navigator
        </Title>
        <p style={{ marginTop: "1rem", color: "var(--pf-v6-global--Color--200)" }}>
          No practice data available.
        </p>
      </div>
    );
  }

  return (
    <PracticeElementAliasesProvider aliases={aliases}>
      <NavigatorLayout
        baseline={baseline}
        sourceDocument={sourceDoc}
        originalDocument={doc}
        groupedByFocus={groupedByFocus}
        mode={mode}
        selectedFocus={selectedFocus}
        selectedElement={selectedElement}
        secondaryElement={secondaryElement}
        libraryId={libraryId}
        dependencyArtifacts={dependencyArtifacts}
        versionWarnings={versionWarnings}
        schemaWarning={schemaWarning}
        alphaScores={alphaScores || new Map()}
        activitySpaceScores={activitySpaceScores || new Map()}
        onSetMode={setMode}
        onSetSelectedFocus={setSelectedFocus}
        onSetSelectedElement={setSelectedElement}
        onSetSecondaryElement={setSecondaryElement}
        onNavigateToElement={navigateToElement}
      />
    </PracticeElementAliasesProvider>
  );
}
