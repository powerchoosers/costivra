import { describe, expect, it, vi } from "vitest";
import { BILLING_PLANS, getBillingPlan, getConfiguredPriceId } from "@/lib/billing/catalog";

describe("billing catalog", () => {
  it("exposes only stable Costivra plan keys", () => {
    expect(BILLING_PLANS.map((plan) => plan.key)).toEqual(["starter", "growth", "enterprise"]);
    expect(getBillingPlan("unknown")).toBeNull();
  });

  it("fails closed when a recurring price is not configured", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER_MONTHLY", "");
    const starter = getBillingPlan("starter");
    expect(starter).not.toBeNull();
    expect(getConfiguredPriceId(starter!)).toBeNull();
  });

  it("does not offer enterprise through self-serve checkout", () => {
    const enterprise = getBillingPlan("enterprise");
    expect(enterprise?.checkoutEnabled).toBe(false);
    expect(getConfiguredPriceId(enterprise!)).toBeNull();
  });
});
