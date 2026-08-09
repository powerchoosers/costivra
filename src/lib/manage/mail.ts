import { createHash } from "node:crypto";
export { sanitizeEmailHtml } from "./sanitize-email-html";

export function normalizeEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function normalizeSubject(value: string) {
  return value
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

export function mailRequestHash(input: {
  organizationId: string;
  mailboxId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html?: string;
  scheduledAt?: string | null;
  attachmentDigests?: string[];
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        organizationId: input.organizationId,
        mailboxId: input.mailboxId,
        to: input.to.map(normalizeEmailAddress).sort(),
        cc: input.cc.map(normalizeEmailAddress).sort(),
        bcc: input.bcc.map(normalizeEmailAddress).sort(),
        subject: input.subject.trim(),
        text: input.text,
        html: input.html ?? null,
        scheduledAt: input.scheduledAt ?? null,
        attachmentDigests: [...(input.attachmentDigests ?? [])].sort(),
      }),
    )
    .digest("hex");
}

export function parseAddressList(value: string) {
  return Array.from(
    new Set(value.split(/[;,]/).map(normalizeEmailAddress).filter(Boolean)),
  );
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailAddress(value));
}

export function safeSnippet(value: string | null | undefined, length = 160) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, length);
}

export function emailHtmlToText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-3]|li|blockquote|pre)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function deliveryFailureLedgerUpdate(
  providerId: string | null,
  errorMessage: string,
  now: string,
) {
  return {
    status: providerId ? "sent" : "failed",
    provider_reference: providerId,
    completed_at: providerId ? now : null,
    last_error: providerId
      ? `Provider accepted the email; local mailbox persistence needs reconciliation. ${errorMessage.slice(0, 700)}`
      : errorMessage.slice(0, 1_000),
    retry_count: 1,
    updated_at: now,
  };
}
