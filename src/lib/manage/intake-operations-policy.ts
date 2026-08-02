import type { IntakeOperationStatus } from "@/lib/manage/intake-operations-types";

export const ATTENTION_INTAKE_STATUSES = new Set<IntakeOperationStatus>([
  "quarantined",
  "needs_review",
  "failed",
  "dead_letter",
]);

export const RETRYABLE_INTAKE_STATUSES = new Set<IntakeOperationStatus>([
  "failed",
  "dead_letter",
]);

export function intakeStatusGroup(status: IntakeOperationStatus) {
  if (ATTENTION_INTAKE_STATUSES.has(status)) return "attention" as const;
  if (["received", "queued", "processing", "retrying"].includes(status)) {
    return "active" as const;
  }
  return "complete" as const;
}

export function canRetryInboundEvent(status: IntakeOperationStatus) {
  return RETRYABLE_INTAKE_STATUSES.has(status);
}

export function canRescanInboundEvent(
  status: IntakeOperationStatus,
  hasQuarantinedAttachment: boolean,
  scannerConfigured: boolean,
) {
  return status === "quarantined" && hasQuarantinedAttachment && scannerConfigured;
}
