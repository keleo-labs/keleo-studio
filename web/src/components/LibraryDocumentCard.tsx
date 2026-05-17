"use client";

import Link from "next/link";
import { Card, CardBody, Badge } from "@patternfly/react-core";
import { StarIcon } from "@patternfly/react-icons";
import type { EnrichedMeta } from "@/lib/dashboardConfig";

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

  // Navigate to browse view for all documents
  const href = `/library/browse?libraryId=${encodeURIComponent(document.id)}`;

  // Get color style for completeness score
  const getScoreColor = () => {
    if (!score || score === 0) return "var(--muted)";
    if (score < 5) return "#6ca0dc";
    if (score < 10) return "#3b82f6";
    return "#1d4ed8";
  };

  const kindLabel =
    document.libraryRootKind === "method"
      ? "Method"
      : document.libraryRootKind === "baselinePractice"
      ? "Baseline"
      : "Practice";

  // Get first few tags for preview
  const allTags = [
    ...(document.libraryTags.domainTags || []),
    ...(document.libraryTags.lifecycleTags || []),
    ...(document.libraryTags.organizationalTags || []),
  ];
  const previewTags = allTags.slice(0, 3);

  return (
    <Card
      isClickable
      component="div"
      style={{
        width: "250px",
        height: "200px",
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        backgroundColor: "var(--panel)",
        transition: "all 0.2s cubic-bezier(0.33, 1, 0.68, 1)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      className="group"
    >
      <CardBody
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header with kind badge and star button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <Badge
            style={{
              fontSize: "0.625rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              backgroundColor: "var(--accent)/10",
              color: "var(--accent)",
              border: "none",
            }}
          >
            {kindLabel}
          </Badge>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              color: isStarred ? "#fbbf24" : "var(--muted)",
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

        {/* Title */}
        <Link
          href={href}
          style={{
            textDecoration: "none",
            color: "var(--text)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: "0.5rem",
              lineHeight: "1.3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {document.displayName || document.title}
          </h3>

          {/* Tags preview */}
          {previewTags.length > 0 && (
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {previewTags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "0.625rem",
                    padding: "0.125rem 0.375rem",
                    borderRadius: "0.25rem",
                    backgroundColor: "var(--bg)",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {tag}
                </span>
              ))}
              {allTags.length > 3 && (
                <span
                  style={{
                    fontSize: "0.625rem",
                    padding: "0.125rem 0.375rem",
                    color: "var(--muted)",
                  }}
                >
                  +{allTags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Completeness score indicator */}
          <div style={{ marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "4px",
                  backgroundColor: "var(--border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: score ? `${Math.min((score / 20) * 100, 100)}%` : "0%",
                    backgroundColor: getScoreColor(),
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              {score !== undefined && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: getScoreColor(),
                  }}
                >
                  {score}
                </span>
              )}
            </div>
          </div>
        </Link>
      </CardBody>
    </Card>
  );
}
