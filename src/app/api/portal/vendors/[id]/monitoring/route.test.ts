import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const getDurableMonitoringConfig = vi.hoisted(() => vi.fn());
const saveDurableMonitoringConfig = vi.hoisted(() => vi.fn());
const isValidMonitoringEmailAddress = vi.hoisted(() => vi.fn((value: string | null | undefined) => Boolean(value && value.includes("@"))));
const getFreeReviewStatus = vi.hoisted(() => vi.fn(async () => ({ mode: "paid", hasPaidAccess: true, used: 0, limit: null, remaining: null })));

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));
vi.mock("@/lib/vendors/monitoring", () => ({ getDurableMonitoringConfig, isValidMonitoringEmailAddress, saveDurableMonitoringConfig }));
vi.mock("@/lib/billing/free-review", () => ({ getFreeReviewStatus }));

import { GET, PATCH, POST } from "@/app/api/portal/vendors/[id]/monitoring/route";

const relationshipId = "a1b2c3d4-e5f6-4890-abcd-1234567890ab";
const organizationId = "b1b2c3d4-e5f6-4890-abcd-1234567890ab";

function relationshipQuery(data: Record<string, unknown> | null) {
  return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }) };
}

describe("vendor monitoring route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePortalContext.mockResolvedValue({ db: { from: vi.fn(() => relationshipQuery({ id: relationshipId })) }, organizationId, userId: "c1b2c3d4-e5f6-4890-abcd-1234567890ab", role: "member" });
  });

  it("returns only the authoritative monitoring record for the relationship", async () => {
    getDurableMonitoringConfig.mockResolvedValue({ relationshipId, state: "active", sourceMethod: "email_forwarding", privateIntakeAddress: "private@costivra.ai", expectedCadenceDays: 31, gracePeriodDays: 5 });
    const response = await GET(new Request(`http://localhost/api/portal/vendors/${relationshipId}/monitoring`), { params: Promise.resolve({ id: relationshipId }) });
    expect(response.status).toBe(200);
    expect(getDurableMonitoringConfig).toHaveBeenCalledWith(expect.anything(), organizationId, relationshipId);
    expect((await response.json()).monitoring.privateIntakeAddress).toBe("private@costivra.ai");
  });

  it("rejects an unsupported monitoring method and cadence before writing", async () => {
    const response = await POST(new Request(`http://localhost/api/portal/vendors/${relationshipId}/monitoring`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceMethod: "monthly", expectedCadenceDays: 0 }) }), { params: Promise.resolve({ id: relationshipId }) });
    expect(response.status).toBe(400);
    expect(saveDurableMonitoringConfig).not.toHaveBeenCalled();
  });

  it("requires an approved sender for email forwarding", async () => {
    const response = await POST(new Request(`http://localhost/api/portal/vendors/${relationshipId}/monitoring`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceMethod: "email_forwarding", expectedCadenceDays: 30 }) }), { params: Promise.resolve({ id: relationshipId }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Enter the approved forwarding email address that will send the monitoring test." });
    expect(saveDurableMonitoringConfig).not.toHaveBeenCalled();
  });

  it("rejects an unsupported monitoring state transition", async () => {
    const response = await PATCH(new Request(`http://localhost/api/portal/vendors/${relationshipId}/monitoring`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: "active" }) }), { params: Promise.resolve({ id: relationshipId }) });
    expect(response.status).toBe(400);
  });
});
