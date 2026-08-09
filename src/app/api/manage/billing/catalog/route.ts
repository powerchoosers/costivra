import { NextResponse } from "next/server";
import { getBillingCatalog, getBillingPlan, getConfiguredPriceId, type BillingPlanKey } from "@/lib/billing/catalog";
import { getStripeBillingMode, getStripeClient, stripeBillingEnabled } from "@/lib/billing/stripe";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";
import { cleanText } from "@/lib/portal/http";

export const runtime = "nodejs";

function normalizedFeatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 12);
}

function idempotencyKey(request: Request) {
  const value = (request.headers.get("x-request-id") || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
  return `costivra-catalog-${value || crypto.randomUUID()}`;
}

export async function GET() {
  try {
    await requireInternalOwner();
    return NextResponse.json({ mode: getStripeBillingMode(), billingEnabled: stripeBillingEnabled(), plans: await getBillingCatalog() });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const operator = await requireInternalOwner();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const planKey = cleanText(body?.planKey, 24) as BillingPlanKey;
    const definition = getBillingPlan(planKey);
    if (!definition) return NextResponse.json({ error: "Choose a valid Costivra plan." }, { status: 400 });

    const mode = getStripeBillingMode();
    if (mode !== "test" && mode !== "live") return NextResponse.json({ error: "Stripe mode is not configured on this server." }, { status: 409 });
    if (!stripeBillingEnabled()) return NextResponse.json({ error: "Stripe billing is disabled for this environment." }, { status: 409 });

    const displayName = cleanText(body?.displayName, 80) || definition.name;
    const description = cleanText(body?.description, 320) || definition.description;
    const features = normalizedFeatures(body?.features);
    const active = body?.active !== false;
    const interval: "month" | "year" | "custom" = planKey === "enterprise" ? "custom" : cleanText(body?.interval, 12) === "year" ? "year" : "month";
    const amountCents = planKey === "enterprise" ? null : Number(body?.amountCents);
    if (planKey !== "enterprise" && (!Number.isInteger(amountCents) || (amountCents ?? 0) < 100)) {
      return NextResponse.json({ error: "Enter a monthly or annual price of at least $1.00." }, { status: 400 });
    }

    const { data: current, error: currentError } = await operator.db
      .from("billing_plan_catalog")
      .select("stripe_product_id,stripe_price_id,amount_cents,interval")
      .eq("plan_key", planKey)
      .eq("stripe_mode", mode)
      .maybeSingle();
    if (currentError) throw currentError;

    let stripeProductId = typeof current?.stripe_product_id === "string" ? current.stripe_product_id : null;
    let stripePriceId = typeof current?.stripe_price_id === "string" ? current.stripe_price_id : getConfiguredPriceId(definition);
    const priceChanged = planKey !== "enterprise" && active && (!stripePriceId || current?.amount_cents !== amountCents || current?.interval !== interval);
    if (priceChanged) {
      const stripe = getStripeClient();
      const key = idempotencyKey(request);
      if (!stripeProductId && stripePriceId) {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        if (existingPrice.livemode !== (mode === "live")) throw new Error("STRIPE_PRICE_MODE_MISMATCH");
        stripeProductId = typeof existingPrice.product === "string" ? existingPrice.product : existingPrice.product.id;
      }
      if (!stripeProductId) {
        const product = await stripe.products.create({
          name: displayName,
          description,
          metadata: { costivra_plan_key: planKey },
        }, { idempotencyKey: `${key}-product` });
        stripeProductId = product.id;
      } else {
        await stripe.products.update(stripeProductId, { name: displayName, description, metadata: { costivra_plan_key: planKey } });
      }
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: amountCents as number,
        currency: "usd",
        recurring: { interval: interval as "month" | "year" },
        metadata: { costivra_plan_key: planKey },
      }, { idempotencyKey: `${key}-price` });
      const previousPriceId = stripePriceId;
      stripePriceId = price.id;
      if (previousPriceId && previousPriceId !== stripePriceId) {
        await stripe.prices.update(previousPriceId, { active: false });
      }
    } else if (planKey !== "enterprise" && active && stripePriceId) {
      const stripe = getStripeClient();
      if (!stripeProductId) {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        if (existingPrice.livemode !== (mode === "live")) throw new Error("STRIPE_PRICE_MODE_MISMATCH");
        stripeProductId = typeof existingPrice.product === "string" ? existingPrice.product : existingPrice.product.id;
      }
      await stripe.products.update(stripeProductId, { name: displayName, description, metadata: { costivra_plan_key: planKey } });
    } else if (planKey !== "enterprise" && !active && stripePriceId) {
      await getStripeClient().prices.update(stripePriceId, { active: false });
    } else if (planKey === "enterprise" && stripePriceId) {
      await getStripeClient().prices.update(stripePriceId, { active: false });
      stripePriceId = null;
    }

    const { data, error } = await operator.db.from("billing_plan_catalog").upsert({
      plan_key: planKey,
      stripe_mode: mode,
      display_name: displayName,
      description,
      amount_cents: amountCents as number,
      currency: "usd",
      interval,
      features,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
      active,
      updated_by: operator.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "plan_key,stripe_mode" }).select("*").single();
    if (error) throw error;

    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: null,
      action: "billing.catalog_updated",
      resource_type: "billing_plan_catalog",
      resource_id: data.id,
      safe_metadata: { plan_key: planKey, stripe_mode: mode, amount_cents: amountCents, interval, active },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ plan: data, plans: await getBillingCatalog() });
  } catch (error) {
    if (error instanceof Error && error.message === "STRIPE_PRICE_MODE_MISMATCH") {
      return NextResponse.json({ error: "The configured Stripe Price belongs to a different Stripe mode. Check the server environment before saving." }, { status: 409 });
    }
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
