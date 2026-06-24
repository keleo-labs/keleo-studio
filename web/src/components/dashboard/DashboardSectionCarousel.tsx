"use client";

import { useState } from "react";
import { Button, Title, Modal, ModalVariant } from "@patternfly/react-core";
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
    <Modal
      variant={ModalVariant.small}
      title="Delete section?"
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      actions={[
        <Button key="confirm" variant="danger" onClick={handleConfirmDelete}>
          Delete
        </Button>,
        <Button key="cancel" variant="link" onClick={() => setShowDeleteConfirm(false)}>
          Cancel
        </Button>,
      ]}
    >
      <p>
        Are you sure you want to delete the section <strong>{section.name}</strong>?
        This action cannot be undone.
      </p>
    </Modal>
  </>
  );
}
