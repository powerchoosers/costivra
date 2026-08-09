import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { appendEmailSignatureHtml } from "@/lib/manage/email-signature";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { requireMailbox } from "@/lib/manage/mailbox-access";
import { sendOutboundEmail } from "@/lib/manage/outbound-email";
import {
  emailHtmlToText,
  isValidEmail,
  normalizeSubject,
  parseAddressList,
  safeSnippet,
  sanitizeEmailHtml,
} from "@/lib/manage/mail";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function field(form: FormData, name: string, max = 20_000) {
  return cleanText(form.get(name), max);
}

async function resolveContact(
  db: Awaited<ReturnType<typeof requireInternalOperator>>["db"],
  organizationId: string | null | undefined,
  recipient: string,
) {
  if (!recipient) return null;
  const target = recipient.trim();
  if (!target) return null;

  let query = db
    .from("crm_contacts")
    .select("id,full_name,email,organization_id");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data: byEmail } = await query
    .ilike("email", target)
    .limit(1)
    .maybeSingle();
  if (byEmail) return byEmail;

  let nameQuery = db
    .from("crm_contacts")
    .select("id,full_name,email,organization_id");
  if (organizationId) nameQuery = nameQuery.eq("organization_id", organizationId);
  const { data: byName } = await nameQuery
    .ilike("full_name", target)
    .limit(1)
    .maybeSingle();
  return byName;
}

async function resolveOrganizationId(
  db: Awaited<ReturnType<typeof requireInternalOperator>>["db"],
  recipient: string,
): Promise<string | null> {
  if (!recipient) return null;
  const target = recipient.trim();
  if (!target) return null;

  const { data: byEmail } = await db
    .from("crm_contacts")
    .select("organization_id")
    .ilike("email", target)
    .limit(1)
    .maybeSingle();
  if (byEmail?.organization_id) return cleanUuid(byEmail.organization_id) || null;

  const { data: byName } = await db
    .from("crm_contacts")
    .select("organization_id")
    .ilike("full_name", target)
    .limit(1)
    .maybeSingle();
  return cleanUuid(byName?.organization_id) || null;
}

