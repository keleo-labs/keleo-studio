"use client";

import { useCallback, useMemo, type CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';

export type TagType = 'domain' | 'lifecycle' | 'organizational';

export type TagEntry = {
  type: TagType;
  value: string;
};

export type TagsFieldProps = {
  value: {
    domainTags?: string[];
    lifecycleTags?: string[];
    organizationalTags?: string[];
  } | string[] | undefined;
  onChange: (value: { domainTags?: string[]; lifecycleTags?: string[]; organizationalTags?: string[] }) => void;
  fieldPath: string;
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

const selectStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

export function TagsField({ value, onChange, fieldPath }: TagsFieldProps) {
  // Normalize value to object format
  const normalized = Array.isArray(value)
    ? { lifecycleTags: value, domainTags: [], organizationalTags: [] }
    : value || { domainTags: [], lifecycleTags: [], organizationalTags: [] };

  // Convert grouped tags to flat list for editing
  const tags = useMemo<TagEntry[]>(() => {
    const result: TagEntry[] = [];
    (normalized.domainTags || []).forEach(tag => result.push({ type: 'domain', value: tag }));
    (normalized.lifecycleTags || []).forEach(tag => result.push({ type: 'lifecycle', value: tag }));
    (normalized.organizationalTags || []).forEach(tag => result.push({ type: 'organizational', value: tag }));
    return result;
  }, [normalized]);

  // Convert flat list back to grouped format
  const updateTags = useCallback((newTags: TagEntry[]) => {
    const domainTags: string[] = [];
    const lifecycleTags: string[] = [];
    const organizationalTags: string[] = [];

    newTags.forEach(tag => {
      // Keep tags even if empty to allow editing
      const trimmed = tag.value.trim();
      if (tag.type === 'domain') domainTags.push(trimmed);
      else if (tag.type === 'lifecycle') lifecycleTags.push(trimmed);
      else if (tag.type === 'organizational') organizationalTags.push(trimmed);
    });

    onChange({ domainTags, lifecycleTags, organizationalTags });
  }, [onChange]);

  const handleAdd = useCallback(() => {
    updateTags([...tags, { type: 'domain', value: '' }]);
  }, [tags, updateTags]);

  const handleRemove = useCallback((index: number) => {
    updateTags(tags.filter((_, i) => i !== index));
  }, [tags, updateTags]);

  const handleUpdateType = useCallback((index: number, type: TagType) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], type };
    updateTags(updated);
  }, [tags, updateTags]);

  const handleUpdateValue = useCallback((index: number, value: string) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], value };
    updateTags(updated);
  }, [tags, updateTags]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tags.length) return;
    const updated = [...tags];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    updateTags(updated);
  }, [tags, updateTags]);

  return (
    <div style={containerStyle}>
      {tags.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 40 }}>#</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12, width: 150 }}>Type</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Tag</th>
              <th style={{ padding: '6px 10px', width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', fontSize: 11, color: '#6a6e73' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <select
                    value={tag.type}
                    onChange={(e) => handleUpdateType(idx, e.target.value as TagType)}
                    style={selectStyle}
                  >
                    <option value="domain">Domain</option>
                    <option value="lifecycle">Lifecycle</option>
                    <option value="organizational">Organizational</option>
                  </select>
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <InlineTextField
                    value={tag.value}
                    onChange={(val) => handleUpdateValue(idx, val)}
                    placeholder="Tag value"
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
                      disabled={idx === tags.length - 1}
                      style={{
                        ...moveButtonStyle,
                        opacity: idx === tags.length - 1 ? 0.3 : 1,
                        cursor: idx === tags.length - 1 ? 'not-allowed' : 'pointer'
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
        + Add Tag
      </button>
    </div>
  );
}
