"use client";

import { useCallback, type CSSProperties } from 'react';
import { PropertyTable } from './PropertyTable';
import { PropertyRow } from './PropertyRow';
import { InlineTextField } from './InlineTextField';
import { InlineTextArea } from './InlineTextArea';
import { StringArrayField } from './StringArrayField';

export type Citation = {
  name?: string;
  description?: string;
  authors?: string[];
  date?: string;
  source?: string;
};

export type CitationsFieldProps = {
  value: Citation[] | undefined;
  onChange: (value: Citation[]) => void;
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
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderLeft: '4px solid #0066cc',
  borderRadius: 4,
  padding: 16,
  marginTop: 16,
  marginBottom: 16,
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

export function CitationsField({ value, onChange, fieldPath, readonlyItemNames }: CitationsFieldProps) {
  const citations = value || [];

  const handleAdd = useCallback(() => {
    onChange([...citations, { name: '', description: '', authors: [], date: '', source: '' }]);
  }, [citations, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(citations.filter((_, i) => i !== index));
  }, [citations, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof Citation, val: unknown) => {
    const updated = [...citations];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [citations, onChange]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= citations.length) return;
    const updated = [...citations];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  }, [citations, onChange]);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Citations</label>
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
          + Add Citation
        </button>
      </div>
      {citations.map((citation, idx) => {
        const isReadonly = readonlyItemNames?.has(citation.name ?? '');
        return (
          <div key={idx} style={cardStyle}>
            {/* Citation header row */}
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
                <span>{citation.name || '(unnamed citation)'}</span>
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
                  disabled={idx === citations.length - 1}
                  style={{
                    ...moveButtonStyle,
                    opacity: idx === citations.length - 1 ? 0.3 : 1,
                    cursor: idx === citations.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move down"
                >
                  ↓
                </button>
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    style={removeButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Citation fields */}
            <PropertyTable>
              <PropertyRow label="Title" info="The name/title of the work being cited (e.g., book title, article title)">
                <InlineTextField
                  value={citation.name || ''}
                  onChange={(val) => handleUpdate(idx, 'name', val)}
                  placeholder="e.g., Team Topologies: Organizing Business and Technology Teams for Fast Flow"
                  readonly={isReadonly}
                />
              </PropertyRow>

              <PropertyRow label="Description" info="Brief description of the work">
                <InlineTextArea
                  value={citation.description || ''}
                  onChange={(val) => handleUpdate(idx, 'description', val)}
                  placeholder="Authoritative framework for scaling interaction models."
                  readonly={isReadonly}
                  rows={2}
                />
              </PropertyRow>

              <PropertyRow label="Authors" info="Authors, organizations, or groups responsible for the work">
                <StringArrayField
                  value={citation.authors || []}
                  onChange={(val) => handleUpdate(idx, 'authors', val)}
                  placeholder="e.g., Skelton, M."
                  readonly={isReadonly}
                />
              </PropertyRow>

              <PropertyRow label="Date" info="Publication date (typically year, e.g., '2019')">
                <InlineTextField
                  value={citation.date || ''}
                  onChange={(val) => handleUpdate(idx, 'date', val)}
                  placeholder="e.g., 2019"
                  readonly={isReadonly}
                />
              </PropertyRow>

              <PropertyRow label="Source" info="Publisher, journal, or URL where the work can be retrieved">
                <InlineTextField
                  value={citation.source || ''}
                  onChange={(val) => handleUpdate(idx, 'source', val)}
                  placeholder="e.g., IT Revolution Press or https://example.com/paper.pdf"
                  readonly={isReadonly}
                />
              </PropertyRow>
            </PropertyTable>
          </div>
        );
      })}
    </div>
  );
}
