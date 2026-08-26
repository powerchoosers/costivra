import type { DocumentClassification } from "@/lib/ai/document-intelligence";
import {
  defineGovernedAgentContract,
  runGovernedAgent,
} from "@/lib/ai/governed-agent";

export const DOCUMENT_DATA_QUALITY_AGENT = defineGovernedAgentContract({
  id: "document-data-quality",
  displayName: "Document Data Quality Agent",
  contractVersion: "document-data-quality-agent-v1",
  instructionsVersion: "document-review-policy-v1",
  modelConfigurationVersion: "deterministic-document-quality-v1",
  allowedActions: ["evaluate_data_quality", "route_to_human_review"],
  prohibitedActions: [
    "invent_missing_facts",
    "calculate_savings",
    "approve_work",
    "change_source_records",
    "send_external_communication",
    "execute_external_action",
  ],
  maxSteps: 1,
  maxTokens: 0,
  timeoutMs: 5_000,
  maxRetries: 0,
  externalSideEffectsAllowed: false,
  escalationConditions: [
    "low_extraction_confidence",
    "source_evidence_is_incomplete",
    "invoice_does_not_reconcile",
    "record_requires_human_review",
  ],
});

export type DocumentDataQualityAssessment = {
  requiresReview: boolean;
  issueCodes: string[];
};

export function assessDocumentDataQuality(input: {
  classification: DocumentClassification;
  confidence: number;
  omittedEvidenceCount: number;
  evidenceReferenceCount: number;
  invoiceRecord: { reviewStatus: "ready" | "needs_review"; reconciliationStatus: string } | null;
  contractRecord: { needsReview: boolean } | null;
}): DocumentDataQualityAssessment {
  const issueCodes: string[] = [];
  if (input.confidence < 0.75) issueCodes.push("low_extraction_confidence");
  if (input.omittedEvidenceCount > 0) issueCodes.push("evidence_page_unavailable");
  if (["invoice", "statement"].includes(input.classification) && input.evidenceReferenceCount === 0) {
    issueCodes.push("invoice_evidence_missing");
  }
  if (input.invoiceRecord?.reconciliationStatus === "mismatch") issueCodes.push("invoice_reconciliation_mismatch");
  if (["incomplete", "not_run"].includes(input.invoiceRecord?.reconciliationStatus ?? "")) {
    issueCodes.push("invoice_reconciliation_incomplete");
  }
  if (input.invoiceRecord?.reviewStatus === "needs_review") issueCodes.push("invoice_review_required");
  if (input.contractRecord?.needsReview) issueCodes.push("contract_review_required");
  return { requiresReview: issueCodes.length > 0, issueCodes };
}

export async function runDocumentDataQualityAgent(input: {
  organizationId: string;
  documentId: string;
  assessmentInput: Parameters<typeof assessDocumentDataQuality>[0];
  traceId?: string;
}) {
  return runGovernedAgent<DocumentDataQualityAssessment>({
    contract: DOCUMENT_DATA_QUALITY_AGENT,
    scope: {
      organizationId: input.organizationId,
      documentId: input.documentId,
      traceId: input.traceId,
    },
    execute: async () => assessDocumentDataQuality(input.assessmentInput),
  });
}
