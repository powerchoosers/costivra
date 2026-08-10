import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";
import {
  processClaimedSequenceEnrollment,
  type ClaimedSequenceEnrollment,
} from "@/lib/manage/sequences/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLAIM_BATCH_SIZE = 10;
const LOCK_TTL_SECONDS = 15 * 60;

/**
 * Protected worker boundary for sequence execution.
 *
 * The worker is intentionally disabled until the full Packet 07 activation,
 * suppression, provider-send, and recovery controls are complete. Keeping the
 * route in place now lets deployment and cron authorization be tested without
 * accidentally sending an email.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const checkedAt = new Date();
  if (process.env.COSTIVRA_SEQUENCE_EXECUTION_ENABLED !== "true") {
    return NextResponse.json({
      checkedAt: checkedAt.toISOString(),
      status: "disabled",
      processed: 0,
      reason: "SEQUENCE_EXECUTION_FEATURE_FLAG_OFF",
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const db = createServerSupabaseClient();
  const runId = randomUUID();
  const { error: runInsertError } = await db.from("crm_sequence_worker_runs").insert({ id: runId, status: "running", started_at: checkedAt.toISOString() });
  if (runInsertError) {
    if (runInsertError.code === "42P01") return NextResponse.json({ error: "Sequence execution is blocked until the production safety migration is applied." }, { status: 503 });
    return NextResponse.json({ error: "Sequence worker health could not be recorded." }, { status: 503 });
  }
  const { data: claimed, error } = await db.rpc("claim_due_sequence_enrollments", {
    p_limit: CLAIM_BATCH_SIZE,
    p_now: checkedAt.toISOString(),
    p_lock_ttl_seconds: LOCK_TTL_SECONDS,
  });
  if (error) {
    await db.from("crm_sequence_worker_runs").update({ status: "failed", finished_at: new Date().toISOString(), failed_count: 1 }).eq("id", runId);
    return NextResponse.json({ error: "Sequence work could not be claimed." }, { status: 500 });
  }

  const results: Array<{ id: string; status: string; reason?: string }> = [];
  for (const enrollment of (claimed ?? []) as ClaimedSequenceEnrollment[]) {
    if (!enrollment.id || !enrollment.lock_token) {
      results.push({ id: enrollment.id ?? "unknown", status: "invalid_claim" });
      continue;
    }
    try {
      const result = await processClaimedSequenceEnrollment(db, enrollment);
      results.push({ id: enrollment.id, status: result.status, ...("reason" in result && result.reason ? { reason: result.reason } : {}) });
    } catch (error) {
      results.push({ id: enrollment.id, status: "failed", reason: error instanceof Error ? error.message.slice(0, 120) : "SEQUENCE_WORKER_FAILED" });
    }
  }

  const failedCount = results.filter((result) => result.status === "failed").length;
  await db.from("crm_sequence_worker_runs").update({ status: failedCount ? "completed_with_errors" : "completed", finished_at: new Date().toISOString(), claimed_count: claimed?.length ?? 0, processed_count: results.length, failed_count: failedCount }).eq("id", runId);
  return NextResponse.json({
    runId,
    checkedAt: checkedAt.toISOString(),
    status: failedCount ? "completed_with_errors" : "completed",
    processed: results.length,
    claimed: claimed?.length ?? 0,
    results,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
