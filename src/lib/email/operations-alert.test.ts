import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOperationsAlertEmail, deliverOperationsAlert } from "./operations-alert";

const { sendTransactionalEmail } = vi.hoisted(() => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({
  emailRequestHash: vi.fn(() => "hash-test"),
  sendTransactionalEmail,
}));

const alert = {
  id: "alert-1",
  signalKey: "worker:inbound-stale",
  severity: "warning" as const,
  category: "system" as const,
  title: "Inbound worker health needs attention",
  message: "safe internal message",
  metadata: { activation_generation: 2 },
  status: "active" as const,
  firstSeenAt: "2026-08-17T10:00:00Z",
  lastSeenAt: "2026-08-17T10:05:00Z",
  occurrenceCount: 1,
  resolvedAt: null,
  createdAt: "2026-08-17T10:00:00Z",
};

describe("operations alert email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.COSTIVRA_OPERATIONS_ALERT_EMAIL;
  });

  it("contains only safe alert fields and the operations link", () => {
    const email = buildOperationsAlertEmail(alert, "ops@example.com");
    expect(email.text).toContain("worker:inbound-stale");
    expect(email.text).toContain("https://costivra.ai/manage/operations");
    expect(email.text).not.toContain("safe internal message");
    expect(email.html).not.toContain("metadata");
  });

  it("does not send when the monitored recipient is not configured", async () => {
    const result = await deliverOperationsAlert({} as never, alert);
    expect(result).toEqual({ status: "missing_recipient" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
