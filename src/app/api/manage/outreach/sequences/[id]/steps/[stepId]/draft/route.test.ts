import { beforeEach, describe, expect, it, vi } from "vitest";

const generateJson = vi.hoisted(() => vi.fn());
const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));

vi.mock("@/lib/ai/openrouter", () => ({ generateJson }));
vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";
const stepId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";

function makeDb(options: { stepType?: string } = {}) {
  const calls: string[] = [];
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const db = {
    from(table: string) {
      calls.push(table);
      const result: Record<string, unknown> = {};
      result.select = () => result;
      result.eq = () => result;
      result.maybeSingle = async () => ({
        data: table === "crm_sequences"
          ? { id: sequenceId, organization_id: organizationId, name: "Renewal follow-up", description: "A calm check-in.", status: "draft" }
          : table === "crm_sequence_steps"
            ? { id: stepId, sequence_id: sequenceId, step_type: options.stepType ?? "automatic_email", position: 1, delay_value: 0, delay_unit: "business_days", thread_mode: "new_thread", subject_template: null, body_text: null, body_html: null }
            : null,
        error: null,
      });
      result.insert = auditInsert;
      return result;
    },
  };
  return { db, calls, auditInsert };
}

describe("POST sequence step email draft", () => {
  beforeEach(() => {
    generateJson.mockReset().mockResolvedValue({
      subjectTemplate: "A quick question for {{company_name}}",
      bodyText: "Hi {{first_name}},\n\nWould a short conversation be useful?\n\nBest,\n{{sender_name}}",
    });
    manageApiError.mockClear();
  });

  it("returns a reviewable draft without saving or sending an email", async () => {
    const { db, calls, auditInsert } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", {
        method: "POST",
        body: JSON.stringify({ intent: "Ask whether a short intro call makes sense." }),
      }),
      { params: Promise.resolve({ id: sequenceId, stepId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      subjectTemplate: "A quick question for {{company_name}}",
      bodyText: expect.stringContaining("Hi {{first_name}}"),
      bodyHtml: expect.stringContaining("<p>Hi {{first_name}},</p>"),
    }));
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["crm_sequences", "crm_sequence_steps", "internal_audit_events"]);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: organizationId,
      action: "crm.sequence_step_email_draft_generated",
      resource_id: stepId,
    }));
  });

  it("refuses to create an email draft for a non-email step", async () => {
    const { db } = makeDb({ stepType: "call_task" });
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: sequenceId, stepId }) },
    );

    expect(response.status).toBe(400);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("rejects model output with unsupported merge fields before creating an audit record", async () => {
    const { db, calls } = makeDb();
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1" });
    generateJson.mockResolvedValue({
      subjectTemplate: "Hello {{untrusted_field}}",
      bodyText: "Hi {{first_name}},",
    });

    const response = await POST(
      new Request("https://costivra.ai", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: sequenceId, stepId }) },
    );

    expect(response.status).toBe(502);
    expect(calls).toEqual(["crm_sequences", "crm_sequence_steps"]);
  });
});
