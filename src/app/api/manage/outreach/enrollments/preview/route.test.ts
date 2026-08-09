import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));
const getSequence = vi.hoisted(() => vi.fn());
const validateSequenceDraft = vi.hoisted(() => vi.fn());
const sanitizeSequencePersonalizationMap = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/repository", () => ({ getSequence, findOutreachBlock: vi.fn() }));
vi.mock("@/lib/manage/sequences/validation", () => ({ validateSequenceDraft, renderTemplate: vi.fn(), sanitizeSequencePersonalizationMap }));

import { POST } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";
const contactId = "22222222-2222-4222-8222-222222222222";

describe("POST /api/manage/outreach/enrollments/preview", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    getSequence.mockReset();
    validateSequenceDraft.mockReset();
    sanitizeSequencePersonalizationMap.mockReset().mockReturnValue({});
    requireInternalOperator.mockResolvedValue({ db: { from: vi.fn() } });
    getSequence.mockResolvedValue({ id: sequenceId, status: "active" });
    validateSequenceDraft.mockReturnValue({ valid: true, errors: [] });
  });

  it("does not preview an active sequence before the execution packet", async () => {
    const response = await POST(new Request("https://costivra.ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sequenceId, contactIds: [contactId] }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Only draft sequences may be previewed in this packet." });
    expect(validateSequenceDraft).not.toHaveBeenCalled();
  });
});
