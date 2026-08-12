"use client";

import type { CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';
import { InlineSelectField } from '../base/InlineSelectField';

export type TeamMembersFieldProps = {
  value: Record<string, unknown>[] | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
  personaNames: string[];
};

const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d2d2d2',
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

export function TeamMembersField({ value, onChange, personaNames }: TeamMembersFieldProps) {
  const members = value || [];

  function addMember() {
    onChange([...members, { name: "", personaName: "", contact: "" }]);
  }

  function removeMember(idx: number) {
    onChange(members.filter((_, i) => i !== idx));
  }

  function updateMember(idx: number, field: string, val: string) {
    onChange(members.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#151515' }}>
          Team Members ({members.length})
        </span>
        <button type="button" onClick={addMember} style={buttonStyle}>+ Add Member</button>
      </div>
      {members.map((m: any, idx: number) => (
        <div key={idx} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0066cc' }}>
              {m.name || `Member ${idx + 1}`}
            </span>
            <button type="button" onClick={() => removeMember(idx)} style={removeButtonStyle}>Remove</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={fieldLabelStyle}>Name</span>
              <InlineTextField
                value={m.name || ""}
                onChange={(val) => updateMember(idx, "name", val)}
              />
            </div>
            <div>
              <span style={fieldLabelStyle}>Persona</span>
              <InlineSelectField
                value={m.personaName || ""}
                onChange={(val) => updateMember(idx, "personaName", val)}
                options={personaNames}
                placeholder="Select persona..."
              />
            </div>
            <div>
              <span style={fieldLabelStyle}>Contact</span>
              <InlineTextField
                value={m.contact || ""}
                onChange={(val) => updateMember(idx, "contact", val)}
                placeholder="email, chat handle, etc."
              />
            </div>
            <div>
              <span style={fieldLabelStyle}>Started</span>
              <InlineTextField
                value={m.started || ""}
                onChange={(val) => updateMember(idx, "started", val)}
                placeholder="ISO date (optional)"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
