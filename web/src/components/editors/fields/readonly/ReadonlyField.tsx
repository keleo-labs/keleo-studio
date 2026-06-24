"use client";

import { type CSSProperties } from 'react';

export type ReadonlyFieldProps = {
  value: string;
  label: string;
  description?: string;
  source: "baseline" | "dependency";
  fieldPath: string;
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  display: 'block',
  marginBottom: 6,
};

const descriptionStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  marginBottom: 6,
};

const readonlyBoxStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.1)',
  color: 'var(--muted)',
  border: '1px dashed var(--border)',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  fontStyle: 'italic',
  cursor: 'not-allowed',
  userSelect: 'none',
};

const badgeStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  background: 'rgba(0,0,0,0.2)',
  padding: '2px 6px',
  borderRadius: 4,
  marginLeft: 8,
  textTransform: 'uppercase' as const,
};

export function ReadonlyField({
  value,
  label,
  description,
  source,
  fieldPath,
}: ReadonlyFieldProps) {
  return (
    <div style={{ marginBottom: 16, opacity: 0.7 }}>
      <label style={labelStyle}>
        {label}
        <span style={badgeStyle}>
          {source === "baseline" ? "from baseline" : "from dependency"}
        </span>
      </label>
      {description && <div style={descriptionStyle}>{description}</div>}
      <div style={readonlyBoxStyle}>
        {value || <span style={{ color: 'var(--muted)' }}>(empty)</span>}
      </div>
    </div>
  );
}
