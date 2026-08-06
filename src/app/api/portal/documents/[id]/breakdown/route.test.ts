import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { GET } from "@/app/api/portal/documents/[id]/breakdown/route";

type QueryResult = { data: unknown; error: unknown };

function maybeSingleQuery(result: QueryResult) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  return query;
}

function orderedRowsQuery(rows: unknown[]) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn().mockResolvedValue({ data: rows, error: null });
  return query;
}

function limitedRowsQuery(rows: unknown[]) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  return query;
}

function inRowsQuery(rows: unknown[]) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.in = vi.fn().mockResolvedValue({ data: rows, error: null });
  return query;
}

const organizationId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";

function request() {
  return GET(
    new Request(`https://costivra.ai/api/portal/documents/${documentId}/breakdown`),
    { params: Promise.resolve({ id: documentId }) },
  );
}

function successfulDb() {
  const queries = {
    documents: maybeSingleQuery({
      data: {
        id: documentId,
        original_filename: "txu-invoice.pdf",
        mime_type: "application/pdf",
        byte_size: 2_048,
        status: "needs_review",
        extraction_summary: "Commercial electricity invoice",
        created_at: "2026-08-06T03:52:12.000Z",
        sha256: "a".repeat(64),
        security_scan_status: "clean",
        security_scanned_at: "2026-08-06T03:52:12.000Z",
      },
      error: null,
    }),
    invoices: maybeSingleQuery({
      data: {
        id: "33333333-3333-4333-8333-333333333333",
        invoice_number: "TXU-2026-06",
        invoice_date: "2026-06-02",
        due_date: "2026-06-20",
        total_amount: "2472.37",
        subtotal: "2472.37",
        tax_total: "0",
        currency: "USD",
        review_status: "needs_review",
        vendor_match_status: "exact",
        vendor_match_confidence: "0.99",
        reconciliation_status: "incomplete",
        organization_vendor_id: "44444444-4444-4444-8444-444444444444",
        review_issue_codes: ["reconciliation_incomplete"],
        metadata: {
          categoryIntelligence: {
            categoryKey: "commercial-electricity-supply",
            packVersion: "2026.08.1",
            confidence: 0.98,
          },
        },
        expense_category: "Commercial Electricity Supply",
        category_confidence: "0.98",
      },
      error: null,
    }),
    organization_vendors: maybeSingleQuery({
      data: {
        id: "44444444-4444-4444-8444-444444444444",
        annualized_spend: "29668.44",
        display_name_override: "TXU Energy Dallas",
        category_override: null,
        website_override: null,
        vendors: {
          id: "55555555-5555-4555-8555-555555555555",
          canonical_name: "TXU Energy",
          category: "Commercial Electricity Supply",
          website: "https://www.txu.com",
          catalog_status: "verified",
          logo_url: null,
        },
      },
      error: null,
    }),
    invoice_line_items: orderedRowsQuery([
      {
        id: "66666666-6666-4666-8666-666666666666",
        line_number: 1,
        description: "Energy Charge",
        amount: "1287.90",
        quantity: "15900",
        unit_price: "0.081",
      },
    ]),
    category_analysis_runs: maybeSingleQuery({
      data: {
        id: "88888888-8888-4888-8888-888888888888",
        pack_version: "2026.08.1",
        findings: [],
        missing_dimensions: ["utility_territory", "load_factor"],
        calculations: {
          benchmarkStatus: "insufficient_data",
          benchmarkMissingDimensions: ["utility_territory", "load_factor"],
        },
        confidence: "0.98",
        created_at: "2026-08-06T03:52:13.000Z",
      },
      error: null,
    }),
    invoice_line_item_classifications: inRowsQuery([
      {
        invoice_line_item_id: "66666666-6666-4666-8666-666666666666",
        canonical_code: "energy_charge",
        confidence: "1",
        expert_pack_version: "2026.08.1",
        evidence_reference_ids: ["77777777-7777-4777-8777-777777777777"],
        review_status: "auto_approved",
      },
    ]),
    evidence_references: limitedRowsQuery([
      {
        id: "77777777-7777-4777-8777-777777777777",
        page_number: 1,
        text_excerpt: "Energy Charge 15,900 kWh @ $0.081",
        field_path: "line_items[0]",
      },
    ]),
  };

  return {
    from: vi.fn((table: keyof typeof queries) => queries[table]),
  };
}

