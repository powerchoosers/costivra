import "server-only";

import { emailRequestHash, sendTransactionalEmail, type TransactionalEmail } from "@/lib/email/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type Inquiry = { id: string; name: string; email: string; company: string; locations: string | null; message: string };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);

function receiptEmail(inquiry: Inquiry): TransactionalEmail {
  const firstName = inquiry.name.split(/\s+/)[0] || "there";
  const text = `Hi ${firstName},\n\nWe received your Costivra inquiry for ${inquiry.company}. A member of our team will review it and reply by email.\n\nDo not send bills, contracts, or account details by email. Use the secure Costivra workspace for source documents.\n\nCostivra`;
  return {
    to: inquiry.email,
    subject: "We received your Costivra inquiry",
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#152033;line-height:1.6;max-width:600px;margin:0 auto"><p>Hi ${escapeHtml(firstName)},</p><p>We received your Costivra inquiry for <strong>${escapeHtml(inquiry.company)}</strong>. A member of our team will review it and reply by email.</p><p style="color:#5f6b7e">Do not send bills, contracts, or account details by email. Use the secure Costivra workspace for source documents.</p><p>Costivra</p></div>`,
    idempotencyKey: `contact-receipt/${inquiry.id}`,
    replyTo: "hello@costivra.ai",
  };
}

function notificationEmail(inquiry: Inquiry): TransactionalEmail {
  const locations = inquiry.locations ? `\nLocations: ${inquiry.locations}` : "";
  const text = `New Costivra inquiry\n\nName: ${inquiry.name}\nCompany: ${inquiry.company}\nEmail: ${inquiry.email}${locations}\n\nMessage:\n${inquiry.message}`;
  return {
    to: process.env.CONTACT_NOTIFICATION_EMAIL || "hello@costivra.ai",
    subject: `New inquiry — ${inquiry.company}`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#152033;line-height:1.6;max-width:600px;margin:0 auto"><h1 style="font-size:22px">New Costivra inquiry</h1><p><strong>Name:</strong> ${escapeHtml(inquiry.name)}<br><strong>Company:</strong> ${escapeHtml(inquiry.company)}<br><strong>Email:</strong> ${escapeHtml(inquiry.email)}${inquiry.locations ? `<br><strong>Locations:</strong> ${escapeHtml(inquiry.locations)}` : ""}</p><p><strong>Message</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}</p></div>`,
    idempotencyKey: `contact-notification/${inquiry.id}`,
    replyTo: inquiry.email,
  };
}

export async function deliverContactInquiryEmails(db: SupabaseClient, inquiry: Inquiry) {
  for (const [kind, email] of [["receipt", receiptEmail(inquiry)], ["notification", notificationEmail(inquiry)]] as const) {
    const requestHash = emailRequestHash(email);
    const { data: existing } = await db.from("contact_email_deliveries").select("id,status").eq("idempotency_key", email.idempotencyKey).maybeSingle();
    if (existing?.status === "sent") continue;

    const { data: delivery, error } = await db.from("contact_email_deliveries").upsert({
      inquiry_id: inquiry.id, kind, destination: email.to, idempotency_key: email.idempotencyKey,
      request_hash: requestHash, status: "pending", last_error: null,
    }, { onConflict: "idempotency_key" }).select("id").single();
    if (error || !delivery) continue;

    const result = await sendTransactionalEmail(email);
    await db.from("contact_email_deliveries").update(result.ok
      ? { status: "sent", provider_message_id: result.providerId, completed_at: new Date().toISOString(), last_error: null }
      : { status: "failed", last_error: result.error }
    ).eq("id", delivery.id);
  }
}

