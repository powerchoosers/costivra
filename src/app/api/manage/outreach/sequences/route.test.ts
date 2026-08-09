import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const listSequences = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "internal" })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/manage/sequences/repository", () => ({ listSequences }));

import { GET, POST } from "./route";

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

  it("creates a workspace-level sequence without requiring an account", async () => {
    const sequenceInsert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "sequence-1" }, error: null }) })),
    }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    requireInternalOperator.mockResolvedValue({
      userId: "operator-1",
      db: { from: vi.fn((table: string) => table === "crm_sequences" ? { insert: sequenceInsert } : { insert: auditInsert }) },
    });

    const response = await POST(new Request("https://costivra.ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Cross-account follow-up" }),
    }));

    expect(response.status).toBe(201);
    expect(sequenceInsert).toHaveBeenCalledWith(expect.objectContaining({ organization_id: null, name: "Cross-account follow-up" }));
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ organization_id: null, action: "crm.sequence_created" }));
  });
});
