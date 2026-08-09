import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { appendEmailSignatureHtml } from "@/lib/manage/email-signature";
import { formatMailboxSender } from "@/lib/manage/mailboxes";
import {
  emailHtmlToText,
  isValidEmail,
  sanitizeEmailHtml,
} from "@/lib/manage/mail";
import { sendOutboundEmail } from "@/lib/manage/outbound-email";
import { findSuppression } from "@/lib/manage/sequences/repository";
import { nextSequenceActionAt } from "@/lib/manage/sequences/schedule";
import { renderTemplate } from "@/lib/manage/sequences/validation";
import {
  appendSequenceEvent,
  stopEnrollmentForReason,
} from "@/lib/manage/sequences/lifecycle";

type Db = ReturnType<typeof createServerSupabaseClient>;
type Row = Record<string, unknown>;

export type ClaimedSequenceEnrollment = {
  id: string;
  lock_token: string;
  attempt_count: number;
};

const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const numberValue = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

async function releaseClaim(
  db: Db,
  enrollmentId: string,
  lockToken: string,
  fields: Record<string, unknown> = {},
) {
  const { data, error } = await db
    .from("crm_sequence_enrollments")
    .update({ ...fields, lock_token: null, locked_at: null, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .eq("lock_token", lockToken)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function failClaim(
  db: Db,
  input: { enrollmentId: string; lockToken: string; sequenceId: string; stepId?: string | null; reason: string },
) {
  const released = await releaseClaim(db, input.enrollmentId, input.lockToken, {
    state: "failed",
    next_action_at: null,
    stopped_at: new Date().toISOString(),
    stop_reason: input.reason,
    last_error_code: input.reason,
  });
  if (released) {
    await appendSequenceEvent(db, {
      sequenceId: input.sequenceId,
      enrollmentId: input.enrollmentId,
      stepId: input.stepId,
      eventType: "failed",
      safeMetadata: { reason: input.reason },
    });
  }
  return { status: "failed", reason: input.reason } as const;
}

async function advanceAfterStep(
  db: Db,
  input: {
    enrollment: Row;
    sequence: Row;
    step: Row;
    lockToken: string;
    eventType: "email_sent" | "task_completed";
    messageId?: string | null;
    threadId?: string | null;
    externalSideEffectId?: string | null;
  },
) {
  const { data: steps, error: stepsError } = await db
    .from("crm_sequence_steps")
    .select("id,position,delay_value,delay_unit")
    .eq("sequence_id", input.sequence.id)
    .order("position", { ascending: true });
  if (stepsError) throw stepsError;
  const currentPosition = numberValue(input.step.position);
  const nextStep = (steps ?? []).find((candidate: Row) => numberValue(candidate.position) > currentPosition) as Row | undefined;
  const now = new Date();
  if (!nextStep) {
    const released = await releaseClaim(db, text(input.enrollment.id), input.lockToken, {
      state: "completed",
      current_step_id: input.step.id,
      current_step_position: currentPosition,
      next_action_at: null,
      completed_at: now.toISOString(),
      last_error_code: null,
    });
    if (!released) throw new Error("SEQUENCE_CLAIM_LOST");
    await appendSequenceEvent(db, {
      sequenceId: text(input.sequence.id),
      enrollmentId: text(input.enrollment.id),
      stepId: text(input.step.id),
      eventType: input.eventType,
      emailMessageId: input.messageId,
      emailThreadId: input.threadId,
      externalSideEffectId: input.externalSideEffectId,
    });
    await appendSequenceEvent(db, {
      sequenceId: text(input.sequence.id),
      enrollmentId: text(input.enrollment.id),
      stepId: text(input.step.id),
      eventType: "completed",
      safeMetadata: { final_step: currentPosition },
    });
    return { status: "completed" } as const;
  }

  const nextActionAt = nextSequenceActionAt({
    completedAt: now,
    delayValue: numberValue(nextStep.delay_value),
    delayUnit: nextStep.delay_unit as "minutes" | "hours" | "business_days" | "calendar_days",
    schedule: {
      timezone: text(input.sequence.timezone, "America/Chicago"),
      businessDays: Array.isArray(input.sequence.business_days) ? input.sequence.business_days.map(Number) : [1, 2, 3, 4, 5],
      sendStartLocal: text(input.sequence.send_start_local, "09:00").slice(0, 5),
      sendEndLocal: text(input.sequence.send_end_local, "16:00").slice(0, 5),
    },
  });
  const released = await releaseClaim(db, text(input.enrollment.id), input.lockToken, {
    state: "active",
    current_step_id: nextStep.id,
    current_step_position: numberValue(nextStep.position),
    next_action_at: nextActionAt,
    started_at: input.enrollment.started_at ?? now.toISOString(),
    last_error_code: null,
  });
  if (!released) throw new Error("SEQUENCE_CLAIM_LOST");
  await appendSequenceEvent(db, {
    sequenceId: text(input.sequence.id),
    enrollmentId: text(input.enrollment.id),
    stepId: text(input.step.id),
    eventType: input.eventType,
    emailMessageId: input.messageId,
    emailThreadId: input.threadId,
    externalSideEffectId: input.externalSideEffectId,
  });
  await appendSequenceEvent(db, {
    sequenceId: text(input.sequence.id),
    enrollmentId: text(input.enrollment.id),
    stepId: text(nextStep.id),
    eventType: "step_scheduled",
    safeMetadata: { next_action_at: nextActionAt, position: nextStep.position },
  });
  return { status: "scheduled", nextActionAt } as const;
}

async function createSequenceTask(
  db: Db,
  input: { enrollment: Row; sequence: Row; contact: Row; step: Row; lockToken: string; variables: Record<string, string> },
) {
  const { data: existingTask, error: existingError } = await db
    .from("crm_tasks")
    .select("id,status")
    .eq("sequence_enrollment_id", input.enrollment.id)
    .eq("sequence_step_id", input.step.id)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  let taskId = existingTask?.id as string | undefined;
  if (!taskId) {
    const stepType = text(input.step.step_type);
    const title = renderTemplate(text(input.step.task_title_template), input.variables) || `${stepType === "manual_email" ? "Send follow-up email" : stepType === "call_task" ? "Call contact" : "Complete follow-up task"}: ${text(input.contact.full_name, "contact")}`;
    const notes = stepType === "manual_email"
      ? [
          "Suggested subject:",
          renderTemplate(text(input.step.subject_template), input.variables),
          "",
          "Suggested message:",
          renderTemplate(text(input.step.body_text) || text(input.step.body_html), input.variables),
        ].join("\n").slice(0, 8_000)
      : renderTemplate(nullable(input.step.task_notes_template), input.variables) || null;
    const { data: task, error } = await db.from("crm_tasks").insert({
      organization_id: input.enrollment.organization_id,
      contact_id: input.enrollment.contact_id,
      assigned_to: input.sequence.owner_id,
      title: title.slice(0, 300),
      task_type: stepType === "manual_email" ? "email" : stepType === "call_task" ? "call" : "follow_up",
      priority: ["low", "normal", "high"].includes(text(input.step.task_priority)) ? input.step.task_priority : "normal",
      status: "open",
      due_at: new Date().toISOString(),
      notes,
      origin: "sequence",
      sequence_id: input.sequence.id,
      sequence_enrollment_id: input.enrollment.id,
      sequence_step_id: input.step.id,
    }).select("id").single();
    if (error) throw error;
    taskId = task.id as string;
  }

  const released = await releaseClaim(db, text(input.enrollment.id), input.lockToken, {
    state: "waiting_for_task",
    current_step_id: input.step.id,
    current_step_position: numberValue(input.step.position),
    next_action_at: null,
    last_error_code: null,
  });
  if (!released) throw new Error("SEQUENCE_CLAIM_LOST");
  await appendSequenceEvent(db, {
    sequenceId: text(input.sequence.id),
    enrollmentId: text(input.enrollment.id),
    stepId: text(input.step.id),
    eventType: "task_created",
    taskId,
    safeMetadata: { task_type: text(input.step.step_type), reused: Boolean(existingTask) },
  });
  return { status: "waiting_for_task", taskId } as const;
}

async function deferForDailySendLimit(
  db: Db,
  input: { enrollment: Row; sequence: Row; step: Row; lockToken: string },
) {
  const limit = numberValue(input.sequence.daily_send_limit, 25);
  if (limit < 1) throw new Error("INVALID_SEQUENCE_DAILY_SEND_LIMIT");
  // UTC is deliberately used for the first bounded worker slice. It is a
  // conservative cap across overlapping Vercel regions; the sequence window
  // still controls when the deferred message may run.
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db
    .from("crm_email_messages")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", input.sequence.id)
    .eq("origin", "sequence")
    .not("provider_message_id", "is", null)
    .gte("created_at", startOfUtcDay.toISOString());
  if (error) throw error;
  if ((count ?? 0) < limit) return null;

  const nextActionAt = nextSequenceActionAt({
    completedAt: new Date(),
    delayValue: 1,
    delayUnit: "calendar_days",
    schedule: {
      timezone: text(input.sequence.timezone, "America/Chicago"),
      businessDays: Array.isArray(input.sequence.business_days) ? input.sequence.business_days.map(Number) : [1, 2, 3, 4, 5],
      sendStartLocal: text(input.sequence.send_start_local, "09:00").slice(0, 5),
      sendEndLocal: text(input.sequence.send_end_local, "16:00").slice(0, 5),
    },
  });
  const released = await releaseClaim(db, text(input.enrollment.id), input.lockToken, {
    state: "active",
    current_step_id: input.step.id,
    current_step_position: numberValue(input.step.position),
    next_action_at: nextActionAt,
    last_error_code: "DAILY_SEND_LIMIT_REACHED",
  });
  if (!released) throw new Error("SEQUENCE_CLAIM_LOST");
  await appendSequenceEvent(db, {
    sequenceId: text(input.sequence.id),
    enrollmentId: text(input.enrollment.id),
    stepId: text(input.step.id),
    eventType: "step_scheduled",
    safeMetadata: { reason: "DAILY_SEND_LIMIT_REACHED", limit, sentToday: count ?? 0, next_action_at: nextActionAt },
  });
  return { status: "rate_limited", nextActionAt } as const;
}

export async function processClaimedSequenceEnrollment(
  db: Db,
  claim: ClaimedSequenceEnrollment,
) {
  const { data: enrollment, error: enrollmentError } = await db
    .from("crm_sequence_enrollments")
    .select("*")
    .eq("id", claim.id)
    .eq("lock_token", claim.lock_token)
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (!enrollment) return { status: "claim_lost" } as const;

  const { data: sequence, error: sequenceError } = await db
    .from("crm_sequences")
    .select("*")
    .eq("id", enrollment.sequence_id)
    .maybeSingle();
  if (sequenceError) throw sequenceError;
  if (!sequence || sequence.status !== "active" || sequence.execution_enabled !== true) {
    await releaseClaim(db, claim.id, claim.lock_token);
    return { status: "skipped", reason: "SEQUENCE_NOT_ACTIVE" } as const;
  }

  const [{ data: contact, error: contactError }, { data: mailbox, error: mailboxError }] = await Promise.all([
    db.from("crm_contacts").select("id,organization_id,full_name,email,title,status").eq("id", enrollment.contact_id).eq("organization_id", enrollment.organization_id).maybeSingle(),
    db.from("crm_mailboxes").select("id,address,display_name,status,can_send").eq("id", enrollment.mailbox_id).maybeSingle(),
  ]);
  if (contactError) throw contactError;
  if (mailboxError) throw mailboxError;
  if (!contact || contact.status !== "active" || !isValidEmail(text(contact.email))) {
    return failClaim(db, { enrollmentId: claim.id, lockToken: claim.lock_token, sequenceId: sequence.id, reason: "CONTACT_NOT_SENDABLE" });
  }
  if (!mailbox || mailbox.status !== "active" || mailbox.can_send !== true) {
    return failClaim(db, { enrollmentId: claim.id, lockToken: claim.lock_token, sequenceId: sequence.id, reason: "MAILBOX_NOT_SENDABLE" });
  }
  const suppression = await findSuppression(db, text(contact.email));
  if (suppression) {
    await stopEnrollmentForReason(db, {
      enrollmentId: claim.id,
      reason: "unsubscribe",
      eventType: "unsubscribed",
      lockToken: claim.lock_token,
    });
    return { status: "suppressed", reason: text(suppression.reason, "suppressed") } as const;
  }

  const nextPosition = numberValue(enrollment.current_step_position) + 1;
  let stepQuery = db.from("crm_sequence_steps").select("*").eq("sequence_id", sequence.id);
  if (enrollment.current_step_id) stepQuery = stepQuery.eq("id", enrollment.current_step_id);
  else stepQuery = stepQuery.eq("position", nextPosition);
  const { data: step, error: stepError } = await stepQuery.maybeSingle();
  if (stepError) throw stepError;
  if (!step) return failClaim(db, { enrollmentId: claim.id, lockToken: claim.lock_token, sequenceId: sequence.id, reason: "SEQUENCE_STEP_NOT_FOUND" });

  const { data: ownerProfile } = await db.from("profiles").select("full_name,job_title,phone,linkedin_url").eq("id", sequence.owner_id).maybeSingle();
  const organization = await db.from("organizations").select("name").eq("id", enrollment.organization_id).maybeSingle();
  const fullName = text(contact.full_name, "there");
  const variables = {
    first_name: fullName.split(/\s+/)[0] || fullName,
    full_name: fullName,
    company_name: text(organization.data?.name),
    job_title: text(contact.title),
    industry: "",
    website: "",
    sender_name: text(ownerProfile?.full_name, "Costivra"),
    sender_title: text(ownerProfile?.job_title),
  };

  const stepType = text(step.step_type);
  if (stepType === "manual_email" || stepType === "call_task" || stepType === "general_task") {
    return createSequenceTask(db, { enrollment, sequence, contact, step, lockToken: claim.lock_token, variables });
  }
  if (stepType !== "automatic_email") {
    return failClaim(db, { enrollmentId: claim.id, lockToken: claim.lock_token, sequenceId: sequence.id, stepId: step.id, reason: "UNSUPPORTED_SEQUENCE_STEP" });
  }

  const { data: previousMessage, error: previousError } = await db
    .from("crm_email_messages")
    .select("id,thread_id,provider_message_id,external_side_effect_id")
    .eq("sequence_enrollment_id", enrollment.id)
    .eq("sequence_step_id", step.id)
    .limit(1)
    .maybeSingle();
  if (previousError) throw previousError;
  if (previousMessage?.provider_message_id) {
    return advanceAfterStep(db, {
      enrollment,
      sequence,
      step,
      lockToken: claim.lock_token,
      eventType: "email_sent",
      messageId: previousMessage.id,
      threadId: previousMessage.thread_id,
      externalSideEffectId: previousMessage.external_side_effect_id,
    });
  }

  const rateLimited = await deferForDailySendLimit(db, { enrollment, sequence, step, lockToken: claim.lock_token });
  if (rateLimited) return rateLimited;

  const subject = renderTemplate(text(step.subject_template), variables).trim().slice(0, 500);
  const renderedHtml = step.body_html ? sanitizeEmailHtml(renderTemplate(text(step.body_html), variables)) : null;
  const renderedText = step.body_text ? renderTemplate(text(step.body_text), variables).trim() : emailHtmlToText(renderedHtml ?? "");
  if (!subject || !renderedText) return failClaim(db, { enrollmentId: claim.id, lockToken: claim.lock_token, sequenceId: sequence.id, stepId: step.id, reason: "SEQUENCE_EMAIL_CONTENT_EMPTY" });

  let threadId: string | null = null;
  if (step.thread_mode === "reply_to_previous") {
    const { data: prior } = await db
      .from("crm_email_messages")
      .select("thread_id")
      .eq("sequence_enrollment_id", enrollment.id)
      .not("thread_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    threadId = prior?.thread_id ?? null;
  }
  const htmlWithSignature = renderedHtml && ownerProfile
    ? appendEmailSignatureHtml(renderedHtml, {
        fullName: text(ownerProfile.full_name, "Costivra"),
        jobTitle: nullable(ownerProfile.job_title),
        phone: nullable(ownerProfile.phone),
        linkedinUrl: nullable(ownerProfile.linkedin_url),
      })
    : renderedHtml;
  const sent = await sendOutboundEmail({
    db,
    organizationId: text(enrollment.organization_id),
    actorId: text(sequence.owner_id),
    mailbox: {
      id: text(mailbox.id),
      address: text(mailbox.address),
      sender: formatMailboxSender(text(mailbox.display_name), text(mailbox.address)),
    },
    contactId: text(contact.id),
    threadId,
    to: [text(contact.email)],
    subject,
    textBody: htmlWithSignature ? emailHtmlToText(htmlWithSignature) : renderedText,
    htmlBody: htmlWithSignature,
    previewText: renderedText,
    idempotencyKey: `sequence:${enrollment.id}:${step.id}:${numberValue(enrollment.attempt_count, claim.attempt_count)}`,
    origin: "sequence",
    sequenceId: text(sequence.id),
    sequenceEnrollmentId: text(enrollment.id),
    sequenceStepId: text(step.id),
    authorizationMethod: "sequence_step",
  });
  return advanceAfterStep(db, {
    enrollment,
    sequence,
    step,
    lockToken: claim.lock_token,
    eventType: "email_sent",
    messageId: sent.messageId,
    threadId: sent.threadId,
    externalSideEffectId: sent.externalSideEffectId,
  });
}

/** Advance a call/general sequence task after an operator marks it complete. */
export async function completeSequenceTask(
  db: Db,
  input: { taskId: string; actorId: string },
) {
  const { data: task, error: taskError } = await db
    .from("crm_tasks")
    .select("id,origin,task_type,sequence_id,sequence_enrollment_id,sequence_step_id,organization_id,contact_id")
    .eq("id", input.taskId)
    .maybeSingle();
  if (taskError) throw taskError;
  if (task?.origin !== "sequence" || !task.sequence_enrollment_id || !task.sequence_id || !task.sequence_step_id) return false;
  if (task.task_type === "email") throw new Error("SEQUENCE_EMAIL_TASK_REQUIRES_SENT_MESSAGE");

  const [{ data: enrollment, error: enrollmentError }, { data: sequence, error: sequenceError }, { data: step, error: stepError }] = await Promise.all([
    db.from("crm_sequence_enrollments").select("*").eq("id", task.sequence_enrollment_id).maybeSingle(),
    db.from("crm_sequences").select("*").eq("id", task.sequence_id).maybeSingle(),
    db.from("crm_sequence_steps").select("*").eq("id", task.sequence_step_id).maybeSingle(),
  ]);
  if (enrollmentError) throw enrollmentError;
  if (sequenceError) throw sequenceError;
  if (stepError) throw stepError;
  if (!enrollment || !sequence || !step || enrollment.state !== "waiting_for_task") return false;

  const { data: steps, error: stepsError } = await db.from("crm_sequence_steps").select("id,position,delay_value,delay_unit").eq("sequence_id", sequence.id).order("position", { ascending: true });
  if (stepsError) throw stepsError;
  const currentPosition = numberValue(step.position);
  const nextStep = (steps ?? []).find((candidate: Row) => numberValue(candidate.position) > currentPosition) as Row | undefined;
  const now = new Date();
  const nextActionAt = nextStep
    ? nextSequenceActionAt({
        completedAt: now,
        delayValue: numberValue(nextStep.delay_value),
        delayUnit: nextStep.delay_unit as "minutes" | "hours" | "business_days" | "calendar_days",
        schedule: {
          timezone: text(sequence.timezone, "America/Chicago"),
          businessDays: Array.isArray(sequence.business_days) ? sequence.business_days.map(Number) : [1, 2, 3, 4, 5],
          sendStartLocal: text(sequence.send_start_local, "09:00").slice(0, 5),
          sendEndLocal: text(sequence.send_end_local, "16:00").slice(0, 5),
        },
      })
    : null;
  const update = nextStep
    ? { state: "active", current_step_id: nextStep.id, current_step_position: numberValue(nextStep.position), next_action_at: nextActionAt, updated_at: now.toISOString() }
    : { state: "completed", current_step_id: step.id, current_step_position: currentPosition, next_action_at: null, completed_at: now.toISOString(), updated_at: now.toISOString() };
  const { data: updated, error: updateError } = await db.from("crm_sequence_enrollments").update(update).eq("id", enrollment.id).eq("state", "waiting_for_task").select("id").maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return false;

  await appendSequenceEvent(db, {
    sequenceId: sequence.id,
    enrollmentId: enrollment.id,
    stepId: step.id,
    eventType: "task_completed",
    taskId: task.id,
    safeMetadata: { actor_id: input.actorId },
  });
  if (nextStep) {
    await appendSequenceEvent(db, {
      sequenceId: sequence.id,
      enrollmentId: enrollment.id,
      stepId: text(nextStep.id),
      eventType: "step_scheduled",
      safeMetadata: { next_action_at: nextActionAt, position: nextStep.position },
    });
  } else {
    await appendSequenceEvent(db, {
      sequenceId: sequence.id,
      enrollmentId: enrollment.id,
      stepId: step.id,
      eventType: "completed",
      safeMetadata: { final_step: currentPosition },
    });
  }
  return true;
}
