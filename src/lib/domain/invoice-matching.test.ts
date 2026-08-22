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

  it("matches the canonical line1 shape saved by the Settings form", () => {
    expect(normalizeAddress("6700 WANDT DR DALLAS TX 75236-2528")).toBe(
      normalizeAddress({ line1: "6700 WANDT DR", city: "DALLAS", state: "TX", postal_code: "75236-2528" }),
    );
  });

  it("matches a non-energy invoice from top-level customer and service address fields", () => {
    const result = resolveInvoiceIdentity({
      candidate: { ...candidate, energyService: null, energyServices: [] },
      customerName: "Fabrikam Supply of Houston LLC",
      serviceAddress: "8301 Ambassador Row, Dallas, TX 75247-4707",
      workspaceNames: ["Fabrikam Supply of Houston LLC"],
      accounts: [{ id: "account-1", external_account_reference: "TEL-00005124" }],
      locations: [{ id: "location-1", name: "Service hub", address: { line1: "8301 Ambassador Row", city: "Dallas", state: "TX", postal_code: "75247-4707" } }],
    });

    expect(result.workspaceCustomerMatchStatus).toBe("matched");
    expect(result.serviceLocationMatchStatus).toBe("matched");
    expect(result.locationId).toBe("location-1");
  });

  it("includes category-specific addresses and identifiers in the initial identity match", () => {
    const result = resolveInvoiceIdentity({
      candidate: {
        ...candidate,
        energyService: null,
        energyServices: [],
        serviceDetails: {
          planName: "Dedicated Internet",
          productFamily: "broadband",
          serviceAddresses: ["8301 Ambassador Row, Dallas, TX 75247-4707"],
          serviceIdentifiers: [],
          phoneNumbers: [],
          circuitIds: ["CIRCUIT-4491"],
          subscriptionIdentifiers: [],
          resourceIdentifiers: [],
          cloudAccountIdentifiers: [],
          region: null,
          bandwidthQuantity: "1000",
          bandwidthUnit: "Mbps",
          lineCount: null,
          deviceCount: null,
          seatCount: null,
          usageQuantity: null,
          usageUnit: null,
          includedUsageQuantity: null,
          includedUsageUnit: null,
          commitmentType: null,
          commitmentTermMonths: null,
        },
      },
      customerName: "Fabrikam Supply of Houston LLC",
      workspaceNames: ["Fabrikam Supply of Houston LLC"],
      accounts: [{ id: "account-1", external_account_reference: "CIRCUIT-4491" }],
      locations: [{ id: "location-1", name: "Service hub", address: { line1: "8301 Ambassador Row", city: "Dallas", state: "TX", postal_code: "75247-4707" } }],
    });

    expect(result.expenseAccountMatchStatus).toBe("matched");
    expect(result.serviceLocationMatchStatus).toBe("matched");
    expect(result.expenseAccountId).toBe("account-1");
    expect(result.locationId).toBe("location-1");
  });
});
