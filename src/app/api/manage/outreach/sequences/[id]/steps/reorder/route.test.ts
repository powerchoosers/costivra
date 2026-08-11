import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";
const originalFirstStepId = "22222222-2222-4222-8222-222222222222";
const laterStepId = "33333333-3333-4333-8333-333333333333";

type StepRow = { id: string; position: number; delay_value: number };

function makeDb(initialSteps: StepRow[]) {
  const steps = initialSteps.map((step) => ({ ...step }));
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  const db = {
    from(table: string) {
      let operation: "select" | "update" = "select";
      let payload: Record<string, unknown> = {};
      const filters = new Map<string, unknown>();
      const result: Record<string, unknown> = {};

      result.select = () => result;
      result.eq = (column: string, value: unknown) => {
        filters.set(column, value);
        return result;
      };
      result.maybeSingle = async () => ({
        data: table === "crm_sequences" ? { id: sequenceId, status: "draft" } : null,
        error: null,
      });
      result.update = (nextPayload: Record<string, unknown>) => {
        operation = "update";
        payload = nextPayload;
        return result;
      };
      result.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        if (table === "crm_sequence_steps" && operation === "select") {
          return Promise.resolve({ data: steps.map((step) => ({ id: step.id })), error: null }).then(resolve, reject);
        }
        if (table === "crm_sequence_steps" && operation === "update") {
          const id = String(filters.get("id"));
          const step = steps.find((candidate) => candidate.id === id);
          if (!step) return Promise.resolve({ data: null, error: new Error("missing step") }).then(resolve, reject);
          Object.assign(step, payload);
          updates.push({ id, payload: { ...payload } });
          return Promise.resolve({ data: step, error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      };
      return result;
    },
  };

  return { db, steps, updates };
}

describe("POST sequence step reorder", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    manageApiError.mockClear();
  });

  it("makes a later step immediate when it is moved into the first position", async () => {
    const { db, steps, updates } = makeDb([
      { id: originalFirstStepId, position: 1, delay_value: 0 },
      { id: laterStepId, position: 2, delay_value: 2 },
    ]);
    requireInternalOperator.mockResolvedValue({ db });

    const response = await POST(
      new Request("https://costivra.ai", {
        method: "POST",
        body: JSON.stringify({ stepIds: [laterStepId, originalFirstStepId] }),
      }),
      { params: Promise.resolve({ id: sequenceId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(steps.sort((left, right) => left.position - right.position)).toEqual([
      expect.objectContaining({ id: laterStepId, position: 1, delay_value: 0 }),
      expect.objectContaining({ id: originalFirstStepId, position: 2, delay_value: 0 }),
    ]);
    expect(updates.slice(-2)).toEqual([
      expect.objectContaining({ id: laterStepId, payload: expect.objectContaining({ position: 1, delay_value: 0 }) }),
      expect.objectContaining({ id: originalFirstStepId, payload: expect.objectContaining({ position: 2 }) }),
    ]);
  });
});
