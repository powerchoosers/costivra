import { describe, expect, it, vi } from "vitest";
import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";

const mocks = vi.hoisted(() => ({
  resolveVendorAndCategory: vi.fn(),
  resolveCategory: vi.fn(),
}));

vi.mock("@/lib/vendors/resolve", () => ({
  resolveVendorAndCategory: mocks.resolveVendorAndCategory,
}));

vi.mock("@/lib/category-intelligence/service", () => ({
  categoryIntelligence: {
    resolveCategory: mocks.resolveCategory,
  },
}));

import { createContractRecordFromExtraction } from "./contract-record";

function contractIntelligence(): DocumentIntelligence {
  return {
    classification: "contract",
    summary: "Managed fiber agreement for two service locations.",
    vendorName: "Acme Fiber",
    customerName: "Apex Logistics Group",
    serviceAddress: "100 MAIN ST AUSTIN TX 78701",
    currency: "USD",
    totalAmount: null,
    renewalDate: "2029-01-01",
    noticePeriodDays: 60,
    paymentTermsDays: null,
    contractDetails: {
      serviceAddresses: ["100 MAIN ST AUSTIN TX 78701", "200 MAIN ST AUSTIN TX 78701"],
      effectiveDate: "2026-01-01",
      expirationDate: "2029-01-01",
      termMonths: 36,
      autoRenewal: true,
      terminationFee: "1500.00",
      rateOrPrice: "850.00",
      pricingUnit: "monthly",
      minimumCommitmentQuantity: null,
      minimumCommitmentUnit: null,
      serviceIdentifiers: ["CIRCUIT-1"],
    },
    invoice: null,
    confidence: 0.94,
    evidence: [],
  };
}

function database(inserts: Record<string, unknown>[]) {
  const organizations = {
    select: () => organizations,
    eq: () => organizations,
    maybeSingle: async () => ({ data: { currency: "USD" }, error: null }),
  };
  const contracts = {
    insert: (payload: unknown) => {
      inserts.push(payload as Record<string, unknown>);
      return {
        select: () => ({ single: async () => ({ data: { id: "contract-1" }, error: null }) }),
      };
    },
  };
  return {
    from(table: string) {
      if (table === "organizations") return organizations;
      if (table === "contracts") return contracts;
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("createContractRecordFromExtraction", () => {
  it("persists a draft contract with all source-backed service locations and terms", async () => {
    mocks.resolveVendorAndCategory.mockResolvedValue({
      organizationVendorId: "organization-vendor-1",
      categoryName: "Telecom & Internet",
      categoryId: "category-1",
      confidence: 0.98,
      resolutionMethod: "organization_exact_name_match",
      matchStatus: "exact",
      isCandidate: false,
      needsReview: false,
    });
    mocks.resolveCategory.mockResolvedValue({
      key: "telecom-connectivity",
      displayName: "Telecom & Connectivity",
      expertPackVersion: "2026.08.1",
      source: "exact",
      confidence: 0.99,
    });
    const inserts: Record<string, unknown>[] = [];

    const result = await createContractRecordFromExtraction({
      db: database(inserts) as never,
      organizationId: "org-1",
      documentId: "document-1",
      filename: "acme-fiber-agreement.pdf",
      intelligence: contractIntelligence(),
      locationIds: ["location-100", "location-200"],
      locationResolutions: [
        {
          address: "100 MAIN ST AUSTIN TX 78701",
          sourceField: "serviceAddress",
          resolution: { locationId: "location-100", serviceLocationMatchStatus: "matched", createdLocationId: "location-100", issueCodes: ["service_location_created_from_document"] },
        },
        {
          address: "200 MAIN ST AUSTIN TX 78701",
          sourceField: "contractDetails.serviceAddresses[1]",
          resolution: { locationId: "location-200", serviceLocationMatchStatus: "matched", createdLocationId: "location-200", issueCodes: ["service_location_created_from_document"] },
        },
      ],
    });

    expect(result).toMatchObject({ contractId: "contract-1", needsReview: true, locationIds: ["location-100", "location-200"] });
    expect(inserts[0]).toMatchObject({
      organization_id: "org-1",
      organization_vendor_id: "organization-vendor-1",
      document_id: "document-1",
      location_id: "location-100",
      title: "Acme Fiber agreement",
      category: "Telecom & Connectivity",
      start_date: "2026-01-01",
      end_date: "2029-01-01",
      notice_period_days: 60,
      currency: "USD",
      status: "draft",
      auto_renews: true,
      metadata: expect.objectContaining({
        locationIds: ["location-100", "location-200"],
        extractionFacts: expect.objectContaining({
          contractDetails: expect.objectContaining({ termMonths: 36, rateOrPrice: "850.00" }),
        }),
        sourceAddresses: expect.arrayContaining([
          expect.objectContaining({ sourceField: "serviceAddress", locationId: "location-100" }),
          expect.objectContaining({ sourceField: "contractDetails.serviceAddresses[1]", locationId: "location-200" }),
        ]),
      }),
    });
  });

  it("does not create a contract or vendor relationship when the vendor cannot be matched", async () => {
    mocks.resolveCategory.mockClear();
    mocks.resolveVendorAndCategory.mockResolvedValue({
      organizationVendorId: null,
      categoryName: null,
      categoryId: null,
      confidence: 0,
      resolutionMethod: "enrichment_below_threshold",
      matchStatus: "unmatched",
      isCandidate: false,
      needsReview: true,
    });
    const inserts: Record<string, unknown>[] = [];

    const result = await createContractRecordFromExtraction({
      db: database(inserts) as never,
      organizationId: "org-1",
      documentId: "document-2",
      filename: "unknown-agreement.pdf",
      intelligence: { ...contractIntelligence(), vendorName: "Unknown Supplier" },
      locationIds: [],
      locationResolutions: [],
    });

    expect(result).toMatchObject({ contractId: null, needsReview: true, issueCodes: ["contract_vendor_unmatched"] });
    expect(inserts).toHaveLength(0);
    expect(mocks.resolveCategory).not.toHaveBeenCalled();
  });
});
