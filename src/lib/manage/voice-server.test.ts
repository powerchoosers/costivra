import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getManageTwilioReadiness,
  getManageTwilioProvisioningConfig,
  manageVoiceOperatorIdentity,
  sanitizeVoiceIdentity,
  signVoiceOperator,
  validRecordingSid,
  validateManageTwilioWebhook,
  verifyVoiceOperator,
} from "@/lib/manage/voice-server";

const KEYS = [
  "COSTIVRA_TWILIO_ACCOUNT_SID",
  "COSTIVRA_TWILIO_AUTH_TOKEN",
  "COSTIVRA_TWILIO_API_KEY_SID",
  "COSTIVRA_TWILIO_API_KEY_SECRET",
  "COSTIVRA_TWILIO_TWIML_APP_SID",
  "COSTIVRA_TWILIO_PHONE_NUMBER",
] as const;
const original = new Map(KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.COSTIVRA_TWILIO_ACCOUNT_SID = "ACdummyaccountsid";
  process.env.COSTIVRA_TWILIO_AUTH_TOKEN = "dummy-twilio-auth-token-for-unit-tests";
  process.env.COSTIVRA_TWILIO_API_KEY_SID = "SKdummyapikeysid";
  process.env.COSTIVRA_TWILIO_API_KEY_SECRET = "dummy-twilio-api-key-secret-for-unit-tests";
  process.env.COSTIVRA_TWILIO_TWIML_APP_SID = "APdummytwimlappsid";
  process.env.COSTIVRA_TWILIO_PHONE_NUMBER = "+12145550123";
});

afterEach(() => {
  for (const key of KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("manage Twilio server policy", () => {
  it("reports missing server configuration without exposing values", async () => {
    delete process.env.COSTIVRA_TWILIO_API_KEY_SECRET;
    await expect(getManageTwilioReadiness()).resolves.toEqual({
      configured: false,
      missing: ["COSTIVRA_TWILIO_API_KEY_SECRET"],
      phoneNumber: "+12145550123",
    });
  });

  it("allows number provisioning before a TwiML App exists", () => {
    delete process.env.COSTIVRA_TWILIO_TWIML_APP_SID;
    expect(getManageTwilioProvisioningConfig()).toEqual({
      accountSid: "ACdummyaccountsid",
      authToken: "dummy-twilio-auth-token-for-unit-tests",
    });
  });

  it("uses Twilio-compatible identities", () => {
    expect(sanitizeVoiceIdentity("Costivra owner / Lewis")).toBe("Costivra_owner___Lewis");
    expect(sanitizeVoiceIdentity(" ")).toBe("costivra_manage");
    expect(manageVoiceOperatorIdentity("11111111-1111-4111-8111-111111111111")).toBe("costivra_operator_11111111111141118111111111111111");
  });

  it("binds an outbound attribution signature to the operator", () => {
    const operatorId = "11111111-1111-4111-8111-111111111111";
    const signature = signVoiceOperator(operatorId, "LEWIS@EXAMPLE.COM");
    expect(verifyVoiceOperator(operatorId, "lewis@example.com", signature)).toBe(true);
    expect(verifyVoiceOperator("22222222-2222-4222-8222-222222222222", "lewis@example.com", signature)).toBe(false);
    expect(verifyVoiceOperator(operatorId, "other@example.com", signature)).toBe(false);
  });

  it("accepts only Twilio recording SIDs for playback", () => {
    expect(validRecordingSid("RE11111111111111111111111111111111")).toBe("RE11111111111111111111111111111111");
    expect(validRecordingSid("CA11111111111111111111111111111111")).toBeNull();
    expect(validRecordingSid("https://api.twilio.com/recording.mp3")).toBeNull();
  });

  it("fails closed when webhook configuration is absent", () => {
    delete process.env.COSTIVRA_TWILIO_ACCOUNT_SID;
    const request = new Request("https://costivra.ai/api/manage/voice/twiml/incoming", {
      method: "POST",
      headers: { "x-twilio-signature": "invalid" },
    });
    expect(validateManageTwilioWebhook(request, {})).toBe(false);
  });
});
