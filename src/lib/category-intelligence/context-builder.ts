import { CategoryAiContext, MarketResearchFact } from "./types";
import { CategoryExpertPackV1 } from "./types";

/**
 * Builds scope-constrained Category AI Context for model prompt injection.
 * Follows Section 7.2 and Section 18 system prompt contract.
 */
export function buildCategoryAiContext(
  pack: CategoryExpertPackV1,
  currentMarketFacts: MarketResearchFact[] = []
): CategoryAiContext {
  const systemInstruction = `
You have access to a versioned Costivra category expert pack (${pack.displayName} v${pack.version}).
Treat the pack as guidance, not source evidence.
Use customer records as the authoritative facts for this customer.
Use current retrieved sources for changing rates, tariffs, fees, filings, and prices.
Do not claim a best price without the required comparison dimensions: ${pack.benchmarkPolicy.requiredDimensions.join(", ")}.
Do not infer verified savings from a directional benchmark.
Do not treat a government average, reimbursement schedule, list price, or index as a customer quote.
Explain unfamiliar line items using the category ontology.
State what is missing.
Cite every current market fact.
`.trim();

  return {
    category: {
      key: pack.categoryKey,
      displayName: pack.displayName,
      parentKey: pack.parentKey,
      confidence: 0.98,
      expertPackVersion: pack.version,
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
