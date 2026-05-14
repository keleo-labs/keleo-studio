"use client";

import { type CSSProperties } from 'react';

export type InlineSelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowEmpty?: boolean;
};

const selectStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '5px 8px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};

export function InlineSelectField({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  allowEmpty = true,
}: InlineSelectFieldProps) {
  // If current value is not in options, include it so select doesn't break
  const valueNotInOptions = value && !options.includes(value);
  const allOptions = valueNotInOptions ? [value, ...options] : options;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {allowEmpty && <option value="">{placeholder}</option>}
      {allOptions.map((option) => (
        <option key={option} value={option}>
          {option}{option === value && valueNotInOptions ? ' (current - not found in library)' : ''}
        </option>
      ))}
    </select>
  );
}
