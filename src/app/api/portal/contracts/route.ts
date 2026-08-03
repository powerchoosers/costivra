import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const body = await request.json() as Record<string, unknown>;
    const organizationVendorId = cleanUuid(body.organizationVendorId);
    const title = cleanText(body.title, 200);
    const category = cleanText(body.category, 100);
    const locationId = cleanUuid(body.locationId);
    if (!organizationVendorId || !title || !category) return NextResponse.json({ error: "Vendor, title, and category are required." }, { status: 400 });
    const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
    if (!relationship) return NextResponse.json({ error: "Vendor is not part of this organization." }, { status: 404 });
    if (body.locationId && !locationId) return NextResponse.json({ error: "Choose a valid location." }, { status: 400 });
    if (locationId) {
      const { data: location, error: locationError } = await db.from("locations").select("id").eq("id", locationId).eq("organization_id", organizationId).eq("status", "active").maybeSingle();
      if (locationError) throw locationError;
      if (!location) return NextResponse.json({ error: "Choose an active location in this workspace." }, { status: 404 });
    }
    const value = Number(body.annualValue);
    const notice = Number(body.noticePeriodDays);
    const created = await db.from("contracts").insert({
      organization_id: organizationId, organization_vendor_id: organizationVendorId, location_id: locationId, title, category,
      start_date: cleanText(body.startDate, 10) || null, end_date: cleanText(body.endDate, 10) || null,
      notice_period_days: Number.isFinite(notice) ? Math.max(0, notice) : null,
      annual_value: Number.isFinite(value) ? Math.max(0, value) : null,
      status: "active", auto_renews: Boolean(body.autoRenews), owner_name: cleanText(body.ownerName, 120) || null,
    }).select("id").single();
    if (created.error) throw created.error;
    const audit = await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "contract.created", resource_type: "contract", resource_id: created.data.id });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
