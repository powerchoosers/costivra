import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => ({ status: 500, error: String(error) })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "./route";

const referralId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const destinationId = "33333333-3333-4333-8333-333333333333";

function createDatabase() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const updatedReferral = {
    id: referralId,
    organization_id: organizationId,
    destination_id: destinationId,
    status: "blocked",
    updated_at: "2026-08-21T00:00:00.000Z",
  };
  const referralQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: updatedReferral, error: null }),
  };
  const db = {
    from: vi.fn((table: string) => {
      if (table === "partner_referral_requests") return { update: vi.fn().mockReturnValue(referralQuery) };
      if (table === "internal_audit_events") return { insert: auditInsert };
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  return { db, auditInsert };
}

describe("manage referral review route", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    manageApiError.mockClear();
  });

  it("rejects unsupported review actions", async () => {
    requireInternalOperator.mockResolvedValue({ db: createDatabase().db, userId: "operator-1" });
    const response = await POST(new Request("http://localhost/api/manage/referrals", {
      method: "POST",
      body: JSON.stringify({ action: "approve", referralId }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("Only blocking") });
  });

  it("blocks an awaiting request and records an internal audit event", async () => {
    const database = createDatabase();
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "operator-1" });
    const response = await POST(new Request("http://localhost/api/manage/referrals", {
      method: "POST",
      body: JSON.stringify({ action: "block", referralId }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ referral: { id: referralId, status: "blocked" } });
    expect(database.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "partner_referral.blocked",
      organization_id: organizationId,
      resource_id: referralId,
    }));
  });
});
