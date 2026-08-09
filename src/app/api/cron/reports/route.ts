import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { emailRequestHash, sendTransactionalEmail } from "@/lib/email/resend";
import { claimExternalSideEffect } from "@/lib/email/side-effect-claim";
import { authorizedReportRecipients } from "@/lib/reports/recipients";
import { nextReportRun } from "@/lib/reports/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient(); const now = new Date();
  const { data: schedules, error } = await db.from("report_schedules").select("*, report_definitions(id,name,description,report_type,organization_id)").eq("status", "active").lte("next_run_at", now.toISOString()).order("next_run_at").limit(20);
  if (error) return NextResponse.json({ error: "Report schedules could not be loaded." }, { status: 500 });
  const results: Array<{ scheduleId: string; status: string; recipients: number }> = [];
  for (const schedule of schedules ?? []) {
    const scheduledFor = schedule.next_run_at as string;
    const claim = await db.from("report_delivery_runs").insert({ organization_id: schedule.organization_id, report_definition_id: schedule.report_definition_id, report_schedule_id: schedule.id, scheduled_for: scheduledFor, status: "claimed" }).select("id").maybeSingle();
    let deliveryRunId = claim.data?.id as string | undefined;
    if (claim.error?.code === "23505") {
      // A failed run may be retried safely. Accepted/delivered runs remain
      // immutable so a duplicate cron invocation cannot send the period twice.
      const { data: previous } = await db.from("report_delivery_runs")
        .select("id,status")
        .eq("report_schedule_id", schedule.id)
        .eq("scheduled_for", scheduledFor)
        .maybeSingle();
      if (previous?.status !== "failed") continue;
      const { data: reclaimed, error: reclaimError } = await db.from("report_delivery_runs")
        .update({ status: "claimed", safe_error: null, completed_at: null })
        .eq("id", previous.id)
        .eq("status", "failed")
        .select("id")
        .maybeSingle();
      if (reclaimError || !reclaimed) continue;
      deliveryRunId = reclaimed.id as string;
    }
    if (claim.error && claim.error.code !== "23505") { results.push({ scheduleId: schedule.id, status: "claim_failed", recipients: 0 }); continue; }
    if (!deliveryRunId) { results.push({ scheduleId: schedule.id, status: "claim_failed", recipients: 0 }); continue; }
    try {
      const { data: preferences } = await db.from("report_communication_preferences").select("weekly_digest,monthly_executive_report,allow_empty_reports").eq("organization_id", schedule.organization_id).maybeSingle();
      const cadenceEnabled = schedule.cadence === "monthly" ? preferences?.monthly_executive_report !== false : preferences?.weekly_digest !== false;
      const next = nextReportRun({ cadence: schedule.cadence, timezone: schedule.timezone, weekday: schedule.weekday, dayOfMonth: schedule.day_of_month, sendTimeLocal: String(schedule.send_time_local).slice(0, 5) }, now);
      if (!cadenceEnabled) {
        await db.from("report_delivery_runs").update({ status: "skipped", safe_error: "REPORT_TYPE_DISABLED", completed_at: new Date().toISOString() }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({ next_run_at: next, last_run_at: now.toISOString(), updated_at: new Date().toISOString() }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 }); continue;
      }
      const report = await generateReport(db, schedule.report_definitions);
      if (!report.values.length && preferences?.allow_empty_reports !== true) {
        await db.from("report_delivery_runs").update({ status: "skipped", generated_at: report.generatedAt, safe_error: "NO_MEANINGFUL_CHANGES", completed_at: new Date().toISOString() }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({ next_run_at: next, last_run_at: now.toISOString(), updated_at: new Date().toISOString() }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 }); continue;
      }
      const { data: members, error: memberError } = await db.from("organization_memberships").select("user_id,profiles(email)").eq("organization_id", schedule.organization_id);
      if (memberError) throw memberError;
      const authorized = new Set((members ?? [])
        .map((member) => ((member.profiles as unknown as { email?: string } | null)?.email ?? "").trim().toLowerCase())
        .filter(Boolean));
      const recipients = authorizedReportRecipients(schedule.recipient_emails, authorized);
      if (!recipients.length) {
        await db.from("report_delivery_runs").update({ status: "skipped", generated_at: report.generatedAt, safe_error: "NO_AUTHORIZED_RECIPIENTS", completed_at: new Date().toISOString() }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({ next_run_at: next, last_run_at: now.toISOString(), updated_at: new Date().toISOString() }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 }); continue;
      }
      const rendered = renderReportEmail(report);
      let sent = 0;
      for (const recipient of recipients) {
        const idempotencyKey = `report/${schedule.id}/${scheduledFor}/${recipient}`; const requestHash = emailRequestHash({ to: recipient, subject: `${report.definition.name} is ready`, text: rendered.text });
        const claim = await claimExternalSideEffect(db, {
          organizationId: schedule.organization_id,
          type: "report_email",
          destination: recipient,
          idempotencyKey,
          requestHash,
          authorizationMethod: "report_schedule_v1",
          sanitizedRequestMetadata: { report_schedule_id: schedule.id, report_delivery_run_id: deliveryRunId, report_definition_id: report.definition.id },
        });
        if (!claim.claimed) {
          if (!claim.duplicate) throw new Error(claim.error);
          sent += 1;
          if (sent === 1) await db.from("report_delivery_runs").update({ external_side_effect_id: claim.id, provider_message_id: claim.providerReference, generated_at: report.generatedAt }).eq("id", deliveryRunId);
          continue;
        }
        const result = await sendTransactionalEmail({ to: recipient, subject: `${report.definition.name} is ready`, text: rendered.text, html: rendered.html, idempotencyKey });
        await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("id", claim.id);
        if (!result.ok) throw new Error(result.error); sent += 1;
        if (sent === 1) await db.from("report_delivery_runs").update({ external_side_effect_id: claim.id, provider_message_id: result.providerId, generated_at: report.generatedAt }).eq("id", deliveryRunId);
      }
      await db.from("report_delivery_runs").update({ status: "accepted", completed_at: new Date().toISOString(), safe_error: null }).eq("id", deliveryRunId); await db.from("report_schedules").update({ next_run_at: next, last_run_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", schedule.id);
      results.push({ scheduleId: schedule.id, status: "accepted", recipients: sent });
    } catch (runError) {
      const safeError = runError instanceof Error ? runError.message.slice(0, 240) : "REPORT_DELIVERY_FAILED"; await db.from("report_delivery_runs").update({ status: "failed", safe_error: safeError, completed_at: new Date().toISOString() }).eq("id", deliveryRunId); results.push({ scheduleId: schedule.id, status: "failed", recipients: 0 });
    }
  }
  return NextResponse.json({ checkedAt: now.toISOString(), processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
