"use client";

import { useState } from "react";
import { Button, TextInput, TextArea, Modal, ModalVariant } from "@patternfly/react-core";
import { PlusIcon, EditIcon, TrashIcon } from "@patternfly/react-icons";

export type MethodNarrative = {
  name: string;
  narrativeTypeName: string;
  description: string;
  narrativeContexts?: any[];
  narratives?: MethodNarrative[];
};

type MethodNarrativesFieldProps = {
  value: MethodNarrative[];
  onChange: (narratives: MethodNarrative[]) => void;
};

export function MethodNarrativesField({ value, onChange }: MethodNarrativesFieldProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formTypeName, setFormTypeName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const openAdd = () => {
    setFormName("");
    setFormTypeName("");
    setFormDescription("");
    setEditingIndex(null);
    setIsAddOpen(true);
  };

  const openEdit = (index: number) => {
    const narrative = value[index];
    if (!narrative) return;
    setFormName(narrative.name || "");
    setFormTypeName(narrative.narrativeTypeName || "");
    setFormDescription(narrative.description || "");
    setEditingIndex(index);
    setIsAddOpen(true);
  };

  const handleSave = () => {
    const narrative: MethodNarrative = {
      name: formName.trim(),
      narrativeTypeName: formTypeName.trim(),
      description: formDescription.trim(),
      narrativeContexts: [],
    };

    if (editingIndex !== null) {
      // Update existing
      const updated = [...value];
      updated[editingIndex] = narrative;
      onChange(updated);
    } else {
      // Add new
      onChange([...value, narrative]);
    }

    setIsAddOpen(false);
  };

  const handleDelete = (index: number) => {
    if (confirm("Delete this narrative?")) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  const isFormValid = formName.trim() && formDescription.trim();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
          Method Narratives {value.length > 0 && <span style={{ color: "var(--pf-v6-global--Color--200)" }}>({value.length})</span>}
        </div>
        <Button variant="secondary" icon={<PlusIcon />} onClick={openAdd}>
          Add Narrative
        </Button>
      </div>

      {value.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--pf-v6-global--Color--200)",
            fontStyle: "italic",
            border: "1px dashed var(--pf-v6-global--BorderColor--100)",
            borderRadius: 8,
          }}
        >
          No narratives defined. Click "Add Narrative" to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {value.map((narrative, idx) => {
            const hasNested = Array.isArray(narrative.narratives) && narrative.narratives.length > 0;
            return (
              <div
                key={`${narrative.name}-${idx}`}
                style={{
                  border: "1px solid var(--pf-v6-global--BorderColor--100)",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{narrative.name}</div>
                    {narrative.narrativeTypeName && (
                      <div style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)", fontFamily: "monospace", marginTop: 2 }}>
                        Type: {narrative.narrativeTypeName}
                      </div>
                    )}
                    {narrative.description && (
                      <div style={{ fontSize: "0.875rem", marginTop: 8, color: "var(--pf-v6-global--Color--100)" }}>
                        {narrative.description}
                      </div>
                    )}
                    {hasNested && (
                      <div style={{ fontSize: "0.75rem", marginTop: 8, color: "var(--pf-v6-global--link--Color)" }}>
                        Contains {narrative.narratives!.length} nested narrative{narrative.narratives!.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button
                      variant="plain"
                      icon={<EditIcon />}
                      onClick={() => openEdit(idx)}
                      aria-label="Edit narrative"
                    />
                    <Button
                      variant="plain"
                      isDanger
                      icon={<TrashIcon />}
                      onClick={() => handleDelete(idx)}
                      aria-label="Delete narrative"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        variant={ModalVariant.small}
        title={editingIndex !== null ? "Edit Narrative" : "Add Narrative"}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        actions={[
          <Button
            key="save"
            variant="primary"
            onClick={handleSave}
            isDisabled={!isFormValid}
          >
            {editingIndex !== null ? "Update" : "Add"}
          </Button>,
          <Button key="cancel" variant="link" onClick={() => setIsAddOpen(false)}>
            Cancel
          </Button>,
        ]}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="narrative-name-input" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
              Name <span style={{ color: "var(--pf-v6-global--danger-color--100)" }}>*</span>
            </label>
            <TextInput
              id="narrative-name-input"
              value={formName}
              onChange={(_, val) => setFormName(val)}
              placeholder="Narrative name"
              isRequired
            />
          </div>

          <div>
            <label htmlFor="narrative-description-input" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
              Description <span style={{ color: "var(--pf-v6-global--danger-color--100)" }}>*</span>
            </label>
            <TextArea
              id="narrative-description-input"
              value={formDescription}
              onChange={(_, val) => setFormDescription(val)}
              placeholder="Describe this narrative..."
              rows={4}
              isRequired
            />
          </div>

          <div>
            <label htmlFor="narrative-type-name-input" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
              Type Name
            </label>
            <TextInput
              id="narrative-type-name-input"
              value={formTypeName}
              onChange={(_, val) => setFormTypeName(val)}
              placeholder="e.g., UserStory, UseCase, Scenario"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
