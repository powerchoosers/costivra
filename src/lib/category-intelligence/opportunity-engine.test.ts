import { describe, expect, it } from "vitest";
import { evaluateCategoryOpportunities } from "./opportunity-engine";
import type { BillQualityResult } from "./types";

const cleanBill: BillQualityResult = {
  status: "good",
  score: 100,
  scoreVersion: "test",
  findings: [],
  missingFields: [],
  benchmarkStatus: "quote_required",
  packVersion: "draft-test",
};

describe("category opportunity safety", () => {
  it("creates a quote-required review without fabricating savings from spend", () => {
    const [opportunity] = evaluateCategoryOpportunities(
      cleanBill,
      2_500,
      "saas-subscriptions",
    );

    expect(opportunity.valueStatus).toBe("quote_required");
    expect(opportunity.estimatedAnnualSavings).toBeNull();
    expect(opportunity.confidence).toBe(0);
  });
});
