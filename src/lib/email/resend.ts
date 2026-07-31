import "server-only";

import { createHash } from "node:crypto";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

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

export function emailRequestHash(email: Pick<TransactionalEmail, "to" | "subject" | "text">) {
  return createHash("sha256")
    .update(JSON.stringify({ to: email.to.toLowerCase(), subject: email.subject, text: email.text }))
    .digest("hex");
}

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "EMAIL_PROVIDER_NOT_CONFIGURED" };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from: "Costivra <hello@costivra.ai>",
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        reply_to: email.replyTo,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string };
    if (!response.ok || !payload.id) return { ok: false, error: `EMAIL_PROVIDER_${response.status}` };
    return { ok: true, providerId: payload.id };
  } catch {
    return { ok: false, error: "EMAIL_PROVIDER_UNAVAILABLE" };
  }
}

