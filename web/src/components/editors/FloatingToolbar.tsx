"use client";

import { useEffect, useState, type CSSProperties } from 'react';
import type { FocusedField } from '@/hooks/useFocusTracking';

export type FloatingToolbarProps = {
  focusedField: FocusedField | null;
  editorPanelId?: string;
};

const toolbarStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  width: 70,
  height: 'fit-content',
  alignSelf: 'flex-start',
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  transition: 'opacity 0.15s ease-in-out',
  pointerEvents: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 100,
  flexShrink: 0,
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.1)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 18,
  cursor: 'pointer',
  color: 'var(--text)',
  transition: 'all 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  left: '100%',
  marginLeft: 8,
  background: 'rgba(0,0,0,0.9)',
  color: 'white',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: 12,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 101,
};

type ToolbarAction = {
  icon: string;
  label: string;
  action: string;
};

const actions: ToolbarAction[] = [
  { icon: '📋', label: 'Copy field path', action: 'copy' },
  { icon: 'ℹ️', label: 'Field info', action: 'info' },
  { icon: '🔍', label: 'Inspect value', action: 'inspect' },
];

export function FloatingToolbar({
  focusedField,
  editorPanelId = 'editor-panel',
}: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(!!focusedField);
  }, [focusedField]);

  const handleAction = (action: string) => {
    if (!focusedField) return;

    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(focusedField.path);
        console.log('Copied field path:', focusedField.path);
        break;
      case 'info':
        console.log('Field info:', focusedField);
        break;
      case 'inspect':
        console.log('Field path:', focusedField.path);
        break;
    }
  };

  return (
    <div
      style={{
        ...toolbarStyle,
        opacity: isVisible ? 1 : 0.3,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* Toolbar title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--muted)',
          textAlign: 'center',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Tools
      </div>

      {actions.map((action) => (
        <div key={action.action} style={{ position: 'relative' }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => handleAction(action.action)}
            onMouseEnter={(e) => {
              setHoveredAction(action.action);
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              setHoveredAction(null);
              e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            title={action.label}
          >
            {action.icon}
          </button>
          {hoveredAction === action.action && (
            <div style={tooltipStyle}>{action.label}</div>
          )}
        </div>
      ))}

      {/* Field path indicator */}
      {focusedField && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 4,
            fontSize: 9,
            color: 'var(--muted)',
            wordBreak: 'break-all',
            lineHeight: 1.3,
          }}
        >
          {focusedField.path}
        </div>
      )}
    </div>
  );
}
