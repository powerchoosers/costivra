export type InvoiceReviewInput = {
  hasVendor: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  currency: string | null;
  totalAmount: string | null;
  expenseCategory: string | null;
  reconciliationStatus: "reconciled" | "mismatch" | "incomplete" | "not_run";
  confidence: number | null;
  additionalIssueCodes?: string[];
};

export function classifyInvoiceReview(input: InvoiceReviewInput) {
  const issueCodes: string[] = [];
  if (!input.hasVendor) issueCodes.push("vendor_unmatched");
  if (!input.invoiceNumber) issueCodes.push("invoice_number_missing");
  if (!input.invoiceDate) issueCodes.push("invoice_date_missing");
  if (!input.servicePeriodStart || !input.servicePeriodEnd) issueCodes.push("service_period_missing");
  if (!input.totalAmount) issueCodes.push("total_missing");
  if (!input.currency) issueCodes.push("currency_missing");
  if (!input.expenseCategory) issueCodes.push("category_missing");
  if (input.reconciliationStatus === "mismatch") issueCodes.push("arithmetic_mismatch");
  if (["incomplete", "not_run"].includes(input.reconciliationStatus)) issueCodes.push("reconciliation_incomplete");
  if (input.confidence == null || input.confidence < 0.85) issueCodes.push("low_confidence");
  for (const code of input.additionalIssueCodes ?? []) {
    if (!issueCodes.includes(code)) issueCodes.push(code);
  }
  return { issueCodes, reviewStatus: issueCodes.length ? "needs_review" as const : "ready" as const };
}
