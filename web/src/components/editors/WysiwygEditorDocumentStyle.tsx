"use client";

import { useCallback, type CSSProperties } from 'react';
import { PropertyTable } from './fields/PropertyTable';
import { PropertyRow } from './fields/PropertyRow';
import { InlineTextField } from './fields/InlineTextField';
import { InlineTextArea } from './fields/InlineTextArea';
import { InlineReadonlyValue } from './fields/InlineReadonlyValue';
import { TagsField } from './fields/TagsField';
import { NarrativesField } from './fields/NarrativesField';
import { Section } from './fields/Section';
import { setValueAtPath } from '@/lib/json-path-utils';
import type { ElementSourceMap } from '@/lib/elementSourceTracking';
import type { PracticeBaseline } from '@/lib/types';
import { canonicalPracticeElementName } from '@/lib/ir';

/**
 * Document-style WYSIWYG editor that looks more like the browse view.
 * Properties are displayed in a two-column table format:
 * - Column 1: Property name
 * - Column 2: Editable value
 *
 * This makes the editor more readable and compact vertically.
 */

export type WysiwygEditorDocumentStyleProps = {
  doc: Record<string, unknown>;
  onChange: (doc: Record<string, unknown>) => void;
  kind: 'extension' | 'baseline';
  resolvedBaseline?: PracticeBaseline | null;
  elementSourceMap?: ElementSourceMap;
};

const containerStyle: CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '24px',
  fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--text)',
  marginTop: 48,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '2px solid var(--border)',
};

const alphaCardStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.02)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 24,
  marginBottom: 24,
};

const alphaHeaderStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--accent)',
  marginBottom: 16,
};

const stateCardStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.03)',
  border: '1px solid var(--border)',
  borderLeft: '4px solid var(--accent)',
  borderRadius: 4,
  padding: 16,
  marginTop: 16,
  marginBottom: 16,
};

const stateHeaderStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 12,
};

