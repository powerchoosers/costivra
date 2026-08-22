import { EXPERT_PACKS_REGISTRY } from "./packs";

/** Source-visible category data, never a calculated conclusion. */
export type SourceCategoryFact = {
  key: string;
  value: string;
  unit: string | null;
  sourceKey: string | null;
};

/**
 * Keep model output bounded to fields already declared by a registered pack.
 * Required document fields and bill-anatomy fields are both useful here:
 * contracts often carry the former while invoices carry the latter.
 */
export const ALLOWED_CATEGORY_FACT_KEYS = new Set(
  Object.values(EXPERT_PACKS_REGISTRY).flatMap((pack) => [
    ...pack.documentTypes.flatMap((documentType) => documentType.requiredFields),
    ...Object.values(pack.billAnatomy).flat(),
  ]),
);

const CATEGORY_FACT_GROUPS = [
  "identityFields",
  "periodFields",
  "quantityFields",
  "pricingFields",
  "taxFeeFields",
  "contractFields",
] as const;

/**
 * Give extraction a compact field map without asking the model to infer what
 * a category pack means. The values remain source facts and are not rules.
 */
export const CATEGORY_FACT_FIELD_GUIDANCE = Object.values(EXPERT_PACKS_REGISTRY)
  .map((pack) => {
    const groups = CATEGORY_FACT_GROUPS
      .map((group) => `${group}=[${pack.billAnatomy[group].join(", ")}]`)
      .filter((group) => !group.endsWith("=[]"));
    const documentFields = Array.from(new Set(
      pack.documentTypes.flatMap((documentType) => documentType.requiredFields),
    ));
    if (documentFields.length > 0) groups.unshift(`documentFields=[${documentFields.join(", ")}]`);
    return groups.length > 0 ? `${pack.displayName}: ${groups.join("; ")}` : null;
  })
  .filter((line): line is string => Boolean(line))
  .join("\n");

export function isAllowedCategoryFactKey(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value) && ALLOWED_CATEGORY_FACT_KEYS.has(value);
}
