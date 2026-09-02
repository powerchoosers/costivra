import {
  buildManageTwilioUrl,
  createVoiceResponse,
  forbiddenVoiceResponse,
  parseTwilioInteger,
  readTwilioForm,
  updateInternalVoiceCall,
  validCallSid,
  validateManageTwilioWebhook,
  voiceResponse,
} from "@/lib/manage/voice-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) return forbiddenVoiceResponse();
  const recordCallSid = validCallSid(new URL(request.url).searchParams.get("recordCallSid"));
  if (!recordCallSid) return forbiddenVoiceResponse();

  const response = createVoiceResponse();
  const dialStatus = params.DialCallStatus || "no-answer";
  try {
    await updateInternalVoiceCall({
      db: createServerSupabaseClient(),
      recordCallSid,
      childCallSid: params.DialCallSid,
      status: dialStatus,
      durationSeconds: parseTwilioInteger(params.DialCallDuration),
      safeMetadata: { dial_bridged: params.DialBridged === "true" },
    });
  } catch (error) {
    console.error("Costivra inbound completion update failed.", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    });
  }

  if (dialStatus === "completed" || dialStatus === "answered") {
    response.hangup();
  } else {
    response.say({ voice: "alice" }, "Nobody is available right now. Please leave a message after the beep.");
    response.record({
      action: buildManageTwilioUrl("/api/manage/voice/twiml/voicemail/complete", { recordCallSid }),
      finishOnKey: "#",
      maxLength: 120,
      method: "POST",
      playBeep: true,
      recordingStatusCallback: buildManageTwilioUrl("/api/manage/voice/twiml/recording-status", { recordCallSid }),
      recordingStatusCallbackEvent: ["completed", "absent"],
      recordingStatusCallbackMethod: "POST",
      timeout: 5,
      trim: "trim-silence",
    });
  }
  return voiceResponse(response);
}
