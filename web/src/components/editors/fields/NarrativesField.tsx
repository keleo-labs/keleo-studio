"use client";

import { useCallback, type CSSProperties } from 'react';
import { PropertyTable } from './PropertyTable';
import { PropertyRow } from './PropertyRow';
import { InlineTextField } from './InlineTextField';
import { InlineTextArea } from './InlineTextArea';
import { NarrativeContextsField } from './NarrativeContextsField';

export type NarrativeContext = {
  seq?: number;
  narrativeElementName?: string;
  context?: string;
};

export type Narrative = {
  narrativeName?: string;
  narrativeTypeName?: string;
  narrativeContexts?: NarrativeContext[];
  name?: string;
  description?: string;
};

export type NarrativesFieldProps = {
  value: Narrative[] | undefined;
  onChange: (value: Narrative[]) => void;
  fieldPath: string;
  readonlyItemNames?: Set<string>;
};

const moveButtonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 3,
  padding: '2px 6px',
  fontSize: 11,
  cursor: 'pointer',
};

const containerStyle: CSSProperties = {
  marginBottom: 16,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  display: 'block',
  marginBottom: 8,
};

const cardStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.05)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text)',
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
};

const removeButtonStyle: CSSProperties = {
  background: 'rgba(251,113,133,0.15)',
  color: 'rgba(251,113,133,1)',
  border: '1px solid rgba(251,113,133,0.5)',
  borderRadius: 3,
  padding: '2px 6px',
  fontSize: 11,
  cursor: 'pointer',
};

export function NarrativesField({ value, onChange, fieldPath, readonlyItemNames }: NarrativesFieldProps) {
  const narratives = value || [];

  const handleAdd = useCallback(() => {
    onChange([...narratives, { narrativeName: '', narrativeTypeName: '', narrativeContexts: [] }]);
  }, [narratives, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(narratives.filter((_, i) => i !== index));
  }, [narratives, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof Narrative, val: unknown) => {
    const updated = [...narratives];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [narratives, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= narratives.length) return;
    const updated = [...narratives];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [narratives, onChange]);

  const handleUpdateContexts = useCallback((index: number, contexts: NarrativeContext[]) => {
    const updated = [...narratives];
    updated[index] = { ...updated[index], narrativeContexts: contexts };
    onChange(updated);
  }, [narratives, onChange]);

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>Narratives</label>
      {narratives.map((narrative, idx) => (
        <div key={idx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#6a6e73' }}>#{idx + 1}</span>
              <span>{narrative.narrativeName || narrative.name || '(unnamed)'}</span>
              {narrative.narrativeTypeName && (
                <span style={{ fontSize: 12, color: '#6a6e73' }}>[{narrative.narrativeTypeName}]</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => handleMove(idx, idx - 1)}
                disabled={idx === 0}
                style={{
                  ...moveButtonStyle,
                  opacity: idx === 0 ? 0.3 : 1,
                  cursor: idx === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleMove(idx, idx + 1)}
                disabled={idx === narratives.length - 1}
                style={{
                  ...moveButtonStyle,
                  opacity: idx === narratives.length - 1 ? 0.3 : 1,
                  cursor: idx === narratives.length - 1 ? 'not-allowed' : 'pointer'
                }}
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                style={removeButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251,113,133,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(251,113,133,0.15)'}
                title="Remove"
              >
                ×
              </button>
            </div>
          </div>
          <PropertyTable>
            <PropertyRow label="Narrative Name">
              <InlineTextField
                value={narrative.narrativeName || ''}
                onChange={(val) => handleUpdate(idx, 'narrativeName', val)}
                placeholder="Narrative name"
              />
            </PropertyRow>
            <PropertyRow label="Narrative Type Name">
              <InlineTextField
                value={narrative.narrativeTypeName || ''}
                onChange={(val) => handleUpdate(idx, 'narrativeTypeName', val)}
                placeholder="e.g., UserStory, UseCase, Scenario"
              />
            </PropertyRow>
            <PropertyRow label="Name">
              <InlineTextField
                value={narrative.name || ''}
                onChange={(val) => handleUpdate(idx, 'name', val)}
                placeholder="Alternative name"
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={narrative.description || ''}
                onChange={(val) => handleUpdate(idx, 'description', val)}
                placeholder="Description of this narrative"
              />
            </PropertyRow>
            <PropertyRow label="Narrative Contexts">
              <NarrativeContextsField
                value={narrative.narrativeContexts || []}
                onChange={(contexts) => handleUpdateContexts(idx, contexts)}
                label=""
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
      >
        + Add Narrative
      </button>
    </div>
  );
}
