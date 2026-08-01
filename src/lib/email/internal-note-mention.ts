import "server-only";

import { brandedEmailHtml, escapeEmailHtml } from "@/lib/email/brand";
import { emailRequestHash, sendTransactionalEmail } from "@/lib/email/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type NoteMention = {
  activityId: string;
  organizationId: string;
  accountName: string;
  subject: string;
  summary: string | null;
  actorName: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
};

export async function deliverInternalNoteMention(db: SupabaseClient, mention: NoteMention) {
  const href = `https://costivra.ai/manage/accounts/${mention.organizationId}`;
  const idempotencyKey = `crm-note-mention/${mention.activityId}/${mention.recipientId}`;
  const text = `${mention.actorName} mentioned you in a Costivra note for ${mention.accountName}.\n\n${mention.subject}\n${mention.summary ?? ""}\n\nOpen the account: ${href}`;
  const email = {
    to: mention.recipientEmail,
    subject: `${mention.actorName} mentioned you — ${mention.accountName}`,
    text,
    html: brandedEmailHtml({
      preview: `${mention.actorName} mentioned you in an internal Costivra note.`,
      heading: "You were mentioned in a note.",
      bodyHtml: `<p style="margin:0 0 16px">Hi ${escapeEmailHtml(mention.recipientName)},</p><p style="margin:0 0 16px"><strong style="color:#1a2434">${escapeEmailHtml(mention.actorName)}</strong> mentioned you on <strong style="color:#1a2434">${escapeEmailHtml(mention.accountName)}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border:1px solid #e4e8ee;border-radius:14px;background:#f8fafc"><tr><td style="padding:16px"><strong style="color:#1a2434">${escapeEmailHtml(mention.subject)}</strong>${mention.summary ? `<br><br>${escapeEmailHtml(mention.summary).replace(/\n/g, "<br>")}` : ""}</td></tr></table>`,
      cta: { label: "Open note in Costivra", href },
      footer: "Internal Costivra notification · Do not forward outside the authorized team.",
    }),
    idempotencyKey,
    replyTo: "hello@costivra.ai",
  };
  const requestHash = emailRequestHash(email);
  const { data: effect, error } = await db.from("external_side_effects").upsert({
    organization_id: mention.organizationId,
    type: "crm_note_mention_email",
    destination: mention.recipientEmail,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    status: "pending",
    provider: "resend",
    authorized_at: new Date().toISOString(),
    authorization_method: "internal_note_mention_v1",
    sanitized_request_metadata: { activity_id: mention.activityId, recipient_id: mention.recipientId },
    updated_at: new Date().toISOString(),
  }, { onConflict: "idempotency_key" }).select("status").maybeSingle();
  if (error || effect?.status === "sent") return effect?.status === "sent";
  const result = await sendTransactionalEmail(email);
  await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() } : { status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
  return result.ok;
}
