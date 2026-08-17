import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { checkSystemReadiness } from "@/lib/manage/system-readiness";
import { deduplicateCriticalErrors, type CriticalError } from "@/lib/observability/critical-errors";

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
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
    const staleBefore = new Date(Date.now() - 15 * 60 * 1_000).toISOString();
    const upcomingThrough = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
    const [readiness, [
      organizations,
      inboundAttention,
      workerFailures24h,
      workerCompletions24h,
      recentWorkerFailures,
      recentReportFailures,
      recentEmailProblems,
      recentExtractionFailures,
      recentScannerFailures,
      scannerUnavailable24h,
      quarantined,
      extractionFailures,
      stalledDocuments,
      reportFailures,
      reportFailures24h,
      emailProblems,
      monitoringUpcoming,
      monitoringMissed,
      recoveryActions,
    ]] = await Promise.all([checkSystemReadiness(db, { includeOptionalServices: false, includeOperatorServices: false, runLiveMalwareProbe: false }), Promise.all([
      db.from("organizations").select("id", { count: "exact", head: true }),
      db.from("inbound_email_events").select("id", { count: "exact", head: true }).in("status", ["queued", "processing", "retrying", "dead_letter", "quarantined"]),
      db.from("inbound_worker_runs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("started_at", windowStart),
      db.from("inbound_worker_runs").select("id", { count: "exact", head: true }).in("status", ["completed", "completed_with_warnings"]).gte("started_at", windowStart),
      db.from("inbound_worker_runs").select("status,error_code,started_at").in("status", ["failed", "completed_with_warnings"]).order("started_at", { ascending: false }).limit(10),
      db.from("report_delivery_runs").select("status,safe_error,created_at").in("status", ["failed", "bounced", "suppressed"]).order("created_at", { ascending: false }).limit(10),
      db.from("crm_email_messages").select("provider_status,updated_at").in("provider_status", ["bounced", "complained", "suppressed", "failed"]).order("updated_at", { ascending: false }).limit(10),
      db.from("document_extraction_versions").select("status,failure_code,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(10),
      db.from("inbound_email_attachments").select("scan_status,updated_at").in("scan_status", ["failed", "unavailable", "infected"]).order("updated_at", { ascending: false }).limit(10),
      db.from("inbound_email_attachments").select("id", { count: "exact", head: true }).in("scan_status", ["failed", "unavailable"]).gte("updated_at", windowStart),
      db.from("inbound_email_attachments").select("id", { count: "exact", head: true }).eq("processing_status", "quarantined"),
      db.from("document_extraction_versions").select("document_id", { count: "exact", head: true }).eq("status", "failed"),
      db.from("documents").select("id", { count: "exact", head: true }).eq("status", "processing").lt("updated_at", staleBefore),
      db.from("report_delivery_runs").select("id", { count: "exact", head: true }).in("status", ["failed", "bounced", "suppressed"]),
      db.from("report_delivery_runs").select("id", { count: "exact", head: true }).in("status", ["failed", "bounced", "suppressed"]).gte("created_at", windowStart),
      db.from("crm_email_messages").select("id", { count: "exact", head: true }).in("provider_status", ["bounced", "complained", "suppressed", "failed"]),
      db.from("vendor_monitoring_configs").select("id", { count: "exact", head: true }).eq("state", "active").gte("next_expected_at", new Date().toISOString()).lte("next_expected_at", upcomingThrough),
      db.from("vendor_monitoring_configs").select("id", { count: "exact", head: true }).eq("state", "active").lt("next_expected_at", new Date().toISOString()),
      db.from("external_side_effects").select("id", { count: "exact", head: true }).in("status", ["claimed", "failed"]),
    ])]);
    const results = [organizations, inboundAttention, workerFailures24h, workerCompletions24h, recentWorkerFailures, recentReportFailures, recentEmailProblems, recentExtractionFailures, recentScannerFailures, scannerUnavailable24h, quarantined, extractionFailures, stalledDocuments, reportFailures, reportFailures24h, emailProblems, monitoringUpcoming, monitoringMissed, recoveryActions];
    const hasQueryError = results.some((result) => result.error);
    const safeCount = (result: { count?: number | null; error?: unknown }) => result.error ? null : result.count ?? 0;
    const [operationalAlerts, alertDeliveries] = await Promise.all([
      db.from("operational_alerts").select("id,signal_key,severity,title,status,first_seen_at,last_seen_at,occurrence_count,metadata").eq("status", "active").order("last_seen_at", { ascending: false }).limit(50),
      db.from("operational_alert_deliveries").select("alert_id,status,provider_reference,updated_at").order("updated_at", { ascending: false }).limit(100),
    ]);
    const deliveryByAlert = new Map<string, { status: string }>();
    for (const delivery of alertDeliveries.data ?? []) {
      if (!deliveryByAlert.has(String(delivery.alert_id))) deliveryByAlert.set(String(delivery.alert_id), { status: String(delivery.status) });
    }
    const dataWarnings = hasQueryError || operationalAlerts.error || alertDeliveries.error ? ["operations_snapshot_incomplete"] : [];
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      readiness: { overall: readiness.overall, services: readiness.services.map(({ id, name, status }) => ({ id, name, status })) },
      dataWarnings,
      operationalAlerts: (operationalAlerts.data ?? []).map((alert) => ({
        id: String(alert.id),
        signalKey: String(alert.signal_key),
        severity: String(alert.severity),
        title: String(alert.title),
        firstSeenAt: String(alert.first_seen_at),
        lastSeenAt: String(alert.last_seen_at),
        occurrenceCount: Number(alert.occurrence_count),
        delivery: deliveryByAlert.get(String(alert.id)) ?? { status: "not_sent" },
      })),
      metrics: {
        pilotTenants: safeCount(organizations),
        inboundAttention: safeCount(inboundAttention),
        workerFailures24h: safeCount(workerFailures24h),
        workerCompletions24h: safeCount(workerCompletions24h),
        scannerUnavailable24h: safeCount(scannerUnavailable24h),
        quarantined: safeCount(quarantined),
        extractionFailures: safeCount(extractionFailures),
        stalledDocuments: safeCount(stalledDocuments),
        reportFailures: safeCount(reportFailures),
        reportFailures24h: safeCount(reportFailures24h),
        emailProblems: safeCount(emailProblems),
        monitoringUpcoming: safeCount(monitoringUpcoming),
        monitoringMissed: safeCount(monitoringMissed),
        recoveryActions: safeCount(recoveryActions),
      },
      recentCriticalErrors: deduplicateCriticalErrors([
        ...(!recentWorkerFailures.error ? (recentWorkerFailures.data ?? []) : []).map((run) => ({
          source: "inbound_email_worker",
          status: run.status,
          errorCode: typeof run.error_code === "string" ? run.error_code : "worker_warning",
          occurredAt: run.started_at,
          recoveryHref: "/manage/intake",
        })),
        ...(!recentReportFailures.error ? (recentReportFailures.data ?? []) : []).map((run) => ({
          source: "report_delivery",
          status: run.status,
          errorCode: typeof run.safe_error === "string" ? run.safe_error : `REPORT_${String(run.status).toUpperCase()}`,
          occurredAt: run.created_at,
          recoveryHref: "/manage/activity",
        })),
        ...(!recentEmailProblems.error ? (recentEmailProblems.data ?? []) : []).map((message) => ({
          source: "provider_email",
          status: message.provider_status,
          errorCode: `EMAIL_${String(message.provider_status).toUpperCase()}`,
          occurredAt: message.updated_at,
          recoveryHref: "/manage/mail",
        })),
        ...(!recentExtractionFailures.error ? (recentExtractionFailures.data ?? []).map((version) => ({
          source: "document_extraction",
          status: version.status,
          errorCode: typeof version.failure_code === "string" ? version.failure_code : "EXTRACTION_FAILED",
          occurredAt: version.created_at,
          recoveryHref: "/manage/intake",
        })) : []),
        ...(!recentScannerFailures.error ? (recentScannerFailures.data ?? []).map((attachment) => ({
          source: "malware_scanner",
          status: attachment.scan_status,
          errorCode: `SCANNER_${String(attachment.scan_status).toUpperCase()}`,
          occurredAt: attachment.updated_at,
          recoveryHref: "/manage/intake",
        })) : []),
      ] satisfies CriticalError[]).slice(0, 20),
    }, { headers: privateHeaders });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers: privateHeaders });
  }
}
