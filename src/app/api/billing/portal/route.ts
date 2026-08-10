import { NextResponse } from "next/server";
import { assertStripeBillingMode, getStripeClient } from "@/lib/billing/stripe";
import { requirePortalContext } from "@/lib/portal/repository";

function appUrl(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) return requestOrigin;
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || "https://costivra.ai").replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Only an owner or administrator can manage billing." }, { status: 403 });
    assertStripeBillingMode();
    const { data: customer, error } = await db.from("billing_customers").select("stripe_customer_id").eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    if (!customer?.stripe_customer_id) return NextResponse.json({ error: "No billing account has been started for this workspace." }, { status: 409 });
    const returnUrl = `${appUrl(request)}/app/settings?tab=billing`;
    const session = await getStripeClient().billingPortal.sessions.create({ customer: customer.stripe_customer_id, return_url: returnUrl });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing portal could not be opened.";
    if (message === "AUTH_REQUIRED" || message === "NO_ORGANIZATION_MEMBERSHIP") return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
    console.error("billing portal failed", error);
    return NextResponse.json({ error: "Billing portal could not be opened." }, { status: 500 });
  }
}
