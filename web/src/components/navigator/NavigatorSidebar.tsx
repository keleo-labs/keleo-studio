"use client";

import { useState } from "react";
import type { PracticeBaseline, Asset } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

type NavigatorMode = "concerns" | "activities";

interface FocusGroup {
  focusName: string;
  focus: {
    name: string;
    description: string;
  } | null;
  alphas: PracticeBaseline["alphas"];
  activitySpaces: PracticeBaseline["activitySpaces"];
}

interface NavigatorSidebarProps {
  mode: NavigatorMode;
  groupedByFocus: FocusGroup[];
  selectedFocus: string | null;
  selectedElement: string | null;
  assets: Asset[];
  baseline: PracticeBaseline;
  onSetMode: (mode: NavigatorMode) => void;
  onSetSelectedFocus: (focus: string | null) => void;
  onSetSelectedElement: (element: string | null) => void;
}

function getElementIcon(
  element: { name: string; assetNames?: Array<{ assetName: string; type: string }> },
  assets: Asset[]
): Asset | null {
  const assetRef = element.assetNames?.find((a) => a.type === "icon");
  return assetRef ? findAsset(assetRef.assetName, assets) : null;
}

export function NavigatorSidebar({
  mode,
  groupedByFocus,
  selectedFocus,
  selectedElement,
  assets,
  baseline,
  onSetMode,
  onSetSelectedFocus,
  onSetSelectedElement,
}: NavigatorSidebarProps) {
  const [expandedFocuses, setExpandedFocuses] = useState<Set<string>>(new Set());
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());

  const toggleFocus = (focusName: string) => {
    const newSet = new Set(expandedFocuses);
    if (newSet.has(focusName)) {
      newSet.delete(focusName);
    } else {
      newSet.add(focusName);
    }
    setExpandedFocuses(newSet);
  };

  const toggleElement = (elementName: string) => {
    const newSet = new Set(expandedElements);
    if (newSet.has(elementName)) {
      newSet.delete(elementName);
    } else {
      newSet.add(elementName);
    }
    setExpandedElements(newSet);
  };

  // Recursive function to render alpha tree
  const renderAlphaTree = (
    alphas: PracticeBaseline["alphas"],
    parentName: string | null,
    depth: number = 0
  ): JSX.Element[] => {
    const childAlphas = alphas.filter((a) => a.contributesTo === parentName);

    return childAlphas.map((alpha) => {
      const icon = getElementIcon(alpha, assets);
      const isSelected = selectedElement === alpha.name;
      const hasChildren = alphas.some((a) => a.contributesTo === alpha.name);
      const isExpanded = expandedElements.has(alpha.name);

      return (
        <div key={alpha.name}>
          <button
            onClick={() => {
              onSetSelectedElement(alpha.name);
              if (hasChildren) {
                toggleElement(alpha.name);
              }
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.5rem",
              backgroundColor: isSelected
                ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                : "transparent",
              border: "none",
              borderLeft: isSelected
                ? "3px solid var(--pf-v6-global--primary-color--100)"
                : "3px solid transparent",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              cursor: "pointer",
              textAlign: "left",
              fontSize: depth === 0 ? "0.8125rem" : "0.75rem",
              color: "var(--pf-v6-global--Color--100)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor =
                  "var(--pf-v6-global--BackgroundColor--200)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {/* Reserve space for arrow */}
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.625rem",
                color: "var(--pf-v6-global--Color--200)",
                flexShrink: 0,
                width: "0.75rem",
                textAlign: "center",
              }}
            >
              {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
            </span>
            {icon && (
              <IconAsset
                asset={icon}
                size={depth === 0 ? 16 : 14}
                style={{ flexShrink: 0 }}
              />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              <AliasedName kind="alpha" name={alpha.name} browse={false} />
            </span>
          </button>

          {/* Recursively render children */}
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: "1.5rem", marginTop: "0.25rem" }}>
              {renderAlphaTree(alphas, alpha.name, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <nav
      aria-label="Practice navigator"
      style={{
        position: "sticky",
        top: 0,
        maxHeight: "100vh",
        overflowY: "auto",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
        borderRight: "1px solid var(--pf-v6-global--BorderColor--100)",
        padding: "1rem",
      }}
    >
      {/* Introduction Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => onSetSelectedElement("__introduction__")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem",
            backgroundColor: selectedElement === "__introduction__"
              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
              : "transparent",
            border: "none",
            borderLeft: selectedElement === "__introduction__"
              ? "3px solid var(--pf-v6-global--primary-color--100)"
              : "3px solid transparent",
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--pf-v6-global--Color--100)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (selectedElement !== "__introduction__") {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedElement !== "__introduction__") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fa-solid fa-book-open" />
          <span>{baseline.name}</span>
        </button>
      </div>

      {/* Patterns Section */}
      {baseline.patterns && baseline.patterns.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--200)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Patterns
            </div>
            {baseline.patterns.map((pattern) => {
              const icon = getElementIcon(pattern, assets);
              const isSelected = selectedElement === pattern.name;

              return (
                <button
                  key={pattern.name}
                  onClick={() => onSetSelectedElement(pattern.name)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.375rem 0.5rem",
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                      : "transparent",
                    border: "none",
                    borderLeft: isSelected
                      ? "3px solid var(--pf-v6-global--primary-color--100)"
                      : "3px solid transparent",
                    borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.8125rem",
                    color: "var(--pf-v6-global--Color--100)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor =
                        "var(--pf-v6-global--BackgroundColor--200)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {icon && (
                    <IconAsset asset={icon} size={16} style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    <AliasedName kind="pattern" name={pattern.name} browse={false} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              margin: "1rem 0 1.5rem 0",
              borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
            }}
          />
        </>
      )}

      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.5rem",
          padding: "0.25rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        }}
      >
        <button
          onClick={() => onSetMode("concerns")}
          style={{
            flex: 1,
            padding: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: mode === "concerns"
              ? "2px solid var(--pf-v6-global--primary-color--100)"
              : "2px solid transparent",
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            cursor: "pointer",
            backgroundColor:
              mode === "concerns"
                ? "var(--pf-v6-global--BackgroundColor--100)"
                : "transparent",
            color:
              mode === "concerns"
                ? "var(--pf-v6-global--primary-color--100)"
                : "var(--pf-v6-global--Color--200)",
            transition: "all 0.2s",
            boxShadow:
              mode === "concerns"
                ? "0 2px 4px rgba(0, 0, 0, 0.1)"
                : "none",
          }}
        >
          Concerns
        </button>
        <button
          onClick={() => onSetMode("activities")}
          style={{
            flex: 1,
            padding: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: mode === "activities"
              ? "2px solid var(--pf-v6-global--primary-color--100)"
              : "2px solid transparent",
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            cursor: "pointer",
            backgroundColor:
              mode === "activities"
                ? "var(--pf-v6-global--BackgroundColor--100)"
                : "transparent",
            color:
              mode === "activities"
                ? "var(--pf-v6-global--primary-color--100)"
                : "var(--pf-v6-global--Color--200)",
            transition: "all 0.2s",
            boxShadow:
              mode === "activities"
                ? "0 2px 4px rgba(0, 0, 0, 0.1)"
                : "none",
          }}
        >
          Activities
        </button>
      </div>

      {/* Overview button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => onSetSelectedElement("__overview__")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.5rem",
            backgroundColor: selectedElement === "__overview__"
              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
              : "transparent",
            border: "none",
            borderLeft: selectedElement === "__overview__"
              ? "3px solid var(--pf-v6-global--primary-color--100)"
              : "3px solid transparent",
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "0.8125rem",
            color: "var(--pf-v6-global--Color--100)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (selectedElement !== "__overview__") {
              e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedElement !== "__overview__") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fa-solid fa-chart-simple" style={{ fontSize: "0.875rem", width: "16px", textAlign: "center" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            Overview
          </span>
        </button>
      </div>

      {/* Hierarchical navigation by Focus */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {groupedByFocus.map((group) => {
          const isExpanded = expandedFocuses.has(group.focusName);
          const elements =
            mode === "concerns" ? group.alphas : group.activitySpaces;

          // Filter to root elements only (for concerns mode)
          const rootElements =
            mode === "concerns"
              ? group.alphas.filter((alpha) => !alpha.contributesTo)
              : group.activitySpaces;

          return (
            <div key={group.focusName}>
              {/* Focus header */}
              <button
                onClick={() => toggleFocus(group.focusName)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor:
                    selectedFocus === group.focusName
                      ? "var(--pf-v6-global--BackgroundColor--200)"
                      : "transparent",
                  border: "none",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--pf-v6-global--Color--100)",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (selectedFocus !== group.focusName) {
                    e.currentTarget.style.backgroundColor =
                      "var(--pf-v6-global--BackgroundColor--200)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFocus !== group.focusName) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    color: "var(--pf-v6-global--Color--200)",
                  }}
                >
                  {isExpanded ? "▾" : "▸"}
                </span>
                <span>{group.focusName}</span>
              </button>

              {/* Elements list */}
              {isExpanded && (
                <div style={{ marginLeft: "1rem", marginTop: "0.25rem" }}>
                  {rootElements.map((element) => {
                    const icon = getElementIcon(element, assets);
                    const isSelected = selectedElement === element.name;
                    const hasChildren =
                      mode === "concerns"
                        ? (baseline.alphas ?? []).some(
                            (a) => a.contributesTo === element.name
                          )
                        : "activities" in element && element.activities && element.activities.length > 0;
                    const isElementExpanded = expandedElements.has(element.name);

                    return (
                      <div key={element.name}>
                        <button
                          onClick={() => {
                            onSetSelectedElement(element.name);
                            if (hasChildren) {
                              toggleElement(element.name);
                            }
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.375rem 0.5rem",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                              : "transparent",
                            border: "none",
                            borderLeft: isSelected
                              ? "3px solid var(--pf-v6-global--primary-color--100)"
                              : "3px solid transparent",
                            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: "0.8125rem",
                            color: "var(--pf-v6-global--Color--100)",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "var(--pf-v6-global--BackgroundColor--200)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          {/* Reserve space for arrow even if not present */}
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.625rem",
                              color: "var(--pf-v6-global--Color--200)",
                              flexShrink: 0,
                              width: "0.75rem",
                              textAlign: "center",
                            }}
                          >
                            {hasChildren ? (isElementExpanded ? "▾" : "▸") : ""}
                          </span>
                          {icon && (
                            <IconAsset
                              asset={icon}
                              size={16}
                              style={{ flexShrink: 0 }}
                            />
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            <AliasedName kind={mode === "concerns" ? "alpha" : "activitySpace"} name={element.name} browse={false} />
                          </span>
                        </button>

                        {/* Child elements (contributing alphas or activities) */}
                        {hasChildren && isElementExpanded && (
                          <div style={{ marginLeft: "1.5rem", marginTop: "0.25rem" }}>
                            {mode === "concerns"
                              ? renderAlphaTree(baseline.alphas ?? [], element.name, 0)
                              : "activities" in element &&
                                element.activities?.map((activity) => {
                                  const activityIcon = getElementIcon(activity, assets);
                                  const isActivitySelected = selectedElement === activity.name;

                                  return (
                                    <button
                                      key={activity.name}
                                      onClick={() => onSetSelectedElement(activity.name)}
                                      style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.375rem 0.5rem",
                                        backgroundColor: isActivitySelected
                                          ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                          : "transparent",
                                        border: "none",
                                        borderLeft: isActivitySelected
                                          ? "3px solid var(--pf-v6-global--primary-color--100)"
                                          : "3px solid transparent",
                                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "0.75rem",
                                        color: "var(--pf-v6-global--Color--100)",
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isActivitySelected) {
                                          e.currentTarget.style.backgroundColor =
                                            "var(--pf-v6-global--BackgroundColor--200)";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isActivitySelected) {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                        }
                                      }}
                                    >
                                      {activityIcon && (
                                        <IconAsset
                                          asset={activityIcon}
                                          size={14}
                                          style={{ flexShrink: 0 }}
                                        />
                                      )}
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                        <AliasedName kind="activity" name={activity.name} browse={false} />
                                      </span>
                                    </button>
                                  );
                                })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div
        style={{
          margin: "1.5rem 0",
          borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
        }}
      />

      {/* Work Products Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--pf-v6-global--Color--200)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}
        >
          Work Products
        </div>
        {baseline.workProducts && baseline.workProducts.length > 0 ? (
          baseline.workProducts.map((wp) => {
            const icon = getElementIcon(wp, assets);
            const isSelected = selectedElement === wp.name;

            return (
              <button
                key={wp.name}
                onClick={() => onSetSelectedElement(wp.name)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.5rem",
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                    : "transparent",
                  border: "none",
                  borderLeft: isSelected
                    ? "3px solid var(--pf-v6-global--primary-color--100)"
                    : "3px solid transparent",
                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.8125rem",
                  color: "var(--pf-v6-global--Color--100)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor =
                      "var(--pf-v6-global--BackgroundColor--200)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {icon && (
                  <IconAsset asset={icon} size={16} style={{ flexShrink: 0 }} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  <AliasedName kind="workProduct" name={wp.name} browse={false} />
                </span>
              </button>
            );
          })
        ) : (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--pf-v6-global--Color--200)",
              fontStyle: "italic",
              padding: "0.5rem",
            }}
          >
            No work products
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          margin: "1.5rem 0",
          borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
        }}
      />

      {/* Roles & Competencies Section */}
      {((baseline.personaGroups && baseline.personaGroups.length > 0) ||
        (baseline.competencies && baseline.competencies.length > 0)) && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--pf-v6-global--Color--200)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Roles & Competencies
            </div>

            {/* Persona Groups (hierarchical) */}
            {baseline.personaGroups && baseline.personaGroups.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--pf-v6-global--Color--200)",
                    marginBottom: "0.5rem",
                  }}
                >
                  PERSONA GROUPS
                </div>
                {baseline.personaGroups.map((personaGroup) => {
                  const icon = getElementIcon(personaGroup, assets);
                  const isSelected = selectedElement === personaGroup.name;
                  const isExpanded = expandedElements.has(personaGroup.name);
                  const hasPersonas = personaGroup.personaNames && personaGroup.personaNames.length > 0;

                  return (
                    <div key={personaGroup.name}>
                      <button
                        onClick={() => {
                          onSetSelectedElement(personaGroup.name);
                          if (hasPersonas) {
                            toggleElement(personaGroup.name);
                          }
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.375rem 0.5rem",
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                            : "transparent",
                          border: "none",
                          borderLeft: isSelected
                            ? "3px solid var(--pf-v6-global--primary-color--100)"
                            : "3px solid transparent",
                          borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.8125rem",
                          color: "var(--pf-v6-global--Color--100)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "var(--pf-v6-global--BackgroundColor--200)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.625rem",
                            color: "var(--pf-v6-global--Color--200)",
                            flexShrink: 0,
                            width: "0.75rem",
                            textAlign: "center",
                          }}
                        >
                          {hasPersonas ? (isExpanded ? "▾" : "▸") : ""}
                        </span>
                        {icon && <IconAsset asset={icon} size={16} style={{ flexShrink: 0 }} />}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          <AliasedName kind="personaGroup" name={personaGroup.name} browse={false} />
                        </span>
                      </button>

                      {/* Child personas */}
                      {hasPersonas && isExpanded && (
                        <div style={{ marginLeft: "1.5rem", marginTop: "0.25rem" }}>
                          {personaGroup.personaNames.map((personaName) => {
                            const persona = baseline.personas?.find((p) => p.name === personaName);
                            if (!persona) return null;

                            const personaIcon = getElementIcon(persona, assets);
                            const isPersonaSelected = selectedElement === persona.name;

                            return (
                              <button
                                key={persona.name}
                                onClick={() => onSetSelectedElement(persona.name)}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.375rem 0.5rem",
                                  backgroundColor: isPersonaSelected
                                    ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                                    : "transparent",
                                  border: "none",
                                  borderLeft: isPersonaSelected
                                    ? "3px solid var(--pf-v6-global--primary-color--100)"
                                    : "3px solid transparent",
                                  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  fontSize: "0.75rem",
                                  color: "var(--pf-v6-global--Color--100)",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isPersonaSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--pf-v6-global--BackgroundColor--200)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isPersonaSelected) {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                {personaIcon && <IconAsset asset={personaIcon} size={14} style={{ flexShrink: 0 }} />}
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                  <AliasedName kind="persona" name={persona.name} browse={false} />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Competencies (flat list) */}
            {baseline.competencies && baseline.competencies.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--pf-v6-global--Color--200)",
                    marginBottom: "0.5rem",
                  }}
                >
                  COMPETENCIES
                </div>
                {baseline.competencies.map((competency) => {
                  const icon = getElementIcon(competency, assets);
                  const isSelected = selectedElement === competency.name;

                  return (
                    <button
                      key={competency.name}
                      onClick={() => onSetSelectedElement(competency.name)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.5rem",
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
                          : "transparent",
                        border: "none",
                        borderLeft: isSelected
                          ? "3px solid var(--pf-v6-global--primary-color--100)"
                          : "3px solid transparent",
                        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "0.8125rem",
                        color: "var(--pf-v6-global--Color--100)",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor =
                            "var(--pf-v6-global--BackgroundColor--200)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {icon && <IconAsset asset={icon} size={16} style={{ flexShrink: 0 }} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        <AliasedName kind="competency" name={competency.name} browse={false} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              margin: "1.5rem 0",
              borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
            }}
          />
        </>
      )}

      {/* References Button */}
      <div>
        <button
          onClick={() => onSetSelectedElement("__references__")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.5rem",
            backgroundColor: selectedElement === "__references__"
              ? "color-mix(in srgb, var(--pf-v6-global--primary-color--100) 10%, transparent)"
              : "transparent",
            border: "none",
            borderLeft: selectedElement === "__references__"
              ? "3px solid var(--pf-v6-global--primary-color--100)"
              : "3px solid transparent",
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "0.8125rem",
            color: "var(--pf-v6-global--Color--100)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (selectedElement !== "__references__") {
              e.currentTarget.style.backgroundColor =
                "var(--pf-v6-global--BackgroundColor--200)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedElement !== "__references__") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fa-solid fa-book" style={{ fontSize: "0.875rem", width: "16px", textAlign: "center" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            References
          </span>
        </button>
      </div>
    </nav>
  );
}
