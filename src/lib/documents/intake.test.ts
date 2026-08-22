import { describe, expect, it, vi } from "vitest";

const persistDocumentSecurityScan = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const persistDetectedServiceLocation = vi.hoisted(() => vi.fn());
const processMocks = vi.hoisted(() => ({
  analyzeDocument: vi.fn(),
  extractDocumentText: vi.fn(),
  createInvoiceRecordFromExtraction: vi.fn(),
  createContractRecordFromExtraction: vi.fn(),
}));
vi.mock("@/lib/security/document-scan-provenance", () => ({
  persistDocumentSecurityScan,
}));
vi.mock("@/lib/domain/service-location", () => ({
  persistDetectedServiceLocation,
}));
vi.mock("@/lib/ai/document-intelligence", () => ({
  analyzeDocument: processMocks.analyzeDocument,
  analyzeImageDocument: vi.fn(),
  analyzeScannedPdf: vi.fn(),
}));
vi.mock("@/lib/documents/text-extraction", () => ({
  extractDocumentText: processMocks.extractDocumentText,
  hasMeaningfulExtractedText: (text: string) => text.replace(/\[\[COSTIVRA_PAGE\s+\d+\s+of\s+\d+\]\]/g, "").trim().length > 0,
}));
vi.mock("@/lib/documents/invoice-record", () => ({
  createInvoiceRecordFromExtraction: processMocks.createInvoiceRecordFromExtraction,
}));
vi.mock("@/lib/documents/contract-record", () => ({
  createContractRecordFromExtraction: processMocks.createContractRecordFromExtraction,
}));

import { DOCUMENT_MIME_TYPES, evidencePageNumber, ingestDocumentBuffer, persistSourceBackedServiceLocations, processDocumentBuffer, shouldUsePdfOcr, sourceBackedServiceAddresses } from "@/lib/documents/intake";

