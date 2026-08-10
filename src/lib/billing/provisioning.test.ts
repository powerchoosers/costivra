import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { provisionPaidCheckout } from "./provisioning";

function fakeDatabase() {
  const state = {
    intent: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.com",
      full_name: "Jordan Lee",
      company_name: "Northstar Foods",
      plan_key: "starter",
      status: "checkout_open",
      stripe_customer_id: "cus_test_preauth",
      stripe_checkout_session_id: "cs_test_preauth",
      stripe_subscription_id: null,
      user_id: null,
      organization_id: null,
    },
    profile: null as { id: string; full_name: string | null } | null,
    memberships: [] as Array<{ organization_id: string; role: string }>,
    onboardingSource: null as string | null,
    customer: null as Record<string, unknown> | null,
    organizationId: "22222222-2222-4222-8222-222222222222",
  };
  const inviteUserByEmail = vi.fn(async () => ({ data: { user: { id: "33333333-3333-4333-8333-333333333333" } }, error: null }));
  const db = {
    auth: { admin: { inviteUserByEmail, listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })) } },
    from(table: string) {
      if (table === "billing_checkout_intents") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.intent, error: null }) }) }),
          update: (row: Record<string, unknown>) => ({ eq: async () => { Object.assign(state.intent, row); return { error: null }; } }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: state.profile, error: null }) }) }) }),
          upsert: async (row: { id: string; email: string; full_name: string }) => { state.profile = { id: row.id, full_name: row.full_name }; return { error: null }; },
        };
      }
      if (table === "organization_memberships") {
        return {
          select: () => ({ eq: async () => ({ data: state.memberships, error: null }) }),
          insert: async (row: { organization_id: string; user_id: string; role: string }) => { state.memberships.push({ organization_id: row.organization_id, role: row.role }); return { error: null }; },
        };
      }
      if (table === "organizations") {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: state.organizationId }, error: null }) }) }) };
      }
      if (table === "organization_onboarding") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.onboardingSource ? { source: state.onboardingSource } : null, error: null }) }) }),
          upsert: async (row: { source: string }) => { state.onboardingSource = row.source; return { error: null }; },
        };
      }
      if (table === "billing_customers") {
        return { upsert: async (row: Record<string, unknown>) => { state.customer = row; return { error: null }; } };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
  return { db, state, inviteUserByEmail };
}

const session = {
  id: "cs_test_preauth",
  customer: "cus_test_preauth",
  subscription: "sub_test_preauth",
  metadata: { checkout_intent_id: "11111111-1111-4111-8111-111111111111", plan_key: "starter" },
} as unknown as Stripe.Checkout.Session;

describe("paid Checkout provisioning", () => {
  it("creates one invited owner workspace and is idempotent on retry", async () => {
    const { db, state, inviteUserByEmail } = fakeDatabase();
    const first = await provisionPaidCheckout(db as never, session);
    expect(first).toEqual({ organizationId: state.organizationId, userId: "33333333-3333-4333-8333-333333333333", nextAction: "activate_password", manualReview: false });
    expect(state.onboardingSource).toBe("paid_checkout");
    expect(state.memberships).toHaveLength(1);
    expect(inviteUserByEmail).toHaveBeenCalledOnce();

    const second = await provisionPaidCheckout(db as never, session);
    expect(second.organizationId).toBe(state.organizationId);
    expect(inviteUserByEmail).toHaveBeenCalledOnce();
    expect(state.memberships).toHaveLength(1);
  });
});
