import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { isValidTimeZone, nextReportRun } from "@/lib/reports/schedule";
import { authorizedReportRecipients, normalizeReportRecipients } from "@/lib/reports/recipients";

export async function GET() {
  try { const { db, organizationId } = await requirePortalContext(); const { data, error } = await db.from("report_schedules").select("*, report_definitions(name,report_type)").eq("organization_id", organizationId).order("created_at", { ascending: false }); if (error) throw error; return NextResponse.json({ schedules: data ?? [] }); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Administrator access is required to schedule outbound reports." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const reportDefinitionId = cleanUuid(body.reportDefinitionId); const cadence = body.cadence === "monthly" ? "monthly" : "weekly"; const timezone = cleanText(body.timezone, 80) || "America/Chicago"; const sendTime = /^\d{2}:\d{2}$/.test(String(body.sendTimeLocal)) ? String(body.sendTimeLocal) : "08:00";
    if (!isValidTimeZone(timezone)) return NextResponse.json({ error: "Choose a valid IANA timezone, such as America/Chicago." }, { status: 400 });
    const requestedRecipients = normalizeReportRecipients(body.recipientEmails);
    if (!reportDefinitionId || !requestedRecipients.length) return NextResponse.json({ error: "Choose a report and at least one workspace recipient." }, { status: 400 });
    const { data: definition } = await db.from("report_definitions").select("id").eq("id", reportDefinitionId).eq("organization_id", organizationId).maybeSingle(); if (!definition) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const { data: members } = await db.from("organization_memberships").select("user_id,profiles(email)").eq("organization_id", organizationId);
    const authorized = new Set((members ?? []).map((member) => (member.profiles as unknown as { email?: string } | null)?.email?.trim().toLowerCase()).filter((value): value is string => Boolean(value)));
    const recipients = authorizedReportRecipients(requestedRecipients, authorized);
    if (recipients.length !== requestedRecipients.length) return NextResponse.json({ error: "Reports can only be sent to authorized workspace users." }, { status: 403 });
    const weekday = cadence === "weekly" && typeof body.weekday === "number" ? Math.max(0, Math.min(6, Math.trunc(body.weekday))) : null; const dayOfMonth = cadence === "monthly" && typeof body.dayOfMonth === "number" ? Math.max(1, Math.min(28, Math.trunc(body.dayOfMonth))) : null;
    if (cadence === "weekly" && weekday == null) return NextResponse.json({ error: "Choose a weekday." }, { status: 400 });
    if (cadence === "monthly" && dayOfMonth == null) return NextResponse.json({ error: "Choose a day of the month." }, { status: 400 });
    const next = nextReportRun({ cadence, timezone, weekday, dayOfMonth, sendTimeLocal: sendTime });
    const { data, error } = await db.from("report_schedules").insert({ organization_id: organizationId, report_definition_id: reportDefinitionId, cadence, timezone, weekday, day_of_month: dayOfMonth, send_time_local: sendTime, recipient_emails: recipients, next_run_at: next, created_by: userId, updated_by: userId }).select("id").single(); if (error) throw error;
    return NextResponse.json({ id: data.id, nextRunAt: next }, { status: 201 });
  } catch (error) { return apiError(error); }
}
