import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BillingPlanKey } from "@/lib/billing/catalog";

type BillingDb = ReturnType<typeof createServerSupabaseClient>;

export type BillingEntitlementKey = "paid_workspace" | "monitored_vendors" | "locations" | "team_seats" | "scheduled_reports";

export type PlanEntitlementDefinition = {
  featureKey: Exclude<BillingEntitlementKey, "paid_workspace">;
  limitValue: number | null;
  label: string;
};

/**
 * Server-owned plan limits. Pricing copy is editable by the owner, but access
 * limits are deliberately not editable from the browser or the pricing UI.
 * A null limit means the feature is included without a numeric cap.
 */
export const PLAN_ENTITLEMENTS: Record<BillingPlanKey, readonly PlanEntitlementDefinition[]> = {
  starter: [
    { featureKey: "monitored_vendors", limitValue: 3, label: "monitored vendors" },
    { featureKey: "locations", limitValue: 1, label: "locations" },
    { featureKey: "team_seats", limitValue: 3, label: "team members" },
    { featureKey: "scheduled_reports", limitValue: 1, label: "scheduled report" },
  ],
  growth: [
    { featureKey: "monitored_vendors", limitValue: 25, label: "monitored vendors" },
    { featureKey: "locations", limitValue: 10, label: "locations" },
    { featureKey: "team_seats", limitValue: 10, label: "team members" },
    { featureKey: "scheduled_reports", limitValue: 5, label: "scheduled reports" },
  ],
  enterprise: [
    { featureKey: "monitored_vendors", limitValue: null, label: "monitored vendors" },
    { featureKey: "locations", limitValue: null, label: "locations" },
    { featureKey: "team_seats", limitValue: null, label: "team members" },
    { featureKey: "scheduled_reports", limitValue: null, label: "scheduled reports" },
  ],
};

export type EntitlementCheck = {
  allowed: boolean;
  reason: "allowed" | "legacy_workspace" | "limit_reached" | "billing_not_reconciled" | "disabled";
  planKey: BillingPlanKey | null;
  featureKey: BillingEntitlementKey;
  limitValue: number | null;
  currentUsage: number;
  requested: number;
  label: string;
};

function isActiveSubscriptionStatus(value: unknown): boolean {
  return value === "active" || value === "trialing";
}

function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01";
}

function labelForFeature(featureKey: BillingEntitlementKey): string {
  if (featureKey === "monitored_vendors") return "monitored vendors";
  if (featureKey === "locations") return "locations";
  if (featureKey === "team_seats") return "team members";
  if (featureKey === "scheduled_reports") return "scheduled reports";
  return "workspace access";
}

/**
 * Check a server-authorized mutation against the Stripe-backed entitlement
 * projection. Workspaces that predate billing remain available as supervised
 * pilot workspaces until a paid subscription exists; a paid subscription with
 * missing entitlement rows fails closed instead of silently granting access.
 */
export async function checkEntitlement(
  db: BillingDb,
  organizationId: string,
  featureKey: BillingEntitlementKey,
  currentUsage = 0,
  requested = 1,
): Promise<EntitlementCheck> {
  const label = labelForFeature(featureKey);
  const { data: entitlement, error: entitlementError } = await db
    .from("billing_entitlements")
    .select("plan_key,enabled,limit_value,expires_at")
    .eq("organization_id", organizationId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  // Keep founder-led pilot workspaces usable while a migration is rolling out.
  // The migration is applied in the current environment; this is only a
  // compatibility fallback for older previews.
  if (isMissingTable(entitlementError)) {
    return { allowed: true, reason: "legacy_workspace", planKey: null, featureKey, limitValue: null, currentUsage, requested, label };
  }
  if (entitlementError) throw entitlementError;

  if (entitlement) {
    const planKey = entitlement.plan_key === "starter" || entitlement.plan_key === "growth" || entitlement.plan_key === "enterprise"
      ? entitlement.plan_key
      : null;
    const limitValue = entitlement.limit_value == null ? null : Number(entitlement.limit_value);
    const expiresAt = typeof entitlement.expires_at === "string" ? Date.parse(entitlement.expires_at) : NaN;
    const expired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
    if (entitlement.enabled !== true || expired) {
      return { allowed: false, reason: "disabled", planKey, featureKey, limitValue, currentUsage, requested, label };
    }
    if (limitValue != null && currentUsage + requested > limitValue) {
      return { allowed: false, reason: "limit_reached", planKey, featureKey, limitValue, currentUsage, requested, label };
    }
    return { allowed: true, reason: "allowed", planKey, featureKey, limitValue, currentUsage, requested, label };
  }

  const { data: subscriptions, error: subscriptionError } = await db
    .from("billing_subscriptions")
    .select("status")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .limit(1);
  if (isMissingTable(subscriptionError)) {
    return { allowed: true, reason: "legacy_workspace", planKey: null, featureKey, limitValue: null, currentUsage, requested, label };
  }
  if (subscriptionError) throw subscriptionError;
  if ((subscriptions ?? []).some((subscription) => isActiveSubscriptionStatus(subscription.status))) {
    return { allowed: false, reason: "billing_not_reconciled", planKey: null, featureKey, limitValue: null, currentUsage, requested, label };
  }
  return { allowed: true, reason: "legacy_workspace", planKey: null, featureKey, limitValue: null, currentUsage, requested, label };
}

export function entitlementError(check: EntitlementCheck) {
  if (check.reason === "limit_reached") {
    return `Your ${check.planKey ?? "current"} plan allows ${check.limitValue} ${check.label}. You currently have ${check.currentUsage}. Upgrade or remove one before adding another.`;
  }
  if (check.reason === "billing_not_reconciled") {
    return "Your subscription is active, but its access limits are still syncing. Please try again in a moment.";
  }
  return "This feature is not available for the current billing state. Please review Billing or contact support.";
}

export function entitlementRows(planKey: BillingPlanKey, enabled: boolean, sourceSubscriptionId: string | null) {
  const now = new Date().toISOString();
  return [
    {
      feature_key: "paid_workspace",
      plan_key: planKey,
      enabled,
      limit_value: null,
      source_subscription_id: sourceSubscriptionId,
      updated_at: now,
    },
    ...PLAN_ENTITLEMENTS[planKey].map((definition) => ({
      feature_key: definition.featureKey,
      plan_key: planKey,
      enabled,
      limit_value: definition.limitValue,
      source_subscription_id: sourceSubscriptionId,
      updated_at: now,
    })),
  ];
}
