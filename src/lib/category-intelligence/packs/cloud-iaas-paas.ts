import { CategoryExpertPackV1 } from "../types";

/**
 * Cloud IaaS/PaaS Pack
 *
 * Scope: public cloud infrastructure (compute, storage, network, database, managed services)
 * billed on a consumption or committed-use basis.
 *
 * Distinct from:
 * - saas-subscriptions: SaaS is application-layer per-seat or flat subscription, not compute/storage units.
 * - ai-api-consumption: AI API token/call billing is tracked separately with model-specific pricing.
 * - cybersecurity: Security SaaS (e.g. Crowdstrike, Okta) is software-layer, not cloud IaaS.
 *
 * Sources and references:
 * - FinOps Foundation FOCUS Specification v1.0 (https://focus.finops.org)
 * - AWS public pricing API (https://aws.amazon.com/pricing/)
 * - Azure Retail Prices API (https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices)
 * - GCP Pricing (https://cloud.google.com/pricing)
 * - FinOps Foundation State of FinOps Report (https://data.finops.org)
 */
export const cloudIaasPaasPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "cloud-iaas-paas",
  displayName: "Cloud Infrastructure (IaaS / PaaS)",
  parentKey: "technology",
  version: "2026.08.1",
  status: "verified",
  jurisdictions: ["US", "Global"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 30,

  scope: {
    includes: [
      "Virtual machine compute instances (on-demand, spot, reserved)",
      "Managed container services (ECS, EKS, GKE, AKS)",
      "Object and block storage (S3, Azure Blob, GCS)",
      "Managed relational and NoSQL databases (RDS, Cloud SQL, Cosmos DB)",
      "Network egress, VPN, load balancer, and CDN charges",
      "Cloud provider support plans (Basic, Business, Enterprise)",
      "Committed Use Discounts (CUD) and Reserved Instance (RI) charges",
      "Marketplace software running on cloud infrastructure",
      "Serverless compute (Lambda, Cloud Functions, Azure Functions)",
      "GPU/TPU accelerated compute instances",
    ],
    excludes: [
      "SaaS application subscriptions billed per seat (use saas-subscriptions)",
      "AI model API token billing (use ai-api-consumption)",
      "Security-specific SaaS (use cybersecurity pack when available)",
      "On-premises hardware and colocation",
      "Software licenses not bundled with cloud instance cost",
    ],
    adjacentCategories: ["saas-subscriptions", "ai-api-consumption", "cybersecurity"],
  },

  documentTypes: [
    {
      type: "cloud_provider_invoice",
      indicators: [
        "AWS Invoice",
        "Microsoft Azure Invoice",
        "Google Cloud Invoice",
        "Usage & Charges",
        "Reservation",
        "Committed Use",
        "Service Charges",
        "Credits Applied",
      ],
      requiredFields: [
        "account_id",
        "billing_period",
        "total_charges",
        "service_breakdown",
      ],
    },
    {
      type: "cloud_cost_export",
      indicators: [
        "AWS Cost and Usage Report",
        "Azure Cost Management Export",
        "GCP Billing Export",
        "FOCUS-aligned export",
      ],
      requiredFields: [
        "provider",
        "service",
        "usage_date",
        "usage_quantity",
        "usage_unit",
        "billed_cost",
      ],
    },
  ],

  billAnatomy: {
    identityFields: [
      "cloud_account_id",
      "billing_account_id",
      "invoice_id",
      "provider",
    ],
    periodFields: [
      "billing_period_start",
      "billing_period_end",
      "reservation_expiry_date",
    ],
    quantityFields: [
      "vcpu_hours",
      "gb_storage",
      "gb_egress",
      "request_count",
      "gpu_hours",
      "dtu_hours",
    ],
    pricingFields: [
      "on_demand_rate",
      "reserved_instance_rate",
      "committed_use_discount_pct",
      "spot_rate",
      "effective_cost",
    ],
    taxFeeFields: [
      "cloud_marketplace_tax",
      "digital_services_tax",
    ],
    contractFields: [
      "reservation_term_months",
      "reservation_utilization_pct",
      "savings_plan_commitment_usd",
      "enterprise_agreement_end_date",
    ],
  },

  lineItems: [
    {
      canonicalCode: "CLOUD-COMPUTE-01",
      label: "Virtual Machine / Compute Instance",
      aliases: [
        "EC2",
        "Compute Engine",
        "Azure VM",
        "vCPU-hours",
        "Instance Hours",
        "Compute",
      ],
      meaning:
        "Hourly or second-by-second charge for a running virtual machine instance based on instance family, size, region, and pricing model (on-demand, spot, or reserved).",
      chargeClass: "usage",
      units: ["vCPU-hours", "instance-hours"],
      calculation: "usage_hours * instance_rate",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["on_demand", "reserved_instance", "savings_plan"],
      anomalyRules: [
        "check_idle_compute_utilization_below_10_pct",
        "check_on_demand_vs_reserved_opportunity",
        "check_previous_generation_instance_families",
      ],
    },
    {
      canonicalCode: "CLOUD-GPU-01",
      label: "GPU / Accelerated Compute Instance",
      aliases: [
        "GPU Instance",
        "Accelerator",
        "TPU",
        "A100",
        "H100",
        "NVIDIA",
        "p3",
        "p4d",
        "a2-highgpu",
      ],
      meaning:
        "Specialized compute charge for GPU or TPU instances used for ML training, inference, scientific computing, or rendering. Rates are significantly higher than general-purpose compute.",
      chargeClass: "usage",
      units: ["GPU-hours"],
      calculation: "gpu_hours * gpu_instance_rate",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["on_demand", "reserved_instance"],
      anomalyRules: [
        "check_gpu_idle_hours_exceeding_30_pct",
        "check_gpu_reservation_vs_on_demand",
      ],
    },
    {
      canonicalCode: "CLOUD-STORAGE-01",
      label: "Object / Block Storage",
      aliases: [
        "S3",
        "Azure Blob",
        "GCS",
        "EBS",
        "Persistent Disk",
        "Azure Managed Disk",
        "Storage",
        "GB-Month",
      ],
      meaning:
        "Charge for data stored in object (S3-class) or block (EBS/Persistent Disk) storage, billed per GB-month at the region and storage class rate.",
      chargeClass: "usage",
      units: ["GB-months"],
      calculation: "avg_gb_stored * rate_per_gb_month",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_unattached_ebs_volumes",
        "check_infrequently_accessed_data_in_standard_class",
        "check_orphaned_snapshots",
      ],
    },
    {
      canonicalCode: "CLOUD-EGRESS-01",
      label: "Network Egress / Data Transfer",
      aliases: [
        "Data Transfer Out",
        "Egress",
        "Bandwidth",
        "Internet Egress",
        "Cross-Region Transfer",
      ],
      meaning:
        "Charge for data transferred out of a cloud region to the internet or across regions. Intra-region transfers are typically free. Egress costs are frequently overlooked but can be 10-30% of cloud spend.",
      chargeClass: "usage",
      units: ["GB"],
      calculation: "egress_gb * egress_rate",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_egress_exceeds_20_pct_of_total_spend",
        "check_cross_region_transfer_architecture",
      ],
    },
    {
      canonicalCode: "CLOUD-DB-01",
      label: "Managed Database Service",
      aliases: [
        "RDS",
        "Cloud SQL",
        "Azure SQL",
        "DynamoDB",
        "Cosmos DB",
        "Spanner",
        "Aurora",
        "Firestore",
      ],
      meaning:
        "Charge for a managed relational or NoSQL database, including instance hours, storage, I/O operations, and backups.",
      chargeClass: "usage",
      units: ["instance-hours", "GB"],
      calculation: "db_instance_hours * rate + storage_gb * storage_rate + io_requests * io_rate",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["on_demand", "reserved_instance"],
      anomalyRules: [
        "check_multi_az_on_dev_environment",
        "check_db_instance_idle_or_low_connection_count",
      ],
    },
    {
      canonicalCode: "CLOUD-SERVERLESS-01",
      label: "Serverless Compute (Lambda / Cloud Functions)",
      aliases: [
        "Lambda",
        "Cloud Functions",
        "Azure Functions",
        "Invocations",
        "Function Compute",
      ],
      meaning:
        "Per-invocation and per-GB-second charge for serverless function execution.",
      chargeClass: "usage",
      units: ["requests", "GB-seconds"],
      calculation: "invocations * request_rate + duration_gb_seconds * duration_rate",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: ["check_cold_start_latency_impacting_cost"],
    },
    {
      canonicalCode: "CLOUD-SUPPORT-01",
      label: "Cloud Provider Support Plan",
      aliases: [
        "AWS Business Support",
        "AWS Enterprise Support",
        "Azure Support",
        "Google Cloud Support",
        "Developer Support",
      ],
      meaning:
        "Fixed or percentage-of-spend monthly charge for cloud provider support tier (Developer, Business, Enterprise/Technical Account Manager).",
      chargeClass: "fixed",
      units: ["flat", "pct_of_spend"],
      calculation: "max(min_support_fee, pct_of_monthly_spend * support_rate)",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["monthly_recurring"],
      anomalyRules: [
        "check_support_tier_vs_actual_usage_of_support",
        "check_enterprise_support_under_low_spend",
      ],
    },
    {
      canonicalCode: "CLOUD-RI-CUD-01",
      label: "Reserved Instance / Committed Use Discount",
      aliases: [
        "Reserved Instance",
        "Savings Plan",
        "Committed Use Discount",
        "RI",
        "CUD",
        "Reservation",
      ],
      meaning:
        "Pre-committed compute or spend commitment that yields a discount vs. on-demand pricing in exchange for a 1- or 3-year term. Unused reservation capacity is wasted spend.",
      chargeClass: "fixed",
      units: ["flat"],
      calculation: "reservation_hourly_rate * 730_hours_per_month",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["committed_term"],
      anomalyRules: [
        "check_reservation_utilization_below_80_pct",
        "check_expiring_reservations_within_90_days",
      ],
    },
    {
      canonicalCode: "CLOUD-CREDIT-01",
      label: "Cloud Credit / Promotional Credit",
      aliases: [
        "Credits",
        "Promotional Credits",
        "EDP Credit",
        "Negotiated Credit",
        "Startup Credit",
      ],
      meaning:
        "Negative line-item reducing total spend. Credits may come from startup programs, committed-spend EDPs, or promotional agreements. Expiry dates and eligible services vary.",
      chargeClass: "credit",
      units: ["USD"],
      calculation: "applied_credit_amount (negative)",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["credit"],
      anomalyRules: [
        "check_credit_expiry_within_30_days",
        "check_credits_applied_to_ineligible_services",
      ],
    },
    {
      canonicalCode: "CLOUD-MARKETPLACE-01",
      label: "Marketplace Software / Third-Party",
      aliases: [
        "AWS Marketplace",
        "Azure Marketplace",
        "GCP Marketplace",
        "Third-Party Software",
        "ISV",
      ],
      meaning:
        "Charges for third-party software purchased and deployed through cloud provider marketplace. Billed on provider invoice but software cost is separate from infrastructure.",
      chargeClass: "usage",
      units: ["hours", "flat"],
      calculation: "marketplace_hourly_rate * usage_hours OR flat_fee",
      expectedContext: ["cloud_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based", "fixed"],
      anomalyRules: ["check_marketplace_vs_direct_vendor_pricing"],
    },
  ],

  pricingModels: [
    {
      key: "on_demand",
      explanation:
        "Pay-as-you-go pricing at published rates per service, region, and resource type. No commitment required. Highest per-unit cost but maximum flexibility.",
      fixedComponents: [],
      variableComponents: ["compute", "storage", "egress", "requests"],
      passThroughComponents: ["marketplace_tax"],
      formulas: ["total = sum(resource_usage * on_demand_rate) + tax"],
      requiredDimensions: ["provider", "service", "region", "resource_type"],
    },
    {
      key: "reserved_committed",
      explanation:
        "1- or 3-year commitments on specific resource types or spend amounts in exchange for 20-70% discount vs. on-demand. Unused capacity incurs waste.",
      fixedComponents: ["reservation_commitment"],
      variableComponents: ["on_demand_overage", "egress"],
      passThroughComponents: [],
      formulas: [
        "total = reservation_cost + max(0, on_demand_usage - reservation_coverage) * on_demand_rate",
      ],
      requiredDimensions: [
        "provider",
        "instance_family",
        "term_months",
        "payment_option",
        "region",
      ],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-cloud-ri-utilization",
        description: "Reserved instance / CUD utilization consistently above 85%.",
        severity: "info",
        deterministic: true,
        requiredFields: ["reservation_utilization_pct"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-cloud-ri-low-utilization",
        description: "Reserved instance or Committed Use Discount utilization below 80% — wasted committed spend.",
        severity: "high",
        deterministic: true,
        requiredFields: ["reservation_utilization_pct", "reservation_cost"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-cloud-unattached-volumes",
        description: "Unattached EBS volumes or persistent disks older than 7 days incurring storage cost without attached compute.",
        severity: "medium",
        deterministic: true,
        requiredFields: ["unattached_volumes", "volume_age_days"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-cloud-high-egress",
        description: "Network egress exceeds 20% of total monthly cloud spend.",
        severity: "medium",
        deterministic: true,
        requiredFields: ["egress_cost", "total_cloud_spend"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-cloud-unauthorized-marketplace",
        description: "Marketplace software charges appear without a corresponding procurement record.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["marketplace_charges", "procurement_records"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    contractChecks: [
      {
        ruleId: "check-cloud-edp-commitment",
        description: "Verify enterprise discount program (EDP) commitment level matches actual spend trajectory.",
        severity: "medium",
        deterministic: true,
        requiredFields: ["edp_commitment_usd", "actual_monthly_spend"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    arithmeticChecks: [
      {
        ruleId: "arith-cloud-invoice-total",
        description: "Sum of service-level line items equals invoice total before credits.",
        severity: "high",
        deterministic: true,
        requiredFields: ["service_line_items", "invoice_total", "credits_applied"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
  },

  benchmarkPolicy: {
    supportedMetrics: [
      "normalized_unit_cost_per_vcpu_hour",
      "cost_per_gb_storage_class",
      "effective_egress_cost_per_gb",
    ],
    requiredDimensions: [
      "provider",
      "region",
      "instance_family",
      "pricing_model",
      "commitment_term",
    ],
    minimumComparableCount: 5,
    sourceRequirements: [
      "AWS Pricing API",
      "Azure Retail Prices API",
      "GCP Pricing",
      "FinOps Foundation FOCUS Specification",
    ],
    quoteRequiredWhen: [
      "enterprise_discount_program_negotiation",
      "committed_spend_agreement_above_100k_annual",
    ],
    prohibitedClaims: [
      "Claiming a specific % savings without provider, region, instance family, commitment term, and current utilization.",
      "Comparing on-demand rates to reserved rates as proof of billing error — they are different pricing models.",
      "Asserting GPU pricing without referencing current provider rate cards (changes frequently).",
    ],
  },

  optimizationLevers: [
    {
      key: "rightsizing",
      description:
        "Identify compute instances consistently below 20% CPU or memory utilization. Downsize to smaller instance family.",
      prerequisites: ["cloudwatch_or_monitoring_metrics_available"],
      risks: ["performance_degradation_if_workload_spikes"],
      needsAuthorization: true,
    },
    {
      key: "reservation_coverage",
      description:
        "Analyze on-demand compute spend that is predictable. Purchase reserved instances or savings plans for 1-year term to capture 30-70% discount.",
      prerequisites: ["3_month_usage_history", "workload_stability_confirmed"],
      risks: ["wasted_commitment_if_usage_changes"],
      needsAuthorization: true,
    },
    {
      key: "storage_lifecycle",
      description:
        "Apply lifecycle policies to move infrequently-accessed objects to Glacier/Archive storage tiers. Delete orphaned snapshots and unattached volumes.",
      prerequisites: ["object_access_pattern_analysis"],
      risks: ["retrieval_latency_on_tiered_data"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: [
      "current_provider_pricing_question",
      "reservation_pricing_change",
      "new_instance_family_availability",
    ],
    preferredSources: [
      "https://focus.finops.org/",
      "https://aws.amazon.com/pricing/",
      "https://learn.microsoft.com/en-us/azure/cost-management-billing/",
      "https://cloud.google.com/pricing",
    ],
    allowedDomains: ["focus.finops.org", "aws.amazon.com", "microsoft.com", "cloud.google.com"],
    freshnessDays: 30,
    cacheKeyDimensions: ["provider", "service", "region", "instance_family"],
  },

  outputPolicy: {
    requiredCaveats: [
      "Cloud pricing varies by provider, region, instance family, commitment term, and enterprise agreement. Always verify against current provider rate cards.",
      "Reserved instance and savings plan analysis requires actual utilization data — do not estimate without cloudwatch or FOCUS-compatible export.",
      "GPU instance pricing changes frequently. Verify H100/A100 pricing at provider rate card before citing.",
    ],
    confidenceThresholds: { extraction: 0.88, classification: 0.92 },
    humanReviewTriggers: [
      "reservation_utilization_below_60_pct",
      "spend_spike_exceeds_30_pct_month_over_month",
      "unexpected_marketplace_charges",
    ],
  },

  evalCaseIds: [
    "eval-cloud-001",
    "eval-cloud-002",
    "eval-cloud-003",
    "eval-cloud-004",
    "eval-cloud-005",
    "eval-cloud-006",
    "eval-cloud-007",
    "eval-cloud-008",
    "eval-cloud-009",
    "eval-cloud-010",
  ],
};
