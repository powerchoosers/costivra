import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const processInboundEmailJob = vi.hoisted(() => vi.fn());
const recordInboundEmailJobFailure = vi.hoisted(() => vi.fn());
const recordInboundEmailJobYield = vi.hoisted(() => vi.fn());
const isInboundEmailBudgetYield = vi.hoisted(() => vi.fn());
const monitorInboundEmailQueue = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email/inbound-intake", () => ({
  processInboundEmailJob,
  recordInboundEmailJobFailure,
  recordInboundEmailJobYield,
  isInboundEmailBudgetYield,
}));
vi.mock("@/lib/email/inbound-monitor", () => ({ monitorInboundEmailQueue }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { GET } from "@/app/api/cron/inbound-email/route";

function database(options: { claimError?: boolean; claimResults?: unknown[][] } = {}) {
  const finalized: Array<Record<string, unknown>> = [];
  let claimIndex = 0;
  const db = {
    from: vi.fn((table: string) => {
      expect(table).toBe("inbound_worker_runs");
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "run-1" }, error: null }),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => {
          finalized.push(payload);
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        }),
      };
    }),
    rpc: vi.fn(async () => {
      if (options.claimError) return { data: null, error: { message: "claim failed" } };
      const results = options.claimResults ?? [[]];
      const data = results[Math.min(claimIndex++, results.length - 1)] ?? [];
      return { data, error: null };
    }),
  };
  return { db, finalized };
}

describe("GET /api/cron/inbound-email", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret-for-test");
    monitorInboundEmailQueue.mockReset();
    monitorInboundEmailQueue.mockResolvedValue({ inspected: 0, incidents: 0, created: 0 });
    createServerSupabaseClient.mockReset();
    processInboundEmailJob.mockReset();
    recordInboundEmailJobFailure.mockReset();
    recordInboundEmailJobYield.mockReset();
    isInboundEmailBudgetYield.mockReset();
  });

  it("records a successful worker heartbeat even when no jobs are queued", async () => {
    const { db, finalized } = database();
    createServerSupabaseClient.mockReturnValue(db);

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer cron-secret-for-test" },
    }));

    expect(response.status).toBe(200);
    expect(finalized).toContainEqual(expect.objectContaining({
      status: "completed",
      claimed_count: 0,
      results: [],
    }));
  });

  it("does not process the same claimed work twice across duplicate cron invocations", async () => {
    const job = {
      id: "event-1",
      organization_id: "org-1",
      intake_address_id: "intake-1",
      resend_email_id: "resend-1",
      sender_address: "billing@example.com",
      subject: "Synthetic invoice",
      attachment_count: 1,
      attempt_count: 0,
      max_attempts: 5,
      lock_token: "lock-1",
    };
    const { db, finalized } = database({ claimResults: [[job], []] });
    createServerSupabaseClient.mockReturnValue(db);
    processInboundEmailJob.mockResolvedValue({ status: "processed" });

    const request = new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer cron-secret-for-test" },
    });
    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(processInboundEmailJob).toHaveBeenCalledTimes(1);
    expect(finalized).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "completed", claimed_count: 1 }),
      expect.objectContaining({ status: "completed", claimed_count: 0 }),
    ]));
  });

  it("does not retry completed invoice work when alert monitoring is degraded", async () => {
    const { db, finalized } = database();
    createServerSupabaseClient.mockReturnValue(db);
    monitorInboundEmailQueue.mockRejectedValue(new Error("notification table unavailable"));

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer cron-secret-for-test" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      monitoring: { status: "degraded", error: "notification_monitor_failed" },
    }));
    expect(finalized).toContainEqual(expect.objectContaining({
      status: "completed_with_warnings",
    }));
  });

  it("supports alternate cron headers for token transport", async () => {
    const { db } = database();
    createServerSupabaseClient.mockReturnValue(db);

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { "x-cron-secret": "cron-secret-for-test" },
    }));

    expect(response.status).toBe(200);
  });

  it("supports lowercase bearer token prefix", async () => {
    const { db } = database();
    createServerSupabaseClient.mockReturnValue(db);

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "bearer cron-secret-for-test" },
    }));

    expect(response.status).toBe(200);
  });

  it("supports token via query param for controlled debug/manual invocations", async () => {
    const { db } = database();
    createServerSupabaseClient.mockReturnValue(db);

    const response = await GET(
      new Request("https://costivra.ai/api/cron/inbound-email?secret=cron-secret-for-test", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
  });

  it("records a safe failure category when queue claiming fails", async () => {
    const { db, finalized } = database({ claimError: true });
    createServerSupabaseClient.mockReturnValue(db);

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer cron-secret-for-test" },
    }));

    expect(response.status).toBe(500);
    expect(finalized).toContainEqual(expect.objectContaining({
      status: "failed",
      error_code: "queue_claim_failed",
    }));
  });

  it("rejects placeholder cron secrets", async () => {
    const { db, finalized } = database();
    createServerSupabaseClient.mockReturnValue(db);
    vi.stubEnv("CRON_SECRET", "placeholder");

    const response = await GET(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer placeholder" },
    }));

    expect(response.status).toBe(401);
    expect(finalized).toEqual([]);
  });
});
