import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAllowedVoiceNumber, normalizeVoiceNumber } from "@/lib/manage/voice-number";

const CALL_SID_PATTERN = /^CA[0-9a-f]{32}$/i;
const RECORDING_SID_PATTERN = /^RE[0-9a-f]{32}$/i;
const VOICE_STATUSES = new Set([
  "queued",
  "initiated",
  "ringing",
  "in-progress",
  "completed",
  "busy",
  "failed",
  "no-answer",
  "canceled",
]);

type TwilioForm = Record<string, string>;

const CONFIG_KEYS = [
  "COSTIVRA_TWILIO_ACCOUNT_SID",
  "COSTIVRA_TWILIO_AUTH_TOKEN",
  "COSTIVRA_TWILIO_API_KEY_SID",
  "COSTIVRA_TWILIO_API_KEY_SECRET",
  "COSTIVRA_TWILIO_TWIML_APP_SID",
  "COSTIVRA_TWILIO_PHONE_NUMBER",
] as const;

export function sanitizeVoiceIdentity(value: string) {
  const sanitized = value.trim().replace(/[^A-Za-z0-9_]/g, "_").slice(0, 121);
  return sanitized || "costivra_manage";
}

export function manageVoiceOperatorIdentity(userId: string) {
  return sanitizeVoiceIdentity(`costivra_operator_${userId.replace(/[^A-Za-z0-9]/g, "").slice(0, 80)}`);
}

export function getManageTwilioReadiness() {
  const missing = CONFIG_KEYS.filter((key) => !process.env[key]?.trim());
  const phoneNumber = normalizeVoiceNumber(process.env.COSTIVRA_TWILIO_PHONE_NUMBER);
  if (!phoneNumber && !missing.includes("COSTIVRA_TWILIO_PHONE_NUMBER")) {
    missing.push("COSTIVRA_TWILIO_PHONE_NUMBER");
  }
  return {
    configured: missing.length === 0,
    missing,
    phoneNumber,
  };
}

export function getManageTwilioConfig() {
  const config = getManageTwilioRuntimeConfig();
  if (!config.phoneNumber) throw new Error("Missing Twilio configuration: COSTIVRA_TWILIO_PHONE_NUMBER");
  return { ...config, phoneNumber: config.phoneNumber };
}

export function getManageTwilioRuntimeConfig() {
  const missing = CONFIG_KEYS.slice(0, 5).filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing Twilio configuration: ${missing.join(", ")}`);
  const phoneNumber = normalizeVoiceNumber(process.env.COSTIVRA_TWILIO_PHONE_NUMBER);
  return {
    accountSid: process.env.COSTIVRA_TWILIO_ACCOUNT_SID!.trim(),
    authToken: process.env.COSTIVRA_TWILIO_AUTH_TOKEN!.trim(),
    apiKeySid: process.env.COSTIVRA_TWILIO_API_KEY_SID!.trim(),
    apiKeySecret: process.env.COSTIVRA_TWILIO_API_KEY_SECRET!.trim(),
    twimlAppSid: process.env.COSTIVRA_TWILIO_TWIML_APP_SID!.trim(),
    phoneNumber,
    clientIdentity: sanitizeVoiceIdentity(
      process.env.COSTIVRA_TWILIO_CLIENT_IDENTITY || "costivra_manage",
    ),
    publicBaseUrl: getManagePublicBaseUrl(),
  };
}

/** Credentials needed for number inventory/provisioning before a main number exists. */
export function getManageTwilioProvisioningConfig() {
  // Number inventory and purchases use Twilio's account REST credentials. The
  // TwiML App is only needed once browser calling is enabled, so purchasing a
  // main number should not be blocked by that later resource.
  const missing = CONFIG_KEYS.slice(0, 2).filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing Twilio configuration: ${missing.join(", ")}`);
  return {
    accountSid: process.env.COSTIVRA_TWILIO_ACCOUNT_SID!.trim(),
    authToken: process.env.COSTIVRA_TWILIO_AUTH_TOKEN!.trim(),
  };
}

export function getManagePublicBaseUrl() {
  const configured =
    process.env.COSTIVRA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "https://costivra.ai";
  return new URL(configured).toString().replace(/\/$/, "");
}

