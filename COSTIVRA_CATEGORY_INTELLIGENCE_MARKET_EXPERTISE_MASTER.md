
# Costivra Category Intelligence and Market Expertise Master Directive

**Repository:** `powerchoosers/costivra`  
**Connected database:** Costivra Supabase through MCP  
**Baseline inspected:** `014122bcd3a361f6edbde2763686646f09b33242`  
**Prepared:** August 4, 2026, America/Chicago  
**Purpose:** Build one source-backed category intelligence layer so every Costivra AI surface understands vendor markets, invoice line items, contract economics, bill quality, pricing structures, optimization options, and current market context.

> This is an implementation and research directive. Do not answer with another brainstorm. Inspect the latest branch, use GitHub and Supabase MCP, repair the existing unsafe benchmark logic, create the taxonomy and shared intelligence service, seed and verify expert packs, integrate every AI surface, run the evaluation suite, and report exactly what is production-proven.

---

# 1. Executive answer

## Insurance is missing

The connected vendor catalog currently has no insurance category and no insurance vendors. Add **Insurance & Employee Benefits** as a first-class parent category with separate expert packs for:

- Commercial property
- General liability and business owners policies
- Workers compensation
- Commercial auto
- Cyber insurance
- Umbrella/excess
- Group health
- Dental, vision, life, and disability
- Stop-loss, PBM, and benefits administration

Do not combine these into a single “insurance” prompt. Their documents, rating variables, regulations, line items, and optimization levers are materially different.

## The current taxonomy is not production-ready

The connected catalog is concentrated in:

- Software
- Telecom & Internet
- Commercial Energy

It also contains duplicate category spellings such as:

- `Software`
- `software_subscription`
- `Telecom & Internet`
- `Telecom`
- `telecom`
- `Waste`
- `waste_management`
- `Commercial Energy`
- `Energy`

The `vendor_categories` taxonomy table is currently empty. Normalize the catalog before asking AI to become an expert.

## One dangerous shortcut must be removed immediately

`src/app/api/portal/documents/[id]/breakdown/route.ts` currently creates synthetic “regional market intelligence” by dividing total invoice amount by hardcoded ratios:

- Telecom: 1.18
- Software/cloud: 1.12
- Energy/utility: 1.24
- Everything else: 1.08

It then presents the result as a Costivra regional benchmark and annual savings opportunity.

This is fabricated market intelligence. Delete it before expanding the AI.

Until a real comparable benchmark is available, return:

```json
{
  "benchmarkStatus": "insufficient_data",
  "estimatedMarketRate": null,
  "potentialAnnualSavings": null,
  "benchmarkSources": [],
  "message": "A comparable market benchmark requires additional service, usage, geography, and contract details."
}
```

A missing benchmark is honest. A polished fictional benchmark is not.

---

# 2. What “expert in every category” must mean

Do not build one enormous system prompt. It will be stale, expensive, difficult to test, and internally contradictory.

Build a shared **Category Intelligence Layer** with:

1. A canonical vendor and expense taxonomy
2. Versioned category expert packs
3. A line-item ontology
4. Category-specific invoice anatomy
5. Category-specific good-bill and anomaly rules
6. Category-specific contract and pricing models
7. Comparable-benchmark requirements
8. A trusted source registry
9. Live current-market retrieval
10. Deterministic calculations
11. Field-level evidence and citations
12. Human verification and feedback
13. Category-specific evaluation suites
14. A safe unknown-category path

Every AI model in the system should receive only the relevant expert pack and current evidence for the task.

## Required consumers

The same service must power:

- Document classification and extraction
- Invoice line-item normalization
- Invoice review
- Bill Breakdown Inspector
- Ask Costivra
- Internal Manage assistant
- Vendor monitoring
- Contract analysis
- Opportunity detection
- Savings verification
- Reports
- Alerts
- Any future agent or workflow that interprets vendor cost data

No feature should maintain its own hidden category assumptions.

---

# 3. Core truth rules

## 3.1 “Good bill” does not mean “cheap bill”

A good bill is:

- Structurally complete
- Arithmetically reconciled
- Contract-conforming
- Correctly classified
- Transparent about fixed, variable, pass-through, tax, credit, and one-time charges
- Supported by source evidence
- Consistent with usage, assets, employees, locations, or shipments
- Comparable to a relevant benchmark when enough dimensions exist

A low-priced bill can still be wrong. A high-priced bill can be correct because service level, risk, geography, usage, or contract terms differ.

## 3.2 “Bad bill” is not a binary AI label

Use findings:

```text
missing_information
arithmetic_mismatch
contract_mismatch
duplicate_charge
usage_anomaly
inactive_asset
rate_variance
tax_or_fee_question
classification_question
unverified_vendor
market_quote_required
human_review_required
```

Every finding needs:

- Severity
- Confidence
- Evidence
- Rule/version
- Financial impact when deterministic
- Required next action
- Whether a current market search was performed

## 3.3 There is rarely one universal best price

“Best pricing” depends on category-specific dimensions such as:

- Geography and jurisdiction
- Service date
- Volume
- Unit of measure
- Usage shape
- Risk/exposure
- Service level
- Quality/specification
- Contract term
- Payment timing
- Credit
- Seasonality
- Market structure
- Vendor availability
- Switching cost
- Implementation cost
- Regulatory pass-throughs
- Negotiated terms

When those dimensions are missing, return:

```text
benchmark_status = insufficient_data
recommendation = request_more_context | obtain_live_quote
```

## 3.4 AI interprets; code calculates

AI may:

- Classify text
- Map aliases
- Explain line items
- Identify likely anomalies
- Select relevant expert-pack sections
- Summarize retrieved evidence

Code must:

- Reconcile totals
- Convert units
- Calculate effective rates
- Calculate percentages
- Apply tariff formulas
- Compare periods
- Score contract conformity
- Determine benchmark comparability
- Calculate savings scenarios

## 3.5 Current information requires current retrieval

Mandatory live retrieval includes:

- Current supplier/vendor prices
- Current tariffs
- Current taxes, assessments, and regulatory factors
- Current insurance filings
- Current fuel/shipping surcharges
- Current cloud/SaaS pricing
- Current fee schedules
- Current per diem/travel rates
- Current market indices
- Current rules or regulations
- Any claim using “today,” “current,” “latest,” “best,” or “market”

---

# 4. Canonical taxonomy

## Energy & Utilities

Parent slug: `energy-utilities`

- `commercial-electricity-supply`
- `electric-delivery-demand`
- `commercial-natural-gas`
- `water-sewer-stormwater`
- `distributed-energy-efficiency`
- `bulk-fuels-propane`

## Telecom & Connectivity

Parent slug: `telecom-connectivity`

- `business-broadband-dia`
- `wireless-mobility`
- `voice-sip-ucaas-ccaas`
- `wan-sdwan-mpls`
- `iot-m2m-connectivity`

## Technology & Digital Services

Parent slug: `technology`

- `saas-subscriptions`
- `cloud-iaas-paas`
- `ai-api-consumption`
- `cybersecurity`
- `managed-it-msp`
- `data-center-colocation`
- `hardware-device-leasing`

## Insurance & Employee Benefits

Parent slug: `insurance-benefits`

