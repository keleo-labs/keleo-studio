"use client";

import { Label } from "@patternfly/react-core";
import { normalizePracticeElementTags } from "@/lib/display/elementDisplay";

interface ElementTagsBadgesProps {
  tags: unknown;
}

export function ElementTagsBadges({ tags }: ElementTagsBadgesProps) {
  const normalized = normalizePracticeElementTags(tags);
  if (!normalized) return null;

  const entries: { label: string; color: "blue" | "green" | "grey" }[] = [];

  for (const tag of normalized.domainTags ?? []) {
    entries.push({ label: tag, color: "blue" });
  }
  for (const tag of normalized.lifecycleTags ?? []) {
    entries.push({ label: tag, color: "green" });
  }
  for (const tag of normalized.organizationalTags ?? []) {
    entries.push({ label: tag, color: "grey" });
  }

  if (entries.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "1rem" }}>
      {entries.map((entry, idx) => (
        <Label key={idx} color={entry.color} isCompact>
          {entry.label}
        </Label>
      ))}
    </div>
  );
}
