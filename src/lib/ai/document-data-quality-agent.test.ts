import { describe, expect, it } from "vitest";
import { assessDocumentDataQuality, runDocumentDataQualityAgent } from "./document-data-quality-agent";

describe("Document Data Quality Agent", () => {
  it("routes incomplete invoice evidence and reconciliation to review without calculating a financial result", () => {
    expect(assessDocumentDataQuality({
      classification: "invoice",
      confidence: 0.92,
      omittedEvidenceCount: 0,
      evidenceReferenceCount: 0,
      invoiceRecord: { reviewStatus: "needs_review", reconciliationStatus: "mismatch" },
      contractRecord: null,
    })).toEqual({
      requiresReview: true,
      issueCodes: ["invoice_evidence_missing", "invoice_reconciliation_mismatch", "invoice_review_required"],
    });
  });

  it("keeps a supported, complete document ready and records deterministic agent metadata", async () => {
    const result = await runDocumentDataQualityAgent({
      organizationId: "org-1",
      documentId: "doc-1",
      traceId: "quality-trace-1",
      assessmentInput: {
        classification: "invoice",
        confidence: 0.92,
        omittedEvidenceCount: 0,
        evidenceReferenceCount: 3,
        invoiceRecord: { reviewStatus: "ready", reconciliationStatus: "reconciled" },
        contractRecord: null,
      },
    });

    expect(result.output).toEqual({ requiresReview: false, issueCodes: [] });
    expect(result.trace).toMatchObject({
      traceId: "quality-trace-1",
      agentId: "document-data-quality",
      maxTokens: 0,
      outcome: "completed",
    });
  });
});
