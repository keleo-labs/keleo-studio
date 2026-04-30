"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PracticeElementAlias } from "@/lib/types";
import {
  buildPracticeElementAliasLookup,
  EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
  getAliasedDisplay,
  type PracticeElementAliasLookup,
} from "@/lib/practiceElementAliasDisplay";

const PracticeElementAliasLookupContext = createContext<PracticeElementAliasLookup>(
  EMPTY_PRACTICE_ELEMENT_ALIAS_LOOKUP,
);

export function PracticeElementAliasesProvider({
  aliases,
  children,
}: {
  aliases: PracticeElementAlias[] | undefined;
  children: ReactNode;
}) {
  const lookup = useMemo(() => buildPracticeElementAliasLookup(aliases), [aliases]);
  return (
    <PracticeElementAliasLookupContext.Provider value={lookup}>{children}</PracticeElementAliasLookupContext.Provider>
  );
}

export function usePracticeElementAliasLookup(): PracticeElementAliasLookup {
  return useContext(PracticeElementAliasLookupContext);
}

/** Renders practice element titles: primary = alias when defined; canonical in smaller italic parentheses. */
export function AliasedName({ kind, name, browse }: { kind: string; name: string; browse: boolean }) {
  const lookup = usePracticeElementAliasLookup();
  const { primary, showCanonical, canonical } = getAliasedDisplay(lookup, kind, name);
  if (!showCanonical) return <>{primary}</>;
  if (browse) {
    return (
      <>
        {primary}
        <span className="text-sm italic font-normal text-[var(--muted)]"> ({canonical})</span>
      </>
    );
  }
  return (
    <>
      {primary}
      <span style={{ fontSize: "0.88em", fontStyle: "italic", fontWeight: 400, color: "var(--muted)" }}> ({canonical})</span>
    </>
  );
}
