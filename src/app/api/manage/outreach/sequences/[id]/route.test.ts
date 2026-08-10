import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: 500,
  error: error instanceof Error ? error.message : "internal",
})));
const getSequence = vi.hoisted(() => vi.fn());
const getSequenceWithStats = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/repository", () => ({ getSequence, getSequenceWithStats }));

import { GET } from "./route";

const sequenceId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/manage/outreach/sequences/[id]", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset().mockResolvedValue({ db: {} });
    getSequence.mockReset();
    getSequenceWithStats.mockReset();
    vi.stubEnv("COSTIVRA_SEQUENCE_EXECUTION_ENABLED", "false");
  });

  it("returns live sequence stats and the execution gate", async () => {
    getSequenceWithStats.mockResolvedValue({
      id: sequenceId,
      name: "Renewal follow-up",
      activeEnrollments: 4,
      scheduledNext24Hours: 2,
      sent: 9,
      replies: 1,
    });

    const response = await GET(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      sequence: expect.objectContaining({ activeEnrollments: 4, scheduledNext24Hours: 2, sent: 9, replies: 1 }),
      executionEnabled: false,
    });
    expect(getSequenceWithStats).toHaveBeenCalledWith({}, sequenceId);
  });

  it("returns a not-found response for an unknown sequence", async () => {
    getSequenceWithStats.mockResolvedValue(null);

    const response = await GET(new Request("https://costivra.ai"), { params: Promise.resolve({ id: sequenceId }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Sequence not found." });
  });
});
