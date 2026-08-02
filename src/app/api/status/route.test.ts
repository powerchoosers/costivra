import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
const getPublicSystemStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/status/public-status", () => ({ getPublicSystemStatus }));

import { GET } from "@/app/api/status/route";

describe("GET /api/status", () => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
    getPublicSystemStatus.mockReset();
  });

  it("returns a short-lived public status without credentials or customer data", async () => {
    const db = { from: vi.fn() };
    const status = {
      checkedAt: "2026-08-02T22:00:00.000Z",
      overall: "limited",
      headline: "Core systems are available with limited document processing.",
      services: [{ id: "intake", name: "Document intake", state: "limited", message: "Files remain quarantined." }],
    };
    createServerSupabaseClient.mockReturnValue(db);
    getPublicSystemStatus.mockResolvedValue(status);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual(status);
    expect(getPublicSystemStatus).toHaveBeenCalledWith(db);
  });

  it("returns a sanitized, briefly cached outage when live checks fail", async () => {
    createServerSupabaseClient.mockReturnValue({});
    getPublicSystemStatus.mockRejectedValue(new Error("secret provider diagnostic"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=15, stale-while-revalidate=60");
    const body = await response.json();
    expect(body).toEqual({ error: "Live status is temporarily unavailable." });
    expect(JSON.stringify(body)).not.toContain("secret provider diagnostic");
  });
});
