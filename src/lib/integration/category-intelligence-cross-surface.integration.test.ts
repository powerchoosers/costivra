import { describe, expect, it } from "vitest";
import { categoryIntelligence } from "@/lib/category-intelligence/service";
import { getCategoryMonitoringGuidance } from "@/lib/vendors/category-monitoring";
import { resolveCategoryTrace } from "@/lib/workflows/category-trace";
import { buildCategoryIntelligenceReportRows } from "@/lib/category-intelligence/report-summary";

describe("Category intelligence cross-surface trace", () => {
  it("uses one draft SaaS pack across line normalization, bill review, assistant context, monitoring, opportunities, and reports", async () => {
    const resolution = await categoryIntelligence.resolveCategory({ rawCategory: "Software" });
    expect(resolution).toMatchObject({
      key: "saas-subscriptions",
      expertPackVersion: expect.any(String),
    });

    const normalized = await categoryIntelligence.normalizeLineItems(
      [
        {
          id: "line-1",
          description: "Named License",
          amount: 100,
          evidenceIds: ["evidence-1"],
        },
      ],
      resolution.key,
    );
    expect(normalized).toEqual([
      expect.objectContaining({
        canonicalCode: "SAAS-SEAT-01",
        packVersion: resolution.expertPackVersion,
      }),
    ]);

    const bill = await categoryIntelligence.analyzeBill({
      invoiceId: "invoice-1",
      totalAmount: 100,
      subtotalAmount: 100,
      taxAmount: 0,
      currency: "USD",
      invoiceNumber: "INV-1",
      invoiceDate: "2026-08-01",
      dueDate: "2026-08-31",
      vendorMatchStatus: "matched",
      reconciliationStatus: "reconciled",
      lineItems: [{ description: "Named License", amount: 100 }],
      categoryKey: resolution.key,
    });
    expect(bill.packVersion).toBe(resolution.expertPackVersion);

    const benchmark = await categoryIntelligence.benchmark({
      categoryKey: resolution.key,
      metric: "effective_rate",
      billedAmount: 100,
      serviceDate: "2026-08-01",
    });
    expect(benchmark.status).toBe("insufficient_data");
    expect(benchmark.comparisonRange).toBeNull();
    expect(benchmark.potentialAnnualSavings).toBeNull();

    const assistantContext = await categoryIntelligence.buildAiContext(resolution.key);
    const monitoring = await getCategoryMonitoringGuidance("Software");
    const opportunityTrace = await resolveCategoryTrace("Software");
    expect(assistantContext.category).toMatchObject({
      key: resolution.key,
      expertPackVersion: resolution.expertPackVersion,
      packStatus: "draft",
    });
    expect(monitoring.categoryTrace).toEqual(opportunityTrace);
    expect(monitoring.categoryTrace).toMatchObject({
      categoryKey: resolution.key,
      packVersion: resolution.expertPackVersion,
    });

    const reportRows = buildCategoryIntelligenceReportRows({
      invoices: [
        {
          id: "invoice-1",
          expenseCategory: "SaaS Subscriptions",
          metadata: { categoryIntelligence: opportunityTrace },
        },
      ],
      analyses: [
        {
          invoiceId: "invoice-1",
          packVersion: bill.packVersion,
          missingDimensions: benchmark.missingDimensions,
          liveSourcesUsed: benchmark.sourceIds,
        },
      ],
      opportunities: [{ estimatedAnnualValue: null }],
      savings: [],
      packStatusByKey: new Map([[resolution.key, assistantContext.category.packStatus]]),
    });
    expect(reportRows).toContainEqual(
      expect.objectContaining({
        metric: "Invoices with a resolved category trace",
        value: "1/1",
        status: "draft",
      }),
    );
    expect(reportRows).toContainEqual(
      expect.objectContaining({
        metric: "Estimated opportunity value",
        value: "0.00",
        status: "estimated",
      }),
    );
  });
});
