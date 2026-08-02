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

const allowedEmailTags = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
  "font", "hr", "i", "li", "ol", "p", "pre", "s", "span", "strike", "strong", "u", "ul",
]);

export function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link)\b[^>]*\/?\s*>/gi, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedEmailTags.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;
      if (tag === "font") {
        const colorMatch = rawAttributes.match(/color\s*=\s*["']?(#[0-9a-f]{3,6})["']?/i);
        return colorMatch ? `<font color="${colorMatch[1]}">` : "<font>";
      }
      if (tag !== "a") {
        const safeStyles: string[] = [];
        const styleMatch = rawAttributes.match(/style\s*=\s*["']([^"']+)["']/i);
        for (const declaration of styleMatch?.[1]?.split(";") ?? []) {
          const [rawProperty, rawValue] = declaration.split(":");
          const property = rawProperty?.trim().toLowerCase();
          const cssValue = rawValue?.trim().toLowerCase();
          if (property === "text-align" && /^(left|center|right|justify)$/.test(cssValue)) {
            safeStyles.push(`text-align:${cssValue}`);
          }
          if (property === "margin-left" && /^(?:[0-9]|[1-5][0-9]|60)(?:px)?$/.test(cssValue)) {
            safeStyles.push(`margin-left:${cssValue}`);
          }
        }
        const alignMatch = rawAttributes.match(/align\s*=\s*["']?(left|center|right|justify)["']?/i);
        if (alignMatch && !safeStyles.some((style) => style.startsWith("text-align:"))) {
          safeStyles.push(`text-align:${alignMatch[1].toLowerCase()}`);
        }
        return safeStyles.length ? `<${tag} style="${safeStyles.join(";")}">` : `<${tag}>`;
      }
      const hrefMatch = rawAttributes.match(/href\s*=\s*["']([^"']+)["']/i);
      const href = hrefMatch?.[1]?.trim() ?? "";
      if (!/^(https?:|mailto:)/i.test(href)) return "<a>";
      const safeHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
    })
    .trim();
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
