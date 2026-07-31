import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const body = await request.json() as Record<string, unknown>;
    const organizationVendorId = cleanUuid(body.organizationVendorId);
    const title = cleanText(body.title, 200);
    const category = cleanText(body.category, 100);
    if (!organizationVendorId || !title || !category) return NextResponse.json({ error: "Vendor, title, and category are required." }, { status: 400 });
    const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
    if (!relationship) return NextResponse.json({ error: "Vendor is not part of this organization." }, { status: 404 });
    const value = Number(body.annualValue);
    const notice = Number(body.noticePeriodDays);
    const { error } = await db.from("contracts").insert({
      organization_id: organizationId, organization_vendor_id: organizationVendorId, title, category,
      start_date: cleanText(body.startDate, 10) || null, end_date: cleanText(body.endDate, 10) || null,
      notice_period_days: Number.isFinite(notice) ? Math.max(0, notice) : null,
      annual_value: Number.isFinite(value) ? Math.max(0, value) : null,
      status: "active", auto_renews: Boolean(body.autoRenews), owner_name: cleanText(body.ownerName, 120) || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