- `commercial-property`
- `general-liability-bop`
- `workers-compensation`
- `commercial-auto`
- `cyber-insurance`
- `umbrella-excess`
- `group-health`
- `dental-vision-life-disability`
- `stop-loss-pbm-benefits-admin`

## Waste & Environmental

Parent slug: `waste-environmental`

- `solid-waste-recycling`
- `hazardous-industrial-waste`
- `medical-waste`
- `shredding-records-destruction`
- `environmental-compliance-services`

## Facilities & Property Services

Parent slug: `facilities-property-services`

- `janitorial`
- `uniforms-linen-mats`
- `hvac-mechanical`
- `fire-life-safety`
- `physical-security-alarm-guard`
- `pest-control`
- `landscaping-snow`
- `elevator-escalator`
- `repairs-mro`
- `commercial-laundry`

## Real Estate & Occupancy

Parent slug: `real-estate-occupancy`

- `base-rent`
- `cam-nnn-operating-expenses`
- `property-tax-assessments`
- `parking`
- `property-management`

## Payments, Banking & Finance

Parent slug: `payments-finance`

- `merchant-processing`
- `payment-gateways`
- `banking-treasury-fees`
- `equipment-financing`
- `business-lending-fees`

## Workforce & HR

Parent slug: `workforce-hr`

- `payroll-processing`
- `peo-aso`
- `temporary-staffing`
- `recruiting`
- `background-screening`
- `hr-benefits-administration`

## Logistics, Shipping & Fleet

Parent slug: `logistics-fleet`

- `parcel-shipping`
- `ltl-freight`
- `ftl-freight-brokerage`
- `courier-last-mile`
- `fuel-fleet-cards`
- `vehicle-leasing`
- `fleet-maintenance`
- `equipment-rental`

## Food, Hospitality & Consumables

Parent slug: `food-hospitality`

- `foodservice-distribution`
- `beverage-distribution`
- `restaurant-packaging-disposables`
- `hotel-guest-supplies`
- `vending-coffee-water-service`

## Office & Professional Services

Parent slug: `office-professional`

- `office-supplies`
- `print-copier-managed-print`
- `legal-services`
- `accounting-audit-tax`
- `consulting`
- `marketing-advertising`
- `travel-lodging`
- `subscriptions-memberships`

## Healthcare & Regulated Supplies

Parent slug: `healthcare-regulated`

- `medical-supplies-dme`
- `lab-diagnostics`
- `pharmacy-pharmaceutical`
- `clinical-services`
- `healthcare-waste`
- `medical-equipment-service`

## Industrial, Manufacturing & Construction

Parent slug: `industrial-manufacturing`

- `raw-materials`
- `industrial-gases`
- `packaging-materials`
- `industrial-mro`
- `equipment-maintenance`
- `construction-trades`
- `tool-equipment-rental`

## Taxes, Permits & Public Fees

Parent slug: `taxes-permits-public-fees`

- `business-licenses-permits`
- `property-tax`
- `regulatory-assessments`
- `government-user-fees`
---

# 5. Database architecture

Use the existing `vendor_categories` table as the canonical taxonomy, but extend it through a new reviewed migration.

## 5.1 Vendor category fields

Add when absent:

```sql
alter table public.vendor_categories
  add column if not exists canonical_key text,
  add column if not exists description text,
  add column if not exists analysis_status text not null default 'draft',
  add column if not exists risk_level text not null default 'normal',
  add column if not exists benchmark_mode text not null default 'comparable_dimensions',
  add column if not exists default_freshness_days integer,
  add column if not exists expert_pack_version text,
  add column if not exists active boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
```

Add reviewed constraints and unique indexes after collision checks.

## 5.2 New knowledge tables

### `category_expert_packs`

```sql
create table public.category_expert_packs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id),
  version text not null,
  status text not null check (status in ('draft','verified','deprecated')),
  jurisdiction_scope text[] not null default array['US'],
  effective_from date,
  effective_to date,
  pack jsonb not null,
  source_snapshot_hash text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, version)
);
```

Only verified packs may generate customer-facing market conclusions.

### `category_line_item_definitions`

Normalized searchable line-item ontology:

```text
category_id
canonical_code
canonical_label
aliases
description
charge_class
units
calculation_method
benchmarkable
regulatory
expected_evidence_fields
anomaly_rules
version
status
```

`charge_class` values:

```text
fixed
usage
demand
minimum
one_time
pass_through
tax
assessment
surcharge
credit
adjustment
deposit
finance
penalty
unknown
```

### `category_benchmark_definitions`

```text
category_id
benchmark_key
metric
required_dimensions
optional_dimensions
unit
comparison_method
minimum_comparables
freshness_days
source_requirements
output_policy
status
version
```

### `category_source_registry`

```text
category_id
source_name
source_url
source_type
authority_level
access_type
jurisdiction
update_frequency
last_verified_at
next_review_at
license_notes
allowed_uses
status
```

`source_type` examples:

```text
regulator
government_dataset
tariff
official_vendor_pricing
standards_body
industry_benchmark
licensed_market_data
customer_contract
customer_invoice
public_filing
```

### `category_market_snapshots`

Store normalized facts, not copied articles:

```text
category_id
jurisdiction
effective_at
expires_at
metric_key
dimensions
value
unit
source_id
source_url
retrieved_at
confidence
raw_hash
```

### `invoice_line_item_classifications`

```text
invoice_line_item_id
category_id
canonical_code
confidence
source
expert_pack_version
evidence_reference_ids
review_status
reviewed_by
reviewed_at
```

### `category_analysis_runs`

Record:

- Category selected
- Pack version
- Rules executed
- Live sources used
- Calculations
- Findings
- Missing dimensions
- Confidence
- Trace ID

### `category_feedback`

Human corrections for:

- Category
- Line item
- Vendor match
- Finding
- Benchmark comparability
- Recommendation

Never silently train on a correction. Promote reviewed patterns through a versioned pack.

### `category_eval_cases`

Golden category-specific cases with expected:

- Classification
- Line-item mapping
- Calculation
- Finding
- Evidence
- Benchmark status
- Safe answer

## 5.3 RLS and access

- Taxonomy and verified public-safe pack metadata may be authenticated-read.
- Detailed rule packs, source credentials, licensed data, market snapshots, and analysis runs should be server-only unless a customer-safe API explicitly exposes them.
- All customer invoice, contract, usage, employee, insurance, and location data remains tenant scoped.
- Service-role functions require fixed search path and revoked public execution.

---

# 6. Expert pack schema

Create:

```text
src/lib/category-intelligence/types.ts
src/lib/category-intelligence/pack-schema.ts
```

Use runtime validation.

```ts
type CategoryExpertPackV1 = {
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
```

## 6.1 Line item definition

```ts
type CategoryLineItemDefinition = {
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
```

## 6.2 Rule definition

```ts
type RuleDefinition = {
  ruleId: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  deterministic: boolean;
  requiredFields: string[];
  logic?: string;
  evidenceRequired: boolean;
  currentResearchRequired: boolean;
};
```

---

# 7. Shared Category Intelligence Service

Create:

```text
src/lib/category-intelligence/service.ts
src/lib/category-intelligence/category-resolver.ts
src/lib/category-intelligence/line-item-normalizer.ts
src/lib/category-intelligence/bill-quality.ts
src/lib/category-intelligence/benchmark-engine.ts
src/lib/category-intelligence/current-market-research.ts
src/lib/category-intelligence/source-registry.ts
src/lib/category-intelligence/context-builder.ts
src/lib/category-intelligence/opportunity-engine.ts
```

