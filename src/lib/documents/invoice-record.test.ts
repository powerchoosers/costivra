import { describe, expect, it, vi } from "vitest";
import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";

const mocks = vi.hoisted(() => ({
  resolveVendorAndCategory: vi.fn(),
  resolveCategory: vi.fn(),
  normalizeLineItems: vi.fn(),
  analyzeBill: vi.fn(),
  benchmark: vi.fn(),
  persistServiceLocationAndMeter: vi.fn(),
}));

vi.mock("@/lib/vendors/resolve", () => ({
  resolveVendorAndCategory: mocks.resolveVendorAndCategory,
}));

vi.mock("@/lib/category-intelligence/service", () => ({
  categoryIntelligence: {
    resolveCategory: mocks.resolveCategory,
    normalizeLineItems: mocks.normalizeLineItems,
    analyzeBill: mocks.analyzeBill,
    benchmark: mocks.benchmark,
  },
}));

vi.mock("@/lib/domain/service-location", () => ({
  persistServiceLocationAndMeter: mocks.persistServiceLocationAndMeter,
}));

import { createInvoiceRecordFromExtraction } from "./invoice-record";

function invoiceIntelligence(): DocumentIntelligence {
  return {
    classification: "invoice",
    summary: "Monthly internet invoice.",
    vendorName: "Acme Fiber",
    currency: "USD",
    totalAmount: "108.25",
    renewalDate: null,
    noticePeriodDays: null,
    confidence: 0.96,
    invoice: {
      invoiceNumber: "INV-42",
      invoiceDate: "2026-08-01",
      dueDate: "2026-08-31",
      servicePeriodStart: "2026-08-01",
      servicePeriodEnd: "2026-08-31",
      accountNumberLast4: null,
      purchaseOrderNumber: null,
      subtotal: "100.00",
      taxTotal: "8.25",
      feeTotal: "0.00",
      creditTotal: "0.00",
      previousBalance: null,
      paymentsAndCredits: null,
      balanceForward: null,
      currentCharges: "100.00",
      currentPeriodCredits: "0.00",
      totalAmount: "108.25",
      amountDue: "108.25",
      energyService: null,
      lineItems: [
        {
          description: "Business fiber service",
          quantity: "1",
          unitPrice: "100.00",
          amount: "100.00",
          category: "internet",
          servicePeriodStart: "2026-08-01",
          servicePeriodEnd: "2026-08-31",
        },
      ],
    },
    evidence: [],
  };
}