function conflictFor(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "EMAIL_IDEMPOTENCY_CONTENT_MISMATCH") {
    return "This send request was reused with different content. Close the composer and try again.";
  }
  if (error.message === "EMAIL_SEND_ALREADY_PROCESSING") {
    return "This email send is already being processed.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const operator = await requireInternalOperator();
    const { db, userId } = operator;
    const form = await request.formData();
    const mode = field(form, "mode", 20) || "send";
    let organizationId: string | null = cleanUuid(form.get("organizationId")) || null;
    const mailboxId = cleanUuid(form.get("mailboxId"));
    const threadId = cleanUuid(form.get("threadId")) || null;
    const subject = field(form, "subject", 500) || "(no subject)";
    const htmlBody = sanitizeEmailHtml(field(form, "htmlBody", 200_000));
    const body = field(form, "body", 100_000) || emailHtmlToText(htmlBody);
    const rawTo = parseAddressList(field(form, "to", 2_000));
    const rawCc = parseAddressList(field(form, "cc", 2_000));
    const rawBcc = parseAddressList(field(form, "bcc", 2_000));
    const scheduledAtValue = field(form, "scheduledAt", 50) || null;
    const scheduledAt = scheduledAtValue ? new Date(scheduledAtValue) : null;

    if (!organizationId && rawTo[0]) {
      organizationId = await resolveOrganizationId(db, rawTo[0]);
    }

    const resolveAddressList = async (list: string[]) => Promise.all(
      list.map(async (item) => {
        if (isValidEmail(item)) return item;
        const matched = await resolveContact(db, organizationId, item);
        return matched?.email ? matched.email : item;
      }),
    );
    const to = await resolveAddressList(rawTo);
    const cc = await resolveAddressList(rawCc);
    const bcc = await resolveAddressList(rawBcc);

    if (!organizationId && to[0]) organizationId = await resolveOrganizationId(db, to[0]);
    if (!organizationId && mode !== "draft") {
      return NextResponse.json(
        { error: "The recipient does not match a client contact yet. Add that email to the correct CRM account before sending." },
        { status: 400 },
      );
    }
    if (!mailboxId) {
      return NextResponse.json({ error: "Choose an active Costivra mailbox before sending." }, { status: 400 });
    }
    const mailbox = await requireMailbox(operator, mailboxId, "send");
    if (threadId) {
      const { data: linkedThread } = await db
        .from("crm_email_threads")
        .select("id,mailbox_id")
        .eq("id", threadId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (!linkedThread) {
        return NextResponse.json({ error: "That conversation is not linked to the selected client account." }, { status: 409 });
      }
      if (linkedThread.mailbox_id && linkedThread.mailbox_id !== mailbox.id) {
        return NextResponse.json({ error: "Replies must use the mailbox that owns the conversation." }, { status: 409 });
      }
    }
    if (mode !== "draft" && (!to.length || !body)) {
      return NextResponse.json({ error: "Add a recipient and message before sending." }, { status: 400 });
    }
    if (mode !== "draft" && [...to, ...cc, ...bcc].some((email) => !isValidEmail(email))) {
      return NextResponse.json({ error: "One or more recipient addresses are invalid." }, { status: 400 });
    }
    if (scheduledAt && (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60_000 || scheduledAt.getTime() > Date.now() + 30 * 86_400_000)) {
      return NextResponse.json({ error: "Scheduled sends must be between one minute and 30 days from now." }, { status: 400 });
    }

    const files = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > 5 || files.some((file) => file.size > MAX_ATTACHMENT_SIZE) || files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: "Attach up to five files, no more than 10 MB each and 20 MB total." }, { status: 413 });
    }
    if (mode === "draft" && files.length) {
      return NextResponse.json({ error: "Attachments are added when you send. Save the text draft first, then attach files before sending." }, { status: 400 });
    }

    const contact = to[0] ? await resolveContact(db, organizationId, to[0]) : null;
    const { data: signatureProfile, error: signatureError } = await db
      .from("profiles")
      .select("full_name,job_title,phone,linkedin_url,avatar_path")
      .eq("id", userId)
      .maybeSingle();
    if (signatureError) throw signatureError;

    let signatureAttachment: {
      filename: string;
      content: Buffer;
      contentType: string;
      size: number;
      contentId: string;
      digest: string;
    } | null = null;
    const avatarPath = typeof signatureProfile?.avatar_path === "string" ? signatureProfile.avatar_path : null;
    if (mode !== "draft" && avatarPath) {
      const { data: avatar, error: avatarError } = await db.storage.from("costivra-avatars").download(avatarPath);
      if (!avatarError && avatar) {
        const extension = avatarPath.split(".").pop()?.toLowerCase();
        const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
        const content = Buffer.from(await avatar.arrayBuffer());
        signatureAttachment = {
          filename: `costivra-profile.${extension === "png" || extension === "webp" ? extension : "jpg"}`,
          content,
          contentType,
          size: content.length,
          contentId: "costivra-profile-avatar",
          digest: createHash("sha256").update(content).digest("hex"),
        };
      }
    }
    const outboundHtml = mode === "draft"
      ? htmlBody
      : appendEmailSignatureHtml(htmlBody, {
          fullName: typeof signatureProfile?.full_name === "string" ? signatureProfile.full_name : operator.userId,
          jobTitle: typeof signatureProfile?.job_title === "string" ? signatureProfile.job_title : null,
          phone: typeof signatureProfile?.phone === "string" ? signatureProfile.phone : null,
          linkedinUrl: typeof signatureProfile?.linkedin_url === "string" ? signatureProfile.linkedin_url : null,
          avatarCid: signatureAttachment?.contentId ?? null,
        });
    const outboundText = mode === "draft" ? body : emailHtmlToText(outboundHtml);
    const attachmentData = await Promise.all(files.map(async (file) => {
      const content = Buffer.from(await file.arrayBuffer());
      return {
        filename: file.name.replace(/[\\/]/g, "-").slice(0, 255) || "attachment",
        contentType: file.type || "application/octet-stream",
        size: content.length,
        digest: createHash("sha256").update(content).digest("hex"),
        content,
      };
    }));

    if (mode === "draft") {
      let resolvedThreadId = threadId;
      if (!resolvedThreadId) {
        const { data: thread, error } = await db
          .from("crm_email_threads")
          .insert({
            organization_id: organizationId,
            mailbox_id: mailbox.id,
            contact_id: contact?.id ?? null,
            subject,
            normalized_subject: normalizeSubject(subject),
            participants: Array.from(new Set([mailbox.sender, ...to, ...cc])),
            snippet: safeSnippet(body),
          })
          .select("id")
          .single();
        if (error) throw error;
        resolvedThreadId = thread.id;
      }
      const { data: existingDraft } = await db
        .from("crm_email_messages")
        .select("id")
        .eq("thread_id", resolvedThreadId)
        .eq("folder", "draft")
        .limit(1)
        .maybeSingle();
      const draftRecord = {
        thread_id: resolvedThreadId,
        organization_id: organizationId,
        mailbox_id: mailbox.id,
        contact_id: contact?.id ?? null,
        actor_id: userId,
        direction: "outbound",
        folder: "draft",
        from_address: mailbox.sender,
        to_addresses: to,
        cc_addresses: cc,
        bcc_addresses: bcc,
        subject,
        text_body: body || null,
        html_body: htmlBody || null,
        provider_status: "draft",
        updated_at: new Date().toISOString(),
      };
      const result = existingDraft
        ? await db.from("crm_email_messages").update(draftRecord).eq("id", existingDraft.id)
        : await db.from("crm_email_messages").insert(draftRecord);
      if (result.error) throw result.error;
      await db.from("crm_email_threads").update({
        mailbox_id: mailbox.id,
        subject,
        normalized_subject: normalizeSubject(subject),
        participants: Array.from(new Set([mailbox.sender, ...to, ...cc])),
        snippet: safeSnippet(body),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedThreadId);
      await db.from("internal_audit_events").insert({
        actor_id: userId,
        organization_id: organizationId,
        action: "crm.email_draft_saved",
        resource_type: "crm_email_thread",
        resource_id: resolvedThreadId,
      });
      return NextResponse.json({ ok: true, threadId: resolvedThreadId });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "The recipient does not match a client contact yet. Add that email to the correct CRM account before sending." }, { status: 400 });
    }
    const idempotencyKey = field(form, "idempotencyKey", 256) || randomUUID();
    const result = await sendOutboundEmail({
      db,
      organizationId,
      actorId: userId,
      mailbox,
      contactId: contact?.id ?? null,
      threadId,
      to,
      cc,
      bcc,
      subject,
      textBody: outboundText,
      htmlBody: outboundHtml,
      previewText: body,
      scheduledAt,
      attachments: [...attachmentData, ...(signatureAttachment ? [signatureAttachment] : [])],
      idempotencyKey,
      origin: "manual",
    });
    return NextResponse.json({
      ok: true,
      threadId: result.threadId,
      providerId: result.providerId,
      scheduled: result.scheduled,
      duplicate: result.duplicate,
    });
  } catch (error) {
    const conflict = conflictFor(error);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
    const result = manageApiError(error);
    return NextResponse.json({ error: result.status === 500 && error instanceof Error ? error.message : result.error }, { status: result.status });
  }
}
