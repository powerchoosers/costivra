import { NextResponse } from "next/server";
import {
  processInboundEmailJob,
  recordInboundEmailJobFailure,
  recordInboundEmailJobYield,
  isInboundEmailBudgetYield,
  type InboundEmailJob,
} from "@/lib/email/inbound-intake";
import { monitorInboundEmailQueue } from "@/lib/email/inbound-monitor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type WorkerRunStatus = "completed" | "completed_with_warnings" | "failed";

async function startWorkerRun(db: ReturnType<typeof createServerSupabaseClient>) {
  const { data, error } = await db
    .from("inbound_worker_runs")
    .insert({ status: "running" })
    .select("id")
    .maybeSingle();
  if (error) console.error("Inbound worker run ledger could not be started.");
  return typeof data?.id === "string" ? data.id : null;
}

async function finishWorkerRun(
  db: ReturnType<typeof createServerSupabaseClient>,
  runId: string | null,
  input: {
    status: WorkerRunStatus;
    claimed: number;
    results: Array<{ id: string; status: string }>;
    monitoring?: Record<string, unknown>;
    errorCode?: string;
  },
) {
  if (!runId) return;
  const { error } = await db
    .from("inbound_worker_runs")
    .update({
      status: input.status,
      claimed_count: input.claimed,
      results: input.results,
      monitoring: input.monitoring ?? {},
      error_code: input.errorCode ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) console.error("Inbound worker run ledger could not be finalized.");
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const db = createServerSupabaseClient();
  const runId = await startWorkerRun(db);
  const { data, error } = await db.rpc("claim_inbound_email_events", {
    p_limit: 2,
    p_stale_after_seconds: 600,
  });
  if (error) {
    await finishWorkerRun(db, runId, {
      status: "failed",
      claimed: 0,
      results: [],
      errorCode: "queue_claim_failed",
    });
    return NextResponse.json({ error: "The intake queue could not be claimed." }, { status: 500 });
  }
  const jobs = (Array.isArray(data) ? data : []) as InboundEmailJob[];
  const results: Array<{ id: string; status: string }> = [];
  const deadlineAt = Date.now() + 240_000;
  for (const job of jobs) {
    try {
      const result = await processInboundEmailJob(job, { db, deadlineAt });
      results.push({ id: job.id, status: result.status });
    } catch (jobError) {
      const decision = isInboundEmailBudgetYield(jobError)
        ? await recordInboundEmailJobYield(db, job)
        : await recordInboundEmailJobFailure(db, job, jobError);
      results.push({ id: job.id, status: decision.status });
    }
  }
  let monitoring: Record<string, unknown>;
  let status: WorkerRunStatus = "completed";
  try {
    monitoring = await monitorInboundEmailQueue(db);
  } catch {
    // Invoice work has already completed. Preserve the successful outcome and
    // surface degraded alerting in the run ledger instead of asking Vercel to
    // retry the entire invocation.
    console.error("Inbound queue monitoring could not be completed.");
    monitoring = { status: "degraded", error: "notification_monitor_failed" };
    status = "completed_with_warnings";
  }
  await finishWorkerRun(db, runId, {
    status,
    claimed: jobs.length,
    results,
    monitoring,
  });
  return NextResponse.json({ claimed: jobs.length, results, monitoring });
}
