import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requirePortalContext = vi.hoisted(() => vi.fn());
const verifyInboundEmailProviderReadiness = vi.hoisted(() => vi.fn());
const isInboundEmailPlatformReady = vi.hoisted(() => vi.fn());
const getInboundEmailDomain = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));
vi.mock("@/lib/email/resend", () => ({
  verifyInboundEmailProviderReadiness,
  isInboundEmailPlatformReady,
  getInboundEmailDomain,
}));

import { PATCH } from "@/app/api/portal/email-intake/route";

const organizationId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function createDatabase() {
  const inboundAddresses = {
    select: vi.fn(() => inboundAddresses),
    eq: vi.fn(() => inboundAddresses),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111" },
      error: null,
    }),
    single: vi.fn().mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", local_part: "inbound", status: "paused" },
      error: null,
    }),
  };
  const db = {
    from: vi.fn((table: string) => {
      if (table === "inbound_email_addresses") return inboundAddresses;
      if (table === "inbound_email_events") {
        return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
      }
      if (table === "integrations") {
        return {
          update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
          eq: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
        };
      }
      if (table === "audit_events") return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      return { update: vi.fn(), insert: vi.fn(), eq: vi.fn() };
    }),
  };
  return { db };
}

describe("PATCH /api/portal/email-intake", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
    verifyInboundEmailProviderReadiness.mockReset();
    isInboundEmailPlatformReady.mockReset();
    getInboundEmailDomain.mockReset();
  });

  it("returns detailed provider errors when activation is blocked", async () => {
    const { db } = createDatabase();
    requirePortalContext.mockResolvedValue({ db, organizationId, userId, role: "admin" });
    isInboundEmailPlatformReady.mockReturnValue(true);
    verifyInboundEmailProviderReadiness.mockResolvedValue({
      ok: false,
      blocked: [
        "domains endpoint blocked (HTTP 401: restricted_api_key: This API key is restricted to only send emails)",
        "webhooks endpoint blocked (HTTP 401: restricted_api_key: This API key is restricted to only send emails)",
      ],
      details: { verifiedDomain: false, liveWebhook: false },
    });

    const response = await PATCH(new Request("https://costivra.ai/api/portal/email-intake", {
      method: "PATCH",
      body: JSON.stringify({ operation: "activate" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: expect.stringContaining("restricted to only send emails"),
    } as { error: string });
  });

  it("updates intake and integrations when activation succeeds", async () => {
    const db = {
      updatedAddresses: [] as Array<Record<string, unknown>>,
      integrationUpdates: [] as Array<Record<string, unknown>>,
      auditRows: [] as Array<Record<string, unknown>>,
      from: vi.fn((table: string) => {
        if (table === "inbound_email_addresses") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "11111111-1111-4111-8111-111111111111", local_part: "inbound", status: "paused" },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((values: Record<string, unknown>) => {
              db.updatedAddresses.push(values);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === "integrations") {
          return {
            update: vi.fn((values: Record<string, unknown>) => {
              db.integrationUpdates.push(values);
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn().mockReturnThis(),
                })),
              };
            }),
          };
        }
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            db.auditRows.push(payload);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };

    requirePortalContext.mockResolvedValue({ db, organizationId, userId, role: "owner" });
    isInboundEmailPlatformReady.mockReturnValue(true);
    verifyInboundEmailProviderReadiness.mockResolvedValue({
      ok: true,
      blocked: [],
      details: { verifiedDomain: true, liveWebhook: true },
    });
    getInboundEmailDomain.mockReturnValue("costivra.ai");

    const response = await PATCH(new Request("https://costivra.ai/api/portal/email-intake", {
      method: "PATCH",
      body: JSON.stringify({ operation: "activate" }),
    }));

    expect(response.status).toBe(200);
    expect(db.updatedAddresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "active",
          domain: "costivra.ai",
        }),
      ]),
    );
    expect(db.integrationUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "connected",
        }),
      ]),
    );
    expect(db.auditRows[0]).toMatchObject({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "email_intake.activate",
      resource_type: "inbound_email_address",
    });
  });
});
