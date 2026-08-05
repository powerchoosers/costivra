import { describe, expect, it } from "vitest";
import { evaluateMarketBenchmark } from "./benchmark-engine";

describe("Packet 03: Honest Benchmark Contract & Non-Synthetic Calculations", () => {
  it("does not automatically assign an 18% variance or savings to telecom invoices", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "business-broadband-dia",
      metric: "effective_rate",
      billedAmount: 2500,
    });
    expect(res.variancePercentage).toBeNull();
    expect(res.potentialAnnualSavings).toBeNull();
    expect(res.estimatedMarketRate).toBeNull();
    expect(res.comparisonRange).toBeNull();
  });

  it("does not automatically assign a 24% variance or savings to energy invoices", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "commercial-electricity-supply",
      metric: "effective_rate",
      billedAmount: 18000,
    });
    expect(res.variancePercentage).toBeNull();
    expect(res.potentialAnnualSavings).toBeNull();
    expect(res.estimatedMarketRate).toBeNull();
    expect(res.comparisonRange).toBeNull();
  });

  it("does not automatically assign an 8% or synthetic variance to unknown categories", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "unsupported-specialty-category",
      metric: "effective_rate",
      billedAmount: 4500,
    });
    expect(res.status).toBe("unsupported");
    expect(res.variancePercentage).toBeNull();
    expect(res.potentialAnnualSavings).toBeNull();
    expect(res.estimatedMarketRate).toBeNull();
  });

  it("returns insufficient_data when required dimensions are missing", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "saas-subscriptions",
      metric: "effective_rate",
      billedAmount: 12000,
    });
    expect(res.status).toBe("insufficient_data");
    expect(res.missingDimensions.length).toBeGreaterThan(0);
    expect(res.potentialAnnualSavings).toBeNull();
  });

  it("never produces potential savings from billed total alone", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "solid-waste-recycling",
      metric: "effective_rate",
      billedAmount: 850,
    });
    expect(res.potentialAnnualSavings).toBeNull();
  });

  it("returns quote_required when basic dimensions exist but no live dataset is loaded", () => {
    const res = evaluateMarketBenchmark({
      categoryKey: "commercial-electricity-supply",
      metric: "effective_rate",
      billedAmount: 5000,
      geography: { state: "TX", zip: "75001" },
      volume: 45000,
      contractTermMonths: 24,
      specification: { utility_territory: "Oncor", load_factor: 0.65 },
    });
    expect(res.status).toBe("quote_required");
    expect(res.variancePercentage).toBeNull();
    expect(res.potentialAnnualSavings).toBeNull();
    expect(res.benchmarkSource).toBe("No verified comparable dataset loaded");
  });
});
