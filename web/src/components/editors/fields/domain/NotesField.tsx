"use client";

import type { CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';
import { InlineTextArea } from '../base/InlineTextArea';

export type NotesFieldProps = {
  value: Record<string, unknown>[] | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
  label?: string;
};

const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderLeft: '4px solid #6a6e73',
  borderRadius: 4,
  padding: 12,
  marginBottom: 8,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6a6e73',
  marginBottom: 2,
  display: 'block',
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

export function NotesField({ value, onChange, label }: NotesFieldProps) {
  const notes = value || [];

  function addNote() {
    onChange([...notes, { name: "", timestamp: new Date().toISOString(), content: "" }]);
  }

  function removeNote(idx: number) {
    onChange(notes.filter((_, i) => i !== idx));
  }

  function updateNote(idx: number, field: string, val: string) {
    const updated = notes.map((n, i) =>
      i === idx ? { ...n, [field]: val } : n
    );
    onChange(updated);
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#151515' }}>
          {label || "Notes"} ({notes.length})
        </span>
        <button type="button" onClick={addNote} style={buttonStyle}>+ Add Note</button>
      </div>
      {notes.map((note: any, idx: number) => (
        <div key={idx} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#6a6e73' }}>
              {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ""}
            </span>
            <button type="button" onClick={() => removeNote(idx)} style={removeButtonStyle}>Remove</button>
          </div>
          <div>
            <span style={fieldLabelStyle}>Title</span>
            <InlineTextField
              value={note.name || ""}
              onChange={(val) => updateNote(idx, "name", val)}
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={fieldLabelStyle}>Content</span>
            <InlineTextArea
              value={note.content || ""}
              onChange={(val) => updateNote(idx, "content", val)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
