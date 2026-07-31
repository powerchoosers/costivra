import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { EmailReceivedEvent, WebhookEventPayload } from "resend";
import {
  DOCUMENT_MIME_TYPES,
  ingestDocumentBuffer,
  MAX_DOCUMENT_SIZE,
} from "@/lib/documents/intake";
import {
  isTrustedInboundSender,
  matchesIntakeAddress,
  normalizeEmailAddress,
  normalizeTrustedSenders,
} from "@/lib/email/inbound-policy";
import { getResendClient } from "@/lib/email/resend";
import { normalizeSubject, safeSnippet } from "@/lib/manage/mail";
import { scanFileForMalware } from "@/lib/security/malware-scanner";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const deliveryStatuses: Partial<Record<WebhookEventPayload["type"], string>> = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
};

function headerValue(headers: Record<string, string> | null, name: string) {
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return entry?.[1] ?? null;
}

async function recordDeliveryEvent(
  db: ReturnType<typeof createServerSupabaseClient>,
  event: WebhookEventPayload,
  providerEventId: string,
) {
  if (!("email_id" in event.data)) return;
  const providerMessageId = event.data.email_id;
  const { error } = await db.from("crm_email_events").insert({
    provider_event_id: providerEventId,
    provider_message_id: providerMessageId,
    event_type: event.type,
    occurred_at: event.created_at,
    safe_metadata: {},
  });
  if (error?.code === "23505") return;
  if (error) throw error;
  const status = deliveryStatuses[event.type];
  if (!status) return;
  const updates: Record<string, unknown> = {
    provider_status: status,
    updated_at: new Date().toISOString(),
  };
  if (event.type === "email.sent") {
    updates.folder = "sent";
    updates.sent_at = event.created_at;
  }
  await db
    .from("crm_email_messages")
    .update(updates)
    .eq("provider_message_id", providerMessageId);
}

