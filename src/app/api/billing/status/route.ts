import { NextResponse } from "next/server";
import { requirePortalContext } from "@/lib/portal/repository";
import { BILLING_PLANS, getConfiguredPriceId } from "@/lib/billing/catalog";
import { getStripeAccountReadiness, getStripeBillingMode, stripeBillingEnabled, stripeIsConfigured } from "@/lib/billing/stripe";

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const plans = BILLING_PLANS.map((plan) => ({
      key: plan.key,
      name: plan.name,
      checkoutEnabled: plan.checkoutEnabled && Boolean(getConfiguredPriceId(plan)),
    }));
    const providerConfigured = stripeIsConfigured();
    const billingMode = getStripeBillingMode();
    const billingEnabled = stripeBillingEnabled();
    const stripeAccount = providerConfigured ? await getStripeAccountReadiness() : null;
    const liveAccountReady = billingMode !== "live"
      || (stripeAccount?.reachable === true && stripeAccount.chargesEnabled === true && stripeAccount.payoutsEnabled === true);
    const setupReasons = [
      ...(!providerConfigured ? ["stripe_provider_not_configured"] : []),
      ...(providerConfigured && !billingEnabled ? ["stripe_billing_mode_disabled"] : []),
      ...(providerConfigured && billingMode === "live" && !liveAccountReady ? ["stripe_account_not_ready"] : []),
      ...BILLING_PLANS.filter((plan) => plan.checkoutEnabled && !getConfiguredPriceId(plan)).map((plan) => `price_missing:${plan.key}`),
    ];
    const [{ data: subscriptions, error: subscriptionsError }, { data: entitlements, error: entitlementsError }] = await Promise.all([
      db.from("billing_subscriptions").select("plan_key,status,cancel_at_period_end,current_period_end,trial_end").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
      db.from("billing_entitlements").select("feature_key,enabled,limit_value,expires_at").eq("organization_id", organizationId),
    ]);
    if (subscriptionsError?.code === "42P01" || entitlementsError?.code === "42P01") {
      return NextResponse.json({ status: "unconfigured", providerConfigured, billingMode, billingEnabled, stripeAccount, setupReasons: ["billing_database_not_configured", ...setupReasons], plans, subscriptions: [], entitlements: [] });
    }
    if (subscriptionsError) throw subscriptionsError;
    if (entitlementsError) throw entitlementsError;
    return NextResponse.json({
      status: providerConfigured && billingEnabled && liveAccountReady && plans.some((plan) => plan.checkoutEnabled) ? "ready" : "setup_pending",
      providerConfigured,
      billingMode,
      billingEnabled,
      stripeAccount,
      setupReasons,
      plans,
      subscriptions: subscriptions ?? [],
      entitlements: entitlements ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing status could not be loaded.";
    if (message === "AUTH_REQUIRED" || message === "NO_ORGANIZATION_MEMBERSHIP") return NextResponse.json({ error: "Sign in to view billing." }, { status: 401 });
    console.error("billing status failed", error);
    return NextResponse.json({ error: "Billing status could not be loaded." }, { status: 500 });
  }
}
