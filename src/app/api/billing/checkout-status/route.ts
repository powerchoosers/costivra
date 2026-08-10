import { NextResponse } from "next/server";
import { reconcileCheckoutSession } from "@/lib/billing/checkout-reconciliation";
import { getStripeClient } from "@/lib/billing/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: "A valid Checkout session is required." }, { status: 400 });
  try {
    const { data, error } = await createServerSupabaseClient()
      .from("billing_checkout_intents")
      .select("status,plan_key,next_action")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (error?.code === "42P01") return NextResponse.json({ status: "unconfigured" }, { status: 200 });
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "pending" }, { status: 200 });
    const status = typeof data.status === "string" ? data.status : "pending";
    return NextResponse.json({
      status,
      planKey: typeof data.plan_key === "string" ? data.plan_key : null,
      nextAction: typeof data.next_action === "string" ? data.next_action : null,
      ready: status === "provisioned",
    });
  } catch (error) {
    console.error("checkout status failed", error);
    return NextResponse.json({ error: "Checkout status could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: "A valid Checkout session is required." }, { status: 400 });
  try {
    const result = await reconcileCheckoutSession(createServerSupabaseClient(), getStripeClient(), sessionId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("checkout reconciliation failed", error);
    return NextResponse.json({ error: "Checkout reconciliation could not be completed." }, { status: 500 });
  }
}
