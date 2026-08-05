import { CategoryExpertPackV1 } from "../types";

export const merchantProcessingPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "merchant-processing",
  displayName: "Merchant Processing & Card Acceptance Fees",
  parentKey: "payments-finance",
  version: "2026.08.1",
  status: "draft",
  jurisdictions: ["US"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 60,

  scope: {
    includes: [
      "Credit and debit card processing fees",
      "Interchange pass-through charges",
      "Processor markup (basis points and per-transaction)",
      "PCI compliance fees",
      "Gateway and payment platform fees",
      "Chargeback and dispute fees",
      "Batch settlement fees",
    ],
    excludes: ["ACH/bank transfer fees", "Wire transfer fees", "Payroll processing", "Check processing"],
    adjacentCategories: ["payment-gateways", "banking-treasury-fees"],
  },

  documentTypes: [
    {
      type: "merchant_processing_statement",
      indicators: [
        "Interchange",
        "Basis Points",
        "MID",
        "Transaction Fee",
        "Gross Volume",
        "Effective Rate",
        "Qualified / Non-Qualified",
        "Downgrade",
      ],
      requiredFields: ["gross_volume", "total_fees", "transaction_count", "card_type_breakdown"],
    },
  ],

  billAnatomy: {
    identityFields: ["merchant_id", "dba_name", "processing_account_number"],
    periodFields: ["statement_period_start", "statement_period_end", "batch_date"],
    quantityFields: ["gross_volume", "transaction_count", "refund_volume", "chargeback_count"],
    pricingFields: [
      "interchange_fees",
      "processor_markup_bps",
      "per_transaction_fee",
      "monthly_minimum_fee",
      "statement_fee",
    ],
    taxFeeFields: ["pci_compliance_fee", "non_pci_compliance_fee", "card_brand_assessment_fee"],
    contractFields: ["pricing_model_type", "contract_term", "early_termination_fee_structure"],
  },

  lineItems: [
    {
      canonicalCode: "MERCH-XCHG-01",
      label: "Interchange Fees",
      aliases: ["Interchange", "Interchange Cost", "IC Fees", "Card Association Fees"],
      meaning:
        "Fees set by Visa, Mastercard, Discover, and Amex that flow to the card-issuing bank. Interchange is not the processor's margin — it is a pass-through cost determined by card type, transaction method (card-present vs. card-not-present), merchant category code (MCC), and qualification criteria. These rates are published publicly.",
      chargeClass: "pass_through",
      units: ["percentage_plus_per_transaction"],
      expectedContext: ["card_acceptance"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["pass_through_at_cost", "bundled_into_flat_rate"],
      anomalyRules: [
        "check_interchange_rate_vs_published_schedule",
        "check_card_type_downgrade_frequency",
        "check_non_qualified_percentage",
      ],
    },
    {
      canonicalCode: "MERCH-MARKUP-01",
      label: "Processor Markup / Service Fee",
      aliases: ["Discount Rate Markup", "Basis Point Markup", "Service Fee", "Processing Markup"],
      meaning:
        "The processor's actual margin charged above interchange. On an interchange-plus pricing model this is transparent (e.g., interchange + 0.20% + $0.10). On tiered or flat-rate models it is bundled and harder to separate. This is the negotiable component.",
      chargeClass: "fixed",
      units: ["basis_points_of_volume", "per_transaction_flat"],
      expectedContext: ["interchange_plus", "tiered", "flat_rate"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["negotiated_bps_plus_transaction", "flat_percentage"],
      anomalyRules: ["check_effective_markup_rate", "check_tiered_downgrade_abuse"],
    },
    {
      canonicalCode: "MERCH-ASSESS-01",
      label: "Card Brand Assessment Fees",
      aliases: ["Visa Assessment", "Mastercard Assessment", "Network Fee", "Card Brand Fee"],
      meaning:
        "Fees charged by Visa, Mastercard, Discover, and Amex to the processor. These include the standard network assessment (typically 0.13–0.15% for Visa/MC), FANF (Fixed Acquirer Network Fee for Visa), and other brand-specific charges. These are pass-through at set published rates.",
      chargeClass: "assessment",
      units: ["percentage_of_volume", "flat_per_location"],
      expectedContext: ["all_card_volume"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["pass_through_at_published_rate"],
      anomalyRules: ["check_assessment_rate_vs_card_brand_schedule"],
    },
    {
      canonicalCode: "MERCH-PCI-01",
      label: "PCI Compliance / Non-Compliance Fee",
      aliases: ["PCI Fee", "Security Fee", "Data Security Fee", "Non-Compliance Penalty"],
      meaning:
        "Monthly fee charged by processors for PCI DSS compliance administration. A PCI non-compliance fee is a penalty charged when the merchant has not completed required PCI SAQ or scan. Non-compliance fees are typically $15–$99/month and are avoidable through compliance. Compliance fees for completed merchants should be $0–$9.95/month.",
      chargeClass: "surcharge",
      units: ["flat_per_month"],
      expectedContext: ["all_merchants"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_flat_fee"],
      anomalyRules: ["check_pci_non_compliance_while_merchant_is_compliant", "check_excessive_pci_fee"],
    },
    {
      canonicalCode: "MERCH-DOWNGRADE-01",
      label: "Downgrade / Non-Qualified Surcharge",
      aliases: ["Downgrade Fee", "Non-Qualified", "EIRF", "Standard Rate Downgrade", "Mid-Qualified"],
      meaning:
        "Additional surcharge applied when a transaction fails to qualify for the lowest interchange category. Common downgrade triggers include: missing AVS/CVV data, corporate/rewards/government card acceptance, manual key-entry transactions (card-not-present), or failure to settle within 24 hours. Downgrades inflate effective rates significantly and many are preventable.",
      chargeClass: "surcharge",
      units: ["percentage_plus_per_transaction"],
      expectedContext: ["tiered_pricing_model", "qualifying_failures"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["tiered_pricing_penalty", "interchange_plus_visible"],
      anomalyRules: [
        "check_downgrade_percentage_of_total_volume",
        "check_corporate_card_downgrade_pattern",
        "check_avs_failure_rate",
      ],
    },
    {
      canonicalCode: "MERCH-REG2-01",
      label: "Regulated Debit Interchange (Reg II)",
      aliases: ["Regulated Debit", "Durbin Amendment", "Reg II Debit", "Federal Regulated Debit"],
      meaning:
        "The Dodd-Frank Act's Durbin Amendment (Regulation II) caps interchange on debit card transactions for banks with assets over $10 billion at approximately $0.21 + 0.05% + $0.01 fraud prevention. Any covered debit transaction not receiving this regulated rate should be flagged. Merchants with high debit volume should verify they are receiving Reg II treatment.",
      chargeClass: "pass_through",
      units: ["flat_plus_percentage"],
      expectedContext: ["debit_card_acceptance", "issuer_over_10b_assets"],
      benchmarkable: true,
      regulatory: true,
      commonContractTreatment: ["pass_through_at_regulated_cap"],
      anomalyRules: ["check_regulated_debit_rate_vs_durbin_cap"],
    },
    {
      canonicalCode: "MERCH-CHGBK-01",
      label: "Chargeback / Dispute Fee",
      aliases: ["Chargeback Fee", "Dispute Fee", "Retrieval Request Fee", "Representment Fee"],
      meaning:
        "Per-incident fee charged when a cardholder disputes a transaction. Typically $15–$35 per chargeback regardless of outcome. Elevated chargeback ratios (>1%) trigger card brand monitoring programs and potential surcharges.",
      chargeClass: "one_time",
      units: ["flat_per_incident"],
      expectedContext: ["disputed_transactions"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["per_incident_flat"],
      anomalyRules: ["check_chargeback_ratio_threshold"],
    },
    {
      canonicalCode: "MERCH-MONTHLY-01",
      label: "Monthly Minimum / Statement Fee",
      aliases: ["Monthly Minimum", "Statement Fee", "Account Maintenance Fee", "Service Charge"],
      meaning:
        "Monthly flat fee that may include a statement fee ($5–$15), monthly minimum processing fee (ensures the processor earns a minimum margin regardless of volume), and account maintenance charges. Monthly minimums above $25/month warrant negotiation on low-volume accounts.",
      chargeClass: "fixed",
      units: ["flat_per_month"],
      expectedContext: ["all_accounts"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["flat_monthly"],
      anomalyRules: ["check_monthly_minimum_vs_volume_ratio"],
    },
  ],

  pricingModels: [
    {
      key: "interchange_plus",
      explanation:
        "The most transparent pricing model. The merchant pays actual interchange (set by card brands, varies by card type and qualification) plus a fixed processor markup expressed as basis points of volume plus a per-transaction fee (e.g., IC + 0.20% + $0.10). The processor margin is clearly visible and negotiable. Recommended for businesses over $15K/month in processing volume.",
      fixedComponents: ["monthly_minimum", "statement_fee", "pci_fee"],
      variableComponents: ["interchange_pass_through", "processor_markup", "assessment_fees"],
      passThroughComponents: ["interchange", "card_brand_assessments"],
      formulas: [
        "total_fees = interchange + (gross_volume * processor_markup_bps) + (txn_count * per_txn_fee) + monthly_fees",
      ],
      requiredDimensions: ["gross_volume", "card_type_mix", "average_ticket", "card_present_percentage"],
    },
    {
      key: "tiered_qualified",
      explanation:
        "A bundled pricing model where transactions are grouped into Qualified, Mid-Qualified, and Non-Qualified tiers. Processors define what qualifies — and often route rewards cards, corporate cards, and CNP transactions to higher tiers, generating hidden margin. Effective rates on tiered pricing are typically 20–60 basis points higher than interchange-plus for the same volume.",
      fixedComponents: ["monthly_minimum", "statement_fee"],
      variableComponents: ["qualified_rate", "mid_qualified_surcharge", "non_qualified_surcharge"],
      passThroughComponents: [],
      formulas: [
        "total = (qualified_volume * q_rate) + (mid_qual_volume * mq_rate) + (non_qual_volume * nq_rate) + monthly_fees",
      ],
      requiredDimensions: ["tier_qualification_rules", "card_type_mix"],
    },
    {
      key: "flat_rate",
      explanation:
        "Single percentage applied to all transactions (e.g., 2.9% + $0.30). Simple and predictable. Typically used by Square, Stripe, and PayFac platforms. The flat rate bundles interchange, processor margin, and assessments. For businesses with low average tickets and high rewards card volume, effective cost is often lower. For B2B or corporate card-heavy businesses, it can be significantly higher than interchange-plus.",
      fixedComponents: ["monthly_subscription_if_applicable"],
      variableComponents: ["flat_percentage_per_transaction"],
      passThroughComponents: [],
      formulas: ["total = gross_volume * flat_rate + (txn_count * flat_per_txn_fee)"],
      requiredDimensions: ["average_ticket", "monthly_volume", "card_type_mix"],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-interchange-plus-visible",
        description:
          "Statement shows separate line items for interchange cost and processor markup, confirming interchange-plus pricing model transparency.",
        severity: "info",
        deterministic: true,
        requiredFields: ["interchange_fees", "processor_markup"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "signal-regulated-debit-applied",
        description:
          "Debit transactions show effective rate at or near the Durbin cap ($0.21 + 0.05% + $0.01), confirming Reg II compliance.",
        severity: "info",
        deterministic: true,
        requiredFields: ["debit_interchange_rate", "debit_volume"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-high-effective-rate",
        description:
          "Effective processing rate (total fees / gross volume) exceeds 2.8% for card-present retail business, suggesting tiered pricing abuse, excessive surcharges, or high downgrade volume.",
        severity: "high",
        deterministic: true,
        requiredFields: ["total_fees", "gross_volume"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-non-qualified-percentage",
        description:
          "Non-qualified or mid-qualified transactions exceed 15% of total volume, suggesting systematic downgrade issues (e.g., rewards card acceptance, CNP without AVS, delayed settlement).",
        severity: "high",
        deterministic: true,
        requiredFields: ["non_qualified_volume", "gross_volume"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-pci-non-compliance-fee",
        description:
          "Statement shows a PCI non-compliance fee ($15–$99/month) indicating merchant has not completed required SAQ or vulnerability scan. This fee is avoidable.",
        severity: "medium",
        deterministic: true,
        requiredFields: ["pci_non_compliance_fee"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-debit-reg2-not-applied",
        description:
          "Debit card interchange rate exceeds the Durbin Amendment cap for a covered issuer, suggesting Reg II routing rules are not being applied correctly.",
        severity: "critical",
        deterministic: false,
        requiredFields: ["debit_interchange_rate", "issuer_asset_size"],
        evidenceRequired: true,
        currentResearchRequired: true,
      },
    ],
    contractChecks: [],
    arithmeticChecks: [],
  },

  benchmarkPolicy: {
    supportedMetrics: ["effective_processing_rate", "processor_markup_bps", "effective_debit_rate"],
    requiredDimensions: [
      "gross_monthly_volume",
      "card_type_mix_percentage",
      "average_ticket_size",
      "card_present_vs_cnp_split",
      "merchant_category_code",
    ],
    minimumComparableCount: 3,
    sourceRequirements: [
      "Visa US Interchange Reimbursement Fees (published)",
      "Mastercard US Interchange Rate Schedules (published)",
      "Federal Reserve Regulation II debit cap (published)",
    ],
    quoteRequiredWhen: ["gross_volume_over_50k_monthly", "contract_renewal_within_60_days"],
    prohibitedClaims: [
      "Stating a specific savings amount without the full card-type mix and average ticket data.",
      "Comparing flat-rate pricing to interchange-plus without adjusting for card type differences.",
      "Calling a processing rate 'above market' without knowing the merchant category code and card mix.",
    ],
  },

  optimizationLevers: [
    {
      key: "migrate_to_interchange_plus",
      description:
        "Switch from tiered or flat-rate pricing to interchange-plus pricing model. For businesses processing over $15K/month, this typically reduces effective rate by 20–60 basis points by eliminating the processor's hidden tier margin. Requires contract negotiation and may involve an ETF on existing agreement.",
      prerequisites: ["processing_volume_over_15k_monthly", "existing_contract_review"],
      risks: ["rate_volatility_with_card_mix_changes", "early_termination_fee"],
      needsAuthorization: true,
    },
    {
      key: "address_pci_compliance",
      description:
        "Complete PCI DSS Self-Assessment Questionnaire (SAQ) and, if required, external vulnerability scan to eliminate non-compliance surcharge ($15–$99/month). For most small businesses (SAQ A or SAQ B), completion takes 30–60 minutes.",
      prerequisites: ["identify_saq_type"],
      risks: [],
      needsAuthorization: false,
    },
    {
      key: "avs_cvv_enforcement",
      description:
        "Enforce AVS (Address Verification Service) and CVV collection on all card-not-present transactions to prevent interchange downgrade to non-qualified tiers. Missing AVS data on CNP transactions is one of the most common sources of avoidable downgrade fees.",
      prerequisites: ["card_not_present_volume"],
      risks: ["checkout_friction"],
      needsAuthorization: false,
    },
    {
      key: "verify_regulated_debit_routing",
      description:
        "Confirm that debit card transactions from covered issuers (banks over $10 billion in assets) are being routed and priced at Durbin Amendment caps. Request from processor a confirmation of Reg II routing compliance and verify debit interchange line items against the published cap.",
      prerequisites: ["debit_card_volume"],
      risks: [],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: ["visa_mastercard_interchange_schedule_update", "federal_reserve_reg2_cap_update"],
    preferredSources: [
      "https://usa.visa.com/support/small-business/regulations-fees.html",
      "https://www.mastercard.us/en-us/business/overview/merchant-understanding-interchange.html",
      "https://www.federalreserve.gov/paymentsystems/regii-average-interchange-fee.htm",
    ],
    allowedDomains: ["visa.com", "mastercard.us", "federalreserve.gov", "nilsonreport.com"],
    freshnessDays: 60,
    cacheKeyDimensions: ["card_brand", "card_type", "merchant_category_code"],
  },

  outputPolicy: {
    requiredCaveats: [
      "Interchange rates vary by card type, merchant category code, and qualification status. A benchmark requires card-type mix data.",
      "Effective rate comparisons are only valid between the same pricing model types (IC+ vs. IC+, not IC+ vs. flat-rate).",
      "Processor markup negotiability depends on volume, contract terms, and processor competitive position.",
    ],
    confidenceThresholds: { extraction: 0.88, classification: 0.92 },
    humanReviewTriggers: [
      "potential_reg2_violation",
      "effective_rate_above_3_percent",
      "chargeback_ratio_above_1_percent",
    ],
  },

  evalCaseIds: ["eval-merch-001", "eval-merch-002", "eval-merch-003", "eval-merch-004", "eval-merch-005", "eval-merch-006", "eval-merch-007", "eval-merch-008", "eval-merch-009", "eval-merch-010"],
};
