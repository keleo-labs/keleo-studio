/** Stored JSON artifact (practice baseline, method pack, upload, dashboard config, etc.). */
export type JsonDocumentKind = "practice" | "method" | "upload" | "dashboard-config" | "project";

export type JsonDocumentMeta = {
  id: string;
  title: string;
  kind: JsonDocumentKind;
  createdAt: string;
  updatedAt: string;
};

export type JsonDocument = JsonDocumentMeta & {
  body: unknown;
};

export type JsonDocumentCreateInput = {
  title: string;
  kind: JsonDocumentKind;
  body: unknown;
};

export type JsonDocumentUpdateInput = {
  title?: string;
  kind?: JsonDocumentKind;
  body?: unknown;
};

/**
 * Persistence for uploaded / edited JSON. Swap implementations via JSON_STORE_DRIVER.
 * See fileJsonStore (default) and mongoJsonStore (server deploy).
 */
export interface JsonDocumentStore {
  list(filter?: { kind?: JsonDocumentKind }): Promise<JsonDocumentMeta[]>;
  get(id: string): Promise<JsonDocument | null>;
  create(input: JsonDocumentCreateInput): Promise<JsonDocument>;
  update(id: string, patch: JsonDocumentUpdateInput): Promise<JsonDocument | null>;
  delete(id: string): Promise<boolean>;
}
