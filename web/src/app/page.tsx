import Link from "next/link";

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
          <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--muted)]">Adoption framework</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] md:text-4xl">Dashboard</h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
            Pick a workspace. Each area will grow into its own flow; today, Practice author hosts the JSON renderer and
            PDF export.
          </p>
        </header>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="group flex h-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-card transition duration-layout ease-out-soft hover:border-[var(--accent)] hover:shadow-card-hover"
              >
                <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--accent)]">{a.badge}</span>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--text)] group-hover:text-[var(--text)]">
                  {a.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">{a.description}</p>
                <span className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--accent)]">
                  Open
                  <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
