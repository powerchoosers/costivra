import { CategoryExpertPackV1 } from "../types";

export const solidWastePack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "solid-waste-recycling",
  displayName: "Solid Waste, Recycling & Environmental Services",
  parentKey: "waste-environmental",
  version: "2026.08.1",
  status: "draft",
  jurisdictions: ["US"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 30,

  scope: {
    includes: [
      "Commercial dumpster service",
      "Front-load container pickup",
      "Roll-off container rental and haul",
      "Recycling program fees",
      "Compactor pull and service",
      "Cardboard baler program",
    ],
    excludes: ["Hazardous waste disposal", "Medical waste", "Grease trap service", "Construction debris"],
    adjacentCategories: ["hazardous-industrial-waste", "medical-waste", "environmental-compliance-services"],
  },

  documentTypes: [
    {
      type: "waste_hauler_invoice",
      indicators: [
        "Container Size",
        "Pickup Frequency",
        "Fuel Surcharge",
        "Environmental Fee",
        "Franchise Fee",
        "Contamination Fee",
        "Overage Charge",
      ],
      requiredFields: ["service_address", "container_size", "pickup_frequency", "base_rate"],
    },
  ],

  billAnatomy: {
    identityFields: ["account_number", "service_address", "container_id"],
    periodFields: ["service_period_start", "service_period_end"],
    quantityFields: ["container_size_yards", "pickup_frequency_per_week", "actual_pickups"],
    pricingFields: ["base_haul_rate", "container_rental_fee", "recycling_fee"],
    taxFeeFields: [
      "fuel_surcharge",
      "environmental_fee",
      "franchise_fee",
      "regulatory_cost_recovery",
      "state_solid_waste_tax",
    ],
    contractFields: ["contract_term", "auto_renew_clause", "rate_escalator_percentage", "notice_period_days"],
  },

  lineItems: [
    {
      canonicalCode: "WASTE-HAUL-01",
      label: "Base Haul / Service Charge",
      aliases: ["Collection Charge", "Haul Fee", "Service Fee", "Pick-Up Charge"],
      meaning:
        "Core recurring charge for emptying the container on the scheduled frequency. Rate varies by container size (1.5 to 8 cubic yards), pickup frequency (1x to 6x/week), and local market competition or franchise territory exclusivity.",
      chargeClass: "fixed",
      units: ["per_pickup", "flat_per_month"],
      calculation: "scheduled_pickups * per_haul_rate",
      expectedContext: ["front_load_dumpster", "rear_load_dumpster"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["3_year_auto_renew", "5_year_exclusive_franchise"],
      anomalyRules: ["check_pickup_count_vs_scheduled", "check_rate_vs_contract_schedule"],
    },
    {
      canonicalCode: "WASTE-FUEL-01",
      label: "Fuel Surcharge",
      aliases: ["Fuel Recovery", "Energy Recovery", "Diesel Surcharge"],
      meaning:
        "Pass-through surcharge that fluctuates with diesel fuel prices. Major haulers (Republic Services, Waste Management, GFL) publish fuel surcharge tables indexed to the DOE weekly retail diesel price. Should be verifiable against the carrier's published index. Has historically been a source of margin inflation when not indexed properly.",
      chargeClass: "surcharge",
      units: ["percentage_of_base_service"],
      expectedContext: ["all_waste_services"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["percentage_of_base_service"],
      anomalyRules: ["check_fuel_surcharge_vs_hauler_index", "check_fuel_surcharge_stacking"],
    },
    {
      canonicalCode: "WASTE-ENV-01",
      label: "Environmental / Regulatory Fee",
      aliases: ["Environmental Recovery", "Regulatory Cost Recovery", "Compliance Fee"],
      meaning:
        "Carrier-imposed fee that is not itself a government tax. Its basis, contract treatment, and any pass-through rights need to be verified against the service agreement and local requirements.",
      chargeClass: "surcharge",
      units: ["percentage_of_base_service"],
      expectedContext: ["all_waste_services"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["carrier_discretionary"],
      anomalyRules: ["check_env_fee_creep", "check_env_fee_vs_franchise_territory_rules"],
    },
    {
      canonicalCode: "WASTE-FRAN-01",
      label: "Franchise / Municipal Fee",
      aliases: ["Franchise Fee", "City Fee", "Municipal Fee", "Hauler Franchise"],
      meaning:
        "Fee paid by the carrier to the local municipality for exclusive hauling rights within a franchise territory. Typically passed through to customers at the stated rate. In franchise markets, customers cannot switch carriers regardless of price — making renewal negotiations with the carrier the only leverage point.",
      chargeClass: "assessment",
      units: ["percentage_of_service", "flat_per_month"],
      expectedContext: ["franchise_territory"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["pass_through_at_municipal_rate"],
      anomalyRules: ["verify_franchise_fee_rate_vs_municipal_agreement"],
    },
    {
      canonicalCode: "WASTE-CONTAM-01",
      label: "Contamination / Recycling Contamination Fee",
      aliases: ["Contamination Fee", "Recycling Contamination", "Material Recovery Fee"],
      meaning:
        "Per-occurrence or per-load fee when recyclable containers are contaminated with non-recyclable material, requiring diversion to landfill disposal. These fees should be traceable to specific pickups. High contamination frequency may indicate training or container placement issues.",
      chargeClass: "penalty",
      units: ["flat_per_occurrence"],
      expectedContext: ["recycling_program"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["per_incident"],
      anomalyRules: ["check_contamination_fee_frequency_and_trend"],
    },
    {
      canonicalCode: "WASTE-EXTRA-01",
      label: "Extra Pickup / On-Demand Haul Charge",
      aliases: ["Additional Pickup", "On-Call Pickup", "Overflow Haul", "Extra Pull"],
      meaning:
        "Charge for a pickup outside the contracted schedule, typically at a higher per-haul rate than the contracted rate. Repeated extra pickups may indicate the container size or frequency is undersized for actual waste volume, requiring contract adjustment.",
      chargeClass: "one_time",
      units: ["per_pickup"],
      expectedContext: ["overflow_service"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["per_occurrence_at_stated_rate"],
      anomalyRules: ["check_extra_pickup_frequency_vs_scheduled_capacity"],
    },
    {
      canonicalCode: "WASTE-RENT-01",
      label: "Container Rental Charge",
      aliases: ["Container Rental", "Equipment Fee", "Dumpster Rental"],
      meaning: "Recurring charge for the container or related equipment used for collection service.",
      chargeClass: "fixed",
      units: ["flat"],
      expectedContext: ["container_service"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["included_in_base_rate", "separate_line_item"],
      anomalyRules: ["check_container_rental_against_contract_schedule"],
    },
    {
      canonicalCode: "WASTE-DISPOSAL-01",
      label: "Disposal / Landfill Charge",
      aliases: ["Disposal Fee", "Tipping Fee", "Landfill Charge"],
      meaning: "Charge associated with disposal of collected material when the applicable agreement allows it as a separate billed component.",
      chargeClass: "pass_through",
      units: ["tons", "yards", "flat"],
      expectedContext: ["roll_off", "special_disposal"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["pass_through_at_cost", "included_in_rate"],
      anomalyRules: ["check_disposal_quantity_against_weight_ticket_or_service_record"],
    },
  ],

  pricingModels: [
    {
      key: "fixed_frequency_contract",
      explanation:
        "Monthly charge based on container size and fixed weekly pickup frequency, plus variable surcharges. Rate is locked for the contract term with an annual escalator (typically CPI or 3–6% fixed). The market is highly local — pricing depends on franchise territory status, disposal distance to landfill, and carrier consolidation in the area.",
      fixedComponents: ["base_haul_rate", "container_rental"],
      variableComponents: ["fuel_surcharge"],
      passThroughComponents: ["franchise_fee", "state_waste_tax"],
      formulas: [
        "monthly_total = base_haul_service + container_rental + fuel_surcharge + env_fee + franchise_fee + taxes",
      ],
      requiredDimensions: ["container_size_yards", "pickup_frequency", "service_address", "franchise_territory_status"],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-pickup-count-matches",
        description: "Actual pickup count for billing period matches contracted weekly frequency × weeks in period.",
        severity: "info",
        deterministic: true,
        requiredFields: ["actual_pickups", "scheduled_frequency", "billing_days"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-fuel-surcharge-above-index",
        description:
          "Fuel surcharge percentage exceeds the hauler's published fuel index rate for the current DOE diesel price band.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["fuel_surcharge_pct", "hauler_name"],
        evidenceRequired: true,
        currentResearchRequired: true,
      },
      {
        ruleId: "rule-rate-increase-without-escalator",
        description:
          "Base haul rate increased mid-contract in excess of the contractual escalator percentage or without corresponding contract amendment notice.",
        severity: "high",
        deterministic: true,
        requiredFields: ["current_base_rate", "prior_period_base_rate", "escalator_percentage"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-phantom-pickup-charge",
        description:
          "Billing shows more pickups than scheduled frequency would allow for the service period — possible phantom haul charge.",
        severity: "high",
        deterministic: true,
        requiredFields: ["billed_pickups", "scheduled_frequency", "billing_days"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    contractChecks: [],
    arithmeticChecks: [],
  },

  benchmarkPolicy: {
    supportedMetrics: ["base_haul_rate_per_pickup", "effective_monthly_rate_per_yard_week"],
    requiredDimensions: ["container_size_yards", "pickup_frequency_per_week", "service_address_zip", "franchise_territory_status"],
    minimumComparableCount: 2,
    sourceRequirements: [
      "Competing carrier quotes (only available in non-franchise markets)",
      "Hauler published fuel surcharge index",
    ],
    quoteRequiredWhen: ["contract_renewal_within_90_days", "non_franchise_market"],
    prohibitedClaims: [
      "Quoting a national average waste rate without knowing franchise territory status.",
      "Comparing rates between franchise and competitive markets as equivalent.",
    ],
  },

  optimizationLevers: [
    {
      key: "right_size_container",
      description:
        "Match container size and pickup frequency to actual waste volume. Oversized containers or over-frequent pickups are a common source of overspend. Undersized containers generate extra pickup charges. Physical observation or carrier pickup log data can establish actual utilization.",
      prerequisites: ["waste_volume_data_or_observation"],
      risks: ["overflow_between_pickups"],
      needsAuthorization: true,
    },
    {
      key: "competitive_quote_at_renewal",
      description:
        "Obtain competing hauler quotes 90–120 days before contract expiration in non-franchise markets. In franchise markets, the only leverage is direct negotiation with the incumbent carrier on rate, escalator cap, and surcharge treatment.",
      prerequisites: ["non_franchise_market", "notice_period_open"],
      risks: ["service_continuity_during_transition"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: ["doe_weekly_diesel_price_update", "municipal_franchise_agreement_change"],
    preferredSources: ["https://www.eia.gov/petroleum/gasdiesel/"],
    allowedDomains: ["eia.gov", "epa.gov", "republicservices.com", "wm.com"],
    freshnessDays: 30,
    cacheKeyDimensions: ["hauler_name", "service_zip"],
  },

  outputPolicy: {
    requiredCaveats: [
      "Solid waste pricing is highly local. Franchise territory status determines whether competitive alternatives exist.",
      "Fuel surcharge rates must be verified against the specific hauler's published index, not a generic diesel price.",
    ],
    confidenceThresholds: { extraction: 0.87, classification: 0.93 },
    humanReviewTriggers: ["phantom_pickup_suspected", "fuel_surcharge_above_published_index"],
  },

  evalCaseIds: ["eval-waste-001", "eval-waste-002", "eval-waste-003", "eval-waste-004", "eval-waste-005", "eval-waste-006", "eval-waste-007", "eval-waste-008", "eval-waste-009", "eval-waste-010"],
};
