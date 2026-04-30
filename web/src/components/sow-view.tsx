import React from "react";
import type { ReadablePracticePreviewDoc } from "@/lib/types";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { PracticeElementAliasesProvider, AliasedName } from "@/components/AliasedName";

export function SalesStatementOfWorkView({ doc }: { doc: ReadablePracticePreviewDoc }) {
  const workBreakdowns = doc.workBreakdowns ?? [];

  return (
    <PracticeElementAliasesProvider aliases={doc.practiceElementAliases}>
      <div className="flex flex-col gap-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <header>
          <h2 className="text-2xl font-bold text-[var(--text)]">Statement of Work (SOW) Estimation</h2>
          <p className="text-[var(--muted)]">
            Commercial modeling, algorithmic complexity, and effort forecasting.
          </p>
        </header>

        <div className="space-y-8">
          {workBreakdowns.map((wb) => {
            const totalLow = wb.task?.reduce((sum, t) => sum + (t.estimate?.lowEst ?? 0), 0) ?? 0;
            const totalMed = wb.task?.reduce((sum, t) => sum + (t.estimate?.medEst ?? 0), 0) ?? 0;
            const totalHigh = wb.task?.reduce((sum, t) => sum + (t.estimate?.highEst ?? 0), 0) ?? 0;

            return (
              <div key={wb.name} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/50 p-6">
                <div className="mb-4 flex items-start justify-between border-b border-[var(--border)] pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text)]">
                      <AliasedName kind="WorkBreakdown" name={wb.name} browse={false} />
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(wb)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase text-[var(--muted)]">Estimation Unit</div>
                    <div className="font-mono text-lg font-semibold text-[var(--accent)]">
                      {wb.estimationUnit ?? "Not Specified"}
                    </div>
                  </div>
                </div>

                {wb.complexity ? (
                  <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)]/50 bg-black/10 p-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Contract Type
                      </span>
                      <p className="mt-1 text-sm font-bold text-[var(--text)]">{wb.complexity.contractType}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Friction Multiplier (Level)
                      </span>
                      <p className="mt-1 text-sm font-bold text-[var(--text)]">{wb.complexity.level} / 5</p>
                    </div>
                  </div>
                ) : null}

                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-sm text-[var(--muted)]">
                      <th className="pb-2 font-semibold">Work Item (Task)</th>
                      <th className="pb-2 text-right font-semibold">Best Case</th>
                      <th className="pb-2 text-right font-semibold">Likely</th>
                      <th className="pb-2 text-right font-semibold">Worst Case</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {wb.task?.map((task) => (
                      <tr key={task.name} className="border-b border-[var(--border)]/50">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-[var(--text)]">
                            <AliasedName kind="WorkItem" name={task.name} browse={false} />
                          </div>
                          <div className="mt-0.5 max-w-md truncate text-xs text-[var(--muted)]">
                            {practiceElementDescriptionForDisplay(task)}
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono">{task.estimate?.lowEst ?? "-"}</td>
                        <td className="py-3 text-right font-mono font-bold text-[var(--text)]">
                          {task.estimate?.medEst ?? "-"}
                        </td>
                        <td className="py-3 text-right font-mono">{task.estimate?.highEst ?? "-"}</td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--panel)]">
                      <td className="py-3 pr-4 text-right font-bold text-[var(--text)]">Total Estimates:</td>
                      <td className="py-3 text-right font-mono font-bold">{totalLow}</td>
                      <td className="py-3 text-right font-mono text-lg font-bold text-[var(--accent)]">{totalMed}</td>
                      <td className="py-3 text-right font-mono font-bold">{totalHigh}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </PracticeElementAliasesProvider>
  );
}
