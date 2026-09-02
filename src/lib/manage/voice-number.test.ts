import { describe, expect, it } from "vitest";
import {
  allowedVoicePrefixes,
  assertAllowedVoiceNumber,
  formatVoiceNumber,
  normalizeVoiceNumber,
  isVoiceNumberInventorySchemaError,
  isTwilioTrialRestriction,
} from "@/lib/manage/voice-number";

describe("manage voice number policy", () => {
  it("normalizes supported North American display shapes", () => {
    expect(normalizeVoiceNumber("(214) 555-0123")).toBe("+12145550123");
    expect(normalizeVoiceNumber("1-214-555-0123")).toBe("+12145550123");
    expect(formatVoiceNumber("+12145550123")).toBe("(214) 555-0123");
  });

  it("retains explicitly international E.164 numbers", () => {
    expect(normalizeVoiceNumber("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("rejects malformed, emergency, and disallowed destinations", () => {
    expect(() => assertAllowedVoiceNumber("555", ["+1"])).toThrow("valid phone number");
    expect(() => assertAllowedVoiceNumber("911", ["+1"])).toThrow("Emergency calling");
    expect(() => assertAllowedVoiceNumber("+442079460958", ["+1"])).toThrow("outside the calling regions");
  });

  it("ignores unsafe allowed-prefix configuration", () => {
    expect(allowedVoicePrefixes("+1, +44, *, +12345")).toEqual(["+1", "+44"]);
  });

  it("recognizes an unapplied voice inventory migration without masking other errors", () => {
    expect(isVoiceNumberInventorySchemaError({ code: "42P01", message: "relation internal_voice_numbers does not exist" })).toBe(true);
    expect(isVoiceNumberInventorySchemaError({ code: "42501", message: "permission denied" })).toBe(false);
  });

  it("recognizes Twilio trial-only number inventory errors", () => {
    expect(isTwilioTrialRestriction({ message: "This feature is not available on a Trial account. Please upgrade your account to gain access." })).toBe(true);
    expect(isTwilioTrialRestriction({ message: "Authentication failed" })).toBe(false);
  });
});
