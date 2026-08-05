import { CategoryExpertPackV1 } from "../types";

export const telecomBroadbandPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "business-broadband-dia",
  displayName: "Business Broadband & Dedicated Internet Access",
  parentKey: "telecom-connectivity",
  version: "2026.08.1",
  status: "draft",
  jurisdictions: ["US"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 30,

  scope: {
    includes: [
      "Dedicated Internet Access (DIA)",
      "Business fiber broadband",
      "Cable modem business service",
      "T1/DS3 circuits",
      "Ethernet over fiber",
      "Fixed wireless broadband",
    ],
    excludes: ["Wireless mobility/cellular", "VoIP/UCaaS", "MPLS WAN circuits", "SD-WAN managed service"],
    adjacentCategories: ["wan-sdwan-mpls", "voice-sip-ucaas-ccaas", "wireless-mobility"],
  },

  documentTypes: [
    {
      type: "carrier_telecom_invoice",
      indicators: ["Circuit ID", "USOC", "Access Line", "Mbps", "MRC", "NRC", "Local Loop"],
      requiredFields: ["circuit_id", "service_address", "bandwidth_mbps", "monthly_recurring_charge"],
    },
  ],

  billAnatomy: {
    identityFields: ["circuit_id", "account_number", "service_address", "location_id"],
    periodFields: ["billing_period_start", "billing_period_end", "service_order_date"],
    quantityFields: ["bandwidth_mbps", "committed_information_rate", "burst_bandwidth"],
    pricingFields: ["monthly_recurring_charge", "port_fee", "local_loop_fee"],
    taxFeeFields: [
      "federal_universal_service_fund",
      "state_usf",
      "e911_surcharge",
      "local_telecom_tax",
      "regulatory_recovery_fee",
      "property_tax_recovery",
    ],
    contractFields: ["contract_term_months", "notice_period_days", "auto_renew_clause", "early_termination_liability"],
  },

  lineItems: [
    {
      canonicalCode: "TELE-DIA-01",
      label: "Monthly Recurring Charge (MRC) — DIA Circuit",
      aliases: ["MRC", "Monthly Service Charge", "Circuit MRC", "Recurring Service Fee"],
      meaning:
        "Core monthly fee for maintaining a dedicated internet circuit at the contracted bandwidth tier. Usually a negotiated rate separate from regulatory surcharges.",
      chargeClass: "fixed",
      units: ["Mbps", "flat"],
      calculation: "contracted_bandwidth_tier_rate",
      expectedContext: ["dia_circuit", "business_broadband"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["fixed_term_contract", "month_to_month"],
      anomalyRules: ["check_mrc_vs_contract_rate", "check_bandwidth_tier_drift"],
    },
    {
      canonicalCode: "TELE-USF-01",
      label: "Federal Universal Service Fund (USF) Surcharge",
      aliases: ["FUSF", "Federal USF", "Universal Service", "FCC Universal Service"],
      meaning:
        "Provider-billed contribution-related surcharge. Treatment, basis, and pass-through rights must be verified against the service agreement and current provider documentation; the underlying federal contribution factor changes quarterly.",
      chargeClass: "assessment",
      units: ["percentage_of_interstate_revenue"],
      expectedContext: ["interstate_service"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["pass_through_at_cost"],
      anomalyRules: ["verify_usf_rate_vs_fcc_quarterly_filing"],
    },
    {
      canonicalCode: "TELE-E911-01",
      label: "E911 Surcharge",
      aliases: ["Emergency Service", "911 Fee", "E911 Fee"],
      meaning: "State or local surcharge funding emergency 911 dispatch. Rate is jurisdiction-specific and set by state PUC.",
      chargeClass: "assessment",
      units: ["flat_per_line", "flat_per_location"],
      expectedContext: ["voice_capable_service"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["pass_through_at_cost"],
      anomalyRules: ["check_e911_line_count_vs_active_circuits"],
    },
    {
      canonicalCode: "TELE-NRC-01",
      label: "Non-Recurring Charge (NRC) — Installation / Provisioning",
      aliases: ["NRC", "Installation Charge", "One-Time Setup Fee", "Provisioning Fee"],
      meaning:
        "One-time charge for physical installation, circuit provisioning, or service order processing. Should not recur after initial setup period.",
      chargeClass: "one_time",
      units: ["flat"],
      expectedContext: ["new_service_order", "upgrade"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["waived_on_term_contract", "charged_on_month_to_month"],
      anomalyRules: ["check_nrc_recurring_on_established_circuit"],
    },
    {
      canonicalCode: "TELE-LOOP-01",
      label: "Local Loop / Access Charge",
      aliases: ["Local Loop", "Access Fee", "Last Mile", "Building Access", "Distribution Access"],
      meaning:
        "Fee for the physical last-mile infrastructure from the carrier network to the customer premises. May be a separate line item from port or transport charges in unbundled billing.",
      chargeClass: "fixed",
      units: ["flat"],
      expectedContext: ["unbundled_billing", "wholesale_access"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["included_in_mrc", "separate_line_item"],
      anomalyRules: ["check_duplicate_loop_charge_vs_mrc"],
    },
    {
      canonicalCode: "TELE-PROP-01",
      label: "Property Tax Recovery Surcharge",
      aliases: ["PTR", "Property Tax Surcharge", "Property Recovery Fee"],
      meaning:
        "Carrier pass-through surcharge to recover a portion of property taxes on network infrastructure. Technically optional markup — not a direct government tax.",
      chargeClass: "surcharge",
      units: ["percentage_of_mrc"],
      expectedContext: ["carrier_imposed_surcharge"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["carrier_discretionary"],
      anomalyRules: ["check_property_tax_recovery_creep"],
    },
    {
      canonicalCode: "TELE-PORT-01",
      label: "Port / Network Access Charge",
      aliases: ["Port Charge", "Network Access", "UNI Fee", "Ethernet Port"],
      meaning: "Recurring charge for a carrier network port or customer handoff, which may be included in or separate from the circuit MRC.",
      chargeClass: "fixed",
      units: ["flat"],
      expectedContext: ["dia_circuit", "ethernet_access"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["included_in_mrc", "separate_line_item"],
      anomalyRules: ["check_port_charge_against_service_order"],
    },
    {
      canonicalCode: "TELE-TAX-01",
      label: "Telecommunications Tax",
      aliases: ["Telecom Tax", "Communications Tax", "Sales Tax"],
      meaning: "Jurisdiction-specific tax shown on a communications invoice; assess it using the service address and tax treatment of the billed service.",
      chargeClass: "tax",
      units: ["percentage", "flat"],
      expectedContext: ["taxable_service"],
      benchmarkable: false,
      regulatory: true,
      commonContractTreatment: ["pass_through_at_cost"],
      anomalyRules: ["check_tax_jurisdiction_and_exemption"],
    },
  ],

  pricingModels: [
    {
      key: "dedicated_bandwidth_tiered",
      explanation:
        "Fixed monthly pricing for committed bandwidth (e.g., 100 Mbps, 500 Mbps, 1 Gbps), with separate line items for regulatory surcharges. Price determined by bandwidth tier, building access type, contract term length, and provider competitive position at the address.",
      fixedComponents: ["mrc_circuit", "local_loop"],
      variableComponents: [],
      passThroughComponents: ["usf_surcharge", "e911", "state_telecom_taxes"],
      formulas: ["total = mrc + surcharges + applicable_taxes"],
      requiredDimensions: ["bandwidth_mbps", "service_address", "contract_term_months", "carrier"],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-circuit-id-present",
        description: "Circuit ID present on every recurring service line matches service order.",
        severity: "info",
        deterministic: true,
        requiredFields: ["circuit_id"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-usf-rate-mismatch",
        description:
          "USF rate does not match current FCC quarterly contribution factor. Rate changes quarterly and must be verified against FCC Universal Service Administrative Company filings.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["usf_amount", "interstate_revenue_basis"],
        evidenceRequired: true,
        currentResearchRequired: true,
      },
      {
        ruleId: "rule-inactive-circuit-mrc",
        description: "Circuit MRC present for a location with no active operations per location roster.",
        severity: "high",
        deterministic: true,
        requiredFields: ["circuit_id", "service_address"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-nrc-on-established-circuit",
        description: "Non-recurring installation charge billed on a circuit that has been active for more than 60 days.",
        severity: "high",
        deterministic: true,
        requiredFields: ["nrc_amount", "service_order_date"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    contractChecks: [],
    arithmeticChecks: [],
  },

  benchmarkPolicy: {
    supportedMetrics: ["mrc_per_mbps", "effective_monthly_rate"],
    requiredDimensions: ["bandwidth_tier_mbps", "service_address_zip", "contract_term_months", "carrier"],
    minimumComparableCount: 3,
    sourceRequirements: ["Current carrier quote at matching address", "FCC Form 477 broadband provider data"],
    quoteRequiredWhen: ["annual_spend_over_12k", "contract_renewal_within_90_days"],
    prohibitedClaims: [
      "Comparing national average broadband price to enterprise DIA circuit pricing.",
      "Using residential broadband pricing as a commercial benchmark.",
    ],
  },

  optimizationLevers: [
    {
      key: "competitive_quote_at_renewal",
      description:
        "Obtain competing quotes from alternative carriers at the same address during the notice window. DIA pricing at a given building is determined by which carriers have existing fiber infrastructure — a carrier already in the building can price significantly below one that requires a new build.",
      prerequisites: ["carrier_fiber_availability_lookup", "renewal_notice_window_open"],
      risks: ["service_interruption_during_cutover"],
      needsAuthorization: true,
    },
    {
      key: "bandwidth_right_sizing",
      description:
        "Compare contracted bandwidth tier to actual utilization data from router/SNMP metrics. Customers often buy ahead and remain at 20–30% of contracted capacity, paying for unused headroom.",
      prerequisites: ["utilization_data_available"],
      risks: ["insufficient_headroom_if_usage_grows"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: ["quarterly_usf_rate_change", "carrier_tariff_revision", "contract_renewal"],
    preferredSources: ["https://www.usac.org/about/universal-service-fund/usf-contribution-factor/"],
    allowedDomains: ["usac.org", "fcc.gov", "bls.gov"],
    freshnessDays: 30,
    cacheKeyDimensions: ["state", "carrier", "bandwidth_tier"],
  },

  outputPolicy: {
    requiredCaveats: [
      "Telecom pricing is highly address-specific. A benchmark is not valid without a carrier quote at the exact service address.",
      "USF surcharge rates change quarterly. Verify against current FCC/USAC filing before citing a rate.",
    ],
    confidenceThresholds: { extraction: 0.88, classification: 0.93 },
    humanReviewTriggers: ["usf_rate_exceeds_fcc_filing", "nrc_charge_on_established_circuit"],
  },

  evalCaseIds: ["eval-tele-001", "eval-tele-002", "eval-tele-003", "eval-tele-004", "eval-tele-005", "eval-tele-006", "eval-tele-007", "eval-tele-008", "eval-tele-009", "eval-tele-010"],
};
