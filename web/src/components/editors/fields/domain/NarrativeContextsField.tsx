"use client";

import { useCallback, type CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';
import { InlineSelectField } from '../base/InlineSelectField';
import { InlineTextArea } from '../base/InlineTextArea';

export type NarrativeContext = {
  seq?: number;
  narrativeElementName?: string;
  context?: string;
};

export type NarrativeContextsFieldProps = {
  value: NarrativeContext[] | undefined;
  onChange: (value: NarrativeContext[]) => void;
  label: string;
  availableNarrativeElements?: string[];
  narrativeElementsData?: Array<{ name?: string; howToUse?: string }>;
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

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #d2d2d2',
  fontSize: 14,
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

export function NarrativeContextsField({ value, onChange, label, availableNarrativeElements, narrativeElementsData }: NarrativeContextsFieldProps) {
  const contexts = value || [];
  const narrativeElementOptions = availableNarrativeElements || [];
  const narrativeElements = narrativeElementsData || [];

  // Helper to get howToUse text for a given element name
  const getHowToUse = (elementName: string): string => {
    const element = narrativeElements.find(el => el.name === elementName);
    return element?.howToUse || '';
  };

  const handleAdd = useCallback(() => {
    onChange([...contexts, { narrativeElementName: '', context: '' }]);
  }, [contexts, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(contexts.filter((_, i) => i !== index));
  }, [contexts, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof NarrativeContext, val: string | number) => {
    const updated = [...contexts];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [contexts, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= contexts.length) return;
    const updated = [...contexts];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [contexts, onChange]);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label || 'Narrative Contexts'}</label>
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
          + Add Context
        </button>
      </div>
      {contexts.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #d2d2d2' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 40 }}>#</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: '30%' }}>Narrative Element</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: '55%' }}>Context</th>
              <th style={{ padding: '6px 10px', width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contexts.map((ctx, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #d2d2d2' }}>
                <td style={{ padding: '6px 10px', fontSize: 11, color: '#6a6e73' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineSelectField
                    value={ctx.narrativeElementName || ''}
                    onChange={(val) => handleUpdate(idx, 'narrativeElementName', val)}
                    options={narrativeElementOptions}
                    placeholder="Select narrative element"
                  />
                  {ctx.narrativeElementName && getHowToUse(ctx.narrativeElementName) && (
                    <div style={{
                      fontSize: 11,
                      color: '#6a6e73',
                      marginTop: 4,
                      fontStyle: 'italic',
                      lineHeight: 1.4
                    }}>
                      {getHowToUse(ctx.narrativeElementName)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextArea
                    value={ctx.context || ''}
                    onChange={(val) => handleUpdate(idx, 'context', val)}
                    placeholder="Context text"
                    minRows={1}
                  />
                </td>
                <td style={{ padding: '6px 10px' }}>
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
                      disabled={idx === contexts.length - 1}
                      style={{
                        ...moveButtonStyle,
                        opacity: idx === contexts.length - 1 ? 0.3 : 1,
                        cursor: idx === contexts.length - 1 ? 'not-allowed' : 'pointer'
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
