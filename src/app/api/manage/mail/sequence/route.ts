import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];

function statusFilter(value: string | null) {
  const allowed = new Set(["scheduled", "queued", "sent", "delivered", "delayed", "replied", "bounced", "complained", "suppressed", "failed", "canceled"]);
  return value && allowed.has(value) ? value : null;
}

export async function GET(request: Request) {
  try {
    const { db } = await requireInternalOperator();
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page") || 1) || 1));
    const limit = Math.max(10, Math.min(50, Number(url.searchParams.get("limit") || 25) || 25));
    const status = statusFilter(url.searchParams.get("status"));
    const mailboxId = cleanUuid(url.searchParams.get("mailbox"));
    const sequenceId = cleanUuid(url.searchParams.get("sequence"));
    const accountId = cleanUuid(url.searchParams.get("account"));
    const ownerId = cleanUuid(url.searchParams.get("owner"));
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    let query = db
      .from("crm_email_messages")
      .select("id,thread_id,organization_id,mailbox_id,contact_id,subject,to_addresses,provider_message_id,provider_status,sequence_id,sequence_enrollment_id,sequence_step_id,external_side_effect_id,sent_at,created_at,folder", { count: "exact" })
      .eq("origin", "sequence")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("provider_status", status);
    if (mailboxId) query = query.eq("mailbox_id", mailboxId);
    if (sequenceId) query = query.eq("sequence_id", sequenceId);
    if (accountId) query = query.eq("organization_id", accountId);
    if (fromDate && !Number.isNaN(Date.parse(fromDate))) query = query.gte("created_at", new Date(fromDate).toISOString());
    if (toDate && !Number.isNaN(Date.parse(toDate))) query = query.lte("created_at", new Date(`${toDate}T23:59:59.999Z`).toISOString());
    const from = (page - 1) * limit;
    const { data: messages, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;

    const messageRows = rows(messages);
    const sequenceIds = Array.from(new Set(messageRows.map((row) => text(row.sequence_id)).filter(Boolean)));
    const enrollmentIds = Array.from(new Set(messageRows.map((row) => text(row.sequence_enrollment_id)).filter(Boolean)));
    const stepIds = Array.from(new Set(messageRows.map((row) => text(row.sequence_step_id)).filter(Boolean)));
    const contactIds = Array.from(new Set(messageRows.map((row) => text(row.contact_id)).filter(Boolean)));
    const organizationIds = Array.from(new Set(messageRows.map((row) => text(row.organization_id)).filter(Boolean)));
    const mailboxIds = Array.from(new Set(messageRows.map((row) => text(row.mailbox_id)).filter(Boolean)));
    const [sequencesResult, enrollmentsResult, stepsResult, contactsResult, organizationsResult, mailboxesResult, sideEffectsResult, eventsResult] = await Promise.all([
      sequenceIds.length ? db.from("crm_sequences").select("id,name,owner_id,daily_send_limit,timezone,send_start_local,send_end_local").in("id", sequenceIds) : Promise.resolve({ data: [], error: null }),
      enrollmentIds.length ? db.from("crm_sequence_enrollments").select("id,state,current_step_position,next_action_at,stop_reason").in("id", enrollmentIds) : Promise.resolve({ data: [], error: null }),
      stepIds.length ? db.from("crm_sequence_steps").select("id,position,step_type").in("id", stepIds) : Promise.resolve({ data: [], error: null }),
      contactIds.length ? db.from("crm_contacts").select("id,full_name,email").in("id", contactIds) : Promise.resolve({ data: [], error: null }),
      organizationIds.length ? db.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [], error: null }),
      mailboxIds.length ? db.from("crm_mailboxes").select("id,address").in("id", mailboxIds) : Promise.resolve({ data: [], error: null }),
      messageRows.some((row) => row.external_side_effect_id) ? db.from("external_side_effects").select("id,status,provider_reference,failure_class,last_error,last_provider_event_at,updated_at").in("id", messageRows.map((row) => text(row.external_side_effect_id)).filter(Boolean)) : Promise.resolve({ data: [], error: null }),
      enrollmentIds.length ? db.from("crm_sequence_events").select("id,enrollment_id,event_type,occurred_at,safe_metadata").in("enrollment_id", enrollmentIds).order("occurred_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    ]);
    const related = [sequencesResult, enrollmentsResult, stepsResult, contactsResult, organizationsResult, mailboxesResult, sideEffectsResult, eventsResult].find((result) => result.error);
    if (related?.error) throw related.error;
    const byId = (items: unknown) => new Map(rows(items).map((row) => [text(row.id), row]));
    const sequences = byId(sequencesResult.data);
    const enrollments = byId(enrollmentsResult.data);
    const steps = byId(stepsResult.data);
    const contacts = byId(contactsResult.data);
    const organizations = byId(organizationsResult.data);
    const mailboxes = byId(mailboxesResult.data);
    const sideEffects = byId(sideEffectsResult.data);
    const latestEvents = new Map<string, Row>();
    for (const event of rows(eventsResult.data)) if (!latestEvents.has(text(event.enrollment_id))) latestEvents.set(text(event.enrollment_id), event);
    const items = messageRows.map((message) => {
      const enrollment = enrollments.get(text(message.sequence_enrollment_id));
      const sequence = sequences.get(text(message.sequence_id));
      const contact = contacts.get(text(message.contact_id));
      const recipient = Array.isArray(message.to_addresses) && typeof message.to_addresses[0] === "string" ? message.to_addresses[0] : text(contact?.email);
      return {
        id: text(message.id),
        threadId: nullable(message.thread_id),
        organizationId: nullable(message.organization_id),
        accountName: text(organizations.get(text(message.organization_id))?.name, "Unknown account"),
        contactName: text(contact?.full_name, recipient || "Unknown recipient"),
        recipient,
        sequenceId: nullable(message.sequence_id),
        sequenceName: text(sequences.get(text(message.sequence_id))?.name, "Sequence"),
        ownerId: nullable(sequence?.owner_id),
        enrollmentId: nullable(message.sequence_enrollment_id),
        enrollmentState: text(enrollment?.state, "unknown"),
        stepId: nullable(message.sequence_step_id),
        stepPosition: Number(steps.get(text(message.sequence_step_id))?.position ?? 0),
        stepType: text(steps.get(text(message.sequence_step_id))?.step_type, "automatic_email"),
        mailboxId: nullable(message.mailbox_id),
        mailboxAddress: text(mailboxes.get(text(message.mailbox_id))?.address),
        providerMessageId: nullable(message.provider_message_id),
        providerStatus: text(message.provider_status, "queued"),
        subject: text(message.subject, "(no subject)"),
        scheduledAt: nullable(message.created_at),
        sentAt: nullable(message.sent_at),
        nextActionAt: nullable(enrollment?.next_action_at),
        stopReason: nullable(enrollment?.stop_reason),
        externalSideEffectId: nullable(message.external_side_effect_id),
        sideEffect: sideEffects.get(text(message.external_side_effect_id)) ?? null,
        latestEvent: latestEvents.get(text(message.sequence_enrollment_id)) ?? null,
        dailySendLimit: Number(sequence?.daily_send_limit ?? 10),
        sendWindow: { timezone: text(sequence?.timezone, "America/Chicago"), start: text(sequence?.send_start_local, "09:00"), end: text(sequence?.send_end_local, "16:00") },
      };
    }).filter((item) => !ownerId || item.ownerId === ownerId);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const [{ count: scheduledToday }, { count: sentToday }, { count: delivered }, { count: replies }, { count: bounced }] = await Promise.all([
      db.from("crm_email_messages").select("id", { count: "exact", head: true }).eq("origin", "sequence").eq("provider_status", "scheduled").gte("created_at", startOfDay),
      db.from("crm_email_messages").select("id", { count: "exact", head: true }).eq("origin", "sequence").in("provider_status", ["sent", "delivered"]).gte("created_at", startOfDay),
      db.from("crm_email_messages").select("id", { count: "exact", head: true }).eq("origin", "sequence").eq("provider_status", "delivered"),
      db.from("crm_sequence_events").select("id", { count: "exact", head: true }).eq("event_type", "reply_received"),
      db.from("crm_sequence_events").select("id", { count: "exact", head: true }).eq("event_type", "bounced"),
    ]);
    return NextResponse.json({
      items,
      page,
      limit,
      hasMore: (count ?? 0) > from + items.length,
      metrics: { scheduledToday: scheduledToday ?? 0, sentToday: sentToday ?? 0, delivered: delivered ?? 0, replies: replies ?? 0, bounced: bounced ?? 0, needsAttention: items.filter((item) => ["failed", "bounced", "complained", "suppressed"].includes(item.providerStatus) || ["failed", "bounced", "unsubscribed"].includes(item.enrollmentState)).length },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
