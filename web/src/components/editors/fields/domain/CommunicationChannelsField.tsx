"use client";

import type { CSSProperties } from 'react';
import { InlineTextField } from '../base/InlineTextField';

export type CommunicationChannelsFieldProps = {
  value: Record<string, unknown>[] | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  padding: '8px 12px',
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderRadius: 4,
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
  flexShrink: 0,
};

export function CommunicationChannelsField({ value, onChange }: CommunicationChannelsFieldProps) {
  const channels = value || [];

  function addChannel() {
    onChange([...channels, { name: "", address: "" }]);
  }

  function removeChannel(idx: number) {
    onChange(channels.filter((_, i) => i !== idx));
  }

  function updateChannel(idx: number, field: string, val: string) {
    onChange(channels.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#151515' }}>
          Communication Channels ({channels.length})
        </span>
        <button type="button" onClick={addChannel} style={buttonStyle}>+ Add Channel</button>
      </div>
      {channels.map((ch: any, idx: number) => (
        <div key={idx} style={rowStyle}>
          <div style={{ flex: 1 }}>
            <span style={fieldLabelStyle}>Name</span>
            <InlineTextField
              value={ch.name || ""}
              onChange={(val) => updateChannel(idx, "name", val)}
              placeholder="e.g. Slack, Email"
            />
          </div>
          <div style={{ flex: 2 }}>
            <span style={fieldLabelStyle}>Address</span>
            <InlineTextField
              value={ch.address || ""}
              onChange={(val) => updateChannel(idx, "address", val)}
              placeholder="e.g. #team-channel, team@example.com"
            />
          </div>
          <button type="button" onClick={() => removeChannel(idx)} style={removeButtonStyle}>Remove</button>
        </div>
      ))}
    </div>
  );
}
