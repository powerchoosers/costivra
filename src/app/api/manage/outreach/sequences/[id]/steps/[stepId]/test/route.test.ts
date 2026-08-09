import { beforeEach, describe, expect, it, vi } from "vitest";

const requireVerifiedInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({ status: 500, error: error instanceof Error ? error.message : "internal" })));
const sendOutboundEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireVerifiedInternalOperator, manageApiError }));
vi.mock("@/lib/manage/outbound-email", () => ({ sendOutboundEmail }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";
const stepId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function makeDb() {
  return {
    from(table: string) {
      const result: Record<string, unknown> = {};
      result.select = () => result;
      result.eq = () => result;
      result.maybeSingle = async () => ({
        data: table === "crm_sequences"
          ? { id: sequenceId, organization_id: "44444444-4444-4444-8444-444444444444", status: "draft" }
          : table === "crm_sequence_steps"
            ? { id: stepId, sequence_id: sequenceId, step_type: "automatic_email", thread_mode: "new_thread", subject_template: "Hello {{first_name}}", body_text: "Hi {{company_name}}", body_html: null }
            : table === "crm_mailboxes"
              ? { id: "55555555-5555-4555-8555-555555555555", address: "operator@costivra.ai", display_name: "Operator", status: "active", can_send: true, mailbox_type: "personal", assigned_to: userId }
              : { full_name: "Operator", job_title: "Owner", phone: null, linkedin_url: null },
        error: null,
      });
      return result;
    },
  };
}

describe("POST sequence step test send", () => {
  beforeEach(() => {
    requireVerifiedInternalOperator.mockReset().mockResolvedValue({ db: makeDb(), userId, email: "operator@costivra.ai", fullName: "Operator" });
    sendOutboundEmail.mockReset().mockResolvedValue({ ok: true, providerId: "resend_test_1", messageId: "message_1", duplicate: false });
  });

  it("requires a caller-supplied idempotency request", async () => {
    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId, stepId }) });
    expect(response.status).toBe(400);
    expect(sendOutboundEmail).not.toHaveBeenCalled();
  });

  it("sends only to the verified operator without contact or sequence linkage", async () => {
    const response = await POST(new Request("https://costivra.ai", { method: "POST", body: JSON.stringify({ testRequestId: "test-request-1" }) }), { params: Promise.resolve({ id: sequenceId, stepId }) });
    expect(response.status).toBe(200);
    expect(sendOutboundEmail).toHaveBeenCalledWith(expect.objectContaining({
      contactId: null,
      to: ["operator@costivra.ai"],
      origin: "manual",
      authorizationMethod: "sequence_test_send_current_operator",
    }));
    const request = sendOutboundEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(request).not.toHaveProperty("sequenceId");
    expect(request).not.toHaveProperty("sequenceEnrollmentId");
    expect(request).not.toHaveProperty("sequenceStepId");
  });
});
