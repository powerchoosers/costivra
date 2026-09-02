import { NextResponse } from "next/server";
import { requireInternalOperator } from "@/lib/manage/auth";
import { listInternalVoiceCalls } from "@/lib/manage/voice-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { db } = await requireInternalOperator();
    const limit = Number(new URL(request.url).searchParams.get("limit") || 20);
    const calls = await listInternalVoiceCalls({ db, limit });
    return NextResponse.json({ calls }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load call history.";
    const status = message === "AUTH_REQUIRED" || message === "INTERNAL_ACCESS_REQUIRED" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Internal access required." : "Unable to load call history." }, { status });
  }
}
