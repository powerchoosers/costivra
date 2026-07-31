import "server-only";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
};

export type EmailDeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

export function emailRequestHash(
  email: Pick<TransactionalEmail, "to" | "subject" | "text">,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        to: email.to.toLowerCase(),
        subject: email.subject,
        text: email.text,
      }),
    )
    .digest("hex");
}

export function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

export function getInboundEmailDomain() {
  return (process.env.RESEND_INBOUND_DOMAIN || "costivra.ai")
    .trim()
    .toLowerCase();
}

export function isInboundEmailPlatformReady() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_WEBHOOK_SECRET &&
      process.env.RESEND_INBOUND_DOMAIN &&
      isMalwareScannerConfigured(),
  );
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  if (!process.env.RESEND_API_KEY)
    return { ok: false, error: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  try {
    const { data, error } = await getResendClient().emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL || "Costivra <hello@costivra.ai>",
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        replyTo: email.replyTo,
      },
      { idempotencyKey: email.idempotencyKey },
    );
    if (error || !data?.id)
      return { ok: false, error: "EMAIL_PROVIDER_REJECTED" };
    return { ok: true, providerId: data.id };
  } catch {
    return { ok: false, error: "EMAIL_PROVIDER_UNAVAILABLE" };
  }
}