export function createManageVoiceToken(operator: { userId: string; email: string }) {
  const config = getManageTwilioRuntimeConfig();
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const token = new AccessToken(
    config.accountSid,
    config.apiKeySid,
    config.apiKeySecret,
    { identity: manageVoiceOperatorIdentity(operator.userId), ttl: 3600 },
  );
  token.addGrant(
    new VoiceGrant({
      incomingAllow: true,
      outgoingApplicationSid: config.twimlAppSid,
      outgoingApplicationParams: {
        OperatorId: operator.userId,
        OperatorEmail: operator.email,
        OperatorSignature: signVoiceOperator(operator.userId, operator.email),
      },
    }),
  );
  return {
    token: token.toJwt(),
    identity: manageVoiceOperatorIdentity(operator.userId),
    phoneNumber: config.phoneNumber,
    expiresIn: 3600,
  };
}

export function signVoiceOperator(userId: string, email: string) {
  return createHmac("sha256", getManageTwilioRuntimeConfig().authToken)
    .update(`${userId}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function verifyVoiceOperator(
  userId: string,
  email: string,
  signature: string | null | undefined,
) {
  if (!/^[0-9a-f]{64}$/i.test(signature || "")) return false;
  const expected = Buffer.from(signVoiceOperator(userId, email), "hex");
  const received = Buffer.from(signature!, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function readTwilioForm(request: Request) {
  const formData = await request.formData();
  const params: TwilioForm = {};
  formData.forEach((value, key) => {
    params[key] = typeof value === "string" ? value : value.name;
  });
  return params;
}

export function validateManageTwilioWebhook(request: Request, params: TwilioForm) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.COSTIVRA_TWILIO_VALIDATE_WEBHOOKS === "false"
  ) {
    return true;
  }
  const signature = request.headers.get("x-twilio-signature") || "";
  if (!signature) return false;
  let config: ReturnType<typeof getManageTwilioRuntimeConfig>;
  try {
    config = getManageTwilioRuntimeConfig();
  } catch {
    return false;
  }

  const incomingUrl = new URL(request.url);
  const pathAndQuery = `${incomingUrl.pathname}${incomingUrl.search}`;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origins = new Set([new URL(config.publicBaseUrl).origin, incomingUrl.origin]);
  if (forwardedHost) origins.add(`${forwardedProto}://${forwardedHost}`);

  return [...origins].some((origin) =>
    twilio.validateRequest(
      config.authToken,
      signature,
      `${origin}${pathAndQuery}`,
      params,
    ),
  );
}

export function buildManageTwilioUrl(
  path: string,
  params: Record<string, string | null | undefined> = {},
) {
  const url = new URL(path, `${getManagePublicBaseUrl()}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

export function createVoiceResponse() {
  return new twilio.twiml.VoiceResponse();
}

export function voiceResponse(
  response: InstanceType<typeof twilio.twiml.VoiceResponse>,
  status = 200,
) {
  return new Response(response.toString(), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export function forbiddenVoiceResponse() {
  const response = createVoiceResponse();
  response.say("This call request could not be verified.");
  response.hangup();
  return voiceResponse(response, 403);
}

export function validCallSid(value: string | null | undefined) {
  return typeof value === "string" && CALL_SID_PATTERN.test(value) ? value : null;
}

export function validRecordingSid(value: string | null | undefined) {
  return typeof value === "string" && RECORDING_SID_PATTERN.test(value) ? value : null;
}

export function normalizeVoiceStatus(value: string | null | undefined) {
  if (value === "answered") return "in-progress";
  return VOICE_STATUSES.has(value || "") ? value! : "initiated";
}

export async function createInternalVoiceCall(input: {
  db: SupabaseClient;
  twilioCallSid: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  callerNumber: string;
  calleeNumber: string;
  operatorId?: string | null;
  displayName?: string | null;
  status?: string;
  safeMetadata?: Record<string, unknown>;
}) {
  const callSid = validCallSid(input.twilioCallSid);
  if (!callSid) throw new Error("INVALID_TWILIO_CALL_SID");
  const timestamp = new Date().toISOString();
  const { data, error } = await input.db
    .from("internal_voice_calls")
    .upsert(
      {
        twilio_call_sid: callSid,
        idempotency_key: `twilio:${callSid}`,
        provider: "twilio",
        provider_reference: callSid,
        direction: input.direction,
        status: normalizeVoiceStatus(input.status),
        from_number: input.fromNumber,
        to_number: input.toNumber,
        caller_number: input.callerNumber,
        callee_number: input.calleeNumber,
        operator_id: input.operatorId || null,
        display_name: input.displayName?.trim().slice(0, 160) || null,
        authorized_at: input.direction === "outbound" ? timestamp : null,
        authorization_method:
          input.direction === "outbound" ? "operator_call_click" : "inbound_webhook",
        safe_metadata: input.safeMetadata ?? {},
        updated_at: timestamp,
      },
      { onConflict: "twilio_call_sid" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateInternalVoiceCall(input: {
  db: SupabaseClient;
  recordCallSid: string;
  childCallSid?: string | null;
  status: string;
  sequenceNumber?: number | null;
  durationSeconds?: number | null;
  safeMetadata?: Record<string, unknown>;
}) {
  const recordSid = validCallSid(input.recordCallSid);
  if (!recordSid) throw new Error("INVALID_TWILIO_CALL_SID");
  const { data: current, error: currentError } = await input.db
    .from("internal_voice_calls")
    .select("id,last_sequence_number,safe_metadata,answered_at")
    .or(`twilio_call_sid.eq.${recordSid},child_call_sid.eq.${recordSid}`)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;
  if (
    typeof input.sequenceNumber === "number" &&
    input.sequenceNumber < Number(current.last_sequence_number || 0)
  ) {
    return current;
  }

  const status = normalizeVoiceStatus(input.status);
  const timestamp = new Date().toISOString();
  const terminal = ["completed", "busy", "failed", "no-answer", "canceled"].includes(status);
  const patch: Record<string, unknown> = {
    status,
    updated_at: timestamp,
    safe_metadata: {
      ...(current.safe_metadata && typeof current.safe_metadata === "object"
        ? current.safe_metadata
        : {}),
      ...(input.safeMetadata ?? {}),
    },
  };
  const childSid = validCallSid(input.childCallSid);
  if (childSid && childSid !== recordSid) patch.child_call_sid = childSid;
  if (typeof input.sequenceNumber === "number") {
    patch.last_sequence_number = Math.max(0, input.sequenceNumber);
  }
  if (status === "in-progress" && !current.answered_at) patch.answered_at = timestamp;
  if (terminal) patch.ended_at = timestamp;
  if (typeof input.durationSeconds === "number") {
    patch.duration_seconds = Math.max(0, input.durationSeconds);
  }
  const { data, error } = await input.db
    .from("internal_voice_calls")
    .update(patch)
    .eq("id", current.id)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateInternalVoiceCallRecording(input: {
  db: SupabaseClient;
  recordCallSid: string;
  recordingSid: string;
  recordingDurationSeconds?: number | null;
  recordingStatus?: string | null;
}) {
  const recordSid = validCallSid(input.recordCallSid);
  const recordingSid = validRecordingSid(input.recordingSid);
  if (!recordSid || !recordingSid) throw new Error("INVALID_TWILIO_RECORDING_REFERENCE");
  const { data: current, error: currentError } = await input.db
    .from("internal_voice_calls")
    .select("id,safe_metadata")
    .or(`twilio_call_sid.eq.${recordSid},child_call_sid.eq.${recordSid}`)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;
  const duration = typeof input.recordingDurationSeconds === "number"
    ? Math.max(0, input.recordingDurationSeconds)
    : null;
  const { data, error } = await input.db
    .from("internal_voice_calls")
    .update({
      recording_sid: recordingSid,
      recording_duration_seconds: duration,
      is_voicemail: true,
      safe_metadata: {
        ...(current.safe_metadata && typeof current.safe_metadata === "object" ? current.safe_metadata : {}),
        recording_status: input.recordingStatus?.slice(0, 32) || null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function listInternalVoiceCalls(input: {
  db: SupabaseClient;
  limit?: number;
}) {
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit || 20)));
  const { data, error } = await input.db
    .from("internal_voice_calls")
    .select("id,direction,status,display_name,caller_number,callee_number,created_at,started_at,answered_at,ended_at,duration_seconds,recording_sid,recording_duration_seconds,is_voicemail,is_read")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export function parseTwilioInteger(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export { assertAllowedVoiceNumber };
