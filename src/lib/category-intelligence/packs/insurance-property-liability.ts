import { CategoryExpertPackV1 } from "../types";

export const insurancePropertyLiabilityPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "commercial-property",
  displayName: "Commercial Property & General Liability Insurance",
  parentKey: "insurance-benefits",
  version: "2026.08.1",
  // This pack has not cleared Packet 10's source, evaluation, and human-review
  // gates. Draft status prevents its guidance from being presented as verified.
  status: "draft",
  jurisdictions: ["US"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 90,

  scope: {
    includes: ["Commercial Property Building & Contents", "General Liability & BOP", "Business Interruption", "Equipment Breakdown"],
    excludes: ["Workers Compensation", "Group Health", "Commercial Auto"],
    adjacentCategories: ["workers-compensation", "umbrella-excess"],
  },

  documentTypes: [
    {
      type: "insurance_policy_declaration",
      indicators: ["Declarations Page", "Policy Period", "Named Insured", "Total Premium", "Limits of Liability"],
      requiredFields: ["policy_number", "effective_dates", "insured_locations", "total_premium"],
    },
  ],

  billAnatomy: {
    identityFields: ["policy_number", "named_insured", "carrier_name", "broker_name"],
    periodFields: ["effective_date", "expiration_date"],
    quantityFields: ["total_insurable_value", "building_limit", "contents_limit", "revenue_exposure"],
    pricingFields: ["base_premium", "rate_per_hundred", "schedule_modification"],
    taxFeeFields: ["surplus_lines_tax", "stamping_fee", "policy_fee"],
    contractFields: ["deductible", "coinsurance_percentage", "endorsements"],
  },

  lineItems: [
    {
      canonicalCode: "INS-PROP-01",
      label: "Commercial Property Premium",
      aliases: ["Property Premium", "Building & Contents Premium", "Fire & Extended Coverage"],
      meaning: "Premium for physical loss or damage to building structure, machinery, and inventory.",
      chargeClass: "fixed",
      units: ["tiv", "flat"],
      calculation: "(tiv / 100) * property_rate",
      expectedContext: ["commercial_real_estate"],
      benchmarkable: true,
      regulatory: true,
      commonContractTreatment: ["annual_prepaid", "installment_finance"],
      anomalyRules: ["check_tiv_coinsurance_penalty_risk"],
    },
    {
      canonicalCode: "INS-GL-01",
      label: "General Liability Base Premium",
      aliases: ["General Liability Premium", "CGL Premium", "BOP Premium"],
      meaning: "Third-party bodily injury and property damage coverage premium.",
      chargeClass: "fixed",
      units: ["revenue", "square_feet"],
      expectedContext: ["business_operations"],
      benchmarkable: true,
      regulatory: true,
      commonContractTreatment: ["auditable_exposure"],
      anomalyRules: ["check_audit_adjustment_surprise"],
    },
  ],

  pricingModels: [
    {
      key: "tiv_exposure_rate",
      explanation: "Rate applied per $100 of Total Insurable Value (TIV) or gross revenue.",
      fixedComponents: ["policy_fee"],
      variableComponents: ["tiv", "gross_revenue"],
      passThroughComponents: ["surplus_lines_tax", "stamping_fee"],
      formulas: ["total_premium = ((tiv / 100) * property_rate) + surplus_lines_tax + policy_fee"],
      requiredDimensions: ["state", "occupancy", "construction_type", "tiv", "deductible"],
    },
  ],

  billQuality: {
    goodSignals: [],
    anomalyRules: [],
    contractChecks: [],
    arithmeticChecks: [],
  },

  benchmarkPolicy: {
    supportedMetrics: ["rate_per_100_tiv", "gl_rate_per_1000_revenue"],
    requiredDimensions: ["state_jurisdiction", "insured_property_total_value", "construction_occupancy_protection", "deductible_amount"],
    minimumComparableCount: 5,
    sourceRequirements: ["SERFF Public Rate Filings"],
    quoteRequiredWhen: ["surplus_lines_non_admitted", "high_hazard_occupancy"],
    prohibitedClaims: ["Never benchmark insurance premium alone without state, TIV, construction, and deductible dimensions."],
  },

  optimizationLevers: [
    {
      key: "deductible_optimization",
      description: "Model deductible scenarios only after reviewing risk tolerance, cash reserves, policy terms, and current carrier quotes. Do not claim a premium reduction without comparable evidence.",
      prerequisites: ["working_capital_reserve"],
      risks: ["higher_out_of_pocket_per_claim"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: ["state_serff_filing_update"],
    preferredSources: ["https://www.serff.com/"],
    allowedDomains: ["serff.com"],
    freshnessDays: 90,
    cacheKeyDimensions: ["state", "line_of_business"],
  },

  outputPolicy: {
    requiredCaveats: ["Insurance benchmarks require verified state filings, occupancy risk, TIV, and admitted carrier status."],
    confidenceThresholds: { extraction: 0.90, classification: 0.95 },
    humanReviewTriggers: ["surplus_lines_tax_question"],
  },

  evalCaseIds: ["eval-ins-001"],
};
