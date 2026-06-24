"use client";

import React, { useMemo, useState } from "react";
import {
  PageSection,
  PageSectionVariants,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  Content,
  ContentVariants,
  List,
  ListItem,
  ListVariant,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Label,
  Divider,
} from "@patternfly/react-core";
import type { PracticeReportSection } from "@/lib/practiceReport";
import { buildPracticeReport } from "@/lib/practiceReport";

// Navigation tree item for sidebar
type NavItem = {
  id: string;
  label: string;
  depth: number;
  children?: NavItem[];
};

function buildNavigationTree(sections: PracticeReportSection[], parentId = ""): NavItem[] {
  return sections.map((section, idx) => {
    const id = parentId ? `${parentId}-${idx}` : `section-${idx}`;
    const item: NavItem = {
      id,
      label: section.heading,
      depth: parentId.split("-").length - 1,
    };

    if (section.subsections?.length) {
      item.children = buildNavigationTree(section.subsections, id);
    }

    return item;
  });
}

function NavigationTreeItem({
  item,
  activeSection,
  onNavigate,
  expandedSections,
  onToggleExpand,
}: {
  item: NavItem;
  activeSection: string;
  onNavigate: (id: string) => void;
  expandedSections: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedSections.has(item.id);
  const isActive = activeSection === item.id;

  return (
    <li style={{ marginBottom: "0.25rem", listStyle: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(item.id);
            }}
            style={{
              marginRight: "0.25rem",
              marginTop: "0.25rem",
              display: "flex",
              height: "1rem",
              width: "1rem",
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--pf-v6-global--Color--200)",
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg style={{ height: "0.75rem", width: "0.75rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              )}
            </svg>
          </button>
        )}
        <button
          onClick={() => onNavigate(item.id)}
          className="pf-v6-c-nav__link"
          style={{
            flex: 1,
            borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
            padding: "0.5rem",
            textAlign: "left",
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer",
            marginLeft: hasChildren ? "0" : "1.25rem",
            paddingLeft: `${item.depth * 0.75 + 0.5}rem`,
            backgroundColor: isActive ? "var(--pf-v6-global--primary-color--100)" : "transparent",
            color: isActive ? "var(--pf-v6-global--Color--light-100)" : "var(--pf-v6-global--Color--100)",
            fontWeight: isActive ? 600 : 400,
          }}
        >
          {item.label}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul
          style={{
            marginLeft: "0.5rem",
            marginTop: "0.25rem",
            borderLeft: "2px solid var(--pf-v6-global--BorderColor--100)",
            paddingLeft: "0.5rem",
          }}
        >
          {item.children!.map((child) => (
            <NavigationTreeItem
              key={child.id}
              item={child}
              activeSection={activeSection}
              onNavigate={onNavigate}
              expandedSections={expandedSections}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavigationSidebar({
  navTree,
  activeSection,
  onNavigate,
}: {
  navTree: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Start with all sections expanded
    const allIds = new Set<string>();
    const collectIds = (items: NavItem[]) => {
      items.forEach((item) => {
        allIds.add(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(navTree);
    return allIds;
  });

  const toggleExpand = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <nav style={{ position: "sticky", top: "1rem", height: "fit-content" }}>
      <Card>
        <CardBody>
          <Title headingLevel="h3" size="md" style={{ marginBottom: "1rem" }}>
            Contents
          </Title>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {navTree.map((item) => (
              <NavigationTreeItem
                key={item.id}
                item={item}
                activeSection={activeSection}
                onNavigate={onNavigate}
                expandedSections={expandedSections}
                onToggleExpand={toggleExpand}
              />
            ))}
          </ul>
        </CardBody>
      </Card>
    </nav>
  );
}

function getBreadcrumbPath(sectionId: string, navTree: NavItem[]): string[] {
  const path: string[] = [];

  const findPath = (items: NavItem[], targetId: string, currentPath: string[]): boolean => {
    for (const item of items) {
      const newPath = [...currentPath, item.label];
      if (item.id === targetId) {
        path.push(...newPath);
        return true;
      }
      if (item.children && findPath(item.children, targetId, newPath)) {
        return true;
      }
    }
    return false;
  };

  findPath(navTree, sectionId, []);
  return path;
}

type AlphaScore = {
  alphaName: string;
  focusName: string;
  score: number;
  description: string;
};

function calculateAlphaScores(doc: unknown): AlphaScore[] {
  if (!doc || typeof doc !== "object") return [];
  const d = doc as Record<string, unknown>;

  const scores: AlphaScore[] = [];
  const alphas = Array.isArray(d.alphas) ? d.alphas : [];
  const workProducts = Array.isArray(d.workProducts) ? d.workProducts : [];
  const activitySpaces = Array.isArray(d.activitySpaces) ? d.activitySpaces : [];

  // Collect all activities
  const activities: any[] = [];
  for (const space of activitySpaces) {
    if (space && typeof space === "object") {
      const spaceActivities = Array.isArray((space as any).activities) ? (space as any).activities : [];
      activities.push(...spaceActivities);
    }
  }
  if (Array.isArray(d.activities)) {
    activities.push(...d.activities);
  }

  for (const alpha of alphas) {
    if (!alpha || typeof alpha !== "object") continue;
    const alphaObj = alpha as Record<string, unknown>;
    const alphaName = String(alphaObj.name ?? "").trim();
    const focusName = String(alphaObj.focusName ?? "").trim();
    const description = String(alphaObj.description ?? "").trim();

    let score = 0;

    // +1 for each narrative
    const narratives = Array.isArray(alphaObj.narratives) ? alphaObj.narratives : [];
    score += narratives.length;

    // +1 for each state with checklists
    const states = Array.isArray(alphaObj.states) ? alphaObj.states : [];
    for (const state of states) {
      if (state && typeof state === "object") {
        const checklist = Array.isArray((state as any).checklist) ? (state as any).checklist : [];
        if (checklist.length > 0) score += 1;
      }
    }

    // +1 for each work product contributing to this alpha
    for (const wp of workProducts) {
      if (!wp || typeof wp !== "object") continue;
      const lods = Array.isArray((wp as any).levelsOfDetail) ? (wp as any).levelsOfDetail : [];
      let counted = false;
      for (const lod of lods) {
        if (counted) break;
        if (!lod || typeof lod !== "object") continue;
        const contributesTo = Array.isArray((lod as any).contributesTo) ? (lod as any).contributesTo : [];
        for (const contrib of contributesTo) {
          if (contrib && typeof contrib === "object" && String((contrib as any).alphaName ?? "") === alphaName) {
            score += 1;
            counted = true;
            break;
          }
        }
      }
    }

    // +1 for each activity contributing to this alpha
    for (const activity of activities) {
      if (!activity || typeof activity !== "object") continue;
      const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];
      let counted = false;
      for (const contrib of contributesTo) {
        if (contrib && typeof contrib === "object" && String((contrib as any).alphaName ?? "") === alphaName) {
          score += 1;
          counted = true;
          break;
        }
      }
      if (counted) break;
    }

    scores.push({ alphaName, focusName, score, description });
  }

  return scores;
}

function ConcernsCoverageTiles({ doc }: { doc: unknown }) {
  const alphaScores = useMemo(() => calculateAlphaScores(doc), [doc]);

  // Group by focus
  const byFocus = new Map<string, AlphaScore[]>();
  for (const score of alphaScores) {
    if (!byFocus.has(score.focusName)) {
      byFocus.set(score.focusName, []);
    }
    byFocus.get(score.focusName)!.push(score);
  }

  if (byFocus.size === 0) return null;

  // Color intensity based on score
  const getColorStyle = (score: number): React.CSSProperties => {
    if (score === 0) {
      return {
        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
        borderColor: "var(--pf-v6-global--BorderColor--100)",
        color: "var(--pf-v6-global--Color--200)",
      };
    } else if (score <= 2) {
      return {
        backgroundColor: "var(--pf-v6-global--palette--blue-50)",
        borderColor: "var(--pf-v6-global--palette--blue-200)",
        color: "var(--pf-v6-global--palette--blue-400)",
      };
    } else if (score <= 5) {
      return {
        backgroundColor: "var(--pf-v6-global--palette--blue-100)",
        borderColor: "var(--pf-v6-global--palette--blue-300)",
        color: "var(--pf-v6-global--palette--blue-500)",
      };
    } else {
      return {
        backgroundColor: "var(--pf-v6-global--palette--blue-200)",
        borderColor: "var(--pf-v6-global--palette--blue-400)",
        color: "var(--pf-v6-global--palette--blue-600)",
      };
    }
  };

  const getIcon = (score: number) => {
    return score === 0 ? "○" : "✓";
  };

  const getAbbreviation = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return name.substring(0, 4).toUpperCase();
    }
    return words.map(w => w[0]).join("").substring(0, 4).toUpperCase();
  };

  return (
    <Card style={{ marginBottom: "2rem", marginTop: "1.5rem" }}>
      <CardBody>
        <Title headingLevel="h4" size="md" style={{ marginBottom: "1.5rem" }}>
          Coverage Overview
        </Title>

        {Array.from(byFocus.entries()).map(([focusName, alphas], idx) => (
          <div key={idx} style={{ marginBottom: idx < byFocus.size - 1 ? "2rem" : "0" }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--pf-v6-global--Color--100)",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              {focusName}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "0.75rem"
            }}>
              {alphas.map((alpha, alphaIdx) => {
                const colorStyle = getColorStyle(alpha.score);
                const icon = getIcon(alpha.score);
                const abbrev = getAbbreviation(alpha.alphaName);

                return (
                  <div
                    key={alphaIdx}
                    title={`${alpha.alphaName}: ${alpha.description || 'No description'}\nScore: ${alpha.score}`}
                    style={{
                      ...colorStyle,
                      border: "2px solid",
                      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      minHeight: "100px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                      {icon}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.5px" }}>
                      {abbrev}
                    </div>
                    <div style={{ fontSize: "0.625rem", marginTop: "0.25rem", opacity: 0.8 }}>
                      {alpha.alphaName.length > 15 ? alpha.alphaName.substring(0, 12) + "..." : alpha.alphaName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <Divider style={{ marginTop: "1.5rem", marginBottom: "1rem" }} />

        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "20px",
              height: "20px",
              backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
              border: "2px solid var(--pf-v6-global--BorderColor--100)",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem"
            }}>○</div>
            <span>Not Covered</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "20px",
              height: "20px",
              backgroundColor: "var(--pf-v6-global--palette--blue-50)",
              border: "2px solid var(--pf-v6-global--palette--blue-200)",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pf-v6-global--palette--blue-400)",
              fontSize: "0.75rem"
            }}>✓</div>
            <span>Light Coverage</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "20px",
              height: "20px",
              backgroundColor: "var(--pf-v6-global--palette--blue-100)",
              border: "2px solid var(--pf-v6-global--palette--blue-300)",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pf-v6-global--palette--blue-500)",
              fontSize: "0.75rem"
            }}>✓</div>
            <span>Medium Coverage</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "20px",
              height: "20px",
              backgroundColor: "var(--pf-v6-global--palette--blue-200)",
              border: "2px solid var(--pf-v6-global--palette--blue-400)",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pf-v6-global--palette--blue-600)",
              fontSize: "0.75rem"
            }}>✓</div>
            <span>Strong Coverage</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ReportSectionBlock({
  section,
  depth,
  sectionId,
  activeSection,
  doc,
}: {
  section: PracticeReportSection;
  depth: number;
  sectionId: string;
  activeSection: string;
  doc?: unknown;
}) {
  const headingSize = depth === 0 ? "2xl" : depth === 1 ? "xl" : depth === 2 ? "lg" : "md";
  const isActive = activeSection === sectionId;

  // Check if this is the Concerns section
  const isConcernsSection = depth === 0 && section.heading === "Concerns";

  return (
    <div
      id={sectionId}
      style={{
        scrollMarginTop: "2rem",
        marginBottom: depth === 0 ? "3rem" : "2rem",
        borderLeft: depth > 0 ? `4px solid ${isActive ? "var(--pf-v6-global--primary-color--100)" : "var(--pf-v6-global--BorderColor--100)"}` : "none",
        paddingLeft: depth > 0 ? "1.5rem" : "0",
        borderRadius: depth > 0 ? "var(--pf-v6-global--BorderRadius--sm)" : "0",
      }}
    >
      <Title
        headingLevel={depth <= 0 ? "h2" : depth === 1 ? "h3" : depth === 2 ? "h4" : "h5"}
        size={headingSize}
        style={{ color: isActive ? "var(--pf-v6-global--primary-color--100)" : undefined }}
      >
        {section.heading}
      </Title>

      {isConcernsSection && doc ? <ConcernsCoverageTiles doc={doc} /> : null}

      {section.paragraphs.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {section.paragraphs.map((p, i) => (
            <Content key={i} component={ContentVariants.p} style={{ marginBottom: "1rem" }}>
              {p}
            </Content>
          ))}
        </div>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <List variant={ListVariant.inline} style={{ marginTop: "1.5rem" }}>
          {section.bullets.map((b, i) => (
            <ListItem key={i}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <span
                  style={{
                    marginRight: "0.75rem",
                    marginTop: "0.25rem",
                    height: "0.5rem",
                    width: "0.5rem",
                    flexShrink: 0,
                    borderRadius: "9999px",
                    backgroundColor: "var(--pf-v6-global--primary-color--100)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  {b.label ? (
                    <>
                      <strong style={{ color: "var(--pf-v6-global--primary-color--100)" }}>{b.label}</strong>
                      <span style={{ color: "var(--pf-v6-global--Color--200)" }}>: </span>
                      <span>{b.text}</span>
                    </>
                  ) : (
                    <span>{b.text}</span>
                  )}
                </div>
              </div>
            </ListItem>
          ))}
        </List>
      )}

      {section.subsections && section.subsections.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          {section.subsections.map((sub, j) => (
            <ReportSectionBlock
              key={`${sectionId}-${j}`}
              section={sub}
              depth={depth + 1}
              sectionId={`${sectionId}-${j}`}
              activeSection={activeSection}
              doc={doc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PracticeReportView({ doc }: { doc: unknown }) {
  const payload = useMemo(() => buildPracticeReport(doc), [doc]);
  const [activeSection, setActiveSection] = useState("section-0");

  const navTree = useMemo(() => {
    if (!payload) return [];
    return buildNavigationTree(payload.sections);
  }, [payload]);

  const breadcrumbPath = useMemo(() => {
    if (!navTree.length) return [];
    return getBreadcrumbPath(activeSection, navTree);
  }, [activeSection, navTree]);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!payload) {
    return (
      <Card>
        <CardBody>
          <Content component={ContentVariants.p}>
            Report view needs a baseline-shaped practice document (baseline, merged practice, or method composite).
          </Content>
        </CardBody>
      </Card>
    );
  }

  const sidebarPanel = (
    <SidebarPanel width={{ default: "width_25" }}>
      <NavigationSidebar navTree={navTree} activeSection={activeSection} onNavigate={handleNavigate} />
    </SidebarPanel>
  );

  return (
    <Sidebar hasGutter>
      {sidebarPanel}
      <SidebarContent>
        <PageSection variant={PageSectionVariants.default}>
          <div style={{ marginBottom: "1rem" }}>
            <Label color="blue" isCompact>
              Practice Documentation
            </Label>
          </div>

          <Title headingLevel="h1" size="4xl" style={{ marginBottom: "1rem" }}>
            Practice Report
          </Title>

          <Content component={ContentVariants.p} style={{ marginBottom: "2rem" }}>
            Comprehensive practice documentation following the hierarchical practice language structure. Includes
            introduction, concerns, documents, activities, lifecycle STAR narratives, and completion criteria.
          </Content>

          {breadcrumbPath.length > 0 && (
            <Breadcrumb style={{ marginBottom: "2rem" }}>
              <BreadcrumbItem>Practice Report</BreadcrumbItem>
              {breadcrumbPath.map((segment, idx) => (
                <BreadcrumbItem key={idx} isActive={idx === breadcrumbPath.length - 1}>
                  {segment}
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          )}

          <Divider style={{ marginBottom: "2rem" }} />

          <div>
            {payload.sections.map((s, i) => (
              <ReportSectionBlock
                key={`section-${i}`}
                section={s}
                depth={0}
                sectionId={`section-${i}`}
                activeSection={activeSection}
                doc={doc}
              />
            ))}
          </div>
        </PageSection>
      </SidebarContent>
    </Sidebar>
  );
}
