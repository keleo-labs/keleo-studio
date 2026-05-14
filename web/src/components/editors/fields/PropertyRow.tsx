"use client";

import { type CSSProperties, type ReactNode } from 'react';

export type PropertyRowProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  readonly?: boolean;
  description?: string;
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '200px 1fr',
  gap: '16px',
  padding: '12px 0',
  borderBottom: '1px solid var(--border)',
  alignItems: 'start',
};

const labelCellStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  paddingTop: '8px',
};

const valueCellStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--text)',
};

const descriptionStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  marginTop: 4,
  fontStyle: 'italic',
};

export function PropertyRow({ label, children, required, readonly, description }: PropertyRowProps) {
  return (
    <div style={{ ...rowStyle, opacity: readonly ? 0.7 : 1 }}>
      <div style={labelCellStyle}>
        {label}
        {required && <span style={{ color: 'rgba(251,113,133,1)', marginLeft: 4 }}>*</span>}
        {readonly && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>🔒</span>}
      </div>
      <div style={valueCellStyle}>
        {children}
        {description && <div style={descriptionStyle}>{description}</div>}
      </div>
    </div>
  );
}
