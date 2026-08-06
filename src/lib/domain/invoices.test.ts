import { describe, expect, it } from "vitest";
import {
  findExactVendorMatches,
  normalizeMoney,
  reconcileInvoice,
  type InvoiceCandidate,
} from "@/lib/domain/invoices";

const base: InvoiceCandidate = {
  invoiceNumber: "INV-100",
  invoiceDate: "2026-07-31",
  dueDate: "2026-08-30",
  servicePeriodStart: "2026-07-01",
  servicePeriodEnd: "2026-07-31",
  accountNumberLast4: "4821",
  purchaseOrderNumber: null,
  subtotal: "100.00",
  taxTotal: "8.25",
  feeTotal: "1.75",
  creditTotal: "10.00",
  previousBalance: null,
  paymentsAndCredits: null,
  balanceForward: null,
  currentCharges: null,
  currentPeriodCredits: "10.00",
  totalAmount: "100.00",
  amountDue: "100.00",
  energyService: null,
  lineItems: [
    { description: "Service", quantity: "1", unitPrice: "75.00", amount: "75.00", category: null, servicePeriodStart: null, servicePeriodEnd: null },
    { description: "Support", quantity: "1", unitPrice: "25.00", amount: "25.00", category: null, servicePeriodStart: null, servicePeriodEnd: null },
  ],
};

describe("invoice money normalization", () => {
  it("normalizes exact decimal strings without binary floating point", () => {
    expect(normalizeMoney("1,234.5")).toBe("1234.50");
    expect(normalizeMoney("-10")).toBe("-10.00");
    expect(normalizeMoney(10.25)).toBeNull();
    expect(normalizeMoney("$10.25")).toBeNull();
  });
});

describe("invoice reconciliation", () => {
  it("reconciles line items and invoice components to the cent", () => {
    expect(reconcileInvoice(base)).toEqual({
      status: "reconciled",
      difference: "0.00",
      checks: [
        { name: "line_items_to_subtotal", status: "passed", difference: "0.00" },
        { name: "components_to_total", status: "passed", difference: "0.00" },
      ],
    });
  });

  it("flags a mismatch instead of silently changing the extracted total", () => {
    const result = reconcileInvoice({ ...base, totalAmount: "99.99" });
    expect(result.status).toBe("mismatch");
    expect(result.difference).toBe("0.01");
  });

  it("marks insufficient arithmetic as incomplete", () => {
    expect(reconcileInvoice({ ...base, lineItems: [], subtotal: null }).status).toBe("incomplete");
  });
});

describe("vendor matching", () => {
  const vendors = [
    { relationshipId: "verizon", canonicalName: "Verizon Business, Inc.", aliases: ["Verizon Wireless"] },
    { relationshipId: "adobe", canonicalName: "Adobe", aliases: ["Adobe Creative Cloud"] },
  ];

  it("uses only deterministic canonical names and curated aliases", () => {
    expect(findExactVendorMatches("VERIZON WIRELESS", vendors)).toEqual(["verizon"]);
    expect(findExactVendorMatches("Verizon Business LLC", vendors)).toEqual(["verizon"]);
    expect(findExactVendorMatches("Verizon-ish", vendors)).toEqual([]);
  });
});
