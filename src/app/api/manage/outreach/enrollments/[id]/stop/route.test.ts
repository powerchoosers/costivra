import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const enrollmentId = "11111111-1111-4111-8111-111111111111";

function makeQuery(results: Array<{ data: unknown; error: unknown }>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => results.shift() ?? { data: null, error: null }),
  };
  return query;
}

describe("POST /api/manage/outreach/enrollments/[id]/stop", () => {
  beforeEach(() => requireInternalOperator.mockReset());

  it("clears scheduling and records the operator stop event", async () => {
    const enrollmentQuery = makeQuery([
      { data: { id: enrollmentId, sequence_id: "22222222-2222-4222-8222-222222222222", state: "paused", lock_token: null }, error: null },
      { data: { id: enrollmentId, state: "stopped", stop_reason: "No longer relevant" }, error: null },
    ]);
    const eventInsert = vi.fn(async () => ({ error: null }));
    const db = {
      from(table: string) {
        if (table === "crm_sequence_enrollments") return enrollmentQuery;
        if (table === "crm_sequence_events") return { insert: eventInsert };
        throw new Error(`Unexpected table ${table}`);
      },
    };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(new Request("https://costivra.ai", {
      method: "POST",
      body: JSON.stringify({ reason: "No longer relevant" }),
      headers: { "content-type": "application/json" },
    }), { params: Promise.resolve({ id: enrollmentId }) });
    expect(response.status).toBe(200);
    expect(enrollmentQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      state: "stopped",
      next_action_at: null,
      lock_token: null,
      locked_at: null,
    }));
    expect(eventInsert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "stopped" }));
  });
});
