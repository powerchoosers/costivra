import { describe, expect, it, vi } from "vitest";
import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";

const mocks = vi.hoisted(() => ({
  resolveVendorAndCategory: vi.fn(),
  resolveCategory: vi.fn(),
  normalizeLineItems: vi.fn(),
  analyzeBill: vi.fn(),
  benchmark: vi.fn(),
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
      accountNumberLast4: "1234",
      purchaseOrderNumber: null,
      subtotal: "100.00",
      taxTotal: "8.25",
      feeTotal: "0.00",
      creditTotal: "0.00",
      totalAmount: "108.25",
      amountDue: "108.25",
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
    mocks.normalizeLineItems.mockResolvedValue([
      {
        lineItemId: "line-1",
        canonicalCode: "internet_access",
        confidence: 0.99,
        reviewRequired: false,
        packVersion: "2026.08.1",
        evidenceIds: [],
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
      expect.objectContaining({ category_id: "category-telecom", expert_pack_version: "2026.08.1" }),
    ]);
    expect(analysis).toMatchObject({
      category_id: "category-telecom",
      pack_version: "2026.08.1",
    });
  });
});
