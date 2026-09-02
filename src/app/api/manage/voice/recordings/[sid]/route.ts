import { NextResponse } from "next/server";
import { requireInternalOperator } from "@/lib/manage/auth";
import { getManageTwilioConfig, validRecordingSid } from "@/lib/manage/voice-server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    await requireInternalOperator();
    const sid = validRecordingSid((await params).sid);
    if (!sid) return NextResponse.json({ error: "Invalid recording." }, { status: 400 });
    const config = getManageTwilioConfig();
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${sid}.mp3`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        },
        cache: "no-store",
      },
    );
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: "Voicemail is not available." }, { status: response.status === 404 ? 404 : 502 });
    }
    return new Response(response.body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Content-Disposition": `inline; filename="${sid}.mp3"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load voicemail.";
    const status = message === "AUTH_REQUIRED" || message === "INTERNAL_ACCESS_REQUIRED" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Internal access required." : "Unable to load voicemail." }, { status });
  }
}
