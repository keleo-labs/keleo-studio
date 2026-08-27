import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import { classifyLibraryRoot } from "@/lib/library/classify";
import { displayNameForBody } from "@/lib/library/classify";
import { serverCache } from "@/lib/cache/serverCache";
import type { BundleManifestInfo } from "@/lib/storage/bundleStoreTypes";

export async function GET() {
  const store = await getBundleStore();
  const bundles = await store.listBundles();
  return NextResponse.json({ bundles });
}

type ImportResult = {
  filename: string;
  ok: boolean;
  bundle?: BundleManifestInfo;
  document?: string;
  error?: string;
};

async function importSingleFile(
  store: Awaited<ReturnType<typeof getBundleStore>>,
  filename: string,
  data: Uint8Array,
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  const lower = filename.toLowerCase();

  if (lower.endsWith(".keleo")) {
    try {
      const info = await store.importBundle(data);
      results.push({ filename, ok: true, bundle: info });
    } catch (err) {
      results.push({ filename, ok: false, error: err instanceof Error ? err.message : "Import failed" });
    }
  } else {
    const raw = new TextDecoder().decode(data);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      results.push({ filename, ok: false, error: "Invalid JSON" });
      return results;
    }

    const bodies: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === "object" && !Array.isArray(item),
        )
      : parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? [parsed as Record<string, unknown>]
        : [];

    if (bodies.length === 0) {
      results.push({ filename, ok: false, error: "No valid document objects found" });
      return results;
    }

    for (const body of bodies) {
      const name = displayNameForBody(body, filename.replace(/\.json$/i, ""));
      const docType = classifyLibraryRoot(body);
      try {
        await store.saveWorkspaceDocument(name, docType, body);
        results.push({ filename, ok: true, document: name });
      } catch (err) {
        results.push({ filename, ok: false, error: err instanceof Error ? err.message : "Save failed" });
      }
    }
  }

  return results;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const store = await getBundleStore();

  // Multipart form upload (multiple files)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: ImportResult[] = [];
    for (const entry of files) {
      if (!(entry instanceof File)) continue;
      const data = new Uint8Array(await entry.arrayBuffer());
      const fileResults = await importSingleFile(store, entry.name, data);
      results.push(...fileResults);
    }

    const anySuccess = results.some((r) => r.ok);
    if (anySuccess) {
      serverCache.clear();
    }

    return NextResponse.json({ results }, { status: anySuccess ? 201 : 400 });
  }

  // Single binary upload (backward compatible)
  if (!contentType.includes("application/octet-stream") && !contentType.includes("application/zip")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data, application/octet-stream, or application/zip" },
      { status: 400 },
    );
  }

  const buffer = await req.arrayBuffer();
  if (!buffer.byteLength) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 });
  }

  try {
    const info = await store.importBundle(new Uint8Array(buffer));
    serverCache.clear();
    return NextResponse.json({ bundle: info }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import bundle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
