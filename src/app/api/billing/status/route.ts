import { NextResponse } from "next/server";
import { requirePortalContext } from "@/lib/portal/repository";

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const [{ data: subscriptions, error: subscriptionsError }, { data: entitlements, error: entitlementsError }] = await Promise.all([
      db.from("billing_subscriptions").select("plan_key,status,cancel_at_period_end,current_period_end,trial_end").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
      db.from("billing_entitlements").select("feature_key,enabled,limit_value,expires_at").eq("organization_id", organizationId),
    ]);
    if (subscriptionsError?.code === "42P01" || entitlementsError?.code === "42P01") {
      return NextResponse.json({ status: "unconfigured", subscriptions: [], entitlements: [] });
    }
    if (subscriptionsError) throw subscriptionsError;
    if (entitlementsError) throw entitlementsError;
    return NextResponse.json({ subscriptions: subscriptions ?? [], entitlements: entitlements ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing status could not be loaded.";
    if (message === "AUTH_REQUIRED" || message === "NO_ORGANIZATION_MEMBERSHIP") return NextResponse.json({ error: "Sign in to view billing." }, { status: 401 });
    console.error("billing status failed", error);
    return NextResponse.json({ error: "Billing status could not be loaded." }, { status: 500 });
  }
}
