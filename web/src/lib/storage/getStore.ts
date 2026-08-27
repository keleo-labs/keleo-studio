import type { BundleStore } from "./bundleStoreTypes";
import type { JsonDocumentStore } from "./types";

let cached: JsonDocumentStore | null = null;
let cachedDriver: string | null = null;

/**
 * Returns the configured document store (singleton per process).
 * JSON_STORE_DRIVER: `file` (default) | `mongo`
 */
export async function getJsonDocumentStore(): Promise<JsonDocumentStore> {
  const driver = (process.env.JSON_STORE_DRIVER ?? "file").toLowerCase().trim();
  if (cached && cachedDriver === driver) return cached;

  if (driver === "mongo") {
    const { createMongoJsonStore } = await import("./mongoJsonStore");
    cached = await createMongoJsonStore();
    cachedDriver = driver;
    return cached;
  }

  const { createFileJsonStore } = await import("./fileJsonStore");
  cached = createFileJsonStore();
  cachedDriver = driver;
  return cached;
}

let cachedBundleStore: BundleStore | null = null;
let cachedBundleDriver: string | null = null;

/**
 * Returns the configured bundle store (singleton per process).
 * JSON_STORE_DRIVER: `file` (default) | `mongo`
 */
export async function getBundleStore(): Promise<BundleStore> {
  const driver = (process.env.JSON_STORE_DRIVER ?? "file").toLowerCase().trim();
  if (cachedBundleStore && cachedBundleDriver === driver) return cachedBundleStore;

  if (driver === "mongo") {
    const { createMongoBundleStore } = await import("./mongoBundleStore");
    cachedBundleStore = await createMongoBundleStore();
    cachedBundleDriver = driver;
    return cachedBundleStore;
  }

  const { createFileBundleStore } = await import("./fileBundleStore");
  cachedBundleStore = createFileBundleStore();
  cachedBundleDriver = driver;
  return cachedBundleStore;
}
