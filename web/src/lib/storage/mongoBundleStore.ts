import type { BundleStore } from "./bundleStoreTypes";

// TODO: full MongoDB implementation — mirrors fileBundleStore using MongoDB collections.
// For now, throws on use to make the missing implementation obvious.
export async function createMongoBundleStore(): Promise<BundleStore> {
  throw new Error(
    "mongoBundleStore is not yet implemented. Set JSON_STORE_DRIVER=file or implement this module.",
  );
}
