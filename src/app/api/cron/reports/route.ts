import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { emailRequestHash, sendTransactionalEmail } from "@/lib/email/resend";
import { claimExternalSideEffect } from "@/lib/email/side-effect-claim";
import { authorizedReportRecipients } from "@/lib/reports/recipients";
import {
  aggregateReportDeliveryStatus,
} from "@/lib/reports/delivery";
import { nextReportRun } from "@/lib/reports/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STALE_RUN_AFTER_MS = 15 * 60 * 1000;
const completedRecipientStatuses = new Set(["accepted", "delivered", "skipped"]);

type ReportRecipientRow = {
  id: string;
  recipient_email: string;
  idempotency_key: string;
  status: string;
  external_side_effect_id: string | null;
  provider_message_id: string | null;
};

function isMissingRecipientTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string };
  return value.code === "42P01" || /report_delivery_recipients.*does not exist/i.test(value.message ?? "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "REPORT_DELIVERY_FAILED";
}

function isStaleClaim(createdAt: string | null | undefined, now: Date) {
  const created = createdAt ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(created) && now.getTime() - created >= STALE_RUN_AFTER_MS;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient();
  const now = new Date();
  const { data: schedules, error } = await db
    .from("report_schedules")
    .select("*, report_definitions(id,name,description,report_type,organization_id)")
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .order("next_run_at")
    .limit(20);
  if (error) return NextResponse.json({ error: "Report schedules could not be loaded." }, { status: 500 });

  const results: Array<{ scheduleId: string; status: string; recipients: number }> = [];
  for (const schedule of schedules ?? []) {
    const scheduledFor = schedule.next_run_at as string;
    const claim = await db
      .from("report_delivery_runs")
      .insert({
        organization_id: schedule.organization_id,
        report_definition_id: schedule.report_definition_id,
        report_schedule_id: schedule.id,
        scheduled_for: scheduledFor,
        status: "claimed",
      })
      .select("id")
      .maybeSingle();
    let deliveryRunId = claim.data?.id as string | undefined;
    if (claim.error?.code === "23505") {
      // A failed run, or a run left claimed by a worker that timed out, may
      // be reclaimed. A fresh claimed run is still owned by another worker.
      const { data: previous } = await db
        .from("report_delivery_runs")
        .select("id,status,created_at")
        .eq("report_schedule_id", schedule.id)
        .eq("scheduled_for", scheduledFor)
        .maybeSingle();
      const reclaimable = previous?.status === "failed"
        || (previous?.status === "claimed" && isStaleClaim(previous.created_at, now));
      if (!reclaimable) continue;
      const { data: reclaimed, error: reclaimError } = await db
        .from("report_delivery_runs")
        .update({ status: "claimed", safe_error: null, completed_at: null })
        .eq("id", previous.id)
        .in("status", ["failed", "claimed"])
        .select("id")
        .maybeSingle();
      if (reclaimError || !reclaimed) continue;
      deliveryRunId = reclaimed.id as string;
    }
    if (claim.error && claim.error.code !== "23505") {
      results.push({ scheduleId: schedule.id, status: "claim_failed", recipients: 0 });
      continue;
    }
    if (!deliveryRunId) {
      results.push({ scheduleId: schedule.id, status: "claim_failed", recipients: 0 });
      continue;
    }

    let completedRecipients = 0;
    try {
      const { data: preferences } = await db
        .from("report_communication_preferences")
        .select("weekly_digest,monthly_executive_report,allow_empty_reports")
        .eq("organization_id", schedule.organization_id)
        .maybeSingle();
      const cadenceEnabled = schedule.cadence === "monthly"
        ? preferences?.monthly_executive_report !== false
        : preferences?.weekly_digest !== false;
      const next = nextReportRun({
        cadence: schedule.cadence,
        timezone: schedule.timezone,
        weekday: schedule.weekday,
        dayOfMonth: schedule.day_of_month,
        sendTimeLocal: String(schedule.send_time_local).slice(0, 5),
      }, now);
      if (!cadenceEnabled) {
        await db.from("report_delivery_runs").update({
          status: "skipped",
          safe_error: "REPORT_TYPE_DISABLED",
          completed_at: new Date().toISOString(),
        }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({
          next_run_at: next,
          last_run_at: now.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 });
        continue;
      }

      const report = await generateReport(db, schedule.report_definitions);
      if (!report.values.length && preferences?.allow_empty_reports !== true) {
        await db.from("report_delivery_runs").update({
          status: "skipped",
          generated_at: report.generatedAt,
          safe_error: "NO_MEANINGFUL_CHANGES",
          completed_at: new Date().toISOString(),
        }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({
          next_run_at: next,
          last_run_at: now.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 });
        continue;
      }

      const { data: members, error: memberError } = await db
        .from("organization_memberships")
        .select("user_id,profiles(email)")
        .eq("organization_id", schedule.organization_id);
      if (memberError) throw memberError;
      const authorized = new Set((members ?? [])
        .map((member) => ((member.profiles as unknown as { email?: string } | null)?.email ?? "").trim().toLowerCase())
        .filter(Boolean));
      const recipients = authorizedReportRecipients(schedule.recipient_emails, authorized);
      if (!recipients.length) {
        await db.from("report_delivery_runs").update({
          status: "skipped",
          generated_at: report.generatedAt,
          safe_error: "NO_AUTHORIZED_RECIPIENTS",
          completed_at: new Date().toISOString(),
        }).eq("id", deliveryRunId);
        await db.from("report_schedules").update({
          next_run_at: next,
          last_run_at: now.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", schedule.id);
        results.push({ scheduleId: schedule.id, status: "skipped", recipients: 0 });
        continue;
      }

      const rendered = renderReportEmail(report);
      const requestedRecipientRows = recipients.map((recipient) => ({
        delivery_run_id: deliveryRunId,
        organization_id: schedule.organization_id,
        recipient_email: recipient,
        idempotency_key: `report/${schedule.id}/${scheduledFor}/${recipient}`,
      }));
      const { data: existingRecipients, error: existingRecipientError } = await db
        .from("report_delivery_recipients")
        .select("id,recipient_email,idempotency_key,status,external_side_effect_id,provider_message_id")
        .eq("delivery_run_id", deliveryRunId);
      if (existingRecipientError) throw existingRecipientError;
      if (!existingRecipients?.length) {
        const { error: recipientUpsertError } = await db
          .from("report_delivery_recipients")
          .upsert(requestedRecipientRows, { onConflict: "delivery_run_id,recipient_email", ignoreDuplicates: true });
        if (recipientUpsertError) throw recipientUpsertError;
      }
      const { data: persistedRecipients, error: recipientReadError } = await db
        .from("report_delivery_recipients")
        .select("id,recipient_email,idempotency_key,status,external_side_effect_id,provider_message_id")
        .eq("delivery_run_id", deliveryRunId);
      if (recipientReadError) throw recipientReadError;
      const storedRecipients = (persistedRecipients ?? []) as ReportRecipientRow[];
      if (!storedRecipients.length) throw new Error("REPORT_RECIPIENT_ROWS_INCOMPLETE");
      const authorizedNow = new Set(recipients);

      let firstSideEffectId: string | null = null;
      let firstProviderMessageId: string | null = null;
      for (const row of storedRecipients) {
        const recipient = row.recipient_email;
        if (!authorizedNow.has(recipient)) {
          await db.from("report_delivery_recipients").update({
            status: "skipped",
            safe_error: "RECIPIENT_NOT_AUTHORIZED",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);
          completedRecipients += 1;
          continue;
        }
        if (completedRecipientStatuses.has(row.status)) {
          completedRecipients += 1;
          continue;
        }
        const requestHash = emailRequestHash({
          to: recipient,
          subject: `${report.definition.name} is ready`,
          text: rendered.text,
          html: rendered.html,
        });
        const claim = await claimExternalSideEffect(db, {
          organizationId: schedule.organization_id,
          type: "report_email",
          destination: recipient,
          idempotencyKey: row.idempotency_key,
          requestHash,
          authorizationMethod: "report_schedule_v1",
          sanitizedRequestMetadata: {
            report_schedule_id: schedule.id,
            report_delivery_run_id: deliveryRunId,
            report_delivery_recipient_id: row.id,
            report_definition_id: report.definition.id,
          },
        });
        if (!claim.claimed) {
          if (!claim.duplicate) throw new Error(claim.error);
          const inFlight = !claim.providerReference
            && !["sent", "accepted", "delivered"].includes(claim.status ?? "");
          const recipientStatus = inFlight ? "claimed" : "accepted";
          const { error: updateError } = await db.from("report_delivery_recipients").update({
            status: recipientStatus,
            external_side_effect_id: claim.id ?? row.external_side_effect_id,
            provider_message_id: claim.providerReference ?? row.provider_message_id,
            completed_at: inFlight ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);
          if (updateError) throw updateError;
          if (claim.id && !firstSideEffectId) firstSideEffectId = claim.id;
          if (claim.providerReference && !firstProviderMessageId) firstProviderMessageId = claim.providerReference;
          if (!inFlight) completedRecipients += 1;
          continue;
        }

        const { error: claimedError } = await db.from("report_delivery_recipients").update({
          status: "claimed",
          external_side_effect_id: claim.id,
          safe_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (claimedError) throw claimedError;
        if (!firstSideEffectId) firstSideEffectId = claim.id;
        const result = await sendTransactionalEmail({
          to: recipient,
          subject: `${report.definition.name} is ready`,
          text: rendered.text,
          html: rendered.html,
          idempotencyKey: row.idempotency_key,
        });
        const sentAt = new Date().toISOString();
        await db.from("external_side_effects").update(result.ok
          ? { status: "sent", provider_reference: result.providerId, completed_at: sentAt, updated_at: sentAt }
          : { status: "failed", last_error: result.error, updated_at: sentAt }).eq("id", claim.id);
        if (!result.ok) {
          await db.from("report_delivery_recipients").update({
            status: "failed",
            safe_error: result.error,
            completed_at: sentAt,
            updated_at: sentAt,
          }).eq("id", row.id);
          continue;
        }
        const { error: acceptedError } = await db.from("report_delivery_recipients").update({
          status: "accepted",
          provider_message_id: result.providerId,
          sent_at: sentAt,
          completed_at: sentAt,
          safe_error: null,
          updated_at: sentAt,
        }).eq("id", row.id);
        if (acceptedError) throw acceptedError;
        if (!firstProviderMessageId) firstProviderMessageId = result.providerId;
        completedRecipients += 1;
      }

      const { data: finalRecipients, error: finalRecipientError } = await db
        .from("report_delivery_recipients")
        .select("status")
        .eq("delivery_run_id", deliveryRunId);
      if (finalRecipientError) throw finalRecipientError;
      const runStatus = aggregateReportDeliveryStatus((finalRecipients ?? []).map((row) => row.status as string));
      const runUpdate: Record<string, unknown> = {
        status: runStatus,
        generated_at: report.generatedAt,
        completed_at: runStatus === "claimed" ? null : new Date().toISOString(),
        safe_error: runStatus === "failed" ? "ONE_OR_MORE_RECIPIENTS_FAILED" : null,
      };
      if (firstSideEffectId) runUpdate.external_side_effect_id = firstSideEffectId;
      if (firstProviderMessageId) runUpdate.provider_message_id = firstProviderMessageId;
      await db.from("report_delivery_runs").update(runUpdate).eq("id", deliveryRunId);
      if (runStatus === "accepted" || runStatus === "delivered" || runStatus === "skipped") {
        await db.from("report_schedules").update({
          next_run_at: next,
          last_run_at: now.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", schedule.id);
      }
      results.push({
        scheduleId: schedule.id,
        status: runStatus === "claimed" ? "in_progress" : runStatus,
        recipients: completedRecipients,
      });
    } catch (runError) {
      const setupRequired = isMissingRecipientTable(runError);
      const safeError = setupRequired
        ? "REPORT_RECIPIENTS_MIGRATION_REQUIRED"
        : errorMessage(runError).slice(0, 240);
      await db.from("report_delivery_runs").update({
        status: "failed",
        safe_error: safeError,
        completed_at: new Date().toISOString(),
      }).eq("id", deliveryRunId);
      results.push({
        scheduleId: schedule.id,
        status: setupRequired ? "setup_required" : "failed",
        recipients: completedRecipients,
      });
    }
  }
  return NextResponse.json({ checkedAt: now.toISOString(), processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
