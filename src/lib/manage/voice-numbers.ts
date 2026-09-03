import "server-only";

import { createHash } from "node:crypto";
import twilio from "twilio";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireInternalOwner } from "@/lib/manage/auth";
import { getManagePublicBaseUrl, getManageTwilioProvisioningConfig } from "@/lib/manage/voice-server";
import { isVoiceNumberInventorySchemaError, normalizeVoiceNumber, VOICE_NUMBER_INVENTORY_UNAVAILABLE } from "@/lib/manage/voice-number";

type TwilioNumberClient = ReturnType<typeof twilio>;

/**
 * Turn provider failures into actionable owner-facing messages without
 * exposing Twilio request details or credentials.
 */
export function getVoiceNumberPurchaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("primary compliance profile") || normalized.includes("trust hub") || normalized.includes("kyc")) {
    return "Twilio requires an approved Trust Hub compliance profile before this number can be purchased. Complete KYC in Twilio Trust Hub, then try again.";
  }
  if (normalized.includes("not available") || normalized.includes("unavailable")) {
    return "That number is no longer available. Search Twilio inventory again for another number.";
  }
  if (normalized.includes("balance") || normalized.includes("billing") || normalized.includes("funds")) {
    return "Twilio could not complete the purchase because the account billing setup needs attention.";
  }
  return "Twilio did not complete the purchase. No public number was activated.";
}

function safeTwilioPurchaseError(error: unknown) {
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  return {
    code: typeof candidate?.code === "string" || typeof candidate?.code === "number" ? candidate.code : undefined,
    status: typeof candidate?.status === "number" ? candidate.status : undefined,
    message: typeof candidate?.message === "string" ? candidate.message.slice(0, 300) : undefined,
  };
}

function twilioClient(): TwilioNumberClient {
  const config = getManageTwilioProvisioningConfig();
  return twilio(config.accountSid, config.authToken);
}

function cents(value: unknown) {
  const amount = typeof value === "string" ? Number.parseFloat(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export async function searchAvailableVoiceNumbers(input: {
  areaCode?: string;
  contains?: string;
  region?: string;
  limit?: number;
}) {
  const client = twilioClient();
  const params: Record<string, unknown> = { voiceEnabled: true, limit: Math.min(Math.max(input.limit ?? 20, 1), 50) };
  if (/^\d{3}$/.test(input.areaCode ?? "")) params.areaCode = input.areaCode;
  if (input.contains?.trim()) params.contains = input.contains.trim().slice(0, 20);
  if (/^[A-Z]{2}$/.test(input.region ?? "")) params.inRegion = input.region;
  const numbers = await client.availablePhoneNumbers("US").local.list(params as never);
  let localMonthlyPriceCents: number | null = null;
  try {
    const pricing = await client.pricing.v1.phoneNumbers.countries("US").fetch();
    const local = (pricing.phoneNumberPrices ?? []).find((price) => price.numberType === "local");
    localMonthlyPriceCents = cents(local?.currentPrice);
  } catch {
    // Inventory remains usable when Twilio's optional pricing resource is unavailable.
  }
  return numbers.map((number) => ({
    phoneNumber: normalizeVoiceNumber(number.phoneNumber) ?? number.phoneNumber,
    friendlyName: number.friendlyName ?? null,
    locality: number.locality ?? null,
    region: number.region ?? null,
    postalCode: number.postalCode ?? null,
    isoCountry: number.isoCountry ?? "US",
    numberType: "local",
    monthlyPriceCents: cents((number as unknown as { monthlyFee?: string }).monthlyFee) ?? localMonthlyPriceCents,
    currency: "USD",
    capabilities: { voice: Boolean((number as unknown as { capabilities?: { voice?: boolean } }).capabilities?.voice), sms: Boolean((number as unknown as { capabilities?: { sms?: boolean } }).capabilities?.sms) },
  }));
}

export async function listOwnedVoiceNumbers(db = createServerSupabaseClient()) {
  const { data, error } = await db.from("internal_voice_numbers").select("id,twilio_phone_sid,phone_number,friendly_name,number_type,capabilities,monthly_price_cents,currency,status,is_main,purchased_at,internal_voice_number_routes(id,operator_id,priority,enabled)").order("is_main", { ascending: false }).order("phone_number");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, routes: Array.isArray(row.internal_voice_number_routes) ? row.internal_voice_number_routes : [] }));
}

