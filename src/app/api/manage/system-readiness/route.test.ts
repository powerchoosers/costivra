import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOwner = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn());
const checkSystemReadiness = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner, manageApiError }));
vi.mock("@/lib/manage/system-readiness", () => ({ checkSystemReadiness }));

import { GET } from "@/app/api/manage/system-readiness/route";

describe("GET /api/manage/system-readiness", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset();
    manageApiError.mockReset();
    checkSystemReadiness.mockReset();
  });

  it("returns a private, uncached readiness result to an owner", async () => {
    const db = { from: vi.fn() };
    const readiness = {
      checkedAt: "2026-08-02T22:00:00.000Z",
      overall: "warning",
      services: [{ id: "malware", name: "Malware scanning", status: "warning", message: "Verify the scanner." }],
    };
    requireInternalOwner.mockResolvedValue({ db });
    checkSystemReadiness.mockResolvedValue(readiness);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(readiness);
    expect(checkSystemReadiness).toHaveBeenCalledWith(db, { runLiveMalwareProbe: false });
  });

  it("uses the protected API error mapping when owner authorization fails", async () => {
    const error = new Error("OWNER_ACCESS_REQUIRED");
    requireInternalOwner.mockRejectedValue(error);
    manageApiError.mockReturnValue({ status: 403, error: "Only a Costivra owner can run readiness checks." });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Only a Costivra owner can run readiness checks." });
    expect(manageApiError).toHaveBeenCalledWith(error);
    expect(checkSystemReadiness).not.toHaveBeenCalled();
  });
});
