import { NextResponse } from "next/server";
import { saveAsset, listAssets } from "@/lib/storage/assetStore";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  const formData = await req.formData();
  const saved: Array<{ filename: string; url: string }> = [];

  for (const [, value] of formData.entries()) {
    if (!(value instanceof File)) continue;
    const filename = value.name;
    if (!filename) continue;
    const buf = new Uint8Array(await value.arrayBuffer());
    await saveAsset(id, filename, buf);
    saved.push({ filename, url: `/api/assets/${id}/${encodeURIComponent(filename)}` });
  }

  return NextResponse.json({ assets: saved });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  const filenames = await listAssets(id);
  const assets = filenames.map((f) => ({
    filename: f,
    url: `/api/assets/${id}/${encodeURIComponent(f)}`,
  }));

  return NextResponse.json({ assets });
}
