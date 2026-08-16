"use client";

import { useMemo, useState, useEffect } from "react";
import { Alert } from "@patternfly/react-core";
import type { PracticeBaseline } from "@/lib/types";
import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import type { VersionWarning } from "@/lib/library/dependencyVersionCheck";
import type { DependencyDiagramLayout } from "@/lib/diagrams/dependencyTree";
import type {
  FocusGroup as AlphaScoreFocusGroup,
  ActivitySpaceFocusGroup
} from "@/lib/analysis/methodFocus";
import { NavigatorSidebar } from "./NavigatorSidebar";
import { ElementDetailsPanel } from "./ElementDetailsPanel";
import { SecondaryDetailsPanel } from "./SecondaryDetailsPanel";

type NavigatorMode = "concerns" | "activities";

interface FocusGroup {
  focusName: string;
  focus: {
    name: string;
    description: string;
  } | null;
  alphas: PracticeBaseline["alphas"];
  activitySpaces: PracticeBaseline["activitySpaces"];
}

interface NavigatorLayoutProps {
  baseline: PracticeBaseline;
  sourceDocument: any;
  originalDocument: any;
  groupedByFocus: FocusGroup[];
  mode: NavigatorMode;
  selectedFocus: string | null;
  selectedElement: string | null;
  secondaryElement: string | null;
  libraryId: string | null;
  dependencyArtifacts: BrowseDependencyArtifact[];
  dependencyDiagramLayout?: DependencyDiagramLayout;
  versionWarnings?: VersionWarning[];
  schemaWarning?: string;
  alphaScores: Map<string, AlphaScoreFocusGroup>;
  activitySpaceScores?: Map<string, ActivitySpaceFocusGroup>;
  onSetMode: (mode: NavigatorMode) => void;
  onSetSelectedFocus: (focus: string | null) => void;
  onSetSelectedElement: (element: string | null) => void;
  onSetSecondaryElement: (element: string | null) => void;
  onNavigateToElement?: (element: string) => void;
}

