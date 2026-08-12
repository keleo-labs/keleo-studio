"use client";

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import { PropertyTable } from './fields/containers/PropertyTable';
import { PropertyRow } from './fields/containers/PropertyRow';
import { InlineTextField } from './fields/base/InlineTextField';
import { InlineTextArea } from './fields/base/InlineTextArea';
import { InlineSelectField } from './fields/base/InlineSelectField';
import { StringArrayField } from './fields/domain/StringArrayField';
import { TagsField } from './fields/domain/TagsField';
import { NarrativesField } from './fields/domain/NarrativesField';
import { NotesField } from './fields/domain/NotesField';
import { TeamMembersField } from './fields/domain/TeamMembersField';
import { CommunicationChannelsField } from './fields/domain/CommunicationChannelsField';
import { AlphaContributionsField } from './fields/domain/AlphaContributionsField';
import { AlphaInstancesField } from './fields/domain/AlphaInstancesField';
import { NarrativeContextsField } from './fields/domain/NarrativeContextsField';
import { ProjectStateSectionEditor } from './sections/ProjectStateSectionEditor';
import { useResolvedPracticeForProject } from '@/hooks/useResolvedPracticeForProject';
import { setValueAtPath, appendToArray, removeFromArray, moveArrayItem } from '@/lib/core/json-path-utils';
import {
  emptyPatternView,
  emptyAlphaInstance,
  emptyAlphaInstanceName,
  emptyWorkProductInstanceName,
  emptyEmbeddedWorkProductInstance,
} from '@/lib/data/practiceFormDefaults';

export type ProjectEditorProps = {
  doc: Record<string, unknown>;
  onChange: (doc: Record<string, unknown>) => void;
  libraryDocuments: Array<{ id: string; displayName: string; libraryRootKind: string }>;
};

const containerStyle: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  fontFamily: '"Red Hat Text", RedHatText, "Overpass", Arial, sans-serif',
  background: '#ffffff',
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#151515',
  marginTop: 32,
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '2px solid #d2d2d2',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const badgeStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  background: '#e7f1fa',
  color: '#0066cc',
  padding: '2px 10px',
  borderRadius: 12,
};

const cardStyle: CSSProperties = {
  background: '#fafafa',
  border: '1px solid #d2d2d2',
  borderRadius: 8,
  padding: 20,
  marginBottom: 20,
};

const cardHeaderStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#0066cc',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const nestedCardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d2d2d2',
  borderLeft: '4px solid #0066cc',
  borderRadius: 4,
  padding: 16,
  marginTop: 12,
  marginBottom: 12,
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
  marginLeft: 8,
};

const arrayHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
  marginTop: 20,
};

const arrayTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#151515',
};

