import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { getRequestId, withRequestId } from "@/lib/observability/request-context";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";
import { ACTIVATION_REMINDER_MAX, shouldSendActivationReminder } from "@/lib/portal/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ReminderRow = {
  organization_id: string;
  status: "not_started" | "in_progress" | "activated" | "blocked";
  created_at: string;
  activation_reminder_last_sent_at: string | null;
  activation_reminder_count: number;
};

/** Send at most three setup reminders, no more frequently than every 72 hours. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const respond = (body: unknown, init?: ResponseInit) => withRequestId(NextResponse.json(body, init), requestId);
  if (!isCronAuthorized(request)) return respond({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient();
  const now = new Date();
  const { data, error } = await db
    .from("organization_onboarding")
    .select("organization_id,status,created_at,activation_reminder_last_sent_at,activation_reminder_count")
    .in("status", ["not_started", "in_progress"])
    .lt("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .lt("activation_reminder_count", ACTIVATION_REMINDER_MAX)
    .or(`activation_reminder_last_sent_at.is.null,activation_reminder_last_sent_at.lte.${new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return respond({ error: "Activation reminders could not be loaded." }, { status: 500 });

  const results: Array<{ organizationId: string; status: string }> = [];
  for (const raw of data ?? []) {
    const row = raw as ReminderRow;
    if (!shouldSendActivationReminder({
      status: row.status,
      createdAt: row.created_at,
      lastSentAt: row.activation_reminder_last_sent_at,
      reminderCount: Number(row.activation_reminder_count ?? 0),
      now,
    })) continue;
    const reminderNumber = Number(row.activation_reminder_count ?? 0) + 1;
    try {
      const sends = await sendLifecycleEmailToWorkspace({
        db,
        kind: "activation_reminder",
        organizationId: row.organization_id,
        payload: { eventKey: `activation-reminder:${row.organization_id}:${reminderNumber}` },
      });
      const deliveredOrClaimed = sends.some((send) => send.deliveryStatus !== "failed");
      if (!deliveredOrClaimed) {
        results.push({ organizationId: row.organization_id, status: "failed" });
        continue;
      }
      const { error: updateError } = await db
        .from("organization_onboarding")
        .update({ activation_reminder_last_sent_at: now.toISOString(), activation_reminder_count: reminderNumber, updated_at: now.toISOString() })
        .eq("organization_id", row.organization_id)
        .in("status", ["not_started", "in_progress"])
        .eq("activation_reminder_count", Number(row.activation_reminder_count ?? 0));
      if (updateError) throw updateError;
      results.push({ organizationId: row.organization_id, status: "accepted" });
    } catch (reminderError) {
      console.error("activation reminder failed", reminderError);
      results.push({ organizationId: row.organization_id, status: "failed" });
    }
  }
  return respond({ processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
