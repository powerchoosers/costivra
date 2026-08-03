import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOwner = vi.hoisted(() => vi.fn());
const isApolloConfigured = vi.hoisted(() => vi.fn());
const getApolloCreditUsage = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({
  status: error instanceof Error && error.message === "OWNER_ACCESS_REQUIRED" ? 403 : 500,
  error: "Request rejected.",
})));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner, manageApiError }));
vi.mock("@/lib/integrations/apollo", () => ({ isApolloConfigured, getApolloCreditUsage }));

import { GET } from "./route";

describe("GET /api/manage/enrichment/apollo", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset().mockResolvedValue({});
    isApolloConfigured.mockReset().mockReturnValue(true);
    getApolloCreditUsage.mockReset().mockResolvedValue({
      status: "fresh",
      checkedAt: "2026-08-03T12:00:00.000Z",
      leadCredits: { limit: 5_000, used: 1_654, remaining: 3_346 },
    });
  });

  it("returns only the owner-safe Apollo usage summary with private caching", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toEqual({
      provider: "apollo",
      configured: true,
      connection: "connected",
      checkedAt: "2026-08-03T12:00:00.000Z",
      leadCredits: { limit: 5_000, used: 1_654, remaining: 3_346 },
    });
  });

  it("reports an unconfigured provider without calling Apollo", async () => {
    isApolloConfigured.mockReturnValue(false);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ configured: false, connection: "unconfigured", leadCredits: null });
    expect(getApolloCreditUsage).not.toHaveBeenCalled();
  });

  it("requires owner access", async () => {
    requireInternalOwner.mockRejectedValue(new Error("OWNER_ACCESS_REQUIRED"));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getApolloCreditUsage).not.toHaveBeenCalled();
  });
});
