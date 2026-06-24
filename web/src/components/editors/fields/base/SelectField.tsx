"use client";

import { useCallback, useRef, type CSSProperties } from 'react';

export type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  fieldPath: string;
  error?: string;
  placeholder?: string;
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

const selectStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  cursor: 'pointer',
};

const selectErrorStyle: CSSProperties = {
  borderColor: 'rgba(251,113,133,0.8)',
};

const errorTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'rgba(251,113,133,1)',
  marginTop: 4,
};

export function SelectField({
  value,
  onChange,
  label,
  description,
  required,
  options,
  fieldPath,
  error,
  placeholder = 'Select...',
}: SelectFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: 'rgba(251,113,133,1)', marginLeft: 4 }}>*</span>}
      </label>
      {description && <div style={descriptionStyle}>{description}</div>}
      <select
        value={value}
        onChange={handleChange}
        style={{
          ...selectStyle,
          ...(error ? selectErrorStyle : {}),
        }}
        onMouseEnter={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget && !error) {
            e.currentTarget.style.borderColor = 'var(--border)';
          }
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}
