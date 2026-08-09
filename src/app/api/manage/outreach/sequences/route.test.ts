import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const listSequences = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "internal" })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/repository", () => ({ listSequences }));

import { GET } from "./route";

describe("GET /api/manage/outreach/sequences", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset().mockResolvedValue({ db: {} });
    listSequences.mockReset().mockResolvedValue([]);
    vi.stubEnv("COSTIVRA_SEQUENCE_EXECUTION_ENABLED", "false");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports execution as disabled by default", async () => {
    const response = await GET();
    await expect(response.json()).resolves.toEqual({ sequences: [], executionEnabled: false });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("exposes the explicit release gate when enabled", async () => {
    vi.stubEnv("COSTIVRA_SEQUENCE_EXECUTION_ENABLED", "true");
    listSequences.mockResolvedValue([{ id: "sequence-1" }]);

    const response = await GET();
    await expect(response.json()).resolves.toEqual({ sequences: [{ id: "sequence-1" }], executionEnabled: true });
  });
});
