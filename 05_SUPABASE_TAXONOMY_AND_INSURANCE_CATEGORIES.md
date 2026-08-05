
# Packet 05: Supabase Taxonomy, Legacy Normalization, and Insurance Categories

## Mission

Create a canonical hierarchical taxonomy in Supabase, normalize duplicate category strings, and add first-class insurance and employee-benefit categories.


## Operating rules

- Read `AGENTS.md`, `STATUS.md`, and `DECISIONS.md` before editing.
- Inspect the latest branch and live Supabase schema rather than trusting the static SHAs in this packet.
- Preserve unrelated product work.
- Work on `agent/category-intelligence-hardening` when it exists. Otherwise create it from the latest `main`.
- At the start, rebase or merge the latest `main` only when the worktree is clean and conflicts can be reviewed safely.
- Do not merge into `main` during this packet unless this packet explicitly says to.
- Use Supabase MCP for schema inspection and reviewed migrations.
- Never place credentials, customer data, or private invoice text in source, tests, logs, or public web-search requests.
- AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.
- Unknown means unknown. Do not invent a category, line-item meaning, benchmark, market price, citation, or savings number.
- Run the packet’s validation commands and repair failures before reporting completion.
- Commit and push the packet as one or a few reviewable commits.


## Preflight

Through Supabase MCP, inspect:

```text
vendor_categories
vendors
organization_vendors
invoices
documents
expenses
contracts
```

Confirm existing category IDs and string fields before writing a migration.

## Parent categories

Seed:

```text
energy-utilities
telecom-connectivity
technology
insurance-benefits
waste-environmental
facilities-property-services
real-estate-occupancy
payments-finance
workforce-hr
logistics-fleet
food-hospitality
office-professional
healthcare-regulated
industrial-manufacturing
taxes-permits-public-fees
unknown
```

## Insurance leaves

At minimum:

```text
commercial-property
general-liability-bop
workers-compensation
commercial-auto
cyber-insurance
umbrella-excess
group-health
dental-vision-life-disability
stop-loss-pbm-benefits-admin
```

## Other launch leaves

Seed exact keys used by code, including:

```text
commercial-electricity-supply
electric-delivery-demand
commercial-natural-gas
water-sewer-stormwater
business-broadband-dia
wireless-mobility
voice-sip-ucaas-ccaas
wan-sdwan-mpls
saas-subscriptions
cloud-iaas-paas
ai-api-consumption
cybersecurity
merchant-processing
payment-gateways
solid-waste-recycling
hazardous-industrial-waste
medical-waste
uniforms-linen-mats
foodservice-distribution
```

## Legacy aliases

Create reviewed mappings for current duplicate labels, but do not force ambiguous multi-service vendors.

## Record-specific category

Ensure:

- `vendors.category_id` is only a primary/default catalog category.
- `organization_vendors.category_id` or equivalent can represent the service relationship.
- `invoices.expense_category_id` is authoritative for an invoice when set.
- Expenses and contracts can carry category IDs.
- Multi-service vendors can have different record/service categories.

## Migration safety

Create a new migration.

- Seed with `ON CONFLICT`.
- Preserve legacy strings during compatibility period.
- Add indexes for foreign keys.
- Add constraints only after audit.
- Record previous and new mappings.
- Queue ambiguous vendors for review.

## Safe and ambiguous examples

Safe:

```text
AWS -> cloud-iaas-paas
Microsoft Azure -> cloud-iaas-paas
Google Cloud -> cloud-iaas-paas
Microsoft 365 -> saas-subscriptions
Cintas -> uniforms-linen-mats
Sysco -> foodservice-distribution
Republic Services -> solid-waste-recycling
```

Review required:

```text
AT&T Business
Verizon Business
Microsoft
Toast
Direct Energy
multi-line insurance brokers
```

## APIs and UI

Return:

```text
categoryId
categoryKey
categoryName
parentCategory
categoryStatus
```

Add an ambiguity queue to Manage.

## Tests and proof

- Insurance parent and leaves exist.
- Duplicate strings map correctly.
- Ambiguous vendors are not auto-forced.
- Record-specific category overrides vendor primary category.
- Unknown remains available.
- RLS is tenant safe.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:integration:live
npm run build
```

## Definition of done

- Canonical taxonomy exists.
- Insurance and benefits are first-class.
- Duplicate labels have a migration path.
- Multi-service vendors are supported.
- Ambiguous mappings are queued.
- Code uses category IDs/keys.
- Migration is reproducible.

## Commit suggestion

```text
feat(taxonomy): seed canonical vendor markets and insurance categories
```


## Required completion report

Return:

1. Starting branch and commit
2. Ending branch and commit
3. Files changed
4. Database migrations applied, if any
5. Tests and exact pass/fail results
6. Screens or browser flows verified, if applicable
7. Any remaining blocker
8. A clear verdict: `PACKET COMPLETE` or `PACKET INCOMPLETE`

