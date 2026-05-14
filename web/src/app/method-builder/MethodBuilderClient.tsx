"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageSection,
  Title,
  Button,
  Label,
  Content,
  ContentVariants,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  TextInput,
  TextArea,
  Divider,
} from "@patternfly/react-core";
import type { LibraryRootKind } from "@/lib/library/classify";
import { rootKindExtension } from "@/lib/library/classify";
import {
  baselineForMethodFromLibraryBody,
  methodFromLibraryBody,
  practiceForMethodFromLibraryBody,
  practiceWithBaselineName,
} from "@/lib/methodBuilder/fromLibraryDocument";
import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import type { JsonDocumentMeta } from "@/lib/storage/types";
import { mergeNarrativesAdditive } from "@/lib/methodMerge/compositePracticeFromMethod";
import { MethodTagsField, type MethodTags } from "@/components/editors/fields/MethodTagsField";
import { MethodNarrativesField, type MethodNarrative } from "@/components/editors/fields/MethodNarrativesField";

const DRAG_MIME = "application/x-adoption-library";

type LibraryRow = JsonDocumentMeta & {
  libraryRootKind: LibraryRootKind;
  displayName: string;
  virtualFileCount?: number;
  /** Present when GET /api/documents?details=1 */
  baselineNameForPracticeLink?: string | null;
  practiceNameForDependencyLink?: string | null;
};

type LibraryDragPayload = { type: "library"; id: string };

type BaselineSlot = { libraryId: string; baseline: PracticeBaseline };
type PracticeSlot = { libraryId: string; practice: Practice };

function parseDragPayload(dt: DataTransfer): LibraryDragPayload | null {
  const raw = dt.getData(DRAG_MIME) || dt.getData("text/plain");
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as LibraryDragPayload;
    if (o?.type === "library" && typeof o.id === "string" && o.id) return o;
  } catch {
    return null;
  }
  return null;
}

function clonePractice(p: Practice): Practice {
  return typeof structuredClone === "function"
    ? structuredClone(p)
    : (JSON.parse(JSON.stringify(p)) as Practice);
}

function isEmbeddedPracticeSlotId(libraryId: string): boolean {
  return libraryId.startsWith("embedded:");
}

/** When the open method document embeds the baseline, match a standalone baseline library entry by symbolic name. */
function findStandaloneBaselineDocumentId(rows: LibraryRow[], baselineName: string): string | null {
  const n = baselineName.trim();
  if (!n) return null;
  const hits = rows.filter(
    (r) =>
      r.libraryRootKind === "baselinePractice" &&
      typeof r.baselineNameForPracticeLink === "string" &&
      r.baselineNameForPracticeLink.trim() === n,
  );
  if (hits.length === 0) return null;
  if (hits.length > 1) {
    hits.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  }
  return hits[0]!.id;
}

function findPracticeDocumentId(rows: LibraryRow[], practiceName: string): string | null {
  const n = practiceName.trim();
  if (!n) return null;
  const hits = rows.filter(
    (r) =>
      r.libraryRootKind === "practice" &&
      typeof r.practiceNameForDependencyLink === "string" &&
      r.practiceNameForDependencyLink.trim() === n,
  );
  if (hits.length === 0) return null;
  if (hits.length > 1) {
    hits.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  }
  return hits[0]!.id;
}

function resolveBaselineReloadId(
  rows: LibraryRow[],
  baselineSlot: BaselineSlot,
  editingDocumentId: string | null,
): string | null {
  if (editingDocumentId && baselineSlot.libraryId === editingDocumentId) {
    return findStandaloneBaselineDocumentId(rows, String(baselineSlot.baseline.name ?? ""));
  }
  return baselineSlot.libraryId;
}

function resolvePracticeReloadId(rows: LibraryRow[], slot: PracticeSlot): string | null {
  if (!isEmbeddedPracticeSlotId(slot.libraryId)) return slot.libraryId;
  return findPracticeDocumentId(rows, String(slot.practice.name ?? ""));
}

function isEmbeddedMethodShape(v: unknown): v is Method {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const bp = (v as Record<string, unknown>).baselinePractice;
  return bp !== null && typeof bp === "object" && !Array.isArray(bp);
}

/**
 * Depth-first {@link Practice} leaves from {@link Method.practices}, recursing into embedded Method-shaped aggregates
 * (kernel heads are skipped; nesting matches composite merge walk order).
 */
function flattenMethodPracticeOverlays(items: unknown[]): Practice[] {
  const flat: Practice[] = [];
  const walk = (arr: unknown[]) => {
    for (const raw of arr) {
      if (isEmbeddedMethodShape(raw)) {
        walk(((raw as Method).practices ?? []) as unknown[]);
      } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const name = (raw as Practice).name;
        if (typeof name === "string" && name.trim() !== "") {
          flat.push(raw as Practice);
        }
      }
    }
  };
  walk(items);
  return flat;
}

