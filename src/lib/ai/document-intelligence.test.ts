import { describe, expect, it } from "vitest";
import { parseDocumentIntelligence } from "@/lib/ai/document-intelligence";

describe("document intelligence validation", () => {
  it("accepts a typed invoice candidate with decimal strings", () => {
    const parsed = parseDocumentIntelligence({
      classification: "invoice",
      summary: "Monthly internet service invoice.",
      vendorName: "Verizon Business",
      currency: "usd",
      renewalDate: null,
      noticePeriodDays: null,
      confidence: 0.93,
      invoice: {
        invoiceNumber: "INV-42",
        invoiceDate: "2026-07-01",
        dueDate: "2026-07-31",
        servicePeriodStart: "2026-06-01",
        servicePeriodEnd: "2026-06-30",
        accountNumberLast4: "4821",
        purchaseOrderNumber: null,
        subtotal: "1,000.00",
        taxTotal: "82.50",
        feeTotal: "0.00",
        creditTotal: "0.00",
        totalAmount: "1082.50",
        amountDue: "1082.50",
        lineItems: [{ description: "Fiber service", quantity: "1", unitPrice: "1000", amount: "1000.00", category: "internet", servicePeriodStart: null, servicePeriodEnd: null }],
      },
      evidence: [{ field: "invoice.totalAmount", quote: "Total $1,082.50" }],
    });
    expect(parsed.currency).toBe("USD");
    expect(parsed.invoice?.subtotal).toBe("1000.00");
    expect(parsed.invoice?.lineItems[0].unitPrice).toBe("1000");
  });

  it("rejects JSON numbers for money so binary floats cannot become authoritative", () => {
    const parsed = parseDocumentIntelligence({
      classification: "invoice",
      summary: "Invoice",
      vendorName: "Vendor",
      currency: "USD",
      renewalDate: null,
      noticePeriodDays: null,
      confidence: 0.9,
      invoice: { invoiceNumber: null, invoiceDate: null, dueDate: null, servicePeriodStart: null, servicePeriodEnd: null, accountNumberLast4: null, purchaseOrderNumber: null, subtotal: 10.25, taxTotal: null, feeTotal: null, creditTotal: null, totalAmount: 10.25, amountDue: null, lineItems: [] },
      evidence: [],
    });
    expect(parsed.invoice?.subtotal).toBeNull();
    expect(parsed.invoice?.totalAmount).toBeNull();
  });
});
