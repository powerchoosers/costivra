import {
  assertAllowedVoiceNumber,
  buildManageTwilioUrl,
  createInternalVoiceCall,
  createVoiceResponse,
  forbiddenVoiceResponse,
  getManageTwilioRuntimeConfig,
  readTwilioForm,
  validCallSid,
  validateManageTwilioWebhook,
  verifyVoiceOperator,
  voiceResponse,
} from "@/lib/manage/voice-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeVoiceNumber } from "@/lib/manage/voice-number";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) return forbiddenVoiceResponse();

  const response = createVoiceResponse();
  try {
    const config = getManageTwilioRuntimeConfig();
    const callSid = validCallSid(params.CallSid);
    if (!callSid) throw new Error("INVALID_TWILIO_CALL_SID");
    const destination = assertAllowedVoiceNumber(params.To);
    const operatorId = /^[0-9a-f-]{36}$/i.test(params.OperatorId || "")
      ? params.OperatorId
      : null;
    const operatorEmail = params.OperatorEmail?.trim().toLowerCase() || "";
    if (
      !operatorId ||
      !operatorEmail ||
      !verifyVoiceOperator(operatorId, operatorEmail, params.OperatorSignature)
    ) {
      throw new Error("VOICE_OPERATOR_REQUIRED");
    }

    const { data: mainNumber } = await createServerSupabaseClient().from("internal_voice_numbers").select("phone_number").eq("status", "active").eq("is_main", true).maybeSingle();
    const callerId = normalizeVoiceNumber(mainNumber?.phone_number) || config.phoneNumber;
    if (!callerId) throw new Error("COSTIVRA_MAIN_NUMBER_REQUIRED");
    await createInternalVoiceCall({
      db: createServerSupabaseClient(),
      twilioCallSid: callSid,
      direction: "outbound",
      fromNumber: callerId,
      toNumber: destination,
      callerNumber: callerId,
      calleeNumber: destination,
      operatorId,
      displayName: params.ContactName || destination,
      status: "initiated",
      safeMetadata: { source: "manage_browser" },
    });

    const dial = response.dial({
      answerOnBridge: true,
      callerId,
      timeout: 30,
    });
    dial.number(
      {
        statusCallback: buildManageTwilioUrl("/api/manage/voice/twiml/events", {
          recordCallSid: callSid,
        }),
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      },
      destination,
    );
  } catch (error) {
    console.error("Costivra outbound voice request failed.", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    });
    response.say("We could not complete that call. Check the number and try again.");
    response.hangup();
  }
  return voiceResponse(response);
}
