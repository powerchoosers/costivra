import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((err: unknown) => ({ status: 500, error: String(err) })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { PATCH } from "@/app/api/manage/accounts/[id]/route";

describe("account detail API route", () => {
  const orgUpdates: Array<Record<string, unknown>> = [];
  const profileUpserts: Array<Record<string, unknown>> = [];
  const rpc = vi.fn((name: string) => Promise.resolve({ data: name === "manage_update_account_record" ? "2026-08-06T00:00:01.000Z" : null, error: null }));

  beforeEach(() => {
    orgUpdates.length = 0;
    profileUpserts.length = 0;

    requireInternalOperator.mockResolvedValue({
      db: {
        rpc,
        from(table: string) {
          if (table === "organizations") {
            return {
              update(record: Record<string, unknown>) {
                orgUpdates.push(record);
                return { eq: async () => ({ error: null }) };
              },
            };
          }
          if (table === "crm_account_profiles") {
            return {
              upsert(record: Record<string, unknown>) {
                profileUpserts.push(record);
                return Promise.resolve({ error: null });
              },
            };
          }
          return {
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        },
      },
      userId: "operator-123",
    });
  });

  it("passes the selected primary contact ID to the atomic account mutation", async () => {
    const accountId = "a1b2c3d4-e5f6-4890-abcd-1234567890ab";
    const primaryContactId = "b2c3d4e5-f6a7-4890-abcd-1234567890ab";
    const req = new Request(`http://localhost/api/manage/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: "2026-08-06T00:00:00.000Z", primaryContactId }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: accountId }) });
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("manage_update_account_record", expect.objectContaining({
      p_organization_id: accountId,
      p_expected_updated_at: "2026-08-06T00:00:00.000Z",
      p_updates: expect.objectContaining({ primary_contact_id: primaryContactId }),
    }));
  });

  it("updates org-level fields (industry, revenue, timezone) on organizations table and assigned_to on crm_account_profiles", async () => {
    const req = new Request("http://localhost/api/manage/accounts/a1b2c3d4-e5f6-4890-abcd-1234567890ab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedUpdatedAt: "2026-08-06T00:00:00.000Z",
        industry: "Logistics",
        annualRevenueRange: "$10M-$50M",
        timezone: "America/Chicago",
        assignedTo: "b2c3d4e5-f6a7-4890-abcd-1234567890ab",
        stage: "active",
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab" }) });
    expect(res.status).toBe(200);

    expect(orgUpdates.length).toBe(0);
    expect(profileUpserts.length).toBe(0);
  });

  it("passes an operator-entered account phone override to the atomic mutation", async () => {
    const accountId = "a1b2c3d4-e5f6-4890-abcd-1234567890ab";
    const req = new Request(`http://localhost/api/manage/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: "2026-08-06T00:00:00.000Z", phone: "+1 888-482-7768" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: accountId }) });
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("manage_update_account_record", expect.objectContaining({
      p_updates: expect.objectContaining({ phone: "+1 888-482-7768" }),
    }));
  });
});
