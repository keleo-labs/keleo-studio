"use client";

import { useState } from "react";
import { Button, TextInput, Label } from "@patternfly/react-core";
import { PlusIcon, TimesIcon } from "@patternfly/react-icons";

export type MethodTags = {
  domainTags?: string[];
  lifecycleTags?: string[];
  organizationalTags?: string[];
};

type MethodTagsFieldProps = {
  value: MethodTags;
  onChange: (tags: MethodTags) => void;
};

export function MethodTagsField({ value, onChange }: MethodTagsFieldProps) {
  const [newDomainTag, setNewDomainTag] = useState("");
  const [newLifecycleTag, setNewLifecycleTag] = useState("");
  const [newOrgTag, setNewOrgTag] = useState("");

  const addTag = (category: keyof MethodTags, tag: string) => {
    if (!tag.trim()) return;
    const existing = value[category] ?? [];
    if (existing.includes(tag.trim())) return;
    onChange({
      ...value,
      [category]: [...existing, tag.trim()],
    });
  };

  const removeTag = (category: keyof MethodTags, tagToRemove: string) => {
    const existing = value[category] ?? [];
    onChange({
      ...value,
      [category]: existing.filter((t) => t !== tagToRemove),
    });
  };

  const TagList = ({ category, tags, onRemove }: { category: string; tags: string[]; onRemove: (tag: string) => void }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
      {tags.length === 0 ? (
        <span style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", fontStyle: "italic" }}>
          No {category.toLowerCase()} tags
        </span>
      ) : (
        tags.map((tag) => (
          <Label key={tag} color="blue" onClose={() => onRemove(tag)}>
            {tag}
          </Label>
        ))
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Domain Tags */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>Domain Tags</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              value={newDomainTag}
              onChange={(_, val) => setNewDomainTag(val)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("domainTags", newDomainTag);
                  setNewDomainTag("");
                }
              }}
              placeholder="e.g., Software, Cloud, Platform"
              aria-label="New domain tag"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              addTag("domainTags", newDomainTag);
              setNewDomainTag("");
            }}
            isDisabled={!newDomainTag.trim()}
          >
            Add
          </Button>
        </div>
        <TagList
          category="Domain"
          tags={value.domainTags ?? []}
          onRemove={(tag) => removeTag("domainTags", tag)}
        />
      </div>

      {/* Lifecycle Tags */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>Lifecycle Tags</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              value={newLifecycleTag}
              onChange={(_, val) => setNewLifecycleTag(val)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("lifecycleTags", newLifecycleTag);
                  setNewLifecycleTag("");
                }
              }}
              placeholder="e.g., Active, Deprecated, Experimental"
              aria-label="New lifecycle tag"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              addTag("lifecycleTags", newLifecycleTag);
              setNewLifecycleTag("");
            }}
            isDisabled={!newLifecycleTag.trim()}
          >
            Add
          </Button>
        </div>
        <TagList
          category="Lifecycle"
          tags={value.lifecycleTags ?? []}
          onRemove={(tag) => removeTag("lifecycleTags", tag)}
        />
      </div>

      {/* Organizational Tags */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>Organizational Tags</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              value={newOrgTag}
              onChange={(_, val) => setNewOrgTag(val)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("organizationalTags", newOrgTag);
                  setNewOrgTag("");
                }
              }}
              placeholder="e.g., Enterprise, Team, Individual"
              aria-label="New organizational tag"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              addTag("organizationalTags", newOrgTag);
              setNewOrgTag("");
            }}
            isDisabled={!newOrgTag.trim()}
          >
            Add
          </Button>
        </div>
        <TagList
          category="Organizational"
          tags={value.organizationalTags ?? []}
          onRemove={(tag) => removeTag("organizationalTags", tag)}
        />
      </div>
    </div>
  );
}
