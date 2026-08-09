import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const assertStripeBillingMode = vi.hoisted(() => vi.fn());
const createPortalSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));
vi.mock("@/lib/billing/stripe", () => ({
  assertStripeBillingMode,
  getStripeClient: () => ({ billingPortal: { sessions: { create: createPortalSession } } }),
}));

import { POST } from "./route";

function database() {
  return {
    from(table: string) {
      if (table !== "billing_customers") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { stripe_customer_id: "cus_test_costivra" }, error: null }) }),
        }),
      };
    },
  };
}

describe("POST /api/billing/portal", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
    assertStripeBillingMode.mockReset();
    createPortalSession.mockReset();
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1", role: "owner" });
    createPortalSession.mockResolvedValue({ url: "https://billing.stripe.test/session" });
  });

  it("checks the billing mode before opening the Stripe portal", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(assertStripeBillingMode).toHaveBeenCalledOnce();
    expect(createPortalSession).toHaveBeenCalledWith(
      { customer: "cus_test_costivra", return_url: "https://costivra.ai/portal/settings" },
    );
  });
});
