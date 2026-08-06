import { categoryIntelligence } from "@/lib/category-intelligence/service";

export type ManageCategoryIntelligenceContext = {
  category: {
    key: string;
    displayName: string;
    packVersion: string;
    packStatus: string;
    resolutionSource: string;
  };
  lineItemLabels: string[];
  reviewRuleSummaries: string[];
  requiredCaveats: string[];
};

/**
 * Builds safe, pack-only category context for the internal operations assistant.
 * It deliberately excludes customer records, research queries, and source text.
 */
export async function buildManageCategoryIntelligenceContext(
  question: string,
): Promise<ManageCategoryIntelligenceContext | null> {
  const resolution = await categoryIntelligence.resolveCategory({ extractedText: question });
  if (resolution.source === "fallback") return null;

  const context = await categoryIntelligence.buildAiContext(resolution.key);
  return {
    category: {
      key: context.category.key,
      displayName: context.category.displayName,
      packVersion: context.category.expertPackVersion,
      packStatus: context.category.packStatus,
      resolutionSource: resolution.source,
    },
    lineItemLabels: context.relevantLineItemDefinitions
      .slice(0, 8)
      .map((lineItem) => lineItem.label),
    reviewRuleSummaries: context.billQualityRules
      .filter((rule) => rule.severity !== "info")
      .slice(0, 5)
      .map((rule) => rule.description),
    requiredCaveats: context.requiredCaveats,
  };
}