export function NavigatorLayout({
  baseline,
  sourceDocument,
  originalDocument,
  groupedByFocus,
  mode,
  selectedFocus,
  selectedElement,
  secondaryElement,
  libraryId,
  dependencyArtifacts,
  dependencyDiagramLayout,
  versionWarnings,
  schemaWarning,
  alphaScores,
  activitySpaceScores,
  onSetMode,
  onSetSelectedFocus,
  onSetSelectedElement,
  onSetSecondaryElement,
  onNavigateToElement,
}: NavigatorLayoutProps) {
  // State for fetched practice documents
  const [practiceDocuments, setPracticeDocuments] = useState<Map<string, any>>(new Map());

  // Load practice document when selected from introduction
  useEffect(() => {
    if (!secondaryElement || selectedElement !== "__introduction__") return;

    // Check if we already have this practice
    if (practiceDocuments.has(secondaryElement)) return;

    // Check if it's a practice from the practices array (extension practices)
    const practiceEntry = originalDocument?.practices?.find((p: any) => {
      const name = typeof p === "string" ? p : p.name;
      return name === secondaryElement;
    });

    if (practiceEntry && typeof practiceEntry === "object") {
      // Practice is embedded inline - use it directly (no id available for embedded)
      setPracticeDocuments(prev => new Map(prev).set(secondaryElement, {
        id: null,
        body: practiceEntry
      }));
      return;
    }

    // Check if it's an embedded baseline practice
    if (originalDocument?.baselinePractice && originalDocument.baselinePractice.name === secondaryElement) {
      setPracticeDocuments(prev => new Map(prev).set(secondaryElement, {
        id: null,
        body: originalDocument.baselinePractice
      }));
      return;
    }

    // If on the introduction page, attempt library fetch for any unresolved name
    // (covers direct practices, dependencies, baselines, and transitive deps)
    if (selectedElement === "__introduction__") {
      // Fetch from flat store and bundle library
      const fetchPractice = async () => {
        try {
          const listResponse = await fetch('/api/documents?withBody=1');
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const practiceItem = listData.documents?.find((doc: any) => doc.body?.name === secondaryElement);
            if (practiceItem?.body) {
              setPracticeDocuments(prev => new Map(prev).set(secondaryElement, {
                id: practiceItem.id,
                body: practiceItem.body
              }));
              return;
            }
          }

          // Fall back to bundle library
          const indexRes = await fetch('/api/library/index');
          if (!indexRes.ok) return;
          const indexData = await indexRes.json();
          const entry = (indexData.entries || []).find((e: any) => e.name === secondaryElement);
          if (!entry) return;

          const docRes = await fetch(`/api/library/document?bundle=${encodeURIComponent(entry.activeBundleSlug)}&path=${encodeURIComponent(entry.activeDocumentPath)}`);
          if (!docRes.ok) return;
          const docData = await docRes.json();
          if (docData.body) {
            setPracticeDocuments(prev => new Map(prev).set(secondaryElement, {
              id: `bundle:${entry.activeBundleSlug}/${entry.activeDocumentPath}`,
              body: docData.body
            }));
          }
        } catch (error) {
          console.error('Failed to fetch practice:', secondaryElement, error);
        }
      };

      fetchPractice();
    }
  }, [secondaryElement, selectedElement, practiceDocuments, originalDocument]);

  // Find the currently selected element
  const selectedElementData = useMemo(() => {
    if (!selectedElement) return null;

    // Check if it's the introduction view - pass originalDocument to access practices array
    if (selectedElement === "__introduction__") {
      // Use originalDocument as the source, which has all fields including narratives
      return {
        type: "introduction" as const,
        data: {
          ...originalDocument,
          // Ensure we have baseline fields too in case originalDocument is missing them
          name: originalDocument?.name || baseline.name,
          description: originalDocument?.description || baseline.description,
          narratives: originalDocument?.narratives || baseline.narratives,
          citations: originalDocument?.citations || baseline.citations,
        }
      };
    }

    // Check if it's the references view
    if (selectedElement === "__references__") {
      return { type: "references" as const, data: baseline };
    }

    // Check if it's the overview
    if (selectedElement === "__overview__") {
      return { type: "overview" as const, data: baseline };
    }

    // Check if it's a pattern
    if (baseline.patterns) {
      const pattern = baseline.patterns.find((p) => p.name === selectedElement);
      if (pattern) {
        return { type: "pattern" as const, data: pattern };
      }
    }

    // Check if it's a work product or LOD (format: "workProductName" or "workProductName::lodName")
    if (baseline.workProducts) {
      for (const wp of baseline.workProducts) {
        // Check if it's a specific LOD reference (workProductName::lodName)
        if (selectedElement.includes("::") && selectedElement.startsWith(wp.name + "::")) {
          const lodName = selectedElement.split("::")[1];
          return {
            type: "workProduct" as const,
            data: wp,
            specificLevelOfDetail: lodName
          };
        }
        // Or just the work product name
        if (wp.name === selectedElement) {
          return { type: "workProduct" as const, data: wp };
        }
      }
    }

    // Check if it's a persona group
    if (baseline.personaGroups) {
      const personaGroup = baseline.personaGroups.find((pg) => pg.name === selectedElement);
      if (personaGroup) {
        return { type: "personaGroup" as const, data: personaGroup };
      }
    }

    // Check if it's a persona
    if (baseline.personas) {
      const persona = baseline.personas.find((p) => p.name === selectedElement);
      if (persona) {
        return { type: "persona" as const, data: persona };
      }
    }

    // Check if it's a competency
    if (baseline.competencies) {
      const competency = baseline.competencies.find((c) => c.name === selectedElement);
      if (competency) {
        return { type: "competency" as const, data: competency };
      }
    }

    // Search alphas
    for (const group of groupedByFocus) {
      for (const alpha of group.alphas) {
        if (alpha.name === selectedElement) {
          return { type: "alpha" as const, data: alpha };
        }
      }
    }

    // Search activity spaces and activities
    for (const group of groupedByFocus) {
      for (const space of group.activitySpaces) {
        if (space.name === selectedElement) {
          return { type: "activitySpace" as const, data: space };
        }
        if (space.activities) {
          for (const activity of space.activities) {
            if (activity.name === selectedElement) {
              return { type: "activity" as const, data: activity };
            }
          }
        }
      }
    }

    return null;
  }, [selectedElement, groupedByFocus, baseline.workProducts, baseline.patterns]);

  // Auto-switch mode when selected element type doesn't match current mode
  useEffect(() => {
    if (!selectedElementData) return;
    const { type } = selectedElementData;
    if (type === "alpha" && mode !== "concerns") {
      onSetMode("concerns");
    } else if ((type === "activity" || type === "activitySpace") && mode !== "activities") {
      onSetMode("activities");
    }
  }, [selectedElementData, mode, onSetMode]);

  // Find the secondary element (for detail drilldown)
  const secondaryElementData = useMemo(() => {
    if (!secondaryElement) return null;

    // If primary is overview, secondary could be any alpha, activity space, or activity
    if (selectedElementData?.type === "overview") {
      // Check for alpha
      const alpha = groupedByFocus.flatMap((g) => g.alphas).find((a) => a.name === secondaryElement);
      if (alpha) {
        return { type: "alpha" as const, data: alpha };
      }

      // Check for activity space
      const activitySpace = groupedByFocus.flatMap((g) => g.activitySpaces).find((s) => s.name === secondaryElement);
      if (activitySpace) {
        return { type: "activitySpace" as const, data: activitySpace };
      }

      // Check for activity
      for (const group of groupedByFocus) {
        for (const space of group.activitySpaces) {
          const activity = space.activities?.find((a) => a.name === secondaryElement);
          if (activity) {
            return { type: "activity" as const, data: activity };
          }
        }
      }
    }

    if (!selectedElementData) return null;

    // Check if secondary element is in format "alphaName::stateName" (from activity's contributesTo)
    if (secondaryElement.includes("::")) {
      const [alphaName, stateName] = secondaryElement.split("::");
      const alpha = groupedByFocus.flatMap((g) => g.alphas).find((a) => a.name === alphaName);
      if (alpha) {
        const state = alpha.states.find((s) => s.name === stateName);
        if (state) {
          return { type: "state" as const, data: state, parent: alpha };
        }
      }
    }

    // If primary is an alpha, secondary could be a state or a related alpha
    if (selectedElementData.type === "alpha") {
      const alpha = selectedElementData.data;
      const state = alpha.states.find((s) => s.name === secondaryElement);
      if (state) {
        return { type: "state" as const, data: state, parent: alpha };
      }
      const relatedAlpha = baseline.alphas.find((a) => a.name === secondaryElement);
      if (relatedAlpha) {
        return { type: "alpha" as const, data: relatedAlpha };
      }
    }

    // If primary is an activity space, secondary could be an activity
    if (selectedElementData.type === "activitySpace") {
      const space = selectedElementData.data;
      const activity = space.activities?.find((a) => a.name === secondaryElement);
      if (activity) {
        return { type: "activity" as const, data: activity };
      }
    }

    // If primary is a work product, secondary could be an LOD
    if (selectedElementData.type === "workProduct") {
      const wp = selectedElementData.data;
      const lod = wp.levelsOfDetail?.find((l: any) => l.name === secondaryElement);
      if (lod) {
        return { type: "levelOfDetail" as const, data: lod, parent: wp };
      }
    }

    // If primary is a pattern, secondary could be a pattern view or an alpha
    if (selectedElementData.type === "pattern") {
      // Check for pattern view first
      const pattern = selectedElementData.data;
      const view = pattern.patternViews?.find((v: any) => v.name === secondaryElement);
      if (view) {
        return { type: "patternView" as const, data: view, parent: pattern };
      }

      // Check if it's an alpha (clicked from pattern table)
      const alpha = baseline.alphas.find((a) => a.name === secondaryElement);
      if (alpha) {
        return { type: "alpha" as const, data: alpha };
      }
    }

    // Check if secondary element is an activity (e.g. clicked from alpha state table or work product LOD table)
    for (const group of groupedByFocus) {
      for (const space of group.activitySpaces) {
        const activity = space.activities?.find((a) => a.name === secondaryElement);
        if (activity) {
          return { type: "activity" as const, data: activity };
        }
      }
    }

    // Could also be a work product referenced from an activity
    if (baseline.workProducts) {
      for (const wp of baseline.workProducts) {
        // Check if it's a specific LOD reference (workProductName::lodName)
        if (secondaryElement.includes("::") && secondaryElement.startsWith(wp.name + "::")) {
          const lodName = secondaryElement.split("::")[1];
          return {
            type: "workProduct" as const,
            data: wp,
            specificLevelOfDetail: lodName
          };
        }
        // Or just the work product name
        if (wp.name === secondaryElement) {
          return { type: "workProduct" as const, data: wp };
        }
      }
    }

    // If primary is a persona group, secondary could be a persona or competency
    if (selectedElementData?.type === "personaGroup") {
      const personaGroup = selectedElementData.data;
      const persona = baseline.personas?.find((p) => personaGroup.personaNames.includes(p.name) && p.name === secondaryElement);
      if (persona) {
        return { type: "persona" as const, data: persona };
      }
      // Also check competencies if they're in the group
      const competency = baseline.competencies?.find((c) => c.name === secondaryElement);
      if (competency) {
        return { type: "competency" as const, data: competency };
      }
    }

    // If primary is a persona, secondary could be a competency
    if (selectedElementData?.type === "persona") {
      const persona = selectedElementData.data;
      const competencyRef = persona.competencies?.find((cr: any) => cr.competencyName === secondaryElement);
      if (competencyRef) {
        const competency = baseline.competencies?.find((c) => c.name === competencyRef.competencyName);
        if (competency) {
          return { type: "competency" as const, data: competency };
        }
      }
    }

    // If primary is a competency, secondary could be a skill level
    if (selectedElementData?.type === "competency") {
      const competency = selectedElementData.data;
      const level = competency.levels?.find((l: any) => l.name === secondaryElement);
      if (level) {
        return { type: "competencyLevel" as const, data: level, parent: competency };
      }
    }

    // If primary is introduction, secondary could be a practice from the method
    if (selectedElementData?.type === "introduction") {
      // Look up practice in fetched documents
      const practiceDoc = practiceDocuments.get(secondaryElement);
      if (practiceDoc) {
        return { type: "practice" as const, data: practiceDoc };
      }
    }

    return null;
  }, [secondaryElement, selectedElementData, baseline, groupedByFocus, originalDocument, dependencyArtifacts, practiceDocuments]);

  const hasSecondaryContent = secondaryElementData !== null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: hasSecondaryContent ? "280px 1fr 320px" : "280px 1fr",
        gap: 0,
        minHeight: "100vh",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
      }}
    >
      {/* Left sidebar: Navigation */}
      <NavigatorSidebar
        mode={mode}
        groupedByFocus={groupedByFocus}
        selectedFocus={selectedFocus}
        selectedElement={selectedElement}
        assets={baseline.assets ?? []}
        baseline={baseline}
        onSetMode={onSetMode}
        onSetSelectedFocus={onSetSelectedFocus}
        onSetSelectedElement={onSetSelectedElement}
      />

      {/* Center panel: Element details */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {selectedElement === "__introduction__" && (schemaWarning || (versionWarnings && versionWarnings.length > 0)) && (
          <div style={{ padding: "1rem 2rem 0", flexShrink: 0 }}>
            {schemaWarning && (
              <Alert variant="warning" title="Schema Compatibility" isInline style={{ marginBottom: "0.5rem" }}>
                {schemaWarning}
              </Alert>
            )}
            {versionWarnings?.map((w, i) => (
              <Alert key={i} variant="warning" title="Dependency Version" isInline style={{ marginBottom: "0.5rem" }}>
                {w.message}
              </Alert>
            ))}
          </div>
        )}
        <ElementDetailsPanel
        selectedElement={selectedElementData}
        baseline={baseline}
        libraryId={libraryId}
        dependencyArtifacts={dependencyArtifacts}
        dependencyDiagramLayout={dependencyDiagramLayout}
        mode={mode}
        alphaScores={alphaScores}
        activitySpaceScores={activitySpaceScores}
        onSetSecondaryElement={onSetSecondaryElement}
        secondaryElementName={secondaryElement}
        onSetMode={onSetMode}
        onSetSelectedElement={onSetSelectedElement}
      />
      </div>

      {/* Right panel: Secondary details - only shown when there's content */}
      {hasSecondaryContent && (
        <SecondaryDetailsPanel
          secondaryElement={secondaryElementData}
          baseline={baseline}
          onSetSecondaryElement={onSetSecondaryElement}
          onSetSelectedElement={onSetSelectedElement}
          onNavigateToElement={onNavigateToElement}
          onSetMode={onSetMode}
          practiceDocuments={practiceDocuments}
          libraryId={libraryId}
        />
      )}
    </div>
  );
}
