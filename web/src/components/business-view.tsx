import React from "react";
import type { ReadablePracticePreviewDoc } from "@/lib/types";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { PracticeElementAliasesProvider, AliasedName } from "@/components/AliasedName";

export function BusinessOutcomeView({ doc }: { doc: ReadablePracticePreviewDoc }) {
  const valueAlphas = doc.alphas?.filter((a) => a.focusName === "Value") ?? [];
  const patterns = doc.patterns ?? [];

  return (
    <PracticeElementAliasesProvider aliases={doc.practiceElementAliases}>
      <div className="flex flex-col gap-8 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <header>
          <h1 className="text-3xl font-bold text-[var(--text)]">
            <AliasedName kind="PracticeBaseline" name={doc.name} browse={false} />
          </h1>
          <p className="mt-3 text-lg text-[var(--muted)]">{doc.description}</p>
        </header>

        <section>
          <h2 className="mb-4 border-b border-[var(--border)] pb-2 text-2xl font-semibold">Strategic Outcomes</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {valueAlphas.map((alpha) => (
              <div key={alpha.name} className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/50 p-4">
                <h3 className="text-lg font-bold text-[var(--text)]">
                  <AliasedName kind="Alpha" name={alpha.name} browse={false} />
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(alpha)}</p>
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Target States
                  </span>
                  <ul className="mt-1 list-inside list-disc pl-4 text-sm text-[var(--text)]">
                    {alpha.states?.map((state) => (
                      <li key={state.name}>
                        <AliasedName kind="State" name={state.name} browse={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-[var(--border)] pb-2 text-2xl font-semibold">Adoption Lifecycle</h2>
          {patterns.map((pattern) => (
            <div key={pattern.name} className="mb-6">
              <h3 className="text-xl font-bold text-[var(--text)]">
                <AliasedName kind="Pattern" name={pattern.name} browse={false} />
              </h3>
              <p className="mb-4 mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(pattern)}</p>
              <div className="space-y-4">
                {pattern.patternViews?.map((view, idx) => (
                  <div
                    key={view.name}
                    className="flex items-start gap-4 rounded-r-lg border-l-4 border-[var(--accent)] bg-[var(--panel)]/30 p-4"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">
                        <AliasedName kind="PatternView" name={view.name} browse={false} />
                      </h4>
                      <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(view)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </PracticeElementAliasesProvider>
  );
}
