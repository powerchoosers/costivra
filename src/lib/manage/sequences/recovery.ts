import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";

type Db = ReturnType<typeof createServerSupabaseClient>;

export function classifySequenceFailure(row: Record<string, unknown>) {
  if (row.failure_class === "provider_ambiguous" || row.provider_reference) return "provider_ambiguous" as const;
  if (row.failure_class === "permanent") return "permanent" as const;
  if (row.failure_class === "stopped") return "stopped" as const;
  if (row.status === "failed") return "safe_retry" as const;
  return "pending" as const;
}

export async function getSequenceRecoverySnapshot(db: Db) {
  const [runs, effects, enrollments] = await Promise.all([
    db.from("crm_sequence_worker_runs").select("id,status,started_at,finished_at,claimed_count,processed_count,failed_count").order("started_at", { ascending: false }).limit(10),
    db.from("external_side_effects").select("id,status,provider_reference,failure_class,last_error,updated_at,authorization_method,sanitized_request_metadata").eq("authorization_method", "sequence_step").order("updated_at", { ascending: false }).limit(100),
    db.from("crm_sequence_enrollments").select("id,state,next_action_at,stop_reason,sequence_id,contact_id").in("state", ["active", "failed", "paused"]).order("updated_at", { ascending: false }).limit(100),
  ]);
  for (const result of [runs, effects, enrollments]) {
    if (result.error) throw result.error;
  }
  const sideEffects = (effects.data ?? []).map((row) => ({ ...row, retryClass: classifySequenceFailure(row) }));
  return {
    worker: { recentRuns: runs.data ?? [], lastRun: runs.data?.[0] ?? null, healthy: runs.data?.[0]?.status !== "failed" },
    failedActions: sideEffects.filter((row) => row.retryClass === "safe_retry" || row.retryClass === "permanent"),
    needsReconciliation: sideEffects.filter((row) => row.retryClass === "provider_ambiguous"),
    dueActions: (enrollments.data ?? []).filter((row) => row.state === "active" && row.next_action_at && new Date(row.next_action_at).getTime() <= Date.now()),
    pausedActions: (enrollments.data ?? []).filter((row) => row.state === "paused"),
  };
}
