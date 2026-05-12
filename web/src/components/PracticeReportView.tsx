"use client";

import { useMemo, useState } from "react";
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

function ReportSectionBlock({
  section,
  depth,
  sectionId,
  activeSection,
}: {
  section: PracticeReportSection;
  depth: number;
  sectionId: string;
  activeSection: string;
}) {
  const headingSize = depth === 0 ? "2xl" : depth === 1 ? "xl" : depth === 2 ? "lg" : "md";
  const isActive = activeSection === sectionId;

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
              />
            ))}
          </div>
        </PageSection>
      </SidebarContent>
    </Sidebar>
  );
}
