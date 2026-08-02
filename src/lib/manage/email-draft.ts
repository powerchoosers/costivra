import { emailHtmlToText, sanitizeEmailHtml } from "@/lib/manage/mail";

export type EmailDraftContext = {
  recipient: { fullName: string; email: string; title?: string | null } | null;
  account: { name: string; industry?: string | null; stage?: string | null; nextStep?: string | null; notes?: string | null } | null;
  vendors: Array<{ name: string; category?: string | null; website?: string | null; relationshipStatus?: string | null; spendCadence?: string | null; annualizedSpend?: string | null; supportChannels?: string | null }>;
  activities: Array<{ subject: string; summary?: string | null; occurredAt: string }>;
  conversations: Array<{ subject: string; direction: string; excerpt?: string | null; occurredAt: string }>;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);

export function firstName(value: string | null | undefined) {
  return clean(value, 120).split(/\s+/)[0] || "";
}

export function buildEmailDraftContext(input: EmailDraftContext) {
  return {
    recipient: input.recipient && {
      name: clean(input.recipient.fullName, 120),
      email: clean(input.recipient.email, 160),
      title: clean(input.recipient.title, 120) || undefined,
    },
    account: input.account && {
      name: clean(input.account.name, 160),
      industry: clean(input.account.industry, 120) || undefined,
      stage: clean(input.account.stage, 60) || undefined,
      nextStep: clean(input.account.nextStep, 300) || undefined,
      notes: clean(input.account.notes, 900) || undefined,
    },
    vendors: input.vendors.slice(0, 12).map((vendor) => ({
      name: clean(vendor.name, 160),
      category: clean(vendor.category, 100) || undefined,
      website: clean(vendor.website, 240) || undefined,
      relationshipStatus: clean(vendor.relationshipStatus, 80) || undefined,
      spendCadence: clean(vendor.spendCadence, 80) || undefined,
      annualizedSpend: clean(vendor.annualizedSpend, 80) || undefined,
      supportChannels: clean(vendor.supportChannels, 500) || undefined,
    })).filter((vendor) => vendor.name),
    activities: input.activities.slice(0, 12).map((activity) => ({
      subject: clean(activity.subject, 220),
      summary: clean(activity.summary, 500) || undefined,
      occurredAt: clean(activity.occurredAt, 40),
    })).filter((activity) => activity.subject),
    conversations: input.conversations.slice(0, 12).map((conversation) => ({
      subject: clean(conversation.subject, 220),
      direction: clean(conversation.direction, 40),
      excerpt: clean(conversation.excerpt, 650) || undefined,
      occurredAt: clean(conversation.occurredAt, 40),
    })).filter((conversation) => conversation.subject || conversation.excerpt),
  };
}

export function normalizeEmailDraft(
  value: unknown,
  framing?: { recipientFirstName?: string | null; senderFirstName?: string | null },
) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  let html = typeof record.bodyHtml === "string" ? sanitizeEmailHtml(record.bodyHtml).slice(0, 20_000) : "";
  const subject = clean(record.subject, 500);
  if (!html) return null;
  if (framing) {
    const recipient = firstName(framing.recipientFirstName) || "[First name]";
    const sender = firstName(framing.senderFirstName) || "Costivra";
    let lines = emailHtmlToText(html).split("\n").map((line) => line.trim()).filter(Boolean);
    const firstLine = lines[0]?.toLowerCase() ?? "";
    const recipientKey = recipient.toLowerCase();
    const hasGreeting = [recipientKey, `hi ${recipientKey}`, `hello ${recipientKey}`, `hey ${recipientKey}`]
      .some((greeting) => firstLine === greeting || firstLine.startsWith(`${greeting},`) || firstLine.startsWith(`${greeting}!`));
    if (!hasGreeting) html = `<p>Hi ${escapeHtml(recipient)},</p>${html}`;

    lines = emailHtmlToText(html).split("\n").map((line) => line.trim()).filter(Boolean);
    const lastLine = lines.at(-1)?.replace(/[.!]+$/, "").trim().toLowerCase() ?? "";
    const signOffLine = lines.at(-2) ?? "";
    const hasSignOff = lastLine === sender.toLowerCase() && signOffLine.length > 0 && signOffLine.length <= 48;
    if (!hasSignOff) html = `${html}<p>Best,<br>${escapeHtml(sender)}</p>`;
    html = sanitizeEmailHtml(html).slice(0, 20_000);
  }
  return { bodyHtml: html, subject };
}
