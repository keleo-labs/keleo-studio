import { classifyLibraryRoot } from "@/lib/library/classify";
import type { Method, Practice, PracticeBaseline } from "@/lib/types";

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

/** Baseline JSON suitable for {@link Method.baselinePractice} (from a baseline doc or a method doc). */
export function baselineForMethodFromLibraryBody(body: unknown): PracticeBaseline | null {
  if (!body || typeof body !== "object") return null;
  const root = classifyLibraryRoot(body);
  if (root === "baselinePractice") return clone(body as PracticeBaseline);
  if (root === "method") {
    const m = body as Method;
    if (m.baselinePractice && typeof m.baselinePractice === "object") return clone(m.baselinePractice);
  }
  return null;
}

/** Practice JSON suitable for {@link Method.practices} (extension practice only). */
export function practiceForMethodFromLibraryBody(body: unknown): Practice | null {
  if (!body || typeof body !== "object") return null;
  const root = classifyLibraryRoot(body);
  if (root !== "practice") return null;
  return clone(body as Practice);
}

/** Align extension practice symbolic baseline link with the method baseline name. */
export function practiceWithBaselineName(practice: Practice, baselineName: string): Practice {
  if (practice.baselinePracticeName === baselineName) return practice;
  return { ...practice, baselinePracticeName: baselineName };
}

/** Full method document from library JSON (root Method shape only). */
export function methodFromLibraryBody(body: unknown): Method | null {
  if (!body || typeof body !== "object") return null;
  if (classifyLibraryRoot(body) !== "method") return null;
  const m = body as Method;
  if (!m.baselinePractice || typeof m.baselinePractice !== "object") return null;
  return clone(m);
}

/** When the library body is a Method, embed its kernel baseline and carry over its extension practice layers. */
export function methodBaselineBundleFromLibraryBody(body: unknown): {
  baseline: PracticeBaseline;
  practices: Practice[];
} | null {
  const m = methodFromLibraryBody(body);
  if (!m) return null;
  return {
    baseline: m.baselinePractice,
    practices: Array.isArray(m.practices) ? m.practices : [],
  };
}
