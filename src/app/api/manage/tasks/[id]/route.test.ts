import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));
const completeSequenceTask = vi.hoisted(() => vi.fn());
const cancelSequenceTask = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/worker", () => ({ completeSequenceTask, cancelSequenceTask }));

import { PATCH } from "./route";

const taskId = "11111111-1111-4111-8111-111111111111";

function makeQuery(results: Array<{ data?: unknown; error?: unknown }> = []) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => results.shift() ?? { data: null, error: null }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve, reject),
  };
  return query;
}

function setup(input: {
  current: Record<string, unknown>;
  updated?: Record<string, unknown> | null;
  completion?: boolean;
  cancellation?: boolean;
}) {
  const taskQueries = [
    makeQuery([{ data: input.current, error: null }]),
    makeQuery([{ data: input.updated ?? { organization_id: "org-1", contact_id: "contact-1", title: "Follow up" }, error: null }]),
    makeQuery(),
  ];
  const currentQuery = taskQueries[0];
  const updateQuery = taskQueries[1];
  const revertQuery = taskQueries[2];
  const inserts = {
    crm_activities: vi.fn(async () => ({ error: null })),
    internal_audit_events: vi.fn(async () => ({ error: null })),
  };
  const db = {
    from(table: string) {
      if (table === "crm_tasks") return taskQueries.shift() ?? makeQuery();
      if (table === "crm_activities") return { insert: inserts.crm_activities };
      if (table === "internal_audit_events") return { insert: inserts.internal_audit_events };
      throw new Error(`Unexpected table ${table}`);
    },
  };
  requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });
  completeSequenceTask.mockResolvedValue(input.completion ?? true);
  cancelSequenceTask.mockResolvedValue(input.cancellation ?? true);
  return { db, currentQuery, updateQuery, revertQuery, inserts };
}

function request(status: string, reason?: string) {
  return new Request("https://costivra.ai", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

describe("PATCH /api/manage/tasks/[id]", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    completeSequenceTask.mockReset();
    cancelSequenceTask.mockReset();
  });

  it("does not leave a sequence task completed when its enrollment transition is stale", async () => {
    const { revertQuery } = setup({
      current: { id: taskId, origin: "sequence", task_type: "call_task", status: "open" },
      completion: false,
    });
    const response = await PATCH(request("completed"), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "The sequence task is no longer waiting for completion. Refresh the task list." });
    expect(completeSequenceTask).toHaveBeenCalledWith(expect.anything(), { taskId, actorId: "operator-1" });
    expect(revertQuery.update).toHaveBeenCalled();
  });

  it("advances a sequence task only after the task transition wins", async () => {
    setup({ current: { id: taskId, origin: "sequence", task_type: "call_task", status: "open" } });
    const response = await PATCH(request("completed"), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(200);
    expect(completeSequenceTask).toHaveBeenCalledTimes(1);
  });

  it("stops the enrollment when a waiting sequence task is cancelled", async () => {
    setup({ current: { id: taskId, origin: "sequence", task_type: "call_task", status: "open" } });
    const response = await PATCH(request("cancelled", "No longer relevant"), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(200);
    expect(cancelSequenceTask).toHaveBeenCalledWith(expect.anything(), { taskId, actorId: "operator-1", reason: "No longer relevant" });
  });

  it("requires an explicit reason before cancelling a sequence task", async () => {
    setup({ current: { id: taskId, origin: "sequence", task_type: "call_task", status: "open" } });
    const response = await PATCH(request("cancelled"), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(400);
    expect(cancelSequenceTask).not.toHaveBeenCalled();
  });

  it("is idempotent for a task already completed", async () => {
    const { updateQuery } = setup({ current: { id: taskId, origin: "sequence", task_type: "call_task", status: "completed" } });
    const response = await PATCH(request("completed"), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
    expect(updateQuery.update).not.toHaveBeenCalled();
  });
});
