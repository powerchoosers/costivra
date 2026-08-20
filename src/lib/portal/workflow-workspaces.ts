import type {
  PortalAction,
  PortalContract,
  PortalOpportunity,
  PortalSavingsOutcome,
} from "@/lib/portal/types";

export type ContractWorkspaceView = "upcoming" | "all" | "needs_details" | "expired";
export type FindingWorkspaceView = "review" | "evidence_backed" | "needs_evidence" | "dismissed";
export type ActionWorkspaceView = "approval" | "assigned" | "in_progress" | "completed";
export type ResultsWorkspaceView = "verified" | "in_progress" | "reports" | "summary";

const contractViews: ContractWorkspaceView[] = ["upcoming", "all", "needs_details", "expired"];
const findingViews: FindingWorkspaceView[] = ["review", "evidence_backed", "needs_evidence", "dismissed"];
const actionViews: ActionWorkspaceView[] = ["approval", "assigned", "in_progress", "completed"];
const resultsViews: ResultsWorkspaceView[] = ["verified", "in_progress", "reports", "summary"];

export function resolveContractView(requested: string | null, fallback: ContractWorkspaceView = "upcoming"): ContractWorkspaceView {
  return contractViews.includes(requested as ContractWorkspaceView) ? requested as ContractWorkspaceView : fallback;
}

export function resolveFindingView(requested: string | null, fallback: FindingWorkspaceView = "review"): FindingWorkspaceView {
  return findingViews.includes(requested as FindingWorkspaceView) ? requested as FindingWorkspaceView : fallback;
}

export function resolveActionView(requested: string | null, fallback: ActionWorkspaceView = "approval"): ActionWorkspaceView {
  return actionViews.includes(requested as ActionWorkspaceView) ? requested as ActionWorkspaceView : fallback;
}

export function resolveResultsView(requested: string | null, fallback: ResultsWorkspaceView = "verified"): ResultsWorkspaceView {
  return resultsViews.includes(requested as ResultsWorkspaceView) ? requested as ResultsWorkspaceView : fallback;
}

export function isUpcomingContract(contract: PortalContract, now = new Date()): boolean {
  if (!contract.endDate) return false;
  const end = new Date(contract.endDate).getTime();
  const today = now.getTime();
  return end >= today && end <= today + 365 * 24 * 60 * 60 * 1000;
}

export function isExpiredContract(contract: PortalContract, now = new Date()): boolean {
  return Boolean(contract.endDate && new Date(contract.endDate).getTime() < now.getTime());
}

export function contractNeedsDetails(contract: PortalContract): boolean {
  return !contract.endDate || contract.noticePeriodDays == null || !contract.documentId || !contract.expenseAccountId;
}

export function findingNeedsReview(finding: PortalOpportunity): boolean {
  return ["open", "under_review", "approved"].includes(finding.status) && finding.trustState !== "evidence_backed";
}

export function findingHasEvidence(finding: Pick<PortalOpportunity, "evidenceCount" | "trustState">): boolean {
  return finding.evidenceCount > 0 && finding.trustState === "evidence_backed";
}

export function findingStatusOptions(finding: Pick<PortalOpportunity, "status" | "trustState" | "evidenceCount">) {
  if (finding.status === "open") {
    return [
      { value: "open", label: "Open" },
      { value: "under_review", label: "Review" },
      { value: "declined", label: "Decline" },
    ];
  }

  if (finding.status === "under_review") {
    return [
      { value: "under_review", label: "Under review" },
      ...(findingHasEvidence(finding) ? [{ value: "approved", label: "Approve plan" }] : []),
      { value: "declined", label: "Decline" },
    ];
  }

  return [{ value: finding.status, label: finding.status.replaceAll("_", " ") }];
}

export function findingNeedsEvidence(finding: PortalOpportunity): boolean {
  return finding.evidenceCount === 0 || ["needs_evidence", "demo_example", "deprecated"].includes(finding.trustState);
}

export function findingIsDismissed(finding: PortalOpportunity): boolean {
  return ["declined", "dismissed", "closed"].includes(finding.status);
}

export function findingHasCustomerVisibleMonetaryClaim(finding: PortalOpportunity): boolean {
  return finding.monetaryClaimAllowed && finding.estimatedAnnualValue != null;
}

export function totalCustomerVisibleFindingValue(findings: readonly PortalOpportunity[]): number {
  return findings.reduce(
    (total, finding) => total + (findingHasCustomerVisibleMonetaryClaim(finding) ? finding.estimatedAnnualValue ?? 0 : 0),
    0,
  );
}

export function actionNeedsApproval(action: PortalAction): boolean {
  return action.status === "pending_approval";
}

export function actionAssignedToUser(action: PortalAction): boolean {
  return action.currentUserDecision === "pending" || action.currentUserDecision === "approved";
}

export function actionIsInProgress(action: PortalAction): boolean {
  return action.status === "in_progress";
}

export function actionIsCompleted(action: PortalAction): boolean {
  return ["complete", "completed", "cancelled", "declined"].includes(action.status);
}

export function resultHasVerificationEvidence(result: PortalSavingsOutcome): boolean {
  return Boolean(
    result.baselineExpenseId
    && result.comparisonExpenseId
    && result.baselineAmount != null
    && result.comparisonAmount != null
    && result.baselineAcceptedAt
    && result.methodVersion
    && Object.keys(result.calculationResult).length > 0
    && result.amount > 0,
  );
}

export function resultIsVerified(result: PortalSavingsOutcome): boolean {
  return result.status === "verified" && result.verifiedAt != null && resultHasVerificationEvidence(result);
}

export function resultNeedsVerificationReview(result: PortalSavingsOutcome): boolean {
  return result.status === "verified" && !resultIsVerified(result);
}

export function resultVerificationStatus(result: PortalSavingsOutcome): string {
  return resultNeedsVerificationReview(result) ? "needs_review" : result.status;
}

export function resultIsInProgress(result: PortalSavingsOutcome): boolean {
  return resultNeedsVerificationReview(result)
    || (!resultIsVerified(result) && ["baseline_review", "awaiting_comparison", "ready_for_review", "pending", "in_progress"].includes(result.status));
}