export function ProjectEditor({ doc, onChange, libraryDocuments }: ProjectEditorProps) {
  const [activeTab, setActiveTab] = useState(0);

  const updateField = useCallback(
    (path: string, value: unknown) => {
      onChange(setValueAtPath(doc, path, value));
    },
    [doc, onChange]
  );

  const addArrayItem = useCallback(
    (path: string, item: unknown) => {
      onChange(appendToArray(doc, path, item));
    },
    [doc, onChange]
  );

  const removeArrayItem = useCallback(
    (path: string, index: number) => {
      onChange(removeFromArray(doc, path, index));
    },
    [doc, onChange]
  );

  const moveItem = useCallback(
    (path: string, from: number, to: number) => {
      onChange(moveArrayItem(doc, path, from, to));
    },
    [doc, onChange]
  );

  // Determine reference type and name
  const practiceName = typeof doc.practiceName === 'string' ? doc.practiceName : '';
  const methodName = typeof doc.methodName === 'string' ? doc.methodName : '';
  const referenceType: 'practice' | 'method' | '' = practiceName ? 'practice' : methodName ? 'method' : '';
  const referenceName = practiceName || methodName;

  // Resolve the referenced practice/method
  const resolved = useResolvedPracticeForProject(referenceName, referenceType, libraryDocuments);
  const pn = resolved.practiceNames;

  // Prepare dropdown options
  const alphaNames = pn ? pn.alphaNames : [];
  const stateNamesByAlpha: Record<string, string[]> = useMemo(() => {
    if (!pn) return {};
    const result: Record<string, string[]> = {};
    pn.stateNamesByAlpha.forEach((states, alpha) => {
      result[alpha] = states;
    });
    return result;
  }, [pn]);

  const workProductNames = pn ? pn.workProductNames : [];
  const levelNamesByWorkProduct: Record<string, string[]> = useMemo(() => {
    if (!pn) return {};
    const result: Record<string, string[]> = {};
    pn.levelOfDetailNamesByWorkProduct.forEach((levels, wp) => {
      result[wp] = levels;
    });
    return result;
  }, [pn]);

  const personaNames = pn ? pn.personaNames : [];
  const alphaInstanceNames = pn ? pn.alphaInstanceNames : [];

  // Practice/method options for the selector
  const practiceOptions = libraryDocuments
    .filter((d) => d.libraryRootKind === 'practice' || d.libraryRootKind === 'baselinePractice')
    .map((d) => d.displayName);

  const methodOptions = libraryDocuments
    .filter((d) => d.libraryRootKind === 'method')
    .map((d) => d.displayName);

  // Pattern from plan
  const plan = doc.plan && typeof doc.plan === 'object' ? (doc.plan as Record<string, unknown>) : { pattern: { name: '', description: '', patternViews: [] }, notes: [] };
  const pattern = plan.pattern && typeof plan.pattern === 'object' ? (plan.pattern as Record<string, unknown>) : { name: '', description: '', patternViews: [] };
  const patternViews = Array.isArray(pattern.patternViews) ? pattern.patternViews : [];

  // Current and target sections
  const current = doc.current && typeof doc.current === 'object' ? (doc.current as Record<string, unknown>) : {};
  const target = doc.target && typeof doc.target === 'object' ? (doc.target as Record<string, unknown>) : {};

  // Team
  const team = doc.team && typeof doc.team === 'object' ? (doc.team as Record<string, unknown>) : { name: '', description: '', members: [], communicationChannels: [], notes: [] };

  return (
    <div style={containerStyle}>
      <Tabs activeKey={activeTab} onSelect={(_, key) => setActiveTab(key as number)}>
        <Tab eventKey={0} title={<TabTitleText>Details</TabTitleText>}>
          <div style={{ padding: '24px 0' }}>
            {/* Project Identity */}
            <div style={sectionHeaderStyle}>Project Identity</div>
            <PropertyTable>
              <PropertyRow label="Name">
                <InlineTextField
                  value={typeof doc.name === 'string' ? doc.name : ''}
                  onChange={(val) => updateField('name', val)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <InlineTextArea
                  value={typeof doc.description === 'string' ? doc.description : ''}
                  onChange={(val) => updateField('description', val)}
                />
              </PropertyRow>
              <PropertyRow label="Version">
                <InlineTextField
                  value={typeof doc.version === 'string' ? doc.version : ''}
                  onChange={(val) => updateField('version', val)}
                />
              </PropertyRow>
            </PropertyTable>

            {/* Practice/Method Reference */}
            <div style={sectionHeaderStyle}>Practice / Method Reference</div>
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="refType"
                    checked={referenceType === 'practice' || referenceType === ''}
                    onChange={() => {
                      updateField('practiceName', '');
                      updateField('methodName', undefined);
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Practice</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="refType"
                    checked={referenceType === 'method'}
                    onChange={() => {
                      updateField('methodName', '');
                      updateField('practiceName', undefined);
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Method</span>
                </label>
              </div>
              <InlineSelectField
                value={referenceName}
                onChange={(val) => {
                  if (referenceType === 'method') {
                    updateField('methodName', val);
                  } else {
                    updateField('practiceName', val);
                  }
                }}
                options={referenceType === 'method' ? methodOptions : practiceOptions}
                placeholder={`Select ${referenceType || 'practice'}...`}
              />
              {resolved.loading && (
                <div style={{ fontSize: 13, color: '#6a6e73', marginTop: 8 }}>Resolving practice/method...</div>
              )}
              {resolved.error && (
                <div style={{ fontSize: 13, color: '#c9190b', marginTop: 8 }}>{resolved.error}</div>
              )}
            </div>

            {/* Metadata */}
            <div style={sectionHeaderStyle}>Metadata</div>
            <PropertyTable>
              <PropertyRow label="Created">
                <InlineTextField
                  value={typeof doc.createdAt === 'string' ? doc.createdAt : ''}
                  onChange={(val) => updateField('createdAt', val)}
                />
              </PropertyRow>
              <PropertyRow label="Updated">
                <InlineTextField
                  value={typeof doc.updatedAt === 'string' ? doc.updatedAt : ''}
                  onChange={(val) => updateField('updatedAt', val)}
                />
              </PropertyRow>
            </PropertyTable>
            <StringArrayField
              value={Array.isArray(doc.authors) ? doc.authors as string[] : []}
              onChange={(val) => updateField('authors', val)}
              label="Authors"
              placeholder="One author per line"
            />
            <StringArrayField
              value={Array.isArray(doc.keywords) ? doc.keywords as string[] : []}
              onChange={(val) => updateField('keywords', val)}
              label="Keywords"
              placeholder="One keyword per line"
            />
            {doc.tags !== undefined && (
              <TagsField
                value={doc.tags as any}
                onChange={(val) => updateField('tags', val)}
                fieldPath="tags"
              />
            )}

            {/* Team */}
            <div style={sectionHeaderStyle}>Team</div>
            <div style={cardStyle}>
              <PropertyTable>
                <PropertyRow label="Team Name">
                  <InlineTextField
                    value={typeof team.name === 'string' ? team.name : ''}
                    onChange={(val) => updateField('team.name', val)}
                  />
                </PropertyRow>
                <PropertyRow label="Team Description">
                  <InlineTextArea
                    value={typeof team.description === 'string' ? team.description : ''}
                    onChange={(val) => updateField('team.description', val)}
                  />
                </PropertyRow>
              </PropertyTable>
              <CommunicationChannelsField
                value={Array.isArray(team.communicationChannels) ? team.communicationChannels as Record<string, unknown>[] : []}
                onChange={(val) => updateField('team.communicationChannels', val)}
              />
              <TeamMembersField
                value={Array.isArray(team.members) ? team.members as Record<string, unknown>[] : []}
                onChange={(val) => updateField('team.members', val)}
                personaNames={personaNames}
              />
              <NotesField
                value={Array.isArray(team.notes) ? team.notes as Record<string, unknown>[] : []}
                onChange={(val) => updateField('team.notes', val)}
                label="Team Notes"
              />
            </div>

            {/* Project-level Notes */}
            <div style={sectionHeaderStyle}>Project Notes</div>
            <NotesField
              value={Array.isArray(doc.notes) ? doc.notes as Record<string, unknown>[] : []}
              onChange={(val) => updateField('notes', val)}
            />
          </div>
        </Tab>

        <Tab eventKey={1} title={<TabTitleText>Plan</TabTitleText>}>
          <div style={{ padding: '24px 0' }}>
            <div style={sectionHeaderStyle}>
              <span>Project Plan</span>
              <span style={badgeStyle}>{patternViews.length} phase{patternViews.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Pattern Identity */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>Pattern</div>
              <PropertyTable>
                <PropertyRow label="Name">
                  <InlineTextField
                    value={typeof pattern.name === 'string' ? pattern.name : ''}
                    onChange={(val) => updateField('plan.pattern.name', val)}
                  />
                </PropertyRow>
                <PropertyRow label="Description">
                  <InlineTextArea
                    value={typeof pattern.description === 'string' ? pattern.description : ''}
                    onChange={(val) => updateField('plan.pattern.description', val)}
                  />
                </PropertyRow>
                <PropertyRow label="Narrative Type">
                  <InlineTextField
                    value={typeof pattern.narrativeTypeName === 'string' ? pattern.narrativeTypeName : ''}
                    onChange={(val) => updateField('plan.pattern.narrativeTypeName', val)}
                  />
                </PropertyRow>
              </PropertyTable>
            </div>

            {/* Pattern Views */}
            <div style={arrayHeaderStyle}>
              <div style={arrayTitleStyle}>Pattern Views ({patternViews.length})</div>
              <button
                type="button"
                onClick={() => addArrayItem('plan.pattern.patternViews', emptyPatternView(patternViews.length + 1))}
                style={buttonStyle}
              >
                + Add View
              </button>
            </div>

            {patternViews.map((view: any, viewIdx: number) => (
              <div key={viewIdx} style={nestedCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0066cc' }}>
                    View {view.seq ?? viewIdx + 1}: {view.name || '(unnamed)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('plan.pattern.patternViews', viewIdx)}
                    style={dangerButtonStyle}
                  >
                    Remove
                  </button>
                </div>
                <PropertyTable>
                  <PropertyRow label="Name">
                    <InlineTextField
                      value={view.name || ''}
                      onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].name`, val)}
                    />
                  </PropertyRow>
                  <PropertyRow label="Description">
                    <InlineTextArea
                      value={view.description || ''}
                      onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].description`, val)}
                    />
                  </PropertyRow>
                </PropertyTable>
                <AlphaContributionsField
                  value={view.alphaStates}
                  onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].alphaStates`, val)}
                  alphaNames={alphaNames}
                  stateNamesByAlpha={pn?.stateNamesByAlpha ?? new Map()}
                  label="Alpha States"
                />
                <AlphaInstancesField
                  value={view.alphaInstances}
                  onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].alphaInstances`, val)}
                  alphaNames={alphaNames}
                  stateNamesByAlpha={pn?.stateNamesByAlpha ?? new Map()}
                  alphaInstanceNames={alphaInstanceNames}
                  workProductNames={workProductNames}
                  levelOfDetailNamesByWorkProduct={pn?.levelOfDetailNamesByWorkProduct ?? new Map()}
                  label="Alpha Instances"
                />
                <StringArrayField
                  value={view.activitySpaces}
                  onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].activitySpaces`, val)}
                  label="Activity Spaces"
                  placeholder="One activity space per line"
                />
                <StringArrayField
                  value={view.activities}
                  onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].activities`, val)}
                  label="Activities"
                  placeholder="One activity per line"
                />
                {view.narrativeContexts !== undefined && (
                  <NarrativeContextsField
                    value={view.narrativeContexts}
                    onChange={(val) => updateField(`plan.pattern.patternViews[${viewIdx}].narrativeContexts`, val)}
                    narrativeTypeNames={[]}
                    narrativeTypesData={[]}
                    label="Narrative Contexts"
                  />
                )}
              </div>
            ))}

            {/* Plan Notes */}
            <div style={{ marginTop: 24 }}>
              <NotesField
                value={Array.isArray(plan.notes) ? plan.notes as Record<string, unknown>[] : []}
                onChange={(val) => updateField('plan.notes', val)}
                label="Plan Notes"
              />
            </div>
          </div>
        </Tab>

        <Tab eventKey={2} title={<TabTitleText>Current</TabTitleText>}>
          <div style={{ padding: '24px 0' }}>
            <div style={sectionHeaderStyle}>Current State</div>
            <ProjectStateSectionEditor
              section={current}
              basePath="current"
              onChange={(updated) => updateField('current', updated)}
              alphaNames={alphaNames}
              stateNamesByAlpha={stateNamesByAlpha}
              workProductNames={workProductNames}
              levelNamesByWorkProduct={levelNamesByWorkProduct}
              checklistNamesByAlphaState={resolved.checklistNamesByAlphaState}
              checklistNamesByWPLoD={resolved.checklistNamesByWPLoD}
              sectionLabel="Current"
            />
          </div>
        </Tab>

        <Tab eventKey={3} title={<TabTitleText>Target</TabTitleText>}>
          <div style={{ padding: '24px 0' }}>
            <div style={sectionHeaderStyle}>Target State</div>
            <ProjectStateSectionEditor
              section={target}
              basePath="target"
              onChange={(updated) => updateField('target', updated)}
              alphaNames={alphaNames}
              stateNamesByAlpha={stateNamesByAlpha}
              workProductNames={workProductNames}
              levelNamesByWorkProduct={levelNamesByWorkProduct}
              checklistNamesByAlphaState={resolved.checklistNamesByAlphaState}
              checklistNamesByWPLoD={resolved.checklistNamesByWPLoD}
              sectionLabel="Target"
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
