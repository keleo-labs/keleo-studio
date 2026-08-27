import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { classifyLibraryRoot, type LibraryRootKind } from "@/lib/library/classify";
import { computeDocumentMeta } from "@/lib/library/bundleIndex";
import type { PackageManifest } from "@/lib/types";
import type {
  BundleDocumentMeta,
  BundleDocumentRef,
  BundleDocumentWithBody,
  BundleManifestInfo,
  BundleStore,
} from "./bundleStoreTypes";
import { WORKSPACE_BUNDLE_SLUG } from "./bundleStoreTypes";

function defaultBundlesDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "bundles");
}

function bundlesDir(): string {
  return process.env.BUNDLE_STORE_DATA_DIR?.trim() || defaultBundlesDir();
}

function safeName(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safe !== slug || !slug) throw new Error(`Invalid bundle slug: ${slug}`);
  return safe;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureBundlesDir(): Promise<void> {
  await mkdir(bundlesDir(), { recursive: true });
}

async function ensureBundleDir(slug: string): Promise<string> {
  const dir = path.join(bundlesDir(), safeName(slug));
  await mkdir(path.join(dir, "documents"), { recursive: true });
  return dir;
}

function extractString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function parseManifest(raw: string): PackageManifest | null {
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    if (!o.package || typeof o.package !== "object") return null;
    if (!Array.isArray(o.documents)) return null;
    return o as PackageManifest;
  } catch {
    return null;
  }
}

function manifestToInfo(slug: string, manifest: PackageManifest): BundleManifestInfo {
  return {
    slug,
    name: manifest.package.name,
    version: manifest.package.version,
    description: manifest.package.description,
    documentCount: manifest.documents.length,
  };
}

function documentTypeFromString(raw: string): LibraryRootKind {
  const map: Record<string, LibraryRootKind> = {
    practiceBaseline: "baselinePractice",
    practice: "practice",
    method: "method",
    project: "project",
    changeRequest: "changeRequest",
    changeSet: "changeSet",
  };
  return map[raw] ?? "unknown";
}

function extractDocumentVersion(body: Record<string, unknown>): string {
  const v = body.version;
  return typeof v === "string" && v.trim() ? v.trim() : "0.0.0";
}

