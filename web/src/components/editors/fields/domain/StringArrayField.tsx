"use client";

import { useCallback, type CSSProperties } from 'react';

export type StringArrayFieldProps = {
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  label: string;
  placeholder?: string;
  description?: string;
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

const textareaStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.05)',
  color: 'var(--text)',
  border: '1px solid transparent',
  borderRadius: 4,
  padding: '6px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
  resize: 'vertical',
  minHeight: 60,
};

export function StringArrayField({
  value,
  onChange,
  label,
  placeholder,
  description,
}: StringArrayFieldProps) {
  const items = value || [];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
    onChange(lines);
  }, [onChange]);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {description && <div style={descriptionStyle}>{description}</div>}
      <textarea
        value={items.join('\n')}
        onChange={handleChange}
        placeholder={placeholder || 'One item per line'}
        rows={Math.max(2, items.length)}
        style={textareaStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }}
      />
    </div>
  );
}
