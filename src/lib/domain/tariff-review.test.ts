import { describe, expect, it } from "vitest";
import { evaluateTariffReview, type TariffReviewInput } from "./tariff-review";

const complete: TariffReviewInput = {
  utilityTerritory: "ERCOT North",
  serviceIdentifier: "ESI-1234",
  assignedRateCode: "4CP",
  serviceVoltage: "secondary",
  meteringConfiguration: "interval",
  serviceClass: "commercial",
  billedDemandKw: "180.00",
  historicalDemandKw: "172.00",
  ratchetApplies: false,
  officialSource: { sourceId: "tariff-2026-08", rateCode: "4CP", asOf: "2026-08-01", expiresAt: "2026-12-31", isOfficial: true },
  comparison: { billedUnderAssignedRate: "1200.00", billedUnderEligibleRate: "1080.00", eligibleRateCode: "4CP-COMMERCIAL" },
};

describe("tariff review guardrails", () => {
  it("fails closed when the bill has no assigned rate code", () => {
    const result = evaluateTariffReview({ ...complete, assignedRateCode: null });
    expect(result.state).toBe("needs_evidence");
    expect(result.title).toBe("Tariff review may be worthwhile");
    expect(result.estimatedMonthlyDifference).toBeNull();
    expect(result.message).toContain("official rate code");
  });

  it("fails closed for stale tariff sources", () => {
    const result = evaluateTariffReview({
      ...complete,
      officialSource: { ...complete.officialSource!, expiresAt: "2026-07-31" },
    }, new Date("2026-08-06T12:00:00Z"));
    expect(result.state).toBe("needs_evidence");
    expect(result.message).toContain("stale");
    expect(result.estimatedMonthlyDifference).toBeNull();
  });

  it("only returns a monthly difference after an official rate-code comparison", () => {
    const result = evaluateTariffReview(complete, new Date("2026-08-06T12:00:00Z"));
    expect(result.state).toBe("evidence_backed");
    expect(result.estimatedMonthlyDifference).toBe("120.00");
    expect(result.calculationResult).toMatchObject({ rateCode: "4CP", difference: "120.00" });
  });
});

