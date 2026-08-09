import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEmailAddress } from "@/lib/manage/mail";

type Db = ReturnType<typeof createServerSupabaseClient>;
type SequenceStopEvent = "reply_received" | "bounced" | "unsubscribed" | "failed";

const OPEN_ENROLLMENT_STATES = ["pending", "active", "paused", "waiting_for_task"] as const;

function nowIso() {
  return new Date().toISOString();
}

export async function appendSequenceEvent(
  db: Db,
  input: {
    sequenceId: string;
    enrollmentId: string;
    stepId?: string | null;
    eventType: "enrolled" | "step_scheduled" | "task_created" | "task_completed" | "email_queued" | "email_sent" | "email_delivered" | "reply_received" | "bounced" | "unsubscribed" | "paused" | "resumed" | "stopped" | "completed" | "failed";
    emailMessageId?: string | null;
    emailThreadId?: string | null;
    taskId?: string | null;
    externalSideEffectId?: string | null;
    providerEventId?: string | null;
    safeMetadata?: Record<string, unknown>;
  },
) {
  let existingQuery = db
    .from("crm_sequence_events")
    .select("id")
    .eq("enrollment_id", input.enrollmentId)
    .eq("event_type", input.eventType);
  existingQuery = input.stepId
    ? existingQuery.eq("step_id", input.stepId)
    : existingQuery.is("step_id", null);
  existingQuery = input.emailMessageId
    ? existingQuery.eq("email_message_id", input.emailMessageId)
    : existingQuery.is("email_message_id", null);
  const { data: existing, error: existingError } = await existingQuery.limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id as string;

  const { data, error } = await db
    .from("crm_sequence_events")
    .insert({
      sequence_id: input.sequenceId,
      enrollment_id: input.enrollmentId,
      step_id: input.stepId ?? null,
      event_type: input.eventType,
      email_message_id: input.emailMessageId ?? null,
      email_thread_id: input.emailThreadId ?? null,
      task_id: input.taskId ?? null,
      external_side_effect_id: input.externalSideEffectId ?? null,
      provider_event_id: input.providerEventId ?? null,
      safe_metadata: input.safeMetadata ?? {},
      occurred_at: nowIso(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function stopEnrollmentForReason(
  db: Db,
  input: {
    enrollmentId: string;
    reason: "reply" | "bounce" | "unsubscribe" | "failure";
    eventType: SequenceStopEvent;
    messageId?: string | null;
    threadId?: string | null;
    providerEventId?: string | null;
    lockToken?: string | null;
  },
) {
  const now = nowIso();
  const state = input.reason === "reply"
    ? "replied"
    : input.reason === "bounce"
      ? "bounced"
      : input.reason === "unsubscribe"
        ? "unsubscribed"
        : "failed";
  const fields: Record<string, unknown> = {
    state,
    next_action_at: null,
    stopped_at: now,
    stop_reason: `sequence_${input.reason}`,
    lock_token: null,
    locked_at: null,
    updated_at: now,
  };
  if (input.reason === "reply") fields.reply_detected_at = now;
  if (input.reason === "bounce") fields.bounce_detected_at = now;
  if (input.reason === "unsubscribe") fields.unsubscribed_at = now;

  let query = db
    .from("crm_sequence_enrollments")
    .update(fields)
    .eq("id", input.enrollmentId)
    .in("state", [...OPEN_ENROLLMENT_STATES]);
  if (input.lockToken) query = query.eq("lock_token", input.lockToken);
  const { data: enrollment, error } = await query
    .select("id,sequence_id")
    .maybeSingle();
  if (error) throw error;
  if (!enrollment) return false;

  await appendSequenceEvent(db, {
    sequenceId: enrollment.sequence_id,
    enrollmentId: enrollment.id,
    eventType: input.eventType,
    emailMessageId: input.messageId,
    emailThreadId: input.threadId,
    providerEventId: input.providerEventId,
    safeMetadata: { reason: input.reason },
  });
  return true;
}

export async function addOutreachSuppression(
  db: Db,
  input: {
    email: string;
    reason: "unsubscribed" | "bounced" | "complained" | "manual" | "legal";
    source: string;
    providerReference?: string | null;
  },
) {
  const email = normalizeEmailAddress(input.email);
  if (!email || !email.includes("@")) return;
  const { error } = await db.from("crm_outreach_suppressions").insert({
    email_normalized: email,
    reason: input.reason,
    source: input.source,
    provider_reference: input.providerReference ?? null,
  });
  if (error && error.code !== "23505") throw error;
}

export async function stopSequenceEnrollmentsForReply(
  db: Db,
  input: { threadId: string; messageId: string },
) {
  const { data: sequenceMessages, error } = await db
    .from("crm_email_messages")
    .select("sequence_id,sequence_enrollment_id,organization_id")
    .eq("thread_id", input.threadId)
    .eq("origin", "sequence")
    .not("sequence_enrollment_id", "is", null);
  if (error) throw error;

  const enrollmentIds = Array.from(new Set((sequenceMessages ?? [])
    .map((row) => row.sequence_enrollment_id as string | null)
    .filter((value): value is string => Boolean(value))));
  let stopped = 0;
  for (const enrollmentId of enrollmentIds) {
    const { data: enrollment } = await db
      .from("crm_sequence_enrollments")
      .select("id,sequence_id")
      .eq("id", enrollmentId)
      .maybeSingle();
    if (!enrollment) continue;
    const { data: sequence } = await db
      .from("crm_sequences")
      .select("stop_on_reply")
      .eq("id", enrollment.sequence_id)
      .maybeSingle();
    if (sequence?.stop_on_reply === false) continue;
    if (await stopEnrollmentForReason(db, {
      enrollmentId,
      reason: "reply",
      eventType: "reply_received",
      messageId: input.messageId,
      threadId: input.threadId,
    })) stopped += 1;
  }
  return stopped;
}

export async function stopSequenceEnrollmentForProviderEvent(
  db: Db,
  input: { providerMessageId: string; status: "bounced" | "complained" | "suppressed" | "failed"; providerEventId?: string | null },
) {
  const { data: message, error } = await db
    .from("crm_email_messages")
    .select("id,thread_id,organization_id,sequence_id,sequence_enrollment_id,to_addresses")
    .eq("provider_message_id", input.providerMessageId)
    .eq("origin", "sequence")
    .maybeSingle();
  if (error) throw error;
  if (!message?.sequence_enrollment_id) return false;

  const reason = input.status === "bounced" ? "bounce" : input.status === "failed" ? "failure" : "unsubscribe";
  const eventType: SequenceStopEvent = input.status === "bounced" ? "bounced" : input.status === "failed" ? "failed" : "unsubscribed";
  const { data: sequence } = await db
    .from("crm_sequences")
    .select("stop_on_bounce,stop_on_unsubscribe")
    .eq("id", message.sequence_id)
    .maybeSingle();
  if (input.status === "bounced" && sequence?.stop_on_bounce === false) return false;
  if (input.status !== "bounced" && sequence?.stop_on_unsubscribe === false) return false;

  const recipient = Array.isArray(message.to_addresses) ? message.to_addresses[0] : null;
  if (recipient && input.status !== "failed") {
    await addOutreachSuppression(db, {
      email: recipient,
      reason: input.status === "bounced" ? "bounced" : input.status === "complained" ? "complained" : "unsubscribed",
      source: `resend_${input.status}`,
      providerReference: input.providerMessageId,
    });
  }
  return stopEnrollmentForReason(db, {
    enrollmentId: message.sequence_enrollment_id,
    reason,
    eventType,
    messageId: message.id,
    threadId: message.thread_id,
    providerEventId: input.providerEventId,
  });
}
