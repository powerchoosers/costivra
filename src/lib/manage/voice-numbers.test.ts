import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOwner = vi.hoisted(() => vi.fn());
const twilioClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner }));
vi.mock("@/lib/manage/voice-server", () => ({
  getManagePublicBaseUrl: () => "https://costivra.ai",
  getManageTwilioProvisioningConfig: () => ({ accountSid: "ACdummy", authToken: "dummy" }),
}));
vi.mock("twilio", () => ({ default: twilioClient }));

import { getVoiceNumberPurchaseErrorMessage, purchaseVoiceNumber } from "@/lib/manage/voice-numbers";

describe("purchaseVoiceNumber", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset();
    twilioClient.mockReset();
  });

  it("turns a Trust Hub rejection into an actionable owner message", () => {
    expect(getVoiceNumberPurchaseErrorMessage({ message: "Primary compliance profile is not approved. Complete the KYC process in Trust Hub." })).toContain("approved Trust Hub compliance profile");
  });

  it("claims the internal voice ledger without assigning a tenant organization", async () => {
    const tables: string[] = [];
    const sideEffectRows: Record<string, unknown>[] = [];
    const db = {
      from(table: string) {
        tables.push(table);
        if (table === "internal_voice_numbers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: "number-1", phone_number: "+18175550123", status: "active", is_main: false }, error: null })) })),
            })),
          };
        }
        if (table === "internal_voice_side_effects") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
            })),
            upsert: vi.fn((row: Record<string, unknown>) => {
              sideEffectRows.push(row);
              return { select: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { id: "effect-1", status: "claimed", provider_reference: null }, error: null })) })) };
            }),
            update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
          };
        }
        if (table === "internal_audit_events") return { insert: vi.fn(async () => ({ data: null, error: null })) };
        throw new Error(`Unexpected table: ${table}`);
      },
    };
    requireInternalOwner.mockResolvedValue({ db, userId: "owner-1", role: "owner" });
    twilioClient.mockReturnValue({
      incomingPhoneNumbers: {
        create: vi.fn(async () => ({ sid: "PNdummy", phoneNumber: "+18175550123", friendlyName: "Costivra main line", capabilities: { voice: true } })),
      },
    });

    await purchaseVoiceNumber({ phoneNumber: "+1 (817) 555-0123", confirmed: true, actorId: "owner-1" });

    expect(tables).not.toContain("external_side_effects");
    expect(tables).toContain("internal_voice_side_effects");
    expect(sideEffectRows[0]).toMatchObject({
      type: "twilio_number_purchase",
      destination: "+18175550123",
      status: "claimed",
      authorization_method: "explicit_purchase_action",
    });
    expect(sideEffectRows[0]).not.toHaveProperty("organization_id");
  });
});