Required interface:

```ts
interface CategoryIntelligenceService {
  resolveCategory(input: ResolveCategoryInput): Promise<CategoryResolution>;
  loadExpertPack(input: LoadPackInput): Promise<CategoryExpertPackV1>;
  normalizeLineItems(input: NormalizeLineItemsInput): Promise<NormalizedLineItem[]>;
  analyzeBill(input: AnalyzeCategoryBillInput): Promise<CategoryBillAnalysis>;
  researchCurrentMarket(input: MarketResearchInput): Promise<MarketResearchResult>;
  benchmark(input: BenchmarkInput): Promise<BenchmarkResult>;
  buildAiContext(input: CategoryAiContextInput): Promise<CategoryAiContext>;
}
```

## 7.1 Category selection order

1. Verified organization/vendor category
2. Verified catalog category
3. Extracted document classification and line-item evidence
4. Domain/vendor enrichment
5. Model candidate classification
6. Unknown-category review queue

Never force a weak category merely to generate a benchmark.

## 7.2 Context injection

Every AI surface receives:

```json
{
  "category": {
    "key": "wireless-mobility",
    "displayName": "Wireless & Mobility",
    "confidence": 0.97,
    "expertPackVersion": "2026.08.1"
  },
  "relevantLineItemDefinitions": [],
  "billQualityRules": [],
  "benchmarkRequirements": [],
  "currentMarketFacts": [],
  "customerRecordContext": [],
  "allowedRecordIds": [],
  "requiredCaveats": []
}
```

Do not paste every expert pack into every model call.

## 7.3 Integration points

### Document intelligence

- Extract candidate category and subcategory
- Extract units and line-item aliases
- Preserve quotes/evidence
- Do not produce benchmark values

### Invoice persistence

- Save canonical line-item mappings
- Save category confidence
- Route uncertain classifications to review

### Bill Breakdown Inspector

- Use Category Intelligence Service
- Remove fixed benchmark ratios
- Show “market comparison unavailable” until comparable evidence exists
- Show pack version and source as-of date

### Ask Costivra

- Load relevant pack
- Retrieve current facts when needed
- Explain normalized line items
- Render category cards
- Cite customer records and external sources separately

### Monitoring

- Use category-specific expected cadence, invoice fields, and anomaly rules

### Opportunity engine

- Only produce opportunities supported by deterministic findings and evidence
- Separate verified overcharge, contract variance, usage optimization, and market-quote opportunity

---

# 8. Bill quality model

Create a category-configurable score, but never let a single score hide findings.

Suggested dimensions:

```text
identity completeness
period completeness
arithmetic reconciliation
unit and quantity integrity
contract conformity
asset/user/location reconciliation
tax and fee validity
rate and market comparability
evidence coverage
review state
```

Output:

```ts
type BillQualityResult = {
  status: "good" | "review" | "bad" | "insufficient_data";
  score: number | null;
  scoreVersion: string;
  findings: CategoryFinding[];
  missingFields: string[];
  benchmarkStatus: BenchmarkStatus;
  packVersion: string;
};
```

A “good” result means no material issue was found with available evidence. It is not a guarantee of lowest price.

---

# 9. Benchmark engine

## 9.1 Request

```ts
type BenchmarkInput = {
  categoryKey: string;
  metric: string;
  geography: Record<string, string | null>;
  serviceDate: string;
  volume: number | null;
  unit: string | null;
  serviceTier: string | null;
  usageShape: Record<string, unknown>;
  contractTermMonths: number | null;
  customerSize: Record<string, number | null>;
  riskExposure: Record<string, unknown>;
  specification: Record<string, unknown>;
  sourceRecordIds: string[];
};
```

## 9.2 Result

```ts
type BenchmarkResult = {
  status:
    | "comparable"
    | "directional"
    | "quote_required"
    | "insufficient_data"
    | "unsupported";
  metric: string;
  currentValue: number | null;
  comparisonRange: { low: number; median: number; high: number } | null;
  percentile: number | null;
  unit: string | null;
  comparableDimensions: Record<string, unknown>;
  missingDimensions: string[];
  sourceIds: string[];
  asOf: string | null;
  confidence: number;
  caveats: string[];
};
```

## 9.3 Prohibited behavior

Never:

- Apply a category-wide percentage to a total invoice
- Claim a “regional market rate” without a real source
- Annualize a one-time invoice difference without recurrence evidence
- Compare bills with different scopes/units
- Treat a government reimbursement schedule as a universal commercial market price
- Treat public list price as a negotiated enterprise benchmark
- Treat a regulatory factor as applying to the entire bill without assessing the base
- Present estimated savings as verified savings

---

# 10. Live web research

## 10.1 Source trust hierarchy

1. Customer contract, tariff, quote, usage, and invoice
2. Regulator/government dataset
3. Official vendor pricing/rate guide
4. Standards body
5. Licensed industry dataset
6. Reputable industry publication
7. General web source only when primary sources are unavailable

## 10.2 Mandatory triggers

Search current sources when:

- The user asks for current/best/latest pricing
- A fee or rate changes periodically
- A tariff/rule/filing controls the answer
- The cached snapshot is beyond TTL
- The invoice contains an unknown current fee
- A high-dollar opportunity relies on market pricing
- A vendor/category is new
- The geography or jurisdiction changes the answer
- Existing sources disagree
- The model is less than 0.85 confident about a market claim

## 10.3 Search privacy

Public search receives only public-safe data:

```text
category
subcategory
vendor public name
official domain hint
jurisdiction
general product/service descriptor
public tariff/rate identifier
```

Never send:

```text
customer name
account number
invoice number
service address
employee information
claims
health information
policy number
exact private usage
private contract text
financial amounts tied to a customer
```

## 10.4 Source freshness

Suggested defaults:

```text
weekly: parcel/freight fuel surcharges, energy market indices
monthly: EIA prices, PPI, commodity context
quarterly: USF, CMS files where applicable, market snapshots
annual: IRS, GSA, many insurance/benefit datasets
event driven: tariffs, rate filings, vendor price pages, regulations
```

## 10.5 Search output

Every current-market fact stores:

- Fact
- Unit
- Scope/dimensions
- Source URL
- Source title
- Publisher
- Effective date
- Retrieved date
- Expiration/TTL
- Short supporting excerpt
- Confidence
- Whether it is customer-comparable

Do not store full copyrighted pages.

# 11. Priority expert packs

The agent must create a separate versioned pack for every leaf category. The sections below define the minimum expertise for the highest-value categories. They are not optional examples.

## 11.1 Commercial electricity supply and delivery

### Market models the pack must understand

- Regulated bundled utility service
- Deregulated retail supply
- Utility delivery separated from competitive supply
- Fixed energy, index, block-and-index, heat-rate, layered procurement, and hybrid structures
- Capacity, transmission, ancillary, renewable-content, and congestion treatment
- Demand response and onsite-generation interactions
- Multi-location aggregation, staggered starts, add/delete language, and change-in-law clauses

### Canonical line items

