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
    const updatedCount = (existing.occurrence_count || 1) + 1;
    const { data: updated, error } = await db
      .from("operational_alerts")
      .update({
        severity: input.severity,
        category: input.category,
        title: input.title,
        message: input.message,
        metadata: { ...(existing.metadata as Record<string, unknown>), ...input.metadata },
        status: "active",
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
      metadata: input.metadata || {},
      status: "active",
      first_seen_at: now,
      last_seen_at: now,
      occurrence_count: 1,
    })
    .select("*")
    .single();

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
