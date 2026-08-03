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

function database(options: { claimError?: boolean } = {}) {
  const finalized: Array<Record<string, unknown>> = [];
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
    rpc: vi.fn().mockResolvedValue(
      options.claimError
        ? { data: null, error: { message: "claim failed" } }
        : { data: [], error: null },
    ),
  };
  return { db, finalized };
}

describe("GET /api/cron/inbound-email", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret-for-test");
    monitorInboundEmailQueue.mockReset();
    monitorInboundEmailQueue.mockResolvedValue({ inspected: 0, incidents: 0, created: 0 });
    createServerSupabaseClient.mockReset();
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
});