async function persistOwnerMailboxMessage(
  db: ReturnType<typeof createServerSupabaseClient>,
  resend: ReturnType<typeof getResendClient>,
  received: EmailReceivedEvent,
  recipientAddresses: string[],
) {
  const senderAddress = normalizeEmailAddress(received.data.from);
  const { data: existing } = await db
    .from("crm_email_messages")
    .select("id")
    .eq("provider_message_id", received.data.email_id)
    .maybeSingle();
  if (existing) return { duplicate: true };

  const emailResult = await resend.emails.receiving.get(
    received.data.email_id,
    {
      html_format: "cid",
    },
  );
  if (emailResult.error || !emailResult.data)
    throw new Error(
      emailResult.error?.message ||
        "The received email could not be retrieved.",
    );
  const full = emailResult.data;
  const subject = (full.subject || "(no subject)").slice(0, 500);
  const normalizedSubject = normalizeSubject(subject);
  const inReplyTo = headerValue(full.headers, "in-reply-to");
  const referenceHeader = headerValue(full.headers, "references");
  const references = referenceHeader?.split(/\s+/).filter(Boolean) ?? [];

  const { data: crmContacts } = await db
    .from("crm_contacts")
    .select("id,organization_id,full_name,email")
    .ilike("email", senderAddress)
    .limit(2);
  const contact = crmContacts?.length === 1 ? crmContacts[0] : null;
  let organizationId = contact?.organization_id ?? null;

  if (!organizationId) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id,email,full_name")
      .ilike("email", senderAddress)
      .limit(2);
    if (profiles?.length === 1) {
      const { data: memberships } = await db
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", profiles[0].id)
        .limit(2);
      if (memberships?.length === 1)
        organizationId = memberships[0].organization_id;
    }
  }

  let threadId: string | null = null;
  if (inReplyTo) {
    const { data: repliedMessage } = await db
      .from("crm_email_messages")
      .select("thread_id")
      .eq("internet_message_id", inReplyTo)
      .maybeSingle();
    threadId = repliedMessage?.thread_id ?? null;
  }
  if (!threadId && organizationId) {
    const { data: relatedThread } = await db
      .from("crm_email_threads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("normalized_subject", normalizedSubject)
      .eq("status", "open")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    threadId = relatedThread?.id ?? null;
  }
  const now = full.created_at || received.created_at;
  const snippet = safeSnippet(full.text || "");
  if (!threadId) {
    const { data: thread, error } = await db
      .from("crm_email_threads")
      .insert({
        organization_id: organizationId,
        contact_id: contact?.id ?? null,
        subject,
        normalized_subject: normalizedSubject,
        participants: Array.from(
          new Set([senderAddress, ...recipientAddresses]),
        ),
        snippet,
        unread_count: 1,
        last_message_at: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    threadId = thread.id;
  } else {
    const { data: thread } = await db
      .from("crm_email_threads")
      .select("unread_count")
      .eq("id", threadId)
      .single();
    await db
      .from("crm_email_threads")
      .update({
        organization_id: organizationId,
        contact_id: contact?.id ?? null,
        participants: Array.from(
          new Set([senderAddress, ...recipientAddresses]),
        ),
        snippet,
        unread_count: Number(thread?.unread_count ?? 0) + 1,
        last_message_at: now,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);
  }

  const attachmentMetadata = full.attachments.map((attachment) => ({
    filename: attachment.filename || `attachment-${attachment.id}`,
    contentType: attachment.content_type,
    size: attachment.size,
    providerAttachmentId: attachment.id,
  }));
  const { error: messageError } = await db.from("crm_email_messages").insert({
    thread_id: threadId,
    organization_id: organizationId,
    contact_id: contact?.id ?? null,
    direction: "inbound",
    folder: "inbox",
    from_address: senderAddress,
    to_addresses: full.to.map(normalizeEmailAddress),
    cc_addresses: (full.cc ?? []).map(normalizeEmailAddress),
    reply_to_addresses: (full.reply_to ?? []).map(normalizeEmailAddress),
    subject,
    text_body: full.text,
    html_body: full.html,
    provider_message_id: received.data.email_id,
    provider_status: "received",
    internet_message_id: full.message_id,
    in_reply_to: inReplyTo,
    message_references: references,
    attachments: attachmentMetadata,
    received_at: now,
  });
  if (messageError) throw messageError;
  if (organizationId) {
    await db.from("crm_activities").insert({
      organization_id: organizationId,
      contact_id: contact?.id ?? null,
      kind: "email_inbound",
      direction: "inbound",
      subject,
      summary: snippet,
      occurred_at: now,
      metadata: { provider_message_id: received.data.email_id },
    });
  }
  await db.from("internal_audit_events").insert({
    organization_id: organizationId,
    action: "crm.email_received",
    resource_type: "crm_email_thread",
    resource_id: threadId,
    safe_metadata: { linked_to_account: Boolean(organizationId) },
  });
  return { duplicate: false, threadId };
}

async function notifyOwners(
  db: ReturnType<typeof createServerSupabaseClient>,
  organizationId: string,
  title: string,
  body: string,
  resourceId: string,
) {
  const { data: members } = await db
    .from("organization_memberships")
    .select("user_id,role")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);
  if (!members?.length) return;
  await db.from("notifications").insert(
    members.map((member) => ({
      organization_id: organizationId,
      recipient_user_id: member.user_id,
      title,
      body,
      resource_type: "inbound_email_event",
      resource_id: resourceId,
    })),
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret)
    return NextResponse.json(
      { error: "Inbound email is not configured." },
      { status: 503 },
    );

  const payload = await request.text();
  const resend = getResendClient();
  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }
  const db = createServerSupabaseClient();
  const providerEventId =
    request.headers.get("svix-id") ||
    createHash("sha256").update(payload).digest("hex");
  if (event.type !== "email.received") {
    await recordDeliveryEvent(db, event, providerEventId);
    return NextResponse.json({ received: true });
  }

  const received = event as EmailReceivedEvent;
  const recipientAddresses = Array.from(
    new Set(
      [...(received.data.to ?? []), ...(received.data.received_for ?? [])].map(
        normalizeEmailAddress,
      ),
    ),
  );
  const localParts = recipientAddresses
    .map((address) => address.split("@")[0])
    .filter(Boolean);
  const domains = recipientAddresses
    .map((address) => address.split("@")[1])
    .filter(Boolean);
  if (!localParts.length || !domains.length)
    return NextResponse.json({ received: true });

  const { data: intakeCandidates } = await db
    .from("inbound_email_addresses")
    .select("id,organization_id,local_part,domain,status,trusted_senders")
    .in("local_part", localParts)
    .in("domain", domains)
    .eq("status", "active");
  const intake = intakeCandidates?.find((candidate) =>
    matchesIntakeAddress(recipientAddresses, candidate),
  );
  if (!intake) {
    const ownerInbox = normalizeEmailAddress(
      process.env.RESEND_OWNER_INBOX || "mail@inbound.costivra.ai",
    );
    if (!recipientAddresses.includes(ownerInbox))
      return NextResponse.json({ received: true });
    const result = await persistOwnerMailboxMessage(
      db,
      resend,
      received,
      recipientAddresses,
    );
    await db.from("crm_email_events").upsert(
      {
        provider_event_id: providerEventId,
        provider_message_id: received.data.email_id,
        event_type: event.type,
        occurred_at: event.created_at,
        safe_metadata: { mailbox: "owner" },
      },
      { onConflict: "provider_event_id" },
    );
    return NextResponse.json({ received: true, mailbox: "owner", ...result });
  }

  const senderAddress = normalizeEmailAddress(received.data.from);
  const inserted = await db
    .from("inbound_email_events")
    .insert({
      organization_id: intake.organization_id,
      intake_address_id: intake.id,
      resend_email_id: received.data.email_id,
      message_id: received.data.message_id || null,
      sender_address: senderAddress,
      recipient_addresses: recipientAddresses,
      subject: (received.data.subject || "(no subject)").slice(0, 500),
      status: "received",
      attachment_count: received.data.attachments?.length ?? 0,
      received_at: received.data.created_at || received.created_at,
    })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505")
      return NextResponse.json({ received: true, duplicate: true });
    throw inserted.error;
  }
  const eventId = inserted.data.id as string;

  const { data: memberships } = await db
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", intake.organization_id);
  const userIds = (memberships ?? []).map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("email").in("id", userIds)
    : { data: [] as { email: string }[] };
  const trusted = normalizeTrustedSenders(
    Array.isArray(intake.trusted_senders) ? intake.trusted_senders : [],
    (profiles ?? []).map((profile) => profile.email),
  );

  if (!isTrustedInboundSender(senderAddress, trusted)) {
    await db
      .from("inbound_email_events")
      .update({
        status: "rejected",
        error_message: "Sender is not on the trusted forwarding list.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    await notifyOwners(
      db,
      intake.organization_id,
      "Email intake blocked",
      `An email from ${senderAddress} was held because the sender is not trusted.`,
      eventId,
    );
    await db.from("audit_events").insert({
      organization_id: intake.organization_id,
      actor_type: "service",
      action: "inbound_email.sender_rejected",
      resource_type: "inbound_email_event",
      resource_id: eventId,
    });
    return NextResponse.json({ received: true, status: "rejected" });
  }

  await db
    .from("inbound_email_events")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", eventId);
  try {
    const emailResult = await resend.emails.receiving.get(
      received.data.email_id,
      { html_format: "cid" },
    );
    if (emailResult.error || !emailResult.data)
      throw new Error(
        emailResult.error?.message ||
          "The received email could not be retrieved.",
      );
    const preview =
      (emailResult.data.text || "").replace(/\s+/g, " ").trim().slice(0, 600) ||
      null;
    await db
      .from("inbound_email_events")
      .update({ body_preview: preview })
      .eq("id", eventId);

    const attachmentResult = await resend.emails.receiving.attachments.list({
      emailId: received.data.email_id,
      limit: 20,
    });
    if (attachmentResult.error || !attachmentResult.data)
      throw new Error(
        attachmentResult.error?.message ||
          "Attachments could not be retrieved.",
      );
    const attachments = attachmentResult.data.data.slice(0, 12);
    let processedCount = 0;
    let quarantinedCount = 0;
    let reviewCount =
      attachmentResult.data.data.length > attachments.length ? 1 : 0;

    for (const attachment of attachments) {
      const filename = (attachment.filename || `attachment-${attachment.id}`)
        .replace(/[\\/]/g, "-")
        .slice(0, 255);
      const contentType = attachment.content_type
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      const row = await db
        .from("inbound_email_attachments")
        .insert({
          organization_id: intake.organization_id,
          event_id: eventId,
          resend_attachment_id: attachment.id,
          filename,
          content_type: contentType,
          byte_size: attachment.size,
        })
        .select("id")
        .single();
      if (row.error) {
        if (row.error.code === "23505") continue;
        throw row.error;
      }
      const attachmentRowId = row.data.id as string;
      if (
        !DOCUMENT_MIME_TYPES.has(contentType) ||
        attachment.size <= 0 ||
        attachment.size > MAX_DOCUMENT_SIZE
      ) {
        reviewCount += 1;
        await db
          .from("inbound_email_attachments")
          .update({
            processing_status: "unsupported",
            error_message: "File type or size is not supported.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attachmentRowId);
        continue;
      }

      const response = await fetch(attachment.download_url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(
          `Attachment download returned HTTP ${response.status}.`,
        );
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > MAX_DOCUMENT_SIZE)
        throw new Error(
          "Downloaded attachment size is outside the supported range.",
        );
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const scan = await scanFileForMalware({
        buffer,
        filename,
        mimeType: contentType,
      });

      if (scan.status !== "clean") {
        if (scan.status === "infected") {
          reviewCount += 1;
          await db
            .from("inbound_email_attachments")
            .update({
              sha256,
              scan_status: "infected",
              processing_status: "failed",
              error_message: "Malware scanner rejected this attachment.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", attachmentRowId);
          continue;
        }
        const safeName =
          filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180) || "attachment";
        const quarantinePath = `${intake.organization_id}/quarantine/email/${eventId}/${randomUUID()}-${safeName}`;
        const upload = await db.storage
          .from("costivra-documents")
          .upload(quarantinePath, buffer, { contentType, upsert: false });
        if (upload.error) throw upload.error;
        quarantinedCount += 1;
        await db
          .from("inbound_email_attachments")
          .update({
            sha256,
            scan_status: scan.status,
            processing_status: "quarantined",
            quarantine_storage_path: quarantinePath,
            error_message:
              scan.detail || "Attachment is waiting for malware scanning.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attachmentRowId);
        continue;
      }

      const result = await ingestDocumentBuffer({
        db,
        organizationId: intake.organization_id,
        actorType: "service",
        actorId: null,
        filename,
        mimeType: contentType,
        buffer,
        auditAction: "document.received_by_email",
      });
      processedCount += 1;
      await db
        .from("inbound_email_attachments")
        .update({
          sha256,
          scan_status: "clean",
          processing_status: result.duplicate ? "duplicate" : "processed",
          document_id: result.documentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentRowId);
    }

    const finalStatus = quarantinedCount
      ? "quarantined"
      : reviewCount
        ? "needs_review"
        : "processed";
    await db
      .from("inbound_email_events")
      .update({
        status: finalStatus,
        processed_attachment_count: processedCount,
        processed_at: new Date().toISOString(),
        error_message: quarantinedCount
          ? "One or more attachments are waiting for malware scanning."
          : reviewCount
            ? "One or more attachments need review."
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    await db
      .from("integrations")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", intake.organization_id)
      .eq("provider", "resend_inbound");
    await db.from("audit_events").insert({
      organization_id: intake.organization_id,
      actor_type: "service",
      action: `inbound_email.${finalStatus}`,
      resource_type: "inbound_email_event",
      resource_id: eventId,
    });
    await notifyOwners(
      db,
      intake.organization_id,
      finalStatus === "processed"
        ? "Email documents received"
        : "Email intake needs attention",
      `${received.data.attachments?.length ?? 0} attachment${received.data.attachments?.length === 1 ? "" : "s"} received from ${senderAddress}.`,
      eventId,
    );
    return NextResponse.json({ received: true, status: finalStatus });
  } catch (error) {
    await db
      .from("inbound_email_events")
      .update({
        status: "failed",
        error_message:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Inbound processing failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    await notifyOwners(
      db,
      intake.organization_id,
      "Email intake failed",
      "Costivra received an email but could not finish processing it. Open Integrations to review the event.",
      eventId,
    );
    return NextResponse.json(
      { error: "Inbound processing failed." },
      { status: 500 },
    );
  }
}
