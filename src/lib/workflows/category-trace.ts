import { categoryIntelligence } from "@/lib/category-intelligence/service";

export type PersistedCategoryTrace = {
  categoryKey: string | null;
  packVersion: string | null;
  packStatus: "draft" | "verified" | "deprecated" | "unknown";
  resolutionSource: string;
};

/**
 * A trace is descriptive only. Financial calculations remain owned by the
 * deterministic value engine and are never altered by category resolution.
 */
export async function resolveCategoryTrace(
  categoryLabel: string,
): Promise<PersistedCategoryTrace> {
  const resolution = await categoryIntelligence.resolveCategory({
    rawCategory: categoryLabel,
  });
  if (resolution.source === "fallback") {
    return {
      categoryKey: null,
      packVersion: null,
      packStatus: "unknown",
      resolutionSource: resolution.source,
    };
  }

  const pack = await categoryIntelligence.getExpertPackWithResolution(resolution.key);
  return {
    categoryKey: pack.pack.categoryKey,
    packVersion: pack.pack.version,
    packStatus: pack.status,
    resolutionSource: resolution.source,
  };
}

export function withCategoryTrace(
  calculationInputs: Record<string, string>,
  categoryTrace: PersistedCategoryTrace,
): Record<string, unknown> {
  return {
    ...calculationInputs,
    categoryIntelligence: categoryTrace,
  };
}
