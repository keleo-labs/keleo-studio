import { NextResponse } from "next/server";
import { getBundleStore } from "@/lib/storage/getStore";
import { serverCache } from "@/lib/cache/serverCache";

export async function POST() {
  const store = await getBundleStore();
  const processed = await store.processInbox();

  if (processed > 0) {
    serverCache.clear();
  }

  return NextResponse.json({ processed });
}
