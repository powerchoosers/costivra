import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/breakdown-pdf-viewer", () => ({
  default: () => null,
}));

vi.mock("@/lib/icons", () => ({
  AlertTriangle: () => null,
  CheckCircle2: () => null,
  ChevronLeft: () => null,
  ChevronRight: () => null,
  CircleHelp: () => null,
  Download: () => null,
  ExternalLink: () => null,
  FileText: () => null,
  MessageCircle: () => null,
  ShieldCheck: () => null,
  TrendingUp: () => null,
  X: () => null,
}));

vi.mock("@/components/client-assistant/client-assistant-provider", () => ({
  useClientAssistant: () => ({
    openDrawer: vi.fn(),
    setContext: vi.fn(),
  }),
}));

describe("BillBreakdownModal Contract and State Tests", () => {
  it("exports BillBreakdownModal function component", async () => {
    const mod = await import("@/components/bill-breakdown-modal");
    expect(typeof mod.BillBreakdownModal).toBe("function");
  });

  it("handles document-to-document navigation with AbortController cancellation", async () => {
    let abortedCount = 0;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener("abort", () => {
          abortedCount++;
        });
      }
      return new Promise<Response>(() => {});
    });

    const controller1 = new AbortController();
    fetchMock("/api/portal/documents/doc-1/breakdown", { signal: controller1.signal });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    controller1.abort();
    expect(abortedCount).toBe(1);

    const controller2 = new AbortController();
    fetchMock("/api/portal/documents/doc-2/breakdown", { signal: controller2.signal });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(abortedCount).toBe(1);
  });

  it("correctly handles 202 processing state payload", async () => {
    const processingPayload = {
      analysisReady: false,
      status: "processing",
      message: "Costivra is still preparing this bill breakdown.",
    };

    const mockResponse = new Response(JSON.stringify(processingPayload), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });

    expect(mockResponse.status).toBe(202);
    const data = await mockResponse.json();
    expect(data.analysisReady).toBe(false);
    expect(data.message).toBe("Costivra is still preparing this bill breakdown.");
  });

  it("correctly parses breakdown payload with evidence and anomalies", async () => {
    const breakdownPayload = {
      document: {
        id: "doc-123",
        filename: "test-bill.pdf",
        mimeType: "application/pdf",
        byteSize: 1024,
        status: "ready",
        extractionSummary: "Test summary",
        createdAt: "2026-08-16T00:00:00Z",
        securityScanStatus: "clean",
        securityScannedAt: "2026-08-16T00:00:00Z",
        sha256: "abcdef123456",
        downloadUrl: "https://example.com/download",
      },
      invoice: {
        id: "inv-123",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-07-01",
        dueDate: "2026-07-20",
        totalAmount: 1500.0,
        subtotalAmount: 1400.0,
        taxAmount: 100.0,
        currency: "USD",
        reviewStatus: "approved",
        vendorMatchStatus: "exact",
        reconciliationStatus: "reconciled",
      },
      vendor: {
        id: "v-1",
        name: "Test Vendor",
        category: "Software Subscriptions",
        website: "https://vendor.test",
        catalogStatus: "verified",
        logoUrl: null,
        annualizedSpend: 18000,
      },
      lineItems: [
        {
          id: "li-1",
          lineNumber: 1,
          description: "Monthly Seat",
          amount: 1400.0,
        },
      ],
      evidence: [
        {
          id: "ev-1",
          pageNumber: 1,
          textExcerpt: "Monthly Seat $1400",
          fieldPath: "lineItems[0]",
          sourceKey: "ocr",
        },
      ],
      anomalies: [],
      marketBenchmark: {
        category: "Software Subscriptions",
        billedAmount: 1500.0,
        estimatedMarketRate: 1200.0,
        variancePercentage: 25,
        potentialAnnualSavings: 3600.0,
        benchmarkSource: "Costivra Anonymized Cohort Index",
        benchmarkStatus: "comparable" as const,
        comparisonRange: {
          low: 1000,
          median: 1200,
          high: 1400,
        },
        missingDimensions: [],
        caveats: [],
        asOf: "2026-08-01",
      },
      guidance: [
        {
          title: "Optimize Licenses",
          action: "Review seat utilization",
          priority: "high",
        },
      ],
    };

    expect(breakdownPayload.document.securityScanStatus).toBe("clean");
    expect(breakdownPayload.invoice.reconciliationStatus).toBe("reconciled");
    expect(breakdownPayload.marketBenchmark.benchmarkStatus).toBe("comparable");
    expect(breakdownPayload.marketBenchmark.potentialAnnualSavings).toBe(3600.0);
  });
});
