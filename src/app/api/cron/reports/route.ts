import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { emailRequestHash, sendTransactionalEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function nextScheduleRun(schedule: Record<string, unknown>, from: Date) {
  const next = new Date(from); const time = String(schedule.send_time_local || "08:00"); next.setUTCHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  if (schedule.cadence === "monthly") { next.setUTCDate(Number(schedule.day_of_month) || 1); if (next <= from) next.setUTCMonth(next.getUTCMonth() + 1); }
  else { const target = Number(schedule.weekday ?? 1); const delta = ((target - next.getUTCDay()) + 7) % 7 || 7; next.setUTCDate(next.getUTCDate() + delta); }
  return next.toISOString();
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient(); const now = new Date();
  const { data: schedules, error } = await db.from("report_schedules").select("*, report_definitions(id,name,description,report_type,organization_id)").eq("status", "active").lte("next_run_at", now.toISOString()).order("next_run_at").limit(20);
  if (error) return NextResponse.json({ error: "Report schedules could not be loaded." }, { status: 500 });
  const results: Array<{ scheduleId: string; status: string; recipients: number }> = [];
  for (const schedule of schedules ?? []) {
    const scheduledFor = schedule.next_run_at as string;
    const claim = await db.from("report_delivery_runs").insert({ organization_id: schedule.organization_id, report_definition_id: schedule.report_definition_id, report_schedule_id: schedule.id, scheduled_for: scheduledFor, status: "claimed" }).select("id").maybeSingle();
    if (claim.error?.code === "23505") continue;
    if (claim.error || !claim.data) { results.push({ scheduleId: schedule.id, status: "claim_failed", recipients: 0 }); continue; }
    try {
      const report = await generateReport(db, schedule.report_definitions);
      const rendered = renderReportEmail(report); const recipients = Array.isArray(schedule.recipient_emails) ? schedule.recipient_emails as string[] : [];
      let sent = 0;
      for (const recipient of recipients) {
        const idempotencyKey = `report/${schedule.id}/${scheduledFor}/${recipient}`; const requestHash = emailRequestHash({ to: recipient, subject: `${report.definition.name} is ready`, text: rendered.text });
        const ledger = await db.from("external_side_effects").upsert({ organization_id: schedule.organization_id, type: "report_email", destination: recipient, idempotency_key: idempotencyKey, request_hash: requestHash, status: "approved", provider: "resend", authorization_method: "report_schedule_v1", sanitized_request_metadata: { report_schedule_id: schedule.id, report_delivery_run_id: claim.data.id, report_definition_id: report.definition.id }, updated_at: new Date().toISOString() }, { onConflict: "idempotency_key" }).select("id").single();
        if (ledger.error) throw ledger.error;
        const result = await sendTransactionalEmail({ to: recipient, subject: `${report.definition.name} is ready`, text: rendered.text, html: rendered.html, idempotencyKey });
        await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
        if (!result.ok) throw new Error(result.error); sent += 1;
        if (sent === 1) await db.from("report_delivery_runs").update({ external_side_effect_id: ledger.data.id, provider_message_id: result.providerId, generated_at: report.generatedAt }).eq("id", claim.data.id);
      }
      const next = nextScheduleRun(schedule, now); await db.from("report_delivery_runs").update({ status: "accepted", completed_at: new Date().toISOString(), safe_error: null }).eq("id", claim.data.id); await db.from("report_schedules").update({ next_run_at: next, last_run_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", schedule.id);
      results.push({ scheduleId: schedule.id, status: "accepted", recipients: sent });
    } catch (runError) {
      const safeError = runError instanceof Error ? runError.message.slice(0, 240) : "REPORT_DELIVERY_FAILED"; await db.from("report_delivery_runs").update({ status: "failed", safe_error: safeError, completed_at: new Date().toISOString() }).eq("id", claim.data.id); results.push({ scheduleId: schedule.id, status: "failed", recipients: 0 });
    }
  }
  return NextResponse.json({ checkedAt: now.toISOString(), processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
