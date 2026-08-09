import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stopEnrollmentForReason = vi.hoisted(() => vi.fn());
vi.mock("./lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lifecycle")>()),
  stopEnrollmentForReason,
}));

import { cancelSequenceTask, processClaimedSequenceEnrollment } from "./worker";

function makeQuery(result: { data: unknown; error: unknown }, singleResult = result) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => singleResult),
  };
  return query;
}

describe("sequence task cancellation", () => {
  beforeEach(() => stopEnrollmentForReason.mockReset().mockResolvedValue(true));

  it("stops a waiting sequence enrollment with an auditable failure transition", async () => {
    const taskQuery = makeQuery({ data: { origin: "sequence", sequence_id: "sequence-1", sequence_enrollment_id: "enrollment-1", sequence_step_id: "step-1" }, error: null });
    const enrollmentQuery = makeQuery({ data: { state: "waiting_for_task" }, error: null });
    const db = {
      from(table: string) {
        if (table === "crm_tasks") return taskQuery;
        if (table === "crm_sequence_enrollments") return enrollmentQuery;
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(cancelSequenceTask(db as never, { taskId: "task-1", actorId: "operator-1", reason: "No longer relevant" })).resolves.toBe(true);
    expect(stopEnrollmentForReason).toHaveBeenCalledWith(db, expect.objectContaining({
      enrollmentId: "enrollment-1",
      reason: "failure",
      eventType: "failed",
      safeMetadata: expect.objectContaining({ operator_reason: "No longer relevant" }),
    }));
  });

  it("does not stop an enrollment that is no longer waiting for the task", async () => {
    const taskQuery = makeQuery({ data: { origin: "sequence", sequence_id: "sequence-1", sequence_enrollment_id: "enrollment-1", sequence_step_id: "step-1" }, error: null });
    const enrollmentQuery = makeQuery({ data: { state: "active" }, error: null });
    const db = {
      from(table: string) {
        if (table === "crm_tasks") return taskQuery;
        if (table === "crm_sequence_enrollments") return enrollmentQuery;
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(cancelSequenceTask(db as never, { taskId: "task-1", actorId: "operator-1", reason: "No longer relevant" })).resolves.toBe(false);
    expect(stopEnrollmentForReason).not.toHaveBeenCalled();
  });

  it("parks a claimed enrollment when its sequence is paused instead of reclaiming it forever", async () => {
    const enrollmentQuery = makeQuery({ data: { id: "enrollment-1", sequence_id: "sequence-1" }, error: null });
    const sequenceQuery = makeQuery({ data: { id: "sequence-1", status: "paused", execution_enabled: false }, error: null });
    const eventQuery = makeQuery({ data: null, error: null }, { data: { id: "event-1" }, error: null });
    const db = {
      from(table: string) {
        if (table === "crm_sequence_enrollments") return enrollmentQuery;
        if (table === "crm_sequences") return sequenceQuery;
        if (table === "crm_sequence_events") return eventQuery;
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(processClaimedSequenceEnrollment(db as never, {
      id: "enrollment-1",
      lock_token: "lock-1",
      attempt_count: 1,
    })).resolves.toEqual({ status: "skipped", reason: "SEQUENCE_NOT_ACTIVE" });
    expect(enrollmentQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      state: "paused",
      next_action_at: null,
      last_error_code: "SEQUENCE_NOT_ACTIVE",
    }));
    expect(eventQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "paused" }));
  });
});
