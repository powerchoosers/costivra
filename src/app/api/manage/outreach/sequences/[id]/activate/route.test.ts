import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));
const getSequence = vi.hoisted(() => vi.fn());
const validateSequenceDraft = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const checkSystemReadiness = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/repository", () => ({ getSequence }));
vi.mock("@/lib/manage/sequences/validation", () => ({ validateSequenceDraft }));
vi.mock("@/lib/manage/system-readiness", () => ({ checkSystemReadiness }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/manage/outreach/sequences/[id]/activate", () => {
  beforeEach(() => {
    vi.stubEnv("COSTIVRA_SEQUENCE_EXECUTION_ENABLED", "true");
    requireInternalOperator.mockReset();
    getSequence.mockReset();
    validateSequenceDraft.mockReset();
    rpc.mockReset();
    checkSystemReadiness.mockReset();
    requireInternalOperator.mockResolvedValue({ db: { rpc }, userId: "22222222-2222-4222-8222-222222222222" });
    getSequence.mockResolvedValue({ status: "draft", steps: [], organizationId: "33333333-3333-4333-8333-333333333333" });
    validateSequenceDraft.mockReturnValue({ valid: true, errors: [] });
    checkSystemReadiness.mockResolvedValue({
      overall: "ready",
      services: [],
      checkedAt: "2026-08-09T12:00:00.000Z",
    });
    rpc.mockResolvedValue({
      data: [{ sequence_id: sequenceId, activated_at: "2026-08-09T12:00:00.000Z", activated_enrollments: 2 }],
      error: null,
    });
  });

  it("uses the atomic database activation function", async () => {
    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("activate_crm_sequence", expect.objectContaining({
      p_sequence_id: sequenceId,
      p_actor_id: "22222222-2222-4222-8222-222222222222",
    }));
    expect((await response.json()).sequence.activated_enrollments).toBe(2);
  });

  it("reports a migration prerequisite instead of a generic server error", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Sequence activation setup is incomplete. Apply the latest database migration first." });
  });

  it("refuses activation when the current readiness gate is blocked", async () => {
    checkSystemReadiness.mockResolvedValue({
      overall: "blocked",
      checkedAt: "2026-08-09T12:00:00.000Z",
      services: [{ id: "resend", status: "blocked", message: "The signed production webhook is missing or disabled." }],
    });
    const response = await POST(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Sequence activation is blocked by current system readiness.",
      blockedServices: [{ id: "resend", message: "The signed production webhook is missing or disabled." }],
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
