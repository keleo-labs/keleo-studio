"use client";

import { type CSSProperties, type ReactNode } from 'react';

export type PropertyTableProps = {
  children: ReactNode;
  title?: string;
};

const containerStyle: CSSProperties = {
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '2px solid var(--border)',
};

const tableStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.02)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  overflow: 'hidden',
};

export function PropertyTable({ children, title }: PropertyTableProps) {
  return (
    <div style={containerStyle}>
      {title && <div style={titleStyle}>{title}</div>}
      <div style={tableStyle}>
        {children}
      </div>
    </div>
  );
}