- Energy or generation charge, usually per kWh or MWh
- Demand charge, usually per kW or kVA
- Distribution charge
- Transmission charge
- Capacity charge
- Ancillary-services charge
- Nodal or congestion charge
- Power-factor or reactive-demand adjustment
- Ratchet demand
- Meter/customer/base charge
- Renewable-energy certificate or green premium
- Sales, gross receipts, municipal, state, or other taxes
- Credits, prior-period corrections, late fees, deposits, and minimum-use charges

### A good bill

- Service period, meter, account, premise/ESI/location, rate class, and units are clear
- kWh, kW/kVA, power factor, and interval-dependent charges reconcile
- Supply and delivery portions are separated when market structure requires it
- Contract rate and utility tariff agree with billed components
- Taxes/exemptions are supported
- No duplicate meter/base charges
- Demand ratchet and power-factor calculations are explainable
- Renewable or pass-through products are identified rather than hidden in a blended rate

### Bad-bill signals

- Effective rate is calculated from total bill without separating delivery, taxes, demand, and supply
- Wrong rate class or meter multiplier
- Unexplained change in load zone, congestion, capacity, transmission, or pass-through treatment
- Demand spike inconsistent with interval data
- Duplicate accounts/locations or orphaned meters
- Tax charged despite supported exemption
- Supplier rate differs from contract
- Variable pass-through presented as fully fixed
- Automatic renewal or holdover rate
- Base/customer/meter fees not authorized by the agreement

### Benchmark dimensions

- State, utility/TDSP, market structure, load zone, settlement point
- Rate class and tariff
- Annual kWh
- Peak demand and load factor
- Interval shape and seasonality
- Contract start, term, product structure, credit, collateral
- Included/excluded pass-throughs
- Renewable content
- Supplier and quote date

### Required output

Never say “best electricity price” from a national average. Produce:

- Commodity/supply comparison
- Delivery/tariff validation
- Demand and load-factor analysis
- Contract-inclusion matrix
- Comparable quote range only when all key dimensions are present
- `quote_required` when a live supplier quote is necessary

## 11.2 Commercial natural gas

Understand:

- Therm, MCF, Dth/MMBtu conversion
- Commodity, basis, transport, distribution, storage, balancing, demand, and taxes
- Regulated utility service versus marketer/supplier programs
- Firm versus interruptible service
- Index, fixed, basis-fixed, transport-only, and managed products

Good bills reconcile volume conversions, meter periods, weather/seasonality, supplier and utility components, transport capacity, and taxes. Bad signals include wrong conversion factors, duplicate transport, unused firm capacity, unexplained imbalance penalties, out-of-contract pricing, and mismatched service periods.

Benchmark by state, utility, citygate/basis, usage profile, peak-day demand, service class, contract term, firm requirements, and quote date.

## 11.3 Water, sewer, and stormwater

Canonical line items:

- Meter/base charge by meter size
- Tiered consumption
- Sewer volume or winter-average calculation
- Stormwater ERU/impervious-area charge
- Fire-line charge
- Backflow or cross-connection fee
- Drought/conservation surcharge
- Pretreatment, industrial-strength, grease, or sampling fee
- Local taxes and franchise fees

Good bills use the correct meter size, read dates, consumption units, tier math, sewer formula, stormwater classification, and credits. Bad signals include estimated reads that persist, abnormal continuous use, wrong meter class, sewer charges on non-return water without adjustment, duplicate meters, incorrect stormwater area, and unexplained spikes.

There is no national best water price. Use the actual municipal tariff plus peer context when available.

## 11.4 Business broadband, DIA, WAN, and voice

Canonical line items:

- Local loop/access circuit
- Port
- Bandwidth commit
- Burst/overage
- Router/CPE
- Managed service
- IP addresses
- Installation/nonrecurring charge
- DID, SIP trunk/channel, toll, conferencing
- E911
- Universal service, TRS, regulatory recovery, state/local taxes
- Early-termination and construction charges

Good bills identify service address, circuit ID, speed, SLA, term, hardware, and tax basis. Bad signals include disconnected circuits still billed, duplicate loops, speed below contract, unreturned equipment, expired promotions, off-contract renewals, excessive regulatory-recovery charges, unused DIDs/channels, and multiple services at one site.

Benchmark by exact address, technology, symmetrical speed, SLA, diversity, construction, term, managed equipment, IPs, and current carrier availability. The FCC map can establish availability, not the negotiated price.

## 11.5 Wireless and mobility

Canonical line items:

- Voice/data plan
- Line access
- Device installment
- Device insurance
- Activation/upgrade
- International/roaming
- Hotspot/add-on
- Overage
- Taxes and telecom fees
- Credits and promotional discounts

Good bills match active devices, users, plan tiers, usage, and contract/finance state. Bad signals include zero-use lines, former employees, duplicate insurance, expired promos, financed devices after payoff, over-provisioned data, avoidable roaming, and plan fragmentation.

Optimize through inventory cleanup, pooled plans, BYOD/device lifecycle, international policies, and competitive enterprise quotes.

## 11.6 SaaS subscriptions

Canonical line items:

- Contracted seats
- Active seats/users
- Platform fee
- Per-user tier
- Usage or consumption
- Add-on modules
- API/automation credits
- Storage
- Premium support
- Implementation/onboarding
- Overage
- True-up
- Minimum commitment
- Marketplace/reseller markup
- Credits and co-term adjustments

Good bills show the contract quantity, billing period, unit price, discount, currency, renewal, and usage. Bad signals include shelfware, duplicate tools, inactive users, automatic true-ups, list-price renewals, minimums above utilization, surprise overages, support not used, and reseller/invoice mismatch.

Benchmark by edition, seat band, geography, term, payment timing, support, add-ons, usage, and current official/vendor quote. Public list price is a ceiling/reference, not proof of achievable enterprise price.

## 11.7 Cloud, AI, API, and data-center spend

Canonical line items:

- Compute instance/serverless time
- GPU/accelerator
- Storage capacity, operations, and retrieval
- Database
- Requests/tokens
- Data transfer/egress
- Public IP/NAT/load balancer
- Observability/logging
- Backup/snapshot
- Marketplace software
- Support
- Reservation/savings-plan/committed-use amortization
- Credits, refunds, taxes
- Colocation space, power, cross-connect, remote hands, bandwidth

Use the latest FOCUS specification as the normalized semantic layer where possible.

Good bills reconcile provider invoice, cost-and-usage data, accounts/subaccounts, credits, commitments, allocation tags, and currency. Bad signals include idle resources, unattached storage/IPs, oversized compute, unallocated spend, egress surprises, commitment underutilization, credit expiration, duplicate marketplace tools, runaway logs, and nonproduction resources left on.

“Best price” requires region, SKU, workload, usage schedule, growth, resilience, licensing, term, commitment flexibility, and egress. Provider savings claims are not guaranteed savings.

## 11.8 Commercial property and liability insurance

Canonical components:

- Coverage form and line
- Insured location/vehicle/exposure
- Limit and sublimit
- Deductible/SIR
- Base premium
- Exposure basis
- Rate
- Schedule credit/debit
- Experience modification when applicable
- Terrorism
- Taxes
- Surplus-lines stamping/service fees
- Broker fee or commission disclosure when available
- Endorsements
- Audit premium
- Installment/finance charge

