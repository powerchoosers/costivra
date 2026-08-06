import { describe, expect, it } from "vitest";
import { resolveInvoiceIdentity, normalizeAddress } from "@/lib/domain/invoice-matching";
import type { InvoiceCandidate } from "@/lib/domain/invoices";

const candidate: InvoiceCandidate = {
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
    customerName: "Fabrikam Supply of Houston LLC",
    serviceAddress: "8301 Ambassador Row, Dallas, TX 75247-4707",
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
  lineItems: [],
};

describe("invoice identity matching", () => {
  it("does not match by vendor alone and keeps the customer/location mismatch visible", () => {
    const result = resolveInvoiceIdentity({
      candidate,
      workspaceNames: ["Apex Logistics Group"],
      accounts: [{ id: "account-1", external_account_reference: "TXU-8849102-DAL" }],
      locations: [{ id: "location-1", name: "Dallas Distribution Hub", address: { street: "7500 John W Carpenter Fwy", city: "Dallas", state: "TX", postal_code: "75247" } }],
    });
    expect(result.expenseAccountMatchStatus).toBe("unmatched");
    expect(result.serviceLocationMatchStatus).toBe("unmatched");
    expect(result.workspaceCustomerMatchStatus).toBe("unmatched");
    expect(result.expenseAccountId).toBeNull();
    expect(result.locationId).toBeNull();
    expect(result.issueCodes).toEqual([
      "workspace_customer_name_mismatch",
      "expense_account_unmatched",
      "service_identifier_unmatched",
      "service_location_unmatched",
    ]);
  });

  it("matches only when allowlisted account and address evidence agree", () => {
    const result = resolveInvoiceIdentity({
      candidate,
      workspaceNames: ["Apex Logistics Group"],
      accounts: [{ id: "account-1", external_account_reference: "TXU-0000005124" }],
      locations: [{ id: "location-1", name: "Service hub", address: { street: "8301 Ambassador Row", city: "Dallas", state: "TX", postal_code: "75247-4707" } }],
    });
    expect(result.expenseAccountMatchStatus).toBe("matched");
    expect(result.serviceLocationMatchStatus).toBe("matched");
    expect(result.expenseAccountId).toBe("account-1");
    expect(result.locationId).toBe("location-1");
    expect(result.issueCodes).toContain("workspace_customer_name_mismatch");
    expect(result.issueCodes).not.toContain("expense_account_unmatched");
  });

  it("does not collapse distinct addresses that only share a city and postal code", () => {
    expect(normalizeAddress("8301 Ambassador Row, Dallas, TX 75247")).not.toBe(
      normalizeAddress("7500 John W Carpenter Fwy, Dallas, TX 75247"),
    );
  });
});
