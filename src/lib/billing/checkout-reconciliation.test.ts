import { beforeEach, describe, expect, it, vi } from "vitest";

const getBillingPlan = vi.hoisted(() => vi.fn((key: unknown) => key === "starter" ? { key: "starter" } : null));
const entitlementRows = vi.hoisted(() => vi.fn(() => [
  { feature_key: "paid_workspace", enabled: true, limit_value: null, source_subscription_id: "sub-row" },
]));
const assertStripeBillingMode = vi.hoisted(() => vi.fn());
const markCheckoutIntentPaymentConfirmed = vi.hoisted(() => vi.fn());
const provisionPaidCheckout = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/catalog", () => ({ getBillingPlan }));
vi.mock("@/lib/billing/entitlements", () => ({ entitlementRows }));
vi.mock("@/lib/billing/stripe", () => ({ assertStripeBillingMode }));
vi.mock("@/lib/billing/provisioning", () => ({ markCheckoutIntentPaymentConfirmed, provisionPaidCheckout }));

import { reconcileCheckoutSession } from "./checkout-reconciliation";

function makeDb() {
  const calls: Array<{ table: string; operation: string; payload?: unknown }> = [];
  const db = {
    from(table: string) {
      let operation = "";
      const chain = {
        select() { operation = "select"; return chain; },
        eq() { return chain; },
        maybeSingle: async () => {
          if (table === "billing_checkout_intents") {
            return { data: { id: "intent-1", status: "checkout_open", plan_key: "starter", stripe_checkout_session_id: "cs_test_1" }, error: null };
          }
          if (table === "billing_plan_catalog") return { data: { plan_key: "starter" }, error: null };
          if (table === "billing_subscriptions") return { data: { id: "sub-row" }, error: null };
          return { data: null, error: null };
        },
        async upsert(payload: unknown) {
          calls.push({ table, operation: "upsert", payload });
          return { error: null };
        },
      };
      void operation;
      return chain;
    },
  };
  return { db, calls };
}

function completedSession() {
  return {
    id: "cs_test_1",
    livemode: false,
    status: "complete",
    payment_status: "paid",
    metadata: { checkout_intent_id: "intent-1", plan_key: "starter" },
    customer: "cus_test_1",
    subscription: {
      id: "sub_test_1",
      customer: "cus_test_1",
      status: "active",
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
      trial_end: null,
      latest_invoice: "in_test_1",
      metadata: { checkout_intent_id: "intent-1", plan_key: "starter" },
      items: { data: [{ price: { id: "price_test_starter" }, current_period_start: 1786337000, current_period_end: 1789015400 }] },
    },
  };
}

describe("reconcileCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provisionPaidCheckout.mockResolvedValue({ organizationId: "org-1", userId: "user-1", nextAction: "sign_in", manualReview: false });
    markCheckoutIntentPaymentConfirmed.mockResolvedValue(undefined);
    getBillingPlan.mockImplementation((key: unknown) => key === "starter" ? { key: "starter" } : null);
  });

  it("provisions a paid session and projects the subscription entitlements", async () => {
    const { db, calls } = makeDb();
    const stripe = { checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(completedSession()) } } } as never;

    const result = await reconcileCheckoutSession(db as never, stripe, "cs_test_1");

    expect(result).toEqual({ status: "provisioned", nextAction: "sign_in" });
    expect(markCheckoutIntentPaymentConfirmed).toHaveBeenCalledWith(db, "intent-1", expect.objectContaining({ id: "cs_test_1" }));
    expect(provisionPaidCheckout).toHaveBeenCalledWith(db, expect.objectContaining({ id: "cs_test_1" }));
    expect(calls.filter((call) => call.table === "billing_subscriptions" && call.operation === "upsert")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "billing_entitlements" && call.operation === "upsert")).toHaveLength(1);
  });

  it("does not provision an unpaid or incomplete session", async () => {
    const { db } = makeDb();
    const session = { ...completedSession(), status: "open", payment_status: "unpaid" };
    const stripe = { checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(session) } } } as never;

    await expect(reconcileCheckoutSession(db as never, stripe, "cs_test_1")).resolves.toEqual({ status: "pending", nextAction: null });
    expect(markCheckoutIntentPaymentConfirmed).not.toHaveBeenCalled();
    expect(provisionPaidCheckout).not.toHaveBeenCalled();
  });
});
