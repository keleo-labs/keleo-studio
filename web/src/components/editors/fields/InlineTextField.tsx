"use client";

import { useCallback, type CSSProperties } from 'react';

export type InlineTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
};

const inputStyle: CSSProperties = {
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
};

export function InlineTextField({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: InlineTextFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...inputStyle,
        ...(disabled ? { opacity: 0.6, cursor: 'not-allowed', background: 'rgba(0,0,0,0.02)' } : {}),
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
        }
      }}
      onBlur={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }
      }}
    />
  );
}
