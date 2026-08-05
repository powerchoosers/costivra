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
  categoryKey: z.string().min(1),
  displayName: z.string(),
  parentKey: z.string(),
  version: z.string(),
  status: z.enum(["draft", "verified", "deprecated"]),
  jurisdictions: z.array(z.string()),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  defaultFreshnessDays: z.number().min(0),

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
    freshnessDays: z.number().min(0),
    cacheKeyDimensions: z.array(z.string()),
  }),

  outputPolicy: z.object({
    requiredCaveats: z.array(z.string()),
    confidenceThresholds: z.record(z.string(), z.number()),
    humanReviewTriggers: z.array(z.string()),
  }),

  evalCaseIds: z.array(z.string()),
});

export const CategoryResolutionSchema = z.object({
  id: z.string().nullable(),
  key: z.string(),
  displayName: z.string(),
  parentKey: z.string(),
  confidence: z.number(),
  source: z.enum(["verified_vendor", "catalog", "line_item_evidence", "extracted_text", "fallback"]),
  expertPackVersion: z.string().nullable(),
});

export const NormalizedLineItemSchema = z.object({
  lineItemId: z.string().optional(),
  originalDescription: z.string(),
  canonicalCode: z.string().nullable(),
  label: z.string(),
  chargeClass: ChargeClassSchema,
  explanation: z.string(),
  confidence: z.number(),
  unit: z.string().optional(),
  amount: z.number(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  evidenceIds: z.array(z.string()),
  reviewRequired: z.boolean(),
  matchedAlias: z.string().nullable(),
  packVersion: z.string().nullable().optional(),
});

export const CategoryFindingSchema = z.object({
  findingId: z.string(),
  code: z.enum([
    "missing_information",
    "arithmetic_mismatch",
    "contract_mismatch",
    "duplicate_charge",
    "usage_anomaly",
    "inactive_asset",
    "rate_variance",
    "tax_or_fee_question",
    "classification_question",
    "unverified_vendor",
    "market_quote_required",
    "human_review_required",
  ]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string(),
  message: z.string(),
  evidence: z.array(z.string()),
  confidence: z.number(),
  financialImpact: z.number().nullable(),
  nextAction: z.string(),
  currentResearchPerformed: z.boolean(),
});

export const CategoryBillAnalysisSchema = z.object({
  status: z.enum(["good", "review", "bad", "insufficient_data"]),
  score: z.number().nullable(),
  scoreVersion: z.string(),
  findings: z.array(CategoryFindingSchema),
  missingFields: z.array(z.string()),
  benchmarkStatus: z.enum(["comparable", "directional", "quote_required", "insufficient_data", "unsupported"]),
  packVersion: z.string(),
});

export const BenchmarkResultSchema = z.object({
  status: z.enum(["comparable", "directional", "quote_required", "insufficient_data", "unsupported"]),
  metric: z.string(),
  currentValue: z.number().nullable(),
  comparisonRange: z.object({ low: z.number(), median: z.number(), high: z.number() }).nullable(),
  percentile: z.number().nullable(),
  estimatedMarketRate: z.number().nullable(),
  variancePercentage: z.number().nullable(),
  potentialAnnualSavings: z.number().nullable(),
  unit: z.string().nullable(),
  comparableDimensions: z.record(z.string(), z.unknown()),
  missingDimensions: z.array(z.string()),
  sourceIds: z.array(z.string()),
  benchmarkSource: z.string(),
  asOf: z.string().nullable(),
  confidence: z.number(),
  caveats: z.array(z.string()),
});

export const MarketResearchFactSchema = z.object({
  fact: z.string(),
  unit: z.string().nullable(),
  sourceTitle: z.string(),
  sourceUrl: z.string(),
  publisher: z.string(),
  asOf: z.string(),
  retrievedAt: z.string(),
  excerpt: z.string(),
  confidence: z.number(),
  comparable: z.boolean(),
});

export const MarketResearchResultSchema = z.object({
  facts: z.array(MarketResearchFactSchema),
  freshness: z.enum(["fresh", "stale", "unverified"]),
  searchPerformed: z.boolean(),
});

export const CategoryAiContextSchema = z.object({
  category: z.object({
    key: z.string(),
    displayName: z.string(),
    parentKey: z.string(),
    confidence: z.number(),
    expertPackVersion: z.string(),
    packStatus: z.enum(["draft", "verified", "deprecated"]),
  }),
  relevantLineItemDefinitions: z.array(CategoryLineItemDefinitionSchema),
  billQualityRules: z.array(RuleDefinitionSchema),
  benchmarkRequirements: z.array(z.string()),
  currentMarketFacts: z.array(MarketResearchFactSchema),
  requiredCaveats: z.array(z.string()),
  systemInstruction: z.string(),
});

export function validateCategoryExpertPack(data: unknown) {
  return CategoryExpertPackV1Schema.parse(data);
}

export function validateCategoryResolution(data: unknown) {
  return CategoryResolutionSchema.parse(data);
}

export function validateNormalizedLineItem(data: unknown) {
  return NormalizedLineItemSchema.parse(data);
}

export function validateCategoryBillAnalysis(data: unknown) {
  return CategoryBillAnalysisSchema.parse(data);
}

export function validateBenchmarkResult(data: unknown) {
  return BenchmarkResultSchema.parse(data);
}

export function validateMarketResearchResult(data: unknown) {
  return MarketResearchResultSchema.parse(data);
}

export function validateCategoryAiContext(data: unknown) {
  return CategoryAiContextSchema.parse(data);
}
