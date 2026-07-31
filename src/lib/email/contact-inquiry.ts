import "server-only";

import { brandedEmailHtml, escapeEmailHtml } from "@/lib/email/brand";
import { emailRequestHash, sendTransactionalEmail, type TransactionalEmail } from "@/lib/email/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type Inquiry = {
  id: string;
  organizationId: string;
  contactId: string;
  name: string;
  email: string;
  company: string;
  locations: string | null;
  message: string;
  marketingConsent: boolean;
};

function receiptEmail(inquiry: Inquiry): TransactionalEmail {
  const firstName = inquiry.name.split(/\s+/)[0] || "there";
  const marketingLine = inquiry.marketingConsent
    ? "\n\nYou also opted in to occasional Costivra product and marketing updates."
    : "";
  const text = `Hi ${firstName},\n\nWe received your Costivra inquiry for ${inquiry.company}. A member of our team will review it and reply by email.${marketingLine}\n\nDo not send bills, contracts, or account details by email. Use the secure Costivra workspace for source documents.\n\nCostivra`;
  return {
    to: inquiry.email,
    subject: "We received your Costivra inquiry",
    text,
    html: brandedEmailHtml({
      preview: "Your Costivra inquiry is safely in our review queue.",
      heading: "We received your inquiry.",
      bodyHtml: `<p style="margin:0 0 16px">Hi ${escapeEmailHtml(firstName)},</p><p style="margin:0 0 16px">Your inquiry for <strong style="color:#1a2434">${escapeEmailHtml(inquiry.company)}</strong> is now in our review queue. A member of our team will review what you shared and reply by email with a practical next step.</p>${inquiry.marketingConsent ? '<p style="margin:0 0 16px;color:#526276">You also opted in to occasional Costivra product and marketing updates. You can unsubscribe at any time.</p>' : ""}<p style="margin:0;color:#6c7788;font-size:14px">For your security, do not reply with bills, contracts, or account details. Use the private Costivra workspace for source documents.</p>`,
      cta: { label: "Visit Costivra", href: "https://costivra.ai" },
      footer: "This confirmation was sent because you submitted the Costivra contact form.",
    }),
    idempotencyKey: `contact-receipt/${inquiry.id}`,
    replyTo: "hello@costivra.ai",
  };
}

function notificationEmail(inquiry: Inquiry): TransactionalEmail {
  const locations = inquiry.locations ? `\nLocations: ${inquiry.locations}` : "";
  const text = `New Costivra inquiry\n\nName: ${inquiry.name}\nCompany: ${inquiry.company}\nEmail: ${inquiry.email}${locations}\n\nMessage:\n${inquiry.message}`;
  const ownerDestination =
    process.env.CONTACT_NOTIFICATION_EMAIL ||
    process.env.COSTIVRA_INTERNAL_ADMIN_EMAILS?.split(",")[0]?.trim() ||
    "l.patterson@costivra.ai";
  return {
    to: ownerDestination,
    subject: `New inquiry — ${inquiry.company}`,
    text,
    html: brandedEmailHtml({
      preview: `New website inquiry from ${inquiry.company}.`,
      heading: "A new lead is ready for review.",
      bodyHtml: `<p style="margin:0 0 18px"><strong style="color:#1a2434">${escapeEmailHtml(inquiry.name)}</strong> at <strong style="color:#1a2434">${escapeEmailHtml(inquiry.company)}</strong> submitted a website inquiry.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border-collapse:separate;border:1px solid #e4e8ee;border-radius:14px;background:#f8fafc"><tr><td style="padding:16px"><strong style="color:#1a2434">Email</strong><br>${escapeEmailHtml(inquiry.email)}${inquiry.locations ? `<br><br><strong style="color:#1a2434">Locations</strong><br>${escapeEmailHtml(inquiry.locations)}` : ""}<br><br><strong style="color:#1a2434">Marketing email</strong><br>${inquiry.marketingConsent ? "Opted in" : "Not opted in"}</td></tr></table><p style="margin:0"><strong style="color:#1a2434">Inquiry</strong><br>${escapeEmailHtml(inquiry.message).replace(/\n/g, "<br>")}</p>`,
      cta: {
        label: "Open lead in Costivra",
        href: `https://costivra.ai/manage/accounts?account=${inquiry.organizationId}`,
      },
      footer: "Internal Costivra notification · Do not forward outside the authorized team.",
    }),
    idempotencyKey: `contact-notification/${inquiry.id}`,
    replyTo: inquiry.email,
  };
}

export async function deliverContactInquiryEmails(db: SupabaseClient, inquiry: Inquiry) {
  const outcomes = { receipt: false, notification: false };
  for (const [kind, email] of [["receipt", receiptEmail(inquiry)], ["notification", notificationEmail(inquiry)]] as const) {
    const requestHash = emailRequestHash(email);
    const { data: existing } = await db.from("contact_email_deliveries").select("id,status").eq("idempotency_key", email.idempotencyKey).maybeSingle();
    if (existing?.status === "sent") {
      outcomes[kind] = true;
      continue;
    }

    const { data: delivery, error } = await db.from("contact_email_deliveries").upsert({
      inquiry_id: inquiry.id, kind, destination: email.to, idempotency_key: email.idempotencyKey,
      request_hash: requestHash, status: "pending", last_error: null,
    }, { onConflict: "idempotency_key" }).select("id").single();
    if (error || !delivery) continue;

    const { error: sideEffectError } = await db.from("external_side_effects").upsert({
      organization_id: inquiry.organizationId,
      type: kind === "receipt" ? "contact_receipt_email" : "contact_notification_email",
      destination: email.to,
      idempotency_key: email.idempotencyKey,
      request_hash: requestHash,
      status: "approved",
      provider: "resend",
      authorized_at: new Date().toISOString(),
      authorization_method: "public_inquiry_transactional_policy_v1",
      sanitized_request_metadata: {
        inquiryId: inquiry.id,
        kind,
        subject: email.subject,
      },
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "idempotency_key" });
    if (sideEffectError) {
      await db.from("contact_email_deliveries").update({
        status: "failed",
        last_error: "SIDE_EFFECT_LEDGER_FAILED",
      }).eq("id", delivery.id);
      continue;
    }

    const result = await sendTransactionalEmail(email);
    await db.from("contact_email_deliveries").update(result.ok
      ? { status: "sent", provider_message_id: result.providerId, completed_at: new Date().toISOString(), last_error: null }
      : { status: "failed", last_error: result.error }
    ).eq("id", delivery.id);
    await db.from("external_side_effects").update(result.ok
      ? {
          status: "sent",
          provider_reference: result.providerId,
          completed_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: "failed",
          last_error: result.error,
          updated_at: new Date().toISOString(),
        }
    ).eq("idempotency_key", email.idempotencyKey);
    outcomes[kind] = result.ok;
  }
  return outcomes;
}
