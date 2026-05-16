"use client";

import { useCallback, type CSSProperties } from 'react';
import { PropertyTable } from './PropertyTable';
import { PropertyRow } from './PropertyRow';
import { InlineTextField } from './InlineTextField';
import { InlineTextArea } from './InlineTextArea';
import { InlineSelectField } from './InlineSelectField';
import { NarrativeContextsField } from './NarrativeContextsField';

export type NarrativeContext = {
  seq?: number;
  narrativeElementName?: string;
  context?: string;
};

export type Narrative = {
  name?: string;
  description?: string;
  narrativeTypeName?: string;
  narrativeContexts?: NarrativeContext[];
};

export type NarrativesFieldProps = {
  value: Narrative[] | undefined;
  onChange: (value: Narrative[]) => void;
  fieldPath: string;
  readonlyItemNames?: Set<string>;
  availableNarrativeTypeNames?: string[];
  narrativeTypesData?: Array<{ name?: string; narrativeElements?: Array<{ name?: string }> }>;
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
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderLeft: '4px solid #0066cc',
  borderRadius: 4,
  padding: 16,
  marginTop: 16,
  marginBottom: 16,
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

export function NarrativesField({ value, onChange, fieldPath, readonlyItemNames, availableNarrativeTypeNames, narrativeTypesData }: NarrativesFieldProps) {
  const narratives = value || [];
  const narrativeTypeOptions = availableNarrativeTypeNames || [];
  const narrativeTypes = narrativeTypesData || [];

  // Helper function to get narrative element names for a given narrative type name
  const getNarrativeElementsForType = useCallback((narrativeTypeName: string): string[] => {
    if (!narrativeTypeName) return [];
    const narrativeType = narrativeTypes.find(nt => nt.name === narrativeTypeName);
    if (!narrativeType || !Array.isArray(narrativeType.narrativeElements)) return [];
    return narrativeType.narrativeElements
      .map(el => el?.name)
      .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
  }, [narrativeTypes]);

  // Helper function to get full narrative element data for a given narrative type name
  const getNarrativeElementsDataForType = useCallback((narrativeTypeName: string) => {
    if (!narrativeTypeName) return [];
    const narrativeType = narrativeTypes.find(nt => nt.name === narrativeTypeName);
    if (!narrativeType || !Array.isArray(narrativeType.narrativeElements)) return [];
    return narrativeType.narrativeElements;
  }, [narrativeTypes]);

  const handleAdd = useCallback(() => {
    onChange([...narratives, { name: '', description: '', narrativeTypeName: '', narrativeContexts: [] }]);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Narratives</label>
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
      {narratives.map((narrative, idx) => (
        <div key={idx} style={cardStyle}>
          {/* Narrative header row */}
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#6a6e73' }}>#{idx + 1}</span>
              <span>{narrative.name || '(unnamed)'}</span>
              {narrative.narrativeTypeName && (
                <span style={{ fontSize: 13, color: '#0066cc', fontWeight: 600 }}>[{narrative.narrativeTypeName}]</span>
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

          {/* Narrative fields as table */}
          <PropertyTable>
            <PropertyRow label="Name">
              <InlineTextField
                value={narrative.name || ''}
                onChange={(val) => handleUpdate(idx, 'name', val)}
                placeholder="Narrative name"
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={narrative.description || ''}
                onChange={(val) => handleUpdate(idx, 'description', val)}
                placeholder="Description of this narrative"
              />
            </PropertyRow>
            <PropertyRow label="Narrative Type Name">
              <InlineSelectField
                value={narrative.narrativeTypeName || ''}
                onChange={(val) => handleUpdate(idx, 'narrativeTypeName', val)}
                options={narrativeTypeOptions}
                placeholder="Select narrative type"
              />
            </PropertyRow>
          </PropertyTable>

          {/* Narrative Contexts section */}
          <div style={{ marginTop: 16 }}>
            <NarrativeContextsField
              value={narrative.narrativeContexts || []}
              onChange={(contexts) => handleUpdateContexts(idx, contexts)}
              label="Narrative Contexts"
              availableNarrativeElements={getNarrativeElementsForType(narrative.narrativeTypeName || '')}
              narrativeElementsData={getNarrativeElementsDataForType(narrative.narrativeTypeName || '')}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