export function WysiwygEditorDocumentStyle({
  doc,
  onChange,
  kind,
  resolvedBaseline,
  elementSourceMap,
}: WysiwygEditorDocumentStyleProps) {
  const updateField = useCallback((path: string, value: any) => {
    const updated = setValueAtPath(doc, path, value);
    onChange(updated);
  }, [doc, onChange]);

  const name = (doc.name as string) || '';
  const description = (doc.description as string) || '';
  const baselinePracticeName = (doc.baselinePracticeName as string) || '';
  const version = (doc.version as string) || '';
  const alphas = Array.isArray(doc.alphas) ? doc.alphas : [];

  return (
    <div style={containerStyle}>
      {/* Practice Header */}
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
        {name || 'Untitled Practice'}
      </h1>
      {kind === 'extension' && baselinePracticeName && (
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          Extension of: <strong>{baselinePracticeName}</strong>
        </div>
      )}

      {/* Identity Section */}
      <div style={sectionHeaderStyle}>Practice Identity</div>
      <PropertyTable>
        <PropertyRow label="Name" required>
          <InlineTextField
            value={name}
            onChange={(val) => updateField('name', val)}
            placeholder="Enter practice name"
          />
        </PropertyRow>
        <PropertyRow label="Description">
          <InlineTextArea
            value={description}
            onChange={(val) => updateField('description', val)}
            placeholder="Describe this practice..."
            minRows={3}
          />
        </PropertyRow>
        {kind === 'extension' && (
          <PropertyRow label="Baseline Practice" required>
            <InlineTextField
              value={baselinePracticeName}
              onChange={(val) => updateField('baselinePracticeName', val)}
              placeholder="Name of baseline practice to extend"
            />
          </PropertyRow>
        )}
        <PropertyRow label="Version">
          <InlineTextField
            value={version}
            onChange={(val) => updateField('version', val)}
            placeholder="1.0.0"
          />
        </PropertyRow>
      </PropertyTable>

      {/* Alphas Section */}
      <div style={sectionHeaderStyle}>
        Alphas & Trajectories
        <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 12, color: 'var(--muted)' }}>
          ({alphas.length} total)
        </span>
      </div>

      {alphas.map((alpha: any, alphaIdx: number) => {
        const alphaName = canonicalPracticeElementName(alpha.name) || '';
        const isBaselineAlpha = elementSourceMap?.get(`alphas.${alphaName}`) === 'baseline';
        const states = Array.isArray(alpha.states) ? alpha.states : [];

        return (
          <div key={alphaIdx} style={alphaCardStyle}>
            <div style={alphaHeaderStyle}>
              Alpha: {alpha.name || '(unnamed)'}
              {isBaselineAlpha && (
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, marginLeft: 12 }}>
                  🔒 from baseline
                </span>
              )}
            </div>

            <PropertyTable>
              <PropertyRow label="Name" required readonly={isBaselineAlpha}>
                {isBaselineAlpha ? (
                  <InlineReadonlyValue value={alpha.name || ''} source="baseline" />
                ) : (
                  <InlineTextField
                    value={alpha.name || ''}
                    onChange={(val) => updateField(`alphas[${alphaIdx}].name`, val)}
                  />
                )}
              </PropertyRow>

              <PropertyRow label="Description" readonly={isBaselineAlpha}>
                {isBaselineAlpha ? (
                  <InlineReadonlyValue value={alpha.description || ''} source="baseline" />
                ) : (
                  <InlineTextArea
                    value={alpha.description || ''}
                    onChange={(val) => updateField(`alphas[${alphaIdx}].description`, val)}
                  />
                )}
              </PropertyRow>

              <PropertyRow label="Focus" readonly={isBaselineAlpha}>
                {isBaselineAlpha ? (
                  <InlineReadonlyValue value={alpha.focusName || ''} source="baseline" />
                ) : (
                  <InlineTextField
                    value={alpha.focusName || ''}
                    onChange={(val) => updateField(`alphas[${alphaIdx}].focusName`, val)}
                    placeholder="Which focus area this alpha belongs to"
                  />
                )}
              </PropertyRow>
            </PropertyTable>

            {/* Tags and Narratives */}
            <div style={{ marginTop: 16 }}>
              <TagsField
                value={alpha.tags}
                onChange={(val) => updateField(`alphas[${alphaIdx}].tags`, val)}
                fieldPath={`alphas[${alphaIdx}].tags`}
              />
              <NarrativesField
                value={alpha.narratives}
                onChange={(val) => updateField(`alphas[${alphaIdx}].narratives`, val)}
                fieldPath={`alphas[${alphaIdx}].narratives`}
              />
            </div>

            {/* States */}
            {states.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  States ({states.length})
                </div>
                {states.map((state: any, stateIdx: number) => {
                  const stateName = canonicalPracticeElementName(state.name) || '';
                  const isBaselineState = elementSourceMap?.get(`alphas.${alphaName}.states.${stateName}`) === 'baseline';

                  return (
                    <div key={stateIdx} style={stateCardStyle}>
                      <div style={stateHeaderStyle}>
                        State: {state.name || '(unnamed)'}
                        {isBaselineState && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                            🔒 from baseline
                          </span>
                        )}
                      </div>

                      <PropertyTable>
                        <PropertyRow label="Name" required readonly={isBaselineState}>
                          {isBaselineState ? (
                            <InlineReadonlyValue value={state.name || ''} source="baseline" />
                          ) : (
                            <InlineTextField
                              value={state.name || ''}
                              onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].name`, val)}
                            />
                          )}
                        </PropertyRow>

                        <PropertyRow label="Description" readonly={isBaselineState}>
                          {isBaselineState ? (
                            <InlineReadonlyValue value={state.description || ''} source="baseline" />
                          ) : (
                            <InlineTextArea
                              value={state.description || ''}
                              onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].description`, val)}
                            />
                          )}
                        </PropertyRow>

                        <PropertyRow label="Sequence">
                          <InlineTextField
                            value={String(state.seq || stateIdx + 1)}
                            onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].seq`, parseInt(val) || stateIdx + 1)}
                            type="number"
                          />
                        </PropertyRow>
                      </PropertyTable>

                      {/* Checklist - shown as a table like in browse view */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                          Checklist {state.checklist?.length > 0 && `(${state.checklist.length})`}
                        </div>
                        {/* TODO: Create ChecklistTable component for editing */}
                        <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                          Checklist editing UI here - will be table-based like browse view
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
