import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { nextReportRun } from "@/lib/reports/schedule";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid schedule." }, { status: 400 });
    const { data: current, error: currentError } = await db.from("report_schedules").select("*").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const status = body.status === "paused" ? "paused" : body.status === "active" ? "active" : current.status;
    const next = status === "active" ? nextReportRun({ cadence: current.cadence, timezone: current.timezone, weekday: current.weekday, dayOfMonth: current.day_of_month, sendTimeLocal: String(current.send_time_local).slice(0, 5) }) : null;
    const { data, error } = await db.from("report_schedules").update({ status, next_run_at: next, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ schedule: data });
  } catch (error) { return apiError(error); }
}
