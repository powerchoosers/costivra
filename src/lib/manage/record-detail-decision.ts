import { intakeStatusGroup } from "@/lib/manage/intake-operations-policy";
import type { IntakeOperationEvent } from "@/lib/manage/intake-operations-types";
import type { InvoiceReviewDetail } from "@/lib/manage/invoice-review-types";

type DecisionFact = {
  label: string;
  value: string;
};

export type ManageRecordDecision = {
  description: string;
  facts: DecisionFact[];
  heading: string;
};

type InvoiceReviewDecisionInput = Pick<
  InvoiceReviewDetail,
  "issueCodes" | "reconciliationStatus" | "reviewStatus"
> & {
  evidence: ReadonlyArray<unknown>;
};

type IntakeEventDecisionInput = Pick<
  IntakeOperationEvent,
  "attachmentCount" | "processedAttachmentCount" | "status"
> & {
  attachments: ReadonlyArray<Pick<IntakeOperationEvent["attachments"][number], "processingStatus">>;
};

const invoiceReviewStatusLabel: Record<InvoiceReviewDetail["reviewStatus"], string> = {
  approved: "Approved",
  needs_review: "Needs review",
  ready: "Ready for review",
  rejected: "Rejected",
};

const reconciliationLabel: Record<InvoiceReviewDetail["reconciliationStatus"], string> = {
  incomplete: "Incomplete",
  mismatch: "Mismatch",
  not_run: "Not run",
  reconciled: "Reconciled",
};

function intakeStatusLabel(status: IntakeOperationEvent["status"]) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Keeps the review workspace oriented around verified state instead of a
 * potentially overconfident financial conclusion. Approval still remains a
 * separate, human-controlled action in the inspector footer.
 */
export function getInvoiceReviewDecision(input: InvoiceReviewDecisionInput): ManageRecordDecision {
  const evidenceCount = input.evidence.length;
  const evidenceLabel = evidenceCount
    ? `${evidenceCount} field${evidenceCount === 1 ? "" : "s"} recorded`
    : "Not recorded";
  let heading = "Confirm the invoice record";
  let description = "Compare the extracted fields against the source before approving the record.";

  if (input.reviewStatus === "approved") {
    heading = "Invoice review is recorded";
    description = "The reviewed record, source evidence, and any corrections remain available below.";
  } else if (input.reviewStatus === "rejected") {
    heading = "Invoice review was rejected";
    description = "The source and recorded review history remain available for follow-up.";
  } else if (input.reconciliationStatus === "mismatch") {
    heading = "Reconcile this invoice before approval";
    description = "The extracted totals do not reconcile. Compare the source document and correct any fields before approving.";
  } else if (!evidenceCount) {
    heading = "Review the source before approval";
    description = "This invoice needs human verification and has no field-level evidence recorded yet.";
  } else if (input.issueCodes.length) {
    heading = "Confirm the recorded exceptions";
    description = `This invoice has ${input.issueCodes.length} review ${input.issueCodes.length === 1 ? "exception" : "exceptions"}. Resolve discrepancies against the source before approving.`;
  }

  return {
    heading,
    description,
    facts: [
      { label: "Review state", value: invoiceReviewStatusLabel[input.reviewStatus] },
      { label: "Reconciliation", value: reconciliationLabel[input.reconciliationStatus] },
      { label: "Field evidence", value: evidenceLabel },
    ],
  };
}

/**
 * Explains intake state without implying that a source file has passed a
 * security check or that a retry bypasses the normal guarded workflow.
 */
export function getIntakeEventDecision(
  input: IntakeEventDecisionInput,
  scannerConfigured: boolean,
): ManageRecordDecision {
  const hasQuarantinedAttachment = input.attachments.some(
    (attachment) => attachment.processingStatus === "quarantined",
  );
  const statusGroup = intakeStatusGroup(input.status);
  let heading = "Intake record is complete";
  let description = "The recorded source files and any linked invoice records remain available for review.";

  if (input.status === "quarantined" || hasQuarantinedAttachment) {
    heading = "Security review is still required";
    description = scannerConfigured
      ? "This intake event is quarantined. Its source files remain unavailable until the configured security boundary clears."
      : "This intake event is quarantined and the scanner is not configured, so a rescan cannot run yet.";
  } else if (["failed", "dead_letter"].includes(input.status)) {
    heading = "This intake event needs recovery";
    description = "The latest attempt did not finish. Returning it to the queue does not bypass scanning, validation, or human review.";
  } else if (statusGroup === "attention") {
    heading = "Human review is required";
    description = "This event is no longer progressing automatically. Review any recorded error and its source files before deciding what to do next.";
  } else if (statusGroup === "active") {
    heading = "Intake is still in progress";
    description = "The event is moving through a guarded workflow. Check its source files and recorded state before intervening.";
  } else if (input.status === "duplicate") {
    heading = "Duplicate intake recorded";
    description = "This event is retained for audit history and will not create another source record.";
  } else if (input.status === "rejected") {
    heading = "Intake event was rejected";
    description = "The event remains available for review, but it is not progressing through the intake workflow.";
  }

  return {
    heading,
    description,
    facts: [
      { label: "Intake state", value: intakeStatusLabel(input.status) },
      {
        label: "Source files",
        value: `${input.processedAttachmentCount} of ${input.attachmentCount} processed`,
      },
      {
        label: "Security boundary",
        value: hasQuarantinedAttachment || input.status === "quarantined"
          ? "Quarantined"
          : scannerConfigured
            ? "Scanner configured"
            : "Scanner not configured",
      },
    ],
  };
}
