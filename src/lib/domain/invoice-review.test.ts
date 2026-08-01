import { describe, expect, it } from "vitest";
import { classifyInvoiceReview } from "@/lib/domain/invoice-review";

const complete = {
  hasVendor: true,
  invoiceNumber: "INV-1042",
  invoiceDate: "2026-08-01",
  servicePeriodStart: "2026-07-01",
  servicePeriodEnd: "2026-07-31",
  currency: "USD",
  totalAmount: "1250.00",
  expenseCategory: "Telecom",
  reconciliationStatus: "reconciled" as const,
  confidence: 0.94,
};

describe("classifyInvoiceReview", () => {
  it("keeps clean reconciled invoices out of the default human queue", () => {
    expect(classifyInvoiceReview(complete)).toEqual({ issueCodes: [], reviewStatus: "ready" });
  });

  it("routes questionable invoices into review with explicit reasons", () => {
    expect(classifyInvoiceReview({ ...complete, hasVendor: false, servicePeriodEnd: null, reconciliationStatus: "mismatch", confidence: 0.72 })).toEqual({
      reviewStatus: "needs_review",
      issueCodes: ["vendor_unmatched", "service_period_missing", "arithmetic_mismatch", "low_confidence"],
    });
  });
});
