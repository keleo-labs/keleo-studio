"use client";

import { useCallback, type CSSProperties } from 'react';
import { InlineTextField } from './InlineTextField';

export type CompetencyLevelReference = {
  competencyName?: string;
  competencyLevelName?: string;
};

export type CompetencyLevelReferencesFieldProps = {
  value: CompetencyLevelReference[] | undefined;
  onChange: (value: CompetencyLevelReference[]) => void;
  label: string;
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
  border: '1px solid var(--border)',
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

export function CompetencyLevelReferencesField({ value, onChange, label }: CompetencyLevelReferencesFieldProps) {
  const references = value || [];

  const handleAdd = useCallback(() => {
    onChange([...references, { competencyName: '', competencyLevelName: '' }]);
  }, [references, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(references.filter((_, i) => i !== index));
  }, [references, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof CompetencyLevelReference, val: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [references, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= references.length) return;
    const updated = [...references];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [references, onChange]);

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      {references.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 40 }}>#</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Competency</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Level</th>
              <th style={{ padding: '6px 10px', width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {references.map((ref, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', fontSize: 11, color: '#6a6e73' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextField
                    value={ref.competencyName || ''}
                    onChange={(val) => handleUpdate(idx, 'competencyName', val)}
                    placeholder="Competency name"
                  />
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextField
                    value={ref.competencyLevelName || ''}
                    onChange={(val) => handleUpdate(idx, 'competencyLevelName', val)}
                    placeholder="Level name"
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
                      disabled={idx === references.length - 1}
                      style={{
                        ...moveButtonStyle,
                        opacity: idx === references.length - 1 ? 0.3 : 1,
                        cursor: idx === references.length - 1 ? 'not-allowed' : 'pointer'
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
        + Add Competency Level
      </button>
    </div>
  );
}
