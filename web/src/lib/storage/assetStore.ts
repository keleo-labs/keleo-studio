import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function baseDir(): string {
  const custom = process.env.JSON_STORE_DATA_DIR?.trim();
  const root = custom || path.join(/* turbopackIgnore: true */ process.cwd(), "data");
  return path.join(root, "assets");
}

function sanitize(segment: string): string {
  const safe = segment.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe.startsWith(".")) throw new Error(`Invalid path segment: ${segment}`);
  return safe;
}

function assetDir(documentId: string): string {
  return path.join(baseDir(), sanitize(documentId));
}

function assetPath(documentId: string, filename: string): string {
  return path.join(assetDir(documentId), sanitize(filename));
}

export async function saveAsset(
  documentId: string,
  filename: string,
  data: Uint8Array | Buffer,
): Promise<void> {
  const dir = assetDir(documentId);
  await mkdir(dir, { recursive: true });
  await writeFile(assetPath(documentId, filename), data);
}

export async function getAsset(
  documentId: string,
  filename: string,
): Promise<Buffer | null> {
  try {
    return await readFile(assetPath(documentId, filename));
  } catch {
    return null;
  }
}

export async function listAssets(documentId: string): Promise<string[]> {
  try {
    const entries = await readdir(assetDir(documentId));
    return entries.filter((e) => !e.startsWith("."));
  } catch {
    return [];
  }
}

export async function deleteDocumentAssets(documentId: string): Promise<void> {
  try {
    await rm(assetDir(documentId), { recursive: true, force: true });
  } catch {
    // directory may not exist
  }
}
