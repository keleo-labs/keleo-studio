import type {
  JsonDocument,
  JsonDocumentCreateInput,
  JsonDocumentKind,
  JsonDocumentMeta,
  JsonDocumentStore,
  JsonDocumentUpdateInput,
} from "./types";

type MongoDoc = {
  id: string;
  title: string;
  kind: JsonDocumentKind;
  body: unknown;
  createdAt: string;
  updatedAt: string;
};

function collectionName(): string {
  return process.env.MONGODB_COLLECTION?.trim() || "json_documents";
}

function dbName(): string {
  return process.env.MONGODB_DB?.trim() || "adoptionframework";
}

function isJsonDocumentKind(v: string): v is JsonDocumentKind {
  return v === "practice" || v === "method" || v === "upload";
}

function rowToDoc(row: MongoDoc): JsonDocument {
  return {
    id: row.id,
    title: row.title,
    kind: isJsonDocumentKind(row.kind) ? row.kind : "upload",
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function metaOf(doc: JsonDocument): JsonDocumentMeta {
  const { body: _b, ...m } = doc;
  return m;
}

/**
 * Mongo-backed store. Set JSON_STORE_DRIVER=mongo and MONGODB_URI (and optionally MONGODB_DB, MONGODB_COLLECTION).
 */
export async function createMongoJsonStore(): Promise<JsonDocumentStore> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is required when JSON_STORE_DRIVER=mongo");
  }

  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri);
  await client.connect();
  const coll = client.db(dbName()).collection<MongoDoc>(collectionName());
  await coll.createIndex({ id: 1 }, { unique: true });

  return {
    async list(filter) {
      const q = filter?.kind ? { kind: filter.kind } : {};
      const rows = await coll.find(q).sort({ updatedAt: -1 }).toArray();
      return rows.map((r) => metaOf(rowToDoc(r)));
    },

    async get(id) {
      const row = await coll.findOne({ id });
      return row ? rowToDoc(row) : null;
    },

    async create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const doc: MongoDoc = {
        id,
        title: input.title,
        kind: input.kind,
        body: input.body,
        createdAt: now,
        updatedAt: now,
      };
      await coll.insertOne(doc);
      return rowToDoc(doc);
    },

    async update(id, patch) {
      const existing = await coll.findOne({ id });
      if (!existing) return null;
      const now = new Date().toISOString();
      const next: MongoDoc = {
        id: existing.id,
        title: patch.title ?? existing.title,
        kind: patch.kind ?? existing.kind,
        body: patch.body !== undefined ? patch.body : existing.body,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      await coll.replaceOne({ id }, next);
      return rowToDoc(next);
    },

    async delete(id) {
      const r = await coll.deleteOne({ id });
      return r.deletedCount > 0;
    },
  };
}
