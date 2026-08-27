/**
 * Storage abstraction layer - file and MongoDB implementations.
 * Barrel export for clean imports.
 */

export { getJsonDocumentStore, getBundleStore } from "./getStore";
export type { JsonDocumentStore, JsonDocumentMeta, JsonDocumentCreateInput, JsonDocumentUpdateInput, JsonDocumentKind } from "./types";
export type { BundleStore, BundleManifestInfo, BundleDocumentMeta, BundleDocumentRef, BundleDocumentWithBody } from "./bundleStoreTypes";
export { WORKSPACE_BUNDLE_SLUG } from "./bundleStoreTypes";
