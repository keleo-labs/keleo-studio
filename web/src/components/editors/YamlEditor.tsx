"use client";

import { useCallback, useEffect, useState } from 'react';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { linter, Diagnostic } from '@codemirror/lint';
import { Extension } from '@codemirror/state';
import { CodeEditor } from './CodeEditor';
import { validateYamlSyntax } from '@/lib/yaml-json-converter';

export type YamlEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onValidationChange?: (errors: string[]) => void;
  readOnly?: boolean;
  height?: string;
};

export function YamlEditor({
  value,
  onChange,
  onValidationChange,
  readOnly = false,
  height = '600px',
}: YamlEditorProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // YAML syntax linter
  const yamlLinter = useCallback(() => {
    return linter((view) => {
      const diagnostics: Diagnostic[] = [];
      const doc = view.state.doc.toString();

      const result = validateYamlSyntax(doc);

      if (!result.ok && result.error) {
        setValidationErrors([result.error]);

        // Try to extract line number from error message
        const lineMatch = result.error.match(/line (\d+)/i);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1], 10);
          const line = view.state.doc.line(Math.min(lineNum, view.state.doc.lines));
          diagnostics.push({
            from: line.from,
            to: line.to,
            severity: 'error',
            message: result.error,
          });
        } else {
          // If we can't determine position, mark the beginning
          diagnostics.push({
            from: 0,
            to: 1,
            severity: 'error',
            message: result.error,
          });
        }
      } else {
        setValidationErrors([]);
      }

      return diagnostics;
    });
  }, []);

  useEffect(() => {
    onValidationChange?.(validationErrors);
  }, [validationErrors, onValidationChange]);

  const extensions: Extension[] = [
    StreamLanguage.define(yaml),
    yamlLinter(),
  ];

  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={extensions}
      readOnly={readOnly}
      height={height}
      placeholder="Enter YAML..."
    />
  );
}