describe("GET /api/portal/documents/[id]/breakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a tenant-scoped stored breakdown with clean scan status and no-store caching", async () => {
    const db = successfulDb();
    requirePortalContext.mockResolvedValue({ db, organizationId });

    const response = await request();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(payload.document).toEqual(
      expect.objectContaining({
        id: documentId,
        filename: "txu-invoice.pdf",
        securityScanStatus: "clean",
        securityScannedAt: "2026-08-06T03:52:12.000Z",
        sha256: "a".repeat(64),
      }),
    );
    expect(payload.invoice).toEqual(
      expect.objectContaining({
        reviewStatus: "needs_review",
        reconciliationStatus: "incomplete",
        totalAmount: 2472.37,
      }),
    );
    expect(payload.vendor.name).toBe("TXU Energy Dallas");
    expect(payload.evidence).toHaveLength(1);
    expect(payload.lineItems).toHaveLength(1);
    expect(payload.lineItemExplanations[0]).toEqual(
      expect.objectContaining({
        canonicalCode: "energy_charge",
        evidenceIds: ["77777777-7777-4777-8777-777777777777"],
      }),
    );
    expect(payload.anomalies).toEqual([]);
    expect(payload.guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Complete Bill Reconciliation" }),
      ]),
    );
  });

  it("returns 404 when the tenant-scoped document query finds no record", async () => {
    const documents = maybeSingleQuery({ data: null, error: null });
    const db = { from: vi.fn(() => documents) };
    requirePortalContext.mockResolvedValue({ db, organizationId });

    const response = await request();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Document not found or access denied.",
    });
  });

  it("returns a truthful processing payload instead of a not-found error", async () => {
    const documents = maybeSingleQuery({
      data: {
        id: documentId,
        original_filename: "processing.pdf",
        mime_type: "application/pdf",
        byte_size: 100,
        status: "processing",
        extraction_summary: null,
        created_at: "2026-08-06T03:52:12.000Z",
        sha256: "b".repeat(64),
        security_scan_status: "clean",
        security_scanned_at: "2026-08-06T03:52:12.000Z",
      },
      error: null,
    });
    const invoices = maybeSingleQuery({ data: null, error: null });
    const db = { from: vi.fn((table: string) => table === "documents" ? documents : invoices) };
    requirePortalContext.mockResolvedValue({ db, organizationId });

    const response = await request();
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toEqual(expect.objectContaining({
      analysisReady: false,
      status: "processing",
      message: "Costivra is still reading this bill.",
    }));
  });

  it("uses a successful legacy ingestion audit event when scan columns are not present", async () => {
    const documents = maybeSingleQuery({
      data: {
        id: documentId,
        original_filename: "legacy-invoice.pdf",
        mime_type: "application/pdf",
        byte_size: 100,
        status: "ready",
        extraction_summary: "Commercial electricity invoice",
        created_at: "2026-08-06T03:52:12.000Z",
        sha256: "c".repeat(64),
      },
      error: null,
    });
    const auditEvents = maybeSingleQuery({
      data: { created_at: "2026-08-06T03:52:13.000Z" },
      error: null,
    });
    const invoices = maybeSingleQuery({ data: null, error: null });
    const db = {
      from: vi.fn((table: string) => {
        if (table === "documents") return documents;
        if (table === "audit_events") return auditEvents;
        return invoices;
      }),
    };
    requirePortalContext.mockResolvedValue({ db, organizationId });

    const response = await request();
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toEqual(expect.objectContaining({
      analysisReady: false,
      message: "Costivra is still reading this bill.",
    }));
    expect(payload.document).toEqual(expect.objectContaining({
      securityScanStatus: "clean",
      securityScannedAt: "2026-08-06T03:52:13.000Z",
    }));
  });

  it("returns a server error instead of disguising a schema/query failure as access denial", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const documents = maybeSingleQuery({
      data: null,
      error: { code: "42703", message: "column does not exist" },
    });
    const db = { from: vi.fn(() => documents) };
    requirePortalContext.mockResolvedValue({ db, organizationId });

    const response = await request();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      error: "Document analysis could not be loaded.",
      code: "DOCUMENT_BREAKDOWN_QUERY_FAILED",
      traceId: expect.any(String),
    }));
    expect(errorSpy).toHaveBeenCalledWith(
      "Document breakdown database failure",
      expect.objectContaining({ documentId, organizationId, code: "42703" }),
    );
    errorSpy.mockRestore();
  });
});
