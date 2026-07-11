"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@patternfly/react-core";
import { StarIcon, EditIcon } from "@patternfly/react-icons";
import type { EnrichedMeta } from "@/lib/data/dashboardConfig";

interface LibraryDocumentCardProps {
  document: EnrichedMeta;
  isStarred: boolean;
  score?: number;
  onToggleStar: () => void;
}

export function LibraryDocumentCard({
  document,
  isStarred,
  score,
  onToggleStar,
}: LibraryDocumentCardProps) {
  const router = useRouter();

  // Guard: Never render dashboard-config documents
  if (document.kind === "dashboard-config") {
    console.warn("Attempted to render dashboard-config document:", document.id);
    return null;
  }

  // Guard: Ensure document has required enriched fields
  if (!document.libraryRootKind || !document.libraryTags) {
    console.warn("Document missing required fields:", document.id);
    return null;
  }

  // Navigate to navigator for all documents
  const href = `/navigator?libraryId=${encodeURIComponent(document.id)}`;
  const editHref = document.libraryRootKind === "method"
    ? `/method-builder?libraryId=${encodeURIComponent(document.id)}`
    : `/practice-author?libraryId=${encodeURIComponent(document.id)}`;

  const kindLabel =
    document.libraryRootKind === "method"
      ? "Method"
      : document.libraryRootKind === "baselinePractice"
      ? "Baseline"
      : "Practice";

  // Get document description from enriched metadata
  const description = document.description || "";

  // Get all tags for display
  const allTags = [
    ...(document.libraryTags.domainTags || []),
    ...(document.libraryTags.lifecycleTags || []),
    ...(document.libraryTags.organizationalTags || []),
  ];

  const handleCardClick = () => {
    router.push(href);
  };

  return (
    <Card
      isClickable
      component="div"
      onClick={handleCardClick}
      style={{
        width: "266px",
        minHeight: "160px",
        borderRadius: "0.625rem",
        border: "1px solid var(--border)",
        backgroundColor: "var(--panel)",
        transition: "all 0.2s cubic-bezier(0.33, 1, 0.68, 1)",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        cursor: "pointer",
      }}
    >
      <CardBody
        style={{
          padding: "0.875rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Header: Title and action buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <h3
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              lineHeight: "1.3",
              color: "var(--text)",
              margin: 0,
              flex: 1,
            }}
          >
            {document.displayName || document.title}
          </h3>
          <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
            <Link
              href={editHref}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.125rem",
                color: "var(--pf-v6-global--primary-color--100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.25rem",
                transition: "background-color 0.2s",
                textDecoration: "none",
              }}
              aria-label="Edit document"
            >
              <EditIcon style={{ fontSize: "0.875rem" }} />
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleStar();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.125rem",
                color: isStarred ? "#fbbf24" : "var(--muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.25rem",
                transition: "color 0.2s",
              }}
              aria-label={isStarred ? "Unstar document" : "Star document"}
            >
              <StarIcon
                style={{
                  fontSize: "1rem",
                  fill: isStarred ? "currentColor" : "none",
                  stroke: "currentColor",
                  strokeWidth: isStarred ? 0 : 2,
                }}
              />
            </button>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            style={{
              fontSize: "0.75rem",
              lineHeight: "1.4",
              color: "var(--text)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {description}
          </p>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {allTags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.625rem",
                  padding: "0.125rem 0.375rem",
                  borderRadius: "0.25rem",
                  backgroundColor: "var(--bg)",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
