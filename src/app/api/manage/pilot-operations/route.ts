import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { checkSystemReadiness } from "@/lib/manage/system-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    const { db } = await requireInternalOperator();
    const staleBefore = new Date(Date.now() - 15 * 60 * 1_000).toISOString();
    const upcomingThrough = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
    const [readiness, [
      organizations,
      inboundAttention,
      recentWorkerFailures,
      quarantined,
      extractionFailures,
      stalledDocuments,
      reportFailures,
      emailProblems,
      monitoringUpcoming,
      monitoringMissed,
      recoveryActions,
    ]] = await Promise.all([checkSystemReadiness(db, { includeOptionalServices: false, includeOperatorServices: false, runLiveMalwareProbe: false }), Promise.all([
      db.from("organizations").select("id", { count: "exact", head: true }),
      db.from("inbound_email_events").select("id", { count: "exact", head: true }).in("status", ["queued", "processing", "retrying", "dead_letter", "quarantined"]),
      db.from("inbound_worker_runs").select("status,error_code,started_at").in("status", ["failed", "completed_with_warnings"]).order("started_at", { ascending: false }).limit(10),
      db.from("inbound_email_attachments").select("id", { count: "exact", head: true }).eq("processing_status", "quarantined"),
      db.from("document_extraction_versions").select("document_id", { count: "exact", head: true }).eq("status", "failed"),
      db.from("documents").select("id", { count: "exact", head: true }).eq("status", "processing").lt("updated_at", staleBefore),
      db.from("report_delivery_runs").select("id", { count: "exact", head: true }).in("status", ["failed", "bounced", "suppressed"]),
      db.from("crm_email_messages").select("id", { count: "exact", head: true }).in("provider_status", ["bounced", "complained", "suppressed", "failed"]),
      db.from("vendor_monitoring_configs").select("id", { count: "exact", head: true }).eq("state", "active").gte("next_expected_at", new Date().toISOString()).lte("next_expected_at", upcomingThrough),
      db.from("vendor_monitoring_configs").select("id", { count: "exact", head: true }).eq("state", "active").lt("next_expected_at", new Date().toISOString()),
      db.from("external_side_effects").select("id", { count: "exact", head: true }).in("status", ["claimed", "failed"]),
    ])]);
    const results = [organizations, inboundAttention, recentWorkerFailures, quarantined, extractionFailures, stalledDocuments, reportFailures, emailProblems, monitoringUpcoming, monitoringMissed, recoveryActions];
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      readiness: { overall: readiness.overall, services: readiness.services.map(({ id, name, status }) => ({ id, name, status })) },
      metrics: {
        pilotTenants: organizations.count ?? 0,
        inboundAttention: inboundAttention.count ?? 0,
        quarantined: quarantined.count ?? 0,
        extractionFailures: extractionFailures.count ?? 0,
        stalledDocuments: stalledDocuments.count ?? 0,
        reportFailures: reportFailures.count ?? 0,
        emailProblems: emailProblems.count ?? 0,
        monitoringUpcoming: monitoringUpcoming.count ?? 0,
        monitoringMissed: monitoringMissed.count ?? 0,
        recoveryActions: recoveryActions.count ?? 0,
      },
      recentCriticalErrors: (recentWorkerFailures.data ?? []).map((run) => ({
        worker: "inbound_email",
        status: run.status,
        errorCode: typeof run.error_code === "string" ? run.error_code : "worker_warning",
        occurredAt: run.started_at,
      })),
    }, { headers: privateHeaders });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers: privateHeaders });
  }
}
