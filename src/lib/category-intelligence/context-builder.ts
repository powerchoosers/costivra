import type {
  CategoryAiContext,
  CategoryExpertPackV1,
  MarketResearchFact,
} from "./types";

/**
 * Builds scope-constrained Category AI Context for model prompt injection.
 * Expert packs are guidance, not source evidence. Draft packs are explicitly
 * labeled so no AI surface can silently present them as verified expertise.
 */
export function buildCategoryAiContext(
  pack: CategoryExpertPackV1,
  currentMarketFacts: MarketResearchFact[] = [],
): CategoryAiContext {
  const packStatusInstruction =
    pack.status === "verified"
      ? "This pack has passed Costivra's verification workflow."
      : "This pack is draft guidance. Do not present its heuristics, pricing ranges, or anomaly rules as verified conclusions.";

  const systemInstruction = `
You have access to a versioned Costivra category pack (${pack.displayName} v${pack.version}; status: ${pack.status}).
${packStatusInstruction}
Treat the pack as guidance, not source evidence.
Use customer records as the authoritative facts for this customer.
Use only actually retrieved, cited sources for changing rates, tariffs, fees, filings, and prices.
Do not claim a best price without the required comparison dimensions: ${pack.benchmarkPolicy.requiredDimensions.join(", ") || "a reviewed category-specific comparable set"}.
Do not infer verified savings from a directional benchmark.
Do not treat a government average, reimbursement schedule, list price, or index as a customer quote.
Explain unfamiliar line items using the category ontology only when the match is supported by the selected category and source text.
State what is missing.
Cite every current market fact.
`.trim();

  return {
    category: {
      key: pack.categoryKey,
      displayName: pack.displayName,
      parentKey: pack.parentKey,
      confidence: pack.status === "verified" ? 0.98 : 0.7,
      expertPackVersion: pack.version,
      packStatus: pack.status,
    },
    relevantLineItemDefinitions: pack.lineItems.slice(0, 15),
    billQualityRules: [
      ...pack.billQuality.goodSignals.slice(0, 5),
      ...pack.billQuality.anomalyRules.slice(0, 5),
    ],
    benchmarkRequirements: pack.benchmarkPolicy.requiredDimensions,
    currentMarketFacts,
    requiredCaveats: pack.outputPolicy.requiredCaveats,
    systemInstruction,
  };
}
