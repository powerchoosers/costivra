import { describe, expect, it } from "vitest";
import { checkEntitlement, entitlementError, entitlementRows, PLAN_ENTITLEMENTS } from "./entitlements";

function database(options: {
  entitlement?: Record<string, unknown> | null;
  subscriptionRows?: Array<Record<string, unknown>>;
  entitlementError?: { code: string } | null;
  subscriptionError?: { code: string } | null;
}) {
  return {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        maybeSingle: async () => table === "billing_entitlements"
          ? { data: options.entitlement ?? null, error: options.entitlementError ?? null }
          : { data: null, error: null },
        limit: async () => table === "billing_subscriptions"
          ? { data: options.subscriptionRows ?? [], error: options.subscriptionError ?? null }
          : { data: [], error: null },
      };
      return chain;
    },
  } as never;
}

describe("billing entitlements", () => {
  it("enforces the server-owned Starter vendor limit", async () => {
    const result = await checkEntitlement(database({ entitlement: { plan_key: "starter", enabled: true, limit_value: 3 } }), "org-1", "monitored_vendors", 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("limit_reached");
    expect(entitlementError(result)).toContain("allows 3 monitored vendors");
  });

  it("allows an included Growth feature when its limit is null", async () => {
    const result = await checkEntitlement(database({ entitlement: { plan_key: "growth", enabled: true, limit_value: null } }), "org-1", "locations", 50);
    expect(result).toMatchObject({ allowed: true, reason: "allowed", planKey: "growth", limitValue: null });
  });

  it("fails closed when a paid subscription has not produced its feature row", async () => {
    const result = await checkEntitlement(database({ entitlement: null, subscriptionRows: [{ status: "active" }] }), "org-1", "team_seats", 1);
    expect(result.reason).toBe("billing_not_reconciled");
    expect(result.allowed).toBe(false);
  });

  it("keeps legacy pilot workspaces available without a billing projection", async () => {
    const result = await checkEntitlement(database({ entitlement: null, subscriptionRows: [] }), "org-1", "locations", 1);
    expect(result).toMatchObject({ allowed: true, reason: "legacy_workspace" });
  });

  it("creates the complete deterministic entitlement projection for each plan", () => {
    expect(entitlementRows("starter", true, "sub-1")).toHaveLength(5);
    expect(PLAN_ENTITLEMENTS.growth.find((item) => item.featureKey === "team_seats")?.limitValue).toBe(10);
    expect(entitlementRows("growth", false, null).every((row) => row.enabled === false)).toBe(true);
  });
});
