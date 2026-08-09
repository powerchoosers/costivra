import "server-only";

export type BillingPlanKey = "starter" | "growth" | "enterprise";

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  description: string;
  priceEnv: "STRIPE_PRICE_STARTER_MONTHLY" | "STRIPE_PRICE_GROWTH_MONTHLY" | null;
  checkoutEnabled: boolean;
};

export const BILLING_PLANS: readonly BillingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    description: "Evidence-backed cost review for a focused operating team.",
    priceEnv: "STRIPE_PRICE_STARTER_MONTHLY",
    checkoutEnabled: true,
  },
  {
    key: "growth",
    name: "Growth",
    description: "Broader monitoring and review workflows for a growing business.",
    priceEnv: "STRIPE_PRICE_GROWTH_MONTHLY",
    checkoutEnabled: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "A tailored deployment with a reviewed commercial agreement.",
    priceEnv: null,
    checkoutEnabled: false,
  },
] as const;

export function getBillingPlan(value: unknown): BillingPlan | null {
  return typeof value === "string"
    ? BILLING_PLANS.find((plan) => plan.key === value) ?? null
    : null;
}

export function getConfiguredPriceId(plan: BillingPlan): string | null {
  if (!plan.priceEnv) return null;
  const value = process.env[plan.priceEnv];
  return typeof value === "string" && value.startsWith("price_") ? value : null;
}

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return getBillingPlan(value) !== null;
}
