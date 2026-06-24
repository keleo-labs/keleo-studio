/**
 * Storage abstraction layer - file and MongoDB implementations.
 * Barrel export for clean imports.
 */

export { getJsonDocumentStore } from "./getStore";
export type { JsonDocumentStore, JsonDocumentMeta, JsonDocumentCreateInput, JsonDocumentUpdateInput, JsonDocumentKind } from "./types";
