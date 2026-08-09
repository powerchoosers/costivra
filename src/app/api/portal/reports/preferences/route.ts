import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

const defaults = {
  immediate_finding_alerts: true,
  review_alerts: true,
  approval_requests: true,
  missed_bill_alerts: true,
  weekly_digest: true,
  monthly_executive_report: true,
  allow_empty_reports: false,
};

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const { data, error } = await db.from("report_communication_preferences").select("*").eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ preferences: { ...defaults, ...(data ?? {}) } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!(["owner", "admin"] as string[]).includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const values = Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof body[key] === "boolean" ? body[key] : defaults[key as keyof typeof defaults]]));
    const { data, error } = await db.from("report_communication_preferences").upsert({ organization_id: organizationId, ...values, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "organization_id" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ preferences: data });
  } catch (error) { return apiError(error); }
}
