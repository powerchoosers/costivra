import { describe, expect, it } from "vitest";
import {
  actionAssignedToUser,
  actionIsCompleted,
  contractNeedsDetails,
  findingHasEvidence,
  findingHasCustomerVisibleMonetaryClaim,
  findingNeedsEvidence,
  findingNeedsReview,
  findingStatusOptions,
  isExpiredContract,
  isUpcomingContract,
  resolveActionView,
  resolveContractView,
  resolveFindingView,
  resolveResultsView,
  resultIsInProgress,
  resultIsVerified,
  resultNeedsVerificationReview,
  resultVerificationStatus,
  totalCustomerVisibleFindingValue,
} from "@/lib/portal/workflow-workspaces";
import type { PortalAction, PortalContract, PortalOpportunity, PortalSavingsOutcome } from "@/lib/portal/types";

const contract = (overrides: Partial<PortalContract> = {}): PortalContract => ({
  id: "contract-1", vendorId: "vendor-1", vendorName: "Vendor", title: "Agreement", category: "software",
  startDate: "2025-01-01", endDate: "2026-12-31", noticePeriodDays: 60, annualValue: 1000,
  status: "active", autoRenews: true, ownerName: "Lewis", documentId: "doc-1", expenseAccountId: "account-1",
  locationId: "location-1", locationName: "HQ", updatedAt: "2026-01-01", ...overrides,
});

const finding = (overrides: Partial<PortalOpportunity> = {}): PortalOpportunity => ({
  id: "finding-1", title: "Rate review", summary: "Review the rate", type: "rate", category: "telecom",
  status: "open", priority: "high", confidence: 0.9, estimatedAnnualValue: 1200, deadlineAt: null,
  vendorName: "Vendor", vendorId: "vendor-1", evidenceCount: 2, ruleVersion: "rule-1", calculationResult: {},
  assumptions: [], calculationInputs: {}, trustState: "evidence_backed", generatedBy: "rule", customerVisible: true,
  monetaryClaimAllowed: true, sourceDocumentId: "doc-1", sourceExpenseId: null, baselineExpenseId: null,
  expenseAccountId: "account-1", expenseAccountReference: "Account", locationId: "location-1", locationName: "HQ",
  accountNumberLast4: "1234", lastEvaluatedAt: null, updatedAt: "2026-01-01", ...overrides,
});

const action = (overrides: Partial<PortalAction> = {}): PortalAction => ({
  id: "action-1", opportunityId: "finding-1", title: "Ask vendor", description: "Prepare a review", actionType: "vendor_review",
  priority: "high", status: "pending_approval", dueAt: null, vendorName: "Vendor", vendorId: "vendor-1",
  approvalId: "approval-1", approvalDecision: null, approvalPolicyId: "policy-1", approvalPolicyName: "Two-person approval",
  requiredApprovals: 1, approvedCount: 0, currentUserDecision: "pending", updatedAt: "2026-01-01", ...overrides,
});

const result = (overrides: Partial<PortalSavingsOutcome> = {}): PortalSavingsOutcome => ({
  id: "result-1", title: "Verified result", valueType: "recurring", amount: 1200, method: "Invoice comparison",
  status: "verified", verifiedAt: "2026-01-01", baselineAmount: 1000, comparisonAmount: 800, baselineAcceptedAt: "2025-12-01",
  baselineExpenseId: "expense-1", comparisonExpenseId: "expense-2", methodVersion: "v1", calculationResult: {}, opportunityId: "finding-1",
  assumptions: [], exclusions: [], ...overrides,
});

describe("workflow workspace helpers", () => {
  it("resolves supported tabs and falls back safely", () => {
    expect(resolveContractView("needs_details")).toBe("needs_details");
    expect(resolveContractView("bad", "all")).toBe("all");
    expect(resolveFindingView("evidence_backed")).toBe("evidence_backed");
    expect(resolveActionView("in_progress")).toBe("in_progress");
    expect(resolveResultsView("reports")).toBe("reports");
  });

  it("classifies contract deadlines and missing details", () => {
    expect(isUpcomingContract(contract(), new Date("2026-01-01"))).toBe(true);
    expect(isExpiredContract(contract({ endDate: "2025-12-31" }), new Date("2026-01-01"))).toBe(true);
    expect(contractNeedsDetails(contract({ noticePeriodDays: null }))).toBe(true);
  });

  it("keeps finding value separate from trust classification", () => {
    expect(findingNeedsReview(finding({ trustState: "needs_evidence" }))).toBe(true);
    expect(findingHasEvidence(finding())).toBe(true);
    expect(findingNeedsEvidence(finding({ evidenceCount: 0, trustState: "needs_evidence" }))).toBe(true);
  });

  it("only exposes plan approval after a finding has evidence-backed provenance", () => {
    expect(findingStatusOptions(finding({ status: "under_review", trustState: "manual_note", evidenceCount: 0 })).map((item) => item.value))
      .not.toContain("approved");
    expect(findingStatusOptions(finding({ status: "under_review", trustState: "evidence_backed", evidenceCount: 1 })).map((item) => item.value))
      .toContain("approved");
  });

  it("only totals findings whose monetary claim can be shown to the customer", () => {
    const shown = finding({ id: "shown", estimatedAnnualValue: 1200 });
    const hidden = finding({ id: "hidden", monetaryClaimAllowed: false, estimatedAnnualValue: 900 });
    const uncalculated = finding({ id: "uncalculated", estimatedAnnualValue: null });

    expect(findingHasCustomerVisibleMonetaryClaim(shown)).toBe(true);
    expect(findingHasCustomerVisibleMonetaryClaim(hidden)).toBe(false);
    expect(totalCustomerVisibleFindingValue([shown, hidden, uncalculated])).toBe(1200);
  });

  it("classifies action ownership and completion", () => {
    expect(actionAssignedToUser(action())).toBe(true);
    expect(actionIsCompleted(action({ status: "completed" }))).toBe(true);
  });

  it("classifies verified and in-progress results", () => {
    expect(resultIsVerified(result({ calculationResult: { annualizedValue: "1200.00" } }))).toBe(true);
    expect(resultIsInProgress(result({ status: "awaiting_comparison", verifiedAt: null }))).toBe(true);
    const incompleteVerified = result({ baselineAmount: null, comparisonAmount: null, baselineAcceptedAt: null, baselineExpenseId: null, comparisonExpenseId: null, methodVersion: null });
    expect(resultIsVerified(incompleteVerified)).toBe(false);
    expect(resultNeedsVerificationReview(incompleteVerified)).toBe(true);
    expect(resultVerificationStatus(incompleteVerified)).toBe("needs_review");
    expect(resultIsInProgress(incompleteVerified)).toBe(true);
  });
});