/** Append incoming extension slots; skip when practice name matches an existing slot, or duplicate library ids. */
function mergeDedupPracticeSlots(existing: PracticeSlot[], incoming: PracticeSlot[]): PracticeSlot[] {
  const seenNames = new Set(
    existing.map((s) => String(s.practice.name ?? "").trim()).filter((n) => n !== ""),
  );
  const seenDocIds = new Set(
    existing.filter((s) => !isEmbeddedPracticeSlotId(s.libraryId)).map((s) => s.libraryId),
  );
  const next = [...existing];
  for (const slot of incoming) {
    const name = String(slot.practice.name ?? "").trim();
    if (name && seenNames.has(name)) continue;
    const fromLibrary = !isEmbeddedPracticeSlotId(slot.libraryId);
    if (fromLibrary && seenDocIds.has(slot.libraryId)) continue;
    if (name) seenNames.add(name);
    if (fromLibrary) seenDocIds.add(slot.libraryId);
    next.push(slot);
  }
  return next;
}

type ExtensionPracticeSlotsResult =
  | { ok: true; practiceSlots: PracticeSlot[] }
  | { ok: false; error: string };

/** Extension layers aligned to `alignBaselineName` (composer baseline), embedded first then library `practiceNames`. */
async function buildExtensionPracticeSlots(params: {
  method: Method;
  methodDocLibraryId: string;
  alignBaselineName: string;
  rows: LibraryRow[];
  fetchBody: (id: string) => Promise<unknown | null>;
}): Promise<ExtensionPracticeSlotsResult> {
  const { method, methodDocLibraryId, alignBaselineName, rows, fetchBody } = params;
  const methodRec = method as Record<string, unknown>;
  const practiceSlots: PracticeSlot[] = [];

  const embeddedLayers = flattenMethodPracticeOverlays(
    Array.isArray(method.practices) ? (method.practices as unknown[]) : [],
  );
  for (let i = 0; i < embeddedLayers.length; i++) {
    const p = embeddedLayers[i]!;
    practiceSlots.push({
      libraryId: `embedded:from:${methodDocLibraryId}:${i}:${encodeURIComponent(String(p.name ?? ""))}`,
      practice: practiceWithBaselineName(clonePractice(p), alignBaselineName),
    });
  }

  const rawNames = methodRec.practiceNames;
  if (Array.isArray(rawNames)) {
    for (const raw of rawNames) {
      const practiceName = String(raw ?? "").trim();
      if (!practiceName) continue;
      const pid = findPracticeDocumentId(rows, practiceName);
      if (!pid) {
        return { ok: false, error: `Extension practice "${practiceName}" not found in library.` };
      }
      const pBody = await fetchBody(pid);
      if (!pBody) {
        return { ok: false, error: `Could not load practice "${practiceName}" from the library.` };
      }
      const p = practiceForMethodFromLibraryBody(pBody);
      if (!p) {
        return {
          ok: false,
          error: `Library entry for practice "${practiceName}" is not a valid extension practice.`,
        };
      }
      practiceSlots.push({ libraryId: pid, practice: practiceWithBaselineName(p, alignBaselineName) });
    }
  }

  return { ok: true, practiceSlots };
}

type ComposeMethodSlotsResult =
  | { ok: true; baselineSlot: BaselineSlot; practiceSlots: PracticeSlot[] }
  | { ok: false; error: string };

/**
 * Resolves a Method that may use `baselinePracticeName` and/or `practiceNames` by loading documents from the library.
 * Embedded `practices` are flattened depth-first with nested Methods; then `practiceNames` resolve via the library index
 * (same extension order as composite merge).
 */
async function composeMethodSlotsUsingLibrary(params: {
  method: Method;
  methodDocLibraryId: string;
  rows: LibraryRow[];
  fetchBody: (id: string) => Promise<unknown | null>;
}): Promise<ComposeMethodSlotsResult> {
  const { method, methodDocLibraryId, rows, fetchBody } = params;
  const methodRec = method as Record<string, unknown>;

  let baselineSlot: BaselineSlot;
  if (methodRec.baselinePractice && typeof methodRec.baselinePractice === "object") {
    baselineSlot = {
      libraryId: methodDocLibraryId,
      baseline: methodRec.baselinePractice as PracticeBaseline,
    };
  } else {
    const ref =
      typeof methodRec.baselinePracticeName === "string" ? String(methodRec.baselinePracticeName).trim() : "";
    if (!ref) {
      return { ok: false, error: "Method has neither baselinePractice nor baselinePracticeName." };
    }
    const baselineLibraryId = findStandaloneBaselineDocumentId(rows, ref);
    if (!baselineLibraryId) {
      return { ok: false, error: `Baseline "${ref}" not found in library.` };
    }
    const baselineBody = await fetchBody(baselineLibraryId);
    if (!baselineBody) {
      return { ok: false, error: `Could not load baseline document for "${ref}".` };
    }
    const baseline = baselineForMethodFromLibraryBody(baselineBody);
    if (!baseline) {
      return {
        ok: false,
        error: `Referenced baseline "${ref}" is not a valid PracticeBaseline document.`,
      };
    }
    baselineSlot = { libraryId: baselineLibraryId, baseline };
  }

  const baselineName = String(baselineSlot.baseline.name ?? "");
  const layers = await buildExtensionPracticeSlots({
    method,
    methodDocLibraryId,
    alignBaselineName: baselineName,
    rows,
    fetchBody,
  });
  if (!layers.ok) return layers;

  return { ok: true, baselineSlot, practiceSlots: layers.practiceSlots };
}

