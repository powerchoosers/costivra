import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOwner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner }));

import { GET } from "@/app/api/manage/cron-auth/route";

describe("GET /api/manage/cron-auth", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset();
    vi.stubEnv("CRON_SECRET", "cron-secret-for-test");
  });

  it("returns cron auth signals for an owner", async () => {
    requireInternalOwner.mockResolvedValue({});

    const response = await GET(
      new Request("https://costivra.ai/api/manage/cron-auth?secret=cron-secret-for-test", {
        headers: { authorization: "Bearer cron-secret-for-test" },
      }),
    );
    const body = await response.text();
    expect(response.status).toBe(200);
    const json = JSON.parse(body);
    expect(json).toMatchObject({
      configured: true,
      configuredLength: 20,
      extracted: {
        found: true,
        source: "authorization",
        matchesConfigured: true,
      },
    });
    expect(json.requestSignals.hasAuthorization).toBe(true);
    expect(json.requestSignals.hasQuerySecret).toBe(true);
  });

  it("returns 403 for non-owner", async () => {
    const error = new Error("OWNER_ACCESS_REQUIRED");
    requireInternalOwner.mockRejectedValue(error);

    const response = await GET(new Request("https://costivra.ai/api/manage/cron-auth"));
    expect(response.status).toBe(403);
  });
});
