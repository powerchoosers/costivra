import { createHash } from "node:crypto";
import { Resend } from "resend";
import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";
import { isConfiguredSecret } from "@/lib/env/secrets";
import {
  captureTransactionalEmail,
  getEmailDeliveryMode,
  isTestOrReservedDomain,
} from "./email-capture";

type JsonRecord = Record<string, unknown>;

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
  email: Pick<TransactionalEmail, "to" | "subject" | "text" | "html">,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        to: email.to.toLowerCase(),
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    )
    .digest("hex");
}

export function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!isConfiguredSecret(key)) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

export function getInboundEmailDomain() {
  return (process.env.RESEND_INBOUND_DOMAIN || "costivra.ai")
    .trim()
    .toLowerCase();
}

export type ResendReadinessCheckResult = {
  ok: boolean;
  blocked: string[];
  details: {
    verifiedDomain: boolean;
    liveWebhook: boolean;
  };
};

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function messageFromResendPayload(payload: unknown) {
  const data = record(payload);
  if (!data) return null;
  if (typeof data.name === "string" && typeof data.message === "string") {
    return `${data.name}: ${data.message}`;
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return null;
}

export async function verifyInboundEmailProviderReadiness(): Promise<ResendReadinessCheckResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const domain = (process.env.RESEND_INBOUND_DOMAIN || "costivra.ai")
    .trim()
    .toLowerCase();

  if (!isConfiguredSecret(key) || !isConfiguredSecret(webhookSecret)) {
    return {
      ok: false,
      blocked: ["Missing or placeholder RESEND_API_KEY and/or RESEND_WEBHOOK_SECRET."],
      details: { verifiedDomain: false, liveWebhook: false },
    } as const;
  }

  const requestJson = async (url: string, bearer: string) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { authorization: `Bearer ${bearer}` },
        signal: AbortSignal.timeout(8_000),
        redirect: "error",
      });
      const payload = await response.json().catch(() => null);
      return {
        ok: response.ok,
        status: response.status,
        payload,
      };
    } catch {
      return { ok: false, status: 0, payload: null };
    }
  };

  const [domainsResult, webhooksResult] = await Promise.all([
    requestJson("https://api.resend.com/domains", key),
    requestJson("https://api.resend.com/webhooks", key),
  ]);

  if (!domainsResult.ok || !webhooksResult.ok) {
    const reasons = [
      !domainsResult.ok
        ? `domains endpoint blocked (HTTP ${domainsResult.status}${messageFromResendPayload(domainsResult.payload) ? `: ${messageFromResendPayload(domainsResult.payload)}` : ""})`
        : null,
      !webhooksResult.ok
        ? `webhooks endpoint blocked (HTTP ${webhooksResult.status}${messageFromResendPayload(webhooksResult.payload) ? `: ${messageFromResendPayload(webhooksResult.payload)}` : ""})`
        : null,
    ];

    return {
      ok: false,
      blocked: reasons.filter((line): line is string => typeof line === "string"),
      details: { verifiedDomain: false, liveWebhook: false },
    };
  }

  const domains = Array.isArray(domainsResult.payload?.data)
    ? domainsResult.payload.data
    : [];
  const webhooks = Array.isArray(webhooksResult.payload?.data)
    ? webhooksResult.payload.data
    : [];

  const verifiedDomain = domains.some((item: unknown) => {
    const value = record(item);
    return value?.name === domain && value.status === "verified";
  });

  const liveWebhook = webhooks.some((item: unknown) => {
    const value = record(item);
    if (value?.status !== "enabled" || typeof value.endpoint !== "string") return false;
    try {
      const endpoint = new URL(value.endpoint);
      return endpoint.protocol === "https:"
        && endpoint.hostname === "costivra.ai"
        && endpoint.pathname === "/api/webhooks/resend";
    } catch {
      return false;
    }
  });

  const notes: string[] = [];
  if (!verifiedDomain) notes.push(`Domain not verified in Resend: ${domain}`);
  if (!liveWebhook) notes.push("No enabled webhook to https://costivra.ai/api/webhooks/resend found in Resend.");

  return {
    ok: verifiedDomain && liveWebhook,
    blocked: notes,
    details: { verifiedDomain, liveWebhook },
  };
}

export function isInboundEmailPlatformReady() {
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN?.trim();
  const hasInboundDomain = inboundDomain ? isConfiguredSecret(inboundDomain) : true;
  return Boolean(
    isConfiguredSecret(process.env.RESEND_API_KEY) &&
      isConfiguredSecret(process.env.RESEND_WEBHOOK_SECRET) &&
      hasInboundDomain &&
      isMalwareScannerConfigured(),
  );
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  const mode = getEmailDeliveryMode();
  if (mode === "disabled") {
    return { ok: false, error: "EMAIL_DELIVERY_DISABLED" };
  }

  const recipient = email.to.trim().toLowerCase();
  if (isTestOrReservedDomain(recipient)) {
    if (mode !== "capture") {
      return { ok: false, error: "TEST_DOMAIN_LIVE_DELIVERY_BLOCKED" };
    }
  }

  if (mode === "capture") {
    return captureTransactionalEmail(email);
  }

  if (!isConfiguredSecret(process.env.RESEND_API_KEY)) {
    return { ok: false, error: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  }

  try {
    const { data, error } = await getResendClient().emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL || "Costivra <hello@costivra.ai>",
        to: [recipient],
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
