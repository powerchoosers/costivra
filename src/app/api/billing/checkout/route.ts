import { NextResponse } from "next/server";
import { getBillingPlan, getConfiguredPriceId } from "@/lib/billing/catalog";
import { assertStripeBillingMode, getStripeClient } from "@/lib/billing/stripe";
import { requirePortalContext } from "@/lib/portal/repository";
import { cleanText } from "@/lib/portal/http";

function appUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://costivra.ai").replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only an owner or administrator can start billing." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const plan = getBillingPlan(cleanText(body.planKey, 30));
    if (!plan) return NextResponse.json({ error: "Choose a valid Costivra plan." }, { status: 400 });
    const priceId = getConfiguredPriceId(plan);
    if (!plan.checkoutEnabled || !priceId) {
      return NextResponse.json({ error: "That plan is not configured for self-serve checkout yet." }, { status: 409 });
    }

    const [{ data: organization, error: organizationError }, { data: profile, error: profileError }] = await Promise.all([
      db.from("organizations").select("name").eq("id", organizationId).single(),
      db.from("profiles").select("email,full_name").eq("id", userId).single(),
    ]);
    if (organizationError) throw organizationError;
    if (profileError) throw profileError;

    const stripe = getStripeClient();
    assertStripeBillingMode();
    const requestKey = (request.headers.get("x-request-id") || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const existing = await db.from("billing_customers").select("stripe_customer_id").eq("organization_id", organizationId).maybeSingle();
    if (existing.error?.code === "42P01") return NextResponse.json({ error: "Billing database setup is incomplete." }, { status: 503 });
    if (existing.error) throw existing.error;

    let customerId = typeof existing.data?.stripe_customer_id === "string" ? existing.data.stripe_customer_id : null;
    if (!customerId) {
      const searched = await stripe.customers.search({ query: `metadata['organization_id']:'${organizationId}'`, limit: 1 });
      customerId = searched.data[0]?.id ?? null;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: typeof organization?.name === "string" ? organization.name : undefined,
        email: typeof profile?.email === "string" ? profile.email : undefined,
        metadata: { organization_id: organizationId },
      }, { idempotencyKey: `costivra-customer-${organizationId}-${requestKey}` });
      customerId = customer.id;
    }

    const { error: customerError } = await db.from("billing_customers").upsert({
      organization_id: organizationId,
      stripe_customer_id: customerId,
      billing_email: typeof profile?.email === "string" ? profile.email : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (customerError) throw customerError;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: organizationId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/portal/settings?billing=success`,
      cancel_url: `${appUrl()}/portal/settings?billing=cancelled`,
      metadata: { organization_id: organizationId, plan_key: plan.key },
      subscription_data: { metadata: { organization_id: organizationId, plan_key: plan.key } },
    }, { idempotencyKey: `costivra-checkout-${organizationId}-${plan.key}-${requestKey}` });

    const { error: auditError } = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: userId,
      actor_type: "user",
      action: "billing.checkout_started",
      resource_type: "billing_customer",
      resource_id: organizationId,
      safe_metadata: { plan_key: plan.key, checkout_session_id: session.id },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ url: session.url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing checkout could not be started.";
    if (message === "AUTH_REQUIRED" || message === "NO_ORGANIZATION_MEMBERSHIP") return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
    console.error("billing checkout failed", error);
    return NextResponse.json({ error: "Billing checkout could not be started." }, { status: 500 });
  }
}
