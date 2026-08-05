/**
 * Costivra Category Intelligence Layer Types
 * Source of truth for taxonomy, expert packs, line-item ontology, bill quality, and benchmarks.
 */

export type ChargeClass =
  | "fixed"
  | "usage"
  | "demand"
  | "minimum"
  | "one_time"
  | "pass_through"
  | "tax"
  | "assessment"
  | "surcharge"
  | "credit"
  | "adjustment"
  | "deposit"
  | "finance"
  | "penalty"
  | "unknown";

export type CategoryLineItemDefinition = {
  canonicalCode: string;
  label: string;
  aliases: string[];
  meaning: string;
  chargeClass: ChargeClass;
  units: string[];
  calculation?: string;
  expectedContext: string[];
  benchmarkable: boolean;
  regulatory: boolean;
  commonContractTreatment: string[];
  anomalyRules: string[];
};

export type RuleSeverity = "info" | "low" | "medium" | "high" | "critical";

export type RuleDefinition = {
  ruleId: string;
  description: string;
  severity: RuleSeverity;
  deterministic: boolean;
  requiredFields: string[];
  logic?: string;
  evidenceRequired: boolean;
  currentResearchRequired: boolean;
};

export type CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1";
  categoryKey: string;
  displayName: string;
  parentKey: string;
  version: string;
  status: "draft" | "verified" | "deprecated";
  jurisdictions: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  defaultFreshnessDays: number;

  scope: {
    includes: string[];
    excludes: string[];
    adjacentCategories: string[];
  };

  documentTypes: Array<{
    type: string;
    indicators: string[];
    requiredFields: string[];
  }>;

  billAnatomy: {
    identityFields: string[];
    periodFields: string[];
    quantityFields: string[];
    pricingFields: string[];
    taxFeeFields: string[];
    contractFields: string[];
  };

  lineItems: CategoryLineItemDefinition[];

  pricingModels: Array<{
    key: string;
    explanation: string;
    fixedComponents: string[];
    variableComponents: string[];
    passThroughComponents: string[];
    formulas: string[];
    requiredDimensions: string[];
  }>;

  billQuality: {
    goodSignals: RuleDefinition[];
    anomalyRules: RuleDefinition[];
    contractChecks: RuleDefinition[];
    arithmeticChecks: RuleDefinition[];
  };

  benchmarkPolicy: {
    supportedMetrics: string[];
    requiredDimensions: string[];
    minimumComparableCount: number | null;
    sourceRequirements: string[];
    quoteRequiredWhen: string[];
    prohibitedClaims: string[];
  };

  optimizationLevers: Array<{
    key: string;
    description: string;
    prerequisites: string[];
    risks: string[];
    needsAuthorization: boolean;
  }>;

  currentResearchPolicy: {
    mandatoryTriggers: string[];
    preferredSources: string[];
    allowedDomains: string[];
    freshnessDays: number;
    cacheKeyDimensions: string[];
  };

  outputPolicy: {
    requiredCaveats: string[];
    confidenceThresholds: Record<string, number>;
    humanReviewTriggers: string[];
  };

  evalCaseIds: string[];
};

export type CategoryResolution = {
  id: string | null;
  key: string;
  displayName: string;
  parentKey: string;
  confidence: number;
  source: "verified_vendor" | "catalog" | "line_item_evidence" | "extracted_text" | "fallback";
  expertPackVersion: string | null;
};

export type ResolveCategoryInput = {
  vendorId?: string | null;
  vendorName?: string | null;
  rawCategory?: string | null;
  extractedText?: string | null;
  lineItemDescriptions?: string[];
  documentType?: string | null;
};

export type NormalizedLineItem = {
  lineItemId?: string;
  originalDescription: string;
  canonicalCode: string | null;
  label: string;
  chargeClass: ChargeClass;
  explanation: string;
  confidence: number;
  unit?: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  evidenceIds: string[];
};

export type CategoryFinding = {
  findingId: string;
  code:
    | "missing_information"
    | "arithmetic_mismatch"
    | "contract_mismatch"
    | "duplicate_charge"
    | "usage_anomaly"
    | "inactive_asset"
    | "rate_variance"
    | "tax_or_fee_question"
    | "classification_question"
    | "unverified_vendor"
    | "market_quote_required"
    | "human_review_required";
  severity: RuleSeverity;
  title: string;
  message: string;
  evidence: string[];
  confidence: number;
  financialImpact: number | null;
  nextAction: string;
  currentResearchPerformed: boolean;
};

export type AnalyzeBillInput = {
  invoiceId?: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  currency?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  vendorMatchStatus?: string | null;
  reconciliationStatus?: string | null;
  lineItems?: Array<{ description: string; amount: number }>;
  categoryKey?: string;
};

export type BillQualityStatus = "good" | "review" | "bad" | "insufficient_data";

export type BillQualityResult = {
  status: BillQualityStatus;
  score: number | null;
  scoreVersion: string;
  findings: CategoryFinding[];
  missingFields: string[];
  benchmarkStatus: BenchmarkStatus;
  packVersion: string;
};

export type BenchmarkStatus =
  | "comparable"
  | "directional"
  | "quote_required"
  | "insufficient_data"
  | "unsupported";

export type BenchmarkInput = {
  categoryKey: string;
  metric: string;
  billedAmount: number;
  geography?: { state?: string | null; city?: string | null; zip?: string | null } | null;
  serviceDate?: string | null;
  volume?: number | null;
  unit?: string | null;
  serviceTier?: string | null;
  usageShape?: Record<string, unknown> | null;
  contractTermMonths?: number | null;
  specification?: Record<string, unknown> | null;
};

export type BenchmarkResult = {
  status: BenchmarkStatus;
  metric: string;
  currentValue: number | null;
  comparisonRange: { low: number; median: number; high: number } | null;
  percentile: number | null;
  estimatedMarketRate: number | null;
  variancePercentage: number | null;
  potentialAnnualSavings: number | null;
  unit: string | null;
  comparableDimensions: Record<string, unknown>;
  missingDimensions: string[];
  sourceIds: string[];
  benchmarkSource: string;
  asOf: string | null;
  confidence: number;
  caveats: string[];
};

export type MarketResearchInput = {
  categoryKey: string;
  query: string;
  jurisdiction?: string;
  vendorName?: string;
};

export type MarketResearchFact = {
  fact: string;
  unit: string | null;
  sourceTitle: string;
  sourceUrl: string;
  publisher: string;
  asOf: string;
  retrievedAt: string;
  excerpt: string;
  confidence: number;
  comparable: boolean;
};

export type MarketResearchResult = {
  facts: MarketResearchFact[];
  freshness: "fresh" | "stale" | "unverified";
  searchPerformed: boolean;
};

export type CategoryAiContext = {
  category: {
    key: string;
    displayName: string;
    parentKey: string;
    confidence: number;
    expertPackVersion: string;
  };
  relevantLineItemDefinitions: CategoryLineItemDefinition[];
  billQualityRules: RuleDefinition[];
  benchmarkRequirements: string[];
  currentMarketFacts: MarketResearchFact[];
  requiredCaveats: string[];
  systemInstruction: string;
};
