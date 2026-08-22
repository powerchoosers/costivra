import { describe, expect, it } from "vitest";
import { buildVendorSpendHistory } from "@/lib/portal/vendor-spend-history";
import type { PortalExpense, PortalInvoice } from "@/lib/portal/types";

const invoice = (overrides: Partial<PortalInvoice>): PortalInvoice => ({
  id: "invoice-1",
  documentId: "document-1",
  vendorName: "Northstar Telecom",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-01-15",
  dueDate: null,
  currency: "USD",
  totalAmount: 100,
  reviewStatus: "reviewed",
  vendorMatchStatus: "exact",
  workspaceCustomerMatchStatus: "matched",
  expenseAccountMatchStatus: "matched",
  serviceLocationMatchStatus: "matched",
  reconciliationStatus: "reconciled",
  lineItemCount: 1,
  vendorId: "vendor-1",
  servicePeriodStart: "2026-01-01",
  servicePeriodEnd: "2026-01-31",
  accountNumberLast4: null,
  purchaseOrderNumber: null,
  subtotal: 100,
  taxTotal: 0,
  feeTotal: 0,
  creditTotal: 0,
  previousBalance: null,
  paymentsAndCredits: null,
  balanceForward: null,
  currentCharges: 100,
  currentPeriodCredits: 0,
  amountDue: 100,
  extractionConfidence: 0.99,
  reconciliationDifference: 0,
  reviewPriority: "normal",
  reviewNotes: null,
  expenseCategory: "Telecom",
  expenseAccountId: null,
  locationId: null,
  locationName: null,
  energyService: null,
  updatedAt: "2026-01-16T00:00:00Z",
  ...overrides,
});

const expense = (overrides: Partial<PortalExpense>): PortalExpense => ({
  id: "expense-1",
  vendorId: "vendor-1",
  vendorName: "Northstar Telecom",
  category: "Telecom",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  amount: 100,
  priorPeriodAmount: null,
  status: "reviewed",
  documentId: null,
  invoiceId: null,
  expenseAccountId: null,
  locationId: null,
  locationName: null,
  updatedAt: "2026-02-01T00:00:00Z",
  ...overrides,
});

describe("buildVendorSpendHistory", () => {
  it("sorts usable invoices chronologically by invoice date", () => {
    const history = buildVendorSpendHistory([
      invoice({ id: "invoice-2", invoiceNumber: "INV-2", invoiceDate: "2026-03-15", currentCharges: 300 }),
      invoice({ id: "invoice-1", invoiceNumber: "INV-1", invoiceDate: "2026-01-15", currentCharges: 100 }),
      invoice({ id: "invoice-3", invoiceNumber: "INV-3", invoiceDate: "2026-02-15", currentCharges: 200 }),
    ], [], { currency: "USD", limit: null });

    expect(history.source).toBe("invoice");
    expect(history.points.map((point) => point.id)).toEqual(["invoice-1", "invoice-3", "invoice-2"]);
    expect(history.points.map((point) => point.amount)).toEqual([100, 200, 300]);
  });

  it("uses current charges before invoice total and avoids amount due carry-forward", () => {
    const history = buildVendorSpendHistory([
      invoice({ currentCharges: 125, totalAmount: 150, amountDue: 425 }),
    ], [], { currency: "USD" });

    expect(history.points[0]).toMatchObject({ amount: 125, dateSource: "invoice_date" });
  });

  it("uses the service-period end only when the invoice date is missing", () => {
    const history = buildVendorSpendHistory([
      invoice({ invoiceDate: null, servicePeriodEnd: "2026-04-30" }),
    ], [], { currency: "USD" });

    expect(history.points[0]).toMatchObject({ date: "2026-04-30", dateSource: "service_period" });
  });

  it("falls back when an extracted invoice date is not a real calendar date", () => {
    const history = buildVendorSpendHistory([
      invoice({ invoiceDate: "2026-02-31", servicePeriodEnd: "2026-02-28" }),
    ], [], { currency: "USD" });

    expect(history.points[0]).toMatchObject({ date: "2026-02-28", dateSource: "service_period" });
  });

  it("does not combine currencies and falls back to normalized expenses when needed", () => {
    const history = buildVendorSpendHistory([
      invoice({ currency: "CAD", totalAmount: 120, currentCharges: 120 }),
    ], [expense({ id: "expense-1", periodEnd: "2026-02-01", amount: 90 })], { currency: "USD" });

    expect(history.excludedCurrencyCount).toBe(1);
    expect(history.source).toBe("expense");
    expect(history.points).toMatchObject([{ id: "expense-1", amount: 90, source: "expense" }]);
  });

  it("honors the latest-record limit after sorting", () => {
    const history = buildVendorSpendHistory([
      invoice({ id: "invoice-1", invoiceDate: "2026-01-15" }),
      invoice({ id: "invoice-2", invoiceDate: "2026-02-15" }),
      invoice({ id: "invoice-3", invoiceDate: "2026-03-15" }),
    ], [], { currency: "USD", limit: 2 });

    expect(history.points.map((point) => point.id)).toEqual(["invoice-2", "invoice-3"]);
  });
});