describe("createInvoiceRecordFromExtraction", () => {
  it("persists one resolved category and expert-pack version across the invoice, line item, and analysis trace", async () => {
    mocks.resolveVendorAndCategory.mockResolvedValue({
      organizationVendorId: "vendor-1",
      categoryName: "Telecom & Internet",
      categoryId: "legacy-category-id",
      confidence: 0.94,
      resolutionMethod: "matched_existing",
      matchStatus: "matched",
      isCandidate: false,
    });
    mocks.resolveCategory.mockResolvedValue({
      key: "telecom-connectivity",
      displayName: "Telecom & Connectivity",
      expertPackVersion: "2026.08.1",
      source: "exact",
      confidence: 0.99,
    });
    mocks.normalizeLineItems.mockImplementationOnce(async (items: Array<{ evidenceIds?: string[] }>) => [
      {
        lineItemId: "line-1",
        canonicalCode: "internet_access",
        confidence: 0.99,
        reviewRequired: false,
        packVersion: "2026.08.1",
        evidenceIds: items[0]?.evidenceIds ?? [],
      },
    ]);
    mocks.analyzeBill.mockResolvedValue({
      packVersion: "2026.08.1",
      findings: [],
      missingFields: [],
    });
    mocks.benchmark.mockResolvedValue({
      status: "insufficient_data",
      missingDimensions: ["jurisdiction"],
    });

    const inserts: Record<string, unknown[]> = {};
    const db = {
      from(table: string) {
        if (table === "vendor_categories") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "category-telecom" }, error: null }),
              }),
            }),
          };
        }
        if (table === "invoices") {
          return {
            insert: (value: unknown) => {
              inserts.invoices = [value];
              return {
                select: () => ({
                  single: async () => ({ data: { id: "invoice-1" }, error: null }),
                }),
              };
            },
            delete: () => ({ eq: () => ({ error: null }) }),
          };
        }
        if (table === "invoice_line_items") {
          return {
            insert: (value: unknown) => {
              inserts.invoice_line_items = [value];
              return {
                select: async () => ({
                  data: [
                    {
                      id: "line-1",
                      description: "Business fiber service",
                      amount: "100.00",
                      quantity: "1",
                      unit_price: "100.00",
                    },
                  ],
                  error: null,
                }),
              };
            },
          };
        }
        if (table === "invoice_line_item_classifications" || table === "category_analysis_runs") {
          return {
            insert: async (value: unknown) => {
              inserts[table] = [value];
              return { error: null };
            },
          };
        }
        if (table === "documents") {
          return {
            update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    await createInvoiceRecordFromExtraction({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-1",
      extractionVersionId: "extraction-1",
      sourceType: "manual_upload",
      intelligence: invoiceIntelligence(),
      evidenceReferences: [
        {
          id: "evidence-line-1",
          fieldPath: "invoice.lineItems[0].amount",
          sourceKey: "line-1",
        },
      ],
    });

    const invoice = inserts.invoices[0] as { metadata: { categoryIntelligence: { categoryKey: string; packVersion: string } }; expense_category_id: string };
    const classifications = inserts.invoice_line_item_classifications[0] as Array<{ category_id: string; expert_pack_version: string }>;
    const analysis = inserts.category_analysis_runs[0] as { category_id: string; pack_version: string };

    expect(invoice.metadata.categoryIntelligence).toEqual({
      categoryKey: "telecom-connectivity",
      packVersion: "2026.08.1",
      resolutionSource: "exact",
      confidence: 0.99,
    });
    expect(invoice.expense_category_id).toBe("category-telecom");
    expect(classifications).toEqual([
      expect.objectContaining({
        category_id: "category-telecom",
        expert_pack_version: "2026.08.1",
        evidence_reference_ids: ["evidence-line-1"],
      }),
    ]);
    expect(analysis).toMatchObject({
      category_id: "category-telecom",
      pack_version: "2026.08.1",
    });
  });

  it("stores every extracted meter link while retaining category-specific facts", async () => {
    mocks.resolveVendorAndCategory.mockResolvedValue({
      organizationVendorId: "vendor-1",
      categoryName: "Electricity",
      categoryId: "energy-category",
      confidence: 0.94,
      resolutionMethod: "matched_existing",
      matchStatus: "matched",
      isCandidate: false,
    });
    mocks.resolveCategory.mockResolvedValue({
      key: "energy-utilities",
      displayName: "Energy & Utilities",
      expertPackVersion: "2026.08.1",
      source: "exact",
      confidence: 0.99,
    });
    mocks.normalizeLineItems.mockResolvedValue([]);
    mocks.analyzeBill.mockResolvedValue({ packVersion: "2026.08.1", findings: [], missingFields: [] });
    mocks.benchmark.mockResolvedValue({ status: "insufficient_data", missingDimensions: [] });
    mocks.persistServiceLocationAndMeter.mockResolvedValue({
      workspaceCustomerMatchStatus: "matched",
      expenseAccountMatchStatus: "unknown",
      serviceLocationMatchStatus: "matched",
      expenseAccountId: null,
      locationId: "location-1",
      locationIds: ["location-1"],
      issueCodes: [],
      energyMeterId: "meter-1",
      energyMeterIds: ["meter-1", "meter-2"],
      energyMeterLinks: [
        { energyMeterId: "meter-1", serviceIndex: 0, sourceKey: null },
        { energyMeterId: "meter-2", serviceIndex: 1, sourceKey: null },
      ],
      createdLocationId: null,
      createdMeterId: null,
      createdMeterIds: [],
    });

    const firstService = {
      customerName: "Apex Logistics Group",
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
      serviceIdentifier: "ESI-1",
      meterId: "METER-1",
      productName: "Commercial electric",
      utilityTerritory: "Austin Energy",
      billingDays: 31,
      usageKwh: "1000",
      actualDemandKw: null,
      billedDemandKw: null,
      meterMultiplier: "1",
      averagePricePerKwh: "0.10",
      readDateStart: "2026-08-01",
      readDateEnd: "2026-08-31",
    };
    const intelligence = invoiceIntelligence();
    intelligence.customerName = "Apex Logistics Group";
    intelligence.serviceAddress = "100 MAIN ST AUSTIN TX 78701";
    intelligence.invoice = {
      ...intelligence.invoice!,
      energyService: firstService,
      energyServices: [firstService, { ...firstService, serviceIdentifier: "ESI-2", meterId: "METER-2" }],
      serviceDetails: {
        planName: null,
        productFamily: "electricity",
        serviceAddresses: ["100 MAIN ST AUSTIN TX 78701"],
        serviceIdentifiers: ["ESI-1", "ESI-2"],
        phoneNumbers: [],
        circuitIds: [],
        subscriptionIdentifiers: [],
        resourceIdentifiers: [],
        cloudAccountIdentifiers: [],
        region: null,
        bandwidthQuantity: null,
        bandwidthUnit: null,
        lineCount: null,
        deviceCount: null,
        seatCount: null,
        usageQuantity: "1000",
        usageUnit: "kWh",
        includedUsageQuantity: null,
        includedUsageUnit: null,
        commitmentType: null,
        commitmentTermMonths: null,
      },
      lineItems: [],
    };

    const inserts: Record<string, unknown[]> = {};
    const db = {
      from(table: string) {
        if (table === "vendor_categories") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "category-energy" }, error: null }) }) }) };
        }
        if (table === "organizations") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: "Apex Logistics Group", legal_name: null }, error: null }) }) }) };
        }
        if (table === "expense_accounts" || table === "locations") {
          return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
        }
        if (table === "invoices") {
          return {
            insert: (value: unknown) => {
              inserts.invoices = [value];
              return { select: () => ({ single: async () => ({ data: { id: "invoice-energy-1" }, error: null }) }) };
            },
            delete: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        if (table === "invoice_energy_meters") {
          return { insert: async (value: unknown) => { inserts.invoice_energy_meters = value as Record<string, unknown>[]; return { error: null }; } };
        }
        if (table === "category_analysis_runs") {
          return { insert: async (value: unknown) => { inserts.category_analysis_runs = [value as Record<string, unknown>]; return { error: null }; } };
        }
        if (table === "documents") {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    await createInvoiceRecordFromExtraction({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-energy-1",
      extractionVersionId: "extraction-energy-1",
      sourceType: "manual_upload",
      intelligence,
    });

    expect(mocks.persistServiceLocationAndMeter).toHaveBeenCalledWith(expect.objectContaining({
      candidate: expect.objectContaining({ energyServices: expect.arrayContaining([expect.objectContaining({ meterId: "METER-2" })]) }),
    }));
    expect(inserts.invoices?.[0]).toMatchObject({
      location_id: "location-1",
      energy_meter_id: "meter-1",
      metadata: { extractionFacts: { energyServices: expect.any(Array), serviceDetails: expect.objectContaining({ usageUnit: "kWh" }) } },
    });
    expect(inserts.invoice_energy_meters).toEqual([
      { organization_id: "org-1", invoice_id: "invoice-energy-1", energy_meter_id: "meter-1", service_index: 0, source_key: null, is_primary: true },
      { organization_id: "org-1", invoice_id: "invoice-energy-1", energy_meter_id: "meter-2", service_index: 1, source_key: null, is_primary: false },
    ]);
  });
});
