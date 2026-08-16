import { NextResponse } from "next/server";
import { getJsonDocumentStore } from "@/lib/storage/getStore";
import type { JsonDocumentKind, JsonDocumentUpdateInput } from "@/lib/storage/types";
import { serverCache } from "@/lib/cache/serverCache";
import { deleteDocumentAssets } from "@/lib/storage/assetStore";

function isKind(v: unknown): v is JsonDocumentKind {
  return v === "practice" || v === "method" || v === "upload" || v === "dashboard-config" || v === "project";
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const store = await getJsonDocumentStore();
  const doc = await store.get(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const patch: JsonDocumentUpdateInput = {};
  if (o.title !== undefined) {
    if (typeof o.title !== "string" || !o.title.trim()) {
      return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    patch.title = o.title.trim();
  }
  if (o.kind !== undefined) {
    if (!isKind(o.kind)) {
      return NextResponse.json({ error: "kind must be practice | method | upload | project | dashboard-config" }, { status: 400 });
    }
    patch.kind = o.kind;
  }
  if (o.body !== undefined) patch.body = o.body;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }
  try {
    const store = await getJsonDocumentStore();

    const doc = await store.update(id, patch);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Invalidate all cached data for this document
    serverCache.invalidate(id);

    return NextResponse.json(doc);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Storage error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const store = await getJsonDocumentStore();
  const ok = await store.delete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Invalidate all cached data for this document
  serverCache.invalidate(id);

  await deleteDocumentAssets(id);

  return new NextResponse(null, { status: 204 });
}
