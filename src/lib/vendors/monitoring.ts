export type MonitoringState =
  | "not_set_up"
  | "test_needed"
  | "active"
  | "attention_needed"
  | "paused";

export type MonitoringSourceMethod =
  | "email_forwarding"
  | "manual_forwarding"
  | "manual_upload";

export interface VendorMonitoringRecord {
  relationshipId: string;
  state: MonitoringState;
  sourceMethod: MonitoringSourceMethod;
  approvedForwardingEmail?: string | null;
  privateIntakeAddress: string;
  lastSuccessfulIntakeAt?: string | null;
  expectedCadenceDays: number;
  nextExpectedInvoiceAt?: string | null;
}

export function getMonitoringStateLabel(state: MonitoringState): {
  label: string;
  copy: string;
  badgeClass: string;
} {
  switch (state) {
    case "active":
      return {
        label: "Active",
        copy: "Costivra is receiving and processing forwarded bills on schedule.",
        badgeClass: "status-active",
      };
    case "test_needed":
      return {
        label: "Test needed",
        copy: "Forwarding rule configured. Send one test invoice to activate.",
        badgeClass: "status-needs_review",
      };
    case "attention_needed":
      return {
        label: "Attention needed",
        copy: "Expected bill not received or an intake error occurred.",
        badgeClass: "status-mismatched",
      };
    case "paused":
      return {
        label: "Paused",
        copy: "Bill monitoring is currently paused for this vendor.",
        badgeClass: "status-inactive",
      };
    case "not_set_up":
    default:
      return {
        label: "Not set up",
        copy: "Set up bill forwarding to automatically monitor future invoices.",
        badgeClass: "status-pending",
      };
  }
}

export function calculateNextExpectedInvoiceDate(
  lastInvoiceDateStr?: string | null,
  cadenceDays: number = 30,
): string | null {
  if (!lastInvoiceDateStr) return null;
  const lastDate = new Date(lastInvoiceDateStr);
  if (isNaN(lastDate.getTime())) return null;
  const nextDate = new Date(lastDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  return nextDate.toISOString().split("T")[0];
}

export function getDynamicPrimaryAction(vendor: {
  documentCount: number;
  hasPendingReviewInvoice: boolean;
  monitoringState: MonitoringState;
  hasOpenFinding: boolean;
  hasPendingAction: boolean;
}): { label: string; actionKind: "upload" | "review_invoice" | "monitor" | "test_forwarding" | "review_finding" | "review_action" | "view_bill"; href?: string } {
  if (vendor.documentCount === 0) {
    return { label: "Add first bill", actionKind: "upload" };
  }
  if (vendor.hasPendingReviewInvoice) {
    return { label: "Review invoice", actionKind: "review_invoice", href: "/app/documents" };
  }
  if (vendor.monitoringState === "not_set_up") {
    return { label: "Monitor this vendor", actionKind: "monitor" };
  }
  if (vendor.monitoringState === "test_needed") {
    return { label: "Finish monitoring test", actionKind: "test_forwarding" };
  }
  if (vendor.hasOpenFinding) {
    return { label: "Review finding", actionKind: "review_finding", href: "/app/opportunities" };
  }
  if (vendor.hasPendingAction) {
    return { label: "Review action", actionKind: "review_action", href: "/app/actions" };
  }
  return { label: "View latest bill", actionKind: "view_bill", href: "/app/documents" };
}
