import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBillingPlan } from "@/lib/billing/catalog";
import { assertStripeBillingMode, getStripeClient } from "@/lib/billing/stripe";
import { markCheckoutIntentPaymentConfirmed, provisionPaidCheckout } from "@/lib/billing/provisioning";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isoFromUnix(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function planFromPrice(db: ReturnType<typeof createServerSupabaseClient>, priceId: string | null | undefined, metadata?: Stripe.Metadata): Promise<"starter" | "growth" | "enterprise" | null> {
  const metadataPlan = getBillingPlan(metadata?.plan_key);
  if (metadataPlan) return metadataPlan.key;
  if (priceId && priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) return "starter";
  if (priceId && priceId === process.env.STRIPE_PRICE_GROWTH_MONTHLY) return "growth";
  if (priceId) {
    const { data } = await db.from("billing_plan_catalog").select("plan_key").eq("stripe_price_id", priceId).maybeSingle();
    const catalogPlan = getBillingPlan(data?.plan_key);
    if (catalogPlan) return catalogPlan.key;
  }
  return null;
}

async function resolveOrganization(db: ReturnType<typeof createServerSupabaseClient>, customerId: string | null, metadata?: Stripe.Metadata) {
  const fromMetadata = typeof metadata?.organization_id === "string" ? metadata.organization_id : null;
  if (fromMetadata) return fromMetadata;
  const intentId = typeof metadata?.checkout_intent_id === "string" ? metadata.checkout_intent_id : null;
  if (intentId) {
    const { data: intent } = await db.from("billing_checkout_intents").select("organization_id").eq("id", intentId).maybeSingle();
    if (typeof intent?.organization_id === "string") return intent.organization_id;
  }
  if (!customerId) return null;
  const { data } = await db.from("billing_customers").select("organization_id").eq("stripe_customer_id", customerId).maybeSingle();
  return typeof data?.organization_id === "string" ? data.organization_id : null;
}

async function syncEntitlements(db: ReturnType<typeof createServerSupabaseClient>, organizationId: string, planKey: "starter" | "growth" | "enterprise" | null, active: boolean, subscriptionId: string | null) {
  if (!planKey) return;
  const { data: subscription } = subscriptionId
    ? await db.from("billing_subscriptions").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle()
    : { data: null };
  const sourceSubscriptionId = typeof subscription?.id === "string" ? subscription.id : null;
  const rows = [
    { organization_id: organizationId, plan_key: planKey, feature_key: "paid_workspace", enabled: active, source_subscription_id: sourceSubscriptionId, updated_at: new Date().toISOString() },
  ];
  const { error } = await db.from("billing_entitlements").upsert(rows, { onConflict: "organization_id,feature_key" });
  if (error) throw error;
}

async function handleEvent(db: ReturnType<typeof createServerSupabaseClient>, event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutIntentId = typeof session.metadata?.checkout_intent_id === "string" ? session.metadata.checkout_intent_id : null;
    if (checkoutIntentId) {
      await markCheckoutIntentPaymentConfirmed(db, checkoutIntentId, session);
      const provisioning = await provisionPaidCheckout(db, session);
      if (provisioning.manualReview) return;
    }
    const organizationId = await resolveOrganization(db, typeof session.customer === "string" ? session.customer : session.customer?.id ?? null, session.metadata ?? undefined);
    if (!organizationId) throw new Error("Stripe checkout session has no Costivra organization mapping.");
    if (typeof session.customer === "string") {
      const { error } = await db.from("billing_customers").upsert({ organization_id: organizationId, stripe_customer_id: session.customer, updated_at: new Date().toISOString() }, { onConflict: "organization_id" });
      if (error) throw error;
    }
    const { data: onboarding, error: onboardingReadError } = await db.from("organization_onboarding").select("source").eq("organization_id", organizationId).maybeSingle();
    if (onboardingReadError && onboardingReadError.code !== "42P01") throw onboardingReadError;
    if (!onboarding || onboarding.source === "internal") {
      const { error: onboardingError } = await db.from("organization_onboarding").upsert({
        organization_id: organizationId,
        source: "paid_checkout",
        status: "not_started",
        current_step: "account_confirmed",
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      if (onboardingError && onboardingError.code !== "42P01") throw onboardingError;
    }
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    const currentItem = subscription.items.data[0];
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const planKey = await planFromPrice(db, priceId, subscription.metadata);
    const organizationId = await resolveOrganization(db, customerId, subscription.metadata);
    if (!organizationId) {
      const intentId = typeof subscription.metadata?.checkout_intent_id === "string" ? subscription.metadata.checkout_intent_id : null;
      if (intentId) {
        const { data: intent } = await db.from("billing_checkout_intents").select("status").eq("id", intentId).maybeSingle();
        if (intent?.status === "manual_review") return;
      }
      throw new Error("Stripe subscription has no Costivra organization mapping.");
    }
    if (!planKey) throw new Error("Stripe subscription price is not configured for Costivra.");
    const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
    const { error } = await db.from("billing_subscriptions").upsert({
      organization_id: organizationId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_key: planKey,
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
    if (error) throw error;
    await syncEntitlements(db, organizationId, planKey, status === "active" || status === "trialing", subscription.id);
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionReference = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscriptionReference === "string" ? subscriptionReference : subscriptionReference?.id ?? null;
    if (!subscriptionId) return;
    const { data: current } = await db.from("billing_subscriptions").select("organization_id,plan_key").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    if (!current?.organization_id || !current.plan_key) return;
    const status = event.type === "invoice.paid" ? "active" : "past_due";
    const { error } = await db.from("billing_subscriptions").update({ status, latest_invoice_id: invoice.id, updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
    if (error) throw error;
    await syncEntitlements(db, current.organization_id, current.plan_key, status === "active", subscriptionId);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }
  if (event.livemode && process.env.STRIPE_BILLING_LIVEMODE_ENABLED !== "1") {
    return NextResponse.json({ error: "Live billing is not enabled." }, { status: 400 });
  }
  try { assertStripeBillingMode(event.livemode); } catch { return NextResponse.json({ error: "Billing mode is not configured." }, { status: 400 }); }

  const db = createServerSupabaseClient();
  const { data: existing } = await db.from("billing_events").select("status").eq("stripe_event_id", event.id).maybeSingle();
  if (existing?.status === "processed") return NextResponse.json({ received: true, duplicate: true });
  const { error: eventInsertError } = await db.from("billing_events").upsert({ stripe_event_id: event.id, event_type: event.type, livemode: event.livemode, status: "received" }, { onConflict: "stripe_event_id" });
  if (eventInsertError) return NextResponse.json({ error: "Webhook ledger unavailable." }, { status: 500 });

  try {
    await handleEvent(db, event);
    const { error: processedError } = await db.from("billing_events").update({ status: "processed", processed_at: new Date().toISOString(), safe_error: null }).eq("stripe_event_id", event.id);
    if (processedError) throw processedError;
    return NextResponse.json({ received: true });
  } catch (error) {
    const safeError = error instanceof Error ? error.message.slice(0, 240) : "Stripe event processing failed.";
    const { error: failedError } = await db.from("billing_events").update({ status: "failed", safe_error: safeError }).eq("stripe_event_id", event.id);
    if (failedError) console.error("stripe webhook ledger update failed", failedError);
    console.error("stripe webhook processing failed", error);
    return NextResponse.json({ error: "Stripe event processing failed." }, { status: 500 });
  }
}
