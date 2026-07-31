import { createHash } from "node:crypto";

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
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  scheduledAt?: string | null;
  attachmentDigests?: string[];
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        organizationId: input.organizationId,
        to: input.to.map(normalizeEmailAddress).sort(),
        cc: input.cc.map(normalizeEmailAddress).sort(),
        subject: input.subject.trim(),
        text: input.text,
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
