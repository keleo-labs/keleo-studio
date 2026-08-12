import { satisfies, coerce } from "semver";
import type { DocumentVersionConstraint } from "@/lib/types";
import type { LibraryLookupIndex } from "./practiceDependencyResolution";
import { findBaselineInLibrary, findPracticeInLibrary } from "./practiceDependencyResolution";

export type VersionWarning = {
  documentName: string;
  declaredRange: string;
  actualVersion: string;
  kind: "mismatch" | "orphan";
  message: string;
};

function normalizeSemver(version: string): string | null {
  const c = coerce(version);
  return c ? c.version : null;
}

export function checkDependencyVersionConstraints(
  constraints: DocumentVersionConstraint[],
  resolvedDeps: Map<string, string | undefined>,
): VersionWarning[] {
  const warnings: VersionWarning[] = [];

  for (const constraint of constraints) {
    const depVersion = resolvedDeps.get(constraint.documentName);

    if (depVersion === undefined && !resolvedDeps.has(constraint.documentName)) {
      warnings.push({
        documentName: constraint.documentName,
        declaredRange: constraint.versionRange,
        actualVersion: "",
        kind: "orphan",
        message: `Version constraint for "${constraint.documentName}" does not match any declared dependency.`,
      });
      continue;
    }

    if (!depVersion) continue;

    const normalized = normalizeSemver(depVersion);
    if (!normalized) continue;

    if (!satisfies(normalized, constraint.versionRange)) {
      warnings.push({
        documentName: constraint.documentName,
        declaredRange: constraint.versionRange,
        actualVersion: depVersion,
        kind: "mismatch",
        message: `"${constraint.documentName}" version ${depVersion} does not satisfy required range ${constraint.versionRange}.`,
      });
    }
  }

  return warnings;
}

export function collectDependencyVersionWarnings(
  doc: unknown,
  index: LibraryLookupIndex,
): VersionWarning[] {
  if (!doc || typeof doc !== "object") return [];
  const d = doc as Record<string, unknown>;

  const constraints = Array.isArray(d.dependencyVersions)
    ? (d.dependencyVersions as DocumentVersionConstraint[]).filter(
        (c) => c && typeof c.documentName === "string" && typeof c.versionRange === "string",
      )
    : [];

  if (constraints.length === 0) return [];

  const declaredDepNames = new Set<string>();

  if (typeof d.baselinePracticeName === "string" && d.baselinePracticeName.trim()) {
    declaredDepNames.add(d.baselinePracticeName.trim());
  }
  if (Array.isArray(d.practiceDependencyNames)) {
    for (const n of d.practiceDependencyNames) {
      if (typeof n === "string" && n.trim()) declaredDepNames.add(n.trim());
    }
  }
  if (Array.isArray(d.practiceNames)) {
    for (const n of d.practiceNames) {
      if (typeof n === "string" && n.trim()) declaredDepNames.add(n.trim());
    }
  }
  if (typeof d.practiceName === "string" && d.practiceName.trim()) {
    declaredDepNames.add(d.practiceName.trim());
  }
  if (typeof d.methodName === "string" && d.methodName.trim()) {
    declaredDepNames.add(d.methodName.trim());
  }
  if (Array.isArray(d.baselinePracticeNames)) {
    for (const n of d.baselinePracticeNames) {
      if (typeof n === "string" && n.trim()) declaredDepNames.add(n.trim());
    }
  }

  const resolvedDeps = new Map<string, string | undefined>();
  for (const name of declaredDepNames) {
    const baseline = findBaselineInLibrary(index, name);
    if (baseline) {
      resolvedDeps.set(name, (baseline as Record<string, unknown>).version as string | undefined);
      continue;
    }
    const practice = findPracticeInLibrary(index, name);
    if (practice) {
      resolvedDeps.set(name, practice.version);
      continue;
    }
    resolvedDeps.set(name, undefined);
  }

  return checkDependencyVersionConstraints(constraints, resolvedDeps);
}
