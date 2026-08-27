/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Divider,
  Split,
  SplitItem,
} from "@patternfly/react-core";
import type { ValidationIssue } from "@/lib/types";
import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  buildIndexes,
  enrichBaselineWithReferencedWrappers,
} from "@/lib/ir";
import { inferPracticeDocKind } from "@/components/practice/PracticeAuthorForm";
import { displayNameForBody, storageKindForBody } from "@/lib/library/classify";
import { emptyExtensionPractice } from "@/lib/data/practiceFormDefaults";
import { useTheme } from "@/lib/display/theme";
import { useLanguagePack } from "@/lib/display/languagePack";
import { JsonEditor } from "@/components/editors/JsonEditor";
import { YamlEditor } from "@/components/editors/YamlEditor";
import { WysiwygEditor } from "@/components/editors/WysiwygEditor";
import { yamlToJson, jsonToYaml } from "@/lib/converters/yaml-json-converter";
import { useResolvedBaseline } from "@/hooks/useResolvedBaseline";
import { buildElementSourceMap } from "@/lib/display/sourceTracking";
import { formatValidationIssue, formatRefIssue } from "@/lib/core/errorFormatting";

function issueBox(kind: "bad" | "warn"): React.CSSProperties {
  return {
    border: `1px solid ${kind === "bad" ? "rgba(251,113,133,0.6)" : "rgba(251,191,36,0.5)"}`,
    background: kind === "bad" ? "rgba(251,113,133,0.12)" : "rgba(251,191,36,0.10)",
    borderRadius: 8,
    padding: 12,
    color: "var(--text)",
  };
}



