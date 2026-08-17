import "server-only";

import type Stripe from "stripe";
import { getBillingPlan } from "@/lib/billing/catalog";
import { entitlementRows } from "@/lib/billing/entitlements";
import { assertStripeBillingMode } from "@/lib/billing/stripe";
import { markCheckoutIntentPaymentConfirmed, provisionPaidCheckout } from "@/lib/billing/provisioning";

type BillingDb = ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>;

type ReconciliationResult = {
  status: "pending" | "provisioned" | "manual_review";
  nextAction: string | null;
};

function isoFromUnix(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function planFromPrice(
  db: BillingDb,
  priceId: string | null | undefined,
  metadata?: Stripe.Metadata,
): Promise<"starter" | "growth" | "enterprise" | null> {
  const metadataPlan = getBillingPlan(metadata?.plan_key);
  if (metadataPlan) return metadataPlan.key;
  if (!priceId) return null;
  const { data } = await db.from("billing_plan_catalog").select("plan_key").eq("stripe_price_id", priceId).maybeSingle();
  const annual = data ? null : (await db.from("billing_plan_catalog").select("plan_key").eq("annual_stripe_price_id", priceId).maybeSingle()).data;
  const catalogPlan = getBillingPlan(data?.plan_key ?? annual?.plan_key);
  return catalogPlan?.key ?? null;
}

/**
 * Reconcile a completed Checkout Session when the signed webhook is delayed
 * or temporarily unavailable. Stripe's server-side session status is checked
 * before any provisioning; the webhook remains the normal lifecycle path.
 */
export async function reconcileCheckoutSession(
  db: BillingDb,
  stripe: Stripe,
  sessionId: string,
): Promise<ReconciliationResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  assertStripeBillingMode(session.livemode);

  const { data: intent, error: intentError } = await db
    .from("billing_checkout_intents")
    .select("id,status,plan_key,stripe_checkout_session_id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (intentError) throw intentError;
  if (!intent) return { status: "pending", nextAction: null };

  const sessionIntentId = typeof session.metadata?.checkout_intent_id === "string" ? session.metadata.checkout_intent_id : null;
  if (sessionIntentId !== intent.id) throw new Error("CHECKOUT_INTENT_MISMATCH");
  const paymentComplete = session.status === "complete"
    && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  if (!paymentComplete) return { status: "pending", nextAction: null };

  await markCheckoutIntentPaymentConfirmed(db, intent.id, session);
  const provisioning = await provisionPaidCheckout(db, session);
  if (provisioning.manualReview) return { status: "manual_review", nextAction: provisioning.nextAction };

  const subscription = typeof session.subscription === "object" && session.subscription
    ? session.subscription
    : null;
  if (!subscription || !provisioning.organizationId) {
    return { status: "provisioned", nextAction: provisioning.nextAction };
  }

  const currentItem = subscription.items.data[0];
  const priceId = currentItem?.price?.id ?? null;
  const planKey = await planFromPrice(db, priceId, subscription.metadata);
  if (!planKey) throw new Error("STRIPE_SUBSCRIPTION_PRICE_NOT_CONFIGURED");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const status = subscription.status;
  const { error: subscriptionError } = await db.from("billing_subscriptions").upsert({
    organization_id: provisioning.organizationId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_key: planKey,
    billing_interval: subscription.metadata?.billing_interval === "year" ? "year" : "month",
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_start: isoFromUnix(currentItem?.current_period_start),
    current_period_end: isoFromUnix(currentItem?.current_period_end),
    trial_end: isoFromUnix(subscription.trial_end),
    canceled_at: isoFromUnix(subscription.canceled_at),
    ended_at: isoFromUnix(subscription.ended_at),
    latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
  if (subscriptionError) throw subscriptionError;

  const { data: storedSubscription, error: storedSubscriptionError } = await db
    .from("billing_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (storedSubscriptionError) throw storedSubscriptionError;

  const entitlementSourceId = typeof storedSubscription?.id === "string" ? storedSubscription.id : null;
  const rows = entitlementRows(planKey, status === "active" || status === "trialing", entitlementSourceId)
    .map((row) => ({ organization_id: provisioning.organizationId, ...row }));
  const { error: entitlementError } = await db
    .from("billing_entitlements")
    .upsert(rows, { onConflict: "organization_id,feature_key" });
  if (entitlementError) throw entitlementError;

  return { status: "provisioned", nextAction: provisioning.nextAction };
}
