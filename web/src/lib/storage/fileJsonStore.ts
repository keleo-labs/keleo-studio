import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  JsonDocument,
  JsonDocumentCreateInput,
  JsonDocumentKind,
  JsonDocumentMeta,
  JsonDocumentStore,
  JsonDocumentUpdateInput,
} from "./types";

function defaultDataDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "documents");
}

function dataDir(): string {
  return process.env.JSON_STORE_DATA_DIR?.trim() || defaultDataDir();
}

function filePath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safe !== id || !id) throw new Error("Invalid document id");
  return path.join(dataDir(), `${id}.json`);
}

async function ensureDir(): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
}

function isJsonDocumentKind(v: string): v is JsonDocumentKind {
  return v === "practice" || v === "method" || v === "upload";
}

function parseStored(raw: string): JsonDocument | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : null;
    const title = typeof o.title === "string" ? o.title : "";
    const kindRaw = typeof o.kind === "string" ? o.kind : "upload";
    const kind = isJsonDocumentKind(kindRaw) ? kindRaw : "upload";
    const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date(0).toISOString();
    const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
    if (!id) return null;
    return {
      id,
      title,
      kind,
      createdAt,
      updatedAt,
      body: o.body,
    };
  } catch {
    return null;
  }
}

function metaOf(doc: JsonDocument): JsonDocumentMeta {
  const { body: _b, ...m } = doc;
  return m;
}

export function createFileJsonStore(): JsonDocumentStore {
  return {
    async list(filter) {
      let names: string[];
      try {
        names = await readdir(dataDir());
      } catch {
        return [];
      }
      const metas: JsonDocumentMeta[] = [];
      for (const name of names) {
        if (!name.endsWith(".json")) continue;
        const full = path.join(dataDir(), name);
        let raw: string;
        try {
          raw = await readFile(full, "utf8");
        } catch {
          continue;
        }
        const doc = parseStored(raw);
        if (!doc) continue;
        if (filter?.kind && doc.kind !== filter.kind) continue;
        metas.push(metaOf(doc));
      }
      metas.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
      return metas;
    },

    async get(id) {
      let raw: string;
      try {
        raw = await readFile(filePath(id), "utf8");
      } catch {
        return null;
      }
      return parseStored(raw);
    },

    async create(input) {
      await ensureDir();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const doc: JsonDocument = {
        id,
        title: input.title,
        kind: input.kind,
        body: input.body,
        createdAt: now,
        updatedAt: now,
      };
      await writeFile(filePath(id), JSON.stringify(doc, null, 2), "utf8");
      return doc;
    },

    async update(id, patch) {
      const existing = await this.get(id);
      if (!existing) return null;
      const now = new Date().toISOString();
      const doc: JsonDocument = {
        id: existing.id,
        title: patch.title ?? existing.title,
        kind: patch.kind ?? existing.kind,
        body: patch.body !== undefined ? patch.body : existing.body,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      await ensureDir();
      await writeFile(filePath(id), JSON.stringify(doc, null, 2), "utf8");
      return doc;
    },

    async delete(id) {
      try {
        await unlink(filePath(id));
        return true;
      } catch {
        return false;
      }
    },
  };
}
