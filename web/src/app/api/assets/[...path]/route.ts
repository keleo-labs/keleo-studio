import { NextResponse } from "next/server";
import { getAsset } from "@/lib/storage/assetStore";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function mimeFromFilename(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { path: segments } = await ctx.params;
  if (!segments || segments.length !== 2) {
    return NextResponse.json({ error: "Expected /api/assets/{documentId}/{filename}" }, { status: 400 });
  }

  const [documentId, filename] = segments;
  const data = await getAsset(documentId, filename);
  if (!data) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeFromFilename(filename),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
