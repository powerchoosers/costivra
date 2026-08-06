import { describe, expect, it } from "vitest";
import { buildCategoryIntelligenceReportRows } from "./report-summary";

describe("buildCategoryIntelligenceReportRows", () => {
  it("keeps draft, unknown, estimated, and verified states separate", () => {
    const rows = buildCategoryIntelligenceReportRows({
      invoices: [
        {
          id: "invoice-1",
          expenseCategory: "Telecom & Connectivity",
          metadata: {
            categoryIntelligence: {
              categoryKey: "business-broadband-dia",
              packVersion: "2026.08.1",
            },
          },
        },
        { id: "invoice-2", expenseCategory: null, metadata: {} },
      ],
      analyses: [
        {
          invoiceId: "invoice-1",
          packVersion: "2026.08.1",
          missingDimensions: ["jurisdiction"],
          liveSourcesUsed: [],
        },
      ],
      opportunities: [{ estimatedAnnualValue: "1200.50" }],
      savings: [
        { amount: "300.25", status: "verified" },
        { amount: "999.00", status: "ready_for_review" },
      ],
      packStatusByKey: new Map([["business-broadband-dia", "draft"]]),
    });

    expect(rows).toContainEqual(
      expect.objectContaining({
        metric: "Invoices with a resolved category trace",
        value: "1/2",
        status: "draft",
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        metric: "Invoices requiring category review",
        value: "1",
        status: "review_required",
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        metric: "Estimated opportunity value",
        value: "1200.50",
        status: "estimated",
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        metric: "Verified savings value",
        value: "300.25",
        status: "verified",
      }),
    );
  });
});
