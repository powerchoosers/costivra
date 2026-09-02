const EMERGENCY_NUMBERS = new Set(["+112", "+911", "+1911"]);

export const VOICE_NUMBER_INVENTORY_UNAVAILABLE = "VOICE_NUMBER_INVENTORY_UNAVAILABLE";

export function isVoiceNumberInventorySchemaError(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate?.code === "42P01" && /internal_voice_(numbers|number_routes)/i.test(String(candidate.message ?? ""));
}

export function isTwilioTrialRestriction(error: unknown) {
  const candidate = error as { message?: unknown };
  return /feature is not available on a trial account/i.test(String(candidate?.message ?? ""));
}

export function normalizeVoiceNumber(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits === "911") return "+1911";
  if (digits === "112") return "+112";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function allowedVoicePrefixes(value: string | null | undefined) {
  return String(value || "+1")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter((prefix) => /^\+\d{1,4}$/.test(prefix));
}

export function assertAllowedVoiceNumber(
  value: string | null | undefined,
  prefixes = allowedVoicePrefixes(process.env.COSTIVRA_TWILIO_ALLOWED_PREFIXES),
) {
  const normalized = normalizeVoiceNumber(value);
  if (!normalized) {
    throw new Error("Enter a valid phone number, including area code.");
  }
  if (EMERGENCY_NUMBERS.has(normalized)) {
    throw new Error("Emergency calling is not supported by the Costivra browser phone.");
  }
  if (!prefixes.length || !prefixes.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error("That destination is outside the calling regions enabled for Costivra.");
  }
  return normalized;
}

export function formatVoiceNumber(value: string | null | undefined) {
  const normalized = normalizeVoiceNumber(value);
  if (!normalized) return value?.trim() || "Unknown number";
  if (/^\+1\d{10}$/.test(normalized)) {
    return `(${normalized.slice(2, 5)}) ${normalized.slice(5, 8)}-${normalized.slice(8)}`;
  }
  return normalized;
}
