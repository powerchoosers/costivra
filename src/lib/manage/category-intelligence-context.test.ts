import { describe, expect, it } from "vitest";
import { buildManageCategoryIntelligenceContext } from "./category-intelligence-context";

describe("buildManageCategoryIntelligenceContext", () => {
  it("returns the resolved draft pack without performing current-market research", async () => {
    const context = await buildManageCategoryIntelligenceContext(
      "Which circuit ID and DIA bandwidth line items need internal review?",
    );

    expect(context).toMatchObject({
      category: {
        key: "business-broadband-dia",
        packStatus: "draft",
      },
    });
    expect(context?.lineItemLabels.length).toBeGreaterThan(0);
    expect(context?.reviewRuleSummaries.length).toBeGreaterThan(0);
  });

  it("returns no pack context when the question does not resolve safely", async () => {
    await expect(
      buildManageCategoryIntelligenceContext("Can you summarize my team inbox?"),
    ).resolves.toBeNull();
  });
});
