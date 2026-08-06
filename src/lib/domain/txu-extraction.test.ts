import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocumentIntelligence } from "@/lib/ai/document-intelligence";
import { reconcileInvoice } from "@/lib/domain/invoices";

const source = (name: string) => readFileSync(
  new URL(`../../../tests/fixtures/invoices/${name}`, import.meta.url),
  "utf8",
);

const evidence = (field: string, quote: string, pageNumber: number) => ({ field, quote, pageNumber });

function parsedCaseA() {
  return parseDocumentIntelligence({
    classification: "invoice",
    summary: "Synthetic TXU statement with a paid prior balance.",
    vendorName: "TXU Energy",
    currency: "USD",
    renewalDate: null,
    noticePeriodDays: null,
    confidence: 0.95,
    invoice: {
      invoiceNumber: "SYN-A-054654",
      invoiceDate: "2026-06-02",
      dueDate: "2026-06-18",
      servicePeriodStart: "2026-04-24",
      servicePeriodEnd: "2026-05-25",
      accountNumberLast4: "5124",
      purchaseOrderNumber: null,
      subtotal: null,
      taxTotal: null,
      feeTotal: null,
      creditTotal: "0.00",
      previousBalance: "3520.47",
      paymentsAndCredits: "3520.47",
      balanceForward: "0.00",
      currentCharges: "2472.37",
      currentPeriodCredits: "0.00",
      totalAmount: "2472.37",
      amountDue: "2472.37",
      energyService: {
        customerName: "Northstar Laundry Services LLC",
        serviceAddress: "8301 Sample Row, Dallas, TX 75247",
        serviceIdentifier: "TX-ESI-0001",
        meterId: "METER-4491",
        productName: "Business Sure",
        utilityTerritory: "Oncor",
        billingDays: 32,
        usageKwh: "15900",
        actualDemandKw: "72",
        billedDemandKw: "73",
        meterMultiplier: null,
        averagePricePerKwh: "0.141",
        readDateStart: "2026-04-24",
        readDateEnd: "2026-05-25",
      },
      lineItems: [
        { description: "Supply charge", quantity: null, unitPrice: null, amount: "1200.00", category: "supply", servicePeriodStart: null, servicePeriodEnd: null },
        { description: "Oncor delivery and transmission", quantity: null, unitPrice: null, amount: "942.54", category: "delivery", servicePeriodStart: null, servicePeriodEnd: null },
        { description: "Taxes and other current charges", quantity: null, unitPrice: null, amount: "329.83", category: "tax", servicePeriodStart: null, servicePeriodEnd: null },
      ],
    },
    evidence: [
      evidence("invoice.previousBalance", "Previous balance: $3,520.47", 1),
      evidence("invoice.paymentsAndCredits", "Payments and credits: $3,520.47", 1),
      evidence("invoice.balanceForward", "Balance forward: $0.00", 1),
      evidence("invoice.currentCharges", "Current Charges: $2,472.37", 2),
      evidence("invoice.amountDue", "Amount due: $2,472.37", 2),
      evidence("invoice.energyService.usageKwh", "Usage: 15,900 kWh", 3),
      evidence("invoice.energyService.actualDemandKw", "Actual demand: 72 kW", 3),
      evidence("invoice.energyService.billedDemandKw", "Billed demand: 73 kW", 3),
      evidence("invoice.energyService.utilityTerritory", "Utility territory: Oncor", 3),
      evidence("invoice.energyService.productName", "Product: Business Sure", 3),
      evidence("invoice.energyService.serviceAddress", "Service address: 8301 Sample Row, Dallas, TX 75247", 1),
      evidence("invoice.energyService.serviceIdentifier", "Service identifier: TX-ESI-0001", 3),
      evidence("invoice.energyService.meterId", "Meter ID: METER-4491", 3),
      evidence("invoice.energyService.averagePricePerKwh", "Average price: $0.141 per kWh", 3),
    ],
  });
}

