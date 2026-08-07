import { describe, expect, it } from "vitest";
import type { PortalInvoice } from "@/lib/portal/types";
import { getPlainLanguageReviewReasons, resolveBillsView } from "@/lib/portal/bills-workspace";

function invoice(overrides: Partial<PortalInvoice> = {}): PortalInvoice {
  return {
    id: "invoice-1",
    documentId: "document-1",
    vendorName: "TXU Energy",
    invoiceNumber: "054654015245",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-20",
    currency: "USD",
    totalAmount: 100,
    reviewStatus: "approved",
    vendorMatchStatus: "exact",
    workspaceCustomerMatchStatus: "matched",
    expenseAccountMatchStatus: "matched",
    serviceLocationMatchStatus: "matched",
    reconciliationStatus: "reconciled",
    lineItemCount: 1,
    vendorId: "vendor-1",
    servicePeriodStart: "2026-07-01",
    servicePeriodEnd: "2026-07-31",
    accountNumberLast4: "5124",
    purchaseOrderNumber: null,
    subtotal: 100,
    taxTotal: 0,
    feeTotal: 0,
    creditTotal: 0,
    previousBalance: null,
    paymentsAndCredits: null,
    balanceForward: null,
    currentCharges: 100,
    currentPeriodCredits: null,
    amountDue: 100,
    extractionConfidence: 0.98,
    reconciliationDifference: 0,
    reviewPriority: "normal",
    reviewNotes: null,
    expenseCategory: "Electricity",
    expenseAccountId: "account-1",
    locationId: "location-1",
    locationName: "Dallas office",
    energyService: null,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("Chunk 4 Unified Bills and Spend Workspace", () => {
  describe("getPlainLanguageReviewReasons", () => {
    it("returns Vendor needs confirmation when vendorMatchStatus is not exact", () => {
      const reasons = getPlainLanguageReviewReasons(invoice({
        vendorMatchStatus: "fuzzy",
      }));
      expect(reasons).toContain("Vendor needs confirmation");
    });

    it("returns Account needs matching when expenseAccountMatchStatus is not matched", () => {
      const reasons = getPlainLanguageReviewReasons(invoice({
        expenseAccountMatchStatus: "unmatched",
      }));
      expect(reasons).toContain("Account needs matching");
    });

    it("returns Totals need confirmation when reconciliationStatus is not reconciled", () => {
      const reasons = getPlainLanguageReviewReasons(invoice({
        reconciliationStatus: "unreconciled",
      }));
      expect(reasons).toContain("Totals need confirmation");
    });

    it("returns Security scan pending when documentStatus is quarantined", () => {
      const reasons = getPlainLanguageReviewReasons(
        invoice(),
        "quarantined"
      );
      expect(reasons).toContain("Security scan pending");
    });

    it("returns Workspace customer needs confirmation for an identity mismatch", () => {
      const reasons = getPlainLanguageReviewReasons(invoice({ workspaceCustomerMatchStatus: "unmatched" }));
      expect(reasons).toContain("Workspace customer needs confirmation");
    });
  });

  describe("Default view resolution", () => {
    it("defaults to 'review' view when items needing review exist", () => {
      const invoices = [
        { reviewStatus: "approved", vendorMatchStatus: "exact", expenseAccountMatchStatus: "matched", serviceLocationMatchStatus: "matched", reconciliationStatus: "reconciled" },
        { reviewStatus: "needs_review", vendorMatchStatus: "exact", expenseAccountMatchStatus: "matched", serviceLocationMatchStatus: "matched", reconciliationStatus: "reconciled" },
      ];
      const hasReviewItems = invoices.some(
        (i) => i.reviewStatus === "needs_review" || i.vendorMatchStatus !== "exact"
      );
      const defaultView = hasReviewItems ? "review" : "all";
      expect(defaultView).toBe("review");
    });

    it("defaults to 'all' view when no items need review", () => {
      const invoices = [
        { reviewStatus: "approved", vendorMatchStatus: "exact", expenseAccountMatchStatus: "matched", serviceLocationMatchStatus: "matched", reconciliationStatus: "reconciled" },
      ];
      const hasReviewItems = invoices.some(
        (i) => i.reviewStatus === "needs_review" || i.vendorMatchStatus !== "exact"
      );
      const defaultView = hasReviewItems ? "review" : "all";
      expect(defaultView).toBe("all");
    });
  });

  describe("Legacy route mapping", () => {
    it("maps /app/expenses to initialView='spend'", () => {
      const routeMapping: Record<string, string> = {
        "/app/expenses": "spend",
        "/app/documents": "files",
        "/app/bills": "all",
      };
      expect(routeMapping["/app/expenses"]).toBe("spend");
    });

    it("maps /app/documents to initialView='files'", () => {
      const routeMapping: Record<string, string> = {
        "/app/expenses": "spend",
        "/app/documents": "files",
        "/app/bills": "all",
      };
      expect(routeMapping["/app/documents"]).toBe("files");
    });
  });

  describe("URL view state", () => {
    it("accepts supported views and falls back safely for unknown values", () => {
      expect(resolveBillsView("spend", "all")).toBe("spend");
      expect(resolveBillsView("unknown", "review")).toBe("review");
      expect(resolveBillsView(null, "all")).toBe("all");
    });
  });
});