export async function getPublicMainVoiceNumber() {
  try {
    const db = createServerSupabaseClient();
    const { data } = await db.from("internal_voice_numbers").select("phone_number").eq("status", "active").eq("is_main", true).maybeSingle();
    return normalizeVoiceNumber(data?.phone_number) ?? null;
  } catch {
    return null;
  }
}

export async function purchaseVoiceNumber(input: { phoneNumber: string; confirmed: boolean; actorId: string }) {
  const owner = await requireInternalOwner();
  if (owner.userId !== input.actorId) throw new Error("OWNER_ACCESS_REQUIRED");
  const phoneNumber = normalizeVoiceNumber(input.phoneNumber);
  if (!phoneNumber || input.confirmed !== true) throw new Error("Confirm the purchase before continuing.");
  const db = owner.db;
  const { data: existing, error: existingError } = await db.from("internal_voice_numbers").select("id,status").eq("phone_number", phoneNumber).maybeSingle();
  if (existingError) {
    if (isVoiceNumberInventorySchemaError(existingError)) throw new Error(VOICE_NUMBER_INVENTORY_UNAVAILABLE);
    throw existingError;
  }
  if (existing) throw new Error("That number is already in Costivra's inventory.");
  const idempotencyKey = `twilio:number-purchase:${phoneNumber}`;
  const requestHash = createHash("sha256").update(phoneNumber).digest("hex");
  const { data: prior, error: priorError } = await db.from("internal_voice_side_effects").select("id,status,provider_reference").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (priorError) throw priorError;
  if (prior?.status === "sent" && prior.provider_reference) throw new Error("This purchase was already recorded. Refresh the number inventory.");
  const { data: effect, error: effectError } = await db.from("internal_voice_side_effects").upsert({
    type: "twilio_number_purchase",
    destination: phoneNumber,
    request_hash: requestHash,
    status: "claimed",
    provider: "twilio",
    idempotency_key: idempotencyKey,
    actor_id: owner.userId,
    authorization_method: "explicit_purchase_action",
    authorized_at: new Date().toISOString(),
    sanitized_request_metadata: { phone_number: phoneNumber },
  }, { onConflict: "idempotency_key" }).select("id,status,provider_reference").maybeSingle();
  if (effectError) throw effectError;
  if (effect?.status === "sent" && effect.provider_reference) throw new Error("This purchase was already recorded. Refresh the number inventory.");

  let purchased: Awaited<ReturnType<TwilioNumberClient["incomingPhoneNumbers"]["create"]>>;
  try {
    purchased = await twilioClient().incomingPhoneNumbers.create({
      phoneNumber,
      friendlyName: "Costivra main line",
      voiceUrl: `${getManagePublicBaseUrl()}/api/manage/voice/twiml/incoming`,
      voiceMethod: "POST",
      statusCallback: `${getManagePublicBaseUrl()}/api/manage/voice/twiml/events`,
      statusCallbackMethod: "POST",
    });
  } catch (error) {
    console.error("[manage.voice] Twilio number purchase failed", {
      phone_suffix: phoneNumber.slice(-4),
      ...safeTwilioPurchaseError(error),
    });
    await db.from("internal_voice_side_effects").update({ status: "failed", failure_class: "provider_error", last_error: error instanceof Error ? error.message.slice(0, 500) : "Twilio purchase failed", updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
    throw new Error(getVoiceNumberPurchaseErrorMessage(error));
  }
  const { data: row, error: insertError } = await db.from("internal_voice_numbers").insert({
    twilio_phone_sid: purchased.sid,
    phone_number: phoneNumber,
    friendly_name: purchased.friendlyName ?? "Costivra main line",
    number_type: "local",
    capabilities: purchased.capabilities ?? { voice: true },
    status: "active",
    is_main: false,
    created_by: owner.userId,
    updated_by: owner.userId,
  }).select("id,phone_number,status,is_main").single();
  if (insertError) {
    await db.from("internal_voice_side_effects").update({ status: "failed", failure_class: "reconciliation_required", provider_reference: purchased.sid, last_error: "Twilio purchased the number but Costivra inventory insert failed.", updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
    throw new Error("Twilio purchased the number, but Costivra could not activate it. Review the side-effect ledger before retrying.");
  }
  await db.from("internal_voice_side_effects").update({ status: "sent", provider_reference: purchased.sid, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
  await db.from("internal_audit_events").insert({ actor_id: owner.userId, action: "voice.number_purchased", resource_type: "internal_voice_number", resource_id: row.id, safe_metadata: { phone_number: phoneNumber, twilio_phone_sid: purchased.sid } });
  return row;
}
