import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { isValidTimeZone, nextReportRun } from "@/lib/reports/schedule";
import { authorizedReportRecipients, normalizeReportRecipients } from "@/lib/reports/recipients";
import { hasPaidWorkspace } from "@/lib/billing/free-review";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Administrator access is required to change outbound report schedules." }, { status: 403 });
    if (!await hasPaidWorkspace(db, organizationId)) return NextResponse.json({ error: "Scheduled reports are part of the paid workspace. Subscribe to keep receiving ongoing cost updates.", code: "PAID_WORKSPACE_REQUIRED", upgradeHref: "/pricing?from=workspace" }, { status: 402 });
    const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid schedule." }, { status: 400 });
    const { data: current, error: currentError } = await db.from("report_schedules").select("*").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const status = body.status === undefined ? current.status : body.status === "paused" || body.status === "active" || body.status === "archived" ? body.status : null;
    if (!status) return NextResponse.json({ error: "Choose active, paused, or archived status." }, { status: 400 });
    const cadence = body.cadence === undefined ? current.cadence : body.cadence === "monthly" || body.cadence === "weekly" ? body.cadence : null;
    if (!cadence) return NextResponse.json({ error: "Choose weekly or monthly cadence." }, { status: 400 });
    const timezone = typeof body.timezone === "string" ? cleanText(body.timezone, 80) : String(current.timezone);
    if (!isValidTimeZone(timezone)) return NextResponse.json({ error: "Choose a valid IANA timezone, such as America/Chicago." }, { status: 400 });
    const sendTimeLocal = typeof body.sendTimeLocal === "string" ? body.sendTimeLocal : String(current.send_time_local).slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(sendTimeLocal) || Number(sendTimeLocal.slice(0, 2)) > 23 || Number(sendTimeLocal.slice(3)) > 59) return NextResponse.json({ error: "Choose a valid local send time." }, { status: 400 });
    const weekday = cadence === "weekly" ? (typeof body.weekday === "number" ? Math.max(0, Math.min(6, Math.trunc(body.weekday))) : Number(current.weekday ?? 1)) : null;
    const dayOfMonth = cadence === "monthly" ? (typeof body.dayOfMonth === "number" ? Math.max(1, Math.min(28, Math.trunc(body.dayOfMonth))) : Number(current.day_of_month ?? 1)) : null;
    const requestedRecipients = body.recipientEmails === undefined ? normalizeReportRecipients(current.recipient_emails) : normalizeReportRecipients(body.recipientEmails);
    if (!requestedRecipients.length) return NextResponse.json({ error: "Choose at least one workspace recipient." }, { status: 400 });
    const { data: members } = await db.from("organization_memberships").select("user_id,profiles(email)").eq("organization_id", organizationId);
    const authorized = new Set((members ?? []).map((member) => (member.profiles as unknown as { email?: string } | null)?.email?.trim().toLowerCase()).filter((value): value is string => Boolean(value)));
    const recipients = authorizedReportRecipients(requestedRecipients, authorized);
    if (recipients.length !== requestedRecipients.length) return NextResponse.json({ error: "Reports can only be sent to authorized workspace users." }, { status: 403 });
    const next = status === "active" ? nextReportRun({ cadence, timezone, weekday, dayOfMonth, sendTimeLocal }) : null;
    const { data, error } = await db.from("report_schedules").update({ status, cadence, timezone, weekday, day_of_month: dayOfMonth, send_time_local: sendTimeLocal, recipient_emails: recipients, next_run_at: next, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ schedule: data });
  } catch (error) { return apiError(error); }
}
