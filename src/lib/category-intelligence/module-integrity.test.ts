import { describe, expect, it } from "vitest";
import { categoryIntelligence } from "./service";
import {
  CategoryExpertPackV1Schema,
  CategoryResolutionSchema,
  NormalizedLineItemSchema,
  CategoryBillAnalysisSchema,
  BenchmarkResultSchema,
  MarketResearchResultSchema,
  CategoryAiContextSchema,
  validateCategoryExpertPack,
  validateCategoryResolution,
  validateNormalizedLineItem,
  validateCategoryBillAnalysis,
  validateBenchmarkResult,
  validateMarketResearchResult,
  validateCategoryAiContext,
} from "./pack-schema";
import { getExpertPack, getRegisteredExpertPacks } from "./packs";
import { evaluateMarketBenchmark } from "./benchmark-engine";
import { performMarketResearch } from "./current-market-research";
import { normalizeLineItems } from "./line-item-normalizer";

describe("Category Intelligence Module Integrity", () => {
  it("exports all required service methods on categoryIntelligence", () => {
    expect(typeof categoryIntelligence.resolveCategory).toBe("function");
    expect(typeof categoryIntelligence.getExpertPack).toBe("function");
    expect(typeof categoryIntelligence.loadExpertPack).toBe("function");
    expect(typeof categoryIntelligence.normalizeLineItems).toBe("function");
    expect(typeof categoryIntelligence.analyzeBill).toBe("function");
    expect(typeof categoryIntelligence.benchmark).toBe("function");
    expect(typeof categoryIntelligence.researchCurrentMarket).toBe("function");
    expect(typeof categoryIntelligence.buildAiContext).toBe("function");
  });

  it("exports all required core modules and pack schemas", () => {
    expect(CategoryExpertPackV1Schema).toBeDefined();
    expect(CategoryResolutionSchema).toBeDefined();
    expect(NormalizedLineItemSchema).toBeDefined();
    expect(CategoryBillAnalysisSchema).toBeDefined();
    expect(BenchmarkResultSchema).toBeDefined();
    expect(MarketResearchResultSchema).toBeDefined();
    expect(CategoryAiContextSchema).toBeDefined();
    expect(typeof validateCategoryExpertPack).toBe("function");
    expect(typeof validateCategoryResolution).toBe("function");
    expect(typeof validateNormalizedLineItem).toBe("function");
    expect(typeof validateCategoryBillAnalysis).toBe("function");
    expect(typeof validateBenchmarkResult).toBe("function");
    expect(typeof validateMarketResearchResult).toBe("function");
    expect(typeof validateCategoryAiContext).toBe("function");
    expect(typeof getExpertPack).toBe("function");
    expect(typeof getRegisteredExpertPacks).toBe("function");
    expect(typeof evaluateMarketBenchmark).toBe("function");
    expect(typeof performMarketResearch).toBe("function");
    expect(typeof normalizeLineItems).toBe("function");
  });
});

describe("Category Expert Pack Schema Validation", () => {
  const sampleValidPack = {
    schemaVersion: "category-expert-pack-v1" as const,
    categoryKey: "test-category",
    displayName: "Test Category",
    parentKey: "technology",
    version: "1.0.0",
    status: "draft" as const,
    jurisdictions: ["US"],
    effectiveFrom: null,
    effectiveTo: null,
    defaultFreshnessDays: 30,
    scope: {
      includes: ["test software"],
      excludes: ["hardware"],
      adjacentCategories: [],
    },
    documentTypes: [
      {
        type: "invoice",
        indicators: ["invoice"],
        requiredFields: ["amount"],
      },
    ],
    billAnatomy: {
      identityFields: ["account_number"],
      periodFields: ["billing_period"],
      quantityFields: ["licenses"],
      pricingFields: ["rate"],
      taxFeeFields: ["sales_tax"],
      contractFields: ["term"],
    },
    lineItems: [
      {
        canonicalCode: "test_fee",
        label: "Test Fee",
        aliases: ["fee"],
        meaning: "A test charge",
        chargeClass: "fixed" as const,
        units: ["month"],
        expectedContext: ["recurring"],
        benchmarkable: false,
        regulatory: false,
        commonContractTreatment: [],
        anomalyRules: [],
      },
    ],
    pricingModels: [],
    billQuality: {
      goodSignals: [],
      anomalyRules: [],
      contractChecks: [],
      arithmeticChecks: [],
    },
    benchmarkPolicy: {
      supportedMetrics: [],
      requiredDimensions: [],
      minimumComparableCount: null,
      sourceRequirements: [],
      quoteRequiredWhen: [],
      prohibitedClaims: [],
    },
    optimizationLevers: [],
    currentResearchPolicy: {
      mandatoryTriggers: [],
      preferredSources: [],
      allowedDomains: [],
      freshnessDays: 30,
      cacheKeyDimensions: [],
    },
    outputPolicy: {
      requiredCaveats: [],
      confidenceThresholds: { default: 0.8 },
      humanReviewTriggers: [],
    },
    evalCaseIds: [],
  };

  it("passes validation for a valid draft pack", () => {
    const validated = validateCategoryExpertPack(sampleValidPack);
    expect(validated.categoryKey).toBe("test-category");
    expect(validated.status).toBe("draft");
  });

  it("fails validation when schemaVersion is missing or invalid", () => {
    const invalid = { ...sampleValidPack, schemaVersion: undefined };
    expect(() => validateCategoryExpertPack(invalid)).toThrow();
  });

  it("fails validation when pack status is invalid", () => {
    const invalid = { ...sampleValidPack, status: "unapproved" };
    expect(() => validateCategoryExpertPack(invalid)).toThrow();
  });

  it("fails validation when an unsupported chargeClass is used", () => {
    const invalid = {
      ...sampleValidPack,
      lineItems: [
        {
          ...sampleValidPack.lineItems[0],
          chargeClass: "magic_fee",
        },
      ],
    };
    expect(() => validateCategoryExpertPack(invalid)).toThrow();
  });

  it("fails validation when freshnessDays is negative", () => {
    const invalid = { ...sampleValidPack, defaultFreshnessDays: -10 };
    expect(() => validateCategoryExpertPack(invalid)).toThrow();
  });

  it("fails validation when categoryKey is empty", () => {
    const invalid = { ...sampleValidPack, categoryKey: "" };
    expect(() => validateCategoryExpertPack(invalid)).toThrow();
  });
});
