import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestValidScannerProof } from "@/lib/security/scanner-proof";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertCategory =
  | "security"
  | "intake"
  | "extraction"
  | "billing"
  | "workflow"
  | "system";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "throttled";

export interface OperationalAlert {
  id: string;
  signalKey: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  status: AlertStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  resolvedAt: string | null;
  createdAt: string;
}

export interface OperationalAlertInput {
  signalKey: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function recordOperationalAlert(
  db: SupabaseClient,
  input: OperationalAlertInput,
): Promise<OperationalAlert> {
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("operational_alerts")
    .select("*")
    .eq("signal_key", input.signalKey)
    .maybeSingle();

  if (existing) {
    const reopened = existing.status === "resolved";
    const updatedCount = reopened ? 1 : (existing.occurrence_count || 1) + 1;
    const existingMetadata = (existing.metadata as Record<string, unknown>) || {};
    const activationGeneration = reopened
      ? Number(existingMetadata.activation_generation || 0) + 1
      : Number(existingMetadata.activation_generation || 1);
    const { data: updated, error } = await db
      .from("operational_alerts")
      .update({
        severity: input.severity,
        category: input.category,
        title: input.title,
        message: input.message,
        metadata: {
          ...existingMetadata,
          ...input.metadata,
          activation_generation: activationGeneration,
          previous_severity: existing.severity !== input.severity ? existing.severity : existingMetadata.previous_severity,
          last_severity: input.severity,
        },
        status: "active",
        first_seen_at: reopened ? now : existing.first_seen_at,
        last_seen_at: now,
        occurrence_count: updatedCount,
        resolved_at: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update operational alert: ${error?.message}`);
    }

    return {
      id: updated.id,
      signalKey: updated.signal_key,
      severity: updated.severity,
      category: updated.category,
      title: updated.title,
      message: updated.message,
      metadata: (updated.metadata as Record<string, unknown>) || {},
      status: updated.status,
      firstSeenAt: updated.first_seen_at,
      lastSeenAt: updated.last_seen_at,
      occurrenceCount: updated.occurrence_count,
      resolvedAt: updated.resolved_at,
      createdAt: updated.created_at,
    };
  }

  const { data: inserted, error } = await db
    .from("operational_alerts")
    .insert({
      signal_key: input.signalKey,
      severity: input.severity,
      category: input.category,
      title: input.title,
      message: input.message,
      metadata: { ...(input.metadata || {}), activation_generation: 1, last_severity: input.severity },
      status: "active",
      first_seen_at: now,
      last_seen_at: now,
      occurrence_count: 1,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    // Another cron invocation won the unique signal-key insert. Re-read it
    // and take the normal update path instead of creating a duplicate error.
    return recordOperationalAlert(db, input);
  }
  if (error || !inserted) {
    throw new Error(`Failed to insert operational alert: ${error?.message}`);
  }

  return {
    id: inserted.id,
    signalKey: inserted.signal_key,
    severity: inserted.severity,
    category: inserted.category,
    title: inserted.title,
    message: inserted.message,
    metadata: (inserted.metadata as Record<string, unknown>) || {},
    status: inserted.status,
    firstSeenAt: inserted.first_seen_at,
    lastSeenAt: inserted.last_seen_at,
    occurrenceCount: inserted.occurrence_count,
    resolvedAt: inserted.resolved_at,
    createdAt: inserted.created_at,
  };
}

export async function resolveOperationalAlert(
  db: SupabaseClient,
  signalKey: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .from("operational_alerts")
    .update({
      status: "resolved",
      resolved_at: now,
    })
    .eq("signal_key", signalKey)
    .eq("status", "active");
}

export async function getActiveOperationalAlerts(
  db: SupabaseClient,
  options: { severity?: AlertSeverity; category?: AlertCategory } = {},
): Promise<OperationalAlert[]> {
  let query = db
    .from("operational_alerts")
    .select("*")
    .eq("status", "active")
    .order("last_seen_at", { ascending: false });

  if (options.severity) {
    query = query.eq("severity", options.severity);
  }
  if (options.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    signalKey: row.signal_key,
    severity: row.severity,
    category: row.category,
    title: row.title,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown>) || {},
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));
}

export async function collectSystemOperationalSignals(
  db: SupabaseClient,
): Promise<{
  activeSignals: OperationalAlertInput[];
  resolvedKeys: string[];
}> {
  const activeSignals: OperationalAlertInput[] = [];
  const knownKeys = new Set<string>();

  // 1. Scanner proof check
  const scannerProof = await getLatestValidScannerProof(db);
  const scannerSignalKey = "system:scanner_proof_status";
  knownKeys.add(scannerSignalKey);

  if (!scannerProof.valid) {
    activeSignals.push({
      signalKey: scannerSignalKey,
      severity: "warning",
      category: "security",
      title: "Malware scanner release proof required",
      message: scannerProof.reason || "No valid unexpired release proof found in database.",
      metadata: { check: "scanner_proof" },
    });
  }

  // 2. Failed external side effects check
  const sideEffectKey = "workflow:external_side_effects_failed";
  knownKeys.add(sideEffectKey);
  const { data: failedSideEffects } = await db
    .from("external_side_effects")
    .select("id, type, created_at")
    .eq("status", "failed")
    .limit(5);

  if (failedSideEffects && failedSideEffects.length > 0) {
    activeSignals.push({
      signalKey: sideEffectKey,
      severity: "warning",
      category: "workflow",
      title: "Failed external side effects pending operator review",
      message: `${failedSideEffects.length} side effect(s) terminated with error.`,
      metadata: {
        count: failedSideEffects.length,
        types: [...new Set(failedSideEffects.map((item) => typeof item.type === "string" ? item.type : "unknown"))].slice(0, 5),
      },
    });
  }

  // 3. Stale quarantined documents check (> 24 hours)
  const staleQuarantineKey = "intake:stale_quarantine_documents";
  knownKeys.add(staleQuarantineKey);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: staleCount } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "quarantined")
    .lt("created_at", oneDayAgo);

  if (staleCount && staleCount > 0) {
    activeSignals.push({
      signalKey: staleQuarantineKey,
      severity: "warning",
      category: "intake",
      title: "Stale quarantined documents detected",
      message: `${staleCount} document(s) have been quarantined for over 24 hours.`,
      metadata: { count: staleCount },
    });
  }

  // 4. Inbound worker health. These queries intentionally retain only counts
  // and timestamps; worker payloads and provider errors are not alert data.
  const workerKey = "worker:inbound-stale";
  knownKeys.add(workerKey);
  const { data: latestWorker } = await db
    .from("inbound_worker_runs")
    .select("status,started_at,completed_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const workerStartedAt = typeof latestWorker?.started_at === "string" ? latestWorker.started_at : null;
  const workerIsStale = !workerStartedAt || Date.now() - Date.parse(workerStartedAt) > 5 * 60 * 1000;
  const workerIsFailed = latestWorker?.status === "failed" || latestWorker?.status === "running" && workerIsStale;
  if (workerIsFailed) {
    activeSignals.push({
      signalKey: workerKey,
      severity: "critical",
      category: "system",
      title: "Inbound worker health needs attention",
      message: latestWorker?.status === "failed" ? "The latest inbound worker run failed." : "The inbound worker has not checked in within five minutes.",
      metadata: { latestStatus: latestWorker?.status ?? "missing", latestStartedAt: workerStartedAt },
    });
  }

  // 5. Document and extraction terminal states.
  const extractionKey = "extraction:terminal-failures";
  knownKeys.add(extractionKey);
  const extractionSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: failedDocuments } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("updated_at", extractionSince);
  const { count: processingDocuments } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  if ((failedDocuments ?? 0) > 0 || (processingDocuments ?? 0) > 0) {
    activeSignals.push({
      signalKey: extractionKey,
      severity: "warning",
      category: "extraction",
      title: "Document extraction needs operator review",
      message: `${failedDocuments ?? 0} failed and ${processingDocuments ?? 0} stuck document(s) detected in the monitored window.`,
      metadata: { failedDocuments: failedDocuments ?? 0, stuckDocuments: processingDocuments ?? 0, windowHours: 24 },
    });
  }

  // 6. Report delivery and retention ledgers.
  const reportsKey = "reports:terminal-failures";
  knownKeys.add(reportsKey);
  const { count: failedReports } = await db
    .from("report_delivery_runs")
    .select("id", { count: "exact", head: true })
    .in("status", ["failed", "bounced", "suppressed"])
    .gte("created_at", extractionSince);
  if ((failedReports ?? 0) > 0) {
    activeSignals.push({
      signalKey: reportsKey,
      severity: "warning",
      category: "workflow",
      title: "Report delivery failures need review",
      message: `${failedReports} report delivery run(s) are in a terminal failure state.`,
      metadata: { count: failedReports, windowHours: 24 },
    });
  }

  const retentionKey = "retention:latest-run";
  knownKeys.add(retentionKey);
  const { data: latestRetention } = await db
    .from("retention_runs")
    .select("status,started_at,completed_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const retentionStartedAt = typeof latestRetention?.started_at === "string" ? latestRetention.started_at : null;
  const retentionIsStale = !retentionStartedAt || Date.now() - Date.parse(retentionStartedAt) > 26 * 60 * 60 * 1000;
  if (retentionIsStale || latestRetention?.status === "failed" || latestRetention?.status === "completed_with_errors") {
    activeSignals.push({
      signalKey: retentionKey,
      severity: "warning",
      category: "system",
      title: "Retention maintenance needs attention",
      message: latestRetention?.status === "failed" ? "The latest retention run failed." : "No healthy retention run was recorded within the expected window.",
      metadata: { latestStatus: latestRetention?.status ?? "missing", latestStartedAt: retentionStartedAt },
    });
  }

  // Sync active signals to DB
  for (const signal of activeSignals) {
    await recordOperationalAlert(db, signal);
  }

  // Auto-resolve known keys that did not trigger
  const resolvedKeys: string[] = [];
  const triggeredKeys = new Set(activeSignals.map((s) => s.signalKey));
  for (const key of knownKeys) {
    if (!triggeredKeys.has(key)) {
      await resolveOperationalAlert(db, key);
      resolvedKeys.push(key);
    }
  }

  return {
    activeSignals,
    resolvedKeys,
  };
}
