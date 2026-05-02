import type { BrowseDependencyArtifact } from "@/lib/library/practiceDependencyResolution";

export const RESOLVE_PRACTICE_FOR_RENDER_PATH = "/api/documents/resolve-for-render";

export type ResolvePracticeForRenderJson = {
  resolved?: unknown;
  dependencyArtifacts?: BrowseDependencyArtifact[];
  error?: string;
};

export type FetchResolvePracticeForRenderResult = {
  ok: boolean;
  status: number;
  resolved?: unknown;
  dependencyArtifacts: BrowseDependencyArtifact[];
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
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        dependencyArtifacts,
        error: typeof j?.error === "string" ? j.error : `Library merge failed (${res.status}).`,
      };
    }
    return {
      ok: true,
      status: res.status,
      resolved: j && "resolved" in j ? j.resolved : undefined,
      dependencyArtifacts,
      error: typeof j?.error === "string" ? j.error : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      dependencyArtifacts: emptyArtifacts,
      error: e instanceof Error ? e.message : "Library merge failed.",
    };
  }
}