export function MethodBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const libraryIdFromUrl = searchParams.get("libraryId");

  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState<string | null>(null);
  const [libTab, setLibTab] = useState<"all" | "baseline" | "practice">("all");

  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [loadEditError, setLoadEditError] = useState<string | null>(null);
  const [loadEditBusy, setLoadEditBusy] = useState(false);

  const [methodName, setMethodName] = useState("");
  const [methodDescription, setMethodDescription] = useState("");
  const [methodTags, setMethodTags] = useState<MethodTags>({});
  const [baselineSlot, setBaselineSlot] = useState<BaselineSlot | null>(null);
  const [practiceSlots, setPracticeSlots] = useState<PracticeSlot[]>([]);
  const [methodNarratives, setMethodNarratives] = useState<MethodNarrative[]>([]);

  const [baselineDropHover, setBaselineDropHover] = useState(false);
  const [practiceDropHover, setPracticeDropHover] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLibLoading(true);
    setLibError(null);
    try {
      const res = await fetch("/api/documents?details=1", { cache: "no-store" });
      if (!res.ok) {
        setLibError((await res.text()) || `HTTP ${res.status}`);
        setLibrary([]);
        return;
      }
      const data = (await res.json()) as { documents?: LibraryRow[] };
      setLibrary(Array.isArray(data.documents) ? data.documents : []);
    } catch (e) {
      setLibError(e instanceof Error ? e.message : "Failed to load library");
      setLibrary([]);
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!libraryIdFromUrl) {
      setEditingDocumentId(null);
      setLoadEditError(null);
      setLoadEditBusy(false);
      setMethodName("");
      setMethodDescription("");
      setMethodTags({});
      setBaselineSlot(null);
      setPracticeSlots([]);
      setMethodNarratives([]);
      setComposeError(null);
      setRefreshNote(null);
      return;
    }

    let cancelled = false;
    setLoadEditError(null);
    setLoadEditBusy(true);
    setComposeError(null);
    setEditingDocumentId(null);
    setMethodName("");
    setMethodDescription("");
    setMethodTags({});
    setBaselineSlot(null);
    setPracticeSlots([]);
    setMethodNarratives([]);
    setRefreshNote(null);

    (async () => {
      const res = await fetch(`/api/documents/${encodeURIComponent(libraryIdFromUrl)}`, {
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        setLoadEditError(`Could not load document (${res.status}).`);
        setLoadEditBusy(false);
        return;
      }
      const doc = (await res.json()) as { body?: unknown };
      const m = methodFromLibraryBody(doc.body);
      if (!m) {
        setLoadEditError("This library entry is not a Method. Open it in Practice author instead.");
        setLoadEditBusy(false);
        return;
      }
      setEditingDocumentId(libraryIdFromUrl);
      setMethodName(String(m.name ?? ""));
      setMethodDescription(String(m.description ?? ""));

      const methodRec = m as Record<string, unknown>;
      const extractedTags: MethodTags = {};
      if (methodRec.tags && typeof methodRec.tags === "object" && !Array.isArray(methodRec.tags)) {
        const tagsObj = methodRec.tags as Record<string, unknown>;
        if (Array.isArray(tagsObj.domainTags)) extractedTags.domainTags = tagsObj.domainTags.filter((t): t is string => typeof t === "string");
        if (Array.isArray(tagsObj.lifecycleTags)) extractedTags.lifecycleTags = tagsObj.lifecycleTags.filter((t): t is string => typeof t === "string");
        if (Array.isArray(tagsObj.organizationalTags)) extractedTags.organizationalTags = tagsObj.organizationalTags.filter((t): t is string => typeof t === "string");
      }
      setMethodTags(extractedTags);

      const fetchBody = async (id: string): Promise<unknown | null> => {
        const r = await fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (cancelled) return null;
        if (!r.ok) return null;
        const d = (await r.json()) as { body?: unknown };
        return d.body ?? null;
      };

      const existingNarratives = Array.isArray(methodRec.narratives) ? (methodRec.narratives as MethodNarrative[]) : [];
      setMethodNarratives(existingNarratives);
      const hasBaselineRef =
        !(methodRec.baselinePractice && typeof methodRec.baselinePractice === "object") &&
        typeof methodRec.baselinePracticeName === "string" &&
        String(methodRec.baselinePracticeName).trim() !== "";
      const hasPracticeNames =
        Array.isArray(methodRec.practiceNames) &&
        methodRec.practiceNames.some((x) => String(x ?? "").trim() !== "");

      let rows: LibraryRow[] = [];
      if (hasBaselineRef || hasPracticeNames) {
        const libRes = await fetch("/api/documents?details=1", { cache: "no-store" });
        if (cancelled) return;
        if (!libRes.ok) {
          setLoadEditError("Could not load library to resolve method references.");
          setLoadEditBusy(false);
          return;
        }
        const libData = (await libRes.json()) as { documents?: LibraryRow[] };
        rows = Array.isArray(libData.documents) ? libData.documents : [];
      }

      const composed = await composeMethodSlotsUsingLibrary({
        method: m,
        methodDocLibraryId: libraryIdFromUrl,
        rows,
        fetchBody,
      });
      if (cancelled) return;
      if (!composed.ok) {
        setLoadEditError(composed.error);
        setLoadEditBusy(false);
        return;
      }
      setBaselineSlot(composed.baselineSlot);
      setPracticeSlots(composed.practiceSlots);
      setLoadEditBusy(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [libraryIdFromUrl]);

  const filteredLibrary = useMemo(() => {
    if (libTab === "all") return library;
    if (libTab === "baseline")
      return library.filter((r) => r.libraryRootKind === "baselinePractice" || r.libraryRootKind === "method");
    return library.filter((r) => r.libraryRootKind === "practice");
  }, [library, libTab]);

  async function fetchDocumentBody(id: string): Promise<unknown | null> {
    const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as { body?: unknown };
    return doc.body ?? null;
  }

  const refreshCompositionFromLibrary = useCallback(async () => {
    if (!baselineSlot) return;
    setRefreshBusy(true);
    setComposeError(null);
    setRefreshNote(null);
    try {
      const res = await fetch("/api/documents?details=1", { cache: "no-store" });
      if (!res.ok) {
        setComposeError("Could not load the library index to refresh.");
        return;
      }
      const data = (await res.json()) as { documents?: LibraryRow[] };
      const rows = Array.isArray(data.documents) ? data.documents : [];
      setLibrary(rows);

      const baselineReloadId = resolveBaselineReloadId(rows, baselineSlot, editingDocumentId);
      let nextBaseline = baselineSlot;

      if (baselineReloadId) {
        const body = await fetchDocumentBody(baselineReloadId);
        if (!body) {
          setComposeError("Could not load the baseline library document.");
          return;
        }
        const b = baselineForMethodFromLibraryBody(body);
        if (!b) {
          setComposeError("The baseline library document is no longer valid.");
          return;
        }
        nextBaseline = { libraryId: baselineReloadId, baseline: b };
        setBaselineSlot(nextBaseline);
      }

      const bName = String(nextBaseline.baseline.name ?? "");
      const notices: string[] = [];

      if (editingDocumentId && baselineSlot.libraryId === editingDocumentId && !baselineReloadId) {
        notices.push(
          "Baseline stays embedded: no unique standalone baseline library document matched this method’s baseline name.",
        );
      }

      const nextSlots: PracticeSlot[] = [];
      let practiceFetched = 0;
      for (const s of practiceSlots) {
        const pid = resolvePracticeReloadId(rows, s);
        if (!pid) {
          nextSlots.push(s);
          notices.push(
            `Could not match “${s.practice.name}” to a unique library practice; left the embedded copy.`,
          );
          continue;
        }
        const body = await fetchDocumentBody(pid);
        if (!body) {
          setComposeError(`Could not load practice "${s.practice.name}" from the library.`);
          return;
        }
        const p = practiceForMethodFromLibraryBody(body);
        if (!p) {
          setComposeError(`Library document for "${s.practice.name}" is no longer a practice.`);
          return;
        }
        practiceFetched++;
        nextSlots.push({ libraryId: pid, practice: practiceWithBaselineName(p, bName) });
      }

      setPracticeSlots(nextSlots);

      const didBaselineFetch = Boolean(baselineReloadId);
      const parts: string[] = [];
      if (didBaselineFetch) parts.push("Baseline reloaded from the library.");
      if (practiceFetched > 0) {
        parts.push(
          `${practiceFetched} extension practice${practiceFetched === 1 ? "" : "s"} refreshed from the library.`,
        );
      }
      if (notices.length) parts.push(notices.join(" "));
      if (!parts.length) {
        parts.push("Checked the library; no linked documents needed updates.");
      }

      const nameTrim = methodName.trim();
      const descTrim = methodDescription.trim();
      if (editingDocumentId && nameTrim && descTrim) {
        const methodBody: Record<string, unknown> = {
          name: nameTrim,
          description: descTrim,
          baselinePractice: nextBaseline.baseline,
        };
        const hasTags = (methodTags.domainTags && methodTags.domainTags.length > 0) ||
                        (methodTags.lifecycleTags && methodTags.lifecycleTags.length > 0) ||
                        (methodTags.organizationalTags && methodTags.organizationalTags.length > 0);
        if (hasTags) methodBody.tags = methodTags;
        if (nextSlots.length) methodBody.practices = nextSlots.map((s) => s.practice);
        if (methodNarratives.length) methodBody.narratives = methodNarratives;
        const putRes = await fetch(`/api/documents/${encodeURIComponent(editingDocumentId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nameTrim,
            kind: "method",
            body: methodBody,
          }),
        });
        if (!putRes.ok) {
          const raw = await putRes.text();
          let msg = raw || `HTTP ${putRes.status}`;
          try {
            const j = JSON.parse(raw) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* keep */
          }
          setComposeError(`Composer was updated, but saving the method failed: ${msg}`);
          parts.push("Reload the page and try Review & save if the failure persists.");
          setRefreshNote(parts.join(" "));
          return;
        }
        parts.push("This method library entry was updated with the reloaded baseline and practices.");
        void loadLibrary();
      } else if (editingDocumentId && (!nameTrim || !descTrim)) {
        parts.push("Composer updated; fill method name and description, then use Review & save to persist.");
      }

      setRefreshNote(parts.join(" "));
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : "Refresh failed.");
    } finally {
      setRefreshBusy(false);
    }
  }, [baselineSlot, practiceSlots, editingDocumentId, methodName, methodDescription, methodTags, methodNarratives, loadLibrary]);

  async function handleDropBaseline(e: React.DragEvent) {
    e.preventDefault();
    setBaselineDropHover(false);
    setComposeError(null);
    setRefreshNote(null);
    const payload = parseDragPayload(e.dataTransfer);
    if (!payload) {
      setComposeError("Drop a row from the library list (drag the handle).");
      return;
    }
    const body = await fetchDocumentBody(payload.id);
    if (!body) {
      setComposeError("Could not load that library document.");
      return;
    }
    const m = methodFromLibraryBody(body);
    if (m) {
      const methodRec = m as Record<string, unknown>;
      const hasBaselineRef =
        !(methodRec.baselinePractice && typeof methodRec.baselinePractice === "object") &&
        typeof methodRec.baselinePracticeName === "string" &&
        String(methodRec.baselinePracticeName).trim() !== "";
      const hasPracticeNames =
        Array.isArray(methodRec.practiceNames) &&
        methodRec.practiceNames.some((x) => String(x ?? "").trim() !== "");

      let rows: LibraryRow[] = [];
      if (hasBaselineRef || hasPracticeNames) {
        const libRes = await fetch("/api/documents?details=1", { cache: "no-store" });
        if (!libRes.ok) {
          setComposeError("Could not load library index to resolve method references.");
          return;
        }
        const libData = (await libRes.json()) as { documents?: LibraryRow[] };
        rows = Array.isArray(libData.documents) ? libData.documents : [];
      }

      const composed = await composeMethodSlotsUsingLibrary({
        method: m,
        methodDocLibraryId: payload.id,
        rows,
        fetchBody: fetchDocumentBody,
      });
      if (!composed.ok) {
        setComposeError(composed.error);
        return;
      }
      setBaselineSlot(composed.baselineSlot);
      setPracticeSlots(composed.practiceSlots);
      // Extract narratives from the dropped method
      const droppedNarratives = Array.isArray(methodRec.narratives) ? (methodRec.narratives as any[]) : [];
      setMethodNarratives((prev) => mergeNarrativesAdditive(prev, droppedNarratives));
      return;
    }
    const baseline = baselineForMethodFromLibraryBody(body);
    if (!baseline) {
      setComposeError(
        "Only a baseline practice (full baseline JSON) or a method (its embedded baseline) can be dropped here.",
      );
      return;
    }
    setBaselineSlot({ libraryId: payload.id, baseline });
    setPracticeSlots((prev) =>
      prev.map((s) => ({
        ...s,
        practice: practiceWithBaselineName(s.practice, baseline.name),
      })),
    );
  }

  async function handleDropPractice(e: React.DragEvent) {
    e.preventDefault();
    setPracticeDropHover(false);
    setComposeError(null);
    setRefreshNote(null);
    if (!baselineSlot) {
      setComposeError("Drop a baseline practice first, then add extension practices.");
      return;
    }
    const payload = parseDragPayload(e.dataTransfer);
    if (!payload) {
      setComposeError("Drop a row from the library list.");
      return;
    }
    const body = await fetchDocumentBody(payload.id);
    if (!body) {
      setComposeError("Could not load that library document.");
      return;
    }

    const droppedMethod = methodFromLibraryBody(body);
    if (droppedMethod) {
      const baselineName = String(baselineSlot.baseline.name ?? "");
      const methodRec = droppedMethod as Record<string, unknown>;
      const hasPracticeNames =
        Array.isArray(methodRec.practiceNames) &&
        methodRec.practiceNames.some((x) => String(x ?? "").trim() !== "");

      let rows: LibraryRow[] = [];
      if (hasPracticeNames) {
        const libRes = await fetch("/api/documents?details=1", { cache: "no-store" });
        if (!libRes.ok) {
          setComposeError("Could not load library index to resolve practice names.");
          return;
        }
        const libData = (await libRes.json()) as { documents?: LibraryRow[] };
        rows = Array.isArray(libData.documents) ? libData.documents : [];
      }

      const built = await buildExtensionPracticeSlots({
        method: droppedMethod,
        methodDocLibraryId: payload.id,
        alignBaselineName: baselineName,
        rows,
        fetchBody: fetchDocumentBody,
      });
      if (!built.ok) {
        setComposeError(built.error);
        return;
      }
      setPracticeSlots((prev) => mergeDedupPracticeSlots(prev, built.practiceSlots));
      // Extract narratives from the dropped method
      const droppedNarratives = Array.isArray(methodRec.narratives) ? (methodRec.narratives as any[]) : [];
      setMethodNarratives((prev) => mergeNarrativesAdditive(prev, droppedNarratives));
      return;
    }

    const p = practiceForMethodFromLibraryBody(body);
    if (!p) {
      setComposeError("Only extension practice or method documents can be dropped here.");
      return;
    }
    if (practiceSlots.some((s) => s.libraryId === payload.id)) {
      setComposeError("That practice is already in the method.");
      return;
    }
    const aligned = practiceWithBaselineName(p, baselineSlot.baseline.name);
    setPracticeSlots((prev) => [...prev, { libraryId: payload.id, practice: aligned }]);
  }

  function removePractice(libraryId: string) {
    setRefreshNote(null);
    setPracticeSlots((prev) => prev.filter((s) => s.libraryId !== libraryId));
  }

  function clearBaseline() {
    setBaselineSlot(null);
    setPracticeSlots([]);
    setMethodNarratives([]);
    setComposeError(null);
    setRefreshNote(null);
    setEditingDocumentId(null);
    router.replace("/method-builder");
  }

  const methodPayload = useMemo(() => {
    if (!baselineSlot) return null;
    const name = methodName.trim();
    const description = methodDescription.trim();
    if (!name || !description) return null;
    const body: Record<string, unknown> = {
      name,
      description,
      baselinePractice: baselineSlot.baseline,
    };
    const hasTags = (methodTags.domainTags && methodTags.domainTags.length > 0) ||
                    (methodTags.lifecycleTags && methodTags.lifecycleTags.length > 0) ||
                    (methodTags.organizationalTags && methodTags.organizationalTags.length > 0);
    if (hasTags) {
      body.tags = methodTags;
    }
    if (practiceSlots.length) {
      body.practices = practiceSlots.map((s) => s.practice);
    }
    if (methodNarratives.length) {
      body.narratives = methodNarratives;
    }
    return body;
  }, [baselineSlot, methodName, methodDescription, methodTags, practiceSlots, methodNarratives]);

  const canOpenSave = Boolean(baselineSlot);
  const saveModalValid =
    Boolean(methodPayload) && methodName.trim().length > 0 && methodDescription.trim().length > 0;

  async function submitSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!methodPayload) {
      setSaveError("Method name and description are required.");
      return;
    }
    setSaveBusy(true);
    setSaveError(null);
    const isUpdate = Boolean(editingDocumentId);
    try {
      const res = isUpdate
        ? await fetch(`/api/documents/${encodeURIComponent(editingDocumentId!)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: methodName.trim(),
              kind: "method",
              body: methodPayload,
            }),
          })
        : await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: methodName.trim(),
              kind: "method",
              body: methodPayload,
            }),
          });
      if (!res.ok) {
        let msg = await res.text();
        try {
          const j = JSON.parse(msg) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep */
        }
        setSaveError(msg || `Save failed (${res.status})`);
        return;
      }
      setSaveOpen(false);
      setComposeError(null);
      let newDocId: string | undefined;
      if (!isUpdate) {
        const created = (await res.json()) as { id?: string };
        newDocId = created?.id;
      }
      await loadLibrary();
      if (!isUpdate && newDocId) {
        router.replace(`/method-builder?libraryId=${encodeURIComponent(newDocId)}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-content px-4 py-10 md:px-10">
        {editingDocumentId ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
            <Link href="/library" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
              Library
            </Link>
          </p>
        ) : null}
        <h1 className={editingDocumentId ? "mt-2 text-3xl font-semibold tracking-tight" : "text-3xl font-semibold tracking-tight"}>Method builder</h1>
        {editingDocumentId ? (
          <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--text)]">
            Editing a saved library method. Saving updates this entry. Clear the baseline to start a new method.
          </p>
        ) : null}
        {loadEditBusy ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Loading method from library…</p>
        ) : null}
        {loadEditError ? (
          <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 text-sm text-[var(--bad)]">
            {loadEditError}
          </p>
        ) : null}
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Drag a <strong className="text-[var(--text)]">baseline</strong> from the library into the baseline slot, then
          drag <strong className="text-[var(--text)]">extension practices</strong> into the method. Enter the
          method&apos;s name and description, then save. Dropping a <strong className="text-[var(--text)]">method</strong>{" "}
          loads its embedded baseline and all of that method&apos;s extension practices; dropping a standalone baseline
          keeps or re-links practices you already added. Extension practices are linked to the method baseline by name
          automatically. Open a method from the library to edit its current version here.
        </p>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Library */}
          <aside className="w-full shrink-0 lg:w-72 xl:w-80">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
              <h2 className="text-sm font-semibold tracking-tight">Library</h2>
              <button
                type="button"
                onClick={() => void loadLibrary()}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-2xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                Refresh
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Library filter">
              {(
                [
                  ["all", "All"],
                  ["baseline", "Baselines"],
                  ["practice", "Practices"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={libTab === id}
                  onClick={() => setLibTab(id)}
                  className={`rounded-lg px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide ${
                    libTab === id
                      ? "bg-[var(--accent)]/20 text-[var(--text)] ring-1 ring-[var(--accent)]/40"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {libLoading ? (
              <p className="mt-4 text-xs text-[var(--muted)]">Loading…</p>
            ) : libError ? (
              <p className="mt-4 text-xs text-[var(--bad)]">{libError}</p>
            ) : filteredLibrary.length === 0 ? (
              <p className="mt-4 text-xs text-[var(--muted)]">No items match this filter.</p>
            ) : (
              <ul className="mt-3 max-h-[min(70vh,32rem)] space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
                {filteredLibrary.map((row) => (
                  <LibraryDraggableRow key={row.id} row={row} />
                ))}
              </ul>
            )}
          </aside>

          {/* Composition */}
          <div className="min-w-0 flex-1 space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Method details</h2>
              <p className="mt-1 text-2xs text-[var(--muted)]">
                <span className="text-[var(--bad)]">*</span> Required for a valid Method document.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Method name <span className="text-[var(--bad)]">*</span>
                  </span>
                  <input
                    value={methodName}
                    onChange={(e) => setMethodName(e.target.value)}
                    placeholder="e.g. Platform adoption method"
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Method description <span className="text-[var(--bad)]">*</span>
                  </span>
                  <textarea
                    value={methodDescription}
                    onChange={(e) => setMethodDescription(e.target.value)}
                    placeholder="Short prose describing this method bundle."
                    rows={3}
                    className="mt-1.5 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                  />
                </label>
              </div>
            </section>

            {/* Tags Section */}
            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Method Tags</h2>
              <p className="mt-1 text-2xs text-[var(--muted)]">
                Categorize this method with domain, lifecycle, and organizational tags.
              </p>
              <div className="mt-4">
                <MethodTagsField value={methodTags} onChange={setMethodTags} />
              </div>
            </section>

            {/* Narratives Section */}
            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Method Narratives</h2>
              <p className="mt-1 text-2xs text-[var(--muted)]">
                Define narratives (user stories, use cases, scenarios) that describe how this method is applied.
              </p>
              <div className="mt-4">
                <MethodNarrativesField value={methodNarratives} onChange={setMethodNarratives} />
              </div>
            </section>

            {composeError ? (
              <p className="rounded-lg border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">
                {composeError}
              </p>
            ) : null}
            {refreshNote ? (
              <p className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs text-[var(--text)]">
                {refreshNote}
              </p>
            ) : null}

            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Baseline practice <span className="text-[var(--bad)]">*</span>
                </h2>
                {baselineSlot ? (
                  <button
                    type="button"
                    onClick={clearBaseline}
                    className="text-2xs font-semibold text-[var(--muted)] underline-offset-2 hover:text-[var(--bad)] hover:underline"
                  >
                    Clear baseline &amp; practices
                  </button>
                ) : null}
              </div>
              <div
                role="region"
                aria-label="Drop baseline practice here"
                onDragOver={(e) => {
                  e.preventDefault();
                  setBaselineDropHover(true);
                }}
                onDragLeave={() => setBaselineDropHover(false)}
                onDrop={handleDropBaseline}
                className={`mt-3 min-h-[120px] rounded-xl border-2 border-dashed px-4 py-6 transition ${
                  baselineDropHover
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] bg-[var(--bg)]/40"
                }`}
              >
                {baselineSlot ? (
                  <div>
                    <p className="font-medium text-[var(--text)]">{baselineSlot.baseline.name}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-[var(--muted)]">{baselineSlot.baseline.description}</p>
                    <p className="mt-2 font-mono text-2xs text-[var(--muted)]">
                      {baselineSlot.baseline.focuses?.length ?? 0} focuses · {baselineSlot.baseline.alphas?.length ?? 0}{" "}
                      alphas
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-sm text-[var(--muted)]">
                    Drag a <strong className="text-[var(--text)]">baseline</strong> or{" "}
                    <strong className="text-[var(--text)]">method</strong> document here.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)]">Extension practices</h2>
                <button
                  type="button"
                  disabled={!baselineSlot || loadEditBusy || refreshBusy || libLoading}
                  onClick={() => void refreshCompositionFromLibrary()}
                  className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshBusy ? "Refreshing…" : "Refresh from library"}
                </button>
              </div>
              <p className="mt-1 text-2xs text-[var(--muted)]">
                Optional Practice-shaped entries. Refresh pulls the latest baseline and practices from the library
                (direct links by document id; otherwise matches by symbolic JSON{" "}
                <code className="text-[var(--text)]">name</code>, preferring the most recently updated library entry
                when several share a name). When you have a saved library method open, refresh also saves the method so
                Browse shows the merged content.
              </p>
              <div
                role="region"
                aria-label="Drop extension practices or a method here"
                onDragOver={(e) => {
                  e.preventDefault();
                  setPracticeDropHover(true);
                }}
                onDragLeave={() => setPracticeDropHover(false)}
                onDrop={handleDropPractice}
                className={`mt-3 min-h-[100px] rounded-xl border-2 border-dashed px-4 py-4 transition ${
                  practiceDropHover
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] bg-[var(--bg)]/40"
                }`}
              >
                {practiceSlots.length === 0 ? (
                  <p className="text-center text-sm text-[var(--muted)]">
                    {baselineSlot
                      ? "Drag extension practice rows or an entire method; named references load from the library. Duplicates are skipped."
                      : "Set a baseline first."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {practiceSlots.map((s) => (
                      <li
                        key={s.libraryId}
                        className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text)]">{s.practice.name}</p>
                          <p className="font-mono text-2xs text-[var(--muted)]">
                            baselinePracticeName → {s.practice.baselinePracticeName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePractice(s.libraryId)}
                          className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-2xs font-semibold text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canOpenSave}
                onClick={() => {
                  setSaveError(null);
                  setSaveOpen(true);
                }}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/90 px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review &amp; save…
              </button>
              {!canOpenSave ? (
                <span className="self-center text-xs text-[var(--muted)]">Add a baseline to enable saving.</span>
              ) : !methodName.trim() || !methodDescription.trim() ? (
                <span className="self-center text-xs text-[var(--muted)]">Fill method name and description before saving.</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {saveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => !saveBusy && setSaveOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-save-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl"
          >
            <h2 id="method-save-title" className="text-lg font-semibold text-[var(--text)]">
              {editingDocumentId ? "Update method in library" : "Save method to library"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              {editingDocumentId
                ? "Confirm the Method fields below. Saving replaces the existing library document with this version."
                : "Confirm the required Method fields. The stored document uses your method name as the library title and embeds the baseline plus any extension practices."}
            </p>
            <form className="mt-4 space-y-3" onSubmit={(e) => void submitSave(e)}>
              <label className="block">
                <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Method name <span className="text-[var(--bad)]">*</span>
                </span>
                <input
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
              <label className="block">
                <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Method description <span className="text-[var(--bad)]">*</span>
                </span>
                <textarea
                  value={methodDescription}
                  onChange={(e) => setMethodDescription(e.target.value)}
                  required
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/40 px-3 py-2 text-xs text-[var(--muted)]">
                <p>
                  <span className="font-semibold text-[var(--text)]">Baseline:</span>{" "}
                  {baselineSlot ? baselineSlot.baseline.name : "—"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-[var(--text)]">Extensions:</span> {practiceSlots.length} practice
                  {practiceSlots.length === 1 ? "" : "s"}
                </p>
                {((methodTags.domainTags && methodTags.domainTags.length > 0) ||
                  (methodTags.lifecycleTags && methodTags.lifecycleTags.length > 0) ||
                  (methodTags.organizationalTags && methodTags.organizationalTags.length > 0)) ? (
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--text)]">Tags:</span>{" "}
                    {[
                      ...(methodTags.domainTags ?? []),
                      ...(methodTags.lifecycleTags ?? []),
                      ...(methodTags.organizationalTags ?? [])
                    ].length} defined
                  </p>
                ) : null}
                {methodNarratives.length > 0 ? (
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--text)]">Narratives:</span> {methodNarratives.length} defined
                  </p>
                ) : null}
              </div>
              {saveError ? <p className="text-xs text-[var(--bad)]">{saveError}</p> : null}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saveBusy}
                  onClick={() => setSaveOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]/50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBusy || !saveModalValid}
                  className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/90 px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveBusy ? "Saving…" : editingDocumentId ? "Update in library" : "Save to library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LibraryDraggableRow({ row }: { row: LibraryRow }) {
  const ext = rootKindExtension(row.libraryRootKind);
  const hint =
    row.libraryRootKind === "baselinePractice" || row.libraryRootKind === "method"
      ? "→ baseline slot"
      : row.libraryRootKind === "practice"
        ? "→ extensions"
        : "may not drop";

  function onDragStart(e: React.DragEvent) {
    const payload: LibraryDragPayload = { type: "library", id: row.id };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-transparent bg-[var(--bg)]/30 px-2 py-2 hover:border-[var(--border)]">
      <div
        draggable
        onDragStart={onDragStart}
        className="cursor-grab select-none rounded border border-[var(--border)] bg-[var(--panel)] px-1.5 py-1 font-mono text-xs text-[var(--muted)] active:cursor-grabbing"
        title="Drag into baseline or extensions"
        aria-grabbed="false"
      >
        ⋮⋮
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--text)]">{row.displayName}</p>
        <p className="mt-0.5 font-mono text-2xs text-[var(--muted)]">
          .{ext} · {hint}
        </p>
      </div>
    </li>
  );
}
