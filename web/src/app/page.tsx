"use client";

import Link from "next/link";
import { Title, Card, CardBody, Label } from "@patternfly/react-core";

const areas = [
  {
    href: "/method-builder",
    title: "Method builder",
    badge: "Compose",
    description:
      "Browse the library, drag a baseline and extension practices into a method, confirm name and description, and save to the library. Includes Kanban pattern progression view.",
  },
  {
    href: "/practice-author",
    title: "Practice author",
    badge: "Author",
    description:
      "Open practices, validate against the language schema, preview text and diagrams with Kanban pattern boards, export PDFs, and persist edits to the library.",
  },
  {
    href: "/flow-visualizer",
    title: "Pattern Kanban",
    badge: "Visualize",
    description:
      "Kanban board view of pattern progression—Pattern Views as columns, Alpha States, Activities, and Work Products as cards showing temporal flow.",
  },
  {
    href: "/library",
    title: "Manage library",
    badge: "Library",
    description:
      "Browse, import, export, and organize the practice library—metadata, versions, and availability for authors and method builder. Browse view includes Kanban pattern visualization.",
  },
  {
    href: "/preferences",
    title: "Preferences",
    badge: "Settings",
    description: "Choose theme and language. Saved in a cookie so your selections persist on this device.",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-content px-6 py-14 md:px-10">
        <header className="mb-12 max-w-2xl">
          <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Adoption framework
          </p>
          <Title headingLevel="h1" size="3xl" style={{
            marginTop: '0.75rem',
            color: 'var(--text)',
            fontWeight: 600,
            letterSpacing: '-0.025em'
          }}>
            Dashboard
          </Title>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
            Pick a workspace. Each area will grow into its own flow; today, Practice author hosts
            the JSON renderer and PDF export.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <Card
              key={a.href}
              isClickable
              component="a"
              href={a.href}
              style={{
                height: '100%',
                borderRadius: '1.25rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--panel)',
                transition: 'all 0.2s cubic-bezier(0.33, 1, 0.68, 1)',
              }}
              className="group"
            >
              <CardBody style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <Label
                  color="blue"
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent)',
                    backgroundColor: 'transparent',
                    padding: 0,
                    marginBottom: '0.75rem',
                  }}
                >
                  {a.badge}
                </Label>
                <Title
                  headingLevel="h2"
                  size="xl"
                  style={{
                    color: 'var(--text)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    marginBottom: '0.75rem',
                  }}
                >
                  {a.title}
                </Title>
                <p style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: 'var(--muted)',
                  marginBottom: '1.5rem',
                }}>
                  {a.description}
                </p>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                }}>
                  Open
                  <span
                    className="ml-1 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    →
                  </span>
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