Good bills/policies align named insureds, locations, operations, values, limits, deductibles, classifications, endorsements, term, and premium allocation. Bad signals include duplicate locations, stale property values, wrong operations/classification, unexplained schedule debits, missing endorsements, nonadmitted fees without support, audit shocks, coverage gaps, and premium finance despite available alternatives.

Never benchmark insurance using total premium alone. Require state, line, carrier/admitted status, industry, revenue/payroll/property values, construction/occupancy/protection, claims, limits, deductibles, catastrophe exposure, and term. Use SERFF/public filings and licensed market data as context, not a customer-specific quote.

## 11.9 Workers compensation

Canonical components:

- State
- Class code
- Payroll by class
- Loss cost/manual rate
- Carrier multiplier
- Experience modification
- Schedule credit/debit
- Premium discount
- Expense constant
- Terrorism/catastrophe
- State assessments
- Audit adjustment
- Minimum premium

Good bills correctly classify employees and payroll, apply the current experience mod and filed values, and reconcile audits. Bad signals include clerical/sales staff in governing class without basis, split-payroll errors, stale mod, duplicate assessments, unexplained debits, subcontractor certificates missing, and audit payroll inconsistent with payroll records.

Use state/class-specific NCCI or independent-bureau data and carrier filings. No national rate.

## 11.10 Health, dental, vision, life, disability, stop-loss, and PBM

Canonical components:

- Employee-only, employee+spouse, employee+child, family tiers
- Employer and employee contribution
- Age band or composite rate
- Medical plan premium or claims funding
- Administrative fee
- Stop-loss specific and aggregate premium
- PBM spread/pass-through/rebate/administrative charges
- Network/access fee
- COBRA
- Wellness/care management
- Broker/consultant compensation
- Taxes/assessments

Good bills reconcile eligibility, tiers, effective dates, plan rates, dependents, contributions, COBRA, stop-loss, and credits. Bad signals include terminated employees, duplicate dependents, wrong tier, retroactivity without support, opaque PBM economics, uncredited rebates, broker compensation not disclosed where required, and stop-loss terms misaligned with risk.

MLR is a market-level value measure, not a direct plan-price benchmark. Pricing requires geography, group size, age/risk, plan design, network, funding type, claims, participation, contribution, and renewal date.

## 11.11 Merchant processing and gateways

Canonical line items:

- Gross sales and refunds
- Transaction count and average ticket
- Interchange
- Network assessment
- Processor markup
- Authorization
- AVS
- Gateway
- PCI/noncompliance
- Batch
- Monthly minimum
- Statement
- Chargeback/retrieval
- Equipment
- Cross-border/currency
- Debit network
- Surcharging/convenience-fee items where lawful

Good statements reconcile volume, transaction count, card mix, refunds, effective rate, interchange, assessments, and markup. Bad signals include opaque bundled pricing, downgrades, duplicate gateway, PCI penalties, hidden annual fees, excessive authorization/batch fees, minimums, and incorrect card-present/e-commerce classification.

Benchmark using actual transaction-level mix and qualification. Regulation II applies only to qualifying covered debit transactions, not the entire portfolio.

## 11.12 Payroll, PEO, ASO, and staffing

Canonical line items:

- Gross payroll
- Employee count
- Payroll runs
- Per-employee-per-month fee
- Base processing fee
- Tax filing
- W-2/1099
- Garnishment
- Timekeeping
- HRIS
- Benefits administration
- Workers compensation
- State unemployment
- Federal/state/local taxes
- PEO administrative fee
- Staffing bill rate, pay rate, markup, overtime, shift differential

Good bills reconcile employees, runs, jurisdictions, taxes, benefits, and contract unit rates. Bad signals include terminated employees, duplicate jurisdictions, avoidable off-cycle charges, incorrect tax rates, unexplained PEO allocation, staffing markup applied to pass-throughs, and overtime or conversion fees inconsistent with contract.

Use current IRS/state rules for statutory charges and BLS/local wage data as context. Vendor pricing still requires headcount, jurisdictions, payroll frequency, services, benefits, risk, and integration needs.

## 11.13 Solid waste, recycling, medical waste, and hazardous waste

Canonical line items:

- Container type/size/count
- Pickup frequency
- Haul/service charge
- Disposal/tonnage
- Recycling/compost
- Fuel/environmental/recovery fee
- Contamination
- Overage
- Extra pickup
- Delivery/removal/exchange
- Lock/caster
- Franchise/municipal fee
- Medical container
- Manifest, treatment, profile, transportation
- EPA e-Manifest fee when applicable

Good bills match container inventory, schedule, weights, franchise rules, and contract escalation. Bad signals include ghost containers, unperformed pickups, minimum tonnage, escalating fuel/environmental fees unrelated to actual index terms, contamination without evidence, repeated overages, duplicate delivery fees, and manifest charges assigned to the wrong regulated party.

Solid-waste pricing is intensely local. Benchmark by municipality/franchise, container, pickups, density/weight, waste stream, contamination, access, contract term, and disposal market.

## 11.14 Facilities services

### Janitorial

Line items include square footage, service frequency, labor hours, day porter, consumables, floor care, windows, equipment, and special projects. Compare by cleanable square footage, occupancy, frequency, service specification, wage market, supplies, and quality SLA.

### Uniforms, linen, and mats

Track wearer/item inventory, changes, replacements, loss/damage, laundering, environmental/energy fees, minimums, delivery, and termination buyout. Bad signals include phantom wearers, repeated replacement, unreturned items, automatic quantity growth, and percentage fees layered on the whole invoice.

### HVAC/mechanical

Track trip/dispatch, labor class/hours, overtime, preventive maintenance, filters/belts, refrigerant type/quantity, parts/equipment, controls, rental, and warranty. Good bills identify asset, diagnosis, technician time, parts, warranty, and authorization. Compare service scope, asset count/type, response SLA, labor market, parts, refrigerant, and PM frequency.

### Fire/life safety

Track inspection/testing by system/device, monitoring, extinguisher, sprinkler, alarm panel, backflow, permit, deficiency repair, and emergency call. Require asset/device schedule, code/jurisdiction, frequency, deficiency evidence, and certification.

### Security, pest, landscaping, elevator, repairs

Each gets its own leaf pack. Never compare total monthly price without site count, scope, labor, equipment/assets, frequency, service level, and geography.

## 11.15 Rent, CAM, NNN, and occupancy

Canonical line items:

- Base rent
- Scheduled escalation
- Percentage rent
- CAM/operating expense
- Property tax
- Building insurance
- Utilities
- Management/admin fee
- Gross-up
- Capital expenditure
- Reconciliation/prior-year true-up
- Audit adjustment
- Parking/storage

Good bills follow lease definitions, square footage, pro-rata share, caps, exclusions, gross-up, base year, and timing. Bad signals include capital costs treated as operating expense contrary to lease, wrong area/share, management fee applied to excluded items, duplicate tax/insurance, uncapped controllable costs, and unsupported true-up.

The authoritative benchmark begins with the lease and property records. Market rent data cannot validate CAM allocation by itself.

## 11.16 Parcel, LTL, FTL, courier, and fleet

### Parcel

Track service, zone, actual/dimensional weight, residential, delivery area, remote area, additional handling, large package, address correction, declared value, signature, demand/fuel, return, pickup, and minimum. Compare at shipment level against the customer agreement and current service guide.

### LTL

