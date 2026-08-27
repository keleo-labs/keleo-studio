import type { Method, Practice, PracticeBaseline, PackageDocumentMeta } from "@/lib/types";
import { classifyLibraryRoot, associatedBaselineName, type LibraryRootKind } from "./classify";
import { libraryDocumentTags, type LibraryDocumentTags } from "./libraryDocumentTags";
import { listVirtualElementFiles } from "./virtualElementFiles";
import type { BundleDocumentRef, BundleDocumentMeta, BundleDocumentWithBody } from "@/lib/storage/bundleStoreTypes";
import { WORKSPACE_BUNDLE_SLUG } from "@/lib/storage/bundleStoreTypes";
import type { LibraryLookupIndex } from "./practiceDependencyResolution";
import { coerce, compare, satisfies } from "semver";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LibraryEntry = {
  name: string;
  documentType: LibraryRootKind;
  versions: BundleDocumentRef[];
  activeRef: BundleDocumentRef;
  description: string;
  tags: LibraryDocumentTags;
  keywords: string[];
  elementCount: number;
  associatedBaselineName: string | null;
  updatedAt: string;
  createdAt: string;
};

export type BundleLibraryIndex = {
  entries: Map<string, LibraryEntry>;
  bundles: Array<{ slug: string; name: string; version: string; description: string; documentCount: number }>;
  builtAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function extractKeywords(body: Record<string, unknown>): string[] {
  const raw = body.keywords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string" && k.trim() !== "").map(k => k.trim());
}

/** Compare two semver strings (coercing short forms). Higher version sorts first. */
function semverDescending(a: string, b: string): number {
  const ca = coerce(a);
  const cb = coerce(b);
  if (!ca && !cb) return a.localeCompare(b);
  if (!ca) return 1;
  if (!cb) return -1;
  return compare(cb, ca);
}

/**
 * Structural richness heuristic for baselines — reuses the concept from
 * practiceDependencyResolution without importing a private function.
 */
function baselineRichness(body: Record<string, unknown>): number {
  let score = 0;
  const countArray = (key: string) => {
    const arr = body[key];
    if (Array.isArray(arr)) score += arr.length;
  };
  countArray("alphas");
  countArray("focuses");
  countArray("activitySpaces");
  countArray("competencies");
  return score;
}

// ---------------------------------------------------------------------------
// Pre-compute metadata from a document body (stored in manifest)
// ---------------------------------------------------------------------------

export function computeDocumentMeta(body: Record<string, unknown>): PackageDocumentMeta {
  return {
    documentVersion: extractString(body, "version") || "0.0.0",
    description: extractString(body, "description"),
    tags: libraryDocumentTags(body),
    keywords: extractKeywords(body),
    elementCount: listVirtualElementFiles(body).length,
    associatedBaselineName: associatedBaselineName(body),
    updatedAt: extractString(body, "updatedAt"),
    createdAt: extractString(body, "createdAt"),
  };
}

// ---------------------------------------------------------------------------
// Index builder
// ---------------------------------------------------------------------------

function shouldReplaceMeta(
  existing: BundleDocumentMeta,
  candidate: BundleDocumentMeta,
): boolean {
  if (candidate.isWorkspaceOverride && !existing.isWorkspaceOverride) return true;
  if (!candidate.isWorkspaceOverride && existing.isWorkspaceOverride) return false;

  const existingIsBaseline = existing.documentType === "baselinePractice";
  const candidateIsBaseline = candidate.documentType === "baselinePractice";
  if (candidateIsBaseline && !existingIsBaseline) return true;
  if (!candidateIsBaseline && existingIsBaseline) return false;

  if (existingIsBaseline && candidateIsBaseline) {
    return candidate.elementCount > existing.elementCount;
  }

  return false;
}

/**
 * Build a version-aware library index from pre-computed document metadata.
 * No document bodies are read — all metadata comes from bundle manifests.
 */
export function buildBundleLibraryIndexFromMeta(
  documents: BundleDocumentMeta[],
  bundles: BundleLibraryIndex["bundles"],
): BundleLibraryIndex {
  const entriesByKey = new Map<string, Map<string, BundleDocumentMeta>>();

  for (const doc of documents) {
    const nameKey = normalizeKey(doc.documentName);
    if (!nameKey) continue;

    let versionMap = entriesByKey.get(nameKey);
    if (!versionMap) {
      versionMap = new Map();
      entriesByKey.set(nameKey, versionMap);
    }

    const versionKey = doc.documentVersion;
    const existing = versionMap.get(versionKey);

    if (existing) {
      if (shouldReplaceMeta(existing, doc)) {
        versionMap.set(versionKey, doc);
      }
    } else {
      versionMap.set(versionKey, doc);
    }
  }

  const entries = new Map<string, LibraryEntry>();

  for (const [nameKey, versionMap] of entriesByKey) {
    const versions = [...versionMap.values()];
    versions.sort((a, b) => semverDescending(a.documentVersion, b.documentVersion));

    const active = versions[0];

    const entry: LibraryEntry = {
      name: active.documentName,
      documentType: active.documentType,
      versions: versions.map(v => ({
        bundleSlug: v.bundleSlug,
        documentPath: v.documentPath,
        documentName: v.documentName,
        documentType: v.documentType,
        documentVersion: v.documentVersion,
        isWorkspaceOverride: v.isWorkspaceOverride,
      })),
      activeRef: {
        bundleSlug: active.bundleSlug,
        documentPath: active.documentPath,
        documentName: active.documentName,
        documentType: active.documentType,
        documentVersion: active.documentVersion,
        isWorkspaceOverride: active.isWorkspaceOverride,
      },
      description: active.description,
      tags: active.tags,
      keywords: active.keywords,
      elementCount: active.elementCount,
      associatedBaselineName: active.associatedBaselineName,
      updatedAt: active.updatedAt,
      createdAt: active.createdAt,
    };

    entries.set(nameKey, entry);
  }

  return {
    entries,
    bundles,
    builtAt: new Date().toISOString(),
  };
}

/**
 * Build a version-aware library index from all documents across all bundles.
 * Falls back to reading full bodies — prefer buildBundleLibraryIndexFromMeta.
 */
export function buildBundleLibraryIndex(
  documents: BundleDocumentWithBody[],
  bundles: BundleLibraryIndex["bundles"],
): BundleLibraryIndex {
  const metas: BundleDocumentMeta[] = documents.map(doc => ({
    bundleSlug: doc.bundleSlug,
    documentPath: doc.documentPath,
    documentName: doc.documentName,
    documentType: doc.documentType,
    documentVersion: doc.documentVersion,
    isWorkspaceOverride: doc.isWorkspaceOverride,
    ...computeDocumentMeta(doc.body),
  }));

  return buildBundleLibraryIndexFromMeta(metas, bundles);
}

// ---------------------------------------------------------------------------
// Adapter: BundleLibraryIndex → LibraryLookupIndex
// ---------------------------------------------------------------------------

/**
 * Convert the multi-version BundleLibraryIndex into the existing single-version
 * LibraryLookupIndex that all resolution code expects.
 *
 * Optional `versionOverrides` pins specific document names to specific versions
 * (e.g., when a method declares `dependencyVersions`).
 */
export function buildLibraryLookupIndexFromBundleIndex(
  bundleIndex: BundleLibraryIndex,
  versionOverrides?: Map<string, string>,
  getBundleDocument?: (bundleSlug: string, documentPath: string) => Record<string, unknown> | null,
): LibraryLookupIndex {
  const baselineByName = new Map<string, PracticeBaseline>();
  const standaloneBaselinePracticeKeys = new Set<string>();
  const practiceByName = new Map<string, Practice>();
  const methods: Method[] = [];

  // When called without document bodies pre-loaded, we need them.
  // This version works with bodies extracted during index building.
  // For a full implementation with lazy loading, pass getBundleDocument.

  for (const [, entry] of bundleIndex.entries) {
    const targetRef = selectVersion(entry, versionOverrides);
    if (!targetRef) continue;

    // We need the body to build the lookup index.
    // For now, this adapter requires bodies to be available in a pre-loaded cache.
    // The caller should populate bodiesByRef before calling.
  }

  return { baselineByName, standaloneBaselinePracticeKeys, practiceByName, methods };
}

/**
 * Build a LibraryLookupIndex from a BundleLibraryIndex and pre-loaded document bodies.
 * This is the primary adapter used by the resolution pipeline.
 */
export function buildLibraryLookupIndexWithBodies(
  bundleIndex: BundleLibraryIndex,
  bodiesByRef: Map<string, Record<string, unknown>>,
  versionOverrides?: Map<string, string>,
): LibraryLookupIndex {
  const baselineByName = new Map<string, PracticeBaseline>();
  const standaloneBaselinePracticeKeys = new Set<string>();
  const practiceByName = new Map<string, Practice>();
  const methods: Method[] = [];

  for (const [, entry] of bundleIndex.entries) {
    const targetRef = selectVersion(entry, versionOverrides);
    if (!targetRef) continue;

    const refKey = `${targetRef.bundleSlug}:${targetRef.documentPath}`;
    const body = bodiesByRef.get(refKey);
    if (!body) continue;

    const kind = classifyLibraryRoot(body);

    if (kind === "baselinePractice") {
      const b = body as unknown as PracticeBaseline;
      const n = String(b.name ?? "").trim();
      if (!n) continue;
      standaloneBaselinePracticeKeys.add(n);
      const existing = baselineByName.get(n);
      if (!existing || baselineRichness(body) > baselineRichness(existing as unknown as Record<string, unknown>)) {
        baselineByName.set(n, b);
      }
    } else if (kind === "practice") {
      const p = body as unknown as Practice;
      const n = String(p.name ?? "").trim();
      if (n && !practiceByName.has(n)) {
        practiceByName.set(n, p);
      }
    } else if (kind === "method") {
      const m = body as unknown as Method;
      methods.push(m);
      const bp = m.baselinePractice;
      const bn = String(bp?.name ?? "").trim();
      if (bn && !standaloneBaselinePracticeKeys.has(bn)) {
        baselineByName.set(bn, bp as PracticeBaseline);
      }
      const plist = Array.isArray(m.practices) ? m.practices : [];
      for (const pr of plist) {
        const pn = String((pr as Practice)?.name ?? "").trim();
        if (pn && !practiceByName.has(pn)) {
          practiceByName.set(pn, pr as Practice);
        }
      }
    }
  }

  return { baselineByName, standaloneBaselinePracticeKeys, practiceByName, methods };
}

function selectVersion(
  entry: LibraryEntry,
  versionOverrides?: Map<string, string>,
): BundleDocumentRef | null {
  if (!entry.versions.length) return null;

  if (versionOverrides) {
    const requested = versionOverrides.get(entry.name);
    if (requested) {
      const match = entry.versions.find(v => {
        const cv = coerce(v.documentVersion);
        return cv ? satisfies(cv, requested) : v.documentVersion === requested;
      });
      if (match) return match;
    }
  }

  // Default: active ref (highest version or workspace override)
  return entry.activeRef;
}

// ---------------------------------------------------------------------------
// Serialization (for API responses)
// ---------------------------------------------------------------------------

export type SerializedLibraryEntry = {
  name: string;
  documentType: LibraryRootKind;
  description: string;
  tags: LibraryDocumentTags;
  keywords: string[];
  elementCount: number;
  activeVersion: string;
  activeBundleSlug: string;
  activeDocumentPath: string;
  associatedBaselineName: string | null;
  updatedAt: string;
  createdAt: string;
  versions: Array<{
    version: string;
    bundleSlug: string;
    documentPath: string;
    isWorkspaceOverride: boolean;
  }>;
};

export type SerializedBundleLibraryIndex = {
  entries: SerializedLibraryEntry[];
  bundles: BundleLibraryIndex["bundles"];
  builtAt: string;
};

export function serializeBundleLibraryIndex(index: BundleLibraryIndex): SerializedBundleLibraryIndex {
  const entries: SerializedLibraryEntry[] = [];

  for (const [, entry] of index.entries) {
    entries.push({
      name: entry.name,
      documentType: entry.documentType,
      description: entry.description,
      tags: entry.tags,
      keywords: entry.keywords,
      elementCount: entry.elementCount,
      activeVersion: entry.activeRef.documentVersion,
      activeBundleSlug: entry.activeRef.bundleSlug,
      activeDocumentPath: entry.activeRef.documentPath,
      associatedBaselineName: entry.associatedBaselineName,
      updatedAt: entry.updatedAt,
      createdAt: entry.createdAt,
      versions: entry.versions.map(v => ({
        version: v.documentVersion,
        bundleSlug: v.bundleSlug,
        documentPath: v.documentPath,
        isWorkspaceOverride: v.isWorkspaceOverride,
      })),
    });
  }

  // Sort entries by name for stable output
  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    bundles: index.bundles,
    builtAt: index.builtAt,
  };
}
