import { z } from "zod";

export const ChargeClassSchema = z.enum([
  "fixed",
  "usage",
  "demand",
  "minimum",
  "one_time",
  "pass_through",
  "tax",
  "assessment",
  "surcharge",
  "credit",
  "adjustment",
  "deposit",
  "finance",
  "penalty",
  "unknown",
]);

export const CategoryLineItemDefinitionSchema = z.object({
  canonicalCode: z.string(),
  label: z.string(),
  aliases: z.array(z.string()),
  meaning: z.string(),
  chargeClass: ChargeClassSchema,
  units: z.array(z.string()),
  calculation: z.string().optional(),
  expectedContext: z.array(z.string()),
  benchmarkable: z.boolean(),
  regulatory: z.boolean(),
  commonContractTreatment: z.array(z.string()),
  anomalyRules: z.array(z.string()),
});

export const RuleDefinitionSchema = z.object({
  ruleId: z.string(),
  description: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  deterministic: z.boolean(),
  requiredFields: z.array(z.string()),
  logic: z.string().optional(),
  evidenceRequired: z.boolean(),
  currentResearchRequired: z.boolean(),
});

export const CategoryExpertPackV1Schema = z.object({
  schemaVersion: z.literal("category-expert-pack-v1"),
  categoryKey: z.string(),
  displayName: z.string(),
  parentKey: z.string(),
  version: z.string(),
  status: z.enum(["draft", "verified", "deprecated"]),
  jurisdictions: z.array(z.string()),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  defaultFreshnessDays: z.number(),

  scope: z.object({
    includes: z.array(z.string()),
    excludes: z.array(z.string()),
    adjacentCategories: z.array(z.string()),
  }),

  documentTypes: z.array(
    z.object({
      type: z.string(),
      indicators: z.array(z.string()),
      requiredFields: z.array(z.string()),
    })
  ),

  billAnatomy: z.object({
    identityFields: z.array(z.string()),
    periodFields: z.array(z.string()),
    quantityFields: z.array(z.string()),
    pricingFields: z.array(z.string()),
    taxFeeFields: z.array(z.string()),
    contractFields: z.array(z.string()),
  }),

  lineItems: z.array(CategoryLineItemDefinitionSchema),

  pricingModels: z.array(
    z.object({
      key: z.string(),
      explanation: z.string(),
      fixedComponents: z.array(z.string()),
      variableComponents: z.array(z.string()),
      passThroughComponents: z.array(z.string()),
      formulas: z.array(z.string()),
      requiredDimensions: z.array(z.string()),
    })
  ),

  billQuality: z.object({
    goodSignals: z.array(RuleDefinitionSchema),
    anomalyRules: z.array(RuleDefinitionSchema),
    contractChecks: z.array(RuleDefinitionSchema),
    arithmeticChecks: z.array(RuleDefinitionSchema),
  }),

  benchmarkPolicy: z.object({
    supportedMetrics: z.array(z.string()),
    requiredDimensions: z.array(z.string()),
    minimumComparableCount: z.number().nullable(),
    sourceRequirements: z.array(z.string()),
    quoteRequiredWhen: z.array(z.string()),
    prohibitedClaims: z.array(z.string()),
  }),

  optimizationLevers: z.array(
    z.object({
      key: z.string(),
      description: z.string(),
      prerequisites: z.array(z.string()),
      risks: z.array(z.string()),
      needsAuthorization: z.boolean(),
    })
  ),

  currentResearchPolicy: z.object({
    mandatoryTriggers: z.array(z.string()),
    preferredSources: z.array(z.string()),
    allowedDomains: z.array(z.string()),
    freshnessDays: z.number(),
    cacheKeyDimensions: z.array(z.string()),
  }),

  outputPolicy: z.object({
    requiredCaveats: z.array(z.string()),
    confidenceThresholds: z.record(z.string(), z.number()),
    humanReviewTriggers: z.array(z.string()),
  }),

  evalCaseIds: z.array(z.string()),
});
