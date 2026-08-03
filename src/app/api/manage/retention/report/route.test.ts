import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOwner = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn());
const retentionPolicyFromEnvironment = vi.hoisted(() => vi.fn());
const runRetention = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner, manageApiError }));
vi.mock("@/lib/retention/policy", () => ({ retentionPolicyFromEnvironment }));
vi.mock("@/lib/retention/runner", () => ({ runRetention }));

import { POST } from "@/app/api/manage/retention/report/route";

describe("POST /api/manage/retention/report", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset();
    manageApiError.mockReset();
    retentionPolicyFromEnvironment.mockReset();
    runRetention.mockReset();
  });

  it("forces report mode even when production enforcement is configured", async () => {
    const db = { from: vi.fn() };
    const result = {
      id: "run-1",
      mode: "report",
      status: "completed",
      candidates: { quarantinedDocuments: 1, quarantinedAttachments: 2, originalDocuments: 3 },
      purged: { quarantinedDocuments: 0, quarantinedAttachments: 0, originalDocuments: 0 },
      failures: [],
    };
    requireInternalOwner.mockResolvedValue({ db });
    retentionPolicyFromEnvironment.mockReturnValue({
      enforce: true,
      quarantineDays: 30,
      originalDays: 365,
      batchSize: 100,
    });
    runRetention.mockResolvedValue(result);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(result);
    expect(runRetention).toHaveBeenCalledWith(db, {
      policy: {
        enforce: false,
        quarantineDays: 30,
        originalDays: 365,
        batchSize: 100,
      },
    });
  });

  it("does not run when owner authorization fails", async () => {
    const error = new Error("OWNER_ACCESS_REQUIRED");
    requireInternalOwner.mockRejectedValue(error);
    manageApiError.mockReturnValue({ status: 403, error: "Owner access required." });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(runRetention).not.toHaveBeenCalled();
    expect(manageApiError).toHaveBeenCalledWith(error);
  });
});
