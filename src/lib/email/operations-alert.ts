import type { SupabaseClient } from "@supabase/supabase-js";
import { emailRequestHash, sendTransactionalEmail } from "@/lib/email/resend";
import type { OperationalAlert } from "@/lib/observability/operational-alerts";

export type OperationsAlertDelivery =
  | { status: "sent"; providerReference?: string }
  | { status: "duplicate"; providerReference?: string }
  | { status: "throttled" }
  | { status: "missing_recipient" }
  | { status: "failed"; reason: string };

function operationsRecipient() {
  const value = process.env.COSTIVRA_OPERATIONS_ALERT_EMAIL?.trim().toLowerCase();
  return value && value.includes("@") ? value : null;
}

export function buildOperationsAlertEmail(alert: OperationalAlert, recipient: string) {
  const link = "https://costivra.ai/manage/operations";
  const subject = `[Costivra ${alert.severity}] ${alert.title}`;
  const text = [
    `Severity: ${alert.severity}`,
    `Signal: ${alert.signalKey}`,
    `Title: ${alert.title}`,
    `First seen: ${alert.firstSeenAt}`,
    `Last seen: ${alert.lastSeenAt}`,
    `Occurrences: ${alert.occurrenceCount}`,
    `Review: ${link}`,
  ].join("\n");
  const html = `<p><strong>Severity:</strong> ${alert.severity}</p><p><strong>Signal:</strong> ${alert.signalKey}</p><p><strong>Title:</strong> ${alert.title}</p><p><strong>First seen:</strong> ${alert.firstSeenAt}</p><p><strong>Last seen:</strong> ${alert.lastSeenAt}</p><p><strong>Occurrences:</strong> ${alert.occurrenceCount}</p><p><a href="${link}">Review operations</a></p>`;
  return { to: recipient, subject, text, html };
}

export async function deliverOperationsAlert(
  db: SupabaseClient,
  alert: OperationalAlert,
): Promise<OperationsAlertDelivery> {
  const recipient = operationsRecipient();
  if (!recipient) return { status: "missing_recipient" };

  const generation = Number(alert.metadata.activation_generation || 1);
  const reminderMinutes = Number(process.env.COSTIVRA_ALERT_REMINDER_MINUTES || 0);
  const previousSeverity = String(alert.metadata.previous_severity || alert.severity);
  const severityRank = (value: string) => value === "critical" ? 2 : value === "warning" ? 1 : 0;
  const kind = severityRank(alert.severity) > severityRank(previousSeverity)
    ? "escalation"
    : alert.occurrenceCount === 1 ? "activation" : reminderMinutes > 0 ? "reminder" : "activation";
  const idempotencyKey = `operations-alert:${alert.signalKey}:${generation}:${kind}`;
  const email = buildOperationsAlertEmail(alert, recipient);
  const requestHash = emailRequestHash({ to: email.to, subject: email.subject, text: email.text, html: email.html });

  const { data: existing } = await db
    .from("operational_alert_deliveries")
    .select("id,status,provider_reference,request_hash,last_attempt_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing?.status === "sent") return { status: "duplicate", providerReference: existing.provider_reference ?? undefined };
  if (existing?.status === "pending") return { status: "duplicate" };
  if (existing?.status === "failed") {
    const lastAttempt = existing.last_attempt_at ? Date.parse(existing.last_attempt_at) : 0;
    if (reminderMinutes > 0 && Date.now() - lastAttempt < reminderMinutes * 60_000) return { status: "throttled" };
  }

  const claim = await db.from("operational_alert_deliveries").insert({
    alert_id: alert.id,
    idempotency_key: idempotencyKey,
    notification_kind: kind,
    recipient,
    status: "pending",
    request_hash: requestHash,
    attempt_count: (existing?.status === "failed" ? 1 : 0),
    updated_at: new Date().toISOString(),
  }).select("id,status").single();
  let deliveryId: string | null = claim.data?.id ?? null;
  if (claim.error || !claim.data) {
    if (claim.error?.code !== "23505") return { status: "failed", reason: "ALERT_DELIVERY_CLAIM_FAILED" };
    const raced = await db.from("operational_alert_deliveries").select("id,status,provider_reference,request_hash").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (raced.data?.request_hash && raced.data.request_hash !== requestHash) return { status: "failed", reason: "ALERT_DELIVERY_CONTENT_MISMATCH" };
    if (raced.data?.status === "sent") return { status: "duplicate", providerReference: raced.data.provider_reference ?? undefined };
    if (raced.data?.status !== "failed") return { status: "duplicate" };
    const retry = await db.from("operational_alert_deliveries").update({ status: "pending", attempt_count: 1, updated_at: new Date().toISOString() }).eq("id", raced.data.id).eq("status", "failed").select("id").maybeSingle();
    if (retry.error || !retry.data) return { status: "duplicate" };
    deliveryId = raced.data.id;
  }
  if (!deliveryId) return { status: "failed", reason: "ALERT_DELIVERY_CLAIM_FAILED" };

  const replyTo = process.env.COSTIVRA_OPERATIONS_ALERT_REPLY_TO?.trim();
  const result = await sendTransactionalEmail({ ...email, replyTo: replyTo && replyTo.includes("@") ? replyTo : undefined, idempotencyKey });
  if (!result.ok) {
    await db.from("operational_alert_deliveries").update({ status: "failed", safe_error: result.error, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", deliveryId);
    return { status: "failed", reason: result.error };
  }
  await db.from("operational_alert_deliveries").update({ status: "sent", provider_reference: result.providerId, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", deliveryId);
  return { status: "sent", providerReference: result.providerId };
}
