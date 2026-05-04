"use client";

import { useMemo } from "react";
import type { PracticeReportSection } from "@/lib/practiceReport";
import { buildPracticeReport } from "@/lib/practiceReport";

function headingTag(depth: number): "h2" | "h3" | "h4" | "h5" | "h6" {
  if (depth <= 0) return "h2";
  if (depth === 1) return "h3";
  if (depth === 2) return "h4";
  if (depth === 3) return "h5";
  return "h6";
}

function headingFontSize(depth: number): string {
  if (depth <= 0) return "1.5rem";
  if (depth === 1) return "1.25rem";
  if (depth === 2) return "1.1rem";
  if (depth === 3) return "1.02rem";
  return "0.98rem";
}

function ReportSectionBlock({
  section,
  depth,
}: {
  section: PracticeReportSection;
  depth: number;
}) {
  const Tag = headingTag(depth);
  return (
    <section className={depth === 0 ? "mb-10" : "mb-8 ml-2 border-l border-[var(--border)] pl-5"}>
      <Tag className="mb-4 font-bold text-[var(--text)]" style={{ fontSize: headingFontSize(depth) }}>
        {section.heading}
      </Tag>
      <div className="space-y-3 text-base leading-relaxed text-[var(--text)]">
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-[var(--text)]">
            {p}
          </p>
        ))}
      </div>
      {section.bullets?.length ? (
        <ul className="mt-5 list-none space-y-2 pl-0 text-[var(--text)]">
          {section.bullets.map((b, i) => (
            <li key={i} className="rounded-md border border-[var(--border)]/60 bg-[var(--panel)] px-4 py-2 leading-relaxed">
              {b.label ? (
                <>
                  <strong className="font-semibold text-[var(--text)]">{b.label}</strong>
                  {": "}
                  <span>{b.text}</span>
                </>
              ) : (
                <span>{b.text}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.length ? (
        <div className="mt-8 space-y-8">
          {section.subsections.map((sub, j) => (
            <ReportSectionBlock key={`${section.heading}-${j}-${sub.heading}`} section={sub} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function PracticeReportView({ doc }: { doc: unknown }) {
  const payload = useMemo(() => buildPracticeReport(doc), [doc]);

  if (!payload) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <p className="text-sm text-[var(--muted)]">
          Report view needs a baseline-shaped practice document (baseline, merged practice, or method composite).
        </p>
      </div>
    );
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 sm:p-8">
      <header className="mb-10 border-b border-[var(--border)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Practice browse report</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Follows doc-gen-spec: Introduction and PrintNarrative, Concerns, Documents, Activities, lifecycle STAR loop, then
          conclusion. Aliasing applies to labels only.
        </p>
      </header>
      <div className="space-y-12">
        {payload.sections.map((s, i) => (
          <ReportSectionBlock key={`report-root-${i}-${s.heading}`} section={s} depth={0} />
        ))}
      </div>
    </article>
  );
}
