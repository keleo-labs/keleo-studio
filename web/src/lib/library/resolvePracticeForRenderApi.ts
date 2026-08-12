import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";
import type { VersionWarning } from "@/lib/library/dependencyVersionCheck";

export const RESOLVE_PRACTICE_FOR_RENDER_PATH = "/api/documents/resolve-for-render";

export type ResolvePracticeForRenderJson = {
  resolved?: unknown;
  dependencyArtifacts?: BrowseDependencyArtifact[];
  versionWarnings?: VersionWarning[];
  schemaWarning?: string;
  error?: string;
};

export type FetchResolvePracticeForRenderResult = {
  ok: boolean;
  status: number;
  resolved?: unknown;
  dependencyArtifacts: BrowseDependencyArtifact[];
  versionWarnings: VersionWarning[];
  schemaWarning?: string;
  error?: string;
};

/**
 * POST {@link RESOLVE_PRACTICE_FOR_RENDER_PATH} — merges baseline + dependency practices from the library
 * (same as method merge) and returns browsable dependency artifacts.
 */
export async function fetchResolvePracticeForRender(doc: unknown): Promise<FetchResolvePracticeForRenderResult> {
  const emptyArtifacts: BrowseDependencyArtifact[] = [];
  try {
    const res = await fetch(RESOLVE_PRACTICE_FOR_RENDER_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doc }),
    });
    const j = (await res.json().catch(() => null)) as ResolvePracticeForRenderJson | null;
    const dependencyArtifacts = Array.isArray(j?.dependencyArtifacts) ? j!.dependencyArtifacts! : emptyArtifacts;
    const versionWarnings = Array.isArray(j?.versionWarnings) ? j!.versionWarnings! : [];
    const schemaWarning = typeof j?.schemaWarning === "string" ? j.schemaWarning : undefined;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        dependencyArtifacts,
        versionWarnings,
        schemaWarning,
        error: typeof j?.error === "string" ? j.error : `Library merge failed (${res.status}).`,
      };
    }
    return {
      ok: true,
      status: res.status,
      resolved: j && "resolved" in j ? j.resolved : undefined,
      dependencyArtifacts,
      versionWarnings,
      schemaWarning,
      error: typeof j?.error === "string" ? j.error : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      dependencyArtifacts: emptyArtifacts,
      versionWarnings: [],
      error: e instanceof Error ? e.message : "Library merge failed.",
    };
  }
}