Track NMFC item/class, density, weight, pallet dimensions, origin/destination, linehaul, fuel, minimum charge, reweigh/reclass, liftgate, inside, residential/limited access, notification, detention, redelivery, and deficit weight. Use current NMFC rules and carrier tariff/agreement.

### FTL/brokerage

Track lane, miles, equipment, linehaul, fuel, detention, layover, stop-off, lumper, toll, reefer, team, and accessorial evidence. Benchmark by lane/date/equipment/service and use licensed rate data when available.

### Fuel/fleet cards

Track gallons, product, price basis, taxes, network/transaction fee, rebates, out-of-network, driver/vehicle, maintenance, and exceptions. Compare by location, product, date, contracted differential, tax treatment, and rebate qualification.

## 11.17 Foodservice, beverage, packaging, and hospitality consumables

Canonical line items:

- SKU and description
- Brand/grade/spec
- Pack and unit of measure
- Case, each, pound, gallon, catch weight
- Quantity
- Unit/case price
- Split-case fee
- Freight/fuel
- Market/commodity adjustment
- Deposit
- Tax
- Credit/shortage/substitution
- Rebate/allowance

Good invoices preserve pack/UOM and credits and match contracted specs. Bad signals include pack-size shrink hidden by case price, catch-weight errors, substitutions, missing credits, duplicate freight/fuel, off-contract SKU drift, and rebate leakage.

Use USDA market data only for comparable commodities with grade, origin, pack, market, and date. It does not replace a distributor quote.

## 11.18 Medical supplies, DME, laboratory, and clinical services

Canonical line items:

- SKU/HCPCS/CPT where applicable
- Description
- Unit/pack
- Purchase versus rental
- Quantity
- Fee schedule or contracted rate
- Delivery
- Setup/service
- Maintenance
- Disposable supplies
- Taxes
- Credits/returns
- Waste/disposal

Good bills identify code, item, unit, setting, patient/site where legally appropriate, date, quantity, and contract. Bad signals include duplicate rentals, rental beyond purchase threshold, wrong pack/UOM, unsupported delivery, code mismatch, uncredited returns, expired products, and service duplication.

CMS fee schedules are public reimbursement context, not an automatic commercial price ceiling.

## 11.19 Professional services, travel, marketing, and office spend

### Legal/accounting/consulting

Normalize professional, role, rate, hours, task/matter/project, expense, travel, technology/admin, tax, retainer, and discount. Good invoices use approved rate cards, task descriptions, staffing mix, budgets, and matter codes. Bad signals include block billing, vague descriptions, senior-heavy staffing, duplicate work, unapproved rate increases, and overhead disguised as disbursement.

### Travel/lodging

Normalize traveler, city, dates, nightly room, taxes, resort/destination, parking, internet, meals, airfare class, fare, baggage, change, rental, fuel, and mileage. Compare against policy, negotiated programs, GSA locality context, season, and booking date.

### Office/print

Normalize SKU, unit, quantity, lease base, meter/click, mono/color, supplies, service, minimum, overage, freight, and equipment. Identify off-contract products, auto-renewal, meter minimums, duplicate devices, and supply markups.

## 11.20 Industrial and manufacturing

Create separate packs for raw materials, industrial gases, packaging, MRO, equipment maintenance, and construction trades.

All require:

- Specification/grade
- Unit of measure
- Quantity
- Commodity or index basis where applicable
- Conversion/yield
- Freight
- Surcharges
- Scrap/returnable container
- Quality
- Lead time
- Contract escalation
- Incoterms or delivery terms where relevant

A national average without grade, geography, volume, and date is not a valid benchmark.

---

# 12. Normalize the existing catalog

## 12.1 Category aliases

Map current values:

```text
Commercial Energy -> commercial-electricity-supply
Energy -> commercial-electricity-supply after vendor review
Software -> vendor-specific split
software_subscription -> saas-subscriptions
Telecom & Internet -> vendor-specific telecom leaf
Telecom -> wireless-mobility or telecom leaf after review
telecom -> wireless-mobility or telecom leaf after review
Waste -> solid-waste-recycling
waste_management -> solid-waste-recycling
Facilities -> vendor-specific facilities leaf
Food service -> foodservice-distribution
```

## 12.2 Vendor-specific seed overrides

Examples:

```text
Amazon Web Services -> cloud-iaas-paas
Microsoft Azure -> cloud-iaas-paas
Google Cloud -> cloud-iaas-paas
Microsoft 365 -> saas-subscriptions
Google Workspace -> saas-subscriptions
Salesforce -> saas-subscriptions
Slack -> saas-subscriptions
Toast -> saas-subscriptions, with POS/merchant-processing adjacency
AT&T Business -> category depends on relationship/service; do not force all invoices into one leaf
Verizon Business -> relationship/service dependent
Cintas -> uniforms-linen-mats
Sysco -> foodservice-distribution
Republic Services -> solid-waste-recycling
Waste Management -> solid-waste-recycling
Commercial energy suppliers -> commercial-electricity-supply, with natural-gas capability stored separately when applicable
```

One global vendor may support multiple categories. The organization relationship or individual account/document must carry the actual service category.

Do not rely only on `vendors.category` for multi-service vendors.

## 12.3 Migration process

1. Seed parent and leaf taxonomy
2. Add aliases
3. Run dry-run mapping report
4. Review ambiguous vendors
5. Update verified mappings
6. Preserve previous category in audit metadata
7. Do not delete old values until all consumers use category IDs
8. Add a temporary compatibility mapper
9. Remove compatibility code after migration proof

---

# 13. Unknown categories

No finite taxonomy stays complete forever.

When a new category appears:

1. Classify as `unknown` or nearest parent
2. Do not generate a market benchmark
3. Create a category candidate
4. Search trusted sources
5. Generate a draft expert pack
6. Run source and schema validation
7. Create eval cases
8. Require human verification
9. Promote to verified
10. Reprocess affected invoices if approved

Unknown categories remain monitoring-only until verified.

---

# 14. Evaluation and expert verification

## 14.1 Per-pack test suite

Each verified leaf pack needs:

- 20+ representative invoices/documents where legally available
- 10+ adversarial or malformed cases
- 10+ line-item alias variations
- 5+ good bills
- 5+ anomaly bills
- 5+ insufficient-data benchmark cases
- Current-source retrieval test
- Source-expiration test
- Prompt-injection test
- Cross-category confusion test
- Jurisdiction test
- No-fabricated-benchmark test

## 14.2 Quality thresholds

Suggested launch thresholds:

```text
parent category accuracy >= 98%
leaf category accuracy >= 94%
material line-item mapping precision >= 95%
material line-item mapping recall >= 90%
arithmetic reconciliation = 100% deterministic
unsupported benchmark claims = 0
fabricated citations = 0
cross-tenant leakage = 0
generic “best price” claims without dimensions = 0
```

Do not hide low-frequency category failures in one blended average.

## 14.3 Expert review

High-risk packs require subject-matter review:

- Insurance
- Employee benefits
- Taxes
- Healthcare
- Hazardous/medical waste
- Energy tariffs
- Regulated telecom fees
- Legal services
- Payroll tax

AI should provide cost intelligence, not legal, insurance-broker, tax, medical, engineering, or regulatory certification.

---

# 15. Implementation order

## P0: Stop false expertise

