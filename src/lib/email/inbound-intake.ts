import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  DOCUMENT_MIME_TYPES,
  ingestDocumentBuffer,
  MAX_DOCUMENT_SIZE,
} from "@/lib/documents/intake";
import { inboundEmailRetryDecision } from "@/lib/email/inbound-retry";
import { inboundEmailOutcomeMessage } from "@/lib/email/inbound-outcome";
import { getResendClient } from "@/lib/email/resend";
import { scanFileForMalware } from "@/lib/security/malware-scanner";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerDatabase = ReturnType<typeof createServerSupabaseClient>;
type ResendClient = ReturnType<typeof getResendClient>;

export type InboundEmailJob = {
  id: string;
  organization_id: string;
  intake_address_id: string;
  resend_email_id: string;
  sender_address: string;
  subject: string;
  attachment_count: number;
  attempt_count: number;
  max_attempts: number;
  lock_token: string;
};

type AttachmentState = {
  id: string;
  processing_status: string;
};

export async function notifyOrganizationOwners(
  db: ServerDatabase,
  organizationId: string,
  title: string,
  body: string,
  resourceId: string,
) {
  const { data: members, error: memberError } = await db
    .from("organization_memberships")
    .select("user_id,role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);
  if (memberError) throw memberError;
  if (!members?.length) return;
  const recipientIds = members.map((member) => member.user_id as string);
  const { data: existing, error: existingError } = await db
    .from("notifications")
    .select("recipient_user_id")
    .eq("organization_id", organizationId)
    .eq("resource_type", "inbound_email_event")
    .eq("resource_id", resourceId)
    .eq("title", title)
    .in("recipient_user_id", recipientIds);
  if (existingError) throw existingError;
  const alreadyNotified = new Set(
    (existing ?? []).map((notification) => notification.recipient_user_id as string),
  );
  const pendingRecipients = recipientIds.filter((recipientId) => !alreadyNotified.has(recipientId));
  if (!pendingRecipients.length) return;
  const { error } = await db.from("notifications").insert(
    pendingRecipients.map((recipientUserId) => ({
      organization_id: organizationId,
      recipient_user_id: recipientUserId,
      title,
      body,
      resource_type: "inbound_email_event",
      resource_id: resourceId,
    })),
  );
  if (error) throw error;
}

async function recordCompletionAudit(
  db: ServerDatabase,
  job: InboundEmailJob,
  action: string,
) {
  const { data: existing, error: readError } = await db
    .from("audit_events")
    .select("id")
    .eq("organization_id", job.organization_id)
    .eq("resource_type", "inbound_email_event")
    .eq("resource_id", job.id)
    .eq("action", action)
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return;
  const { error } = await db.from("audit_events").insert({
    organization_id: job.organization_id,
    actor_type: "service",
    action,
    resource_type: "inbound_email_event",
    resource_id: job.id,
  });
  if (error) throw error;
}

async function existingAttachment(
  db: ServerDatabase,
  eventId: string,
  providerAttachmentId: string,
): Promise<AttachmentState | null> {
  const { data, error } = await db
    .from("inbound_email_attachments")
    .select("id,processing_status")
    .eq("event_id", eventId)
    .eq("resend_attachment_id", providerAttachmentId)
    .maybeSingle();
  if (error) throw error;
  return data as AttachmentState | null;
}

async function createAttachment(
  db: ServerDatabase,
  job: InboundEmailJob,
  attachment: {
    id: string;
    filename?: string | null;
    content_type: string;
    size: number;
  },
) {
  const filename = (attachment.filename || `attachment-${attachment.id}`)
    .replace(/[\\/]/g, "-")
    .slice(0, 255);
  const contentType = attachment.content_type
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const { data, error } = await db
    .from("inbound_email_attachments")
    .insert({
      organization_id: job.organization_id,
      event_id: job.id,
      resend_attachment_id: attachment.id,
      filename,
      content_type: contentType,
      byte_size: attachment.size,
    })
    .select("id,processing_status")
    .single();
  if (error) throw error;
  return { row: data as AttachmentState, filename, contentType };
}

export async function processInboundEmailJob(
  job: InboundEmailJob,
  dependencies: {
    db?: ServerDatabase;
    resend?: ResendClient;
  } = {},
) {
  const db = dependencies.db ?? createServerSupabaseClient();
  const resend = dependencies.resend ?? getResendClient();
  const emailResult = await resend.emails.receiving.get(job.resend_email_id, {
    html_format: "cid",
  });
  if (emailResult.error || !emailResult.data) {
    throw new Error(
      emailResult.error?.message || "The received email could not be retrieved.",
    );
  }
  const preview =
    (emailResult.data.text || "").replace(/\s+/g, " ").trim().slice(0, 600) || null;
  const { error: previewError } = await db
    .from("inbound_email_events")
    .update({ body_preview: preview, updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("lock_token", job.lock_token);
  if (previewError) throw previewError;

  const attachmentResult = await resend.emails.receiving.attachments.list({
    emailId: job.resend_email_id,
    limit: 20,
  });
  if (attachmentResult.error || !attachmentResult.data) {
    throw new Error(
      attachmentResult.error?.message || "Attachments could not be retrieved.",
    );
  }
  const attachments = attachmentResult.data.data.slice(0, 12);

  for (const attachment of attachments) {
    let state = await existingAttachment(db, job.id, attachment.id);
    const filename = (attachment.filename || `attachment-${attachment.id}`)
      .replace(/[\\/]/g, "-")
      .slice(0, 255);
    const contentType = attachment.content_type
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!state) {
      state = (await createAttachment(db, job, attachment)).row;
    }
    if (["processed", "duplicate", "unsupported", "quarantined", "failed"].includes(state.processing_status)) {
      continue;
    }
    if (
      !DOCUMENT_MIME_TYPES.has(contentType) ||
      attachment.size <= 0 ||
      attachment.size > MAX_DOCUMENT_SIZE
    ) {
      const { error } = await db
        .from("inbound_email_attachments")
        .update({
          processing_status: "unsupported",
          error_message: "File type or size is not supported.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.id);
      if (error) throw error;
      continue;
    }

    const response = await fetch(attachment.download_url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Attachment download returned HTTP ${response.status}.`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_DOCUMENT_SIZE) {
      throw new Error("Downloaded attachment size is outside the supported range.");
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const scan = await scanFileForMalware({ buffer, filename, mimeType: contentType });
    if (scan.status !== "clean") {
      if (scan.status === "infected") {
        const { error } = await db
          .from("inbound_email_attachments")
          .update({
            sha256,
            scan_status: "infected",
            processing_status: "failed",
            error_message: "Malware scanner rejected this attachment.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", state.id);
        if (error) throw error;
        continue;
      }
      const safeName =
        filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180) || "attachment";
      const quarantinePath = `${job.organization_id}/quarantine/email/${job.id}/${randomUUID()}-${safeName}`;
      const upload = await db.storage
        .from("costivra-documents")
        .upload(quarantinePath, buffer, { contentType, upsert: false });
      if (upload.error) throw upload.error;
      const { error } = await db
        .from("inbound_email_attachments")
        .update({
          sha256,
          scan_status: scan.status,
          processing_status: "quarantined",
          quarantine_storage_path: quarantinePath,
          error_message: scan.detail || "Attachment is waiting for malware scanning.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.id);
      if (error) throw error;
      continue;
    }

    const result = await ingestDocumentBuffer({
      db,
      organizationId: job.organization_id,
      actorType: "service",
      actorId: null,
      filename,
      mimeType: contentType,
      buffer,
      sourceType: "email_forwarding",
      auditAction: "document.received_by_email",
      malwareScan: scan,
    });
    const { error } = await db
      .from("inbound_email_attachments")
      .update({
        sha256,
        scan_status: "clean",
        processing_status: result.duplicate ? "duplicate" : "processed",
        document_id: result.documentId,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.id);
    if (error) throw error;
  }

  const { data: states, error: stateError } = await db
    .from("inbound_email_attachments")
    .select("processing_status")
    .eq("event_id", job.id);
  if (stateError) throw stateError;
  const attachmentStates = (states ?? []).map((state) => state.processing_status as string);
  const processedCount = attachmentStates.filter((status) =>
    status === "processed" || status === "duplicate"
  ).length;
  const hasQuarantine = attachmentStates.includes("quarantined");
  const needsReview =
    attachments.length === 0 ||
    attachmentResult.data.data.length > attachments.length ||
    attachmentStates.some((status) => status === "failed" || status === "unsupported");
  const finalStatus = hasQuarantine
    ? "quarantined"
    : needsReview
      ? "needs_review"
      : "processed";
  const now = new Date().toISOString();
  const { error: integrationError } = await db
    .from("integrations")
    .update({ status: "connected", last_synced_at: now, updated_at: now })
    .eq("organization_id", job.organization_id)
    .eq("provider", "resend_inbound");
  if (integrationError) throw integrationError;
  await recordCompletionAudit(db, job, `inbound_email.${finalStatus}`);
  await notifyOrganizationOwners(
    db,
    job.organization_id,
    finalStatus === "processed" ? "Email documents received" : "Email intake needs attention",
    `${job.attachment_count} attachment${job.attachment_count === 1 ? "" : "s"} received from ${job.sender_address}.`,
    job.id,
  );
  const { data: finished, error: finishError } = await db
    .from("inbound_email_events")
    .update({
      status: finalStatus,
      processed_attachment_count: processedCount,
      processed_at: now,
      next_attempt_at: null,
      locked_at: null,
      lock_token: null,
      error_message: inboundEmailOutcomeMessage({
        hasQuarantine,
        attachmentCount: attachments.length,
        needsReview,
      }),
      updated_at: now,
    })
    .eq("id", job.id)
    .eq("lock_token", job.lock_token)
    .select("id")
    .maybeSingle();
  if (finishError) throw finishError;
  if (!finished) throw new Error("Inbound email job lock expired before completion.");
  return { status: finalStatus, processedAttachmentCount: processedCount };
}

export async function recordInboundEmailJobFailure(
  db: ServerDatabase,
  job: InboundEmailJob,
  error: unknown,
) {
  const decision = inboundEmailRetryDecision(job.attempt_count, job.max_attempts);
  const message = error instanceof Error ? error.message.slice(0, 1000) : "Inbound processing failed.";
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from("inbound_email_events")
    .update({
      status: decision.status,
      next_attempt_at: decision.nextAttemptAt,
      locked_at: null,
      lock_token: null,
      processed_at: decision.status === "dead_letter" ? now : null,
      error_message: message,
      updated_at: now,
    })
    .eq("id", job.id)
    .eq("lock_token", job.lock_token)
    .select("id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return decision;
  await db.from("audit_events").insert({
    organization_id: job.organization_id,
    actor_type: "service",
    action: decision.status === "dead_letter"
      ? "inbound_email.dead_lettered"
      : "inbound_email.retry_scheduled",
    resource_type: "inbound_email_event",
    resource_id: job.id,
    metadata: {
      attempt: job.attempt_count,
      max_attempts: job.max_attempts,
      retry_at: decision.nextAttemptAt,
    },
  });
  if (decision.status === "dead_letter") {
    await notifyOrganizationOwners(
      db,
      job.organization_id,
      "Email intake needs manual review",
      "Costivra received the email but could not finish processing it after several safe retries.",
      job.id,
    );
  }
  return decision;
}
