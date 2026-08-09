import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Enrollment, Sequence, SequenceStep } from "./types";

type Db = SupabaseClient;
type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const num = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

function step(row: Row): SequenceStep {
  return {
    id: text(row.id), sequenceId: text(row.sequence_id), position: num(row.position),
    stepType: row.step_type as SequenceStep["stepType"], delayValue: num(row.delay_value), delayUnit: row.delay_unit as SequenceStep["delayUnit"],
    threadMode: row.thread_mode as SequenceStep["threadMode"], subjectTemplate: nullable(row.subject_template),
    bodyHtml: nullable(row.body_html), bodyText: nullable(row.body_text),
    taskTitleTemplate: nullable(row.task_title_template), taskNotesTemplate: nullable(row.task_notes_template),
    taskPriority: row.task_priority as SequenceStep["taskPriority"], pauseUntilTaskComplete: row.pause_until_task_complete !== false,
  };
}

export function mapSequence(row: Row, steps: SequenceStep[] = [], stats?: Partial<Sequence>) : Sequence {
  return {
    id: text(row.id), organizationId: text(row.organization_id), name: text(row.name), description: nullable(row.description),
    status: row.status as Sequence["status"], ownerId: text(row.owner_id), ownerName: nullable((row.owner as Row | null)?.full_name), timezone: text(row.timezone, "America/Chicago"),
    businessDays: Array.isArray(row.business_days) ? row.business_days.map(Number) : [1,2,3,4,5],
    sendStartLocal: text(row.send_start_local, "09:00"), sendEndLocal: text(row.send_end_local, "16:00"), dailySendLimit: num(row.daily_send_limit, 25),
    stopOnReply: row.stop_on_reply !== false, stopOnBounce: row.stop_on_bounce !== false, stopOnUnsubscribe: row.stop_on_unsubscribe !== false,
    stopCompanyOnReply: row.stop_company_on_reply === true, executionEnabled: row.execution_enabled === true,
    activatedAt: nullable(row.activated_at), pausedAt: nullable(row.paused_at), archivedAt: nullable(row.archived_at),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at), steps,
    activeEnrollments: stats?.activeEnrollments ?? 0, scheduledNext24Hours: stats?.scheduledNext24Hours ?? 0,
    sent: stats?.sent ?? 0, replies: stats?.replies ?? 0,
  };
}

export async function listSequences(db: Db, organizationId?: string) {
  let query = db.from("crm_sequences").select("*, crm_sequence_steps(*)").order("updated_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  const ids = (data ?? []).map((row: Row) => row.id);
  const enrollments = ids.length ? await db.from("crm_sequence_enrollments").select("sequence_id,state,next_action_at").in("sequence_id", ids) : { data: [], error: null };
  if (enrollments.error) throw enrollments.error;
  return (data ?? []).map((row: Row) => {
    const related = (Array.isArray(row.crm_sequence_steps) ? row.crm_sequence_steps : []).map((item) => step(item as Row)).sort((a, b) => a.position - b.position);
    const current = (enrollments.data ?? []).filter((item: Row) => item.sequence_id === row.id);
    return mapSequence(row, related, {
      activeEnrollments: current.filter((item: Row) => ["pending", "active", "paused", "waiting_for_task"].includes(text(item.state))).length,
      scheduledNext24Hours: current.filter((item: Row) => item.next_action_at && Date.parse(text(item.next_action_at)) <= Date.now() + 86_400_000).length,
    });
  });
}

export async function getSequence(db: Db, id: string) {
  const { data, error } = await db.from("crm_sequences").select("*, crm_sequence_steps(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  const rawSteps = Array.isArray(row.crm_sequence_steps) ? row.crm_sequence_steps : [];
  return mapSequence(row, rawSteps.map((item) => step(item as Row)).sort((a: SequenceStep, b: SequenceStep) => a.position - b.position));
}

export async function listEnrollments(db: Db, organizationId?: string) {
  let query = db.from("crm_sequence_enrollments").select("*, sequence:crm_sequences(name), contact:crm_contacts(full_name,email), mailbox:crm_mailboxes(address), organization:organizations(name)").order("created_at", { ascending: false }).limit(500);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Row): Enrollment => ({
    id: text(row.id), sequenceId: text(row.sequence_id), sequenceName: text((row.sequence as Row | null)?.name, "Sequence"), organizationId: text(row.organization_id),
    contactId: text(row.contact_id), contactName: text((row.contact as Row | null)?.full_name, "Unknown contact"), contactEmail: text((row.contact as Row | null)?.email), accountName: text((row.organization as Row | null)?.name, "Unknown account"),
    mailboxId: text(row.mailbox_id), mailboxAddress: text((row.mailbox as Row | null)?.address), state: row.state as Enrollment["state"], currentStepPosition: num(row.current_step_position),
    nextActionAt: nullable(row.next_action_at), stopReason: nullable(row.stop_reason), createdAt: text(row.created_at),
  }));
}

export async function findSuppression(db: Db, email: string) {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1] ?? "";
  const emailQuery = db.from("crm_outreach_suppressions").select("id,reason,source,expires_at").eq("email_normalized", normalized).order("created_at", { ascending: false }).limit(20);
  const domainQuery = domain ? db.from("crm_outreach_suppressions").select("id,reason,source,expires_at").eq("domain_normalized", domain).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null });
  const [{ data: emailRows, error: emailError }, { data: domainRows, error: domainError }] = await Promise.all([emailQuery, domainQuery]);
  if (emailError) throw emailError;
  if (domainError) throw domainError;
  const active = [...(emailRows ?? []), ...(domainRows ?? [])].find((row: Row) => !row.expires_at || Date.parse(text(row.expires_at)) > Date.now());
  return active ?? null;
}
