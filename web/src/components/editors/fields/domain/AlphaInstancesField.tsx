"use client";

import { useCallback, type CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';
import { InlineSelectField } from '../base/InlineSelectField';
import { InlineTextArea } from '../base/InlineTextArea';

export type AlphaInstance = {
  alphaName?: string;
  stateName?: string;
  name?: string;
  description?: string;
};

export type AlphaInstancesFieldProps = {
  value: AlphaInstance[] | undefined;
  onChange: (value: AlphaInstance[]) => void;
  label: string;
  alphaNames: string[];
  stateNamesByAlpha: Map<string, string[]>;
  alphaInstanceNames: string[];
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

export function AlphaInstancesField({ value, onChange, label, alphaNames, stateNamesByAlpha, alphaInstanceNames }: AlphaInstancesFieldProps) {
  const instances = value || [];

  const handleAdd = useCallback(() => {
    onChange([...instances, { name: '', alphaName: '', stateName: '' }]);
  }, [instances, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(instances.filter((_, i) => i !== index));
  }, [instances, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof AlphaInstance, val: string) => {
    const updated = [...instances];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [instances, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= instances.length) return;
    const updated = [...instances];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [instances, onChange]);

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      {instances.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 40 }}>#</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Instance Name</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Alpha</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>State</th>
              <th style={{ padding: '6px 10px', width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance, idx) => {
              const selectedAlpha = instance.alphaName || '';
              const availableStates = stateNamesByAlpha.get(selectedAlpha) || [];

              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontSize: 11, color: '#6a6e73' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <InlineSelectField
                      value={instance.name || ''}
                      onChange={(val) => handleUpdate(idx, 'name', val)}
                      options={alphaInstanceNames}
                      placeholder="Select instance..."
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <InlineSelectField
                      value={instance.alphaName || ''}
                      onChange={(val) => handleUpdate(idx, 'alphaName', val)}
                      options={alphaNames}
                      placeholder="Select alpha..."
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <InlineSelectField
                      value={instance.stateName || ''}
                      onChange={(val) => handleUpdate(idx, 'stateName', val)}
                      options={availableStates}
                      placeholder="Select state..."
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
                      disabled={idx === instances.length - 1}
                      style={{
                        ...moveButtonStyle,
                        opacity: idx === instances.length - 1 ? 0.3 : 1,
                        cursor: idx === instances.length - 1 ? 'not-allowed' : 'pointer'
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
            );
            })}
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
        + Add Instance
      </button>
    </div>
  );
}
