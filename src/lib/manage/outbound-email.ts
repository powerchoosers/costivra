import "server-only";

import { randomUUID } from "node:crypto";
import type { requireInternalOperator } from "@/lib/manage/auth";
import { getResendClient } from "@/lib/email/resend";
import {
  deliveryFailureLedgerUpdate,
  mailRequestHash,
  normalizeSubject,
  safeSnippet,
} from "@/lib/manage/mail";

type Db = Awaited<ReturnType<typeof requireInternalOperator>>["db"];

export type OutboundEmailAttachment = {
  filename: string;
  contentType: string;
  size: number;
  digest: string;
  content: Buffer;
  contentId?: string;
};

export type OutboundEmailMailbox = {
  id: string;
  address: string;
  sender: string;
};

export type OutboundEmailRequest = {
  db: Db;
  organizationId: string;
  actorId: string;
  mailbox: OutboundEmailMailbox;
  contactId?: string | null;
  threadId?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody: string;
  htmlBody?: string | null;
  previewText?: string | null;
  scheduledAt?: Date | null;
  attachments?: OutboundEmailAttachment[];
  idempotencyKey: string;
  origin?: "manual" | "sequence";
  sequenceId?: string | null;
  sequenceEnrollmentId?: string | null;
  sequenceStepId?: string | null;
  authorizationMethod?: string;
};

export type OutboundEmailResult = {
  ok: true;
  providerId: string;
  threadId: string | null;
  messageId: string | null;
  externalSideEffectId: string | null;
  scheduled: boolean;
  duplicate?: boolean;
};

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Email send failed";
}

/**
 * The single audited outbound path for manual and sequence mail.
 *
 * This function intentionally accepts already-authorized, already-normalized
 * recipients. Route handlers own authentication and contact/mailbox lookup;
 * this service owns the provider mutation and every durable local record that
 * follows it.
 */
