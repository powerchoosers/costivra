import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const enrollmentId = "11111111-1111-4111-8111-111111111111";
const sequenceId = "22222222-2222-4222-8222-222222222222";

function makeQuery(results: Array<{ data: unknown; error: unknown }>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => results.shift() ?? { data: null, error: null }),
  };
  return query;
}

describe("POST /api/manage/outreach/enrollments/[id]/resume", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
  });

  it("resumes only against an active executing sequence and schedules immediate work", async () => {
    const enrollmentQuery = makeQuery([
      { data: { id: enrollmentId, sequence_id: sequenceId, state: "paused", lock_token: null }, error: null },
      { data: { id: enrollmentId, state: "active", next_action_at: "2026-08-09T12:00:00.000Z" }, error: null },
    ]);
    const sequenceQuery = makeQuery([{ data: { status: "active", execution_enabled: true }, error: null }]);
    const eventInsert = vi.fn(async () => ({ error: null }));
    const db = {
      from(table: string) {
        if (table === "crm_sequence_enrollments") return enrollmentQuery;
        if (table === "crm_sequences") return sequenceQuery;
        if (table === "crm_sequence_events") return { insert: eventInsert };
        throw new Error(`Unexpected table ${table}`);
      },
    };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: enrollmentId }) });
    expect(response.status).toBe(200);
    expect(enrollmentQuery.update).toHaveBeenCalledWith(expect.objectContaining({ state: "active", next_action_at: expect.any(String) }));
    expect(eventInsert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "resumed" }));
  });

  it("does not race a worker that already owns the enrollment claim", async () => {
    const enrollmentQuery = makeQuery([{ data: { id: enrollmentId, sequence_id: sequenceId, state: "paused", lock_token: "worker-lock" }, error: null }]);
    const db = { from: vi.fn(() => enrollmentQuery) };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: enrollmentId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "That enrollment is being processed. Try again in a moment." });
    expect(enrollmentQuery.update).not.toHaveBeenCalled();
  });
});
