import { CategoryExpertPackV1 } from "../types";

/**
 * Wireless & Mobility Pack
 *
 * Scope: commercial wireless voice, data, and device lines for business accounts.
 * Distinct from: business-broadband-dia (fixed-line DIA, not cellular); voice/UCaaS.
 *
 * Sources and references:
 * - FCC Wireless Competition Reports (https://www.fcc.gov/reports-research/reports/wireless-competition-reports)
 * - CTIA Wireless Industry Survey (https://www.ctia.org)
 * - GSA (Global mobile Suppliers Association) pricing surveys
 * - Major US carrier published rate cards (AT&T, Verizon, T-Mobile business plans)
 * - NTIA spectrum resource data (https://www.ntia.gov)
 */
export const wirelessMobilityPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "wireless-mobility",
  displayName: "Wireless & Mobility",
  parentKey: "telecom-connectivity",
  version: "2026.08.1",
  status: "draft",
  jurisdictions: ["US"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 60,

  scope: {
    includes: [
      "Business mobile voice and data lines",
      "Corporate device management (MDM) line fees",
      "Mobile hotspot / data-only lines",
      "Roaming voice and data charges",
      "Device installment plan (DPP/EIP) fees",
      "Mobile insurance premiums on carrier invoice",
      "Corporate wireless plan access charges",
      "International add-on packages",
    ],
    excludes: [
      "Fixed-line broadband or DIA circuits (use business-broadband-dia)",
      "VoIP / UCaaS seats billed through a software platform (use cloud-iaas-paas or saas-subscriptions)",
      "Wi-Fi hardware purchases",
      "Cellular network infrastructure equipment",
    ],
    adjacentCategories: ["business-broadband-dia", "voice-ucaas"],
  },

  documentTypes: [
    {
      type: "carrier_wireless_invoice",
      indicators: [
        "Account Number",
        "MTN",
        "Mobile Telephone Number",
        "Access Charge",
        "Data Add-On",
        "Device Installment",
        "Roaming",
        "Business Account Summary",
      ],
      requiredFields: [
        "account_number",
        "billing_period",
        "total_active_lines",
        "total_charges",
      ],
    },
  ],

  billAnatomy: {
    identityFields: [
      "carrier_account_number",
      "billing_account_name",
      "invoice_number",
    ],
    periodFields: [
      "billing_period_start",
      "billing_period_end",
      "contract_expiry",
    ],
    quantityFields: [
      "total_active_lines",
      "data_gb_used",
      "roaming_minutes",
      "device_count",
    ],
    pricingFields: [
      "monthly_access_charge_per_line",
      "plan_name",
      "device_installment_amount",
      "overage_rate_per_gb",
    ],
    taxFeeFields: [
      "federal_universal_service_fee",
      "state_and_local_wireless_surcharges",
      "e911_fees",
      "regulatory_recovery_fee",
    ],
    contractFields: [
      "contract_end_date",
      "auto_renew_flag",
      "early_termination_fee",
      "corporate_discount_program",
    ],
  },

  lineItems: [
    {
      canonicalCode: "WIRE-ACCESS-01",
      label: "Monthly Line Access Charge",
      aliases: [
        "Line Access",
        "Access Fee",
        "Monthly Service",
        "Wireless Service Charge",
        "Voice Line",
      ],
      meaning:
        "Fixed monthly fee per active wireless line that grants network access regardless of usage.",
      chargeClass: "fixed",
      units: ["lines"],
      calculation: "active_lines * access_charge_per_line",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: [
        "check_inactive_line_charges",
        "check_former_employee_lines",
        "check_access_charge_vs_contracted_rate",
      ],
    },
    {
      canonicalCode: "WIRE-DATA-01",
      label: "Data Plan / Pool Charge",
      aliases: [
        "Data Plan",
        "Shared Data",
        "Data Pool",
        "Mobile Data",
        "LTE/5G Data",
      ],
      meaning:
        "Charge for a defined data allowance on a plan (individual or pooled across account).",
      chargeClass: "fixed",
      units: ["GB", "lines"],
      calculation: "plan_data_charge (pooled or per-line)",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: ["check_unused_data_pool_overage"],
    },
    {
      canonicalCode: "WIRE-OVERAGE-01",
      label: "Data Overage Charge",
      aliases: [
        "Excess Data",
        "Overage",
        "Additional Data",
        "Pay-Per-Use Data",
      ],
      meaning:
        "Per-GB or per-MB charge for data usage that exceeds the contracted plan allowance.",
      chargeClass: "usage",
      units: ["GB"],
      calculation: "overage_gb * overage_rate_per_gb",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_persistent_overage_vs_plan_upgrade",
        "check_overage_on_unlimited_plan",
      ],
    },
    {
      canonicalCode: "WIRE-ROAM-01",
      label: "International Roaming Charge",
      aliases: [
        "Roaming",
        "International Data",
        "International Voice",
        "Travel Pass",
        "World Plan",
      ],
      meaning:
        "Charges for voice, data, or SMS used outside the domestic network coverage area.",
      chargeClass: "usage",
      units: ["minutes", "MB", "SMS"],
      calculation: "usage * roaming_rate",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based", "daily_flat_rate"],
      anomalyRules: [
        "check_roaming_without_travel_plan",
        "check_recurring_roaming_on_office_lines",
      ],
    },
    {
      canonicalCode: "WIRE-DPP-01",
      label: "Device Installment Plan (DPP/EIP)",
      aliases: [
        "Device Payment",
        "Equipment Installment",
        "Phone Payment",
        "DPP",
        "EIP",
      ],
      meaning:
        "Carrier-financed device installment charge amortizing handset cost over term.",
      chargeClass: "fixed",
      units: ["devices"],
      calculation: "device_cost / term_months",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["installment"],
      anomalyRules: [
        "check_dpp_on_terminated_line",
        "check_payoff_amount_vs_remaining_balance",
      ],
    },
    {
      canonicalCode: "WIRE-INS-01",
      label: "Device Insurance / Protection",
      aliases: [
        "Mobile Secure",
        "Device Protection",
        "Phone Insurance",
        "Assurant",
        "AppleCare+",
      ],
      meaning:
        "Monthly premium for carrier-offered or third-party device loss, theft, or damage insurance.",
      chargeClass: "fixed",
      units: ["lines"],
      calculation: "enrolled_lines * monthly_insurance_premium",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: [
        "check_insurance_on_high_corporate_turnover_lines",
        "check_duplicate_insurance_programs",
      ],
    },
    {
      canonicalCode: "WIRE-HOTSPOT-01",
      label: "Mobile Hotspot / Data-Only Line",
      aliases: [
        "Hotspot",
        "Tablet Line",
        "IoT Line",
        "Connected Device",
        "MiFi",
        "Jetpack",
      ],
      meaning:
        "Recurring charge for a wireless data-only device or SIM that provides shared hotspot or IoT connectivity.",
      chargeClass: "fixed",
      units: ["lines", "devices"],
      calculation: "hotspot_lines * access_charge_per_line",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: ["check_hotspot_usage_vs_active_employee"],
    },
    {
      canonicalCode: "WIRE-USF-01",
      label: "Federal Universal Service Fund (USF) Recovery",
      aliases: ["USF", "Universal Service Fee", "Federal USF", "USF Recovery"],
      meaning:
        "Carrier recovery of federal USF obligations. Amount is carrier-determined and varies by quarter based on FCC contribution factor. Not a tax; not universally mandated on all line types.",
      chargeClass: "pass_through",
      units: ["lines"],
      calculation: "usf_rate * interstate_revenue",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["passthrough"],
      anomalyRules: ["check_usf_rate_vs_published_quarterly_factor"],
    },
    {
      canonicalCode: "WIRE-E911-01",
      label: "E911 / 9-1-1 Surcharge",
      aliases: ["E911", "9-1-1 Fee", "Emergency 911", "Public Safety Fee"],
      meaning:
        "State- or locality-mandated per-line surcharge to fund emergency dispatch infrastructure.",
      chargeClass: "pass_through",
      units: ["lines"],
      calculation: "e911_rate_per_line * active_lines",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["passthrough"],
      anomalyRules: [],
    },
    {
      canonicalCode: "WIRE-INACTIVE-01",
      label: "Suspended / Inactive Line Charge",
      aliases: [
        "Suspended Line",
        "Inactive Service",
        "Vacation Hold",
        "Suspended Service",
      ],
      meaning:
        "Reduced charge applied while a line is suspended rather than fully terminated. Can persist indefinitely on unreviewed accounts.",
      chargeClass: "fixed",
      units: ["lines"],
      calculation: "suspended_rate_per_line * suspended_lines",
      expectedContext: ["corporate_wireless_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: [
        "check_suspended_line_duration_exceeds_90_days",
        "check_former_employee_inactive_lines",
      ],
    },
  ],

  pricingModels: [
    {
      key: "per_line_corporate_plan",
      explanation:
        "Corporate accounts negotiate per-line monthly access rates by volume. Larger line counts unlock discounted rate tiers. Published carrier rate cards are starting points; negotiated rates typically differ.",
      fixedComponents: ["access_charge_per_line"],
      variableComponents: ["data_overage", "roaming"],
      passThroughComponents: ["usf", "e911", "state_wireless_surcharges"],
      formulas: [
        "total = (active_lines * access_rate) + dpp_charges + insurance + overages + passthrough_fees",
      ],
      requiredDimensions: [
        "line_count_band",
        "plan_tier",
        "carrier",
        "contract_term_months",
      ],
    },
    {
      key: "pooled_data_model",
      explanation:
        "All lines in an account share a common data pool. Individual lines drawing from the pool pay no per-line data overage unless the pool is exhausted.",
      fixedComponents: ["access_charge_per_line", "pool_data_charge"],
      variableComponents: ["pool_overage_per_gb"],
      passThroughComponents: ["usf", "e911"],
      formulas: [
        "total = (lines * access_rate) + pool_charge + max(0, used_gb - pool_gb) * overage_rate + fees",
      ],
      requiredDimensions: ["pool_gb", "line_count", "carrier"],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-wire-lines-matched",
        description: "All lines matched to active employee directory or asset register.",
        severity: "info",
        deterministic: false,
        requiredFields: ["employee_directory", "active_mtns"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-wire-orphan-lines",
        description: "Active access charges exist for mobile numbers not found in employee directory or MDM inventory.",
        severity: "high",
        deterministic: false,
        requiredFields: ["active_lines", "employee_roster"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-wire-dpp-terminated",
        description: "Device installment (DPP) charge exists on a terminated line.",
        severity: "high",
        deterministic: true,
        requiredFields: ["dpp_charge", "line_status"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-wire-roaming-unexpected",
        description: "International roaming charges appear on lines assigned to employees with no expected travel.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["roaming_charges", "employee_role"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-wire-overage-unlimited",
        description: "Data overage charges appear on lines with unlimited data plans.",
        severity: "high",
        deterministic: true,
        requiredFields: ["overage_charge", "plan_name"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    contractChecks: [
      {
        ruleId: "check-wire-contracted-rate",
        description: "Verify contracted per-line rate matches billed access charge.",
        severity: "medium",
        deterministic: true,
        requiredFields: ["contracted_rate_per_line", "billed_access_charge"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    arithmeticChecks: [
      {
        ruleId: "arith-wire-invoice-total",
        description: "Sum of per-line charges plus overages plus fees equals invoice total.",
        severity: "high",
        deterministic: true,
        requiredFields: ["line_charges", "overage_charges", "fees", "invoice_total"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
  },

  benchmarkPolicy: {
    supportedMetrics: [
      "effective_access_charge_per_line_per_month",
      "blended_cost_per_gb_consumed",
    ],
    requiredDimensions: [
      "line_count_band",
      "carrier",
      "plan_type",
      "contract_term_months",
      "geography",
    ],
    minimumComparableCount: 5,
    sourceRequirements: [
      "Carrier published business rate cards (AT&T, Verizon, T-Mobile business)",
      "CTIA Wireless Industry Survey",
    ],
    quoteRequiredWhen: [
      "negotiated_corporate_agreement_pricing",
      "large_enterprise_volume_discount",
    ],
    prohibitedClaims: [
      "Comparing consumer plan pricing to corporate rate cards.",
      "Assuming USF rate without referencing the current FCC quarterly contribution factor.",
      "Claiming a benchmark savings amount without carrier, line count, plan, and term alignment.",
    ],
  },

  optimizationLevers: [
    {
      key: "inactive_line_audit",
      description:
        "Identify lines with no usage in 30+ days. Cross-reference with HR offboarding records. Terminate confirmed orphan lines.",
      prerequisites: ["mdm_integration_or_carrier_usage_export"],
      risks: ["terminating_active_lines_in_error"],
      needsAuthorization: true,
    },
    {
      key: "plan_rightsizing",
      description:
        "Identify lines consistently using less than 50% of their data allowance. Evaluate downgrade to a lower data tier.",
      prerequisites: ["3_month_usage_history"],
      risks: ["data_bottleneck_on_reduced_plan"],
      needsAuthorization: true,
    },
    {
      key: "carrier_renegotiation",
      description:
        "Corporate accounts with 50+ lines are typically eligible for negotiated rates below published rate cards. Re-bid at contract term or annually.",
      prerequisites: ["contract_expiry_within_12_months_or_month_to_month"],
      risks: ["service_interruption_during_migration"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: [
      "usf_rate_question",
      "carrier_pricing_update",
      "current_plan_availability_question",
    ],
    preferredSources: [
      "https://www.fcc.gov/reports-research/reports/wireless-competition-reports",
      "https://www.ctia.org/industry-data",
    ],
    allowedDomains: ["fcc.gov", "ctia.org"],
    freshnessDays: 60,
    cacheKeyDimensions: ["carrier", "plan_tier", "line_count_band"],
  },

  outputPolicy: {
    requiredCaveats: [
      "Wireless savings estimates require current carrier rate card alignment with actual line count, plan tier, and contract term.",
      "USF recovery rates change quarterly based on FCC contribution factor — verify current rate at fcc.gov before quoting.",
      "Device installment and insurance charges on terminated lines require carrier confirmation before dispute.",
    ],
    confidenceThresholds: { extraction: 0.90, classification: 0.93 },
    humanReviewTriggers: [
      "disputed_device_payoff",
      "roaming_charges_exceed_10_percent_of_bill",
      "more_than_5_inactive_lines_identified",
    ],
  },

  evalCaseIds: [
    "eval-wireless-001",
    "eval-wireless-002",
    "eval-wireless-003",
    "eval-wireless-004",
    "eval-wireless-005",
    "eval-wireless-006",
    "eval-wireless-007",
    "eval-wireless-008",
    "eval-wireless-009",
    "eval-wireless-010",
  ],
};
