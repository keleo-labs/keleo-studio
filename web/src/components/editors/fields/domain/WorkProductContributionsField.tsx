"use client";

import { useCallback, type CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';

export type WorkProductContribution = {
  workProductName?: string;
  levelOfDetailName?: string;
};

export type WorkProductContributionsFieldProps = {
  value: WorkProductContribution[] | undefined;
  onChange: (value: WorkProductContribution[]) => void;
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

export function WorkProductContributionsField({ value, onChange, label }: WorkProductContributionsFieldProps) {
  const contributions = value || [];

  const handleAdd = useCallback(() => {
    onChange([...contributions, { workProductName: '', levelOfDetailName: '' }]);
  }, [contributions, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(contributions.filter((_, i) => i !== index));
  }, [contributions, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof WorkProductContribution, val: string) => {
    const updated = [...contributions];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [contributions, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= contributions.length) return;
    const updated = [...contributions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [contributions, onChange]);

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      {contributions.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 40 }}>#</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Work Product</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Level of Detail</th>
              <th style={{ padding: '6px 10px', width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contrib, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', fontSize: 11, color: '#6a6e73' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextField
                    value={contrib.workProductName || ''}
                    onChange={(val) => handleUpdate(idx, 'workProductName', val)}
                    placeholder="Work product name"
                  />
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextField
                    value={contrib.levelOfDetailName || ''}
                    onChange={(val) => handleUpdate(idx, 'levelOfDetailName', val)}
                    placeholder="Level of detail"
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
                      disabled={idx === contributions.length - 1}
                      style={{
                        ...moveButtonStyle,
                        opacity: idx === contributions.length - 1 ? 0.3 : 1,
                        cursor: idx === contributions.length - 1 ? 'not-allowed' : 'pointer'
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
        + Add Evidence
      </button>
    </div>
  );
}
