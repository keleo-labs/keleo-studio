"use client";

import { type CSSProperties } from 'react';

export type InlineReadonlyValueProps = {
  value: string;
  source?: "baseline" | "dependency";
};

const readonlyStyle: CSSProperties = {
  padding: '6px 10px',
  background: 'rgba(0,0,0,0.03)',
  border: '1px dashed var(--border)',
  borderRadius: 4,
  fontSize: 14,
  color: 'var(--muted)',
  fontStyle: 'italic',
  fontFamily: 'inherit',
  minHeight: 34,
  display: 'flex',
  alignItems: 'center',
};

const badgeStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--muted)',
  background: 'rgba(0,0,0,0.15)',
  padding: '2px 6px',
  borderRadius: 3,
  marginLeft: 8,
  textTransform: 'uppercase',
  fontStyle: 'normal',
};

export function InlineReadonlyValue({ value, source }: InlineReadonlyValueProps) {
  return (
    <div style={readonlyStyle}>
      <span>{value || <span style={{ color: 'var(--muted)', opacity: 0.6 }}>(empty)</span>}</span>
      {source && (
        <span style={badgeStyle}>
          {source === "baseline" ? "from baseline" : "from dependency"}
        </span>
      )}
    </div>
  );
}
