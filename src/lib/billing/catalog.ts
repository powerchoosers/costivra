import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeBillingMode } from "@/lib/billing/stripe";

export type BillingPlanKey = "starter" | "growth" | "enterprise";

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  description: string;
  priceEnv: "STRIPE_PRICE_STARTER_MONTHLY" | "STRIPE_PRICE_GROWTH_MONTHLY" | null;
  checkoutEnabled: boolean;
};

export type BillingCatalogPlan = BillingPlan & {
  displayName: string;
  description: string;
  amountCents: number | null;
  currency: string;
  interval: "month" | "year" | "custom";
  features: string[];
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  mode: "test" | "live";
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

const FALLBACK_AMOUNT_CENTS: Record<BillingPlanKey, number | null> = {
  starter: 14900,
  growth: 59900,
  enterprise: null,
};

const FALLBACK_FEATURES: Record<BillingPlanKey, string[]> = {
  starter: ["Up to three active expense accounts", "Monthly monitoring", "Renewal reminders"],
  growth: ["Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports"],
  enterprise: ["SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support"],
};

function modeForCatalog(): "test" | "live" {
  return getStripeBillingMode() === "live" ? "live" : "test";
}

function fallbackPlan(plan: BillingPlan, mode: "test" | "live"): BillingCatalogPlan {
  return {
    ...plan,
    displayName: plan.name,
    amountCents: FALLBACK_AMOUNT_CENTS[plan.key],
    currency: "usd",
    interval: plan.key === "enterprise" ? "custom" : "month",
    features: FALLBACK_FEATURES[plan.key],
    stripeProductId: null,
    stripePriceId: getConfiguredPriceId(plan),
    active: true,
    mode,
  };
}

function mapCatalogRow(row: Record<string, unknown>, fallback: BillingCatalogPlan, mode: "test" | "live"): BillingCatalogPlan {
  const features = Array.isArray(row.features) ? row.features.filter((value): value is string => typeof value === "string") : fallback.features;
  return {
    ...fallback,
    displayName: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : fallback.displayName,
    description: typeof row.description === "string" ? row.description : fallback.description,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : fallback.amountCents,
    currency: typeof row.currency === "string" ? row.currency.toLowerCase() : fallback.currency,
    interval: row.interval === "year" || row.interval === "custom" ? row.interval : "month",
    features,
    stripeProductId: typeof row.stripe_product_id === "string" ? row.stripe_product_id : fallback.stripeProductId,
    stripePriceId: typeof row.stripe_price_id === "string" ? row.stripe_price_id : fallback.stripePriceId,
    active: row.active !== false,
    mode,
  };
}

/** Read the owner-managed catalog, falling back safely before its migration is deployed. */
export async function getBillingCatalog(): Promise<BillingCatalogPlan[]> {
  const mode = modeForCatalog();
  const fallback = BILLING_PLANS.map((plan) => fallbackPlan(plan, mode));
  try {
    const { data, error } = await createServerSupabaseClient()
      .from("billing_plan_catalog")
      .select("plan_key,display_name,description,amount_cents,currency,interval,features,stripe_product_id,stripe_price_id,active")
      .eq("stripe_mode", mode)
      .order("plan_key");
    if (error || !data?.length) return fallback;
    const byKey = new Map(data.map((row) => [row.plan_key, row as Record<string, unknown>]));
    return fallback.map((plan) => mapCatalogRow(byKey.get(plan.key) ?? {}, plan, mode));
  } catch {
    return fallback;
  }
}

export async function getBillingCatalogPlan(key: BillingPlanKey): Promise<BillingCatalogPlan> {
  return (await getBillingCatalog()).find((plan) => plan.key === key) ?? fallbackPlan(getBillingPlan(key)!, modeForCatalog());
}

/** Public pages receive only display fields; price IDs and provider identifiers stay server-side. */
export async function getPublicBillingCatalog() {
  const plans = await getBillingCatalog();
  return plans.map(({ key, displayName, description, amountCents, currency, interval, features, active }) => ({
    key,
    name: displayName,
    description,
    amountCents,
    currency,
    interval,
    features,
    active,
  }));
}

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return getBillingPlan(value) !== null;
}
