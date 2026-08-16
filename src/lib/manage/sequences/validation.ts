import { sanitizeEmailHtml } from "@/lib/manage/sanitize-email-html";
import { isValidSequenceTimezone } from "./schedule";
import type { Sequence, SequenceStep } from "./types";

export const TEMPLATE_TOKENS = [
  "first_name", "full_name", "company_name", "job_title", "industry", "website", "sender_name", "sender_title",
] as const;

// Operators may correct contact-specific merge values for an enrollment, but
// they cannot inject arbitrary object paths or change the sender identity.
export const PERSONALIZATION_OVERRIDE_FIELDS = [
  "first_name", "full_name", "company_name", "job_title", "industry", "website",
] as const;
export type SequencePersonalization = Partial<Record<(typeof PERSONALIZATION_OVERRIDE_FIELDS)[number], string>>;

const tokenPattern = /{{\s*([a-z_][a-z0-9_.]*)\s*}}/gi;
const allowedTokens = new Set<string>(TEMPLATE_TOKENS);

export function findTemplateTokens(value: string | null | undefined) {
  const tokens: string[] = [];
  if (!value) return tokens;
  for (const match of value.matchAll(tokenPattern)) if (match[1]) tokens.push(match[1].toLowerCase());
  return [...new Set(tokens)];
}

export function unresolvedTemplateTokens(value: string | null | undefined) {
  return findTemplateTokens(value).filter((token) => !allowedTokens.has(token));
}

/**
 * Return allowlisted merge fields that are present in copy but have no value
 * in the explicit preview context. Unknown tokens are intentionally excluded;
 * activation validation reports those separately as a harder error.
 */
export function missingTemplateValues(value: string | null | undefined, variables: Record<string, string | null | undefined>) {
  return findTemplateTokens(value).filter((token) => allowedTokens.has(token) && !String(variables[token] ?? "").trim());
}

export function sanitizeSequencePersonalization(value: unknown): SequencePersonalization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: SequencePersonalization = {};
  for (const field of PERSONALIZATION_OVERRIDE_FIELDS) {
    const raw = source[field];
    if (typeof raw !== "string") continue;
    const cleaned = raw.trim().slice(0, 500);
    if (cleaned) result[field] = cleaned;
  }
  return result;
}

export function sanitizeSequencePersonalizationMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, SequencePersonalization>;
  const result: Record<string, SequencePersonalization> = {};
  for (const [contactId, overrides] of Object.entries(value as Record<string, unknown>)) {
    const sanitized = sanitizeSequencePersonalization(overrides);
    if (Object.keys(sanitized).length) result[contactId] = sanitized;
  }
  return result;
}

export function sanitizeSequenceStep(step: Partial<SequenceStep>) {
  const bodyHtml = step.bodyHtml ? sanitizeEmailHtml(step.bodyHtml).slice(0, 20_000) : null;
  const bodyText = step.bodyText?.trim().slice(0, 20_000) || null;
  const subjectTemplate = step.subjectTemplate?.trim().slice(0, 500) || null;
  const taskTitleTemplate = step.taskTitleTemplate?.trim().slice(0, 500) || null;
  const taskNotesTemplate = step.taskNotesTemplate?.trim().slice(0, 4_000) || null;
  return { ...step, bodyHtml, bodyText, subjectTemplate, taskTitleTemplate, taskNotesTemplate };
}

export function validateSequenceDraft(sequence: Pick<Sequence, "name" | "steps" | "timezone" | "businessDays" | "sendStartLocal" | "sendEndLocal" | "stopOnReply" | "stopOnBounce" | "stopOnUnsubscribe">, options: { forActivation?: boolean } = {}) {
  const errors: string[] = [];
  if (options.forActivation && !sequence.name.trim()) errors.push("A sequence name is required.");
  if (!sequence.steps.length) errors.push("Add at least one step.");
  if (!isValidSequenceTimezone(sequence.timezone)) errors.push("Choose a valid timezone.");
  if (!sequence.businessDays.length) errors.push("Choose at least one business day.");
  if (sequence.businessDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) errors.push("Business days must be Monday through Sunday.");
  if (new Set(sequence.businessDays).size !== sequence.businessDays.length) errors.push("Choose each business day only once.");
  if (!isValidLocalTime(sequence.sendStartLocal) || !isValidLocalTime(sequence.sendEndLocal)) errors.push("Choose valid send times.");
  if (sequence.sendStartLocal >= sequence.sendEndLocal) errors.push("The send window must end after it starts.");
  if (!sequence.stopOnReply || !sequence.stopOnBounce || !sequence.stopOnUnsubscribe) errors.push("Reply, bounce, and unsubscribe stops are mandatory.");
  const ordered = [...sequence.steps].sort((a, b) => a.position - b.position);
  if (ordered[0] && ordered[0].delayValue !== 0) errors.push("The first step must happen immediately.");
  let priorEmail = false;
  for (const step of ordered) {
    if (step.stepType === "automatic_email" && (!step.subjectTemplate || (!step.bodyHtml && !step.bodyText))) errors.push(`Step ${step.position} needs a subject and body.`);
    if (step.stepType === "manual_email" && (!step.subjectTemplate || (!step.bodyHtml && !step.bodyText))) errors.push(`Step ${step.position} needs a subject and body.`);
    if ((step.stepType === "call_task" || step.stepType === "general_task") && !step.taskTitleTemplate) errors.push(`Step ${step.position} needs a task title.`);
    const all = [step.subjectTemplate, step.bodyHtml, step.bodyText, step.taskTitleTemplate, step.taskNotesTemplate];
    const unknown = all.flatMap((value) => unresolvedTemplateTokens(value));
    if (unknown.length) errors.push(`Step ${step.position} has unknown template token(s): ${[...new Set(unknown)].join(", ")}.`);
    if (step.threadMode === "reply_to_previous" && !priorEmail) errors.push(`Step ${step.position} cannot reply before an email step.`);
    if (step.stepType === "manual_email" || step.stepType === "automatic_email") priorEmail = true;
  }
  return { valid: errors.length === 0, errors };
}

export function isValidLocalTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function renderTemplate(value: string | null | undefined, variables: Record<string, string | null | undefined>) {
  if (!value) return "";
  return value.replace(tokenPattern, (_match, token: string) => variables[token.toLowerCase()] ?? "");
}
