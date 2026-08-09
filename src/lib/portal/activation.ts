import type { PortalData } from "./types";

export function getActivationProgress(data: Pick<PortalData, "documents" | "locations" | "vendors" | "invoices" | "contracts">) {
  const countableDocumentIds = new Set(
    data.documents
      .filter((document) =>
        document.securityStatus === "clean" &&
        ["ready", "needs_review"].includes(document.status) &&
        ["completed", "needs_review"].includes(document.extractionStatus),
      )
      .map((document) => document.id),
  );
  const authoritativeReview = data.invoices.some(
    (invoice) => invoice.reviewStatus === "approved" && countableDocumentIds.has(invoice.documentId),
  ) || data.contracts.some(
    (contract) => Boolean(contract.documentId) && countableDocumentIds.has(contract.documentId as string) && ["active", "renewal_review", "expiring"].includes(contract.status),
  );
  return {
    documentCount: countableDocumentIds.size,
    locationCount: data.locations.length,
    monitoredCount: data.vendors.filter((vendor) =>
      ["active", "manual_tracking"].includes(String(vendor.monitoringState ?? "")),
    ).length,
    needsReviewInvoices: data.invoices.filter((invoice) => invoice.reviewStatus === "needs_review").length,
    authoritativeReview,
  };
}
