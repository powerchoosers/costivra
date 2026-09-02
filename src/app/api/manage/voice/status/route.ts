import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getManageTwilioReadiness } from "@/lib/manage/voice-server";
import { formatVoiceNumber } from "@/lib/manage/voice-number";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireInternalOperator();
    const readiness = getManageTwilioReadiness();
    return NextResponse.json(
      {
        configured: readiness.configured,
        missing: readiness.missing,
        phoneNumber: readiness.phoneNumber
          ? formatVoiceNumber(readiness.phoneNumber)
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

