import type { PortalInvoice } from "@/lib/portal/types";

export type BillsWorkspaceView = "review" | "all" | "spend" | "files";

const billsWorkspaceViews: BillsWorkspaceView[] = ["review", "all", "spend", "files"];

export function resolveBillsView(
  requestedView: string | null | undefined,
  fallback: BillsWorkspaceView,
): BillsWorkspaceView {
  return requestedView && billsWorkspaceViews.includes(requestedView as BillsWorkspaceView)
    ? requestedView as BillsWorkspaceView
    : fallback;
}

export function getPlainLanguageReviewReasons(invoice: PortalInvoice, documentStatus?: string): string[] {
  const reasons: string[] = [];
  if (invoice.vendorMatchStatus !== "exact") reasons.push("Vendor needs confirmation");
  if (invoice.workspaceCustomerMatchStatus !== "matched") reasons.push("Workspace customer needs confirmation");
  if (invoice.expenseAccountMatchStatus !== "matched") reasons.push("Account needs matching");
  if (invoice.serviceLocationMatchStatus !== "matched") reasons.push("Location needs matching");
  if (invoice.reconciliationStatus !== "reconciled") reasons.push("Totals need confirmation");
  if (invoice.reviewStatus === "needs_review") reasons.push("Extraction needs review");
  if (["quarantined", "scanning", "pending"].includes(documentStatus ?? "")) reasons.push("Security scan pending");
  if (!reasons.length && invoice.reviewPriority === "high") reasons.push("High priority review");
  return reasons.length ? reasons : ["Needs review"];
}
