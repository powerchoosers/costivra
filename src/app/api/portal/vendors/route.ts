import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { annualizeSpendCents, parseMoneyToCents, type BillingCadence } from "@/lib/vendors/spend";
import { checkEntitlement, entitlementError } from "@/lib/billing/entitlements";

function normalizeWebsite(value: unknown): string | null {
  const website = cleanText(value, 300);
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().replace(/\/$/, "") : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'You do not have permission to add vendors.' }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const catalogVendorId = cleanUuid(body.vendorId);
    let name = cleanText(body.name, 160);
    let category = cleanText(body.category, 100) || "Other";
    let website = normalizeWebsite(body.website);
    let vendor: { id: string } | null = null;

    if (catalogVendorId) {
      const { data: canonical, error } = await db.from("vendors").select("id,canonical_name,category,website").eq("id", catalogVendorId).maybeSingle();
      if (error) throw error;
      if (!canonical) return NextResponse.json({ error: "That vendor suggestion is no longer available." }, { status: 404 });
      vendor = { id: canonical.id as string };
      name = canonical.canonical_name as string;
      category = (canonical.category as string | null) || "Other";
      website = (canonical.website as string | null) || null;
    } else {
      if (!name) return NextResponse.json({ error: "Vendor name is required." }, { status: 400 });
      if (cleanText(body.website, 300) && !website) return NextResponse.json({ error: "Enter a valid HTTP or HTTPS website." }, { status: 400 });
      const { data: customVendor, error } = await db.from("vendors").upsert({ canonical_name: name, category, website }, { onConflict: "canonical_name" }).select("id").single();
      if (error) throw error;
      vendor = customVendor as { id: string };
    }

    const cadence: BillingCadence = body.spendCadence === "monthly" ? "monthly" : "annual";
    const amountCents = parseMoneyToCents(body.spendAmount ?? body.annualizedSpend ?? "0");
    if (amountCents == null) return NextResponse.json({ error: "Enter spend as dollars and cents, for example 1250.00." }, { status: 400 });
    const annualizedSpendCents = annualizeSpendCents(amountCents, cadence);
    const relationshipStatus = ["prospect", "active", "inactive", "terminated"].includes(String(body.relationshipStatus)) ? String(body.relationshipStatus) : "active";
    const { data: existing } = await db.from("organization_vendors").select("id").eq("organization_id", organizationId).eq("vendor_id", vendor.id).maybeSingle();
    if (existing) return NextResponse.json({ error: "This vendor is already in the workspace." }, { status: 409 });
    if (relationshipStatus !== "terminated") {
      const { data: relationships, error: relationshipsError } = await db
        .from("organization_vendors")
        .select("id,relationship_status")
        .eq("organization_id", organizationId);
      if (relationshipsError) throw relationshipsError;
      const currentUsage = Array.isArray(relationships)
        ? relationships.filter((relationship) => relationship.relationship_status !== "terminated").length
        : 0;
      const entitlement = await checkEntitlement(db, organizationId, "monitored_vendors", currentUsage);
      if (!entitlement.allowed) {
        return NextResponse.json({ error: entitlementError(entitlement), code: "BILLING_LIMIT_REACHED", feature: entitlement.featureKey, limit: entitlement.limitValue, usage: entitlement.currentUsage }, { status: entitlement.reason === "limit_reached" ? 409 : 402 });
      }
    }
    const { data: relationship, error } = await db.from("organization_vendors").insert({
      organization_id: organizationId,
      vendor_id: vendor.id,
      annualized_spend: (annualizedSpendCents / 100).toFixed(2),
      relationship_status: relationshipStatus,
      spend_cadence: cadence,
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, vendorId: vendor.id, relationshipId: relationship.id, name, category, website }, { status: 201 });
  } catch (error) { return apiError(error); }
}