function PracticeAuthorPageInner() {
  const [mounted, setMounted] = useState(false);
  const [doc, setDoc] = useState<Record<string, unknown>>(() => emptyExtensionPractice());
  const [originalDoc, setOriginalDoc] = useState<Record<string, unknown>>(() => emptyExtensionPractice());
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "yaml" | "json">("wysiwyg");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonDraftError, setJsonDraftError] = useState<string | null>(null);
  const [yamlDraft, setYamlDraft] = useState("");
  const [yamlDraftError, setYamlDraftError] = useState<string | null>(null);
  const [libraryDirty, setLibraryDirty] = useState(false);
  const [librarySaveBusy, setLibrarySaveBusy] = useState(false);
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);
  const [libraryDiscardBusy, setLibraryDiscardBusy] = useState(false);
  const [libraryDiscardError, setLibraryDiscardError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ path: string; message: string }[]>([]);
  const [refIssues, setRefIssues] = useState<any[]>([]);
  const [kind, setKind] = useState<"extension" | "baseline">("extension");
  const [libraryBodies, setLibraryBodies] = useState<unknown[]>([]);
  const { themeId } = useTheme();
  const { packId, t } = useLanguagePack();
  const searchParams = useSearchParams();
  const router = useRouter();
  const libraryId = useMemo(() => {
    const explicit = searchParams.get("libraryId");
    if (explicit) return explicit;
    const bundle = searchParams.get("bundle");
    const path = searchParams.get("path");
    if (bundle && path) return `bundle:${bundle}/${path}`;
    return null;
  }, [searchParams]);

  const isLibrarySession = Boolean(libraryId);

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all library documents for baseline resolution
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        // Fetch full content for each document
        const allDocs = Array.isArray(data.documents) ? data.documents : [];
        // Filter out dashboard-config documents - only use library items
        const documents = allDocs.filter((d: any) => d.kind !== "dashboard-config");
        const bodies: unknown[] = [];

        for (const doc of documents) {
          if (!doc.id) continue;
          try {
            const docRes = await fetch(`/api/documents/${encodeURIComponent(doc.id)}`);
            if (docRes.ok) {
              const docData = await docRes.json();
              if (docData.body) {
                bodies.push(docData.body);
              }
            }
          } catch (err) {
            console.warn('Failed to fetch document', doc.id, err);
          }
        }

        if (!cancelled) {
          setLibraryBodies(bodies);
        }
      } catch (e) {
        console.error("Failed to load library for baseline resolution:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runValidation = useCallback(async (parsed: unknown) => {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const result: { ok: boolean; issues: ValidationIssue[]; relaxedOk: boolean; relaxedIssues: ValidationIssue[] } = await res.json();
    setValidationIssues(!result.ok ? result.issues : !result.relaxedOk ? result.relaxedIssues : []);
    const b = asBaselineDocument(parsed);
    if (b) {
      const withActivities = baselineWithPracticeActivities(parsed, b);
      setRefIssues(buildIndexes(enrichBaselineWithReferencedWrappers(parsed, withActivities), parsed).issues);
    } else {
      setRefIssues([]);
    }
  }, []);

  const resolveBodyForSave = useCallback((): Record<string, unknown> | null => {
    if (editorMode === "json") {
      try {
        const p: unknown = JSON.parse(jsonDraft);
        if (p === null || typeof p !== "object" || Array.isArray(p)) {
          setLibrarySaveError("Document must be a JSON object.");
          return null;
        }
        setLibrarySaveError(null);
        return p as Record<string, unknown>;
      } catch (e: unknown) {
        setLibrarySaveError(e instanceof Error ? e.message : "Invalid JSON");
        return null;
      }
    }
    return doc;
  }, [editorMode, jsonDraft, doc]);

  const commitJsonDraft = useCallback((): boolean => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonDraftError("Document must be a JSON object.");
        return false;
      }
      const asDoc = parsed as Record<string, unknown>;
      setDoc(asDoc);
      setKind(inferPracticeDocKind(asDoc));
      if (libraryId) setLibraryDirty(true);
      void runValidation(parsed);
      setJsonDraftError(null);
      return true;
    } catch (e: unknown) {
      setJsonDraftError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  }, [jsonDraft, libraryId, runValidation]);

  const commitYamlDraft = useCallback((): boolean => {
    const result = yamlToJson(yamlDraft);
    if (!result.ok) {
      setYamlDraftError(result.error);
      return false;
    }
    const parsed = result.json;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setYamlDraftError("Document must be a YAML object.");
      return false;
    }
    const asDoc = parsed as Record<string, unknown>;
    setDoc(asDoc);
    setKind(inferPracticeDocKind(asDoc));
    if (libraryId) setLibraryDirty(true);
    void runValidation(parsed);
    setYamlDraftError(null);
    return true;
  }, [yamlDraft, libraryId, runValidation]);

  useEffect(() => {
    const id = libraryId;
    if (!id) return;
    let cancelled = false;
    const openJsonFromQuery =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("editor") === "json";
    void (async () => {
      try {
        const docUrl = id.startsWith("bundle:")
          ? (() => {
              const ref = id.slice(7);
              const slashIdx = ref.indexOf("/");
              return `/api/library/document?bundle=${encodeURIComponent(ref.slice(0, slashIdx))}&path=${encodeURIComponent(ref.slice(slashIdx + 1))}`;
            })()
          : `/api/documents/${encodeURIComponent(id)}`;
        const res = await fetch(docUrl);
        if (!res.ok) {
          if (!cancelled) {
            setValidationIssues([{ path: "", message: `Library document not found (${res.status})` }]);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const parsed = data.body;
        const asDoc = parsed as Record<string, unknown>;
        setDoc(asDoc);
        setOriginalDoc(asDoc);
        setKind(inferPracticeDocKind(asDoc));
        setLibraryDirty(false);
        setLibrarySaveError(null);
        setLibraryDiscardError(null);
        setJsonDraft(JSON.stringify(asDoc ?? {}, null, 2));
        setJsonDraftError(null);
        const yamlResult = jsonToYaml(asDoc ?? {});
        if (yamlResult.ok) {
          setYamlDraft(yamlResult.yaml);
          setYamlDraftError(null);
        }
        setEditorMode(openJsonFromQuery ? "json" : "wysiwyg");
        await runValidation(parsed);
        if (!cancelled && openJsonFromQuery) {
          router.replace(`/practice-author?libraryId=${encodeURIComponent(id)}`, { scroll: false });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load library document";
          setValidationIssues([{ path: "", message: msg }]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryId, runValidation, router]);

  const saveToLibrary = useCallback(async () => {
    const bodyToSave = resolveBodyForSave();
    if (!bodyToSave) return;

    setLibrarySaveBusy(true);
    setLibrarySaveError(null);

    const isBundleSource = Boolean(libraryId) && libraryId!.startsWith("bundle:");
    const isFlatStoreUpdate = Boolean(libraryId) && !isBundleSource;

    try {
      // For bundle sources, find existing workspace copy by name to avoid duplicates
      let existingWorkspaceId: string | null = null;
      let existingWorkspaceVersion: string | null = null;
      if (isBundleSource) {
        const docName = displayNameForBody(bodyToSave, "Practice");
        try {
          const listRes = await fetch("/api/documents?details=1", { cache: "no-store" });
          if (listRes.ok) {
            const listData = (await listRes.json()) as { documents?: Array<{ id: string; displayName?: string; kind: string }> };
            const match = (listData.documents ?? []).find(
              (d) => d.kind !== "dashboard-config" && d.displayName === docName,
            );
            if (match) {
              existingWorkspaceId = match.id;
              const wsRes = await fetch(`/api/documents/${encodeURIComponent(match.id)}`, { cache: "no-store" });
              if (wsRes.ok) {
                const wsDoc = (await wsRes.json()) as { body?: Record<string, unknown> };
                existingWorkspaceVersion = typeof wsDoc.body?.version === "string" ? wsDoc.body.version : null;
              }
            }
          }
        } catch { /* proceed without dedup info */ }
      }

      // Compute workspace version for bundle-sourced saves
      if (isBundleSource) {
        const sourceVer = typeof bodyToSave.version === "string" ? bodyToSave.version : null;
        const baseVer = sourceVer?.replace(/-workspace\.\d+$/, "") || "0.0.0";
        if (existingWorkspaceVersion) {
          const wsMatch = existingWorkspaceVersion.match(/^(.+)-workspace\.(\d+)$/);
          bodyToSave.version = wsMatch
            ? `${wsMatch[1]}-workspace.${Number(wsMatch[2]) + 1}`
            : `${baseVer}-workspace.1`;
        } else {
          bodyToSave.version = `${baseVer}-workspace.1`;
        }
      }

      const willUpdate = isFlatStoreUpdate || existingWorkspaceId !== null;
      const targetId = isFlatStoreUpdate ? libraryId! : existingWorkspaceId;

      if (!willUpdate && !libraryId) {
        // Brand-new document (no library source)
        const title = displayNameForBody(bodyToSave, "Practice");
        const storageKind = storageKindForBody(bodyToSave);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind: storageKind, body: bodyToSave }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          let msg = txt;
          try {
            const j = JSON.parse(txt) as { error?: string };
            if (j?.error) msg = j.error;
          } catch { /* keep txt */ }
          setLibrarySaveError(msg || `${res.status}`);
          return;
        }
        const created = (await res.json()) as { id?: string };
        if (!created.id) {
          setLibrarySaveError(t.saveMissingDocumentId);
          return;
        }
        router.replace(`/practice-author?libraryId=${encodeURIComponent(created.id)}`);
        return;
      }

      if (willUpdate && targetId) {
        // Update existing flat-store document (or existing workspace copy)
        const res = await fetch(`/api/documents/${encodeURIComponent(targetId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: bodyToSave }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          let msg = txt;
          try {
            const j = JSON.parse(txt) as { error?: string };
            if (j?.error) msg = j.error;
          } catch { /* keep txt */ }
          setLibrarySaveError(msg || `${res.status}`);
          return;
        }
        setDoc(bodyToSave);
        setOriginalDoc(bodyToSave);
        setKind(inferPracticeDocKind(bodyToSave));
        setJsonDraft(JSON.stringify(bodyToSave, null, 2));
        const yamlResult = jsonToYaml(bodyToSave);
        if (yamlResult.ok) {
          setYamlDraft(yamlResult.yaml);
        }
        void runValidation(bodyToSave);
        setLibraryDirty(false);
        // Redirect to flat-store ID so subsequent saves update in place
        if (isBundleSource) {
          router.replace(`/practice-author?libraryId=${encodeURIComponent(targetId)}`);
        }
        return;
      }

      // Bundle source, no existing workspace — create new flat-store copy
      const title = displayNameForBody(bodyToSave, "Practice");
      const storageKind = storageKindForBody(bodyToSave);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind: storageKind, body: bodyToSave }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt;
        try {
          const j = JSON.parse(txt) as { error?: string };
          if (j?.error) msg = j.error;
        } catch { /* keep txt */ }
        setLibrarySaveError(msg || `${res.status}`);
        return;
      }
      const created = (await res.json()) as { id?: string };
      if (!created.id) {
        setLibrarySaveError(t.saveMissingDocumentId);
        return;
      }
      router.replace(`/practice-author?libraryId=${encodeURIComponent(created.id)}`);
    } catch (e: unknown) {
      setLibrarySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLibrarySaveBusy(false);
    }
  }, [resolveBodyForSave, libraryId, router, runValidation, t]);

  const saveAsNewDocument = useCallback(async () => {
    const bodyToSave = resolveBodyForSave();
    if (!bodyToSave) return;

    setLibrarySaveBusy(true);
    setLibrarySaveError(null);
    try {
      const title = displayNameForBody(bodyToSave, "Practice");
      const storageKind = storageKindForBody(bodyToSave);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind: storageKind, body: bodyToSave }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt;
        try {
          const j = JSON.parse(txt) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep txt */
        }
        setLibrarySaveError(msg || `${res.status}`);
        return;
      }
      const created = (await res.json()) as { id?: string };
      if (!created.id) {
        setLibrarySaveError(t.saveMissingDocumentId);
        return;
      }
      router.push(`/practice-author?libraryId=${encodeURIComponent(created.id)}`);
    } catch (e: unknown) {
      setLibrarySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLibrarySaveBusy(false);
    }
  }, [resolveBodyForSave, router, t]);

  const revertChanges = useCallback(() => {
    if (!window.confirm("Revert all changes to the original document? This cannot be undone.")) return;
    setDoc(originalDoc);
    setKind(inferPracticeDocKind(originalDoc));
    setJsonDraft(JSON.stringify(originalDoc, null, 2));
    const yamlResult = jsonToYaml(originalDoc);
    if (yamlResult.ok) {
      setYamlDraft(yamlResult.yaml);
      setYamlDraftError(null);
    }
    void runValidation(originalDoc);
    setLibraryDirty(false);
  }, [originalDoc, runValidation]);

  const discardLibraryChanges = useCallback(async () => {
    if (!libraryId) return;
    if (libraryDirty && !window.confirm(t.discardLibraryConfirm)) return;
    setLibraryDiscardBusy(true);
    setLibraryDiscardError(null);
    try {
      const discardUrl = libraryId.startsWith("bundle:")
        ? (() => {
            const ref = libraryId.slice(7);
            const slashIdx = ref.indexOf("/");
            return `/api/library/document?bundle=${encodeURIComponent(ref.slice(0, slashIdx))}&path=${encodeURIComponent(ref.slice(slashIdx + 1))}`;
          })()
        : `/api/documents/${encodeURIComponent(libraryId)}`;
      const res = await fetch(discardUrl);
      if (!res.ok) {
        setLibraryDiscardError(`${t.discardFailed} (${res.status})`);
        return;
      }
      const data = (await res.json()) as { body?: unknown };
      const parsed = data.body ?? {};
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setLibraryDiscardError(t.discardFailed);
        return;
      }
      const asDoc = parsed as Record<string, unknown>;
      setDoc(asDoc);
      setKind(inferPracticeDocKind(asDoc));
      setJsonDraft(JSON.stringify(asDoc, null, 2));
      setJsonDraftError(null);
      const yamlResult = jsonToYaml(asDoc);
      if (yamlResult.ok) {
        setYamlDraft(yamlResult.yaml);
        setYamlDraftError(null);
      }
      setLibraryDirty(false);
      setEditorMode("wysiwyg");
      await runValidation(parsed);
    } catch (e: unknown) {
      setLibraryDiscardError(e instanceof Error ? e.message : t.discardFailed);
    } finally {
      setLibraryDiscardBusy(false);
    }
  }, [libraryId, libraryDirty, runValidation, t]);

  /** Practice-only slice (or Method embedded baseline / full baseline doc); activities appended from Practice.activities. */
  const baseline = useMemo(() => (doc ? asBaselineDocument(doc) : null), [doc]);
  const baselineForRender = useMemo(() => {
    if (!baseline || !doc) return null;
    const withActivities = baselineWithPracticeActivities(doc, baseline);
    return enrichBaselineWithReferencedWrappers(doc, withActivities);
  }, [baseline, doc]);

  // Resolve baseline for extension practices
  const { baseline: resolvedBaseline, dependencies } = useResolvedBaseline(doc, libraryBodies);

  // Build element source map for baseline inheritance
  const elementSourceMap = useMemo(() => {
    if (kind !== 'extension' || !resolvedBaseline) return new Map();
    return buildElementSourceMap(doc, resolvedBaseline, dependencies);
  }, [doc, resolvedBaseline, dependencies, kind]);

  async function loadExample() {
    const res = await fetch("/examples/platform-adoption-kernel.json");
    const txt = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(txt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid example JSON";
      setValidationIssues([{ path: "", message: msg }]);
      return;
    }
    const asDoc = parsed as Record<string, unknown>;
    setDoc(asDoc);
    setKind(inferPracticeDocKind(asDoc));
    setJsonDraft(JSON.stringify(asDoc, null, 2));
    const yamlResult = jsonToYaml(asDoc);
    if (yamlResult.ok) {
      setYamlDraft(yamlResult.yaml);
    }
    setEditorMode("wysiwyg");
    setLibraryDirty(false);
    await runValidation(parsed);
  }

  async function validateAndLoad() {
    await runValidation(doc);
  }

  // Prevent hydration mismatch by only rendering full UI on client
  if (!mounted) {
    return (
      <PageSection>
        <div style={{ padding: '24px', textAlign: 'center', color: '#6a6e73' }}>
          Loading editor...
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title headingLevel="h1" size="xl">Practice Editor</Title>
          {isLibrarySession && (
            <Content component={ContentVariants.small} style={{ marginTop: 4, color: "var(--pf-v6-global--Color--200)" }}>
              Editing: <strong>{displayNameForBody(doc, "Practice")}</strong>
              {libraryDirty && <Label color="orange" style={{ marginLeft: 8 }}>Unsaved</Label>}
            </Content>
          )}
      </div>

      {/* Toolbar */}
      <Toolbar className="no-print" style={{ marginBottom: 16 }}>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={() => void saveToLibrary()}
                isDisabled={librarySaveBusy || (isLibrarySession && !libraryDirty)}
              >
                {librarySaveBusy ? "Saving..." : "Save"}
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="secondary"
                onClick={() => void saveAsNewDocument()}
                isDisabled={librarySaveBusy}
              >
                Save As...
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="secondary"
                onClick={revertChanges}
                isDisabled={!libraryDirty}
              >
                Revert
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem alignment={{ default: "alignRight" }}>
            <Link href="/preferences" style={{ color: "var(--pf-v6-global--link--Color)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Preferences
            </Link>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {librarySaveError && (
        <div style={{ ...issueBox("bad"), marginBottom: 12 }}>{librarySaveError}</div>
      )}

      <div className="no-print" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Title headingLevel="h2" size="lg">Practice document</Title>
          <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Button
              variant={editorMode === "wysiwyg" ? "primary" : "secondary"}
              onClick={() => {
                if (editorMode === "json" && !commitJsonDraft()) return;
                if (editorMode === "yaml" && !commitYamlDraft()) return;
                setEditorMode("wysiwyg");
              }}
            >
              WYSIWYG
            </Button>
            <Button
              variant={editorMode === "yaml" ? "primary" : "secondary"}
              onClick={() => {
                if (editorMode === "json" && !commitJsonDraft()) return;
                if (editorMode === "wysiwyg") {
                  const yamlResult = jsonToYaml(doc);
                  if (yamlResult.ok) {
                    setYamlDraft(yamlResult.yaml);
                    setYamlDraftError(null);
                  } else {
                    setYamlDraftError(yamlResult.error);
                    return;
                  }
                }
                setEditorMode("yaml");
              }}
            >
              YAML
            </Button>
            <Button
              variant={editorMode === "json" ? "primary" : "secondary"}
              onClick={() => {
                if (editorMode === "yaml" && !commitYamlDraft()) return;
                if (editorMode === "wysiwyg") {
                  setJsonDraft(JSON.stringify(doc, null, 2));
                  setJsonDraftError(null);
                }
                setEditorMode("json");
              }}
            >
              JSON
            </Button>
            {editorMode === "json" ? (
              <Button variant="primary" onClick={() => commitJsonDraft()}>
                Apply JSON
              </Button>
            ) : null}
            {editorMode === "yaml" ? (
              <Button variant="primary" onClick={() => commitYamlDraft()}>
                Apply YAML
              </Button>
            ) : null}
          </div>
        </div>

        {editorMode === "wysiwyg" ? (
          <div style={{
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <WysiwygEditor
              doc={doc}
              onChange={(next) => {
                setDoc(next);
                if (libraryId) setLibraryDirty(true);
                void runValidation(next);
              }}
              kind={kind}
              onKindChange={setKind}
              lockDocumentKind={isLibrarySession}
              resolvedBaseline={resolvedBaseline}
              elementSourceMap={elementSourceMap}
              dependencies={dependencies}
              libraryBodies={libraryBodies}
            />
          </div>
        ) : editorMode === "yaml" ? (
          <>
            <div style={{ minHeight: "600px" }}>
              <YamlEditor
                value={yamlDraft}
                onChange={(val) => {
                  setYamlDraft(val);
                  setYamlDraftError(null);
                  if (libraryId) setLibraryDirty(true);
                }}
                height="800px"
              />
            </div>
            {yamlDraftError ? (
              <div style={{ ...issueBox("bad"), marginTop: 8 }}>{yamlDraftError}</div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ minHeight: "600px" }}>
              <JsonEditor
                value={jsonDraft}
                onChange={(val) => {
                  setJsonDraft(val);
                  setJsonDraftError(null);
                  if (libraryId) setLibraryDirty(true);
                }}
                height="800px"
              />
            </div>
            {jsonDraftError ? (
              <div style={{ ...issueBox("bad"), marginTop: 8 }}>{jsonDraftError}</div>
            ) : null}
          </>
        )}
          {(validationIssues.length > 0 || refIssues.length > 0) && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {validationIssues.length > 0 && (
                <div style={issueBox("bad")}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.schemaIssuesTitle}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {validationIssues.slice(0, 8).map((i, idx) => {
                      const formatted = formatValidationIssue(i, doc);
                      return (
                        <div key={idx} style={{ paddingLeft: 12, borderLeft: "3px solid rgba(251,113,133,0.6)" }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{formatted.summary}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)", fontFamily: "monospace" }}>
                            {formatted.detail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {validationIssues.length > 8 && (
                    <div style={{ marginTop: 8, fontSize: "0.875rem", fontStyle: "italic", color: "var(--pf-v6-global--Color--200)" }}>
                      ...and {validationIssues.length - 8} more issue{validationIssues.length - 8 !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
              {refIssues.length > 0 && (
                <div style={issueBox("warn")}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.refIssuesTitle}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {refIssues.slice(0, 8).map((i: any, idx: number) => {
                      const formatted = formatRefIssue(i);
                      return (
                        <div key={idx} style={{ paddingLeft: 12, borderLeft: "3px solid rgba(251,191,36,0.6)" }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{formatted.summary}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-v6-global--Color--200)" }}>
                            {formatted.detail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {refIssues.length > 8 && (
                    <div style={{ marginTop: 8, fontSize: "0.875rem", fontStyle: "italic", color: "var(--pf-v6-global--Color--200)" }}>
                      ...and {refIssues.length - 8} more issue{refIssues.length - 8 !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </div>

    </PageSection>
  );
}


export default function PracticeAuthorPage() {
  return (
    <Suspense
      fallback={
        <PageSection>
          <Content component={ContentVariants.p}>Loading…</Content>
        </PageSection>
      }
    >
      <PracticeAuthorPageInner />
    </Suspense>
  );
}

