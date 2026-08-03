import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const body = await request.json() as Record<string, unknown>;
    const organizationVendorId = cleanUuid(body.organizationVendorId);
    const locationId = cleanUuid(body.locationId);
    const category = cleanText(body.category, 100);
    const periodStart = cleanText(body.periodStart, 10);
    const periodEnd = cleanText(body.periodEnd, 10);
    const amount = Number(body.amount);
    const prior = body.priorPeriodAmount === "" || body.priorPeriodAmount == null ? null : Number(body.priorPeriodAmount);
    if (!organizationVendorId || !category || !periodStart || !periodEnd || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Vendor, category, dates, and a valid amount are required." }, { status: 400 });
    if (periodEnd < periodStart) return NextResponse.json({ error: "The period end cannot be before the start." }, { status: 400 });
    const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
    if (!relationship) return NextResponse.json({ error: "Vendor is not part of this organization." }, { status: 404 });
    if (body.locationId && !locationId) return NextResponse.json({ error: "Choose a valid location." }, { status: 400 });
    if (locationId) {
      const { data: location, error: locationError } = await db.from("locations").select("id").eq("id", locationId).eq("organization_id", organizationId).eq("status", "active").maybeSingle();
      if (locationError) throw locationError;
      if (!location) return NextResponse.json({ error: "Choose an active location in this workspace." }, { status: 404 });
    }
    const created = await db.from("expenses").insert({ organization_id: organizationId, organization_vendor_id: organizationVendorId, location_id: locationId, category, period_start: periodStart, period_end: periodEnd, amount, prior_period_amount: prior != null && Number.isFinite(prior) && prior >= 0 ? prior : null, status: "reviewed", metadata: { source: "manual_entry" } }).select("id").single();
    if (created.error) throw created.error;
    const audit = await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "expense.created", resource_type: "expense", resource_id: created.data.id });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
