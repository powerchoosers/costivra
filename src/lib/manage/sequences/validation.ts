import { sanitizeEmailHtml } from "@/lib/manage/mail";
import type { Sequence, SequenceStep } from "./types";

export const TEMPLATE_TOKENS = [
  "first_name", "full_name", "company_name", "job_title", "industry", "website", "sender_name", "sender_title",
] as const;

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
  if (!sequence.businessDays.length) errors.push("Choose at least one business day.");
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

export function renderTemplate(value: string | null | undefined, variables: Record<string, string | null | undefined>) {
  if (!value) return "";
  return value.replace(tokenPattern, (_match, token: string) => variables[token.toLowerCase()] ?? "");
}
