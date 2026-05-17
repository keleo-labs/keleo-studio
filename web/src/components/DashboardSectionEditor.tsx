"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Title,
  Form,
  FormGroup,
  TextInput,
  Radio,
  Checkbox,
  Tabs,
  Tab,
  TabTitleText,
  Select,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
} from "@patternfly/react-core";
import { TrashIcon } from "@patternfly/react-icons";
import type { DashboardSection, SortCriterion, SortField, SortOrder } from "@/lib/dashboardConfig";

interface DashboardSectionEditorProps {
  section?: DashboardSection;
  availableTags: {
    domain: string[];
    lifecycle: string[];
    organizational: string[];
  };
  onSave: (section: DashboardSection) => void;
  onCancel: () => void;
}

export function DashboardSectionEditor({
  section,
  availableTags,
  onSave,
  onCancel,
}: DashboardSectionEditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [name, setName] = useState(section?.name || "");
  const [kind, setKind] = useState<"all" | "practice" | "method">(
    section?.filters.kind || "all"
  );
  const [onlyStarred, setOnlyStarred] = useState(section?.filters.onlyStarred || false);
  const [selectedDomainTags, setSelectedDomainTags] = useState<string[]>(
    section?.filters.domainTags || []
  );
  const [selectedLifecycleTags, setSelectedLifecycleTags] = useState<string[]>(
    section?.filters.lifecycleTags || []
  );
  const [selectedOrgTags, setSelectedOrgTags] = useState<string[]>(
    section?.filters.organizationalTags || []
  );
  const [namePattern, setNamePattern] = useState(
    section?.filters.namePattern || ""
  );
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>(() => {
    // Handle migration from old string format to new array format
    if (!section?.sortBy) {
      return [{ field: "starred", order: "desc" }];
    }
    if (Array.isArray(section.sortBy)) {
      return section.sortBy;
    }
    // Old format: convert string to array
    const oldSortBy = section.sortBy as unknown as string;
    return [{ field: oldSortBy as SortField, order: "desc" }];
  });
  const [maxItems, setMaxItems] = useState<string>(
    section?.maxItems?.toString() || ""
  );

  // Handle Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newSection: DashboardSection = {
      id: section?.id || crypto.randomUUID(),
      name: name.trim() || "Untitled Section",
      seq: section?.seq ?? 0,
      filters: {
        ...(kind !== "all" && { kind }),
        ...(onlyStarred && { onlyStarred: true }),
        ...(selectedDomainTags.length > 0 && { domainTags: selectedDomainTags }),
        ...(selectedLifecycleTags.length > 0 && {
          lifecycleTags: selectedLifecycleTags,
        }),
        ...(selectedOrgTags.length > 0 && {
          organizationalTags: selectedOrgTags,
        }),
        ...(namePattern.trim() && { namePattern: namePattern.trim() }),
      },
      sortBy: sortCriteria,
      ...(maxItems && parseInt(maxItems) > 0 && { maxItems: parseInt(maxItems) }),
    };
    onSave(newSection);
  };

  const toggleTag = (
    tag: string,
    category: "domain" | "lifecycle" | "organizational"
  ) => {
    const setter =
      category === "domain"
        ? setSelectedDomainTags
        : category === "lifecycle"
        ? setSelectedLifecycleTags
        : setSelectedOrgTags;

    const current =
      category === "domain"
        ? selectedDomainTags
        : category === "lifecycle"
        ? selectedLifecycleTags
        : selectedOrgTags;

    if (current.includes(tag)) {
      setter(current.filter((t) => t !== tag));
    } else {
      setter([...current, tag]);
    }
  };

  const addSortCriterion = () => {
    setSortCriteria([...sortCriteria, { field: "title", order: "asc" }]);
  };

  const removeSortCriterion = (index: number) => {
    setSortCriteria(sortCriteria.filter((_, i) => i !== index));
  };

  const updateSortField = (index: number, field: SortField) => {
    const updated = [...sortCriteria];
    updated[index] = { ...updated[index], field };
    setSortCriteria(updated);
  };

  const updateSortOrder = (index: number, order: SortOrder) => {
    const updated = [...sortCriteria];
    updated[index] = { ...updated[index], order };
    setSortCriteria(updated);
  };

  const sortFieldLabels: Record<SortField, string> = {
    starred: "Starred",
    completeness: "Completeness score",
    title: "Title",
    updatedAt: "Updated date",
  };

  const hasAnyTags =
    availableTags.domain.length > 0 ||
    availableTags.lifecycle.length > 0 ||
    availableTags.organizational.length > 0;

  return (
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
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-editor-heading"
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          maxHeight: "min(90vh, 42rem)",
          width: "100%",
          maxWidth: "48rem",
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
            justifyContent: "space-between",
            gap: "0.75rem",
            borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
            padding: "0.75rem 1rem",
          }}
        >
          <Title headingLevel="h2" size="lg" id="section-editor-heading">
            {section ? "Edit Section" : "Create Section"}
          </Title>
          <button
            type="button"
            onClick={onCancel}
            style={{
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              border: "1px solid transparent",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--pf-v6-global--Color--200)",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
          }}
        >
          <Form onSubmit={handleSubmit}>
        {/* Section name - always visible */}
        <FormGroup label="Section name" isRequired fieldId="section-name">
          <TextInput
            id="section-name"
            value={name}
            onChange={(_event, value) => setName(value)}
            placeholder="e.g., My Favorite Practices"
          />
        </FormGroup>

        {/* Tabs for different configuration areas */}
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, tabIndex) => setActiveTab(Number(tabIndex))}
          style={{ marginTop: "1rem" }}
        >
            {/* Basic Filters Tab */}
            <Tab eventKey={0} title={<TabTitleText>Basic Filters</TabTitleText>}>
              <div style={{ padding: "1rem 0" }}>
                {/* Document kind filter */}
                <FormGroup label="Document type" fieldId="kind-filter">
                  <Radio
                    id="kind-all"
                    name="kind"
                    label="All documents"
                    isChecked={kind === "all"}
                    onChange={() => setKind("all")}
                  />
                  <Radio
                    id="kind-practice"
                    name="kind"
                    label="Practices only"
                    isChecked={kind === "practice"}
                    onChange={() => setKind("practice")}
                  />
                  <Radio
                    id="kind-method"
                    name="kind"
                    label="Methods only"
                    isChecked={kind === "method"}
                    onChange={() => setKind("method")}
                  />
                </FormGroup>

                {/* Starred items only */}
                <FormGroup fieldId="only-starred">
                  <Checkbox
                    id="only-starred"
                    label="Show only starred items"
                    isChecked={onlyStarred}
                    onChange={(_event, checked) => setOnlyStarred(checked)}
                  />
                </FormGroup>

                {/* Name pattern */}
                <FormGroup label="Name filter" fieldId="name-pattern">
                  <TextInput
                    id="name-pattern"
                    value={namePattern}
                    onChange={(_event, value) => setNamePattern(value)}
                    placeholder="e.g., agile"
                  />
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Case-insensitive substring match
                  </div>
                </FormGroup>
              </div>
            </Tab>

            {/* Tags Tab - only show if tags exist */}
            {hasAnyTags && (
              <Tab eventKey={1} title={<TabTitleText>Filter by Tags</TabTitleText>}>
                <div style={{ padding: "1rem 0" }}>
                  {/* Domain tags */}
                  {availableTags.domain.length > 0 && (
                    <FormGroup label="Domain tags" fieldId="domain-tags">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "0.5rem",
                          maxHeight: "120px",
                          overflowY: "auto",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.25rem",
                          backgroundColor: "var(--bg)",
                        }}
                      >
                        {availableTags.domain.map((tag) => (
                          <Checkbox
                            key={tag}
                            id={`domain-${tag}`}
                            label={tag}
                            isChecked={selectedDomainTags.includes(tag)}
                            onChange={() => toggleTag(tag, "domain")}
                          />
                        ))}
                      </div>
                    </FormGroup>
                  )}

                  {/* Lifecycle tags */}
                  {availableTags.lifecycle.length > 0 && (
                    <FormGroup label="Lifecycle tags" fieldId="lifecycle-tags">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "0.5rem",
                          maxHeight: "120px",
                          overflowY: "auto",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.25rem",
                          backgroundColor: "var(--bg)",
                        }}
                      >
                        {availableTags.lifecycle.map((tag) => (
                          <Checkbox
                            key={tag}
                            id={`lifecycle-${tag}`}
                            label={tag}
                            isChecked={selectedLifecycleTags.includes(tag)}
                            onChange={() => toggleTag(tag, "lifecycle")}
                          />
                        ))}
                      </div>
                    </FormGroup>
                  )}

                  {/* Organizational tags */}
                  {availableTags.organizational.length > 0 && (
                    <FormGroup label="Organizational tags" fieldId="org-tags">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "0.5rem",
                          maxHeight: "120px",
                          overflowY: "auto",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.25rem",
                          backgroundColor: "var(--bg)",
                        }}
                      >
                        {availableTags.organizational.map((tag) => (
                          <Checkbox
                            key={tag}
                            id={`org-${tag}`}
                            label={tag}
                            isChecked={selectedOrgTags.includes(tag)}
                            onChange={() => toggleTag(tag, "organizational")}
                          />
                        ))}
                      </div>
                    </FormGroup>
                  )}
                </div>
              </Tab>
            )}

            {/* Sort & Display Tab */}
            <Tab eventKey={2} title={<TabTitleText>Sort & Display</TabTitleText>}>
              <div style={{ padding: "1rem 0" }}>
                {/* Multi-level sort */}
                <FormGroup label="Sort criteria" fieldId="sort-criteria">
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--muted)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Items are sorted by the first criterion, then by the second, and so on
                  </div>

                  {sortCriteria.map((criterion, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                        padding: "0.75rem",
                        border: "1px solid var(--pf-v6-global--BorderColor--100)",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--pf-v6-global--Color--200)",
                          minWidth: "2rem",
                        }}
                      >
                        {index + 1}.
                      </span>

                      <div style={{ flex: 1, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <select
                          value={criterion.field}
                          onChange={(e) => updateSortField(index, e.target.value as SortField)}
                          style={{
                            flex: "1 1 150px",
                            padding: "0.5rem",
                            fontSize: "0.875rem",
                            border: "1px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                            color: "var(--pf-v6-global--Color--100)",
                          }}
                        >
                          <option value="starred">Starred</option>
                          <option value="completeness">Completeness score</option>
                          <option value="title">Title</option>
                          <option value="updatedAt">Updated date</option>
                        </select>

                        <select
                          value={criterion.order}
                          onChange={(e) => updateSortOrder(index, e.target.value as SortOrder)}
                          style={{
                            flex: "1 1 120px",
                            padding: "0.5rem",
                            fontSize: "0.875rem",
                            border: "1px solid var(--pf-v6-global--BorderColor--100)",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                            color: "var(--pf-v6-global--Color--100)",
                          }}
                        >
                          {criterion.field === "starred" ? (
                            <>
                              <option value="desc">Starred first</option>
                              <option value="asc">Unstarred first</option>
                            </>
                          ) : criterion.field === "completeness" ? (
                            <>
                              <option value="desc">Highest first</option>
                              <option value="asc">Lowest first</option>
                            </>
                          ) : criterion.field === "updatedAt" ? (
                            <>
                              <option value="desc">Newest first</option>
                              <option value="asc">Oldest first</option>
                            </>
                          ) : (
                            <>
                              <option value="asc">A to Z</option>
                              <option value="desc">Z to A</option>
                            </>
                          )}
                        </select>
                      </div>

                      {sortCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSortCriterion(index)}
                          aria-label="Remove sort criterion"
                          style={{
                            padding: "0.5rem",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color: "var(--pf-v6-global--danger-color--100)",
                          }}
                        >
                          <TrashIcon size="sm" />
                        </button>
                      )}
                    </div>
                  ))}

                  {sortCriteria.length < 4 && (
                    <button
                      type="button"
                      onClick={addSortCriterion}
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
                      + Add sort criterion
                    </button>
                  )}
                </FormGroup>

                {/* Max items */}
                <FormGroup label="Maximum items (optional)" fieldId="max-items">
                  <TextInput
                    id="max-items"
                    type="number"
                    value={maxItems}
                    onChange={(_event, value) => setMaxItems(value)}
                    placeholder="Leave empty for no limit"
                    min={0}
                  />
                </FormGroup>
              </div>
            </Tab>
          </Tabs>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.75rem",
                paddingTop: "1rem",
                marginTop: "1rem",
                borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
              }}
            >
              <button
                type="button"
                onClick={onCancel}
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
                type="submit"
                style={{
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  border: "1px solid var(--pf-v6-global--primary-color--100)",
                  backgroundColor: "var(--pf-v6-global--primary-color--100)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {section ? "Save" : "Create"}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
