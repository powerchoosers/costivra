import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getResendClient } from "./resend";

export type LifecycleEmailKind =
  | "welcome_activation"
  | "upload_received"
  | "review_needed"
  | "finding_ready"
  | "approval_requested"
  | "forwarding_instructions"
  | "forwarding_test_result"
  | "expected_bill_missed"
  | "verification_ready";

export interface SendLifecycleEmailInput {
  kind: LifecycleEmailKind;
  organizationId: string;
  recipientEmail: string;
  recipientName?: string;
  payload: {
    vendorName?: string;
    documentName?: string;
    findingTitle?: string;
    amountCents?: number;
    actionTitle?: string;
    intakeAddress?: string;
    reason?: string;
  };
}

export function buildLifecycleEmailContent(kind: LifecycleEmailKind, payload: SendLifecycleEmailInput["payload"]) {
  switch (kind) {
    case "welcome_activation":
      return {
        subject: "Welcome to Costivra – Your 3-Bill Activation Checklist",
        text: `Welcome to Costivra.\n\nYour workspace is ready. To complete activation and begin cost monitoring:\n1. Upload 3 recent recurring bills\n2. Review extracted line items\n3. Configure automatic bill forwarding\n\nAccess your workspace: https://costivra.ai/app`,
      };
    case "upload_received":
      return {
        subject: `Document Received: ${payload.documentName ?? "Source File"}`,
        text: `Costivra received "${payload.documentName ?? "your file"}". It is undergoing malware scanning and deterministic line-item extraction.\n\nView documents: https://costivra.ai/app/documents`,
      };
    case "review_needed":
      return {
        subject: `Extraction Review Needed: ${payload.vendorName ?? "Vendor Document"}`,
        text: `A document from ${payload.vendorName ?? "a vendor"} requires human review due to low extraction confidence or missing totals.\n\nReview now: https://costivra.ai/app/documents`,
      };
    case "finding_ready":
      return {
        subject: `New Finding: ${payload.findingTitle ?? "Cost Opportunity Identified"}`,
        text: `Costivra identified a potential cost opportunity: ${payload.findingTitle}.\nEstimated value: ${payload.amountCents ? `$${(payload.amountCents / 100).toFixed(2)}` : "See details"}.\n\nView finding evidence: https://costivra.ai/app/opportunities`,
      };
    case "approval_requested":
      return {
        subject: `Approval Required: ${payload.actionTitle ?? "Vendor Action Plan"}`,
        text: `An action plan requires authorized human approval: ${payload.actionTitle}.\n\nReview and authorize: https://costivra.ai/app/actions`,
      };
    case "forwarding_instructions":
      return {
        subject: `Monitoring Setup: Forwarding Instructions for ${payload.vendorName ?? "Vendor"}`,
        text: `To monitor bills from ${payload.vendorName ?? "your vendor"}, set up an automatic email forwarding rule to your private intake address:\n\n${payload.intakeAddress ?? "inbox@costivra.ai"}\n\nInstructions: https://costivra.ai/app/vendors`,
      };
    case "forwarding_test_result":
      return {
        subject: `Monitoring Activated: ${payload.vendorName ?? "Vendor"} Test Invoice Received`,
        text: `Forwarding test succeeded! Costivra successfully received and verified a forwarded bill from ${payload.vendorName ?? "your vendor"}. Continuous monitoring is now active.`,
      };
    case "expected_bill_missed":
      return {
        subject: `Bill Missed: Expected recurring bill from ${payload.vendorName ?? "Vendor"} not received`,
        text: `Costivra did not receive the expected recurring bill from ${payload.vendorName ?? "a monitored vendor"} within the expected billing window and grace period. Please verify forwarding or upload the missing statement.`,
      };
    case "verification_ready":
      return {
        subject: `Savings Verified: ${payload.findingTitle ?? "Cost Recovery Outcome"}`,
        text: `Savings outcome verified! Verified financial savings: ${payload.amountCents ? `$${(payload.amountCents / 100).toFixed(2)}` : "Confirmed"}.\n\nView savings proof: https://costivra.ai/app/savings`,
      };
  }
}

export async function sendLifecycleEmail(
  db: SupabaseClient,
  input: SendLifecycleEmailInput,
): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
  const { kind, organizationId, recipientEmail, payload } = input;
  const content = buildLifecycleEmailContent(kind, payload);

  // Compute idempotency key
  const idempotencyKey = createHash("sha256")
    .update(`${organizationId}:${kind}:${recipientEmail}:${payload.vendorName ?? ""}:${payload.documentName ?? ""}`)
    .digest("hex");

  const requestHash = createHash("sha256")
    .update(`${content.subject}:${content.text}`)
    .digest("hex");

  // Check side-effects ledger
  const { data: existing } = await db
    .from("external_side_effects")
    .select("id, status, provider_reference")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      sent: false,
      messageId: existing.provider_reference || undefined,
      reason: "Already attempted (idempotent duplicate)",
    };
  }

  const resend = getResendClient();
  try {
    const response = await resend.emails.send({
      from: "Costivra <notifications@costivra.ai>",
      to: [recipientEmail],
      subject: content.subject,
      text: content.text,
    });

    const messageId = response.data?.id ?? "mock-resend-id";

    // Persist in side-effects ledger
    await db.from("external_side_effects").upsert(
      {
        organization_id: organizationId,
        type: "email_sent",
        destination: recipientEmail,
        idempotency_key: idempotencyKey,
        request_hash: requestHash,
        status: "sent",
        provider: "resend",
        provider_reference: messageId,
        sanitized_request_metadata: { kind, recipientEmail, subject: content.subject },
        completed_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    );

    return { sent: true, messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email delivery failed";
    try {
      await db.from("external_side_effects").insert({
        organization_id: organizationId,
        type: "email_sent",
        destination: recipientEmail,
        idempotency_key: idempotencyKey,
        request_hash: requestHash,
        status: "failed",
        provider: "resend",
        last_error: errorMessage,
        sanitized_request_metadata: { kind, recipientEmail, subject: content.subject },
      });
    } catch {
      // best-effort; ignore insert errors on failure path
    }

    return { sent: false, reason: errorMessage };
  }
}
