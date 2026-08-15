import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const getBillingPlan = vi.hoisted(() => vi.fn(() => ({ key: "starter", checkoutEnabled: true })));
const getConfiguredPriceId = vi.hoisted(() => vi.fn(() => "price_starter_live"));
const getBillingCatalogPlan = vi.hoisted(() => vi.fn(() => ({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_starter_live" })));
const assertStripeBillingMode = vi.hoisted(() => vi.fn());
const getStripeClient = vi.hoisted(() => vi.fn());
const getStripeAccountReadiness = vi.hoisted(() => vi.fn());
const getStripeBillingMode = vi.hoisted(() => vi.fn());
const stripeAccountReadyForLiveCheckout = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));
vi.mock("@/lib/billing/catalog", () => ({ getBillingPlan, getConfiguredPriceId, getBillingCatalogPlan }));
vi.mock("@/lib/billing/stripe", () => ({ assertStripeBillingMode, getStripeClient, getStripeAccountReadiness, getStripeBillingMode, stripeAccountReadyForLiveCheckout }));

import { POST, appUrl } from "./route";

function recordQuery(data: unknown) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data, error: null }),
    single: async () => ({ data, error: null }),
    upsert: async () => ({ error: null }),
    insert: async () => ({ error: null }),
  };
  return query;
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    requirePortalContext.mockReset().mockResolvedValue({
      db: { from: vi.fn((table: string) => table === "organizations" ? recordQuery({ name: "Northstar Foods" }) : recordQuery({ email: "owner@northstar.example", full_name: "Jordan Lee" })) },
      organizationId: "org-1",
      userId: "user-1",
      role: "owner",
    });
    getBillingPlan.mockReset().mockReturnValue({ key: "starter", checkoutEnabled: true });
    getConfiguredPriceId.mockReset().mockReturnValue("price_starter_live");
    getBillingCatalogPlan.mockReset().mockResolvedValue({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_starter_live" });
    assertStripeBillingMode.mockReset();
    getStripeBillingMode.mockReset().mockReturnValue("live");
    getStripeAccountReadiness.mockReset().mockResolvedValue({ reachable: true, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, currentlyDue: ["business_profile.product_description"], pastDue: [], disabledReason: "requirements.past_due" });
    stripeAccountReadyForLiveCheckout.mockReset().mockReturnValue(false);
    getStripeClient.mockReset().mockReturnValue({
      customers: { search: vi.fn(), create: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
    });
  });

  it("keeps local Checkout returns on the local origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://costivra.ai";
    expect(appUrl(new Request("http://localhost:3000/api/billing/checkout"))).toBe("http://localhost:3000");
    expect(appUrl(new Request("https://costivra.ai/api/billing/checkout"))).toBe("https://costivra.ai");
  });

  it("stops before creating a customer or Checkout Session when live Stripe is not ready", async () => {
    const response = await POST(new Request("https://costivra.ai/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey: "starter" }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Stripe account setup is incomplete. Enable charges and payouts before starting live checkout." });
    const stripe = getStripeClient.mock.results[0]?.value;
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("keeps the selected plan in local Checkout return URLs", async () => {
    getStripeBillingMode.mockReturnValue("test");
    getStripeClient.mockReturnValue({
      prices: { retrieve: vi.fn().mockResolvedValue({ active: true, livemode: false }) },
      customers: {
        search: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ id: "cus_test_costivra" }),
      },
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: "cs_test_costivra", url: "https://checkout.stripe.test/session" }) } },
    });
    process.env.NEXT_PUBLIC_SITE_URL = "https://costivra.ai";

    const response = await POST(new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "checkout-local-test" },
      body: JSON.stringify({ planKey: "starter" }),
    }));

    expect(response.status).toBe(201);
    const stripe = getStripeClient.mock.results[0]?.value;
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      integration_identifier: expect.stringMatching(/^costivra_workspace_[a-z]{8}$/),
      success_url: "http://localhost:3000/app/settings?tab=billing&plan=starter&billing=success",
      cancel_url: "http://localhost:3000/app/settings?tab=billing&plan=starter&billing=cancelled",
    }), expect.any(Object));
  });
});
