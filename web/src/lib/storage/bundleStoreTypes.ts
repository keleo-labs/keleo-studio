import type { LibraryRootKind } from "@/lib/library/classify";
import type { LibraryDocumentTags } from "@/lib/library/libraryDocumentTags";
import type { PackageManifest } from "@/lib/types";

/** Summary of an installed bundle (from its manifest). */
export type BundleManifestInfo = {
  slug: string;
  name: string;
  version: string;
  description: string;
  documentCount: number;
};

/** A document reference within a specific bundle. */
export type BundleDocumentRef = {
  bundleSlug: string;
  documentPath: string;
  documentName: string;
  documentType: LibraryRootKind;
  documentVersion: string;
  isWorkspaceOverride: boolean;
};

/** A document reference with pre-computed library metadata (no body needed). */
export type BundleDocumentMeta = BundleDocumentRef & {
  description: string;
  tags: LibraryDocumentTags;
  keywords: string[];
  elementCount: number;
  associatedBaselineName: string | null;
  updatedAt: string;
  createdAt: string;
};

/** A document body together with its bundle location. */
export type BundleDocumentWithBody = BundleDocumentRef & {
  body: Record<string, unknown>;
};

/** The workspace bundle slug — user-created and edited documents. */
export const WORKSPACE_BUNDLE_SLUG = "_workspace";

/**
 * Persistence for bundle-organized practice libraries.
 * Bundles are exploded directories on disk (or MongoDB collections).
 * Swap implementations via JSON_STORE_DRIVER.
 */
export interface BundleStore {
  /** List all installed bundles. */
  listBundles(): Promise<BundleManifestInfo[]>;

  /** Get a bundle's manifest by slug. */
  getBundleManifest(slug: string): Promise<PackageManifest | null>;

  /** Read a single document body from a bundle. */
  getDocument(bundleSlug: string, documentPath: string): Promise<Record<string, unknown> | null>;

  /** Import a .keleo ZIP archive, exploding it into a bundle directory. Returns the new bundle info. */
  importBundle(zipData: Uint8Array): Promise<BundleManifestInfo>;

  /** Remove an installed bundle. Cannot remove the workspace bundle. */
  removeBundle(slug: string): Promise<boolean>;

  /** Save (create or update) a document in the workspace bundle. */
  saveWorkspaceDocument(
    documentName: string,
    documentType: LibraryRootKind,
    body: Record<string, unknown>,
  ): Promise<void>;

  /** Delete a document from the workspace bundle by its document path. */
  deleteWorkspaceDocument(documentPath: string): Promise<boolean>;

  /** List all documents across all bundles (for index building). */
  listAllDocuments(): Promise<BundleDocumentWithBody[]>;

  /** List all document metadata from manifests only (no body reads). */
  listAllDocumentMeta(): Promise<BundleDocumentMeta[]>;

  /**
   * Scan the inbox directory for .keleo and .json files.
   * Imports bundles, saves JSON documents to workspace, moves processed files
   * to inbox/processed/. Returns the number of files processed.
   */
  processInbox(): Promise<number>;
}
