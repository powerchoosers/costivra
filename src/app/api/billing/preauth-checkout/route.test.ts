import { beforeEach, describe, expect, it, vi } from "vitest";

const getBillingPlan = vi.hoisted(() => vi.fn(() => ({ key: "starter", checkoutEnabled: true })));
const getBillingCatalogPlan = vi.hoisted(() => vi.fn(async () => ({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_test_starter", annualStripePriceId: "price_test_starter_annual" })));
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
  const updateChain = {
    eq: () => updateChain,
    in: async () => ({ error: null }),
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error }),
    insert: async () => ({ error: null }),
    update: () => updateChain,
  };
  return chain;
}

describe("POST /api/billing/preauth-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBillingPlan.mockReturnValue({ key: "starter", checkoutEnabled: true });
    getBillingCatalogPlan.mockResolvedValue({ key: "starter", checkoutEnabled: true, active: true, stripePriceId: "price_test_starter", annualStripePriceId: "price_test_starter_annual" });
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
      integration_identifier: expect.stringMatching(/^costivra_preauth_[a-z]{8}$/),
      customer: "cus_test_preauth",
      managed_payments: { enabled: false },
      success_url: "http://localhost:3000/signup?plan=starter&interval=month&billing=success&checkout_session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/signup?plan=starter&interval=month&billing=cancelled",
      metadata: expect.objectContaining({ plan_key: "starter" }),
    }), expect.any(Object));
    expect(from).toHaveBeenCalledWith("billing_checkout_intents");
  });

  it("uses the configured annual price and preserves the annual interval", async () => {
    getBillingCatalogPlan.mockResolvedValue({
      key: "starter",
      checkoutEnabled: true,
      active: true,
      stripePriceId: "price_test_starter_monthly",
      annualStripePriceId: "price_test_starter_annual",
    });

    const response = await POST(new Request("http://localhost:3000/api/billing/preauth-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "preauth-annual-1" },
      body: JSON.stringify({ planKey: "starter", billingInterval: "year", email: "owner@example.com", fullName: "Jordan Lee", companyName: "Northstar Foods" }),
    }));

    expect(response.status).toBe(201);
    const stripe = getStripeClient.mock.results[0]?.value;
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price: "price_test_starter_annual", quantity: 1 }],
      success_url: expect.stringContaining("interval=year"),
      metadata: expect.objectContaining({ billing_interval: "year" }),
      subscription_data: { metadata: expect.objectContaining({ billing_interval: "year" }) },
    }), expect.any(Object));
  });

  it("reuses a customer saved on an intent when Checkout must be retried", async () => {
    from.mockImplementation(() => query({
      id: "intent-retry",
      email: "owner@example.com",
      full_name: "Jordan Lee",
      company_name: "Northstar Foods",
      plan_key: "starter",
      billing_interval: "month",
      status: "created",
      stripe_customer_id: "cus_existing_preauth",
      checkout_url: null,
    }));

    const response = await POST(new Request("http://localhost:3000/api/billing/preauth-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "preauth-retry-1" },
      body: JSON.stringify({ planKey: "starter", email: "owner@example.com", fullName: "Jordan Lee", companyName: "Northstar Foods" }),
    }));

    expect(response.status).toBe(201);
    const stripe = getStripeClient.mock.results[0]?.value;
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_existing_preauth" }), expect.any(Object));
  });

  it("records a safe failed state when Stripe rejects session creation", async () => {
    const updateChain = {
      eq: () => updateChain,
      in: async () => ({ error: null }),
    };
    const update = vi.fn(() => updateChain);
    from.mockImplementation(() => ({
      ...query(),
      update,
    }));
    getStripeClient.mockReturnValue({
      prices: { retrieve: vi.fn().mockResolvedValue({ active: true, livemode: false }) },
      customers: { create: vi.fn().mockResolvedValue({ id: "cus_failed_preauth" }) },
      checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error("provider failure")) } },
    });

    const response = await POST(new Request("http://localhost:3000/api/billing/preauth-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "preauth-failure-1" },
      body: JSON.stringify({ planKey: "starter", email: "owner@example.com", fullName: "Jordan Lee", companyName: "Northstar Foods" }),
    }));

    expect(response.status).toBe(500);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", safe_error: "STRIPE_CHECKOUT_SESSION_CREATE_FAILED" }));
  });
});
