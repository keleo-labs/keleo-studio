"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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
} from "@patternfly/react-core";
import { validateAgainstSchema } from "@/lib/core/validate";
import { displayNameForBody } from "@/lib/library/classify";
import { emptyProject } from "@/lib/data/practiceFormDefaults";
import { JsonEditor } from "@/components/editors/JsonEditor";
import { YamlEditor } from "@/components/editors/YamlEditor";
import { ProjectEditor } from "@/components/editors/ProjectEditor";
import { yamlToJson, jsonToYaml } from "@/lib/converters/yaml-json-converter";
import { formatValidationIssue } from "@/lib/core/errorFormatting";

function issueBox(kind: "bad" | "warn"): React.CSSProperties {
  return {
    border: `1px solid ${kind === "bad" ? "rgba(251,113,133,0.6)" : "rgba(251,191,36,0.5)"}`,
    background: kind === "bad" ? "rgba(251,113,133,0.12)" : "rgba(251,191,36,0.10)",
    borderRadius: 8,
    padding: 12,
    color: "var(--text)",
  };
}

type LibraryDocInfo = {
  id: string;
  displayName: string;
  libraryRootKind: string;
  body?: unknown;
};

function ProjectManagerPageInner() {
  const [mounted, setMounted] = useState(false);
  const [doc, setDoc] = useState<Record<string, unknown>>(() => emptyProject());
  const [originalDoc, setOriginalDoc] = useState<Record<string, unknown>>(() => emptyProject());
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "yaml" | "json">("wysiwyg");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonDraftError, setJsonDraftError] = useState<string | null>(null);
  const [yamlDraft, setYamlDraft] = useState("");
  const [yamlDraftError, setYamlDraftError] = useState<string | null>(null);
  const [libraryDirty, setLibraryDirty] = useState(false);
  const [librarySaveBusy, setLibrarySaveBusy] = useState(false);
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ path: string; message: string }[]>([]);
  const [libraryDocuments, setLibraryDocuments] = useState<LibraryDocInfo[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const libraryId = searchParams.get("libraryId");
  const isLibrarySession = Boolean(libraryId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch library documents for practice/method selector and resolution
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/documents?details=1");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const docs = Array.isArray(data.documents) ? data.documents : [];
        setLibraryDocuments(
          docs
            .filter((d: any) => d.kind !== "dashboard-config" && d.kind !== "project")
            .map((d: any) => ({
              id: d.id,
              displayName: d.displayName || d.title || "Untitled",
              libraryRootKind: d.libraryRootKind || "unknown",
            }))
        );
      } catch (e) {
        console.error("Failed to load library documents:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runValidation = useCallback(async (parsed: unknown) => {
    const result = await validateAgainstSchema(parsed);
    setValidationIssues(!result.ok ? result.issues : !result.relaxedOk ? result.relaxedIssues : []);
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
    if (editorMode === "yaml") {
      const result = yamlToJson(yamlDraft);
      if (!result.ok) {
        setLibrarySaveError(result.error);
        return null;
      }
      if (result.json === null || typeof result.json !== "object" || Array.isArray(result.json)) {
        setLibrarySaveError("Document must be a YAML object.");
        return null;
      }
      return result.json as Record<string, unknown>;
    }
    return doc;
  }, [editorMode, jsonDraft, yamlDraft, doc]);

  const commitJsonDraft = useCallback((): boolean => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonDraftError("Document must be a JSON object.");
        return false;
      }
      const asDoc = parsed as Record<string, unknown>;
      setDoc(asDoc);
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
    if (libraryId) setLibraryDirty(true);
    void runValidation(parsed);
    setYamlDraftError(null);
    return true;
  }, [yamlDraft, libraryId, runValidation]);

  // Load existing project document from library
  useEffect(() => {
    const id = libraryId;
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!cancelled) {
            setValidationIssues([{ path: "", message: `Project document not found (${res.status})` }]);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const parsed = data.body;
        const asDoc = parsed as Record<string, unknown>;
        setDoc(asDoc);
        setOriginalDoc(asDoc);
        setLibraryDirty(false);
        setLibrarySaveError(null);
        setJsonDraft(JSON.stringify(asDoc ?? {}, null, 2));
        setJsonDraftError(null);
        const yamlResult = jsonToYaml(asDoc ?? {});
        if (yamlResult.ok) {
          setYamlDraft(yamlResult.yaml);
          setYamlDraftError(null);
        }
        setEditorMode("wysiwyg");
        await runValidation(parsed);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load project document";
          setValidationIssues([{ path: "", message: msg }]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [libraryId, runValidation]);

  const saveToLibrary = useCallback(async () => {
    const bodyToSave = resolveBodyForSave();
    if (!bodyToSave) return;

    setLibrarySaveBusy(true);
    setLibrarySaveError(null);
    try {
      if (!libraryId) {
        const title = displayNameForBody(bodyToSave, "Project");
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind: "project", body: bodyToSave }),
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
          setLibrarySaveError("Save succeeded but no document ID was returned.");
          return;
        }
        router.replace(`/project-manager?libraryId=${encodeURIComponent(created.id)}`);
        return;
      }

      const res = await fetch(`/api/documents/${encodeURIComponent(libraryId)}`, {
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
      setJsonDraft(JSON.stringify(bodyToSave, null, 2));
      const yamlResult = jsonToYaml(bodyToSave);
      if (yamlResult.ok) {
        setYamlDraft(yamlResult.yaml);
      }
      void runValidation(bodyToSave);
      setLibraryDirty(false);
    } catch (e: unknown) {
      setLibrarySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLibrarySaveBusy(false);
    }
  }, [resolveBodyForSave, libraryId, router, runValidation]);

  const saveAsNewDocument = useCallback(async () => {
    const bodyToSave = resolveBodyForSave();
    if (!bodyToSave) return;

    setLibrarySaveBusy(true);
    setLibrarySaveError(null);
    try {
      const title = displayNameForBody(bodyToSave, "Project");
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind: "project", body: bodyToSave }),
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
        setLibrarySaveError("Save succeeded but no document ID was returned.");
        return;
      }
      router.push(`/project-manager?libraryId=${encodeURIComponent(created.id)}`);
    } catch (e: unknown) {
      setLibrarySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLibrarySaveBusy(false);
    }
  }, [resolveBodyForSave, router]);

  const revertChanges = useCallback(() => {
    if (!window.confirm("Revert all changes to the original document? This cannot be undone.")) return;
    setDoc(originalDoc);
    setJsonDraft(JSON.stringify(originalDoc, null, 2));
    const yamlResult = jsonToYaml(originalDoc);
    if (yamlResult.ok) {
      setYamlDraft(yamlResult.yaml);
      setYamlDraftError(null);
    }
    void runValidation(originalDoc);
    setLibraryDirty(false);
  }, [originalDoc, runValidation]);

  if (!mounted) {
    return (
      <PageSection>
        <div style={{ padding: "24px", textAlign: "center", color: "#6a6e73" }}>
          Loading project manager...
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title headingLevel="h1" size="xl">Project Manager</Title>
        {isLibrarySession && (
          <Content component={ContentVariants.small} style={{ marginTop: 4, color: "var(--pf-v6-global--Color--200)" }}>
            Editing: <strong>{displayNameForBody(doc, "Project")}</strong>
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
        </ToolbarContent>
      </Toolbar>

      {librarySaveError && (
        <div style={{ ...issueBox("bad"), marginBottom: 12 }}>{librarySaveError}</div>
      )}

      <div className="no-print" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Title headingLevel="h2" size="lg">Project document</Title>
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
            {editorMode === "json" && (
              <Button variant="primary" onClick={() => commitJsonDraft()}>Apply JSON</Button>
            )}
            {editorMode === "yaml" && (
              <Button variant="primary" onClick={() => commitYamlDraft()}>Apply YAML</Button>
            )}
          </div>
        </div>

        {editorMode === "wysiwyg" ? (
          <div style={{ display: "flex", gap: 24 }}>
            {/* Main editor area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProjectEditor
                doc={doc}
                onChange={(next) => {
                  setDoc(next);
                  if (libraryId) setLibraryDirty(true);
                  void runValidation(next);
                }}
                libraryDocuments={libraryDocuments}
              />
            </div>
            {/* Sidebar */}
            <div style={{
              width: 280,
              flexShrink: 0,
              position: "sticky",
              top: 16,
              alignSelf: "flex-start",
            }}>
              <ProjectSidebar doc={doc} />
            </div>
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
            {yamlDraftError && <div style={{ ...issueBox("bad"), marginTop: 8 }}>{yamlDraftError}</div>}
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
            {jsonDraftError && <div style={{ ...issueBox("bad"), marginTop: 8 }}>{jsonDraftError}</div>}
          </>
        )}

        {/* Validation issues */}
        {validationIssues.length > 0 && (
          <div style={{ ...issueBox("warn"), marginTop: 16 }}>
            <strong>Validation Issues ({validationIssues.length})</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {validationIssues.slice(0, 20).map((issue, i) => (
                <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                  {formatValidationIssue(issue).summary}
                </li>
              ))}
              {validationIssues.length > 20 && (
                <li style={{ fontStyle: "italic" }}>...and {validationIssues.length - 20} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </PageSection>
  );
}

function ProjectSidebar({ doc }: { doc: Record<string, unknown> }) {
  const name = typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : "(unnamed)";
  const practiceName = typeof doc.practiceName === "string" ? doc.practiceName : "";
  const methodName = typeof doc.methodName === "string" ? doc.methodName : "";
  const linkedTo = practiceName || methodName || "(none)";
  const linkedType = practiceName ? "Practice" : methodName ? "Method" : "";

  const team = doc.team && typeof doc.team === "object" ? doc.team as Record<string, unknown> : null;
  const members = team && Array.isArray(team.members) ? team.members : [];

  const plan = doc.plan && typeof doc.plan === "object" ? doc.plan as Record<string, unknown> : null;
  const pattern = plan?.pattern && typeof plan.pattern === "object" ? plan.pattern as Record<string, unknown> : null;
  const patternViews = pattern && Array.isArray(pattern.patternViews) ? pattern.patternViews : [];

  const current = doc.current && typeof doc.current === "object" ? doc.current as Record<string, unknown> : null;
  const currentAlphas = current && Array.isArray(current.alphaInstances) ? current.alphaInstances : [];
  const currentWPs = current && Array.isArray(current.workProductInstances) ? current.workProductInstances : [];

  const target = doc.target && typeof doc.target === "object" ? doc.target as Record<string, unknown> : null;
  const targetAlphas = target && Array.isArray(target.alphaInstances) ? target.alphaInstances : [];

  const cardStyle: React.CSSProperties = {
    background: "var(--pf-v6-global--BackgroundColor--200, #fafafa)",
    border: "1px solid var(--pf-v6-global--BorderColor--100, #d2d2d2)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--pf-v6-global--Color--200, #6a6e73)",
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--pf-v6-global--Color--100, #151515)",
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--pf-v6-global--Color--100)" }}>
        Project Summary
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Project</div>
        <div style={valueStyle}>{name}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>{linkedType || "Linked To"}</div>
        <div style={valueStyle}>{linkedTo}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Team Members</div>
        <div style={valueStyle}>{members.length}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Plan Phases</div>
        <div style={valueStyle}>{patternViews.length}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Current State</div>
        <div style={{ ...valueStyle, fontSize: 13 }}>
          {currentAlphas.length} alpha{currentAlphas.length !== 1 ? "s" : ""},
          {" "}{currentWPs.length} work product{currentWPs.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Target</div>
        <div style={{ ...valueStyle, fontSize: 13 }}>
          {targetAlphas.length} alpha target{targetAlphas.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

export default function ProjectManagerPage() {
  return (
    <Suspense fallback={<PageSection><div style={{ padding: 24, textAlign: "center", color: "#6a6e73" }}>Loading...</div></PageSection>}>
      <ProjectManagerPageInner />
    </Suspense>
  );
}
