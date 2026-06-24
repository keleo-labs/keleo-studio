"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';

export type ArrayFieldProps = {
  items: unknown[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: unknown, index: number, isReadonly: boolean) => ReactNode;
  label: string;
  fieldPath: string;
  minItems?: number;
  maxItems?: number;
  addButtonLabel?: string;
  required?: boolean;
  // NEW: Mark which items are readonly (from baseline/dependencies)
  readonlyItemIndices?: Set<number>;
  readonlyItemNames?: Set<string>;  // For name-based tracking
  // NEW: Get a summary/preview of each item for the collapsed state
  getItemSummary?: (item: unknown, index: number) => string;
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  display: 'block',
  marginBottom: 8,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const badgeStyle: CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  marginLeft: 8,
};

const buttonStyle: CSSProperties = {
  background: 'rgba(139,92,246,0.15)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const itemContainerStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.1)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  position: 'relative',
};

const itemHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
};

const itemIndexStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  textTransform: 'uppercase',
};

const itemActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
};

const iconButtonStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 12,
  cursor: 'pointer',
  color: 'var(--text)',
  transition: 'all 0.15s',
};

const dangerButtonStyle: CSSProperties = {
  ...iconButtonStyle,
  borderColor: 'rgba(251,113,133,0.5)',
  color: 'rgba(251,113,133,1)',
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: 24,
  color: 'var(--muted)',
  fontSize: 13,
  border: '1px dashed var(--border)',
  borderRadius: 8,
  marginBottom: 12,
};

export function ArrayField({
  items,
  onAdd,
  onRemove,
  onMove,
  renderItem,
  label,
  fieldPath,
  minItems = 0,
  maxItems,
  addButtonLabel = 'Add Item',
  required,
  readonlyItemIndices,
  readonlyItemNames,
  getItemSummary,
}: ArrayFieldProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    new Set(items.map((_, i) => i))
  );

  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onMove(index, index - 1);
    }
  }, [onMove]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < items.length - 1) {
      onMove(index, index + 1);
    }
  }, [onMove, items.length]);

  const canRemove = items.length > minItems;
  const canAdd = !maxItems || items.length < maxItems;

  // Check if an item is readonly based on index or name
  const isItemReadonly = useCallback((item: unknown, index: number): boolean => {
    if (readonlyItemIndices?.has(index)) {
      return true;
    }
    if (readonlyItemNames && item && typeof item === 'object' && 'name' in item) {
      const itemName = typeof item.name === 'string' ? item.name : String(item.name);
      return readonlyItemNames.has(itemName);
    }
    return false;
  }, [readonlyItemIndices, readonlyItemNames]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={headerStyle}>
        <div>
          <span style={labelStyle}>
            {label}
            {required && <span style={{ color: 'rgba(251,113,133,1)', marginLeft: 4 }}>*</span>}
            <span style={badgeStyle}>{items.length}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          style={{
            ...buttonStyle,
            opacity: canAdd ? 1 : 0.5,
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (canAdd) {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (canAdd) {
              e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
              e.currentTarget.style.color = 'var(--accent)';
            }
          }}
        >
          + {addButtonLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div style={emptyStateStyle}>
          No items yet. Click "{addButtonLabel}" to add one.
        </div>
      ) : (
        items.map((item, index) => {
          const isExpanded = expandedItems.has(index);
          const isReadonly = isItemReadonly(item, index);
          const canRemoveThis = canRemove && !isReadonly;
          const canMoveThis = !isReadonly;

          return (
            <div
              key={index}
              style={{
                ...itemContainerStyle,
                opacity: isReadonly ? 0.7 : 1,
                borderStyle: isReadonly ? 'dashed' : 'solid',
              }}
            >
              <div style={itemHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={itemIndexStyle}>
                    #{index + 1}
                  </div>
                  {getItemSummary ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                      {getItemSummary(item, index)}
                    </div>
                  ) : (
                    <div style={itemIndexStyle}>Item {index + 1} of {items.length}</div>
                  )}
                  {isReadonly && <span style={{ fontSize: 10, color: 'var(--muted)' }}>🔒 readonly</span>}
                </div>
                <div style={itemActionsStyle}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(index)}
                    style={iconButtonStyle}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || !canMoveThis}
                    style={{
                      ...iconButtonStyle,
                      opacity: (index === 0 || !canMoveThis) ? 0.3 : 1,
                      cursor: (index === 0 || !canMoveThis) ? 'not-allowed' : 'pointer',
                    }}
                    title={isReadonly ? 'Cannot reorder readonly items' : 'Move Up'}
                    onMouseEnter={(e) => {
                      if (index !== 0 && canMoveThis) {
                        e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== 0 && canMoveThis) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1 || !canMoveThis}
                    style={{
                      ...iconButtonStyle,
                      opacity: (index === items.length - 1 || !canMoveThis) ? 0.3 : 1,
                      cursor: (index === items.length - 1 || !canMoveThis) ? 'not-allowed' : 'pointer',
                    }}
                    title={isReadonly ? 'Cannot reorder readonly items' : 'Move Down'}
                    onMouseEnter={(e) => {
                      if (index !== items.length - 1 && canMoveThis) {
                        e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== items.length - 1 && canMoveThis) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={!canRemoveThis}
                    style={{
                      ...dangerButtonStyle,
                      opacity: canRemoveThis ? 1 : 0.3,
                      cursor: canRemoveThis ? 'pointer' : 'not-allowed',
                    }}
                    title={isReadonly ? 'Cannot remove readonly items' : 'Remove'}
                    onMouseEnter={(e) => {
                      if (canRemoveThis) {
                        e.currentTarget.style.background = 'rgba(251,113,133,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canRemoveThis) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              {isExpanded && <div>{renderItem(item, index, isReadonly)}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