function parsedCaseB() {
  return parseDocumentIntelligence({
    classification: "statement",
    summary: "Synthetic TXU statement with a carried-forward balance.",
    vendorName: "TXU Energy",
    currency: "USD",
    renewalDate: null,
    noticePeriodDays: null,
    confidence: 0.95,
    invoice: {
      invoiceNumber: "SYN-B-055478",
      invoiceDate: "2026-06-12",
      dueDate: "2026-07-01",
      servicePeriodStart: "2026-05-10",
      servicePeriodEnd: "2026-06-08",
      accountNumberLast4: "7788",
      purchaseOrderNumber: null,
      subtotal: null,
      taxTotal: null,
      feeTotal: null,
      creditTotal: "0.00",
      previousBalance: "2472.37",
      paymentsAndCredits: "0.00",
      balanceForward: "2472.37",
      currentCharges: "2050.80",
      currentPeriodCredits: "0.00",
      totalAmount: "2050.80",
      amountDue: "4523.17",
      energyService: {
        customerName: "Northstar Laundry Services LLC",
        serviceAddress: "4100 Sample Avenue, Houston, TX 77002",
        serviceIdentifier: "TX-ESI-0002",
        meterId: "METER-7712",
        productName: "Business Flex Rewards",
        utilityTerritory: "CenterPoint",
        billingDays: 30,
        usageKwh: "8766",
        actualDemandKw: "54",
        billedDemandKw: "54",
        meterMultiplier: null,
        averagePricePerKwh: "0.212",
        readDateStart: "2026-05-10",
        readDateEnd: "2026-06-08",
      },
      lineItems: [
        { description: "Supply charge", quantity: null, unitPrice: null, amount: "1000.00", category: "supply", servicePeriodStart: null, servicePeriodEnd: null },
        { description: "CenterPoint delivery and transmission", quantity: null, unitPrice: null, amount: "850.80", category: "delivery", servicePeriodStart: null, servicePeriodEnd: null },
        { description: "Taxes and other current charges", quantity: null, unitPrice: null, amount: "200.00", category: "tax", servicePeriodStart: null, servicePeriodEnd: null },
      ],
    },
    evidence: [
      evidence("invoice.previousBalance", "Previous balance: $2,472.37", 1),
      evidence("invoice.paymentsAndCredits", "Payments and credits: $0.00", 1),
      evidence("invoice.balanceForward", "Balance forward: $2,472.37", 1),
      evidence("invoice.currentCharges", "Current Charges: $2,050.80", 2),
      evidence("invoice.amountDue", "Amount due: $4,523.17", 2),
      evidence("invoice.energyService.usageKwh", "Usage: 8,766 kWh", 3),
      evidence("invoice.energyService.utilityTerritory", "Utility territory: CenterPoint", 3),
      evidence("invoice.energyService.productName", "Product: Business Flex Rewards", 3),
    ],
  });
}

describe("synthetic TXU extraction contracts", () => {
  it("keeps a paid prior balance out of current-period credits and reconciles Case A", () => {
    expect(source("txu-case-a-paid-prior-balance.txt")).toContain("[[COSTIVRA_PAGE 3 of 3]]");
    const result = parsedCaseA();
    const invoice = result.invoice!;
    expect(invoice).toMatchObject({ previousBalance: "3520.47", paymentsAndCredits: "3520.47", balanceForward: "0.00", currentCharges: "2472.37", currentPeriodCredits: "0.00", amountDue: "2472.37" });
    expect(invoice.creditTotal).toBe("0.00");
    expect(invoice.energyService?.usageKwh).toBe("15900");
    expect(invoice.energyService).not.toHaveProperty("annualUsageKwh");
    const reconciliation = reconcileInvoice(invoice);
    expect(reconciliation.status).toBe("reconciled");
    expect(reconciliation.checks.map((check) => check.name)).toEqual([
      "line_items_to_current_charges",
      "balance_forward_plus_current_charges_to_amount_due",
      "previous_balance_minus_payments_to_balance_forward",
    ]);
    expect(result.evidence.filter((item) => item.field.startsWith("invoice.energyService")).every((item) => item.pageNumber !== null && item.pageNumber !== undefined)).toBe(true);
  });

  it("keeps carried-forward balance separate from current charges and reconciles Case B", () => {
    expect(source("txu-case-b-carried-forward.txt")).toContain("[[COSTIVRA_PAGE 1 of 3]]");
    const invoice = parsedCaseB().invoice!;
    expect(invoice).toMatchObject({ previousBalance: "2472.37", paymentsAndCredits: "0.00", balanceForward: "2472.37", currentCharges: "2050.80", amountDue: "4523.17", totalAmount: "2050.80" });
    expect(reconcileInvoice(invoice).status).toBe("reconciled");
    expect(invoice.energyService).toMatchObject({ utilityTerritory: "CenterPoint", productName: "Business Flex Rewards", usageKwh: "8766", actualDemandKw: "54", billedDemandKw: "54", averagePricePerKwh: "0.212" });
  });
});
