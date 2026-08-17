import type { SupabaseClient } from "@supabase/supabase-js";
import { brandedEmailHtml, escapeEmailHtml } from "./brand";
import { emailRequestHash, sendTransactionalEmail } from "./resend";
import { claimExternalSideEffect } from "./side-effect-claim";

export type LifecycleEmailKind =
  | "welcome_activation" | "upload_received" | "review_needed" | "finding_ready"
  | "approval_requested" | "forwarding_instructions" | "forwarding_test_result"
  | "expected_bill_missed" | "verification_ready" | "activation_complete" | "activation_reminder";

export type LifecycleEmailPayload = {
  vendorName?: string;
  documentName?: string;
  findingTitle?: string;
  amountCents?: number;
  actionTitle?: string;
  intakeAddress?: string;
  reason?: string;
  scanStatus?: "processing" | "quarantined" | "duplicate" | "rejected";
  sourceRecordId?: string;
  eventKey?: string;
  /** Internal-only correlation value; never rendered into customer email content. */
  requestId?: string;
};

/** Payload accepted by the side-effect-producing sender. */
export type LifecycleEmailSendPayload = LifecycleEmailPayload & (
  | { sourceRecordId: string; eventKey?: string }
  | { sourceRecordId?: string; eventKey: string }
);

export interface SendLifecycleEmailInput {
  kind: LifecycleEmailKind;
  organizationId: string;
  recipientEmail: string;
  recipientName?: string;
  payload: LifecycleEmailSendPayload;
}

type Content = { subject: string; text: string; html: string };
const money = (cents?: number) => cents == null ? "See details" : `$${(cents / 100).toFixed(2)}`;
const safe = (value: string | undefined, fallback: string) => escapeEmailHtml(value?.trim() || fallback);
const link = (path: string) => `https://costivra.ai${path}`;

export function buildLifecycleEmailContent(kind: LifecycleEmailKind, payload: LifecycleEmailPayload, recipientName?: string): Content {
  const name = safe(recipientName, "there");
  const vendor = safe(payload.vendorName, "your vendor");
  const document = safe(payload.documentName, "your document");
  const body = (heading: string, bodyHtml: string, cta?: { label: string; href: string }, subject = heading) => ({
    subject,
    text: `${heading}\n\n${bodyHtml.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")}\n\nCostivra`,
    html: brandedEmailHtml({ preview: subject, heading, bodyHtml, cta, footer: "This message was sent by Costivra because of activity in your private workspace." }),
  });
  switch (kind) {
    case "welcome_activation": return body("Your Costivra workspace is ready.", `<p>Hi ${name},</p><p>Your private workspace is ready. Start with up to three current bills, review the source-linked findings, and decide what deserves attention.</p>`, { label: "Open your workspace", href: link("/app") }, "Welcome to Costivra");
    case "upload_received": {
      const state = payload.scanStatus ?? "processing";
      const copy = state === "quarantined" ? "The file is safely quarantined while security review completes." : state === "duplicate" ? "Costivra recognized this as a duplicate and kept the original record authoritative." : state === "rejected" ? "The file was rejected before downstream processing. Open the workspace for the reason." : "The file is being scanned and prepared for source-linked review.";
      return body("Your document reached Costivra.", `<p><strong>${document}</strong></p><p>${copy}</p>`, { label: "View document status", href: link("/app/documents") }, `Document received · ${payload.documentName ?? "Source file"}`);
    }
    case "review_needed": return body("A document needs your review.", `<p>The ${vendor} document needs attention because extraction confidence is low, required totals are missing, or the arithmetic needs review.</p>`, { label: "Review the document", href: link("/app/documents") }, `Review needed · ${payload.vendorName ?? "Vendor document"}`);
    case "finding_ready": return body("A potential cost issue is ready to review.", `<p><strong>${safe(payload.findingTitle, "A potential cost issue")}</strong></p><p>Potential value: <strong>${money(payload.amountCents)}</strong>. This is a potential value, not verified savings. The source evidence and calculation are attached in your workspace.</p>`, { label: "Review the evidence", href: link("/app/findings") }, `Potential value ready · ${payload.findingTitle ?? "Cost issue"}`);
    case "approval_requested": return body("An action is waiting for approval.", `<p><strong>${safe(payload.actionTitle, "A bounded action")}</strong> needs an authorized decision. Review the scope, evidence, and outside effect before approving.</p>`, { label: "Review approval", href: link("/app/actions") }, `Approval requested · ${payload.actionTitle ?? "Action"}`);
    case "forwarding_instructions": return body("Your bill-monitoring intake is ready.", `<p>Forward future ${vendor} bills to:</p><p style="font-size:20px;font-weight:700;color:#111927">${safe(payload.intakeAddress, "your private intake address")}</p><p>Only use the address shown in your workspace. Costivra will keep the source attached and show the scan result.</p>`, { label: "View monitoring", href: link("/app/vendors") }, `Monitoring setup · ${payload.vendorName ?? "Vendor"}`);
    case "forwarding_test_result": {
      const resultCopy = payload.reason === "review_required"
        ? "Costivra received the forwarded document, but the intake needs review before monitoring can be called active."
        : payload.reason === "failed"
          ? "Costivra could not complete the forwarded-document test. Review the intake status and try again when the issue is resolved."
          : "Costivra received and checked the forwarded document. Monitoring is active only when the workspace says it is active.";
      return body("Your monitoring test has an update.", `<p>${resultCopy}</p>`, { label: "View monitoring", href: link("/app/vendors") }, `Monitoring test result · ${payload.vendorName ?? "Vendor"}`);
    }
    case "expected_bill_missed": return body("An expected bill did not arrive.", `<p>Costivra did not receive the expected recurring bill from ${vendor} during the configured window. Check forwarding or upload the missing statement.</p>`, { label: "Review monitoring", href: link("/app/vendors") }, `Expected bill missed · ${payload.vendorName ?? "Vendor"}`);
    case "verification_ready": return body("A result is ready for verification.", `<p><strong>${safe(payload.findingTitle, "A cost outcome")}</strong> has later evidence available. Review the baseline, comparison record, and method before treating the outcome as verified.</p>`, { label: "Review verification", href: link("/app/savings") }, `Verification ready · ${payload.findingTitle ?? "Cost outcome"}`);
    case "activation_complete": return body("Your Costivra workspace is activated.", `<p>Hi ${name},</p><p>Your workspace has completed the pilot setup checklist. You can now review source-linked findings, monitor recurring bills, and keep decisions tied to evidence.</p>`, { label: "Open your workspace", href: link("/app") }, "Your Costivra workspace is activated");
    case "activation_reminder": return body("Your Costivra workspace is waiting for setup.", `<p>Hi ${name},</p><p>Your private workspace is still waiting for the pilot setup checklist to finish. Add the remaining source records, review the evidence, and select monitoring when you are ready.</p>`, { label: "Continue setup", href: link("/app") }, "Continue setting up Costivra");
  }
}

