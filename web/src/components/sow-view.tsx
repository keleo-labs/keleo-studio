import React from "react";
import type { ReadablePracticePreviewDoc } from "@/lib/types";
import { practiceElementDescriptionForDisplay } from "@/lib/ir";
import { PracticeElementAliasesProvider, AliasedName } from "@/components/AliasedName";
import { useLanguagePack } from "@/lib/languagePack";

/** Personas and narrative spine preview (replaces legacy work-breakdown / estimation view). */
export function SalesStatementOfWorkView({ doc }: { doc: ReadablePracticePreviewDoc }) {
  const { t } = useLanguagePack();
  const personas = doc.personas ?? [];
  const personaGroups = doc.personaGroups ?? [];
  const narrativeTypes = doc.narrativeTypes ?? [];

  const hasContent =
    personas.length > 0 || personaGroups.length > 0 || narrativeTypes.length > 0;

  return (
    <PracticeElementAliasesProvider aliases={doc.practiceElementAliases}>
      <div className="flex flex-col gap-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <header>
          <h2 className="text-2xl font-bold text-[var(--text)]">{t.readablePreviewSow}</h2>
          <p className="text-[var(--muted)]">
            Personas, persona groups, and baseline narrative spine types aligned with language.schema.json.
          </p>
        </header>

        {!hasContent ? (
          <p className="text-sm text-[var(--muted)]">{t.sowViewEmpty}</p>
        ) : (
          <div className="space-y-8">
            {narrativeTypes.length ? (
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--text)]">{t.narrativeTypesHeading}</h3>
                <div className="flex flex-col gap-4">
                  {narrativeTypes.map((nt: any) => (
                    <div key={nt.name} className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                      <div className="text-base font-bold text-[var(--text)]">
                        <AliasedName kind="NarrativeType" name={nt.name} browse={false} />
                      </div>
                      {practiceElementDescriptionForDisplay(nt) ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(nt)}</p>
                      ) : null}
                      {Array.isArray(nt.narrativeElements) && nt.narrativeElements.length ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
                          {(nt.narrativeElements as any[]).map((el: any) => (
                            <li key={el.name}>
                              <span className="font-semibold">{el.name}</span>
                              {el?.howToUse ? <span className="text-[var(--muted)]"> — {el.howToUse}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {personas.length ? (
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--text)]">{t.personasHeading}</h3>
                <ul className="space-y-3">
                  {personas.map((p: any) => (
                    <li key={p.name} className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                      <div className="font-bold text-[var(--text)]">
                        <AliasedName kind="Persona" name={p.name} browse={false} />
                      </div>
                      {practiceElementDescriptionForDisplay(p) ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(p)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {personaGroups.length ? (
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--text)]">{t.personaGroupsHeading}</h3>
                <ul className="space-y-3">
                  {personaGroups.map((pg: any) => (
                    <li key={pg.name} className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 p-4">
                      <div className="font-bold text-[var(--text)]">
                        <AliasedName kind="PersonaGroup" name={pg.name} browse={false} />
                      </div>
                      {practiceElementDescriptionForDisplay(pg) ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{practiceElementDescriptionForDisplay(pg)}</p>
                      ) : null}
                      {Array.isArray(pg.personaNames) && pg.personaNames.length ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {t.personaGroupMembers}:{" "}
                          {pg.personaNames.map((nm: unknown, i: number) => (
                            <span key={`${String(pg.name)}:${i}`}>
                              <AliasedName kind="Persona" name={String(nm)} browse={false} />
                              {i < pg.personaNames.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </PracticeElementAliasesProvider>
  );
}
