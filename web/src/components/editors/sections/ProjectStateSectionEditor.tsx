"use client";

import type { CSSProperties } from 'react';
import { InlineTextField } from '../fields/base/InlineTextField';
import { InlineTextArea } from '../fields/base/InlineTextArea';
import { InlineSelectField } from '../fields/base/InlineSelectField';
import { ChecklistStatesField } from '../fields/domain/ChecklistStatesField';
import { NotesField } from '../fields/domain/NotesField';

export type ProjectStateSectionEditorProps = {
  section: Record<string, unknown>;
  basePath: string;
  onChange: (section: Record<string, unknown>) => void;
  alphaNames: string[];
  stateNamesByAlpha: Record<string, string[]>;
  workProductNames: string[];
  levelNamesByWorkProduct: Record<string, string[]>;
  checklistNamesByAlphaState: Record<string, string[]>;
  checklistNamesByWPLoD: Record<string, string[]>;
  sectionLabel: string;
};

const cardStyle: CSSProperties = {
  background: '#fafafa',
  border: '1px solid #d2d2d2',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const cardHeaderStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#0066cc',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6a6e73',
  marginBottom: 2,
  display: 'block',
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#151515',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid #d2d2d2',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const badgeStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  background: '#e7f1fa',
  color: '#0066cc',
  padding: '2px 10px',
  borderRadius: 12,
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const removeButtonStyle: CSSProperties = {
  background: 'rgba(251,113,133,0.15)',
  color: 'rgba(251,113,133,1)',
  border: '1px solid rgba(251,113,133,0.5)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

export function ProjectStateSectionEditor({
  section,
  onChange,
  alphaNames,
  stateNamesByAlpha,
  workProductNames,
  levelNamesByWorkProduct,
  checklistNamesByAlphaState,
  checklistNamesByWPLoD,
  sectionLabel,
}: ProjectStateSectionEditorProps) {
  const alphaInstances = Array.isArray(section.alphaInstances) ? section.alphaInstances as Record<string, unknown>[] : [];
  const wpInstances = Array.isArray(section.workProductInstances) ? section.workProductInstances as Record<string, unknown>[] : [];
  const notes = Array.isArray(section.notes) ? section.notes as Record<string, unknown>[] : [];

  function update(field: string, val: unknown) {
    onChange({ ...section, [field]: val });
  }

  function updateAlphaInstance(idx: number, field: string, val: unknown) {
    const updated = alphaInstances.map((a, i) => i === idx ? { ...a, [field]: val } : a);
    update("alphaInstances", updated);
  }

  function addAlphaInstance() {
    update("alphaInstances", [...alphaInstances, { name: "", description: "", alphaName: "", stateName: "" }]);
  }

  function removeAlphaInstance(idx: number) {
    update("alphaInstances", alphaInstances.filter((_, i) => i !== idx));
  }

  function updateWPInstance(idx: number, field: string, val: unknown) {
    const updated = wpInstances.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    update("workProductInstances", updated);
  }

  function addWPInstance() {
    update("workProductInstances", [...wpInstances, { name: "", description: "", workProductName: "", levelOfDetailName: "" }]);
  }

  function removeWPInstance(idx: number) {
    update("workProductInstances", wpInstances.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {/* Alpha Instances */}
      <div style={sectionHeaderStyle}>
        <span>Alpha Instances</span>
        <span style={badgeStyle}>{alphaInstances.length}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" onClick={addAlphaInstance} style={buttonStyle}>+ Add Alpha Instance</button>
        </div>
      </div>

      {alphaInstances.map((ai: any, idx: number) => {
        const statesForAlpha = stateNamesByAlpha[ai.alphaName] || [];
        const checklistKey = `${ai.alphaName}::${ai.stateName}`;
        const availableChecklists = checklistNamesByAlphaState[checklistKey] || [];

        return (
          <div key={idx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span>{ai.name || `Alpha Instance ${idx + 1}`}</span>
              <button type="button" onClick={() => removeAlphaInstance(idx)} style={removeButtonStyle}>Remove</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <span style={fieldLabelStyle}>Instance Name</span>
                <InlineTextField
                  value={ai.name || ""}
                  onChange={(val) => updateAlphaInstance(idx, "name", val)}
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>Alpha</span>
                <InlineSelectField
                  value={ai.alphaName || ""}
                  onChange={(val) => updateAlphaInstance(idx, "alphaName", val)}
                  options={alphaNames}
                  placeholder="Select alpha..."
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>State</span>
                <InlineSelectField
                  value={ai.stateName || ""}
                  onChange={(val) => updateAlphaInstance(idx, "stateName", val)}
                  options={statesForAlpha}
                  placeholder="Select state..."
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>Description</span>
                <InlineTextArea
                  value={ai.description || ""}
                  onChange={(val) => updateAlphaInstance(idx, "description", val)}
                />
              </div>
            </div>
            <ChecklistStatesField
              value={Array.isArray(ai.checklistStates) ? ai.checklistStates : []}
              onChange={(val) => updateAlphaInstance(idx, "checklistStates", val)}
              availableChecklistNames={availableChecklists}
            />
          </div>
        );
      })}

      {/* Work Product Instances */}
      <div style={{ ...sectionHeaderStyle, marginTop: 32 }}>
        <span>Work Product Instances</span>
        <span style={badgeStyle}>{wpInstances.length}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" onClick={addWPInstance} style={buttonStyle}>+ Add Work Product Instance</button>
        </div>
      </div>

      {wpInstances.map((wi: any, idx: number) => {
        const levelsForWP = levelNamesByWorkProduct[wi.workProductName] || [];
        const checklistKey = `${wi.workProductName}::${wi.levelOfDetailName}`;
        const availableChecklists = checklistNamesByWPLoD[checklistKey] || [];

        return (
          <div key={idx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span>{wi.name || `Work Product Instance ${idx + 1}`}</span>
              <button type="button" onClick={() => removeWPInstance(idx)} style={removeButtonStyle}>Remove</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <span style={fieldLabelStyle}>Instance Name</span>
                <InlineTextField
                  value={wi.name || ""}
                  onChange={(val) => updateWPInstance(idx, "name", val)}
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>Work Product</span>
                <InlineSelectField
                  value={wi.workProductName || ""}
                  onChange={(val) => updateWPInstance(idx, "workProductName", val)}
                  options={workProductNames}
                  placeholder="Select work product..."
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>Level of Detail</span>
                <InlineSelectField
                  value={wi.levelOfDetailName || ""}
                  onChange={(val) => updateWPInstance(idx, "levelOfDetailName", val)}
                  options={levelsForWP}
                  placeholder="Select level..."
                />
              </div>
              <div>
                <span style={fieldLabelStyle}>Description</span>
                <InlineTextArea
                  value={wi.description || ""}
                  onChange={(val) => updateWPInstance(idx, "description", val)}
                />
              </div>
            </div>
            <ChecklistStatesField
              value={Array.isArray(wi.checklistStates) ? wi.checklistStates : []}
              onChange={(val) => updateWPInstance(idx, "checklistStates", val)}
              availableChecklistNames={availableChecklists}
            />
          </div>
        );
      })}

      {/* Section Notes */}
      <div style={{ marginTop: 24 }}>
        <NotesField
          value={notes}
          onChange={(val) => update("notes", val)}
          label={`${sectionLabel} Notes`}
        />
      </div>
    </div>
  );
}
