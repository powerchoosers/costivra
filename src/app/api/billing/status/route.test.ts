import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const getBillingCatalog = vi.hoisted(() => vi.fn());
const stripeIsConfigured = vi.hoisted(() => vi.fn());
const getStripeBillingMode = vi.hoisted(() => vi.fn());
const stripeBillingEnabled = vi.hoisted(() => vi.fn());
const getStripeAccountReadiness = vi.hoisted(() => vi.fn());
const stripeAccountReadyForLiveCheckout = vi.hoisted(() => vi.fn((readiness: { reachable?: boolean; chargesEnabled?: boolean; payoutsEnabled?: boolean } | null) => readiness?.reachable === true && readiness.chargesEnabled === true && readiness.payoutsEnabled === true));

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));
vi.mock("@/lib/billing/catalog", () => ({ getBillingCatalog }));
vi.mock("@/lib/billing/stripe", () => ({ stripeIsConfigured, getStripeBillingMode, stripeBillingEnabled, getStripeAccountReadiness, stripeAccountReadyForLiveCheckout }));

import { GET } from "./route";

function query(data: unknown, error: { code?: string } | null = null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return builder;
}

function database(schemaMissing = false) {
  return {
    from(table: string) {
      if (table === "billing_subscriptions") return query([], schemaMissing ? { code: "42P01" } : null);
      return query([], schemaMissing ? { code: "42P01" } : null);
    },
  };
}

describe("GET /api/billing/status", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
    getBillingCatalog.mockReset().mockResolvedValue([
      { key: "starter", displayName: "Starter", description: "Starter", amountCents: 14900, annualAmountCents: 143040, currency: "usd", interval: "month", features: [], checkoutEnabled: true, active: true, stripePriceId: null, annualStripePriceId: null },
      { key: "growth", displayName: "Growth", description: "Growth", amountCents: 59900, annualAmountCents: 575040, currency: "usd", interval: "month", features: [], checkoutEnabled: true, active: true, stripePriceId: null, annualStripePriceId: null },
      { key: "enterprise", displayName: "Enterprise", description: "Enterprise", amountCents: null, annualAmountCents: null, currency: "usd", interval: "custom", features: [], checkoutEnabled: false, active: true, stripePriceId: null, annualStripePriceId: null },
    ]);
    stripeIsConfigured.mockReset();
    getStripeBillingMode.mockReset();
    stripeBillingEnabled.mockReset();
    getStripeAccountReadiness.mockReset().mockResolvedValue({ reachable: true, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, currentlyDue: [], pastDue: [], disabledReason: null });
    getStripeBillingMode.mockReturnValue("test");
    stripeBillingEnabled.mockReturnValue(true);
    vi.stubEnv("STRIPE_PRICE_STARTER_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_GROWTH_MONTHLY", "");
  });

  it("reports database setup as incomplete without enabling checkout", async () => {
    requirePortalContext.mockResolvedValue({ db: database(true), organizationId: "org-1" });
    stripeIsConfigured.mockReturnValue(true);
    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe("unconfigured");
    expect(body.providerConfigured).toBe(true);
    expect(body.setupReasons).toContain("billing_database_not_configured");
    expect(body.plans.every((plan: { checkoutEnabled: boolean }) => plan.checkoutEnabled === false)).toBe(true);
  });

  it("keeps checkout pending until a price is configured", async () => {
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1" });
    stripeIsConfigured.mockReturnValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("setup_pending");
    expect(body.setupReasons).toEqual(["price_missing:starter", "price_missing:growth"]);
  });

  it("keeps checkout pending when a live mode is present but explicitly disabled", async () => {
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1" });
    stripeIsConfigured.mockReturnValue(true);
    getStripeBillingMode.mockReturnValue("live");
    stripeBillingEnabled.mockReturnValue(false);
    vi.stubEnv("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_test");

    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe("setup_pending");
    expect(body.billingMode).toBe("live");
    expect(body.billingEnabled).toBe(false);
    expect(body.setupReasons).toContain("stripe_billing_mode_disabled");
    expect(body.setupReasons).toContain("price_missing:growth");
  });

  it("keeps live checkout pending when Stripe cannot charge or pay out", async () => {
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1" });
    stripeIsConfigured.mockReturnValue(true);
    getStripeBillingMode.mockReturnValue("live");
    stripeBillingEnabled.mockReturnValue(true);
    getStripeAccountReadiness.mockResolvedValue({ reachable: true, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, currentlyDue: ["business_profile.product_description"], pastDue: [], disabledReason: "requirements.past_due" });
    vi.stubEnv("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_live");
    vi.stubEnv("STRIPE_PRICE_GROWTH_MONTHLY", "price_growth_live");

    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe("setup_pending");
    expect(body.setupReasons).toContain("stripe_account_not_ready");
    expect(body.stripeAccount.chargesEnabled).toBe(false);
  });
});
