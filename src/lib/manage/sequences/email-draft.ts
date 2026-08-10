import { emailHtmlToText, sanitizeEmailHtml } from "@/lib/manage/mail";
import { unresolvedTemplateTokens } from "./validation";

export type SequenceEmailDraft = {
  subjectTemplate: string;
  bodyText: string;
  bodyHtml?: string;
};

const cleanSingleLine = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const cleanMultiline = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : "";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);

function htmlFromText(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Validate model output before it reaches an editable sequence step. This does
 * not persist content or authorize delivery; it only returns safe draft text.
 */
export function normalizeSequenceEmailDraft(value: unknown): SequenceEmailDraft | null {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const subjectTemplate = cleanSingleLine(record.subjectTemplate, 500);
  const providedHtml = typeof record.bodyHtml === "string"
    ? sanitizeEmailHtml(record.bodyHtml).slice(0, 20_000)
    : "";
  const bodyText = cleanMultiline(record.bodyText, 20_000) || cleanMultiline(emailHtmlToText(providedHtml), 20_000);
  const bodyHtml = providedHtml || (bodyText ? htmlFromText(bodyText) : "");

  if (!subjectTemplate || !bodyText) return null;
  const unsupportedTokens = [subjectTemplate, bodyText, bodyHtml]
    .flatMap((content) => unresolvedTemplateTokens(content));
  if (unsupportedTokens.length) return null;

  return { subjectTemplate, bodyText, ...(bodyHtml ? { bodyHtml } : {}) };
}
