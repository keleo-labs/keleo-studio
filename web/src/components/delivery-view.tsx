import React, { useMemo } from "react";
import type { PracticeActivity, ReadablePracticePreviewDoc } from "@/lib/types";
import {
  buildDeliveryViewActivitySections,
  practiceElementDescriptionForDisplay,
} from "@/lib/ir";
import { PracticeElementAliasesProvider, AliasedName } from "@/components/AliasedName";
import { useLanguagePack } from "@/lib/languagePack";

type ChecklistRow = ReadablePracticePreviewDoc["alphas"][number]["states"][number]["checklist"][number];

function ActivityExecutionCard({
  activity,
  workProducts,
}: {
  activity: PracticeActivity;
  workProducts: NonNullable<ReadablePracticePreviewDoc["workProducts"]>;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/40 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--text)]">
            <AliasedName kind="Activity" name={activity.name} browse={false} />
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(activity)}</p>
        </div>
      </div>

      {activity.requiredCompetencies?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">Required Skills:</span>
          {activity.requiredCompetencies.map((comp) => (
            <span
              key={comp}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
            >
              <AliasedName kind="Competency" name={comp} browse={false} />
            </span>
          ))}
        </div>
      ) : null}

      {activity.worksOn?.length ? (
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text)]">
            Evidentiary Artifacts (Work Products)
          </h4>
          <div className="grid gap-4">
            {activity.worksOn.map((target, idx) => {
              const wp = workProducts.find((w) => w.name === target.workProductName);
              const lod = wp?.levelsOfDetail?.find((l) => l.name === target.levelOfDetailName);

              return (
                <div key={idx} className="rounded-lg border border-[var(--border)]/60 bg-[var(--panel)] p-3">
                  <div className="text-sm font-semibold">
                    <AliasedName kind="WorkProduct" name={target.workProductName} browse={false} />
                    <span className="mx-2 text-[var(--muted)]">→</span>
                    <AliasedName kind="LevelOfDetail" name={target.levelOfDetailName} browse={false} />
                  </div>

                  {lod?.checklist?.length ? (
                    <ul className="mt-2 space-y-1">
                      {lod.checklist.map((item: ChecklistRow) => (
                        <li key={item.name} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                          <input type="checkbox" disabled className="mt-0.5" readOnly aria-hidden />
                          <span>
                            <strong className="text-[var(--text)]">
                              <AliasedName kind="Checklist" name={item.name} browse={false} />
                              :
                            </strong>{" "}
                            {practiceElementDescriptionForDisplay(item)}
                            {(item as ChecklistRow & { isBlocking?: boolean }).isBlocking ? (
                              <span className="ml-2 font-bold text-red-500">[Blocking Gate]</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PractitionerExecutionView({ doc }: { doc: ReadablePracticePreviewDoc }) {
  const { t } = useLanguagePack();
  const sections = useMemo(() => buildDeliveryViewActivitySections(doc), [doc]);
  const workProducts = doc.workProducts ?? [];

  const spaceHeading = (spaceName: string) =>
    spaceName.trim() ? (
      <AliasedName kind="ActivitySpace" name={spaceName} browse={false} />
    ) : (
      <>{t.deliveryViewPracticeLevelActivities}</>
    );

  return (
    <PracticeElementAliasesProvider aliases={doc.practiceElementAliases}>
      <div className="flex flex-col gap-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <header>
          <h2 className="text-2xl font-bold text-[var(--text)]">Practitioner Execution Guide</h2>
          <p className="text-[var(--muted)]">Actionable swimlanes and required evidentiary artifacts.</p>
        </header>

        {sections.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--muted)]">{t.deliveryViewEmpty}</p>
        ) : (
          <div className="space-y-10">
            {sections.map((section) => {
              const sn = String(section.space.name ?? "").trim();
              const desc = practiceElementDescriptionForDisplay(section.space);
              const focus = String(section.space.focusName ?? "").trim();

              return (
                <section key={section.key} className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/30">
                  <div className="border-b border-[var(--border)] bg-[var(--panel)]/50 px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                      {t.activitySpaces}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-[var(--text)]">{spaceHeading(sn)}</h3>
                    {desc ? <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{desc}</p> : null}

                    {focus ? (
                      <p className="mt-3 text-sm text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">Focus: </span>
                        <AliasedName kind="Focus" name={focus} browse={false} />
                      </p>
                    ) : null}

                    {section.space.contributesTo?.length ? (
                      <div className="mt-3 text-sm text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">{t.contributesTo}: </span>
                        {section.space.contributesTo.map((c, idx) => (
                          <span key={`${c.alphaName}-${c.stateName}-${idx}`}>
                            {idx > 0 ? "; " : null}
                            <AliasedName kind="Alpha" name={c.alphaName} browse={false} />
                            {c.stateName ? (
                              <>
                                {" → "}
                                <AliasedName kind="State" name={c.stateName} browse={false} />
                              </>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {section.space.requiredCompetencies?.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--muted)]">{t.requiredCompetencies}:</span>
                        {section.space.requiredCompetencies.map((comp) => (
                          <span
                            key={comp}
                            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
                          >
                            <AliasedName kind="Competency" name={comp} browse={false} />
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-6 px-5 py-5">
                    {section.activities.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">{t.deliveryViewNoActivitiesInSpace}</p>
                    ) : (
                      section.activities.map((activity) => (
                        <ActivityExecutionCard
                          key={`${section.key}-${activity.name}`}
                          activity={activity}
                          workProducts={workProducts}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </PracticeElementAliasesProvider>
  );
}
