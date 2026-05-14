"use client";

import { useCallback, useEffect, useState } from 'react';
import { json } from '@codemirror/lang-json';
import { linter, Diagnostic } from '@codemirror/lint';
import { Extension } from '@codemirror/state';
import { CodeEditor } from './CodeEditor';

export type JsonEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onValidationChange?: (errors: string[]) => void;
  readOnly?: boolean;
  height?: string;
};

export function JsonEditor({
  value,
  onChange,
  onValidationChange,
  readOnly = false,
  height = '600px',
}: JsonEditorProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // JSON syntax linter
  const jsonLinter = useCallback(() => {
    return linter((view) => {
      const diagnostics: Diagnostic[] = [];
      const doc = view.state.doc.toString();

      try {
        JSON.parse(doc);
        setValidationErrors([]);
      } catch (error) {
        if (error instanceof Error) {
          const errorMessage = error.message;
          setValidationErrors([errorMessage]);

          // Try to extract position from error message
          const positionMatch = errorMessage.match(/position (\d+)/i);
          if (positionMatch) {
            const pos = parseInt(positionMatch[1], 10);
            diagnostics.push({
              from: Math.max(0, pos - 1),
              to: Math.min(doc.length, pos + 1),
              severity: 'error',
              message: errorMessage,
            });
          } else {
            // If we can't determine position, mark the beginning
            diagnostics.push({
              from: 0,
              to: 1,
              severity: 'error',
              message: errorMessage,
            });
          }
        }
      }

      return diagnostics;
    });
  }, []);

  useEffect(() => {
    onValidationChange?.(validationErrors);
  }, [validationErrors, onValidationChange]);

  const extensions: Extension[] = [
    json(),
    jsonLinter(),
  ];

  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={extensions}
      readOnly={readOnly}
      height={height}
      placeholder="Enter JSON..."
    />
  );
}
