import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLifecycleEmailContent, sendLifecycleEmail, type LifecycleEmailSendPayload } from "./lifecycle";

const { claimExternalSideEffect, sendTransactionalEmail } = vi.hoisted(() => ({ claimExternalSideEffect: vi.fn(), sendTransactionalEmail: vi.fn() }));
const sideEffect = { status: "failed", provider_reference: null as string | null };

vi.mock("./resend", () => ({
  emailRequestHash: vi.fn(() => "dummy-request-hash"),
  sendTransactionalEmail,
}));
vi.mock("./side-effect-claim", () => ({ claimExternalSideEffect }));

function dbStub() {
  return {
    from(table: string) {
      if (table !== "external_side_effects") throw new Error(`Unexpected lifecycle table: ${table}`);
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: sideEffect, error: null }) }) }) }),
        upsert: async (row: Record<string, unknown>) => { sideEffect.status = String(row.status); return { error: null }; },
        update: (row: Record<string, unknown>) => ({ eq: async () => { sideEffect.status = String(row.status); sideEffect.provider_reference = typeof row.provider_reference === "string" ? row.provider_reference : sideEffect.provider_reference; return { error: null }; } }),
      };
    },
  } as never;
}

describe("lifecycle email system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sideEffect.status = "failed";
    sideEffect.provider_reference = null;
    sendTransactionalEmail.mockResolvedValue({ ok: true, providerId: "msg_test_1" });
    claimExternalSideEffect.mockResolvedValue({ claimed: true, id: "effect-1" });
    process.env.RESEND_API_KEY = "dummy-resend-api-key-for-tests";
  });

  it("keeps finding copy explicitly potential and not verified", () => {
    const content = buildLifecycleEmailContent("finding_ready", { findingTitle: "Software cost increased", amountCents: 240000 }, "Lewis");
    expect(content.text).toContain("Potential value: $2400.00");
    expect(content.text).toContain("not verified savings");
  });

  it("fails closed when a lifecycle event has no stable source identifier", async () => {
    const result = await sendLifecycleEmail(dbStub(), {
      kind: "forwarding_test_result",
      organizationId: "11111111-1111-4111-8111-111111111111",
      recipientEmail: "owner@example.com",
      payload: { vendorName: "Example Vendor" } as unknown as LifecycleEmailSendPayload,
    });

    expect(result).toEqual({ sent: false, reason: "LIFECYCLE_SOURCE_ID_REQUIRED", deliveryStatus: "failed" });
    expect(claimExternalSideEffect).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("retries a previously failed side effect with the same idempotency key", async () => {
    const result = await sendLifecycleEmail(dbStub(), {
      kind: "expected_bill_missed",
      organizationId: "11111111-1111-4111-8111-111111111111",
      recipientEmail: "owner@example.com",
      payload: { eventKey: "missed-cycle-1", vendorName: "Example Vendor" },
    });
    expect(result.sent).toBe(true);
    expect(sendTransactionalEmail).toHaveBeenCalledOnce();
    expect(sideEffect.status).toBe("sent");
  });
});