export function createFileBundleStore(): BundleStore {
  return {
    async listBundles() {
      let entries: string[];
      try {
        entries = await readdir(bundlesDir());
      } catch {
        return [];
      }

      const result: BundleManifestInfo[] = [];
      for (const entry of entries) {
        const manifestPath = path.join(bundlesDir(), entry, "manifest.json");
        let raw: string;
        try {
          raw = await readFile(manifestPath, "utf8");
        } catch {
          continue;
        }
        const manifest = parseManifest(raw);
        if (!manifest) continue;
        result.push(manifestToInfo(entry, manifest));
      }
      return result;
    },

    async getBundleManifest(slug) {
      const manifestPath = path.join(bundlesDir(), safeName(slug), "manifest.json");
      let raw: string;
      try {
        raw = await readFile(manifestPath, "utf8");
      } catch {
        return null;
      }
      return parseManifest(raw);
    },

    async getDocument(bundleSlug, documentPath) {
      const fullPath = path.join(bundlesDir(), safeName(bundleSlug), documentPath);
      let raw: string;
      try {
        raw = await readFile(fullPath, "utf8");
      } catch {
        return null;
      }
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
      } catch {
        return null;
      }
    },

    async importBundle(zipData) {
      const files = unzipSync(zipData);

      const manifestBytes = files["manifest.json"];
      if (!manifestBytes) throw new Error("Invalid .keleo package: missing manifest.json");

      const manifestRaw = new TextDecoder().decode(manifestBytes);
      const manifest = parseManifest(manifestRaw);
      if (!manifest) throw new Error("Invalid .keleo package: malformed manifest.json");

      const slug = slugify(manifest.package.name) || "unnamed-bundle";
      if (slug === WORKSPACE_BUNDLE_SLUG) {
        throw new Error("Cannot import a bundle with the reserved workspace slug");
      }

      const bundleDir = await ensureBundleDir(slug);

      // Write all files to disk
      for (const [filePath, data] of Object.entries(files)) {
        if (filePath === "manifest.json") continue;
        const target = path.join(bundleDir, filePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, data);
      }

      // Compute and persist metadata for each document in the manifest
      for (const docEntry of manifest.documents) {
        if (docEntry.meta) continue;
        try {
          const docRaw = files[docEntry.path];
          if (!docRaw) continue;
          const body = JSON.parse(new TextDecoder().decode(docRaw));
          if (body && typeof body === "object") {
            docEntry.meta = computeDocumentMeta(body);
          }
        } catch {
          // Skip metadata for unparseable documents
        }
      }

      await writeFile(path.join(bundleDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

      return manifestToInfo(slug, manifest);
    },

    async removeBundle(slug) {
      if (slug === WORKSPACE_BUNDLE_SLUG) return false;
      const dir = path.join(bundlesDir(), safeName(slug));
      try {
        await rm(dir, { recursive: true });
        return true;
      } catch {
        return false;
      }
    },

    async saveWorkspaceDocument(documentName, documentType, body) {
      const wsDir = await ensureBundleDir(WORKSPACE_BUNDLE_SLUG);
      const docSlug = slugify(documentName) || "untitled";
      const docPath = `documents/${docSlug}.json`;
      const fullPath = path.join(wsDir, docPath);

      await writeFile(fullPath, JSON.stringify(body, null, 2), "utf8");

      // Update the workspace manifest
      const manifestPath = path.join(wsDir, "manifest.json");
      let manifest: PackageManifest;
      try {
        const raw = await readFile(manifestPath, "utf8");
        const parsed = parseManifest(raw);
        manifest = parsed ?? createWorkspaceManifest();
      } catch {
        manifest = createWorkspaceManifest();
      }

      const mapDocType = (kind: LibraryRootKind): string => {
        if (kind === "baselinePractice") return "practiceBaseline";
        return kind;
      };

      const existing = manifest.documents.findIndex(d => d.documentName === documentName);
      const entry = {
        path: docPath,
        documentType: mapDocType(documentType) as PackageManifest["documents"][number]["documentType"],
        documentName,
        meta: computeDocumentMeta(body),
      };

      if (existing >= 0) {
        manifest.documents[existing] = entry;
      } else {
        manifest.documents.push(entry);
      }

      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    },

    async deleteWorkspaceDocument(documentPath) {
      const wsDir = path.join(bundlesDir(), WORKSPACE_BUNDLE_SLUG);
      const fullPath = path.join(wsDir, documentPath);
      try {
        await rm(fullPath);
      } catch {
        return false;
      }

      // Update the workspace manifest
      const manifestPath = path.join(wsDir, "manifest.json");
      try {
        const raw = await readFile(manifestPath, "utf8");
        const manifest = parseManifest(raw);
        if (manifest) {
          manifest.documents = manifest.documents.filter(d => d.path !== documentPath);
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        }
      } catch {
        // manifest doesn't exist or is malformed — nothing to update
      }

      return true;
    },

    async listAllDocuments() {
      const bundles = await this.listBundles();
      const result: BundleDocumentWithBody[] = [];

      for (const bundle of bundles) {
        const manifest = await this.getBundleManifest(bundle.slug);
        if (!manifest) continue;

        for (const docEntry of manifest.documents) {
          const body = await this.getDocument(bundle.slug, docEntry.path);
          if (!body) continue;

          const documentType = docEntry.documentType
            ? documentTypeFromString(docEntry.documentType)
            : classifyLibraryRoot(body);

          const ref: BundleDocumentRef = {
            bundleSlug: bundle.slug,
            documentPath: docEntry.path,
            documentName: docEntry.documentName || extractString(body, "name"),
            documentType,
            documentVersion: extractDocumentVersion(body),
            isWorkspaceOverride: bundle.slug === WORKSPACE_BUNDLE_SLUG,
          };

          result.push({ ...ref, body });
        }
      }

      return result;
    },

    async listAllDocumentMeta() {
      await ensureBundlesDir();
      let entries: string[];
      try {
        entries = await readdir(bundlesDir());
      } catch {
        return [];
      }

      // Read all manifests in parallel
      const manifestReads = entries.map(async (slug): Promise<{ slug: string; manifest: PackageManifest } | null> => {
        try {
          const raw = await readFile(path.join(bundlesDir(), slug, "manifest.json"), "utf8");
          const manifest = parseManifest(raw);
          return manifest ? { slug, manifest } : null;
        } catch {
          return null;
        }
      });

      const manifests = (await Promise.all(manifestReads)).filter(
        (m): m is { slug: string; manifest: PackageManifest } => m !== null,
      );

      const result: BundleDocumentMeta[] = [];
      const needsBodyRead: Array<{ slug: string; docEntry: PackageManifest["documents"][number]; documentType: LibraryRootKind }> = [];

      for (const { slug, manifest } of manifests) {
        for (const docEntry of manifest.documents) {
          const documentType = docEntry.documentType
            ? documentTypeFromString(docEntry.documentType)
            : ("unknown" as LibraryRootKind);

          if (docEntry.meta) {
            result.push({
              bundleSlug: slug,
              documentPath: docEntry.path,
              documentName: docEntry.documentName,
              documentType,
              documentVersion: docEntry.meta.documentVersion,
              isWorkspaceOverride: slug === WORKSPACE_BUNDLE_SLUG,
              description: docEntry.meta.description,
              tags: docEntry.meta.tags,
              keywords: docEntry.meta.keywords,
              elementCount: docEntry.meta.elementCount,
              associatedBaselineName: docEntry.meta.associatedBaselineName,
              updatedAt: docEntry.meta.updatedAt,
              createdAt: docEntry.meta.createdAt,
            });
          } else {
            needsBodyRead.push({ slug, docEntry, documentType });
          }
        }
      }

      // Fallback: read bodies in parallel for manifests without pre-computed metadata,
      // then backfill the manifest so future calls are fast.
      if (needsBodyRead.length > 0) {
        const bodyReads = needsBodyRead.map(async ({ slug, docEntry, documentType }) => {
          const body = await this.getDocument(slug, docEntry.path);
          if (!body) return null;
          const meta = computeDocumentMeta(body);
          const resolvedType = documentType === ("unknown" as LibraryRootKind)
            ? classifyLibraryRoot(body)
            : documentType;
          docEntry.meta = meta;
          return {
            bundleSlug: slug,
            documentPath: docEntry.path,
            documentName: docEntry.documentName || extractString(body, "name"),
            documentType: resolvedType,
            documentVersion: meta.documentVersion,
            isWorkspaceOverride: slug === WORKSPACE_BUNDLE_SLUG,
            ...meta,
          } as BundleDocumentMeta;
        });

        const resolved = (await Promise.all(bodyReads)).filter(
          (d): d is BundleDocumentMeta => d !== null,
        );
        result.push(...resolved);

        // Persist backfilled metadata into manifests (best-effort, non-blocking)
        const slugsToUpdate = new Set(needsBodyRead.map(n => n.slug));
        for (const { slug, manifest } of manifests) {
          if (!slugsToUpdate.has(slug)) continue;
          const manifestPath = path.join(bundlesDir(), slug, "manifest.json");
          writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8").catch(() => {});
        }
      }

      return result;
    },

    async processInbox() {
      const inboxDir = path.join(bundlesDir(), "..", "inbox");
      let entries: string[];
      try {
        entries = await readdir(inboxDir);
      } catch {
        return 0;
      }

      const files = entries.filter(
        (f) => f.endsWith(".keleo") || f.endsWith(".json"),
      );
      if (files.length === 0) return 0;

      const processedDir = path.join(inboxDir, "processed");
      await mkdir(processedDir, { recursive: true });

      let count = 0;
      for (const file of files) {
        const filePath = path.join(inboxDir, file);
        try {
          if (file.endsWith(".keleo")) {
            const data = await readFile(filePath);
            await this.importBundle(new Uint8Array(data));
          } else {
            const raw = await readFile(filePath, "utf8");
            const parsed = JSON.parse(raw);
            const bodies: Record<string, unknown>[] = Array.isArray(parsed)
              ? parsed.filter(
                  (item): item is Record<string, unknown> =>
                    item !== null && typeof item === "object" && !Array.isArray(item),
                )
              : parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? [parsed as Record<string, unknown>]
                : [];

            for (const body of bodies) {
              const name = extractString(body, "name") || file.replace(/\.json$/i, "");
              const docType = classifyLibraryRoot(body);
              await this.saveWorkspaceDocument(name, docType, body);
            }
          }

          await rename(filePath, path.join(processedDir, file));
          count++;
        } catch (err) {
          console.error(`[inbox] Failed to process ${file}:`, err);
        }
      }

      return count;
    },
  };
}

function createWorkspaceManifest(): PackageManifest {
  return {
    schemaVersion: "2.0.0",
    package: {
      name: WORKSPACE_BUNDLE_SLUG,
      version: "0.0.0",
      description: "User-created and edited documents",
    },
    documents: [],
  };
}
