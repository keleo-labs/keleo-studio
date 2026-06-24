"use client";

import { useState, useCallback, type CSSProperties, type ReactNode } from 'react';

export type SectionProps = {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  badge?: string | number;
};

const sectionStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.1)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  marginBottom: 16,
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: 'rgba(0,0,0,0.15)',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const headerNonCollapsibleStyle: CSSProperties = {
  ...headerStyle,
  cursor: 'default',
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const badgeStyle: CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
};

const chevronStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  transition: 'transform 0.2s',
};

const contentStyle: CSSProperties = {
  padding: 16,
};

export function Section({
  title,
  children,
  defaultExpanded = true,
  collapsible = true,
  badge,
}: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  }, [collapsible]);

  return (
    <div style={sectionStyle}>
      <div
        style={collapsible ? headerStyle : headerNonCollapsibleStyle}
        onClick={toggleExpanded}
        onMouseEnter={(e) => {
          if (collapsible) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (collapsible) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.15)';
          }
        }}
      >
        <div style={titleStyle}>
          {collapsible && (
            <span
              style={{
                ...chevronStyle,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              ▶
            </span>
          )}
          {title}
          {badge !== undefined && <span style={badgeStyle}>{badge}</span>}
        </div>
      </div>
      {isExpanded && <div style={contentStyle}>{children}</div>}
    </div>
  );
}
