import { beforeEach, describe, expect, it, vi } from "vitest";

const getBillingPlan = vi.hoisted(() => vi.fn(() => ({ key: "starter", checkoutEnabled: true })));
const getBillingCatalogPlan = vi.hoisted(() => vi.fn(async () => ({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_test_starter" })));
const assertStripeBillingMode = vi.hoisted(() => vi.fn());
const getStripeBillingMode = vi.hoisted(() => vi.fn(() => "test"));
const getStripeAccountReadiness = vi.hoisted(() => vi.fn());
const stripeAccountReadyForLiveCheckout = vi.hoisted(() => vi.fn());
const getStripeClient = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/catalog", () => ({ getBillingPlan, getBillingCatalogPlan }));
vi.mock("@/lib/billing/stripe", () => ({ assertStripeBillingMode, getStripeBillingMode, getStripeAccountReadiness, stripeAccountReadyForLiveCheckout, getStripeClient }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: () => ({ from }) }));

import { POST } from "./route";

function query(data: unknown = null, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error }),
    insert: async () => ({ error: null }),
    update: () => ({ eq: async () => ({ error: null }) }),
  };
  return chain;
}

describe("POST /api/billing/preauth-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBillingPlan.mockReturnValue({ key: "starter", checkoutEnabled: true });
    getBillingCatalogPlan.mockResolvedValue({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_test_starter" });
    getStripeBillingMode.mockReturnValue("test");
    from.mockImplementation((table: string) => table === "billing_checkout_intents" ? query() : query());
    getStripeClient.mockReturnValue({
      prices: { retrieve: vi.fn().mockResolvedValue({ active: true, livemode: false }) },
      customers: { create: vi.fn().mockResolvedValue({ id: "cus_test_preauth" }) },
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: "cs_test_preauth", url: "https://checkout.stripe.test/cs_test_preauth" }) } },
    });
  });

  it("requires the creation details needed to provision a workspace", async () => {
    const response = await POST(new Request("http://localhost:3000/api/billing/preauth-checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey: "starter", email: "not-an-email" }),
    }));
    expect(response.status).toBe(400);
    expect(getStripeClient).not.toHaveBeenCalled();
  });

  it("opens a test subscription Checkout before an account exists", async () => {
    const response = await POST(new Request("http://localhost:3000/api/billing/preauth-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "preauth-test-1" },
      body: JSON.stringify({ planKey: "starter", email: "owner@example.com", fullName: "Jordan Lee", companyName: "Northstar Foods" }),
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.test/cs_test_preauth" });
    const stripe = getStripeClient.mock.results[0]?.value;
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      customer: "cus_test_preauth",
      success_url: "http://localhost:3000/signup?plan=starter&billing=success&checkout_session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/signup?plan=starter&billing=cancelled",
      metadata: expect.objectContaining({ plan_key: "starter" }),
    }), expect.any(Object));
    expect(from).toHaveBeenCalledWith("billing_checkout_intents");
  });
});
