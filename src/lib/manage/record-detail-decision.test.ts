import { describe, expect, it } from "vitest";
import {
  getIntakeEventDecision,
  getInvoiceReviewDecision,
} from "./record-detail-decision";

describe("getInvoiceReviewDecision", () => {
  it("puts a reconciliation mismatch ahead of generic review exceptions", () => {
    const decision = getInvoiceReviewDecision({
      evidence: [{ id: "evidence-1" }],
      issueCodes: ["arithmetic_mismatch", "low_confidence"],
      reconciliationStatus: "mismatch",
      reviewStatus: "needs_review",
    });

    expect(decision.heading).toBe("Reconcile this invoice before approval");
    expect(decision.description).toContain("do not reconcile");
    expect(decision.facts).toContainEqual({ label: "Field evidence", value: "1 field recorded" });
  });

  it("does not call an approved record safe or remove the evidence trail", () => {
    const decision = getInvoiceReviewDecision({
      evidence: [],
      issueCodes: [],
      reconciliationStatus: "reconciled",
      reviewStatus: "approved",
    });

    expect(decision.heading).toBe("Invoice review is recorded");
    expect(decision.description).toContain("source evidence");
    expect(decision.description).not.toMatch(/safe|guaranteed/i);
  });
});

describe("getIntakeEventDecision", () => {
  it("keeps a quarantined event behind the security boundary", () => {
    const decision = getIntakeEventDecision({
      attachmentCount: 2,
      attachments: [{ processingStatus: "quarantined" }],
      processedAttachmentCount: 0,
      status: "quarantined",
    }, false);

    expect(decision.heading).toBe("Security review is still required");
    expect(decision.description).toContain("scanner is not configured");
    expect(decision.facts).toContainEqual({ label: "Security boundary", value: "Quarantined" });
  });

  it("explains recovery without promising to bypass checks", () => {
    const decision = getIntakeEventDecision({
      attachmentCount: 1,
      attachments: [],
      processedAttachmentCount: 0,
      status: "failed",
    }, true);

    expect(decision.heading).toBe("This intake event needs recovery");
    expect(decision.description).toContain("does not bypass scanning");
  });
});
