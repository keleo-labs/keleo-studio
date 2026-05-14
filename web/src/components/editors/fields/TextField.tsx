"use client";

import { useCallback, useRef, type CSSProperties } from 'react';

export type TextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  fieldPath: string;
  error?: string;
  disabled?: boolean;
  type?: string;
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

const inputStyle: CSSProperties = {
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
};

const inputFocusStyle: CSSProperties = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 1px var(--accent)',
};

const inputErrorStyle: CSSProperties = {
  borderColor: 'rgba(251,113,133,0.8)',
};

const errorTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'rgba(251,113,133,1)',
  marginTop: 4,
};

export function TextField({
  value,
  onChange,
  label,
  description,
  required,
  placeholder,
  fieldPath,
  error,
  disabled,
  type = "text",
}: TextFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: 'rgba(251,113,133,1)', marginLeft: 4 }}>*</span>}
      </label>
      {description && <div style={descriptionStyle}>{description}</div>}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputStyle,
          ...(error ? inputErrorStyle : {}),
          ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
        }}
        onMouseEnter={(e) => {
          if (!error && !disabled) {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget && !error && !disabled) {
            e.currentTarget.style.borderColor = 'var(--border)';
          }
        }}
      />
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}
