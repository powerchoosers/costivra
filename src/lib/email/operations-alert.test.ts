import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOperationsAlertEmail, deliverOperationsAlert } from "./operations-alert";

const { sendTransactionalEmail } = vi.hoisted(() => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({
  emailRequestHash: vi.fn(() => "hash-test"),
  sendTransactionalEmail,
}));

type DeliveryRow = {
  id: string;
  alert_id: string;
  idempotency_key: string;
  notification_kind: string;
  recipient: string;
  request_hash: string;
  status: string;
  provider_reference?: string;
  safe_error?: string;
  attempt_count: number;
  last_attempt_at?: string;
};

function makeDb(initial: DeliveryRow[] = [], insertConflict = false) {
  const rows = [...initial];
  let nextId = rows.length + 1;
  const db = {
    from: vi.fn(() => {
      const filters: Record<string, unknown> = {};
      let operation: "select" | "insert" | "update" = "select";
      let payload: Record<string, unknown> = {};
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((key: string, value: unknown) => {
          filters[key] = value;
          return query;
        }),
        insert: vi.fn((value: Record<string, unknown>) => {
          operation = "insert";
          payload = value;
          return query;
        }),
        update: vi.fn((value: Record<string, unknown>) => {
          operation = "update";
          payload = value;
          return query;
        }),
        maybeSingle: vi.fn(async () => {
          const row = rows.find((item) => Object.entries(filters).every(([key, value]) => item[key as keyof DeliveryRow] === value));
          if (operation === "update" && row) Object.assign(row, payload);
          return { data: row ?? null, error: null };
        }),
        single: vi.fn(async () => {
          if (operation === "insert" && insertConflict) return { data: null, error: { code: "23505" } };
          const row = { id: `delivery-${nextId++}`, ...payload } as DeliveryRow;
          rows.push(row);
          return { data: row, error: null };
        }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
          try {
            const row = rows.find((item) => Object.entries(filters).every(([key, value]) => item[key as keyof DeliveryRow] === value));
            if (operation === "update" && row) Object.assign(row, payload);
            return Promise.resolve({ data: row ?? null, error: null }).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).catch(reject);
          }
        },
      };
      return query;
    }),
    rows,
  };
  return db;
}

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
    process.env.COSTIVRA_OPERATIONS_ALERT_EMAIL = "ops@example.com";
    delete process.env.COSTIVRA_ALERT_REMINDER_MINUTES;
    sendTransactionalEmail.mockResolvedValue({ ok: true, providerId: "resend-1" });
  });

  it("contains only safe alert fields and the operations link", () => {
    const email = buildOperationsAlertEmail(alert, "ops@example.com");
    expect(email.text).toContain("worker:inbound-stale");
    expect(email.text).toContain("https://costivra.ai/manage/operations");
    expect(email.text).not.toContain("safe internal message");
    expect(email.html).not.toContain("metadata");
  });

  it("sends one activation with the stable idempotency key", async () => {
    const db = makeDb();
    const result = await deliverOperationsAlert(db as never, alert);
    expect(result).toEqual({ status: "sent", providerReference: "resend-1" });
    expect(sendTransactionalEmail).toHaveBeenCalledOnce();
    expect(sendTransactionalEmail.mock.calls[0][0].idempotencyKey).toBe("operations-alert:worker:inbound-stale:2:activation");
    expect(db.rows[0].status).toBe("sent");
  });

  it("does not duplicate a successful activation", async () => {
    const db = makeDb([{
      id: "delivery-1", alert_id: "alert-1", idempotency_key: "operations-alert:worker:inbound-stale:2:activation",
      notification_kind: "activation", recipient: "ops@example.com", request_hash: "hash-test", status: "sent", provider_reference: "resend-old", attempt_count: 1,
    }]);
    const result = await deliverOperationsAlert(db as never, alert);
    expect(result).toEqual({ status: "duplicate", providerReference: "resend-old" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("throttles a failed reminder inside the configured window", async () => {
    process.env.COSTIVRA_ALERT_REMINDER_MINUTES = "60";
    const db = makeDb([{
      id: "delivery-1", alert_id: "alert-1", idempotency_key: "operations-alert:worker:inbound-stale:2:reminder",
      notification_kind: "reminder", recipient: "ops@example.com", request_hash: "hash-test", status: "failed", attempt_count: 1,
      last_attempt_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    }]);
    const result = await deliverOperationsAlert(db as never, { ...alert, occurrenceCount: 2 });
    expect(result).toEqual({ status: "throttled" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("escalates immediately when severity increases", async () => {
    const db = makeDb();
    const result = await deliverOperationsAlert(db as never, {
      ...alert,
      severity: "critical",
      metadata: { activation_generation: 2, previous_severity: "warning" },
    });
    expect(result.status).toBe("sent");
    expect(sendTransactionalEmail.mock.calls[0][0].idempotencyKey).toContain(":escalation");
  });

  it("keeps provider failure visible and retries a raced failed claim", async () => {
    sendTransactionalEmail.mockResolvedValueOnce({ ok: false, error: "EMAIL_PROVIDER_UNAVAILABLE" });
    const firstDb = makeDb();
    await expect(deliverOperationsAlert(firstDb as never, alert)).resolves.toEqual({ status: "failed", reason: "EMAIL_PROVIDER_UNAVAILABLE" });
    expect(firstDb.rows[0].status).toBe("failed");

    const racedDb = makeDb([{
      id: "delivery-1", alert_id: "alert-1", idempotency_key: "operations-alert:worker:inbound-stale:2:activation",
      notification_kind: "activation", recipient: "ops@example.com", request_hash: "hash-test", status: "failed", attempt_count: 1,
    }], true);
    await expect(deliverOperationsAlert(racedDb as never, alert)).resolves.toEqual({ status: "sent", providerReference: "resend-1" });
    expect(racedDb.rows[0].status).toBe("sent");
  });

  it("does not send when the monitored recipient is not configured", async () => {
    delete process.env.COSTIVRA_OPERATIONS_ALERT_EMAIL;
    const result = await deliverOperationsAlert({} as never, alert);
    expect(result).toEqual({ status: "missing_recipient" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
