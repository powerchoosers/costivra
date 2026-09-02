import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { createManageVoiceToken } from "@/lib/manage/voice-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const operator = await requireInternalOperator();
    return NextResponse.json(await createManageVoiceToken(operator), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
