import {
  createVoiceResponse,
  forbiddenVoiceResponse,
  readTwilioForm,
  validCallSid,
  validateManageTwilioWebhook,
  voiceResponse,
} from "@/lib/manage/voice-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) return forbiddenVoiceResponse();
  if (!validCallSid(new URL(request.url).searchParams.get("recordCallSid"))) return forbiddenVoiceResponse();
  const response = createVoiceResponse();
  response.say({ voice: "alice" }, "Thank you. Your message has been saved. Goodbye.");
  response.hangup();
  return voiceResponse(response);
}
