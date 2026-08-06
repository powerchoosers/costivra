import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((err: unknown) => ({ status: 500, error: String(err) })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { PATCH } from "@/app/api/manage/accounts/[id]/route";

describe("account detail API route", () => {
  const orgUpdates: Array<Record<string, unknown>> = [];
  const profileUpserts: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    orgUpdates.length = 0;
    profileUpserts.length = 0;

    requireInternalOperator.mockResolvedValue({
      db: {
        rpc: vi.fn(() => Promise.resolve({ data: "2026-08-06T00:00:01.000Z", error: null })),
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
});
