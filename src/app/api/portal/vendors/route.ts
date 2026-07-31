import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const body = await request.json() as Record<string, unknown>;
    const name = cleanText(body.name, 160);
    const category = cleanText(body.category, 100) || "Other";
    const website = cleanText(body.website, 300) || null;
    const annualizedSpend = Number(body.annualizedSpend);
    if (!name) return NextResponse.json({ error: "Vendor name is required." }, { status: 400 });
    const { data: vendor, error: vendorError } = await db.from("vendors").upsert({ canonical_name: name, category, website }, { onConflict: "canonical_name" }).select("id").single();
    if (vendorError) throw vendorError;
    const { data: existing } = await db.from("organization_vendors").select("id").eq("organization_id", organizationId).eq("vendor_id", vendor.id).maybeSingle();
    if (existing) return NextResponse.json({ error: "This vendor is already in the workspace." }, { status: 409 });
    const { error } = await db.from("organization_vendors").insert({ organization_id: organizationId, vendor_id: vendor.id, annualized_spend: Number.isFinite(annualizedSpend) ? Math.max(0, annualizedSpend) : 0 });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
