"use client";

import { useCallback, useState, type CSSProperties } from 'react';
import { PropertyTable } from './fields/PropertyTable';
import { PropertyRow } from './fields/PropertyRow';
import { InlineTextField } from './fields/InlineTextField';
import { InlineTextArea } from './fields/InlineTextArea';
import { InlineSelectField } from './fields/InlineSelectField';
import { InlineReadonlyValue } from './fields/InlineReadonlyValue';
import { TagsField } from './fields/TagsField';
import { NarrativesField } from './fields/NarrativesField';
import { StringArrayField } from './fields/StringArrayField';
import { AlphaContributionsField } from './fields/AlphaContributionsField';
import { WorkProductContributionsField } from './fields/WorkProductContributionsField';
import { CompetencyLevelReferencesField } from './fields/CompetencyLevelReferencesField';
import { AlphaInstancesField } from './fields/AlphaInstancesField';
import { NarrativeContextsField } from './fields/NarrativeContextsField';
import { PracticeDependenciesField } from './fields/PracticeDependenciesField';
import { setValueAtPath, appendToArray, removeFromArray, moveArrayItem } from '@/lib/json-path-utils';
import type { ElementSourceMap } from '@/lib/elementSourceTracking';
import { getBaselineChecklistItemNames, getBaselineStateNames } from '@/lib/elementSourceTracking';
import type { PracticeBaseline } from '@/lib/types';
import { canonicalPracticeElementName } from '@/lib/ir';
import { extractPracticeNames } from '@/lib/extractPracticeNames';
import {
  emptyFocus,
  emptyAlpha,
  emptyState,
  checklistItem,
  emptyActivitySpace,
  emptyActivity,
  emptyCompetency,
  emptyCompetencyLevel,
  emptyWorkProduct,
  emptyLevelOfDetail,
  emptyPattern,
  emptyPatternView,
  emptyPersona,
  emptyPersonaGroup,
  emptyNarrativeType,
  emptyNarrativeElement,
  emptyAlphaInstance,
  emptyEmbeddedWorkProductInstance,
} from '@/lib/practiceFormDefaults';

export type WysiwygEditorProps = {
  doc: Record<string, unknown>;
  onChange: (doc: Record<string, unknown>) => void;
  kind: 'extension' | 'baseline';
  onKindChange?: (kind: 'extension' | 'baseline') => void;
  lockDocumentKind?: boolean;
  resolvedBaseline?: PracticeBaseline | null;
  elementSourceMap?: ElementSourceMap;
  dependencies?: Record<string, unknown>[];
  libraryBodies?: unknown[];
};

const containerStyle: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '32px',
  fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
  background: '#ffffff',
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: '#151515',
  marginTop: 48,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '2px solid #d2d2d2',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const badgeStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  background: '#e7f1fa',
  color: '#0066cc',
  padding: '4px 12px',
  borderRadius: 12,
};

const cardStyle: CSSProperties = {
  background: '#fafafa',
  border: '1px solid #d2d2d2',
  borderRadius: 8,
  padding: 24,
  marginBottom: 24,
};

const cardHeaderStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#0066cc',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const nestedCardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderLeft: '4px solid #0066cc',
  borderRadius: 4,
  padding: 16,
  marginTop: 16,
  marginBottom: 16,
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const dangerButtonStyle: CSSProperties = {
  background: 'rgba(251,113,133,0.15)',
  color: 'rgba(251,113,133,1)',
  border: '1px solid rgba(251,113,133,0.5)',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  marginLeft: 8,
};

const arrayHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
  marginTop: 24,
};

const arrayTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#151515',
};

