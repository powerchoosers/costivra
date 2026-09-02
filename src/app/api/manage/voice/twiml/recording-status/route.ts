import { NextResponse } from "next/server";
import {
  parseTwilioInteger,
  readTwilioForm,
  updateInternalVoiceCallRecording,
  validCallSid,
  validRecordingSid,
  validateManageTwilioWebhook,
} from "@/lib/manage/voice-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) {
    return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
  }
  const recordCallSid =
    validCallSid(new URL(request.url).searchParams.get("recordCallSid")) ||
    validCallSid(params.CallSid);
  const recordingSid = validRecordingSid(params.RecordingSid);
  if (!recordCallSid || !recordingSid) {
    return NextResponse.json({ error: "Invalid recording reference." }, { status: 400 });
  }
  try {
    await updateInternalVoiceCallRecording({
      db: createServerSupabaseClient(),
      recordCallSid,
      recordingSid,
      recordingDurationSeconds: parseTwilioInteger(params.RecordingDuration),
      recordingStatus: params.RecordingStatus,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Costivra voicemail recording update failed.", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    });
    return NextResponse.json({ error: "Unable to update voicemail." }, { status: 500 });
  }
}
