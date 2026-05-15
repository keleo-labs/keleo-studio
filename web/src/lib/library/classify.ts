import type { JsonDocumentKind } from "@/lib/storage/types";

/** Top-level shape of a stored JSON artifact in the library tree. */
export type LibraryRootKind = "method" | "baselinePractice" | "practice" | "unknown";

/** Maps document shape to the persisted {@link JsonDocumentKind} for POST /api/documents. */
export function storageKindForBody(body: unknown): JsonDocumentKind {
  const root = classifyLibraryRoot(body);
  if (root === "method") return "method";
  if (root === "practice") return "practice";
  return "upload";
}

function hasNonemptyPracticeDependencies(o: Record<string, unknown>): boolean {
  const raw = o.practiceDependencyNames;
  if (!Array.isArray(raw)) return false;
  return raw.some((x) => typeof x === "string" && String(x).trim() !== "");
}

/**
 * Kernel-shaped aggregates (both `alphas` and `focuses` populated) classify as `{@link LibraryRootKind} "baselinePractice"`
 * when they do not compose named dependency practices (`practiceDependencyNames`), even if `baselinePracticeName` leaked
 * from tooling interchange. Compose shells (thin extensions) list deps and/or omit one of those arrays → `"practice"`.
 *
 * **Method discriminators (schema 2020-12):** A document is a Method if it has ANY of:
 * - `baselinePractice` (object) - embedded baseline format
 * - `baselinePracticeName` (string) at method level - baseline reference format
 * - `practices` (array) - full practice objects format
 * - `practiceNames` (array of strings) - string reference format
 */
export function classifyLibraryRoot(body: unknown): LibraryRootKind {
  if (!body || typeof body !== "object") return "unknown";
  const o = body as Record<string, unknown>;

  // Method detection: check for discriminating properties
  // A Method has either baselinePractice (object/string), practices (array), or practiceNames (array)
  if (o.baselinePractice && typeof o.baselinePractice === "object") return "method";
  if (Array.isArray(o.practices) && o.practices.length > 0) return "method";
  if (Array.isArray(o.practiceNames) && o.practiceNames.length > 0) return "method";

  // Method-level baselinePracticeName (with practices array, distinguishes from Practice-level)
  if (typeof o.baselinePracticeName === "string" && String(o.baselinePracticeName).trim() && Array.isArray(o.practices)) {
    return "method";
  }

  // Check for extension practice FIRST (baselinePracticeName is a strong indicator)
  // Extension practices can define their own alphas/focuses to add or override baseline elements
  if (typeof o.baselinePracticeName === "string" && String(o.baselinePracticeName).trim()) return "practice";

  const alphaList = Array.isArray(o.alphas) ? o.alphas : [];
  const focusList = Array.isArray(o.focuses) ? o.focuses : [];
  const hasKernelSlices = alphaList.length > 0 && focusList.length > 0;

  if (hasKernelSlices && !hasNonemptyPracticeDependencies(o)) {
    return "baselinePractice";
  }

  if (Array.isArray(o.alphas) && Array.isArray(o.focuses)) return "baselinePractice";
  return "unknown";
}

/**
 * True for a persisted baseline kernel document (standalone PracticeBaseline artifact).
 * Extension practices, methods, and merged composites classify as baseline-shaped for rendering but must not show
 * the narrative spine catalog: merged docs set {@link mergesBaselinePracticeName}; extension practices set
 * `baselinePracticeName`.
 */
export function isStandaloneBaselinePracticeArtifact(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  // Exclude Methods (embedded or referenced baseline)
  if (o.baselinePractice && typeof o.baselinePractice === "object") return false;
  if (Array.isArray(o.practices) && o.practices.length > 0) return false;

  const merges =
    typeof o.mergesBaselinePracticeName === "string" ? String(o.mergesBaselinePracticeName).trim() : "";
  if (merges) return false;
  const alphaList = Array.isArray(o.alphas) ? o.alphas : [];
  const focusList = Array.isArray(o.focuses) ? o.focuses : [];
  return alphaList.length > 0 && focusList.length > 0 && !hasNonemptyPracticeDependencies(o);
}

/**
 * Baseline name to show for “extends …” on a document that may be a thin extension (`baselinePracticeName`)
 * or a merged composite from a method (`mergesBaselinePracticeName`).
 */
export function extendsBaselineDisplayName(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const m = o.mergesBaselinePracticeName;
  if (typeof m === "string" && m.trim()) return m.trim();
  const b = o.baselinePracticeName;
  if (typeof b === "string" && b.trim()) return b.trim();
  return null;
}

export function baselineNameForPracticeLink(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const root = classifyLibraryRoot(body);
  const o = body as Record<string, unknown>;
  if (root === "baselinePractice") {
    const n = o.name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  }
  if (root === "method") {
    // Check for embedded baseline first
    const bp = o.baselinePractice;
    if (bp && typeof bp === "object") {
      const n = (bp as Record<string, unknown>).name;
      return typeof n === "string" && n.trim() ? n.trim() : null;
    }
    // Check for baseline name reference
    const bpName = o.baselinePracticeName;
    if (typeof bpName === "string" && bpName.trim()) {
      return bpName.trim();
    }
  }
  return null;
}

/**
 * Symbolic {@link Practice}.`name` for `practiceDependencyNames` (extension practice references).
 */
export function practiceNameForDependencyLink(body: unknown): string | null {
  if (classifyLibraryRoot(body) !== "practice") return null;
  const n = (body as Record<string, unknown>).name;
  return typeof n === "string" && n.trim() ? n.trim() : null;
}

/** Pseudo-extension for the root document row (e.g. <name>.baseline). */
export function rootKindExtension(kind: LibraryRootKind): string {
  switch (kind) {
    case "method":
      return "method";
    case "baselinePractice":
      return "baseline";
    case "practice":
      return "practice";
    default:
      return "json";
  }
}

export function displayNameForBody(body: unknown, fallbackTitle: string): string {
  if (body && typeof body === "object") {
    const n = (body as Record<string, unknown>).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  const t = fallbackTitle?.trim();
  return t || "Untitled";
}
