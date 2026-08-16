import { NextResponse } from "next/server";
import { validateAgainstSchemaServer } from "@/lib/core/validateServer";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = validateAgainstSchemaServer(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, issues: [{ path: "", message: "Invalid request body" }], relaxedOk: false, relaxedIssues: [{ path: "", message: "Invalid request body" }] },
      { status: 400 },
    );
  }
}