export async function sendOutboundEmail(
  input: OutboundEmailRequest,
): Promise<OutboundEmailResult> {
  const cc = input.cc ?? [];
  const bcc = input.bcc ?? [];
  const attachments = input.attachments ?? [];
  const htmlBody = input.htmlBody || null;
  const scheduledAt = input.scheduledAt ?? null;
  const origin = input.origin ?? "manual";
  const authorizationMethod =
    input.authorizationMethod ?? "operator_send_click";
  const requestHash = mailRequestHash({
    organizationId: input.organizationId,
    mailboxId: input.mailbox.id,
    to: input.to,
    cc,
    bcc,
    subject: input.subject,
    text: input.textBody,
    html: htmlBody ?? undefined,
    scheduledAt: scheduledAt?.toISOString() ?? null,
    attachmentDigests: attachments.map((attachment) => attachment.digest),
  });

  const { data: existing, error: existingError } = await input.db
    .from("external_side_effects")
    .select("id,request_hash,status,provider_reference")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new Error("EMAIL_IDEMPOTENCY_CONTENT_MISMATCH");
    }
    if (existing.status === "sent" && existing.provider_reference) {
      const { data: previousMessage } = await input.db
        .from("crm_email_messages")
        .select("id,thread_id")
        .eq("external_side_effect_id", existing.id)
        .maybeSingle();
      return {
        ok: true,
        providerId: existing.provider_reference,
        threadId: previousMessage?.thread_id ?? null,
        messageId: previousMessage?.id ?? null,
        externalSideEffectId: existing.id,
        scheduled: Boolean(scheduledAt),
        duplicate: true,
      };
    }
    throw new Error("EMAIL_SEND_ALREADY_PROCESSING");
  }

  const traceId = randomUUID();
  const { data: effect, error: effectError } = await input.db
    .from("external_side_effects")
    .insert({
      organization_id: input.organizationId,
      mailbox_id: input.mailbox.id,
      actor_id: input.actorId,
      type: "email.outbound",
      destination: [...input.to, ...cc, ...bcc].join(","),
      idempotency_key: input.idempotencyKey,
      request_hash: requestHash,
      status: "pending",
      provider: "resend",
      authorized_at: new Date().toISOString(),
      authorization_method: authorizationMethod,
      trace_id: traceId,
      sanitized_request_metadata: {
        origin,
        subject_length: input.subject.length,
        body_length: input.textBody.length,
        recipient_count: input.to.length + cc.length + bcc.length,
        attachment_names: attachments.map((attachment) => attachment.filename),
        scheduled: Boolean(scheduledAt),
        sequence_id: input.sequenceId ?? null,
        sequence_enrollment_id: input.sequenceEnrollmentId ?? null,
        sequence_step_id: input.sequenceStepId ?? null,
      },
    })
    .select("id")
    .single();
  if (effectError) throw effectError;

  let acceptedProviderId: string | null = null;
  try {
    let inReplyTo: string | null = null;
    let references: string[] = [];
    if (input.threadId) {
      const { data: previous } = await input.db
        .from("crm_email_messages")
        .select("internet_message_id,message_references")
        .eq("thread_id", input.threadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      inReplyTo = previous?.internet_message_id ?? null;
      references = Array.isArray(previous?.message_references)
        ? previous.message_references.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      if (inReplyTo) references = Array.from(new Set([...references, inReplyTo]));
    }

    const headers: Record<string, string> = {};
    if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
    if (references.length) headers.References = references.join(" ");
    const { data: sent, error: sendError } = await getResendClient().emails.send(
      {
        from: input.mailbox.sender,
        to: input.to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: input.subject,
        text: input.textBody,
        html: htmlBody || undefined,
        replyTo: input.mailbox.address,
        scheduledAt: scheduledAt?.toISOString(),
        headers: Object.keys(headers).length ? headers : undefined,
        attachments: attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
          ...(attachment.contentId ? { contentId: attachment.contentId } : {}),
        })),
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (sendError || !sent?.id) {
      throw new Error(sendError?.message || "Resend did not accept the email.");
    }
    acceptedProviderId = sent.id;
    const now = new Date().toISOString();
    await input.db
      .from("external_side_effects")
      .update({
        status: "sent",
        provider_reference: sent.id,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", effect.id);

    let resolvedThreadId = input.threadId ?? null;
    if (!resolvedThreadId) {
      const { data: newThread, error } = await input.db
        .from("crm_email_threads")
        .insert({
          organization_id: input.organizationId,
          mailbox_id: input.mailbox.id,
          contact_id: input.contactId ?? null,
          subject: input.subject,
          normalized_subject: normalizeSubject(input.subject),
          participants: Array.from(
            new Set([input.mailbox.sender, ...input.to, ...cc]),
          ),
          snippet: safeSnippet(input.previewText ?? input.textBody),
          last_message_at: now,
        })
        .select("id")
        .single();
      if (error) throw error;
      resolvedThreadId = newThread.id;
    }

    const folder = scheduledAt ? "scheduled" : "sent";
    const providerStatus = scheduledAt ? "scheduled" : "sent";
    const { data: message, error: messageError } = await input.db
      .from("crm_email_messages")
      .insert({
        thread_id: resolvedThreadId,
        organization_id: input.organizationId,
        mailbox_id: input.mailbox.id,
        contact_id: input.contactId ?? null,
        actor_id: input.actorId,
        direction: "outbound",
        folder,
        from_address: input.mailbox.sender,
        to_addresses: input.to,
        cc_addresses: cc,
        bcc_addresses: bcc,
        subject: input.subject,
        text_body: input.textBody,
        html_body: htmlBody,
        provider_message_id: sent.id,
        provider_status: providerStatus,
        in_reply_to: inReplyTo,
        message_references: references,
        origin,
        sequence_id: input.sequenceId ?? null,
        sequence_enrollment_id: input.sequenceEnrollmentId ?? null,
        sequence_step_id: input.sequenceStepId ?? null,
        external_side_effect_id: effect.id,
        attachments: attachments.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
        })),
        sent_at: scheduledAt ? null : now,
      })
      .select("id")
      .single();
    if (messageError) throw messageError;

    await input.db
      .from("crm_email_threads")
      .update({
        organization_id: input.organizationId,
        mailbox_id: input.mailbox.id,
        contact_id: input.contactId ?? null,
        subject: input.subject,
        normalized_subject: normalizeSubject(input.subject),
        participants: Array.from(
          new Set([input.mailbox.sender, ...input.to, ...cc]),
        ),
        snippet: safeSnippet(input.previewText ?? input.textBody),
        unread_count: 0,
        status: "open",
        last_message_at: scheduledAt?.toISOString() ?? now,
        updated_at: now,
      })
      .eq("id", resolvedThreadId);
    await input.db.from("crm_account_profiles").upsert(
      {
        organization_id: input.organizationId,
        last_contacted_at: scheduledAt ? null : now,
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );
    await input.db.from("crm_activities").insert({
      organization_id: input.organizationId,
      contact_id: input.contactId ?? null,
      actor_id: input.actorId,
      kind: "email_outbound",
      direction: "outbound",
      subject: input.subject,
      summary: safeSnippet(input.previewText ?? input.textBody),
      occurred_at: scheduledAt?.toISOString() ?? now,
      metadata: {
        provider_message_id: sent.id,
        scheduled: Boolean(scheduledAt),
        origin,
        sequence_id: input.sequenceId ?? null,
        sequence_enrollment_id: input.sequenceEnrollmentId ?? null,
        sequence_step_id: input.sequenceStepId ?? null,
      },
    });
    await input.db.from("internal_audit_events").insert({
      actor_id: input.actorId,
      organization_id: input.organizationId,
      action: scheduledAt ? "crm.email_scheduled" : "crm.email_sent",
      resource_type: "crm_email_thread",
      resource_id: resolvedThreadId,
      trace_id: traceId,
      safe_metadata: {
        provider: "resend",
        recipient_count: input.to.length + cc.length + bcc.length,
        attachment_count: attachments.length,
        origin,
      },
    });
    return {
      ok: true,
      threadId: resolvedThreadId,
      messageId: message.id,
      providerId: sent.id,
      externalSideEffectId: effect.id,
      scheduled: Boolean(scheduledAt),
    };
  } catch (sendError) {
    const now = new Date().toISOString();
    await input.db
      .from("external_side_effects")
      .update(deliveryFailureLedgerUpdate(acceptedProviderId, asErrorMessage(sendError), now))
      .eq("id", effect.id);
    throw sendError;
  }
}