function stableIdempotencyKey(input: SendLifecycleEmailInput) {
  const source = input.payload.sourceRecordId?.trim() || input.payload.eventKey?.trim();
  return source
    ? `lifecycle/${input.organizationId}/${input.kind}/${source}/${input.recipientEmail.trim().toLowerCase()}`
    : null;
}

export async function sendLifecycleEmail(db: SupabaseClient, input: SendLifecycleEmailInput): Promise<{ sent: boolean; messageId?: string; reason?: string; deliveryStatus?: "accepted" | "duplicate" | "failed" }> {
  const idempotencyKey = stableIdempotencyKey(input);
  if (!idempotencyKey) {
    return { sent: false, reason: "LIFECYCLE_SOURCE_ID_REQUIRED", deliveryStatus: "failed" };
  }
  const content = buildLifecycleEmailContent(input.kind, input.payload, input.recipientName);
  const requestHash = emailRequestHash({ to: input.recipientEmail, subject: content.subject, text: content.text, html: content.html });
  const claim = await claimExternalSideEffect(db, {
    organizationId: input.organizationId,
    type: "lifecycle_email",
    destination: input.recipientEmail.trim().toLowerCase(),
    idempotencyKey,
    requestHash,
    authorizationMethod: "lifecycle_event_policy_v1",
    sanitizedRequestMetadata: { kind: input.kind, source_record_id: input.payload.sourceRecordId ?? null, event_key: input.payload.eventKey ?? null, request_id: input.payload.requestId ?? null, subject: content.subject },
  });
  if (!claim.claimed) {
    if (claim.duplicate) return { sent: false, messageId: claim.providerReference || undefined, reason: "Already delivered or in progress (idempotent duplicate)", deliveryStatus: "duplicate" };
    return { sent: false, reason: claim.error, deliveryStatus: "failed" };
  }

  const result = await sendTransactionalEmail({ to: input.recipientEmail.trim().toLowerCase(), subject: content.subject, text: content.text, html: content.html, idempotencyKey });
  if (!result.ok) {
    await db.from("external_side_effects").update({ status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("id", claim.id);
    return { sent: false, reason: result.error, deliveryStatus: "failed" };
  }
  await db.from("external_side_effects").update({ status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", claim.id);
  return { sent: true, messageId: result.providerId, deliveryStatus: "accepted" };
}