- Delete synthetic benchmark ratios
- Return honest unavailable status
- Normalize the taxonomy
- Add Insurance & Employee Benefits
- Build shared pack schema/service
- Prevent AI surfaces from inventing market data

## P1: Highest current spend coverage

1. Commercial electricity
2. Telecom/broadband/wireless
3. SaaS
4. Cloud/AI/API
5. Solid waste
6. Merchant processing
7. Insurance and benefits
8. Water/sewer
9. Payroll/PEO/staffing
10. Parcel/freight

## P2

- Facilities
- Rent/CAM
- Foodservice
- Healthcare supplies
- Fleet
- Professional services
- Travel
- Industrial/MRO

## P3

- Long-tail packs
- Licensed benchmark integrations
- Expert review workflows
- Automated source refresh with approvals

---

# 16. Required files

```text
src/lib/category-intelligence/
  types.ts
  pack-schema.ts
  service.ts
  category-resolver.ts
  context-builder.ts
  line-item-normalizer.ts
  bill-quality.ts
  benchmark-engine.ts
  current-market-research.ts
  source-registry.ts
  opportunity-engine.ts
  packs/
    energy-electricity.ts
    energy-natural-gas.ts
    water.ts
    telecom-broadband.ts
    telecom-wireless.ts
    saas.ts
    cloud.ts
    insurance-property-liability.ts
    insurance-workers-comp.ts
    benefits-health.ts
    merchant-processing.ts
    payroll-staffing.ts
    waste.ts
    facilities.ts
    rent-cam.ts
    logistics.ts
    fleet.ts
    foodservice.ts
    healthcare-supplies.ts
    professional-services.ts
    index.ts
```

Routes/services to repair:

```text
src/app/api/portal/documents/[id]/breakdown/route.ts
src/lib/ai/document-intelligence.ts
src/lib/documents/invoice-record.ts
src/lib/client-assistant/context-builder.ts
src/lib/client-assistant/service.ts
src/lib/client-assistant/block-hydrator.ts
src/lib/vendors/resolve.ts
src/lib/vendors/monitoring.ts
src/lib/workflows/value-engine.ts
```

Add a manage surface:

```text
/manage/category-intelligence
```

It should show:

- Taxonomy
- Pack versions/status
- Source freshness
- Coverage/eval results
- Unmapped line items
- Unknown categories
- Human corrections
- Research refresh queue
- Unsupported benchmark attempts

---

# 17. Bill Breakdown response contract

Replace the current market benchmark object with:

```ts
type BillBreakdownMarketContext = {
  category: {
    id: string | null;
    key: string | null;
    name: string | null;
    confidence: number;
    packVersion: string | null;
  };
  billQuality: BillQualityResult;
  lineItemExplanations: Array<{
    lineItemId: string;
    canonicalCode: string | null;
    originalDescription: string;
    explanation: string;
    chargeClass: string;
    confidence: number;
    evidenceIds: string[];
  }>;
  benchmark: BenchmarkResult;
  marketFacts: Array<{
    fact: string;
    sourceTitle: string;
    sourceUrl: string;
    asOf: string;
    comparable: boolean;
  }>;
  guidance: Array<{
    title: string;
    action: string;
    reason: string;
    confidence: number;
    evidenceIds: string[];
    authorizationRequired: boolean;
  }>;
};
```

No fake source labels. No value when benchmark status is unavailable.

---

# 18. AI system prompt contract

All system surfaces should include:

```text
You have access to a versioned Costivra category expert pack.
Treat the pack as guidance, not source evidence.
Use customer records as the authoritative facts for this customer.
Use current retrieved sources for changing rates, tariffs, fees, filings, and prices.
Do not claim a best price without the required comparison dimensions.
Do not infer verified savings from a directional benchmark.
Do not treat a government average, reimbursement schedule, list price, or index as a customer quote.
Explain unfamiliar line items using the category ontology.
State what is missing.
Cite every current market fact.
```

---

