import { NextResponse } from "next/server";
import { getBillingCatalogPlan, getBillingPlan } from "@/lib/billing/catalog";
import { assertStripeBillingMode, getStripeAccountReadiness, getStripeBillingMode, getStripeClient, stripeAccountReadyForLiveCheckout } from "@/lib/billing/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/portal/http";

function appUrl(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) return requestOrigin;
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || "https://costivra.ai").replace(/\/$/, "");
}

function requestKey(value: unknown): string {
  const cleaned = cleanText(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || crypto.randomUUID();
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value) && value.length <= 254;
}

function stripeIntegrationIdentifier() {
  const suffix = crypto.randomUUID().replace(/[^a-z]/gi, "").slice(0, 8).padEnd(8, "a");
  return `costivra_preauth_${suffix}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const email = cleanText(body.email, 254).toLowerCase();
    const fullName = cleanText(body.fullName, 120);
    const companyName = cleanText(body.companyName, 160);
    const plan = getBillingPlan(cleanText(body.planKey, 30));
    if (!plan || !validEmail(email) || fullName.length < 2 || companyName.length < 2) {
      return NextResponse.json({ error: "Enter your name, company, work email, and a valid plan." }, { status: 400 });
    }

    const catalogPlan = await getBillingCatalogPlan(plan.key);
    const priceId = catalogPlan.active ? catalogPlan.stripePriceId : null;
    if (!plan.checkoutEnabled || !priceId) {
      return NextResponse.json({ error: "That plan is not configured for self-serve checkout yet." }, { status: 409 });
    }

    const stripeMode = getStripeBillingMode();
    if (stripeMode !== "test" && stripeMode !== "live") return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 503 });
    assertStripeBillingMode();
    if (stripeMode === "live" && !stripeAccountReadyForLiveCheckout(await getStripeAccountReadiness())) {
      return NextResponse.json({ error: "Stripe account setup is incomplete. Enable charges and payouts before starting live checkout." }, { status: 409 });
    }

    const stripe = getStripeClient();
    const stripePrice = await stripe.prices.retrieve(priceId);
    if (!stripePrice.active || stripePrice.livemode !== (stripeMode === "live")) {
      return NextResponse.json({ error: "That plan's Stripe price is not available in the configured billing mode." }, { status: 409 });
    }

    const db = createServerSupabaseClient();
    const idempotencyKey = requestKey(body.requestKey || request.headers.get("x-request-id"));
    const existing = await db.from("billing_checkout_intents")
      .select("id,email,full_name,company_name,plan_key,status,stripe_customer_id,checkout_url")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing.error?.code === "42P01") return NextResponse.json({ error: "Paid signup is not ready until the billing migration is applied." }, { status: 503 });
    if (existing.error) throw existing.error;
    if (existing.data) {
      const sameRequest = existing.data.email === email && existing.data.plan_key === plan.key && existing.data.company_name === companyName;
      if (!sameRequest) return NextResponse.json({ error: "That checkout request key is already in use." }, { status: 409 });
      if (typeof existing.data.checkout_url === "string" && existing.data.checkout_url) return NextResponse.json({ url: existing.data.checkout_url, reused: true }, { status: 200 });
    }

    const intentId = typeof existing.data?.id === "string" ? existing.data.id : crypto.randomUUID();
    if (!existing.data) {
      const { error: intentError } = await db.from("billing_checkout_intents").insert({
        id: intentId,
        idempotency_key: idempotencyKey,
        email,
        full_name: fullName,
        company_name: companyName,
        plan_key: plan.key,
        stripe_mode: stripeMode,
        status: "created",
      });
      if (intentError?.code === "23505") {
        const { data: racedIntent, error: rereadError } = await db.from("billing_checkout_intents")
          .select("id,email,full_name,company_name,plan_key,status,checkout_url")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (rereadError) throw rereadError;
        if (racedIntent?.email === email && racedIntent.plan_key === plan.key && racedIntent.company_name === companyName && typeof racedIntent.checkout_url === "string" && racedIntent.checkout_url) {
          return NextResponse.json({ url: racedIntent.checkout_url, reused: true }, { status: 200 });
        }
        return NextResponse.json({ error: "That checkout request is already being started. Please try again in a moment." }, { status: 409 });
      }
      if (intentError) throw intentError;
    }

    // Persist the customer as soon as it exists. If Checkout creation times
    // out or Stripe returns an error, a retry reuses this customer instead of
    // creating a second provider record for the same intent.
    let customerId = typeof existing.data?.stripe_customer_id === "string" ? existing.data.stripe_customer_id : null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: companyName,
        metadata: { checkout_intent_id: intentId, plan_key: plan.key },
      }, { idempotencyKey: `costivra-preauth-customer-${intentId}` });
      customerId = customer.id;
      const { error: customerUpdateError } = await db.from("billing_checkout_intents").update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }).eq("id", intentId);
      if (customerUpdateError) throw customerUpdateError;
    }
    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        integration_identifier: stripeIntegrationIdentifier(),
        customer: customerId,
        client_reference_id: intentId,
        // Costivra is the merchant of record for this pilot. Stripe Managed
        // Payments requires product tax codes and tax registration, so keep it
        // explicitly off until that separate compliance setup is approved.
        managed_payments: { enabled: false },
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl(request)}/signup?plan=${encodeURIComponent(plan.key)}&billing=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl(request)}/signup?plan=${encodeURIComponent(plan.key)}&billing=cancelled`,
        metadata: { checkout_intent_id: intentId, plan_key: plan.key },
        subscription_data: { metadata: { checkout_intent_id: intentId, plan_key: plan.key } },
      }, { idempotencyKey: `costivra-preauth-checkout-${intentId}` });
    } catch (error) {
      const { error: intentFailureError } = await db.from("billing_checkout_intents").update({
        status: "failed",
        safe_error: "STRIPE_CHECKOUT_SESSION_CREATE_FAILED",
        updated_at: new Date().toISOString(),
      }).eq("id", intentId).in("status", ["created", "checkout_open"]);
      if (intentFailureError) console.error("checkout intent failure state could not be saved", intentFailureError);
      throw error;
    }

    const { error: updateError } = await db.from("billing_checkout_intents").update({
      status: "checkout_open",
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      updated_at: new Date().toISOString(),
    }).eq("id", intentId);
    if (updateError) throw updateError;
    return NextResponse.json({ url: session.url }, { status: 201 });
  } catch (error) {
    console.error("pre-auth billing checkout failed", error);
    return NextResponse.json({ error: "Paid signup could not be started. Please try again." }, { status: 500 });
  }
}
