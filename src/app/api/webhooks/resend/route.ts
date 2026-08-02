import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { EmailReceivedEvent, WebhookEventPayload } from "resend";
import { notifyOrganizationOwners } from "@/lib/email/inbound-intake";
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
const MAX_MAIL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function safeDeliveryMetadata(event: WebhookEventPayload) {
  if (event.type !== "email.clicked") return {};
  try {
    const link = new URL(event.data.click.link);
    return { link_host: link.host.slice(0, 255), link_path: link.pathname.slice(0, 500) };
  } catch {
    return {};
  }
}

async function internalNotificationRecipients(
  db: ReturnType<typeof createServerSupabaseClient>,
  preferredUserId?: string | null,
) {
  if (preferredUserId) return [preferredUserId];
  const { data, error } = await db
    .from("internal_staff_users")
    .select("user_id")
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((staff) => staff.user_id as string);
}

async function insertInternalMailNotification(
  db: ReturnType<typeof createServerSupabaseClient>,
  input: {
    kind: "email_received" | "email_opened" | "email_clicked" | "email_delivery_failed";
    title: string;
    body: string;
    resourceId: string;
    actionHref: string;
    organizationId?: string | null;
    providerEventId?: string;
    preferredUserId?: string | null;
  },
) {
  const recipientIds = await internalNotificationRecipients(db, input.preferredUserId);
  if (!recipientIds.length) return;
  const { error } = await db.from("internal_notifications").insert(
    recipientIds.map((recipientUserId) => ({
      organization_id: input.organizationId ?? null,
      recipient_user_id: recipientUserId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      resource_type: "crm_email_thread",
      resource_id: input.resourceId,
      action_href: input.actionHref,
      provider_event_id: input.providerEventId ?? null,
    })),
  );
  if (error?.code !== "23505" && error) throw error;
}

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
    safe_metadata: safeDeliveryMetadata(event),
  });
  if (error?.code === "23505") return;
  if (error) throw error;
  const status = deliveryStatuses[event.type];
  if (status) {
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

  if (!["email.opened", "email.clicked", "email.bounced", "email.failed"].includes(event.type))
    return;
  const { data: message, error: messageError } = await db
    .from("crm_email_messages")
    .select("thread_id,organization_id,actor_id,subject,to_addresses")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (messageError) throw messageError;
  if (!message?.thread_id) return;
  const recipient = Array.isArray(message.to_addresses) ? message.to_addresses[0] : null;
  const kind = event.type === "email.opened"
    ? "email_opened"
    : event.type === "email.clicked"
      ? "email_clicked"
      : "email_delivery_failed";
  const title = event.type === "email.opened"
    ? "Email opened"
    : event.type === "email.clicked"
      ? "Link clicked"
      : "Email delivery problem";
  const body = event.type === "email.opened"
    ? `${recipient || "The recipient"} opened “${message.subject}”.`
    : event.type === "email.clicked"
      ? `${recipient || "The recipient"} clicked a link in “${message.subject}”.`
      : `“${message.subject}” could not be delivered normally. Open the conversation for details.`;
  await insertInternalMailNotification(db, {
    kind,
    title,
    body,
    resourceId: message.thread_id,
    actionHref: `/manage/mail/${message.thread_id}`,
    organizationId: message.organization_id,
    providerEventId,
    preferredUserId: message.actor_id,
  });
}

