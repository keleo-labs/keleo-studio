"use client";

import { useEffect, useMemo, useState } from "react";
import { extractPracticeNames, type PracticeNameLists } from "@/lib/analysis/extractPracticeNames";

type LibraryDocInfo = {
  id: string;
  displayName: string;
  libraryRootKind: string;
};

export type ResolvedPracticeForProject = {
  loading: boolean;
  error: string | null;
  practiceNames: PracticeNameLists | null;
  resolvedBody: Record<string, unknown> | null;
  checklistNamesByAlphaState: Record<string, string[]>;
  checklistNamesByWPLoD: Record<string, string[]>;
};

const emptyResult: ResolvedPracticeForProject = {
  loading: false,
  error: null,
  practiceNames: null,
  resolvedBody: null,
  checklistNamesByAlphaState: {},
  checklistNamesByWPLoD: {},
};

function extractChecklistNames(body: Record<string, unknown>): {
  byAlphaState: Record<string, string[]>;
  byWPLoD: Record<string, string[]>;
} {
  const byAlphaState: Record<string, string[]> = {};
  const byWPLoD: Record<string, string[]> = {};

  const alphas = Array.isArray(body.alphas) ? body.alphas : [];
  for (const alpha of alphas) {
    if (!alpha || typeof alpha !== "object") continue;
    const alphaName = (alpha as any).name;
    const states = Array.isArray((alpha as any).states) ? (alpha as any).states : [];
    for (const state of states) {
      if (!state || typeof state !== "object") continue;
      const stateName = (state as any).name;
      const key = `${alphaName}::${stateName}`;
      const checklist = Array.isArray((state as any).checklist) ? (state as any).checklist : [];
      byAlphaState[key] = checklist
        .filter((c: any) => c && typeof c === "object" && typeof c.name === "string")
        .map((c: any) => c.name);
    }
  }

  const workProducts = Array.isArray(body.workProducts) ? body.workProducts : [];
  for (const wp of workProducts) {
    if (!wp || typeof wp !== "object") continue;
    const wpName = (wp as any).name;
    const levels = Array.isArray((wp as any).levelsOfDetail) ? (wp as any).levelsOfDetail : [];
    for (const lod of levels) {
      if (!lod || typeof lod !== "object") continue;
      const lodName = (lod as any).name;
      const key = `${wpName}::${lodName}`;
      const checklist = Array.isArray((lod as any).checklist) ? (lod as any).checklist : [];
      byWPLoD[key] = checklist
        .filter((c: any) => c && typeof c === "object" && typeof c.name === "string")
        .map((c: any) => c.name);
    }
  }

  return { byAlphaState, byWPLoD };
}

export function useResolvedPracticeForProject(
  referenceName: string,
  referenceType: "practice" | "method" | "",
  libraryDocuments: LibraryDocInfo[]
): ResolvedPracticeForProject {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedBody, setResolvedBody] = useState<Record<string, unknown> | null>(null);

  // Find the library document matching the reference name
  const matchingDoc = useMemo(() => {
    if (!referenceName || !referenceType) return null;
    return libraryDocuments.find((d) => d.displayName === referenceName) || null;
  }, [referenceName, referenceType, libraryDocuments]);

  useEffect(() => {
    if (!matchingDoc) {
      setResolvedBody(null);
      setError(referenceName ? `Referenced ${referenceType} "${referenceName}" not found in library` : null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // Fetch the full document
        const docRes = await fetch(`/api/documents/${encodeURIComponent(matchingDoc.id)}`);
        if (!docRes.ok || cancelled) return;
        const docData = await docRes.json();
        const body = docData.body;

        if (!body || typeof body !== "object") {
          if (!cancelled) setError("Referenced document has no body");
          return;
        }

        // For methods, resolve through the API to get composite
        if (referenceType === "method") {
          const resolveRes = await fetch("/api/documents/resolve-for-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!resolveRes.ok || cancelled) {
            if (!cancelled) setError("Failed to resolve method");
            return;
          }
          const resolveData = await resolveRes.json();
          if (!cancelled) {
            setResolvedBody(resolveData.resolved || body);
          }
        } else {
          // For practices, resolve through API as well (handles baseline resolution)
          const resolveRes = await fetch("/api/documents/resolve-for-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!resolveRes.ok || cancelled) {
            if (!cancelled) setResolvedBody(body as Record<string, unknown>);
            return;
          }
          const resolveData = await resolveRes.json();
          if (!cancelled) {
            setResolvedBody(resolveData.resolved || body);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Resolution failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [matchingDoc, referenceType, referenceName]);

  const practiceNames = useMemo(() => {
    if (!resolvedBody) return null;
    return extractPracticeNames(resolvedBody, null, [], []);
  }, [resolvedBody]);

  const { checklistNamesByAlphaState, checklistNamesByWPLoD } = useMemo(() => {
    if (!resolvedBody) return { checklistNamesByAlphaState: {}, checklistNamesByWPLoD: {} };
    const { byAlphaState, byWPLoD } = extractChecklistNames(resolvedBody);
    return { checklistNamesByAlphaState: byAlphaState, checklistNamesByWPLoD: byWPLoD };
  }, [resolvedBody]);

  if (!referenceName || !referenceType) return emptyResult;

  return {
    loading,
    error,
    practiceNames,
    resolvedBody,
    checklistNamesByAlphaState,
    checklistNamesByWPLoD,
  };
}
