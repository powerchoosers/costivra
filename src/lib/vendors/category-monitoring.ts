import { categoryIntelligence } from "@/lib/category-intelligence/service";
import type { PersistedCategoryTrace } from "@/lib/workflows/category-trace";

export type CategoryMonitoringGuidance = {
  categoryTrace: PersistedCategoryTrace;
  hasDedicatedPack: boolean;
  freshnessDays: number | null;
  trackedFields: string[];
  unitTypes: string[];
  reviewRuleIds: string[];
  reviewRequired: boolean;
};

/**
 * Monitoring guidance describes what to inspect when a bill arrives. It does
 * not infer a billing cadence or produce a financial result.
 */
export async function getCategoryMonitoringGuidance(
  categoryLabel: string | null | undefined,
): Promise<CategoryMonitoringGuidance> {
  const resolution = await categoryIntelligence.resolveCategory({
    rawCategory: categoryLabel ?? "",
  });
  if (resolution.source === "fallback") {
    return {
      categoryTrace: {
        categoryKey: null,
        packVersion: null,
        packStatus: "unknown",
        resolutionSource: resolution.source,
      },
      hasDedicatedPack: false,
      freshnessDays: null,
      trackedFields: [],
      unitTypes: [],
      reviewRuleIds: [],
      reviewRequired: true,
    };
  }

  const packResolution = await categoryIntelligence.getExpertPackWithResolution(resolution.key);
  const pack = packResolution.pack;
  return {
    categoryTrace: {
      categoryKey: pack.categoryKey,
      packVersion: pack.version,
      packStatus: pack.status,
      resolutionSource: resolution.source,
    },
    hasDedicatedPack: packResolution.exactMatch,
    freshnessDays: pack.defaultFreshnessDays || null,
    trackedFields: [
      ...pack.billAnatomy.identityFields,
      ...pack.billAnatomy.periodFields,
      ...pack.billAnatomy.quantityFields,
      ...pack.billAnatomy.pricingFields,
      ...pack.billAnatomy.taxFeeFields,
      ...pack.billAnatomy.contractFields,
    ].slice(0, 20),
    unitTypes: [...new Set(pack.lineItems.flatMap((lineItem) => lineItem.units))].slice(0, 12),
    reviewRuleIds: [
      ...pack.billQuality.anomalyRules,
      ...pack.billQuality.contractChecks,
      ...pack.billQuality.arithmeticChecks,
    ].map((rule) => rule.ruleId).slice(0, 16),
    reviewRequired: pack.status !== "verified" || !packResolution.exactMatch,
  };
}