export function WysiwygEditor({
  doc,
  onChange,
  kind,
  onKindChange,
  lockDocumentKind,
  resolvedBaseline,
  elementSourceMap,
  dependencies = [],
  libraryBodies = [],
}: WysiwygEditorProps) {
  // Extract all valid element names for dropdowns
  const practiceNames = extractPracticeNames(
    doc,
    resolvedBaseline as Record<string, unknown> | null,
    dependencies,
    libraryBodies
  );

  const updateField = useCallback((path: string, value: any) => {
    const updated = setValueAtPath(doc, path, value);
    onChange(updated);
  }, [doc, onChange]);

  const addArrayItem = useCallback((path: string, defaultItem: any) => {
    const updated = appendToArray(doc, path, defaultItem);
    onChange(updated);
  }, [doc, onChange]);

  const removeArrayItem = useCallback((path: string, index: number) => {
    const updated = removeFromArray(doc, path, index);
    onChange(updated);
  }, [doc, onChange]);

  const moveItem = useCallback((path: string, fromIndex: number, toIndex: number) => {
    const updated = moveArrayItem(doc, path, fromIndex, toIndex);
    onChange(updated);
  }, [doc, onChange]);

  const name = (doc.name as string) || '';
  const description = (doc.description as string) || '';
  const baselinePracticeName = (doc.baselinePracticeName as string) || '';
  const version = (doc.version as string) || '';
  const authors = Array.isArray(doc.authors) ? doc.authors as string[] : [];
  const keywords = Array.isArray(doc.keywords) ? doc.keywords as string[] : [];
  const createdAt = (doc.createdAt as string) || '';
  const updatedAt = (doc.updatedAt as string) || '';
  const focuses = Array.isArray(doc.focuses) ? doc.focuses : [];
  const alphas = Array.isArray(doc.alphas) ? doc.alphas : [];
  const competencies = Array.isArray(doc.competencies) ? doc.competencies : [];
  const activitySpaces = Array.isArray(doc.activitySpaces) ? doc.activitySpaces : [];
  const flatActivities = Array.isArray(doc.activities) ? doc.activities : [];
  const workProducts = Array.isArray(doc.workProducts) ? doc.workProducts : [];
  const patterns = Array.isArray(doc.patterns) ? doc.patterns : [];
  const personas = Array.isArray(doc.personas) ? doc.personas : [];
  const personaGroups = Array.isArray(doc.personaGroups) ? doc.personaGroups : [];
  const narrativeTypes = Array.isArray(doc.narrativeTypes) ? doc.narrativeTypes : [];
  const alphaInstances = Array.isArray(doc.alphaInstances) ? doc.alphaInstances : [];
  const workProductInstances = Array.isArray(doc.workProductInstances) ? doc.workProductInstances : [];

  // Get baseline activitySpaces for reference
  const baselineActivitySpaces = resolvedBaseline && Array.isArray(resolvedBaseline.activitySpaces)
    ? resolvedBaseline.activitySpaces
    : [];

  // Merge baseline and practice activitySpaces for display
  const allActivitySpaceNames = new Set([
    ...baselineActivitySpaces.map((s: any) => s.name),
    ...activitySpaces.map((s: any) => s.name),
  ]);

  return (
    <div style={containerStyle}>
      {/* Practice Header */}
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#151515' }}>
        {name || 'Untitled Practice'}
      </h1>
      {kind === 'extension' && baselinePracticeName && (
        <div style={{ fontSize: 15, color: '#6a6e73', marginBottom: 32 }}>
          Extension of: <strong style={{ color: '#0066cc' }}>{baselinePracticeName}</strong>
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
          <>
            <PropertyRow label="Baseline Practice" required>
              <InlineSelectField
                value={baselinePracticeName}
                onChange={(val) => updateField('baselinePracticeName', val)}
                options={practiceNames.baselineNames}
                placeholder="Select baseline practice..."
              />
            </PropertyRow>
            <PropertyRow label="Practice Dependencies">
              <PracticeDependenciesField
                value={doc.practiceDependencyNames as string[] | undefined}
                onChange={(val) => updateField('practiceDependencyNames', val)}
                availablePractices={practiceNames.practiceNames}
              />
            </PropertyRow>
          </>
        )}
        <PropertyRow label="Version">
          <InlineTextField
            value={version}
            onChange={(val) => updateField('version', val)}
            placeholder="1.0.0"
          />
        </PropertyRow>
        <PropertyRow label="Authors">
          <InlineTextArea
            value={authors.join('\n')}
            onChange={(val) => updateField('authors', val.split('\n').filter(a => a.trim()))}
            placeholder="One author per line"
            minRows={2}
          />
        </PropertyRow>
        <PropertyRow label="Keywords">
          <InlineTextField
            value={keywords.join(', ')}
            onChange={(val) => updateField('keywords', val.split(',').map(k => k.trim()).filter(k => k))}
            placeholder="keyword1, keyword2, keyword3"
          />
        </PropertyRow>
        <PropertyRow label="Created">
          <InlineTextField
            value={createdAt}
            onChange={(val) => updateField('createdAt', val)}
            placeholder="YYYY-MM-DD"
          />
        </PropertyRow>
        <PropertyRow label="Updated">
          <InlineTextField
            value={updatedAt}
            onChange={(val) => updateField('updatedAt', val)}
            placeholder="YYYY-MM-DD"
          />
        </PropertyRow>
      </PropertyTable>

      {/* Focuses Section */}
      <div style={sectionHeaderStyle}>
        <span>Focuses</span>
        <span style={badgeStyle}>{focuses.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Focus Areas</div>
        <button
          type="button"
          onClick={() => addArrayItem('focuses', emptyFocus())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Focus
        </button>
      </div>
      {focuses.map((focus: any, idx: number) => (
        <div key={idx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            Focus: {focus.name || '(unnamed)'}
            <button
              type="button"
              onClick={() => removeArrayItem('focuses', idx)}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
              }}
            >
              × Remove
            </button>
          </div>
          <PropertyTable>
            <PropertyRow label="Name" required>
              <InlineTextField
                value={focus.name || ''}
                onChange={(val) => updateField(`focuses[${idx}].name`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={focus.description || ''}
                onChange={(val) => updateField(`focuses[${idx}].description`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Tags">
              <TagsField
                value={focus.tags}
                onChange={(val) => updateField(`focuses[${idx}].tags`, val)}
                fieldPath={`focuses[${idx}].tags`}
              />
            </PropertyRow>
            <PropertyRow label="Narratives">
              <NarrativesField
                value={focus.narratives}
                onChange={(val) => updateField(`focuses[${idx}].narratives`, val)}
                fieldPath={`focuses[${idx}].narratives`}
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}

      {/* Alphas Section */}
      <div style={sectionHeaderStyle}>
        <span>Alphas & Trajectories</span>
        <span style={badgeStyle}>{alphas.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Alpha Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('alphas', emptyAlpha())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Alpha
        </button>
      </div>
      {alphas.map((alpha: any, alphaIdx: number) => {
        const alphaName = canonicalPracticeElementName(alpha.name) || '';
        const isBaselineAlpha = elementSourceMap?.get(`alphas.${alphaName}`) === 'baseline';
        const states = Array.isArray(alpha.states) ? alpha.states : [];

        return (
          <div key={alphaIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Alpha: {alpha.name || '(unnamed)'}
              {isBaselineAlpha && (
                <span style={{ fontSize: 12, color: '#6a6e73', fontWeight: 400 }}>
                  🔒 from baseline
                </span>
              )}
              {!isBaselineAlpha && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('alphas', alphaIdx)}
                  style={dangerButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                  }}
                >
                  × Remove Alpha
                </button>
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
              <PropertyRow label="Tags">
                <TagsField
                  value={alpha.tags}
                  onChange={(val) => updateField(`alphas[${alphaIdx}].tags`, val)}
                  fieldPath={`alphas[${alphaIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={alpha.narratives}
                  onChange={(val) => updateField(`alphas[${alphaIdx}].narratives`, val)}
                  fieldPath={`alphas[${alphaIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* States */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>States ({states.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`alphas[${alphaIdx}].states`, emptyState(states.length + 1))}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add State
              </button>
            </div>

            {states.map((state: any, stateIdx: number) => {
              const stateName = canonicalPracticeElementName(state.name) || '';
              const isBaselineState = elementSourceMap?.get(`alphas.${alphaName}.states.${stateName}`) === 'baseline';
              const checklist = Array.isArray(state.checklist) ? state.checklist : [];

              return (
                <div key={stateIdx} style={nestedCardStyle}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    State: {state.name || '(unnamed)'}
                    {isBaselineState && (
                      <span style={{ fontSize: 11, color: '#6a6e73', fontWeight: 400 }}>
                        🔒 from baseline
                      </span>
                    )}
                    {!isBaselineState && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(`alphas[${alphaIdx}].states`, stateIdx)}
                        style={dangerButtonStyle}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                        }}
                      >
                        × Remove
                      </button>
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
                    <PropertyRow label="Tags">
                      <TagsField
                        value={state.tags}
                        onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].tags`, val)}
                        fieldPath={`alphas[${alphaIdx}].states[${stateIdx}].tags`}
                      />
                    </PropertyRow>
                    <PropertyRow label="Narratives">
                      <NarrativesField
                        value={state.narratives}
                        onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].narratives`, val)}
                        fieldPath={`alphas[${alphaIdx}].states[${stateIdx}].narratives`}
                      />
                    </PropertyRow>
                  </PropertyTable>

                  {/* Checklist */}
                  <div style={arrayHeaderStyle}>
                    <div style={arrayTitleStyle}>Checklist ({checklist.length})</div>
                    <button
                      type="button"
                      onClick={() => addArrayItem(`alphas[${alphaIdx}].states[${stateIdx}].checklist`, checklistItem(checklist.length + 1))}
                      style={buttonStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                        e.currentTarget.style.color = 'var(--accent)';
                      }}
                    >
                      + Add Item
                    </button>
                  </div>

                  {checklist.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, border: '1px solid #d2d2d2', marginBottom: 16 }}>
                      <thead>
                        <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #d2d2d2', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', width: 50 }}>#</th>
                          <th style={{ padding: '8px 12px' }}>Checklist Item</th>
                          <th style={{ padding: '8px 12px', width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checklist.map((item: any, itemIdx: number) => {
                          const itemName = canonicalPracticeElementName(item.name) || '';
                          const isReadonly = elementSourceMap && alphaName && stateName
                            ? getBaselineChecklistItemNames(elementSourceMap, alphaName, stateName).has(itemName)
                            : false;

                          return (
                            <tr key={itemIdx} style={{ borderBottom: '1px solid #d2d2d2', opacity: isReadonly ? 0.7 : 1 }}>
                              <td style={{ padding: '8px 12px', verticalAlign: 'top', color: '#6a6e73', fontSize: 12 }}>
                                {itemIdx + 1}
                              </td>
                              <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                                {isReadonly ? (
                                  <>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                      {item.name} <span style={{ fontSize: 10, color: '#6a6e73' }}>🔒</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#6a6e73', fontStyle: 'italic' }}>
                                      {item.description}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <InlineTextField
                                      value={item.name || ''}
                                      onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].checklist[${itemIdx}].name`, val)}
                                      placeholder="Item name"
                                    />
                                    <div style={{ marginTop: 4 }}>
                                      <InlineTextArea
                                        value={item.description || ''}
                                        onChange={(val) => updateField(`alphas[${alphaIdx}].states[${stateIdx}].checklist[${itemIdx}].description`, val)}
                                        placeholder="Description..."
                                        minRows={1}
                                      />
                                    </div>
                                  </>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {!isReadonly && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => moveItem(`alphas[${alphaIdx}].states[${stateIdx}].checklist`, itemIdx, itemIdx - 1)}
                                        disabled={itemIdx === 0}
                                        style={{
                                          ...buttonStyle,
                                          padding: '4px 8px',
                                          fontSize: 12,
                                          opacity: itemIdx === 0 ? 0.3 : 1,
                                          cursor: itemIdx === 0 ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Move up"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveItem(`alphas[${alphaIdx}].states[${stateIdx}].checklist`, itemIdx, itemIdx + 1)}
                                        disabled={itemIdx === checklist.length - 1}
                                        style={{
                                          ...buttonStyle,
                                          padding: '4px 8px',
                                          fontSize: 12,
                                          opacity: itemIdx === checklist.length - 1 ? 0.3 : 1,
                                          cursor: itemIdx === checklist.length - 1 ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Move down"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeArrayItem(`alphas[${alphaIdx}].states[${stateIdx}].checklist`, itemIdx)}
                                        style={{ ...dangerButtonStyle, marginLeft: 0, padding: '4px 8px', fontSize: 12 }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                                        }}
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Competencies Section */}
      <div style={sectionHeaderStyle}>
        <span>Competencies</span>
        <span style={badgeStyle}>{competencies.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Competency Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('competencies', emptyCompetency())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Competency
        </button>
      </div>
      {competencies.map((comp: any, compIdx: number) => {
        const levels = Array.isArray(comp.levels) ? comp.levels : [];
        return (
          <div key={compIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Competency: {comp.name || '(unnamed)'}
              <button
                type="button"
                onClick={() => removeArrayItem('competencies', compIdx)}
                style={dangerButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                }}
              >
                × Remove
              </button>
            </div>
            <PropertyTable>
              <PropertyRow label="Name" required>
                <InlineTextField
                  value={comp.name || ''}
                  onChange={(val) => updateField(`competencies[${compIdx}].name`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={comp.description || ''}
                  onChange={(val) => updateField(`competencies[${compIdx}].description`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Tags">
                <TagsField
                  value={comp.tags}
                  onChange={(val) => updateField(`competencies[${compIdx}].tags`, val)}
                  fieldPath={`competencies[${compIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={comp.narratives}
                  onChange={(val) => updateField(`competencies[${compIdx}].narratives`, val)}
                  fieldPath={`competencies[${compIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Levels */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Levels ({levels.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`competencies[${compIdx}].levels`, emptyCompetencyLevel(levels.length + 1, comp.name))}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add Level
              </button>
            </div>
            {levels.map((level: any, levelIdx: number) => (
              <div key={levelIdx} style={nestedCardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  Level {level.level || levelIdx + 1}: {level.name || '(unnamed)'}
                  <button
                    type="button"
                    onClick={() => removeArrayItem(`competencies[${compIdx}].levels`, levelIdx)}
                    style={dangerButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                  >
                    × Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name" required>
                    <InlineTextField
                      value={level.name || ''}
                      onChange={(val) => updateField(`competencies[${compIdx}].levels[${levelIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={level.description || ''}
                      onChange={(val) => updateField(`competencies[${compIdx}].levels[${levelIdx}].description`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Tags">
                    <TagsField
                      value={level.tags}
                      onChange={(val) => updateField(`competencies[${compIdx}].levels[${levelIdx}].tags`, val)}
                      fieldPath={`competencies[${compIdx}].levels[${levelIdx}].tags`}
                    />
                  </PropertyRow>
                  <PropertyRow label="Narratives">
                    <NarrativesField
                      value={level.narratives}
                      onChange={(val) => updateField(`competencies[${compIdx}].levels[${levelIdx}].narratives`, val)}
                      fieldPath={`competencies[${compIdx}].levels[${levelIdx}].narratives`}
                    />
                  </PropertyRow>
                </PropertyTable>
              </div>
            ))}
          </div>
        );
      })}

      {/* Work Products Section */}
      <div style={sectionHeaderStyle}>
        <span>Work Products</span>
        <span style={badgeStyle}>{workProducts.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Work Product Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('workProducts', emptyWorkProduct())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Work Product
        </button>
      </div>
      {workProducts.map((wp: any, wpIdx: number) => {
        const lods = Array.isArray(wp.levelsOfDetail) ? wp.levelsOfDetail : [];
        return (
          <div key={wpIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Work Product: {wp.name || '(unnamed)'}
              <button
                type="button"
                onClick={() => removeArrayItem('workProducts', wpIdx)}
                style={dangerButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                }}
              >
                × Remove
              </button>
            </div>
            <PropertyTable>
              <PropertyRow label="Name" required>
                <InlineTextField
                  value={wp.name || ''}
                  onChange={(val) => updateField(`workProducts[${wpIdx}].name`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={wp.description || ''}
                  onChange={(val) => updateField(`workProducts[${wpIdx}].description`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Tags">
                <TagsField
                  value={wp.tags}
                  onChange={(val) => updateField(`workProducts[${wpIdx}].tags`, val)}
                  fieldPath={`workProducts[${wpIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={wp.narratives}
                  onChange={(val) => updateField(`workProducts[${wpIdx}].narratives`, val)}
                  fieldPath={`workProducts[${wpIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Levels of Detail */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Levels of Detail ({lods.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`workProducts[${wpIdx}].levelsOfDetail`, emptyLevelOfDetail(lods.length + 1))}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add Level
              </button>
            </div>
            {lods.map((lod: any, lodIdx: number) => (
              <div key={lodIdx} style={nestedCardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  Level: {lod.name || '(unnamed)'}
                  <button
                    type="button"
                    onClick={() => removeArrayItem(`workProducts[${wpIdx}].levelsOfDetail`, lodIdx)}
                    style={dangerButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                  >
                    × Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name" required>
                    <InlineTextField
                      value={lod.name || ''}
                      onChange={(val) => updateField(`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={lod.description || ''}
                      onChange={(val) => updateField(`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].description`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Tags">
                    <TagsField
                      value={lod.tags}
                      onChange={(val) => updateField(`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].tags`, val)}
                      fieldPath={`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].tags`}
                    />
                  </PropertyRow>
                  <PropertyRow label="Narratives">
                    <NarrativesField
                      value={lod.narratives}
                      onChange={(val) => updateField(`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].narratives`, val)}
                      fieldPath={`workProducts[${wpIdx}].levelsOfDetail[${lodIdx}].narratives`}
                    />
                  </PropertyRow>
                </PropertyTable>
              </div>
            ))}
          </div>
        );
      })}

      {/* Activity Spaces Section */}
      <div style={sectionHeaderStyle}>
        <span>Activity Spaces</span>
        <span style={badgeStyle}>{activitySpaces.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Activity Space Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('activitySpaces', emptyActivitySpace())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Activity Space
        </button>
      </div>
      {activitySpaces.map((space: any, spaceIdx: number) => {
        const activities = Array.isArray(space.activities) ? space.activities : [];
        return (
          <div key={spaceIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Activity Space: {space.name || '(unnamed)'}
              <button
                type="button"
                onClick={() => removeArrayItem('activitySpaces', spaceIdx)}
                style={dangerButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                }}
              >
                × Remove
              </button>
            </div>
            <PropertyTable>
              <PropertyRow label="Name" required>
                <InlineTextField
                  value={space.name || ''}
                  onChange={(val) => updateField(`activitySpaces[${spaceIdx}].name`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={space.description || ''}
                  onChange={(val) => updateField(`activitySpaces[${spaceIdx}].description`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Focus">
                <InlineTextField
                  value={space.focusName || ''}
                  onChange={(val) => updateField(`activitySpaces[${spaceIdx}].focusName`, val)}
                  placeholder="Which focus area"
                />
              </PropertyRow>
              <PropertyRow label="Tags">
                <TagsField
                  value={space.tags}
                  onChange={(val) => updateField(`activitySpaces[${spaceIdx}].tags`, val)}
                  fieldPath={`activitySpaces[${spaceIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={space.narratives}
                  onChange={(val) => updateField(`activitySpaces[${spaceIdx}].narratives`, val)}
                  fieldPath={`activitySpaces[${spaceIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Activities */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Activities ({activities.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`activitySpaces[${spaceIdx}].activities`, emptyActivity(space.name))}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add Activity
              </button>
            </div>
            {activities.map((activity: any, actIdx: number) => (
              <div key={actIdx} style={nestedCardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  Activity: {activity.name || '(unnamed)'}
                  <button
                    type="button"
                    onClick={() => removeArrayItem(`activitySpaces[${spaceIdx}].activities`, actIdx)}
                    style={dangerButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                  >
                    × Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name" required>
                    <InlineTextField
                      value={activity.name || ''}
                      onChange={(val) => updateField(`activitySpaces[${spaceIdx}].activities[${actIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={activity.description || ''}
                      onChange={(val) => updateField(`activitySpaces[${spaceIdx}].activities[${actIdx}].description`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Tags">
                    <TagsField
                      value={activity.tags}
                      onChange={(val) => updateField(`activitySpaces[${spaceIdx}].activities[${actIdx}].tags`, val)}
                      fieldPath={`activitySpaces[${spaceIdx}].activities[${actIdx}].tags`}
                    />
                  </PropertyRow>
                  <PropertyRow label="Narratives">
                    <NarrativesField
                      value={activity.narratives}
                      onChange={(val) => updateField(`activitySpaces[${spaceIdx}].activities[${actIdx}].narratives`, val)}
                      fieldPath={`activitySpaces[${spaceIdx}].activities[${actIdx}].narratives`}
                    />
                  </PropertyRow>
                </PropertyTable>
              </div>
            ))}
          </div>
        );
      })}

      {/* Baseline Activity Spaces Section (read-only reference) */}
      {kind === 'extension' && baselineActivitySpaces.length > 0 && (
        <>
          <div style={sectionHeaderStyle}>
            <span>Baseline Activity Spaces (from {baselinePracticeName})</span>
            <span style={{ ...badgeStyle, background: '#f3f4f6', color: '#6b7280' }}>
              {baselineActivitySpaces.length} available
            </span>
          </div>
          <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#6b7280' }}>
              These activity spaces are inherited from the baseline practice. You can reference them in activities below.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {baselineActivitySpaces.map((space: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 12px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {space.name || '(unnamed)'}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Flat Activities Section (Practice.activities array) */}
      {kind === 'extension' && (
        <>
          <div style={sectionHeaderStyle}>
            <span>Activities</span>
            <span style={badgeStyle}>{flatActivities.length}</span>
          </div>
          <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fbbf24' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
              <strong>Note:</strong> These activities reference activity spaces from the baseline practice.
              Make sure the Activity Space Name matches one from the baseline listed above.
            </p>
          </div>
          <div style={arrayHeaderStyle}>
            <div style={arrayTitleStyle}>Activity Definitions</div>
            <button
              type="button"
              onClick={() => addArrayItem('activities', emptyActivity())}
              style={buttonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              + Add Activity
            </button>
          </div>
          {flatActivities.map((activity: any, actIdx: number) => (
            <div key={actIdx} style={cardStyle}>
              <div style={cardHeaderStyle}>
                Activity: {activity.name || '(unnamed)'}
                <button
                  type="button"
                  onClick={() => removeArrayItem('activities', actIdx)}
                  style={dangerButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                  }}
                >
                  × Remove
                </button>
              </div>
              <PropertyTable>
                <PropertyRow label="Name" required>
                  <InlineTextField
                    value={activity.name || ''}
                    onChange={(val) => updateField(`activities[${actIdx}].name`, val)}
                  />
                </PropertyRow>
                <PropertyRow label="Description">
                  <InlineTextArea
                    value={activity.description || ''}
                    onChange={(val) => updateField(`activities[${actIdx}].description`, val)}
                  />
                </PropertyRow>
                <PropertyRow label="Activity Space Name" required>
                  <InlineSelectField
                    value={activity.activitySpaceName || ''}
                    onChange={(val) => updateField(`activities[${actIdx}].activitySpaceName`, val)}
                    options={Array.from(allActivitySpaceNames)}
                    placeholder="Select an activity space"
                  />
                </PropertyRow>
                <PropertyRow label="Focus">
                  <InlineSelectField
                    value={activity.focusName || ''}
                    onChange={(val) => updateField(`activities[${actIdx}].focusName`, val)}
                    options={practiceNames.focuses}
                    placeholder="Select a focus"
                  />
                </PropertyRow>
                <PropertyRow label="Contributes To">
                  <AlphaContributionsField
                    value={activity.contributesTo || []}
                    onChange={(val) => updateField(`activities[${actIdx}].contributesTo`, val)}
                    label=""
                    alphaNames={practiceNames.alphaNames}
                    stateNamesByAlpha={practiceNames.stateNamesByAlpha}
                  />
                </PropertyRow>
                <PropertyRow label="Required Competencies">
                  <StringArrayField
                    value={activity.requiredCompetencies || []}
                    onChange={(val) => updateField(`activities[${actIdx}].requiredCompetencies`, val)}
                    placeholder="Add competency name"
                  />
                </PropertyRow>
                <PropertyRow label="Involves (Persona Groups)">
                  <StringArrayField
                    value={activity.involves || []}
                    onChange={(val) => updateField(`activities[${actIdx}].involves`, val)}
                    placeholder="Add persona group name"
                  />
                </PropertyRow>
                <PropertyRow label="Recommended Competency Levels">
                  <CompetencyLevelReferencesField
                    value={activity.recommendedCompetencyLevels || []}
                    onChange={(val) => updateField(`activities[${actIdx}].recommendedCompetencyLevels`, val)}
                    label=""
                  />
                </PropertyRow>
                <PropertyRow label="Works On">
                  <WorkProductContributionsField
                    value={activity.worksOn || []}
                    onChange={(val) => updateField(`activities[${actIdx}].worksOn`, val)}
                    label=""
                  />
                </PropertyRow>
                <PropertyRow label="Tags">
                  <TagsField
                    value={activity.tags}
                    onChange={(val) => updateField(`activities[${actIdx}].tags`, val)}
                    fieldPath={`activities[${actIdx}].tags`}
                  />
                </PropertyRow>
                <PropertyRow label="Narratives">
                  <NarrativesField
                    value={activity.narratives}
                    onChange={(val) => updateField(`activities[${actIdx}].narratives`, val)}
                    fieldPath={`activities[${actIdx}].narratives`}
                  />
                </PropertyRow>
              </PropertyTable>
            </div>
          ))}
        </>
      )}

      {/* Patterns Section */}
      <div style={sectionHeaderStyle}>
        <span>Patterns</span>
        <span style={badgeStyle}>{patterns.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Pattern Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('patterns', emptyPattern())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Pattern
        </button>
      </div>
      {patterns.map((pattern: any, patternIdx: number) => {
        const patternViews = Array.isArray(pattern.patternViews) ? pattern.patternViews : [];
        return (
          <div key={patternIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Pattern: {pattern.name || '(unnamed)'}
              <button
                type="button"
                onClick={() => removeArrayItem('patterns', patternIdx)}
                style={dangerButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                }}
              >
                × Remove
              </button>
            </div>
            <PropertyTable>
              <PropertyRow label="Name" required>
                <InlineTextField
                  value={pattern.name || ''}
                  onChange={(val) => updateField(`patterns[${patternIdx}].name`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={pattern.description || ''}
                  onChange={(val) => updateField(`patterns[${patternIdx}].description`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Narrative Type">
                <InlineTextField
                  value={pattern.narrativeTypeName || ''}
                  onChange={(val) => updateField(`patterns[${patternIdx}].narrativeTypeName`, val)}
                  placeholder="Reference to narrative type"
                />
              </PropertyRow>
              <PropertyRow label="Tags">
                <TagsField
                  value={pattern.tags}
                  onChange={(val) => updateField(`patterns[${patternIdx}].tags`, val)}
                  fieldPath={`patterns[${patternIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={pattern.narratives}
                  onChange={(val) => updateField(`patterns[${patternIdx}].narratives`, val)}
                  fieldPath={`patterns[${patternIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Pattern Views */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Pattern Views ({patternViews.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`patterns[${patternIdx}].patternViews`, emptyPatternView(patternViews.length + 1))}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add View
              </button>
            </div>
            {patternViews.map((view: any, viewIdx: number) => (
              <div key={viewIdx} style={nestedCardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  View: {view.name || '(unnamed)'}
                  <button
                    type="button"
                    onClick={() => removeArrayItem(`patterns[${patternIdx}].patternViews`, viewIdx)}
                    style={dangerButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                  >
                    × Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name" required>
                    <InlineTextField
                      value={view.name || ''}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={view.description || ''}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].description`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Alpha States">
                    <AlphaContributionsField
                      value={view.alphaStates || []}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].alphaStates`, val)}
                      label=""
                      alphaNames={practiceNames.alphaNames}
                      stateNamesByAlpha={practiceNames.stateNamesByAlpha}
                    />
                  </PropertyRow>
                  <PropertyRow label="Alpha Instances">
                    <AlphaInstancesField
                      value={view.alphaInstances || []}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].alphaInstances`, val)}
                      label=""
                      alphaNames={practiceNames.alphaNames}
                      stateNamesByAlpha={practiceNames.stateNamesByAlpha}
                      alphaInstanceNames={practiceNames.alphaInstanceNames}
                    />
                  </PropertyRow>
                  <PropertyRow label="Activity Spaces">
                    <StringArrayField
                      value={view.activitySpaces || []}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].activitySpaces`, val)}
                      label=""
                      description="One activity space name per line"
                    />
                  </PropertyRow>
                  <PropertyRow label="Activities">
                    <StringArrayField
                      value={view.activities || []}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].activities`, val)}
                      label=""
                      description="One activity name per line"
                    />
                  </PropertyRow>
                  <PropertyRow label="Narrative Contexts">
                    <NarrativeContextsField
                      value={view.narrativeContexts || []}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].narrativeContexts`, val)}
                      label=""
                    />
                  </PropertyRow>
                  <PropertyRow label="Tags">
                    <TagsField
                      value={view.tags}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].tags`, val)}
                      fieldPath={`patterns[${patternIdx}].patternViews[${viewIdx}].tags`}
                    />
                  </PropertyRow>
                  <PropertyRow label="Narratives">
                    <NarrativesField
                      value={view.narratives}
                      onChange={(val) => updateField(`patterns[${patternIdx}].patternViews[${viewIdx}].narratives`, val)}
                      fieldPath={`patterns[${patternIdx}].patternViews[${viewIdx}].narratives`}
                    />
                  </PropertyRow>
                </PropertyTable>
              </div>
            ))}
          </div>
        );
      })}

      {/* Personas Section */}
      <div style={sectionHeaderStyle}>
        <span>Personas</span>
        <span style={badgeStyle}>{personas.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Persona Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('personas', emptyPersona())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Persona
        </button>
      </div>
      {personas.map((persona: any, personaIdx: number) => (
        <div key={personaIdx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            Persona: {persona.name || '(unnamed)'}
            <button
              type="button"
              onClick={() => removeArrayItem('personas', personaIdx)}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
              }}
            >
              × Remove
            </button>
          </div>
          <PropertyTable>
            <PropertyRow label="Name" required>
              <InlineTextField
                value={persona.name || ''}
                onChange={(val) => updateField(`personas[${personaIdx}].name`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={persona.description || ''}
                onChange={(val) => updateField(`personas[${personaIdx}].description`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Competencies">
              <CompetencyLevelReferencesField
                value={persona.competencies || []}
                onChange={(val) => updateField(`personas[${personaIdx}].competencies`, val)}
                label=""
              />
            </PropertyRow>
            <PropertyRow label="Tags">
              <TagsField
                value={persona.tags}
                onChange={(val) => updateField(`personas[${personaIdx}].tags`, val)}
                fieldPath={`personas[${personaIdx}].tags`}
              />
            </PropertyRow>
            <PropertyRow label="Narratives">
              <NarrativesField
                value={persona.narratives}
                onChange={(val) => updateField(`personas[${personaIdx}].narratives`, val)}
                fieldPath={`personas[${personaIdx}].narratives`}
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}

      {/* Persona Groups Section */}
      <div style={sectionHeaderStyle}>
        <span>Persona Groups</span>
        <span style={badgeStyle}>{personaGroups.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Persona Group Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('personaGroups', emptyPersonaGroup())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Persona Group
        </button>
      </div>
      {personaGroups.map((group: any, groupIdx: number) => (
        <div key={groupIdx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            Persona Group: {group.name || '(unnamed)'}
            <button
              type="button"
              onClick={() => removeArrayItem('personaGroups', groupIdx)}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
              }}
            >
              × Remove
            </button>
          </div>
          <PropertyTable>
            <PropertyRow label="Name" required>
              <InlineTextField
                value={group.name || ''}
                onChange={(val) => updateField(`personaGroups[${groupIdx}].name`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={group.description || ''}
                onChange={(val) => updateField(`personaGroups[${groupIdx}].description`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Persona Names">
              <StringArrayField
                value={group.personaNames || []}
                onChange={(val) => updateField(`personaGroups[${groupIdx}].personaNames`, val)}
                label=""
                description="Names of personas in this group (one per line)"
              />
            </PropertyRow>
            <PropertyRow label="Tags">
              <TagsField
                value={group.tags}
                onChange={(val) => updateField(`personaGroups[${groupIdx}].tags`, val)}
                fieldPath={`personaGroups[${groupIdx}].tags`}
              />
            </PropertyRow>
            <PropertyRow label="Narratives">
              <NarrativesField
                value={group.narratives}
                onChange={(val) => updateField(`personaGroups[${groupIdx}].narratives`, val)}
                fieldPath={`personaGroups[${groupIdx}].narratives`}
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}

      {/* Narrative Types Section */}
      <div style={sectionHeaderStyle}>
        <span>Narrative Types</span>
        <span style={badgeStyle}>{narrativeTypes.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Narrative Type Definitions</div>
        <button
          type="button"
          onClick={() => addArrayItem('narrativeTypes', emptyNarrativeType())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Narrative Type
        </button>
      </div>
      {narrativeTypes.map((nt: any, ntIdx: number) => {
        const elements = Array.isArray(nt.narrativeElements) ? nt.narrativeElements : [];
        return (
          <div key={ntIdx} style={cardStyle}>
            <div style={cardHeaderStyle}>
              Narrative Type: {nt.name || '(unnamed)'}
              <button
                type="button"
                onClick={() => removeArrayItem('narrativeTypes', ntIdx)}
                style={dangerButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                }}
              >
                × Remove
              </button>
            </div>
            <PropertyTable>
              <PropertyRow label="Name" required>
                <InlineTextField
                  value={nt.name || ''}
                  onChange={(val) => updateField(`narrativeTypes[${ntIdx}].name`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={nt.description || ''}
                  onChange={(val) => updateField(`narrativeTypes[${ntIdx}].description`, val)}
                />
              </PropertyRow>
              <PropertyRow label="Tags">
                <TagsField
                  value={nt.tags}
                  onChange={(val) => updateField(`narrativeTypes[${ntIdx}].tags`, val)}
                  fieldPath={`narrativeTypes[${ntIdx}].tags`}
                />
              </PropertyRow>
              <PropertyRow label="Narratives">
                <NarrativesField
                  value={nt.narratives}
                  onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narratives`, val)}
                  fieldPath={`narrativeTypes[${ntIdx}].narratives`}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Narrative Elements */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Narrative Elements ({elements.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem(`narrativeTypes[${ntIdx}].narrativeElements`, emptyNarrativeElement())}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                + Add Element
              </button>
            </div>
            {elements.map((elem: any, elemIdx: number) => (
              <div key={elemIdx} style={nestedCardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  Element: {elem.name || '(unnamed)'}
                  <button
                    type="button"
                    onClick={() => removeArrayItem(`narrativeTypes[${ntIdx}].narrativeElements`, elemIdx)}
                    style={dangerButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
                    }}
                  >
                    × Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name" required>
                    <InlineTextField
                      value={elem.name || ''}
                      onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={elem.description || ''}
                      onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].description`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="How to Use">
                    <InlineTextArea
                      value={elem.howToUse || ''}
                      onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].howToUse`, val)}
                      placeholder="Instructions for using this element"
                    />
                  </PropertyRow>
                  <PropertyRow label="Tags">
                    <TagsField
                      value={elem.tags}
                      onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].tags`, val)}
                      fieldPath={`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].tags`}
                    />
                  </PropertyRow>
                  <PropertyRow label="Narratives">
                    <NarrativesField
                      value={elem.narratives}
                      onChange={(val) => updateField(`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].narratives`, val)}
                      fieldPath={`narrativeTypes[${ntIdx}].narrativeElements[${elemIdx}].narratives`}
                    />
                  </PropertyRow>
                </PropertyTable>
              </div>
            ))}
          </div>
        );
      })}

      {/* Alpha Instances Section */}
      <div style={sectionHeaderStyle}>
        <span>Alpha Instances</span>
        <span style={badgeStyle}>{alphaInstances.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Alpha Instance Tags</div>
        <button
          type="button"
          onClick={() => addArrayItem('alphaInstances', emptyAlphaInstance())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Alpha Instance
        </button>
      </div>
      {alphaInstances.map((ai: any, aiIdx: number) => (
        <div key={aiIdx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            Alpha Instance: {ai.name || '(unnamed)'}
            <button
              type="button"
              onClick={() => removeArrayItem('alphaInstances', aiIdx)}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
              }}
            >
              × Remove
            </button>
          </div>
          <PropertyTable>
            <PropertyRow label="Instance Name" required>
              <InlineTextField
                value={ai.name || ''}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].name`, val)}
                placeholder="e.g., 'Product Backlog', 'Sprint Goals'"
              />
            </PropertyRow>
            <PropertyRow label="Alpha Name" required>
              <InlineTextField
                value={ai.alphaName || ''}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].alphaName`, val)}
                placeholder="Reference to alpha definition"
              />
            </PropertyRow>
            <PropertyRow label="State Name">
              <InlineTextField
                value={ai.stateName || ''}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].stateName`, val)}
                placeholder="Current state of this instance"
              />
            </PropertyRow>
            <PropertyRow label="Name">
              <InlineTextField
                value={ai.name || ''}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].name`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={ai.description || ''}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].description`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Tags">
              <TagsField
                value={ai.tags}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].tags`, val)}
                fieldPath={`alphaInstances[${aiIdx}].tags`}
              />
            </PropertyRow>
            <PropertyRow label="Narratives">
              <NarrativesField
                value={ai.narratives}
                onChange={(val) => updateField(`alphaInstances[${aiIdx}].narratives`, val)}
                fieldPath={`alphaInstances[${aiIdx}].narratives`}
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}

      {/* Work Product Instances Section */}
      <div style={sectionHeaderStyle}>
        <span>Work Product Instances</span>
        <span style={badgeStyle}>{workProductInstances.length}</span>
      </div>
      <div style={arrayHeaderStyle}>
        <div style={arrayTitleStyle}>Work Product Instance Tags</div>
        <button
          type="button"
          onClick={() => addArrayItem('workProductInstances', emptyEmbeddedWorkProductInstance())}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          + Add Work Product Instance
        </button>
      </div>
      {workProductInstances.map((wpi: any, wpiIdx: number) => (
        <div key={wpiIdx} style={cardStyle}>
          <div style={cardHeaderStyle}>
            Work Product Instance: {wpi.name || '(unnamed)'}
            <button
              type="button"
              onClick={() => removeArrayItem('workProductInstances', wpiIdx)}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251,113,133,0.15)';
              }}
            >
              × Remove
            </button>
          </div>
          <PropertyTable>
            <PropertyRow label="Instance Name" required>
              <InlineTextField
                value={wpi.name || ''}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].name`, val)}
                placeholder="e.g., 'Requirements.doc', 'API Specification'"
              />
            </PropertyRow>
            <PropertyRow label="Work Product Name" required>
              <InlineTextField
                value={wpi.workProductName || ''}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].workProductName`, val)}
                placeholder="Reference to work product definition"
              />
            </PropertyRow>
            <PropertyRow label="Level of Detail Name">
              <InlineTextField
                value={wpi.levelOfDetailName || ''}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].levelOfDetailName`, val)}
                placeholder="Current level of detail"
              />
            </PropertyRow>
            <PropertyRow label="Name">
              <InlineTextField
                value={wpi.name || ''}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].name`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <InlineTextArea
                value={wpi.description || ''}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].description`, val)}
              />
            </PropertyRow>
            <PropertyRow label="Tags">
              <TagsField
                value={wpi.tags}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].tags`, val)}
                fieldPath={`workProductInstances[${wpiIdx}].tags`}
              />
            </PropertyRow>
            <PropertyRow label="Narratives">
              <NarrativesField
                value={wpi.narratives}
                onChange={(val) => updateField(`workProductInstances[${wpiIdx}].narratives`, val)}
                fieldPath={`workProductInstances[${wpiIdx}].narratives`}
              />
            </PropertyRow>
          </PropertyTable>
        </div>
      ))}
    </div>
  );
}