# 19. Source registry
| Market | Primary source | URL | Refresh | Use restriction |
|---|---|---|---|---|
| Electricity | EIA retail sales, prices, customers by state and sector | https://www.eia.gov/electricity/data.php | Monthly/annual | Macro comparison only; never substitute for a supplier or tariff quote. |
| Electricity | EIA Electricity Monthly Update | https://www.eia.gov/electricity/monthly/update/end-use.php | Monthly | Use sector/state context with service date. |
| Natural gas | EIA natural-gas prices and volumes | https://www.eia.gov/naturalgas/data.php | Monthly | Separate commodity, marketer, transportation, and utility delivery. |
| Texas energy | ERCOT market data | https://www.ercot.com/mp/data-products/data-product-details?id=NP6-785-ER | Daily/market | Use only when geography and settlement/load zone are known. |
| Texas energy | Public Utility Commission of Texas | https://www.puc.texas.gov/industry/electric/ | Event driven | Use tariffs, rules, REP/TDSP context, and effective dates. |
| Telecom | USAC contribution factors | https://www.usac.org/service-providers/making-payments/contribution-factors/ | Quarterly | Apply only to assessable interstate/international telecom revenue. |
| Broadband | FCC National Broadband Map | https://broadbandmap.fcc.gov/home | Continuous/semiannual filings | Availability source, not a negotiated price quote. |
| Telecom | FCC Electronic Tariff Filing System | https://apps.fcc.gov/etfs/ | Event driven | Use filed tariff/service details when applicable. |
| Cloud/technology | FOCUS specification | https://focus.finops.org/focus-specification/ | Versioned | Normalize cloud, SaaS, AI, data-center, invoice, commitment, and usage fields. |
| AWS | AWS Pricing Calculator | https://calculator.aws/ | Current | Price by region, service, usage, commitments, support, and data transfer. |
| AWS | AWS Savings Plans | https://aws.amazon.com/savingsplans/ | Current | Savings claims depend on commitment, term, payment, eligible services, and utilization. |
| Azure | Azure Pricing Calculator | https://azure.microsoft.com/pricing/calculator/ | Current | Use region, SKU, tier, reservation/savings plan, and support. |
| Azure | Azure reservations | https://learn.microsoft.com/azure/cost-management-billing/reservations/save-compute-costs-reservations | Current | Compare flexibility and utilization risk. |
| Google Cloud | Google Cloud Pricing Calculator | https://cloud.google.com/products/calculator | Current | Use region, service, committed use, egress, support, and credits. |
| Health insurance | CMS Medical Loss Ratio | https://www.cms.gov/marketplace/private-health-insurance/medical-loss-ratio | Annual | MLR is market/state level, not a universal plan-price benchmark. |
| Health insurance | CMS MLR data resources | https://www.cms.gov/marketplace/resources/data/medical-loss-ratio-data-systems-resources | Annual | Use issuer, state, and market segment. |
| Insurance | SERFF public rate/form filing access | https://www.serff.com/serff_filing_access.htm | Event driven | State availability and public fields vary. |
| Workers compensation | NCCI Rate Table Data | https://www.ncci.com/ServicesTools/Pages/RATETABLEDATA.aspx | Filing updates | Licensed/paid data may be required; use class and state. |
| Workers compensation | NCCI Classification Experience Data | https://www.ncci.com/ServicesTools/Pages/CLASSEXPDATA.aspx | Annual | Use state, policy period, class code, payroll/exposure, and loss experience. |
| Merchant processing | Federal Reserve Regulation II | https://www.federalreserve.gov/frrs/regulations/section-2353-reasonable-and-proportional-interchange-transaction-fees.htm | Regulatory | Covered debit only; card mix and exemptions matter. |
| Merchant processing | Visa interchange resources | https://usa.visa.com/support/consumer/visa-rules.html | Current | Use the official U.S. interchange reimbursement fee documents. |
| Merchant processing | Mastercard merchant interchange | https://www.mastercard.com/us/en/business/support/merchant-interchange-rates.html | Current | Use product, acceptance channel, industry, qualification, and transaction data. |
| Payroll | IRS Publication 15 | https://www.irs.gov/publications/p15 | Annual/event driven | Federal rules only; add state/local sources. |
| Payroll | IRS Publication 15-A | https://www.irs.gov/publications/p15a | Annual/event driven | Worker classification and specialized employment-tax context. |
| Workforce | BLS Employer Costs for Employee Compensation | https://www.bls.gov/ecec/ | Quarterly | Trend/input context, not a staffing quote. |
| Professional/facilities | BLS Producer Price Index | https://www.bls.gov/ppi/ | Monthly | Use detailed service indexes for trend context, not a quote. |
| Waste | EPA e-Manifest fees | https://www.epa.gov/e-manifest/e-manifest-user-fees-and-payment-information | Two-year fee cycles/event driven | Only relevant manifest type and regulated party. |
| Waste | EPA e-Manifest system and state adoption | https://www.epa.gov/e-manifest | Event driven | Jurisdiction and waste type matter. |
| Water | AWWA rate data products | https://awwa.org/data-products/ | Updated periodically | Utility, meter size, geography, consumption, and rate structure required. |
| Water | AWWA benchmarking | https://www.awwa.org/programs/benchmarking/ | Annual | Utility performance is not the same as customer bill pricing. |
| Building energy | ENERGY STAR Portfolio Manager | https://www.energystar.gov/buildings/benchmark | Ongoing | Normalize property type, operations, weather, and floor area. |
| Building energy | ENERGY STAR score methodology | https://www.energystar.gov/buildings/benchmark/understand-metrics/how-score-calculated | Methodology/versioned | Peer performance, not vendor price. |
| Facilities safety | OSHA standards | https://www.osha.gov/laws-regs/regulations/standardnumber/1910 | Event driven | Use applicable industry, equipment, and jurisdiction. |
| Parcel | FedEx fuel surcharge | https://www.fedex.com/en-us/shipping/fuel-surcharge.html | Weekly | Customer agreement controls; service and index lag matter. |
| Parcel | UPS rates and surcharges | https://www.ups.com/us/en/support/shipping-support/shipping-costs-rates | Event/weekly | Use customer agreement, zone, service, DIM, and accessorials. |
| Parcel | USPS price changes | https://pe.usps.com/PriceChange/Index | Event driven | Use effective date, product, weight, zone, dimensions, and negotiated agreement. |
| LTL freight | NMFTA National Motor Freight Classification | https://nmfta.org/standards/classification/nmfc/ | Versioned/event driven | Density, handling, stowability, liability, commodity, and tariff matter. |
| Fuel/fleet | EIA gasoline and diesel | https://www.eia.gov/petroleum/gasdiesel/ | Weekly | Index context; taxes, network, geography, and rebates matter. |
| Foodservice | USDA Market News | https://www.ams.usda.gov/market-news | Daily/weekly | Normalize commodity, grade, pack, origin, market, and date. |
| Healthcare supplies | CMS DMEPOS fee schedules | https://www.cms.gov/medicare/payment/fee-schedules/dmepos/dmepos-fee-schedule | Quarterly | Public reimbursement context, not always commercial purchase price. |
| Healthcare | CMS general fee schedules | https://www.cms.gov/medicare/payment/fee-schedules | Quarterly/annual | Match procedure, locality, setting, and effective date. |
| Travel | GSA per diem rates | https://www.gsa.gov/travel/plan-a-trip/per-diem-rates | Annual/event driven | Policy benchmark; location, season, exceptions, and corporate program matter. |
| Travel | GSA per diem API | https://open.gsa.gov/api/perdiem/ | Annual | Use locality and fiscal year. |
| Commercial real estate | BOMA research and benchmarking | https://www.boma.org/BOMA/Research-Resources/ | Annual/licensed | Paid/licensed data; do not scrape without permission. |
---

# 20. Research workflow for the Antigravity agent

For every leaf pack:

1. Search the official regulator/government source
2. Search official vendor or standards sources
3. Identify paid/licensed data requirements
4. Build line-item vocabulary
5. Define bill anatomy
6. Define pricing models
7. Define comparison dimensions
8. Define deterministic rules
9. Define good-bill signals
10. Define anomaly signals
11. Define optimization levers
12. Define live-search triggers
13. Record sources and freshness
14. Create evaluation cases
15. Run tests
16. Obtain human review for high-risk categories
17. Mark verified only after passing

Do not scrape a paid source or bypass access controls.

---

# 21. Required proof

## Taxonomy proof

- All parent/leaf categories seeded
- Insurance categories visible
- Existing duplicate labels normalized
- Multi-service vendor relationships supported
- Unknown-category path tested

## Expertise proof

For each launch pack:

- Line-item dictionary count
- Test-case count
- Classification accuracy
- Line-item mapping precision/recall
- Current sources
- Last verified date
- Human reviewer where required

## Market proof

- No hardcoded percentage benchmark remains
- Every benchmark has dimensions and source
- Insufficient cases return unavailable
- Current web retrieval refreshes expired facts
- Search never receives private customer data

## System-wide proof

Demonstrate the same category analysis in:

- Upload
- Bill Breakdown
- Ask Costivra
- Monitoring
- Opportunity
- Manage assistant
- Report

## Safety proof

- No cross-tenant data
- No fabricated citation
- No unsupported “best price”
- No verified-savings claim from an estimate
- No high-risk category presented as professional certification

---

# 22. Validation commands

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:integration:live
npm run eval:invoices
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

Add:

```bash
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
```

---

# 23. Final completion report

Return:

## Verdict

```text
CATEGORY INTELLIGENCE VERIFIED
```

or:

```text
PARTIAL CATEGORY COVERAGE
```

Never use the first when any launch pack lacks sources or eval proof.

## Taxonomy

- Parents
- Leaves
- Insurance coverage
- Existing vendors remapped
- Ambiguous vendors remaining

## Expert packs

For every pack:

- Version
- Status
- Sources
- Last verified
- Line-item definitions
- Rules
- Evaluations
- Reviewer

## Benchmark integrity

- Fake benchmark code removed
- Real benchmark methods
- Insufficient-data behavior
- Current-source retrieval
- Citation proof

## System integration

- Extraction
- Invoice
- Breakdown
- Chat
- Monitoring
- Opportunities
- Reports
- Manage

## Remaining gaps

List unsupported categories and manual/licensed-source requirements honestly.

---

# 24. Final instruction

Do not try to make Costivra look omniscient.

Make it systematically knowledgeable:

- The right taxonomy
- The right expert pack
- The right customer context
- The right current sources
- The right deterministic calculations
- The right caveats
- The right evidence
- The right human review

That is how every AI surface becomes a real category expert without becoming a confident fiction machine.
