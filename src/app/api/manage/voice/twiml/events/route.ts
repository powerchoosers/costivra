import { NextResponse } from "next/server";
import {
  parseTwilioInteger,
  readTwilioForm,
  updateInternalVoiceCall,
  validCallSid,
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
    validCallSid(params.ParentCallSid) ||
    validCallSid(params.CallSid);
  if (!recordCallSid) {
    return NextResponse.json({ error: "Invalid call reference." }, { status: 400 });
  }

  try {
    await updateInternalVoiceCall({
      db: createServerSupabaseClient(),
      recordCallSid,
      childCallSid: params.CallSid,
      status: params.CallStatus,
      sequenceNumber: parseTwilioInteger(params.SequenceNumber),
      durationSeconds: parseTwilioInteger(params.CallDuration),
      safeMetadata: {
        callback_source: params.CallbackSource?.slice(0, 80) || null,
        sip_response_code: params.SipResponseCode?.slice(0, 8) || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Costivra voice status update failed.", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    });
    return NextResponse.json({ error: "Unable to update call status." }, { status: 500 });
  }
}