async function persistOwnerMailboxAttachments(
  db: ReturnType<typeof createServerSupabaseClient>,
  resend: ReturnType<typeof getResendClient>,
  input: {
    providerEmailId: string;
    messageId: string;
    mailboxId: string;
    organizationId: string | null;
  },
) {
  const result = await resend.emails.receiving.attachments.list({
    emailId: input.providerEmailId,
    limit: 20,
  });
  if (result.error || !result.data)
    throw new Error(result.error?.message || "Inbound attachments could not be retrieved.");
  const attachments = result.data.data.slice(0, 12);
  let downloadedBytes = 0;

  for (const attachment of attachments) {
    const filename = (attachment.filename || `attachment-${attachment.id}`)
      .replace(/[\\/]/g, "-")
      .slice(0, 255);
    const contentType = attachment.content_type
      .split(";", 1)[0]
      .trim()
      .toLowerCase() || "application/octet-stream";
    const disposition = attachment.content_disposition === "inline" ? "inline" : "attachment";
    const inserted = await db
      .from("crm_email_attachments")
      .insert({
        message_id: input.messageId,
        mailbox_id: input.mailboxId,
        organization_id: input.organizationId,
        provider_attachment_id: attachment.id,
        filename,
        content_type: contentType,
        content_disposition: disposition,
        content_id: attachment.content_id || null,
        byte_size: attachment.size,
      })
      .select("id")
      .single();
    if (inserted.error) {
      if (inserted.error.code === "23505") continue;
      throw inserted.error;
    }
    const attachmentId = inserted.data.id as string;
    if (
      attachment.size <= 0 ||
      attachment.size > MAX_MAIL_ATTACHMENT_SIZE ||
      downloadedBytes + attachment.size > 40 * 1024 * 1024
    ) {
      await db
        .from("crm_email_attachments")
        .update({
          scan_status: "failed",
          error_message: "The attachment exceeds the safe inbox download limit.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentId);
      continue;
    }
    const response = await fetch(attachment.download_url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Attachment download returned HTTP ${response.status}.`);
    const buffer = Buffer.from(await response.arrayBuffer());
    downloadedBytes += buffer.length;
    if (!buffer.length || buffer.length > MAX_MAIL_ATTACHMENT_SIZE)
      throw new Error("Downloaded attachment size is outside the supported range.");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const scan = await scanFileForMalware({ buffer, filename, mimeType: contentType });
    if (scan.status === "infected") {
      await db
        .from("crm_email_attachments")
        .update({
          sha256,
          scan_status: "infected",
          error_message: "Malware scanning blocked this attachment.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentId);
      continue;
    }

    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180) || "attachment";
    const readiness = scan.status === "clean" ? "ready" : "quarantine";
    const storagePath = `${input.mailboxId}/${readiness}/${input.messageId}/${randomUUID()}-${safeName}`;
    const upload = await db.storage
      .from("costivra-mail-attachments")
      .upload(storagePath, buffer, { contentType, upsert: false });
    if (upload.error) throw upload.error;
    await db
      .from("crm_email_attachments")
      .update({
        sha256,
        scan_status: scan.status,
        storage_path: storagePath,
        error_message: scan.status === "clean"
          ? null
          : scan.detail || "The attachment is waiting for malware scanning.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attachmentId);
  }
  const { data: stored, error: storedError } = await db
    .from("crm_email_attachments")
    .select("id,filename,content_type,byte_size,scan_status,content_disposition")
    .eq("message_id", input.messageId)
    .order("created_at", { ascending: true });
  if (storedError) throw storedError;
  return (stored ?? []).map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename,
    contentType: attachment.content_type,
    size: attachment.byte_size,
    status: attachment.scan_status,
    disposition: attachment.content_disposition,
  }));
}

async function persistOwnerMailboxMessage(
  db: ReturnType<typeof createServerSupabaseClient>,
  resend: ReturnType<typeof getResendClient>,
  received: EmailReceivedEvent,
  recipientAddresses: string[],
  mailbox: { id: string; address: string; assigned_to: string | null },
) {
  const senderAddress = normalizeEmailAddress(received.data.from);
  const { data: existing } = await db
    .from("crm_email_messages")
    .select("id,organization_id")
    .eq("provider_message_id", received.data.email_id)
    .maybeSingle();
  if (existing) {
    const attachments = await persistOwnerMailboxAttachments(db, resend, {
      providerEmailId: received.data.email_id,
      messageId: existing.id,
      mailboxId: mailbox.id,
      organizationId: existing.organization_id,
    });
    await db.from("crm_email_messages").update({ attachments }).eq("id", existing.id);
    return { duplicate: true };
  }

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
      .eq("mailbox_id", mailbox.id)
      .maybeSingle();
    threadId = repliedMessage?.thread_id ?? null;
  }
  if (!threadId && organizationId) {
    const { data: relatedThread } = await db
      .from("crm_email_threads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("mailbox_id", mailbox.id)
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
        mailbox_id: mailbox.id,
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
        mailbox_id: mailbox.id,
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
  if (!threadId) throw new Error("Inbound email thread could not be resolved.");

  const { data: message, error: messageError } = await db.from("crm_email_messages").insert({
    thread_id: threadId,
    organization_id: organizationId,
    mailbox_id: mailbox.id,
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
    attachments: [],
    received_at: now,
  }).select("id").single();
  if (messageError) throw messageError;
  const attachmentMetadata = await persistOwnerMailboxAttachments(db, resend, {
    providerEmailId: received.data.email_id,
    messageId: message.id,
    mailboxId: mailbox.id,
    organizationId,
  });
  if (attachmentMetadata.length) {
    const { error: attachmentUpdateError } = await db
      .from("crm_email_messages")
      .update({ attachments: attachmentMetadata })
      .eq("id", message.id);
    if (attachmentUpdateError) throw attachmentUpdateError;
  }
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
    safe_metadata: {
      linked_to_account: Boolean(organizationId),
      mailbox: mailbox.address,
    },
  });
  await insertInternalMailNotification(db, {
    kind: "email_received",
    title: "New email",
    body: `${senderAddress} sent “${subject}”.`,
    resourceId: threadId,
    actionHref: `/manage/mail/${threadId}?mailbox=${mailbox.id}`,
    organizationId,
    providerEventId: `received:${received.data.email_id}`,
    preferredUserId: mailbox.assigned_to,
  });
  return { duplicate: false, threadId };
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
    const { data: mailboxCandidates, error: mailboxError } = await db
      .from("crm_mailboxes")
      .select("id,address,assigned_to")
      .in("address", recipientAddresses)
      .eq("status", "active")
      .eq("can_receive", true)
      .limit(2);
    if (mailboxError) throw mailboxError;
    const mailbox = mailboxCandidates?.find((candidate) =>
      recipientAddresses.includes(normalizeEmailAddress(candidate.address)),
    );
    if (!mailbox)
      return NextResponse.json({ received: true });
    const result = await persistOwnerMailboxMessage(
      db,
      resend,
      received,
      recipientAddresses,
      mailbox,
    );
    await db.from("crm_email_events").upsert(
      {
        provider_event_id: providerEventId,
        provider_message_id: received.data.email_id,
        event_type: event.type,
        occurred_at: event.created_at,
        safe_metadata: { mailbox: mailbox.address },
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
    await notifyOrganizationOwners(
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

  const queuedAt = new Date().toISOString();
  const { error: queueError } = await db
    .from("inbound_email_events")
    .update({
      status: "queued",
      next_attempt_at: queuedAt,
      error_message: null,
      updated_at: queuedAt,
    })
    .eq("id", eventId);
  if (queueError) throw queueError;
  await db.from("audit_events").insert({
    organization_id: intake.organization_id,
    actor_type: "service",
    action: "inbound_email.queued",
    resource_type: "inbound_email_event",
    resource_id: eventId,
  });
  return NextResponse.json({ received: true, status: "queued" }, { status: 202 });
}
