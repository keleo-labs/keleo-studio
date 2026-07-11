"use client";

import { useCallback, useRef, useEffect, useState, type CSSProperties } from 'react';

export type InlineTextAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
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

export function InlineTextArea({
  value,
  onChange,
  onBlur: onBlurProp,
  placeholder,
  disabled,
  minRows = 2,
}: InlineTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(minRows);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  useEffect(() => {
    if (textareaRef.current) {
      const lineCount = value.split('\n').length;
      setRows(Math.max(minRows, lineCount));
    }
  }, [value, minRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{
        ...textareaStyle,
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
          onBlurProp?.(e.target.value);
        }
      }}
    />
  );
}
