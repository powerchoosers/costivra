import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const state = { eventStatus: new Map<string, string>(), customers: [] as Array<Record<string, unknown>>, subscriptions: [] as Array<Record<string, unknown>>, entitlements: [] as Array<Record<string, unknown>>, onboardingSource: "internal" as string | null };

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({ webhooks: { constructEvent } }),
  assertStripeBillingMode: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({
    from(table: string) {
      if (table === "billing_events") {
        return {
          select: () => ({ eq: (_column: string, id: string) => ({ maybeSingle: async () => ({ data: state.eventStatus.has(id) ? { status: state.eventStatus.get(id) } : null, error: null }) }) }),
          upsert: async (row: Record<string, unknown>) => { state.eventStatus.set(String(row.stripe_event_id), String(row.status)); return { error: null }; },
          update: (row: Record<string, unknown>) => ({ eq: async (_column: string, id: string) => { state.eventStatus.set(id, String(row.status)); return { error: null }; } }),
        };
      }
      if (table === "billing_customers") {
        return { upsert: async (row: Record<string, unknown>) => { state.customers.push(row); return { error: null }; } };
      }
      if (table === "billing_subscriptions") {
        return {
          select: () => ({ eq: (_column: string, value: string) => ({ maybeSingle: async () => ({ data: state.subscriptions.find((row) => row.stripe_subscription_id === value) ?? null, error: null }) }) }),
          upsert: async (row: Record<string, unknown>) => { state.subscriptions.push({ id: "billing-subscription-row-1", ...row }); return { error: null }; },
        };
      }
      if (table === "billing_entitlements") {
        return { upsert: async (rows: Array<Record<string, unknown>>) => { state.entitlements.push(...rows); return { error: null }; } };
      }
      if (table === "organization_onboarding") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.onboardingSource ? { source: state.onboardingSource } : null, error: null }) }) }),
          upsert: async (row: Record<string, unknown>) => { state.onboardingSource = typeof row.source === "string" ? row.source : null; return { error: null }; },
        };
      }
      throw new Error(`Unexpected table in webhook test: ${table}`);
    },
  }),
}));

import { POST } from "./route";

describe("Stripe webhook boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.eventStatus.clear();
    state.customers.length = 0;
    state.subscriptions.length = 0;
    state.entitlements.length = 0;
    state.onboardingSource = "internal";
    process.env.STRIPE_WEBHOOK_SECRET = "dummy-stripe-webhook-secret-for-tests";
    process.env.STRIPE_BILLING_LIVEMODE_ENABLED = "0";
  });

  it("rejects requests with an invalid signature", async () => {
    constructEvent.mockImplementation(() => { throw new Error("invalid signature"); });
    const response = await POST(new Request("https://costivra.ai/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "bad-signature" }, body: "{}" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid Stripe webhook signature." });
  });

  it("records a checkout event before processing and treats a retry as a duplicate", async () => {
    constructEvent.mockReturnValue({
      id: "evt_test_checkout_1",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: { customer: "cus_test_costivra", metadata: { organization_id: "11111111-1111-4111-8111-111111111111", plan_key: "starter" } } },
    });
    const request = () => new Request("https://costivra.ai/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "dummy-signature" }, body: "{}" });

    const first = await POST(request());
    expect(first.status).toBe(200);
    expect(state.eventStatus.get("evt_test_checkout_1")).toBe("processed");
    expect(state.customers).toHaveLength(1);
    expect(state.onboardingSource).toBe("paid_checkout");

    const second = await POST(request());
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(state.customers).toHaveLength(1);
  });

  it("projects the server-owned plan limits on an active subscription", async () => {
    constructEvent.mockReturnValue({
      id: "evt_test_subscription_1",
      type: "customer.subscription.created",
      livemode: false,
      data: { object: {
        id: "sub_test_costivra",
        customer: "cus_test_costivra",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: 1_700_000_000,
        current_period_end: 1_702_592_000,
        trial_end: null,
        canceled_at: null,
        ended_at: null,
        latest_invoice: null,
        metadata: { organization_id: "11111111-1111-4111-8111-111111111111", plan_key: "starter" },
        items: { data: [{ current_period_start: 1_700_000_000, current_period_end: 1_702_592_000, price: { id: "price_starter_test" } }] },
      } },
    });
    const response = await POST(new Request("https://costivra.ai/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "dummy-signature" }, body: "{}" }));
    expect(response.status).toBe(200);
    expect(state.entitlements).toHaveLength(5);
    expect(state.entitlements.find((row) => row.feature_key === "monitored_vendors")).toMatchObject({ enabled: true, limit_value: 3, plan_key: "starter" });
  });
});
