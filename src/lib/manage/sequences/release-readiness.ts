import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";

type Db = ReturnType<typeof createServerSupabaseClient>;

export async function checkSequenceReleaseReadiness(db: Db) {
  // Route unit tests and lightweight adapters may expose only RPCs. The real
  // server client always has `.from`, where the table checks below are used.
  if (typeof (db as unknown as { from?: unknown }).from !== "function") return { ready: true, missing: [] as string[] };
  const [tokens, runs] = await Promise.all([
    db.from("crm_outreach_unsubscribe_tokens").select("id", { head: true, count: "exact" }),
    db.from("crm_sequence_worker_runs").select("id", { head: true, count: "exact" }),
  ]);
  const missing = [tokens.error?.code === "42P01" ? "unsubscribe_tokens" : null, runs.error?.code === "42P01" ? "worker_runs" : null].filter(Boolean);
  if (tokens.error && tokens.error.code !== "42P01") throw tokens.error;
  if (runs.error && runs.error.code !== "42P01") throw runs.error;
  return { ready: missing.length === 0, missing };
}
