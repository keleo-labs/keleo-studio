"use client";

import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { useTheme } from '@/lib/display/theme';

export type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  language?: Extension;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
};

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '600px',
  placeholder,
}: CodeEditorProps) {
  const { themeId } = useTheme();

  const handleChange = useCallback((val: string) => {
    onChange?.(val);
  }, [onChange]);

  // CodeMirror theme based on app theme
  const theme = useMemo(() => {
    return EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      '.cm-content': {
        padding: '16px 0',
      },
      '.cm-gutters': {
        backgroundColor: themeId === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
        borderRight: `1px solid ${themeId === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        color: themeId === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: themeId === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
      },
    }, { dark: themeId === 'dark' });
  }, [themeId]);

  const extensions = useMemo(() => {
    const exts: Extension[] = [theme];
    if (language) {
      exts.push(language);
    }
    if (readOnly) {
      exts.push(EditorView.editable.of(false));
    }
    return exts;
  }, [theme, language, readOnly]);

  return (
    <div style={{
      width: '100%',
      height,
      background: themeId === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme={themeId === 'dark' ? 'dark' : 'light'}
        height={height}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
        }}
      />
    </div>
  );
}