describe("ingestDocumentBuffer security boundary", () => {
  it("allows the supported PNG and JPG image types", () => {
    expect(DOCUMENT_MIME_TYPES.has("image/png")).toBe(true);
    expect(DOCUMENT_MIME_TYPES.has("image/jpeg")).toBe(true);
  });

  it("does not invent a page for scanned evidence without a trustworthy marker", () => {
    expect(evidencePageNumber("pdf_ocr", null, null)).toBeNull();
    expect(evidencePageNumber("pdf_ocr", 1, null)).toBe(1);
    expect(evidencePageNumber("native_text", null, null)).toBe(1);
    expect(evidencePageNumber("pdf_ocr", null, 4)).toBe(4);
  });

  it("routes marker-only PDFs to OCR instead of native-text extraction", () => {
    expect(shouldUsePdfOcr("application/pdf", "[[COSTIVRA_PAGE 1 of 3]]")).toBe(true);
    expect(shouldUsePdfOcr("application/pdf", "[[COSTIVRA_PAGE 1 of 1]] Invoice 42")).toBe(false);
    expect(shouldUsePdfOcr("text/plain", "")).toBe(false);
  });

  it("returns distinct top-level and contract service addresses with provenance", () => {
    expect(sourceBackedServiceAddresses({
      serviceAddress: "100 Main St, Austin, TX 78701",
      contractDetails: {
        serviceAddresses: [
          "100 MAIN ST AUSTIN TX 78701",
          "200 Main St, Austin, TX 78701",
        ],
      },
    })).toEqual([
      { address: "100 Main St, Austin, TX 78701", sourceField: "serviceAddress" },
      { address: "200 Main St, Austin, TX 78701", sourceField: "contractDetails.serviceAddresses[1]" },
    ]);
  });

  it("carries newly created contract locations into later address matches", async () => {
    persistDetectedServiceLocation.mockImplementation(async (input: { locations: Array<Record<string, unknown>>; serviceAddress: string }) => {
      const existing = input.locations.find((location) => location.address === input.serviceAddress);
      if (existing && typeof existing.id === "string") {
        return {
          locationId: existing.id,
          serviceLocationMatchStatus: "matched",
          createdLocationId: null,
          issueCodes: [],
        };
      }
      const locationId = input.serviceAddress.startsWith("100") ? "location-100" : "location-200";
      return {
        locationId,
        serviceLocationMatchStatus: "matched",
        createdLocationId: locationId,
        issueCodes: ["service_location_created_from_document"],
      };
    });

    const result = await persistSourceBackedServiceLocations({
      db: {} as never,
      organizationId: "org-1",
      documentId: "contract-1",
      sources: [
        { address: "100 MAIN ST AUSTIN TX 78701", sourceField: "serviceAddress" },
        { address: "200 MAIN ST AUSTIN TX 78701", sourceField: "contractDetails.serviceAddresses[1]" },
      ],
      locations: [],
    });

    expect(result.locationIds).toEqual(["location-100", "location-200"]);
    expect(persistDetectedServiceLocation).toHaveBeenCalledTimes(2);
    expect(persistDetectedServiceLocation.mock.calls[1]?.[0].locations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "location-100", address: "100 MAIN ST AUSTIN TX 78701" }),
    ]));
  });

  it("passes extracted contract locations into contract persistence and keeps the document review-required", async () => {
    processMocks.extractDocumentText.mockResolvedValue({ text: "Agreement text", pageCount: 2 });
    processMocks.analyzeDocument.mockResolvedValue({
      classification: "contract",
      summary: "Managed service agreement.",
      vendorName: "Acme Fiber",
      customerName: "Apex Logistics Group",
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
      currency: "USD",
      totalAmount: null,
      renewalDate: null,
      noticePeriodDays: 30,
      contractDetails: {
        serviceAddresses: ["100 MAIN ST AUSTIN TX 78701"],
        effectiveDate: "2026-01-01",
        expirationDate: "2027-01-01",
        termMonths: 12,
        autoRenewal: true,
        terminationFee: null,
        rateOrPrice: null,
        pricingUnit: null,
        minimumCommitmentQuantity: null,
        minimumCommitmentUnit: null,
        serviceIdentifiers: ["CIRCUIT-1"],
      },
      invoice: null,
      confidence: 0.92,
      evidence: [],
    });
    processMocks.createInvoiceRecordFromExtraction.mockResolvedValue(null);
    processMocks.createContractRecordFromExtraction.mockResolvedValue({
      contractId: "contract-1",
      needsReview: true,
      issueCodes: [],
      vendorMatchStatus: "exact",
      locationIds: ["location-1"],
    });
    persistDetectedServiceLocation.mockResolvedValue({
      locationId: "location-1",
      serviceLocationMatchStatus: "matched",
      createdLocationId: "location-1",
      issueCodes: ["service_location_created_from_document"],
    });

    const update = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    const db = {
      from(table: string) {
        if (table === "documents") return { update: () => update };
        if (table === "document_extraction_versions") return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "extraction-1" }, error: null }) }) }) };
        if (table === "locations") return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
        if (table === "organizations") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: "Apex Logistics Group", legal_name: null }, error: null }) }) }) };
        if (table === "audit_events") return { insert: async () => ({ error: null }) };
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const result = await processDocumentBuffer({
      db: db as never,
      documentId: "document-contract-1",
      organizationId: "org-1",
      actorType: "user",
      actorId: "user-1",
      filename: "acme-fiber-agreement.pdf",
      mimeType: "text/plain",
      buffer: Buffer.from("Agreement text"),
      auditAction: "document.uploaded",
      sha256: "a".repeat(64),
    });

    expect(result).toMatchObject({ status: "needs_review", contractRecord: { contractId: "contract-1" } });
    expect(persistDetectedServiceLocation).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "document-contract-1",
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
    }));
    expect(processMocks.createContractRecordFromExtraction).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "document-contract-1",
      locationIds: ["location-1"],
      intelligence: expect.objectContaining({ classification: "contract" }),
    }));
  });

  it("does not create a settings location from an address on an unrelated document", async () => {
    persistDetectedServiceLocation.mockClear();
    processMocks.extractDocumentText.mockResolvedValueOnce({ text: "Certificate text", pageCount: 1 });
    processMocks.analyzeDocument.mockResolvedValueOnce({
      classification: "other",
      summary: "Certificate of insurance.",
      vendorName: "Acme Insurance",
      customerName: "Apex Logistics Group",
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
      currency: null,
      totalAmount: null,
      renewalDate: null,
      noticePeriodDays: null,
      contractDetails: {
        serviceAddresses: ["100 MAIN ST AUSTIN TX 78701"],
        effectiveDate: null,
        expirationDate: null,
        termMonths: null,
        autoRenewal: null,
        terminationFee: null,
        rateOrPrice: null,
        pricingUnit: null,
        minimumCommitmentQuantity: null,
        minimumCommitmentUnit: null,
        serviceIdentifiers: [],
      },
      invoice: null,
      confidence: 0.9,
      evidence: [],
    });
    processMocks.createInvoiceRecordFromExtraction.mockResolvedValueOnce(null);
    processMocks.createContractRecordFromExtraction.mockResolvedValueOnce(null);

    const update = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    const db = {
      from(table: string) {
        if (table === "documents") return { update: () => update };
        if (table === "document_extraction_versions") return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "extraction-other-1" }, error: null }) }) }) };
        if (table === "audit_events") return { insert: async () => ({ error: null }) };
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const result = await processDocumentBuffer({
      db: db as never,
      documentId: "document-other-1",
      organizationId: "org-1",
      actorType: "user",
      actorId: "user-1",
      filename: "certificate.pdf",
      mimeType: "text/plain",
      buffer: Buffer.from("Certificate text"),
      auditAction: "document.uploaded",
      sha256: "b".repeat(64),
    });

    expect(result.status).toBe("ready");
    expect(persistDetectedServiceLocation).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "failed", "infected"] as const)(
    "refuses a %s malware result before touching persistence",
    async (status) => {
      await expect(
        ingestDocumentBuffer({
          db: {} as never,
          organizationId: "org-1",
          actorType: "service",
          filename: "invoice.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("invoice"),
          auditAction: "document.test",
          malwareScan: { status },
        }),
      ).rejects.toThrow("cannot enter extraction");
    },
  );

  it("records a clean duplicate-detection attempt against the existing document", async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "document-1", original_filename: "invoice.txt" },
      error: null,
    });
    const db = { from: vi.fn(() => query) };

    const result = await ingestDocumentBuffer({
      db: db as never,
      organizationId: "org-1",
      actorType: "service",
      filename: "invoice.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invoice"),
      auditAction: "document.test",
      malwareScan: { status: "clean", provider: "generic" },
    });

    expect(result).toEqual(expect.objectContaining({ duplicate: true, documentId: "document-1" }));
    expect(persistDocumentSecurityScan).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "document-1",
      sourceType: "duplicate_detection",
      scan: { status: "clean", provider: "generic" },
    }));
  });
});
