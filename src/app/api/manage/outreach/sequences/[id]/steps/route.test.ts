import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";
const firstStepId = "22222222-2222-4222-8222-222222222222";
const secondStepId = "33333333-3333-4333-8333-333333333333";
const insertedStepId = "44444444-4444-4444-8444-444444444444";

type StepRow = { id: string; position: number; [key: string]: unknown };

function makeDb(initialSteps: StepRow[] = [
  { id: firstStepId, position: 1 },
  { id: secondStepId, position: 2 },
]) {
  const steps = initialSteps.map((step) => ({ ...step }));
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];

  const db = {
    from(table: string) {
      let operation: "select" | "update" | "insert" = "select";
      let payload: Record<string, unknown> = {};
      const filters = new Map<string, unknown>();
      let stepWasInserted = false;

      const result: Record<string, unknown> = {};
      result.select = () => result;
      result.eq = (column: string, value: unknown) => {
        filters.set(column, value);
        return result;
      };
      result.order = () => result;
      result.maybeSingle = async () => ({
        data: table === "crm_sequences" ? { id: sequenceId, status: "draft" } : null,
        error: null,
      });
      result.update = (nextPayload: Record<string, unknown>) => {
        operation = "update";
        payload = nextPayload;
        return result;
      };
      result.insert = (nextPayload: Record<string, unknown>) => {
        operation = "insert";
        payload = nextPayload;
        return result;
      };
      result.single = async () => {
        if (table !== "crm_sequence_steps" || operation !== "insert") return { data: null, error: null };
        if (!stepWasInserted) {
          const row = { ...payload, id: insertedStepId } as StepRow;
          steps.push(row);
          inserts.push({ ...payload });
          stepWasInserted = true;
        }
        return { data: { id: insertedStepId }, error: null };
      };
      result.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        if (table === "crm_sequence_steps" && operation === "update") {
          const id = filters.get("id");
          const row = steps.find((step) => step.id === id);
          if (!row) return Promise.resolve({ data: null, error: new Error("missing") }).then(resolve, reject);
          Object.assign(row, payload);
          updates.push({ id: String(id), payload: { ...payload } });
          return Promise.resolve({ data: row, error: null }).then(resolve, reject);
        }
        if (table === "crm_sequence_steps" && operation === "select") {
          return Promise.resolve({ data: [...steps].sort((left, right) => left.position - right.position), error: null }).then(resolve, reject);
        }
        if (table === "internal_audit_events" && operation === "insert") {
          audits.push({ ...payload });
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      };
      return result;
    },
  };

  return { db, steps, updates, inserts, audits };
}

function emailStep(overrides: Record<string, unknown> = {}) {
  return {
    stepType: "automatic_email",
    delayValue: 2,
    delayUnit: "business_days",
    threadMode: "new_thread",
    subjectTemplate: "A quick question",
    bodyText: "Hi {{first_name}},",
    ...overrides,
  };
}

describe("POST sequence steps", () => {
  beforeEach(() => {
    manageApiError.mockClear();
  });

  it("inserts a draft step immediately after the requested connector and normalizes positions", async () => {
    const { db, steps, inserts, audits } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: JSON.stringify(emailStep({ afterStepId: firstStepId })) }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: insertedStepId, position: 2 });
    expect(steps.sort((left, right) => left.position - right.position).map((step) => step.id)).toEqual([firstStepId, insertedStepId, secondStepId]);
    expect(steps.sort((left, right) => left.position - right.position).map((step) => step.position)).toEqual([1, 2, 3]);
    expect(inserts).toHaveLength(1);
    expect(audits).toEqual([expect.objectContaining({
      action: "crm.sequence_step_created",
      safe_metadata: { sequence_id: sequenceId, position: 2, after_step_id: firstStepId },
    })]);
  });

  it("keeps append behavior when the builder omits afterStepId", async () => {
    const { db, steps, inserts } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: JSON.stringify(emailStep()) }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: insertedStepId, position: 3 });
    expect(steps.sort((left, right) => left.position - right.position).map((step) => step.id)).toEqual([firstStepId, secondStepId, insertedStepId]);
    expect(inserts).toHaveLength(1);
  });

  it("makes the first step immediate even if the add-step popover includes a delay", async () => {
    const { db, steps, inserts } = makeDb([]);
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: JSON.stringify(emailStep({ delayValue: 4 })) }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: insertedStepId, position: 1 });
    expect(inserts[0]).toEqual(expect.objectContaining({ delay_value: 0 }));
    expect(steps).toEqual([expect.objectContaining({ id: insertedStepId, position: 1 })]);
  });

  it("refuses an insertion anchor from another sequence before changing the current sequence", async () => {
    const { db, steps, updates, inserts, audits } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: JSON.stringify(emailStep({ afterStepId: insertedStepId })) }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "That step is not part of this sequence." });
    expect(steps).toEqual([{ id: firstStepId, position: 1 }, { id: secondStepId, position: 2 }]);
    expect(updates).toHaveLength(0);
    expect(inserts).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });

  it("rejects a malformed insertion anchor before querying or mutating steps", async () => {
    const { db, updates, inserts } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: JSON.stringify(emailStep({ afterStepId: "not-a-uuid" })) }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Choose a valid step to insert after." });
    expect(updates).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });
});
