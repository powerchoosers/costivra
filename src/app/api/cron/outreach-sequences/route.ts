import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const { data: claimed, error } = await db.rpc("claim_due_sequence_enrollments", {
    p_limit: CLAIM_BATCH_SIZE,
    p_now: checkedAt.toISOString(),
    p_lock_ttl_seconds: LOCK_TTL_SECONDS,
  });
  if (error) {
    return NextResponse.json({ error: "Sequence work could not be claimed." }, { status: 500 });
  }

  // No send path is enabled in this slice. Release claims immediately rather
  // than leaving a lock behind or pretending a provider action completed.
  for (const enrollment of claimed ?? []) {
    if (!enrollment.id || !enrollment.lock_token) continue;
    await db.rpc("release_sequence_enrollment_claim", {
      p_enrollment_id: enrollment.id,
      p_lock_token: enrollment.lock_token,
      p_last_error_code: "SEQUENCE_EXECUTION_NOT_READY",
    });
  }

  return NextResponse.json({
    checkedAt: checkedAt.toISOString(),
    status: "not_ready",
    processed: 0,
    claimed: claimed?.length ?? 0,
    reason: "SEQUENCE_EXECUTION_SEND_PATH_NOT_READY",
  }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
