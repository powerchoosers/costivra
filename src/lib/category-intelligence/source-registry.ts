export type TrustedSource = {
  id: string;
  categoryKey: string;
  name: string;
  url: string;
  type: "regulator" | "government_dataset" | "official_vendor_pricing" | "tariff" | "standards_body" | "licensed_market_data";
  authorityLevel: "primary" | "secondary" | "contextual";
  jurisdiction: string;
  updateFrequency: "weekly" | "monthly" | "quarterly" | "annual" | "event_driven";
  freshnessDays: number;
  accessType: "public_web" | "licensed" | "customer_provided";
  lastVerifiedAt: string;
  nextReviewAt: string;
  licenseNotes: string;
  allowedUses: Array<"research" | "context" | "benchmark_validation">;
  status: "active" | "review_required" | "deprecated";
  restrictionNotes: string;
};

type TrustedSourceSeed = Omit<
  TrustedSource,
  | "freshnessDays"
  | "accessType"
  | "lastVerifiedAt"
  | "nextReviewAt"
  | "licenseNotes"
  | "allowedUses"
  | "status"
>;

const TRUSTED_SOURCE_SEEDS: TrustedSourceSeed[] = [
  {
    id: "src-eia-electricity",
    categoryKey: "commercial-electricity-supply",
    name: "U.S. Energy Information Administration (EIA) Retail Electricity Data",
    url: "https://www.eia.gov/electricity/data.php",
    type: "government_dataset",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "monthly",
    restrictionNotes: "Macro state/sector comparison context only; never substitute for a supplier or tariff quote.",
  },
  {
    id: "src-ercot-market",
    categoryKey: "commercial-electricity-supply",
    name: "Electric Reliability Council of Texas (ERCOT) Market Data",
    url: "https://www.ercot.com/mp/data-products",
    type: "tariff",
    authorityLevel: "primary",
    jurisdiction: "US-TX",
    updateFrequency: "weekly",
    restrictionNotes: "Use only when geography and load zone are verified.",
  },
  {
    id: "src-eia-gas",
    categoryKey: "commercial-natural-gas",
    name: "U.S. EIA Commercial Natural Gas Prices",
    url: "https://www.eia.gov/naturalgas/data.php",
    type: "government_dataset",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "monthly",
    restrictionNotes: "Separate commodity, marketer, transport, and delivery charges.",
  },
  {
    id: "src-usac-usf",
    categoryKey: "business-broadband-dia",
    name: "USAC Universal Service Fund Contribution Factors",
    url: "https://www.usac.org/service-providers/making-payments/contribution-factors/",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "quarterly",
    restrictionNotes: "Applies only to assessable interstate/international telecom revenue.",
  },
  {
    id: "src-fcc-broadband",
    categoryKey: "business-broadband-dia",
    name: "FCC National Broadband Map",
    url: "https://broadbandmap.fcc.gov/home",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "quarterly",
    restrictionNotes: "Establishes carrier service availability, not negotiated enterprise price quotes.",
  },
  {
    id: "src-finops-focus",
    categoryKey: "cloud-iaas-paas",
    name: "FinOps Open Cost & Usage Specification (FOCUS)",
    url: "https://focus.finops.org/focus-specification/",
    type: "standards_body",
    authorityLevel: "primary",
    jurisdiction: "Global",
    updateFrequency: "annual",
    restrictionNotes: "Standardized semantic normalization for cloud, SaaS, and AI API billing.",
  },
  {
    id: "src-aws-pricing",
    categoryKey: "cloud-iaas-paas",
    name: "AWS Cloud Pricing Calculator & APIs",
    url: "https://calculator.aws/",
    type: "official_vendor_pricing",
    authorityLevel: "primary",
    jurisdiction: "Global",
    updateFrequency: "event_driven",
    restrictionNotes: "Price varies by region, SKU, commitments, support tier, and egress.",
  },
  {
    id: "src-azure-pricing",
    categoryKey: "cloud-iaas-paas",
    name: "Microsoft Azure Pricing",
    url: "https://azure.microsoft.com/pricing/",
    type: "official_vendor_pricing",
    authorityLevel: "primary",
    jurisdiction: "Global",
    updateFrequency: "event_driven",
    restrictionNotes: "Price varies by region, SKU, commitment, support plan, and currency.",
  },
  {
    id: "src-google-cloud-pricing",
    categoryKey: "cloud-iaas-paas",
    name: "Google Cloud Pricing",
    url: "https://cloud.google.com/pricing",
    type: "official_vendor_pricing",
    authorityLevel: "primary",
    jurisdiction: "Global",
    updateFrequency: "event_driven",
    restrictionNotes: "Price varies by region, SKU, commitment, support plan, and currency.",
  },
  {
    id: "src-openai-api-pricing",
    categoryKey: "ai-api-consumption",
    name: "OpenAI API Pricing",
    url: "https://platform.openai.com/docs/pricing",
    type: "official_vendor_pricing",
    authorityLevel: "primary",
    jurisdiction: "Global",
    updateFrequency: "event_driven",
    restrictionNotes: "Use only with model, model version, input/output token type, region, and billing period identified.",
  },
  {
    id: "src-fcc-wireless",
    categoryKey: "wireless-mobility",
    name: "Federal Communications Commission Wireless Services",
    url: "https://www.fcc.gov/wireless-telecommunications",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "event_driven",
    restrictionNotes: "Regulatory context only; it is not a business wireless price benchmark.",
  },
  {
    id: "src-saas-vendor-pricing",
    categoryKey: "saas-subscriptions",
    name: "Official SaaS Vendor Pricing",
    url: "https://focus.finops.org/focus-specification/",
    type: "standards_body",
    authorityLevel: "contextual",
    jurisdiction: "Global",
    updateFrequency: "event_driven",
    restrictionNotes: "Use a vendor's official price guide only when product edition and billing term match; FOCUS supplies normalization context, not a price quote.",
  },
  {
    id: "src-eia-diesel",
    categoryKey: "solid-waste-recycling",
    name: "U.S. EIA Weekly Retail Diesel Prices",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
    type: "government_dataset",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "weekly",
    restrictionNotes: "Market context only; verify any hauler fuel surcharge against that hauler's agreement and published schedule.",
  },
  {
    id: "src-serff-insurance",
    categoryKey: "commercial-property",
    name: "SERFF System for Electronic Rates & Forms Filing",
    url: "https://www.serff.com/serff_filing_access.htm",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "event_driven",
    restrictionNotes: "Public rate filings context by state and admitted carrier.",
  },
  {
    id: "src-ncci-workers-comp",
    categoryKey: "workers-compensation",
    name: "NCCI Workers Compensation Class Code & Experience Data",
    url: "https://www.ncci.com/ServicesTools/Pages/RATETABLEDATA.aspx",
    type: "standards_body",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "annual",
    restrictionNotes: "Requires state, policy period, governing class code, and experience mod.",
  },
  {
    id: "src-cms-mlr",
    categoryKey: "group-health",
    name: "CMS Health Insurance Medical Loss Ratio (MLR) Data",
    url: "https://www.cms.gov/marketplace/private-health-insurance/medical-loss-ratio",
    type: "regulator",
    authorityLevel: "secondary",
    jurisdiction: "US",
    updateFrequency: "annual",
    restrictionNotes: "MLR is market/state level value measure, not a direct plan-price benchmark.",
  },
  {
    id: "src-reg-ii-debit",
    categoryKey: "merchant-processing",
    name: "Federal Reserve Regulation II Interchange Caps",
    url: "https://www.federalreserve.gov/frrs/regulations/section-2353-reasonable-and-proportional-interchange-transaction-fees.htm",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "event_driven",
    restrictionNotes: "Covered regulated debit transactions only; card mix matters.",
  },
  {
    id: "src-visa-mastercard-interchange",
    categoryKey: "merchant-processing",
    name: "Visa & Mastercard Official U.S. Interchange Schedules",
    url: "https://usa.visa.com/support/consumer/visa-rules.html",
    type: "official_vendor_pricing",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "event_driven",
    restrictionNotes: "Use channel, card qualification, and ticket size data.",
  },
  {
    id: "src-irs-p15-payroll",
    categoryKey: "payroll-processing",
    name: "IRS Publication 15 (Employer Tax Guide)",
    url: "https://www.irs.gov/publications/p15",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "annual",
    restrictionNotes: "Statutory federal payroll tax rules; state/local rules apply separately.",
  },
  {
    id: "src-bls-ppi",
    categoryKey: "janitorial",
    name: "U.S. BLS Producer Price Index (PPI) for Services",
    url: "https://www.bls.gov/ppi/",
    type: "government_dataset",
    authorityLevel: "secondary",
    jurisdiction: "US",
    updateFrequency: "monthly",
    restrictionNotes: "Macro cost trend context; not a specific vendor quote.",
  },
  {
    id: "src-epa-emanifest",
    categoryKey: "hazardous-industrial-waste",
    name: "U.S. EPA e-Manifest System & User Fee Schedules",
    url: "https://www.epa.gov/e-manifest/e-manifest-user-fees-and-payment-information",
    type: "regulator",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "event_driven",
    restrictionNotes: "Regulated hazardous waste manifest fees by manifest type.",
  },
  {
    id: "src-awwa-water",
    categoryKey: "water-sewer-stormwater",
    name: "American Water Works Association (AWWA) Utility Rate Benchmarks",
    url: "https://awwa.org/data-products/",
    type: "standards_body",
    authorityLevel: "secondary",
    jurisdiction: "US",
    updateFrequency: "annual",
    restrictionNotes: "Requires municipal utility, meter size, and consumption tiers.",
  },
  {
    id: "src-gsa-per-diem",
    categoryKey: "travel-lodging",
    name: "GSA Travel & Per Diem Rate Schedules",
    url: "https://www.gsa.gov/travel/plan-a-trip/per-diem-rates",
    type: "government_dataset",
    authorityLevel: "primary",
    jurisdiction: "US",
    updateFrequency: "annual",
    restrictionNotes: "Policy benchmark for travel/lodging by locality and fiscal year.",
  },
];

function defaultFreshnessDays(
  frequency: TrustedSource["updateFrequency"],
): number {
  switch (frequency) {
    case "weekly":
      return 10;
    case "monthly":
      return 45;
    case "quarterly":
      return 120;
    case "annual":
      return 400;
    case "event_driven":
      return 30;
  }
}

export const TRUSTED_SOURCES_REGISTRY: TrustedSource[] = TRUSTED_SOURCE_SEEDS.map(
  (source) => ({
    ...source,
    freshnessDays: defaultFreshnessDays(source.updateFrequency),
    accessType: "public_web",
    lastVerifiedAt: "2026-08-05",
    nextReviewAt: "2026-11-05",
    licenseNotes: "Use subject to the source's published terms and only for the stated restricted purpose.",
    allowedUses: ["research", "context"],
    status: "active",
  }),
);
