"use client";

import { useState, useEffect } from "react";
import { Button, Title } from "@patternfly/react-core";
import { EditIcon, TrashIcon, AngleUpIcon, AngleDownIcon } from "@patternfly/react-icons";
import { LibraryDocumentCard } from "../common/LibraryDocumentCard";
import type { DashboardSection, EnrichedMeta } from "@/lib/data/dashboardConfig";

interface DashboardSectionCarouselProps {
  section: DashboardSection;
  documents: EnrichedMeta[];
  starredIds: string[];
  scores: Map<string, number>;
  onToggleStar: (id: string) => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function DashboardSectionCarousel({
  section,
  documents,
  starredIds,
  scores,
  onToggleStar,
  onEditSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: DashboardSectionCarouselProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDeleteSection();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle Escape key and body overflow when delete dialog is open
  useEffect(() => {
    if (!showDeleteConfirm) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancelDelete();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showDeleteConfirm]);

  return (
    <>
      <div style={{ marginBottom: "2.5rem" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Title
            headingLevel="h2"
            size="lg"
            style={{
              color: "var(--text)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {section.name}
          </Title>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--muted)",
              backgroundColor: "var(--border)",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
            }}
          >
            {documents.length}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="plain"
            onClick={onMoveUp}
            aria-label="Move section up"
            isDisabled={!canMoveUp}
            style={{
              padding: "0.5rem",
              minWidth: "auto",
              color: "var(--text)",
              opacity: canMoveUp ? 1 : 0.3,
            }}
          >
            <AngleUpIcon />
          </Button>
          <Button
            variant="plain"
            onClick={onMoveDown}
            aria-label="Move section down"
            isDisabled={!canMoveDown}
            style={{
              padding: "0.5rem",
              minWidth: "auto",
              color: "var(--text)",
              opacity: canMoveDown ? 1 : 0.3,
            }}
          >
            <AngleDownIcon />
          </Button>
          <Button
            variant="plain"
            onClick={onEditSection}
            aria-label="Edit section"
            style={{
              padding: "0.5rem",
              minWidth: "auto",
              color: "var(--text)",
            }}
          >
            <EditIcon />
          </Button>
          <Button
            variant="plain"
            onClick={handleDeleteClick}
            aria-label="Delete section"
            style={{
              padding: "0.5rem",
              minWidth: "auto",
              color: "var(--bad)",
            }}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      {documents.length === 0 ? (
        <div
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}
        >
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            No items match the current filters
          </p>
          <Button variant="link" onClick={onEditSection}>
            Edit section filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ paddingBottom: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              minWidth: "min-content",
            }}
          >
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  flexShrink: 0,
                }}
              >
                <LibraryDocumentCard
                  document={doc}
                  isStarred={starredIds.includes(doc.id)}
                  score={scores.get(doc.id)}
                  onToggleStar={() => onToggleStar(doc.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Delete confirmation modal */}
    {showDeleteConfirm && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close dialog"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(2px)",
            border: "none",
            cursor: "pointer",
          }}
          onClick={handleCancelDelete}
        />

        {/* Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-section-heading"
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            width: "100%",
            maxWidth: "32rem",
            flexDirection: "column",
            borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
            border: "1px solid var(--pf-v6-global--BorderColor--100)",
            backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
            boxShadow: "var(--pf-v6-global--BoxShadow--xl)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              alignItems: "flex-start",
              borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
              padding: "0.75rem 1rem",
            }}
          >
            <Title headingLevel="h2" size="lg" id="delete-section-heading">
              Delete section?
            </Title>
          </div>

          {/* Content */}
          <div
            style={{
              padding: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: "1.5",
                color: "var(--pf-v6-global--Color--100)",
                margin: 0,
              }}
            >
              Are you sure you want to delete the section{" "}
              <strong>{section.name}</strong>? This action cannot be undone.
            </p>
          </div>

          {/* Footer with buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
            }}
          >
            <button
              type="button"
              onClick={handleCancelDelete}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                backgroundColor: "transparent",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--100)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              style={{
                borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                border: "none",
                backgroundColor: "#c9190b",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
