"use client";

import type { CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';

export type ChecklistStatesFieldProps = {
  value: Record<string, unknown>[] | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
  availableChecklistNames: string[];
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 140px 1fr',
  gap: 8,
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid #f0f0f0',
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 13,
  border: '1px solid #d2d2d2',
  borderRadius: 4,
  background: '#ffffff',
  color: '#151515',
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

function stateColor(state: string): string {
  if (state === "complete") return "#3e8635";
  if (state === "not required") return "#8a8d90";
  return "#6a6e73";
}

export function ChecklistStatesField({ value, onChange, availableChecklistNames }: ChecklistStatesFieldProps) {
  const items = value || [];

  function initializeFromDefinition() {
    const existing = new Set(items.map((i: any) => i.checklistName));
    const newItems = availableChecklistNames
      .filter((name) => !existing.has(name))
      .map((name) => ({ checklistName: name, state: "not complete" }));
    onChange([...items, ...newItems]);
  }

  function updateItem(idx: number, field: string, val: string) {
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#151515' }}>
          Checklist ({items.length})
        </span>
        {availableChecklistNames.length > 0 && (
          <button type="button" onClick={initializeFromDefinition} style={buttonStyle}>
            Initialize from definition
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6a6e73', ...rowStyle, borderBottom: '2px solid #d2d2d2', padding: '4px 0' }}>
          <span>Item</span>
          <span>Status</span>
          <span>Evidence</span>
        </div>
      )}

      {items.map((item: any, idx: number) => (
        <div key={idx} style={rowStyle}>
          <span style={{ fontSize: 13, color: stateColor(item.state || "not complete"), fontWeight: item.state === "complete" ? 600 : 400 }}>
            {item.checklistName || "(unnamed)"}
          </span>
          <select
            value={item.state || "not complete"}
            onChange={(e) => updateItem(idx, "state", e.target.value)}
            style={selectStyle}
          >
            <option value="complete">Complete</option>
            <option value="not complete">Not Complete</option>
            <option value="not required">Not Required</option>
          </select>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <InlineTextField
              value={item.evidence?.uri || ""}
              onChange={(val) => updateItem(idx, "evidence", val ? { name: "Evidence", uri: val } : undefined)}
              placeholder="Evidence URI"
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              style={{ background: 'none', border: 'none', color: '#c9190b', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
              title="Remove"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
