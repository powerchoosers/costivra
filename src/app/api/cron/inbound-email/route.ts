import { NextResponse } from "next/server";
import {
  processInboundEmailJob,
  recordInboundEmailJobFailure,
  type InboundEmailJob,
} from "@/lib/email/inbound-intake";
import { monitorInboundEmailQueue } from "@/lib/email/inbound-monitor";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const db = createServerSupabaseClient();
  const { data, error } = await db.rpc("claim_inbound_email_events", {
    p_limit: 2,
    p_stale_after_seconds: 600,
  });
  if (error) {
    return NextResponse.json({ error: "The intake queue could not be claimed." }, { status: 500 });
  }
  const jobs = (Array.isArray(data) ? data : []) as InboundEmailJob[];
  const results: Array<{ id: string; status: string }> = [];
  for (const job of jobs) {
    try {
      const result = await processInboundEmailJob(job, { db });
      results.push({ id: job.id, status: result.status });
    } catch (jobError) {
      const decision = await recordInboundEmailJobFailure(db, job, jobError);
      results.push({ id: job.id, status: decision.status });
    }
  }
  const monitoring = await monitorInboundEmailQueue(db);
  return NextResponse.json({ claimed: jobs.length, results, monitoring });
}
