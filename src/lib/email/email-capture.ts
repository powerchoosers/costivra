import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { EmailDeliveryResult, TransactionalEmail } from "./resend";

export type EmailDeliveryMode = "provider" | "capture" | "disabled";

export interface CapturedEmailRecord {
  id: string;
  to: string;
  from: string;
  subject: string;
  textExcerpt: string;
  htmlLength: number;
  idempotencyKey: string;
  capturedAt: string;
  runId?: string;
}

const TEST_DOMAIN_SUFFIXES = [".invalid", ".test", ".example", ".localhost"];
const TEST_DOMAIN_EXACT = ["example.com", "example.org", "example.net", "costivra.invalid"];

export function getEmailDeliveryMode(): EmailDeliveryMode {
  const envMode = process.env.COSTIVRA_EMAIL_DELIVERY_MODE?.trim().toLowerCase();
  if (envMode === "capture") return "capture";
  if (envMode === "disabled") return "disabled";
  return "provider";
}

export function isTestOrReservedDomain(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return true;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain) return true;

  if (TEST_DOMAIN_EXACT.includes(domain)) return true;
  if (TEST_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix))) return true;

  return false;
}

export async function appendCapturedEmail(
  record: CapturedEmailRecord,
  runId?: string,
): Promise<void> {
  const dir = resolve(process.cwd(), "artifacts/email-capture");
  await mkdir(dir, { recursive: true });

  const line = JSON.stringify(record) + "\n";
  const mainFile = resolve(dir, "captured-emails.jsonl");
  await appendFile(mainFile, line, "utf8");

  if (runId && runId.trim()) {
    const runFile = resolve(dir, `${runId.trim()}.jsonl`);
    await appendFile(runFile, line, "utf8");
  }
}

export async function captureTransactionalEmail(
  email: TransactionalEmail,
  fromAddress?: string,
): Promise<EmailDeliveryResult> {
  const syntheticId = `mock-msg-${randomUUID()}`;
  const runId = process.env.COSTIVRA_CAPTURE_RUN_ID?.trim();
  const capturedAt = new Date().toISOString();

  const record: CapturedEmailRecord = {
    id: syntheticId,
    to: email.to.trim().toLowerCase(),
    from: fromAddress || process.env.RESEND_FROM_EMAIL || "Costivra <hello@costivra.ai>",
    subject: email.subject,
    textExcerpt: email.text.slice(0, 300),
    htmlLength: email.html.length,
    idempotencyKey: email.idempotencyKey,
    capturedAt,
    runId: runId || undefined,
  };

  try {
    await appendCapturedEmail(record, runId);
  } catch {
    // If local filesystem append fails, still allow tests/in-memory flow to receive synthetic ID
  }

  return {
    ok: true,
    providerId: syntheticId,
  };
}
