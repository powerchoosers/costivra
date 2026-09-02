import {
  buildManageTwilioUrl,
  createInternalVoiceCall,
  createVoiceResponse,
  forbiddenVoiceResponse,
  getManageTwilioRuntimeConfig,
  manageVoiceOperatorIdentity,
  readTwilioForm,
  validCallSid,
  validateManageTwilioWebhook,
  voiceResponse,
} from "@/lib/manage/voice-server";
import { normalizeVoiceNumber } from "@/lib/manage/voice-number";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) return forbiddenVoiceResponse();

  const response = createVoiceResponse();
  try {
    const config = getManageTwilioRuntimeConfig();
    const callSid = validCallSid(params.CallSid);
    if (!callSid) throw new Error("INVALID_TWILIO_CALL_SID");
    const callerNumber = normalizeVoiceNumber(params.From) || "anonymous";
    const callerName = (params.CallerName || "Unknown caller").trim().slice(0, 160);

    await createInternalVoiceCall({
      db: createServerSupabaseClient(),
      twilioCallSid: callSid,
      direction: "inbound",
      fromNumber: callerNumber,
      toNumber: normalizeVoiceNumber(params.To) || config.phoneNumber || "unknown",
      callerNumber,
      calleeNumber: normalizeVoiceNumber(params.To) || config.phoneNumber || "unknown",
      displayName: callerName,
      status: "ringing",
      safeMetadata: {
        caller_city: params.FromCity?.slice(0, 80) || null,
        caller_state: params.FromState?.slice(0, 80) || null,
        caller_country: params.FromCountry?.slice(0, 8) || null,
        stir_status: params.StirStatus?.slice(0, 32) || null,
      },
    });

    const dial = response.dial({
      action: buildManageTwilioUrl("/api/manage/voice/twiml/incoming-complete", {
        recordCallSid: callSid,
      }),
      answerOnBridge: true,
      method: "POST",
      timeout: 30,
    });
    const db = createServerSupabaseClient();
    const { data: mainNumber } = await db.from("internal_voice_numbers").select("id").eq("phone_number", normalizeVoiceNumber(params.To) || config.phoneNumber || "").eq("status", "active").maybeSingle();
    const { data: routes } = mainNumber ? await db.from("internal_voice_number_routes").select("operator_id,priority").eq("number_id", mainNumber.id).eq("enabled", true).order("priority", { ascending: true }).limit(10) : { data: [] };
    const identities = (routes ?? []).map((route) => manageVoiceOperatorIdentity(String(route.operator_id)));
    if (!identities.length) identities.push(config.clientIdentity);
    for (const identity of identities) {
      const client = dial.client({ statusCallback: buildManageTwilioUrl("/api/manage/voice/twiml/events", { recordCallSid: callSid }), statusCallbackEvent: ["initiated", "ringing", "answered", "completed"], statusCallbackMethod: "POST" }, identity);
      client.parameter({ name: "CallerName", value: callerName });
      client.parameter({ name: "CallerNumber", value: callerNumber });
      client.parameter({ name: "ParentCallSid", value: callSid });
      client.parameter({ name: "Direction", value: "inbound" });
    }
  } catch (error) {
    console.error("Costivra inbound voice request failed.", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    });
    response.say("We are unable to connect your call right now. Please try again shortly.");
    response.hangup();
  }
  return voiceResponse(response);
}
