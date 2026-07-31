# COSTIVRA
## Agentic Business Cost Intelligence and Recovery Platform

**Document type:** Founder blueprint, product requirements document, technical architecture, go-to-market plan, and Codex build specification  
**Prepared:** July 30, 2026  
**Working brand:** **Costivra**  
**Primary domain candidate:** `costivra.com`  
**Tagline:** **Every recurring cost, under command.**

---

# 1. Executive Summary

Costivra is an agentic business cost intelligence platform that helps small and midsized organizations discover, understand, reduce, and continuously monitor recurring operating expenses.

The product is not positioned as an energy brokerage, bill-audit shop, bookkeeping application, or generic AI chatbot. It is positioned as an **autonomous cost-control layer** for businesses.

A customer connects or uploads recurring business expenses such as:

- Electricity and natural-gas invoices
- Internet and telecom bills
- Merchant-processing statements
- Software subscriptions
- Waste and water bills
- Insurance documents
- Payroll and benefits invoices
- Equipment leases
- Vendor contracts
- Other recurring invoices and agreements

Costivra converts these documents into structured, auditable financial records. It then identifies:

- Unexpected price changes
- Duplicate or unnecessary charges
- Contract-renewal risks
- Unused subscriptions or services
- Billing inconsistencies
- Above-benchmark expenses
- Missing credits or discounts
- Opportunities requiring expert review
- Actions that can be completed automatically or with approval

The central product promise is:

> **Costivra finds where operating margin is leaking, shows the evidence, and helps the business take action.**

Energy savings are an important module, but they are not the entire company. Because the founder works for United Commercial Energy Partners, or UCEP, the energy module must be deliberately separated from independent analysis and presented as an optional referral or handoff pathway.

Costivra should detect that an energy account deserves professional review, organize the account information, explain why it was flagged, and give the customer a choice:

1. Export the review package to the customer’s existing advisor.
2. Send the package to UCEP through a clearly disclosed referral integration.
3. Save the opportunity without taking action.

This architecture protects customer trust and helps prevent Costivra from becoming a disguised lead funnel.

The long-term vision is larger than expense auditing:

> **Costivra becomes the autonomous operating-margin department for businesses that cannot justify hiring a large procurement, finance, and vendor-management team.**

---

# 2. Brand Recommendation

## 2.1 Recommended name: Costivra

**Costivra** is a coined brand name built around the ideas of cost visibility, vitality, intelligence, and recovery.

Suggested pronunciation:

> **kah-STEE-vruh** or **KOSS-tiv-ruh**

Recommended brand meaning:

- **Cost:** the business problem being managed
- **IV:** intelligence and visibility
- **Vra:** a distinctive ending that makes the name more ownable than a descriptive phrase

The name is broad enough to support electricity, telecom, software, insurance, payments, procurement, and future cash-flow products.

It does not lock the company into one industry, one expense category, or one AI feature.

## 2.2 Preliminary internet-use check

As of July 30, 2026, exact-match searches for the following produced no obvious indexed company, product, social-company profile, GitHub project, or trademark-index result:

- `Costivra`
- `costivra.com`
- `costivra.ai`
- `costivra.io`

This makes Costivra a strong candidate, but it is **not a guarantee** that the domain is currently registrable or that the mark is legally clear. Domain status can change instantly, and a complete trademark clearance requires more than a general internet search.

Before discussing the brand publicly:

1. Check `costivra.com` at a live registrar.
2. Purchase the `.com` first when available.
3. Consider also purchasing `costivra.ai`, `costivra.app`, and common misspellings.
4. Secure social handles.
5. Search the USPTO federal trademark database for exact and confusingly similar names.
6. Search relevant state trademark and business-name databases.
7. Have a trademark attorney perform a clearance search before investing heavily in branding.

The USPTO specifically recommends searching not only exact matches but also marks that look, sound, or feel confusingly similar, particularly when the goods and services are related.

## 2.3 Domain fallback order

Use this order only if the primary `.com` cannot be registered:

1. `costivra.com`
2. `costivra.ai`
3. `getcostivra.com`
4. `costivrahq.com`
5. `usecostivra.com`

Avoid building the main brand around a hyphenated domain.

## 2.4 Brand language

### Category

**Agentic business cost intelligence**

### One-line description

**Costivra finds, explains, and helps eliminate unnecessary recurring business costs.**

### Homepage headline

**Put every recurring business cost under intelligent control.**

### Homepage subheadline

**Connect bills, contracts, and vendor accounts. Costivra identifies margin leaks, renewal risks, and savings opportunities, then helps your team take action with evidence and approval controls.**

### Alternative performance-oriented headline

**Your operating margin is hiding inside your expenses.**

### Brand personality

- Intelligent, not robotic
- Financially serious, not intimidating
- Evidence-driven, not magical
- Proactive, not alarmist
- Premium, but understandable to a local business owner

---

# 3. The Problem

Most small and midsized businesses do not have a dedicated team continuously reviewing recurring operating expenses.

The responsibility is fragmented among owners, office managers, controllers, accountants, procurement staff, facility managers, and outside advisors. Each person may understand one fragment, while no one maintains a complete system of record.

Common failures include:

- Contracts renewing without sufficient review
- Services remaining active after employees or locations leave
- Pricing changing gradually without being noticed
- Bills not matching expected contract economics
- Duplicate vendors or subscriptions
- Different locations purchasing the same service independently
- Credits, rebates, exemptions, or discounts not being investigated
- Vendor communications living in scattered inboxes
- Decision-makers lacking benchmark data
- Owners learning about a contract deadline too late
- Savings recommendations being delivered in static spreadsheets and never implemented

Traditional software generally records what has already happened. Costivra is designed to identify what deserves attention next.

Traditional consultants may find opportunities, but their work is difficult to scale and often disappears into email threads and PDFs.

Generic AI can summarize documents, but it cannot be trusted to calculate savings, maintain a complete audit trail, enforce approval policies, or prove that a recommendation produced a real result.

Costivra combines:

- Structured financial data
- Deterministic calculations
- Document intelligence
- Agentic workflow automation
- Approval controls
- Expert referrals
- Continuous monitoring
- Verified outcomes

---

# 4. Product Thesis

## 4.1 Core thesis

Businesses will pay for an intelligent system that reliably finds more money than it costs.

The product should not sell “AI.” It should sell:

- Visibility
- Margin improvement
- Deadline protection
- Vendor accountability
- Financial evidence
- Completed actions

## 4.2 The essential product loop

Every successful Costivra workflow follows the same loop:

1. **Connect** a source such as a document, inbox, accounting platform, vendor portal, or bank-feed export.
2. **Extract** structured facts from the source.
3. **Verify** those facts with deterministic checks and human review when confidence is insufficient.
4. **Detect** a potential cost leak, risk, or opportunity.
5. **Explain** the evidence in plain language.
6. **Recommend** a bounded action.
7. **Approve** the action according to customer policy.
8. **Execute** the action directly or hand it to an authorized expert.
9. **Track** the result.
10. **Verify** actual savings or recovery.
11. **Learn** from the outcome without exposing confidential customer data.

## 4.3 Product doctrine

Costivra must follow this operating principle:

> **AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.**

An LLM should never be the sole authority for:

- Financial calculations
- Contract deadlines
- Tax eligibility
- Legal interpretation
- Vendor selection
- Payment-instruction changes
- Sending external communications
- Declaring verified savings

---

# 5. Conflict-Safe Relationship With UCEP

## 5.1 The risk

Because the founder works for United Commercial Energy Partners, several possible conflicts must be addressed before development or commercialization:

- Employment-agreement ownership provisions
- Invention-assignment clauses
- Confidentiality obligations
- Non-solicitation provisions
- Outside-business restrictions
- Use of employer equipment, accounts, data, time, or intellectual property
- Ownership of customer relationships and leads
- Whether referral compensation is permitted
- Whether Costivra could be viewed as competing with UCEP
- Whether recommendations are presented as independent while benefiting UCEP

This document is not legal advice. The founder should have an employment or intellectual-property attorney review the employment agreement and proposed company structure before using employer information, soliciting customers, or launching publicly.

## 5.2 Recommended structural boundary

Costivra should remain an independent **cost intelligence and workflow platform**.

The energy module should perform these functions:

- Parse energy invoices and agreements
- Normalize account and contract data
- Detect renewal dates and notice periods
- Calculate effective historical costs
- Detect billing anomalies
- Identify incomplete information
- Flag accounts that may benefit from professional review
- Produce an evidence package
- Monitor future bills and deadlines

The energy module should not independently:

- Claim to be an energy broker
- Present supplier quotes without an authorized brokerage relationship
- Represent that Costivra is neutral if it receives undisclosed compensation
- Guarantee savings
- Select a supplier based on hidden compensation
- Use UCEP pricing, customer, supplier, or operational data without permission
- Automatically send a lead to UCEP without customer consent

## 5.3 The energy fork

When an energy opportunity is detected, Costivra creates an **Energy Review Case**.

The customer sees:

### Why this account was flagged

- Agreement expiration is approaching
- Billing rate differs from expected rate
- Account lacks a clear agreement record
- Multiple locations may not be aligned
- Charges or taxes deserve review
- Usage or demand changed materially
- Contract structure may not match operational needs

### Evidence

- Source invoice pages
- Source agreement pages
- Extracted fields
- Calculations
- Confidence levels
- Missing data

### Available actions

1. **Export review package**  
   Download or email the package to the customer’s current advisor.

2. **Request a UCEP review**  
   Send the package to UCEP after explicit consent and disclosure.

3. **Assign another advisor**  
   Invite a different professional selected by the customer.

4. **Remind me later**  
   Save the case and schedule follow-up.

## 5.4 Required UCEP disclosure

A clear disclosure should appear before the customer submits a referral:

> **Costivra has a business relationship with United Commercial Energy Partners. If you choose to request a UCEP review, Costivra or its affiliates may receive compensation or another business benefit. You are not required to use UCEP and may export your information to another advisor.**

The exact language should be reviewed by counsel.

The FTC states that material connections that could affect the weight or credibility of an endorsement should be clearly disclosed. Costivra should treat transparency as a product feature rather than legal fine print.

## 5.5 Preferred ownership structures

Possible structures, from cleanest to riskiest:

### Structure A: Written employer carve-out

UCEP acknowledges in writing that Costivra is an independently owned software company, defines permitted activities, and agrees on how energy referrals will work.

This is the preferred structure.

### Structure B: Licensed software relationship

Costivra owns the platform and licenses an energy workflow or lead-intake module to UCEP. UCEP pays a platform fee, referral fee, or revenue share under a written agreement.

### Structure C: UCEP incubation or joint venture

Costivra is developed with UCEP as a formal partner or owner. This can provide data, distribution, and industry support, but reduces founder independence and requires precise ownership terms.

### Structure D: Unapproved side project

The founder builds and commercializes Costivra without written clarity while using knowledge, equipment, data, work time, or contacts connected to UCEP.

This structure should be avoided.

## 5.6 Data separation

Costivra and UCEP should have distinct:

- User accounts
- Databases or tenant boundaries
- Storage buckets
- API credentials
- Audit logs
- Access roles
- Customer consent records
- Privacy policies
- Terms of service
- Referral records

UCEP should receive only the information authorized by the customer for that specific review.

---

# 6. Initial Market and Ideal Customer

## 6.1 Initial customer profile

Costivra should initially serve U.S. businesses with:

- 5 to 250 employees
- $1 million to $100 million in annual revenue
- Multiple recurring vendors
- One to fifty physical locations
- No large internal procurement department
- A controller, owner, CFO, office manager, or operations leader responsible for expenses

## 6.2 Best first verticals

The founder already understands several verticals that commonly have multiple locations, material utility spend, and fragmented recurring costs:

1. Hotels and hospitality groups
2. Car washes
3. Assisted-living operators
4. Restaurants and food-service groups
5. Gyms and fitness chains
6. Manufacturers
7. Private schools and educational organizations
8. Churches and nonprofits
9. Property-management companies
10. Multi-location retail

## 6.3 Initial expense categories

The first release should not attempt to master every expense category.

Recommended order:

### Category 1: Software subscriptions

Why first:

- Easier to understand
- Easy to explain in marketing
- Common duplicated and unused licenses
- Lower regulatory complexity
- Can produce quick wins

### Category 2: Telecom and internet

Why second:

- Recurring contracts
- Multiple services and locations
- Price increases and inactive lines are common
- Strong document-driven workflow

### Category 3: Commercial energy review

Why third:

- Strong founder expertise
- High-value opportunities
- UCEP can become the optional execution partner
- Requires the strictest conflict and disclosure controls

### Category 4: Merchant processing

Why later:

- High value
- Statements can be difficult to normalize
- Pricing structures vary
- Requires careful comparison logic

### Category 5: Waste, water, insurance, payroll, and equipment leases

Add only after repeatable workflows are proven.

---

# 7. Product Surfaces

## 7.1 Public marketing site

Primary goals:

- Explain the problem
- Generate document uploads
- Capture vertical-specific search traffic
- Build trust
- Publish evidence-driven content
- Convert prospects into a free Cost Leak Scan

Required pages:

- Homepage
- Product overview
- Expense categories
- Industry pages
- Security page
- How it works
- Pricing
- Case studies
- Cost Leak Scan landing page
- UCEP relationship disclosure
- Privacy policy
- Terms of service

## 7.2 Customer application

Primary navigation:

- Command Center
- Expenses
- Opportunities
- Contracts
- Documents
- Actions
- Savings
- Vendors
- Integrations
- Reports
- Team and Approvals
- Settings

## 7.3 Command Center

The dashboard should answer five questions immediately:

1. How much recurring spend is currently monitored?
2. How much potential savings is under review?
3. How much verified value has been created?
4. Which deadlines or risks require attention?
5. Which actions are waiting for approval?

Recommended widgets:

- Monitored annual spend
- Potential annual savings
- Verified annual savings
- Recovered credits
- Contracts renewing in 30, 60, 90, and 180 days
- Open action queue
- Expense changes this month
- Vendor concentration
- Data coverage score
- Recent agent activity

## 7.4 Expense detail page

Each expense account should show:

- Vendor
- Category
- Locations
- Current monthly and annualized cost
- Historical trend
- Contract status
- Renewal and notice dates
- Source documents
- Extracted terms
- Active opportunities
- Completed actions
- Savings history
- Confidence and data quality

## 7.5 Opportunity page

Each opportunity is a structured case, not a chat message.

Required fields:

- Opportunity title
- Category
- Status
- Severity
- Estimated value
- Verified value
- Confidence
- Evidence
- Calculation method
- Assumptions
- Missing information
- Recommended action
- Required approval
- Assigned owner
- External partner, when applicable
- Timeline
- Audit history

## 7.6 Approval Center

Customers define policies such as:

- Actions under $100 may be auto-approved
- External emails always require approval
- Contract cancellation always requires two approvers
- Vendor changes require CFO approval
- Energy referrals require explicit account-owner consent
- No bank or payment details may be changed automatically

## 7.7 Ask Costivra

A conversational interface can help users explore information, but chat is not the system of record.

Examples:

- “Which expenses increased more than 10% this quarter?”
- “Show every contract renewing before December.”
- “Why was this energy account flagged?”
- “Which locations still pay for disconnected phone lines?”
- “Draft a request for a corrected invoice.”
- “What savings have actually been verified?”

The chat must cite internal records and source documents.

---

# 8. Agent Architecture

## 8.1 Design principle

Do not build one enormous agent with unrestricted access.

Build specialized agents with narrow tools, typed inputs, typed outputs, explicit permissions, and deterministic workflow control.

The workflow engine should control process state. Agents should perform bounded interpretation and planning inside that process.

## 8.2 Agent roster

### 1. Intake Agent

Responsibilities:

- Identify document type
- Identify business, vendor, account, and location
- Detect missing pages
- Detect unreadable files
- Request missing information

Output:

- Typed intake classification
- Proposed entity links
- Data-quality score
- Required follow-up list

### 2. Document Extraction Agent

Responsibilities:

- Extract invoice fields
- Extract contract fields
- Return source coordinates or page references
- Assign confidence per field

Rules:

- Must use structured output
- Must never calculate savings
- Must never silently invent missing values
- Must preserve original text snippets for evidence

### 3. Normalization Agent

Responsibilities:

- Map vendor-specific terminology into Costivra’s canonical schema
- Normalize dates, units, fees, rates, contract terms, and locations
- Suggest duplicate entities

### 4. Data Quality Agent

Responsibilities:

- Detect contradictions
- Compare extracted values with totals
- Check whether invoice arithmetic reconciles
- Flag uncertain or incomplete data
- Route records for human review

### 5. Opportunity Detection Agent

Responsibilities:

- Select applicable deterministic rules
- Interpret unusual patterns
- Propose opportunity hypotheses
- Explain why a case deserves investigation

The agent proposes. Deterministic code computes values and validates thresholds.

### 6. Contract Intelligence Agent

Responsibilities:

- Extract renewal terms
- Extract notice windows
- Identify add-delete provisions
- Identify pricing-adjustment language
- Identify termination language
- Identify ambiguous clauses requiring professional review

It must never present its output as legal advice.

### 7. Benchmark Agent

Responsibilities:

- Select valid peer groups
- Compare a customer only against appropriately anonymized and aggregated data
- Explain sample size and limitations
- Avoid revealing another customer’s information

### 8. Action Planner Agent

Responsibilities:

- Convert a verified opportunity into a step-by-step plan
- Select approved tools
- Determine required approvals
- Draft customer-facing and vendor-facing communications

### 9. Execution Agent

Responsibilities:

- Perform only approved actions
- Send authorized emails
- Create tasks
- Generate packages
- Update workflow state
- Record every external side effect

### 10. Referral Router Agent

Responsibilities:

- Determine whether expert involvement is required
- Present available partner choices
- Verify disclosure and consent
- Send only authorized records

For energy, UCEP is one optional destination.

### 11. Savings Verification Agent

Responsibilities:

- Compare baseline and post-action periods
- Locate credits or corrected charges
- Apply the approved verification methodology
- Separate one-time recovery from recurring savings
- Flag confounding changes

Final financial amounts must be calculated by deterministic code.

### 12. Compliance and Policy Agent

Responsibilities:

- Check whether an action violates tenant policy
- Check disclosure requirements
- Detect prohibited data sharing
- Require escalation for sensitive actions

## 8.3 Agent permission model

Every agent receives:

- A unique service identity
- A limited tool allowlist
- Tenant scope
- Resource scope
- Maximum financial authority
- Maximum communication authority
- Timeout and retry limits
- Trace ID
- Human escalation conditions

No agent receives unrestricted database access.

## 8.4 Human-in-the-loop thresholds

Require human review when:

- Extraction confidence is below threshold
- Invoice totals do not reconcile
- Contract language is ambiguous
- Estimated annual value exceeds a configured amount
- A recommendation changes a vendor
- An action sends external communication
- An action creates a referral
- An action could cancel service
- Tax, legal, insurance, or regulatory interpretation is involved
- Bank or payment instructions are implicated

---

# 9. Technical Stack

## 9.1 Is React and Tailwind top of the line?

Yes. React and Tailwind remain a strong modern choice for this product.

As of July 30, 2026:

- React documentation lists React 19.2 as the latest major/minor documentation line.
- Next.js documentation lists 16.2.12 as the latest version.
- Tailwind CSS 4 is the current major version for modern browsers.
- TypeScript 6.0 documentation was published in July 2026.

There is no magical “higher” language that automatically makes the product better. The over-the-top advantage comes from architecture, type safety, durable workflows, security, test coverage, data quality, and product design.

## 9.2 Recommended production stack

### Core language

**TypeScript 6.x**

Use TypeScript across the web application, API layer, shared schemas, workflow workers, agent tools, and tests.

Why:

- Strong end-to-end typing
- Excellent React ecosystem
- Shared schemas between frontend and backend
- Strong support for AI SDKs and workflow systems
- Easier agentic coding because the repository has one primary language

### Optional specialist language

**Python 3.13+**, only where it provides a clear advantage.

Potential uses:

- Advanced document-processing experiments
- Data science
- Custom OCR pipelines
- Statistical benchmarking
- Offline evaluation notebooks

Do not split the production system into TypeScript and Python simply to appear sophisticated. Begin TypeScript-first.

### Web framework

**Next.js 16 App Router**

Use:

- React Server Components where appropriate
- Server Actions for bounded mutations
- Route Handlers for integrations and webhooks
- Streaming for agent interfaces
- Strong separation between server-only and client code

### UI

- React 19.2
- Tailwind CSS 4
- shadcn/ui as a composable component foundation
- Radix primitives when needed
- React Aria for complex accessibility-sensitive interactions when appropriate
- Recharts, Visx, or a similar charting library for dashboards

Avoid filling the product with generic dashboard cards. The interface should emphasize evidence, action status, deadlines, and financial outcomes.

### Monorepo and package management

- `pnpm`
- Turborepo

Suggested repository layout:

```text
costivra/
├── apps/
│   ├── web/                 # Next.js customer and admin application
│   ├── worker/              # Temporal workers and background execution
│   └── docs/                # Product and developer documentation
├── packages/
│   ├── ai/                  # Agents, prompts, tools, model adapters
│   ├── database/            # Schema, migrations, repositories
│   ├── domain/              # Core entities, policies, calculations
│   ├── documents/           # Parsing, extraction, evidence coordinates
│   ├── workflows/           # Workflow definitions and activities
│   ├── integrations/        # Email, accounting, storage, partner adapters
│   ├── security/            # Authorization, encryption helpers, audit tools
│   ├── ui/                  # Shared design system
│   ├── observability/       # Logs, traces, metrics
│   ├── testing/             # Fixtures, factories, eval harnesses
│   └── config/              # ESLint, TypeScript, Tailwind configs
├── infra/
│   ├── supabase/
│   ├── temporal/
│   └── deployment/
├── scripts/
└── docs/
```

### Database

**PostgreSQL through Supabase**

Supabase provides a full PostgreSQL database plus authentication, storage, APIs, realtime capabilities, and edge functions.

Use:

- PostgreSQL as the system of record
- Row Level Security for tenant isolation
- Supabase Auth initially
- Supabase Storage for documents with private buckets
- Signed URLs with short expirations
- `pgvector` only for retrieval use cases that genuinely require embeddings

Do not store critical financial facts only in vectors. All material fields belong in normalized relational tables.

### Database access

Recommended:

- Drizzle ORM for typed queries and migrations, or
- A thin repository layer over Supabase/Postgres

Avoid allowing agents to generate and execute arbitrary SQL.

### Workflow orchestration

**Temporal Cloud with the TypeScript SDK**

Temporal is recommended because many Costivra processes may last days or months:

- Waiting for customer approval
- Waiting for a vendor response
- Waiting for a new invoice
- Monitoring a renewal deadline
- Retrying an integration
- Verifying a future credit

Temporal workflows are durable and can resume after failures. This is materially better than chaining ad hoc background jobs for important financial workflows.

MVP compromise:

- The first prototype can use a simpler queue.
- The domain interfaces should still be designed so Temporal can replace it cleanly.
- For a serious production build, adopt Temporal before external action workflows become complex.

### AI application layer

Recommended split:

1. **OpenAI Responses API** for model calls, structured extraction, and tools.
2. **Vercel AI SDK** for streaming UI, typed agent interactions, and provider abstraction.
3. **Structured Outputs** for every extraction and tool-call contract.
4. **Temporal** for durable business process orchestration.

Do not confuse an AI agent loop with a business workflow engine.

### Agent pattern

Use a typed tool-loop agent pattern for bounded reasoning tasks.

Each agent must have:

- Versioned instructions
- Zod or JSON Schema input
- Zod or JSON Schema output
- Tool definitions
- Maximum steps
- Token budget
- Timeout
- Retry policy
- Trace metadata
- Evaluation dataset

### Document intelligence

Pipeline:

1. Virus scan and validate file
2. Store original privately
3. Detect file type
4. Extract native text where available
5. Render pages for visual interpretation when needed
6. Use multimodal structured extraction
7. Save field-level evidence references
8. Reconcile totals with deterministic code
9. Route low-confidence fields to review
10. Version every extraction result

Never overwrite the original extraction. New runs create new versions.

### Authentication and identity

MVP:

- Supabase Auth
- Email magic links or passkeys
- Organization accounts
- Role-based access

Later enterprise features:

- SAML SSO
- SCIM
- Fine-grained custom roles
- Domain verification
- Session policies

### Payments

- Stripe Billing for subscriptions
- Stripe invoicing for approved performance fees

Do not automatically debit a performance fee until the customer has accepted the verification method and result.

### Email integration

Start with:

- Gmail OAuth
- Microsoft Graph OAuth

Use minimal scopes.

Separate:

- Read-only invoice discovery
- Draft creation
- Sending authorization

A customer should be able to allow drafts without allowing autonomous sending.

### Observability

Use:

- OpenTelemetry
- Sentry
- Structured application logs
- Agent traces
- Workflow histories
- Cost-per-agent-run metrics
- Model latency and failure metrics
- Extraction and evaluation dashboards

### Deployment

Recommended:

- Vercel for the Next.js application
- Supabase for Postgres, Auth, and Storage
- Temporal Cloud for workflows
- Managed worker deployment on Vercel Functions where compatible, or containerized workers on a service suited to long-running processes
- Cloudflare for DNS, WAF, and rate limiting when appropriate

Long-running Temporal workers should not be forced into short-lived serverless execution environments.

### Testing

- Vitest for unit tests
- Playwright for end-to-end browser tests
- Testcontainers for integration tests where useful
- Contract tests for external integrations
- Golden-document extraction tests
- Property-based tests for financial calculations
- Prompt and agent evaluation suites

### Code quality

- Strict TypeScript configuration
- ESLint
- Prettier or Biome
- Conventional commits
- Changesets when packages need versioning
- GitHub Actions
- Required typecheck, lint, unit, integration, and E2E gates

---

# 10. Data Model

## 10.1 Core tenancy

### `organizations`

- `id`
- `name`
- `legal_name`
- `industry`
- `employee_count_range`
- `annual_revenue_range`
- `timezone`
- `currency`
- `created_at`

### `users`

- `id`
- `email`
- `name`
- `status`
- `created_at`

### `organization_memberships`

- `organization_id`
- `user_id`
- `role`
- `permissions`
- `created_at`

### `locations`

- `id`
- `organization_id`
- `name`
- `address`
- `status`
- `opened_at`
- `closed_at`

## 10.2 Vendor and expense records

### `vendors`

- `id`
- `canonical_name`
- `category`
- `website`
- `support_channels`

### `organization_vendors`

- `id`
- `organization_id`
- `vendor_id`
- `account_owner_user_id`
- `relationship_status`
- `annualized_spend`

### `expense_accounts`

- `id`
- `organization_id`
- `organization_vendor_id`
- `location_id`
- `category`
- `external_account_number_encrypted`
- `status`
- `service_start_date`
- `service_end_date`

### `invoices`

- `id`
- `expense_account_id`
- `invoice_number`
- `invoice_date`
- `service_period_start`
- `service_period_end`
- `due_date`
- `subtotal`
- `tax`
- `total`
- `currency`
- `document_id`
- `extraction_version_id`
- `reconciliation_status`

### `invoice_line_items`

- `id`
- `invoice_id`
- `canonical_type`
- `vendor_description`
- `quantity`
- `unit`
- `rate`
- `amount`
- `evidence_reference_id`

## 10.3 Contract records

### `contracts`

- `id`
- `organization_vendor_id`
- `title`
- `effective_date`
- `expiration_date`
- `auto_renewal`
- `notice_deadline`
- `termination_summary`
- `document_id`
- `status`

### `contract_terms`

- `id`
- `contract_id`
- `term_type`
- `normalized_value`
- `source_text`
- `confidence`
- `evidence_reference_id`
- `review_status`

## 10.4 Documents and evidence

### `documents`

- `id`
- `organization_id`
- `storage_path`
- `original_filename`
- `mime_type`
- `sha256`
- `page_count`
- `status`
- `uploaded_by`
- `created_at`

### `document_extraction_versions`

- `id`
- `document_id`
- `extractor_version`
- `model_provider`
- `model_identifier`
- `schema_version`
- `status`
- `created_at`

### `evidence_references`

- `id`
- `document_id`
- `page_number`
- `bounding_box`
- `text_excerpt`
- `field_path`

## 10.5 Opportunities and actions

### `opportunities`

- `id`
- `organization_id`
- `expense_account_id`
- `type`
- `title`
- `summary`
- `status`
- `confidence`
- `estimated_one_time_value`
- `estimated_annual_value`
- `currency`
- `calculation_version`
- `assigned_to`
- `created_at`

### `opportunity_evidence`

- `opportunity_id`
- `evidence_reference_id`
- `role`

### `action_plans`

- `id`
- `opportunity_id`
- `status`
- `required_approval_policy_id`
- `plan_version`
- `created_at`

### `action_steps`

- `id`
- `action_plan_id`
- `type`
- `sequence`
- `status`
- `tool_name`
- `input_payload`
- `output_payload`
- `external_side_effect_id`

### `approvals`

- `id`
- `resource_type`
- `resource_id`
- `requested_from`
- `decision`
- `decision_reason`
- `decided_at`

## 10.6 Referrals

### `partners`

- `id`
- `name`
- `category`
- `relationship_type`
- `disclosure_text_version`
- `status`

### `referral_consents`

- `id`
- `organization_id`
- `partner_id`
- `opportunity_id`
- `disclosure_version`
- `consented_by`
- `consented_at`
- `data_scope`

### `referrals`

- `id`
- `partner_id`
- `opportunity_id`
- `consent_id`
- `status`
- `sent_at`
- `partner_reference`

UCEP should be represented as a partner record, not embedded invisibly in the energy logic.

## 10.7 Savings verification

### `baselines`

- `id`
- `opportunity_id`
- `methodology`
- `period_start`
- `period_end`
- `normalized_amount`
- `assumptions`
- `approved_by_customer_at`

### `verified_outcomes`

- `id`
- `opportunity_id`
- `one_time_recovery`
- `recurring_annual_savings`
- `verification_period`
- `methodology_version`
- `verification_status`
- `approved_at`

### `fees`

- `id`
- `verified_outcome_id`
- `fee_type`
- `rate`
- `amount`
- `status`

## 10.8 Auditability

### `audit_events`

- `id`
- `organization_id`
- `actor_type`
- `actor_id`
- `action`
- `resource_type`
- `resource_id`
- `before_hash`
- `after_hash`
- `trace_id`
- `created_at`

### `external_side_effects`

- `id`
- `organization_id`
- `type`
- `destination`
- `idempotency_key`
- `request_hash`
- `status`
- `created_at`

---

# 11. Deterministic Rules Engine

The rules engine is essential because Costivra cannot rely on generative interpretation alone.

Rules should be:

- Versioned
- Testable
- Explainable
- Category-specific
- Configurable by jurisdiction and vendor type
- Linked to evidence requirements

Example rules:

## Subscription rules

- Same product appears on multiple cards or invoices
- User count exceeds active employee count
- License cost increased more than configured threshold
- Product has not been accessed within a defined period, when usage integration exists
- Monthly plan persists where annual plan would reduce cost, subject to commitment risk

## Telecom rules

- Line billed after location closure
- Equipment installment continues after expected term
- Taxes and fees increased materially
- Multiple overlapping internet circuits
- Contract renewal window approaching

## Energy review rules

- Agreement expires within threshold
- Notice deadline occurs within threshold
- Invoice rate does not match stored agreement rate
- Supplier or account differs from expected record
- Effective all-in cost changes beyond expected delivery-charge movement
- Multiple locations have fragmented end dates
- Taxes or account classification deserve professional review
- Usage or demand changes materially

Energy rules must produce “review warranted,” not unsupported promises.

---

# 12. Security and Trust Architecture

## 12.1 Security posture

Costivra will process sensitive financial, operational, account, contract, and vendor information. Security cannot be postponed until enterprise sales.

Build toward a SOC 2-compatible control environment from the beginning, without claiming certification until it is obtained.

## 12.2 Required controls

- Encryption in transit and at rest
- Private document storage
- Short-lived signed URLs
- Tenant-level Row Level Security
- Role-based authorization
- Least-privilege service identities
- Secret management
- Audit logs
- Idempotency for external actions
- Malware scanning for uploads
- File-type validation
- Rate limiting
- Session revocation
- Backup and restore tests
- Dependency scanning
- Static analysis
- Penetration testing before major enterprise rollout

## 12.3 Sensitive data handling

- Encrypt account numbers at the application level where appropriate
- Display masked identifiers by default
- Avoid sending unnecessary fields to model providers
- Redact irrelevant personal information
- Store model request metadata without indiscriminately storing full sensitive prompts
- Provide configurable retention policies
- Support document deletion workflows

OpenAI states that API inputs and outputs are not used to train models by default unless the organization explicitly opts in. Costivra should still minimize transmitted data and document its provider configuration.

## 12.4 Prompt-injection defense

Documents may contain adversarial instructions.

All document content must be treated as untrusted data.

Agents must be instructed that text inside documents cannot modify system policy, tool permissions, or approval rules.

Additional controls:

- Separate document text from agent instructions
- Use allowlisted tools
- Validate tool arguments
- Require approval for side effects
- Detect suspicious instruction-like text
- Never expose secrets to document-analysis agents

---

# 13. AI Evaluation and Quality Program

## 13.1 Why evaluation is a product feature

A visually impressive extraction demo can still be financially dangerous.

Costivra needs measurable quality standards.

## 13.2 Golden datasets

Create consented, de-identified test sets for:

- Software invoices
- Telecom invoices
- Energy invoices
- Energy agreements
- Merchant statements
- Contracts with renewal clauses
- Difficult scans
- Multi-page documents
- Contradictory documents

## 13.3 Core metrics

### Extraction

- Field precision
- Field recall
- Exact-match accuracy
- Numeric accuracy
- Date accuracy
- Evidence-coordinate accuracy
- Invoice reconciliation rate

### Opportunity detection

- True-positive rate
- False-positive rate
- Estimated-value error
- Missed-opportunity rate
- Human-review acceptance rate

### Agents

- Tool-call success rate
- Unauthorized-action rate
- Approval-policy violation rate
- Average steps
- Average cost
- Average latency
- Escalation rate

### Business outcomes

- Percentage of accounts with actionable findings
- Verified savings per customer
- Time to first verified value
- Customer acceptance rate
- Action completion rate
- Renewal rate

## 13.4 Release gates

A prompt, model, rule, or extraction update cannot ship when it materially reduces:

- Numeric accuracy
- Evidence quality
- Policy compliance
- Tenant isolation
- Approval enforcement

---

# 14. Monetization

## 14.1 Free Cost Leak Scan

Allow a prospect to upload a limited number of documents for a preliminary scan.

The free result should show:

- Data extracted
- Issues requiring review
- Potential opportunities
- Confidence and limitations
- What Costivra can monitor continuously

Do not expose the complete workflow without signup.

## 14.2 Subscription pricing concept

### Starter

- One business
- Limited locations
- Limited monitored spend categories
- Contract reminders
- Monthly monitoring

Possible range: **$99 to $199 per month**

### Growth

- Multiple locations
- More integrations
- Approval workflows
- Team access
- Weekly monitoring
- Advanced reports

Possible range: **$399 to $999 per month**

### Enterprise

- SSO
- Custom policies
- Custom integrations
- Data retention controls
- Dedicated support
- Partner workflows

Custom pricing.

## 14.3 Performance fees

For categories where Costivra directly produces verified recovery or savings, consider a fee tied to verified value.

Examples:

- Percentage of recovered credits
- Percentage of first-year recurring savings
- Fixed success fee

The methodology must be agreed upon before charging.

## 14.4 Referral revenue

Costivra may receive disclosed referral revenue from expert partners.

For UCEP referrals:

- Use a written agreement
- Disclose the relationship
- Obtain customer consent
- Avoid ranking UCEP through hidden compensation
- Track referral outcomes separately from independent product recommendations

## 14.5 Data products

Long-term, Costivra can create anonymized and aggregated benchmarks.

Potential products:

- Industry Cost Leak Index
- Vendor price-change benchmarks
- Contract-renewal benchmarks
- Expense ratios by vertical
- Regional operating-cost trends

Never sell identifiable customer data.

---

# 15. Go-to-Market Strategy

## 15.1 Initial offer

> **Upload three recurring bills. Costivra will show which ones deserve attention and why.**

Alternative energy-aware offer:

> **Upload your recurring business expenses. We will identify cost increases, renewal risks, and accounts that deserve expert review.**

## 15.2 Advertising funnel

### Search ads

Target high-intent problems:

- Business expense audit
- Find duplicate subscriptions
- Reduce recurring business expenses
- Telecom bill audit
- Commercial contract renewal tracker
- Commercial electricity bill review
- Multi-location expense management

### Paid social

Use short, concrete demonstrations:

- “This company paid for 14 licenses used by 6 people.”
- “This contract required notice 90 days before renewal.”
- “One location was still paying for a disconnected line.”
- “The invoice total was correct, but the agreement date was not.”

Do not make unsupported savings claims.

## 15.3 Content engine

Content pillars:

1. **Bill teardowns**
2. **Contract clause explanations**
3. **Cost benchmarks**
4. **Renewal deadline education**
5. **Multi-location cost mistakes**
6. **Before-and-after case studies**
7. **Founder-led build-in-public content**
8. **Industry-specific cost guides**

## 15.4 Free tools

Build public calculators and scanners:

- Recurring Cost Leak Checklist
- Contract Renewal Countdown
- Effective Electricity Cost Calculator
- Software License Waste Calculator
- Telecom Line Inventory Template
- Multi-Location Expense Consolidation Score
- Merchant Fee Effective Rate Calculator

Each tool should feed the Cost Leak Scan funnel.

## 15.5 Founder-led sales

The founder’s sales ability is a major advantage.

Initial outreach:

- Existing professional network, subject to employment restrictions
- Business-owner communities
- Controllers and CFOs
- Multi-location operators
- Accountants and fractional CFOs
- Managed service providers
- Commercial real-estate managers

Do not use UCEP customer lists, employer systems, or confidential data without written authorization.

## 15.6 Channel partners

Potential future partners:

- Accounting firms
- Fractional CFOs
- Bookkeepers
- Managed service providers
- Insurance brokers
- Telecom consultants
- Energy advisors
- Commercial lenders

Partners can use Costivra as the intelligence layer while retaining their specialty role.

---

# 16. MVP Definition

## 16.1 MVP objective

Prove that a business will upload documents, understand the evidence, approve an action, and receive measurable value.

## 16.2 MVP scope

Build:

- Authentication
- Organization and location setup
- Private document upload
- Invoice and contract classification
- Structured extraction
- Evidence viewer
- Expense accounts
- Contract and renewal tracking
- Opportunity cases
- Approval workflow
- Software subscription rules
- Telecom rules
- Energy review flag
- UCEP referral consent workflow
- Savings verification record
- Basic dashboard
- Admin review console

Do not build initially:

- Fully autonomous vendor negotiation
- Every accounting integration
- Mobile apps
- Complex marketplace bidding
- Insurance recommendation engine
- Automatic contract cancellation
- Customer fund custody
- International tax logic
- Hundreds of expense categories

## 16.3 Concierge layer

The MVP should include a manual operations console.

When automation is uncertain, a trusted human can:

- Correct extracted fields
- Approve opportunity creation
- Adjust classifications
- Request documents
- Verify calculations
- Prepare actions

This is not failure. It is how the data and workflow moat is built.

## 16.4 MVP success criteria

Within the first 25 pilot businesses:

- At least 70% complete document upload
- At least 60% receive one credible opportunity or risk finding
- At least 30% approve an action or expert review
- At least 10 customers achieve verified value
- Median time to first finding is under ten minutes for supported documents
- No unauthorized external actions
- Every material claim includes evidence

---

# 17. Twelve-Week Build Plan

## Weeks 1–2: Foundation

- Secure name and domain
- Obtain written clarity concerning UCEP and employment obligations
- Create monorepo
- Configure CI
- Establish database and RLS
- Build authentication and organizations
- Create document upload and storage
- Define canonical schemas
- Create design system

## Weeks 3–4: Document intelligence

- Document classification
- Native text extraction
- Page rendering
- Structured invoice extraction
- Structured contract extraction
- Evidence coordinates
- Confidence scoring
- Admin correction interface
- Reconciliation checks

## Weeks 5–6: Expense and opportunity model

- Vendor and expense accounts
- Invoice history
- Contract tracking
- Rules engine
- Opportunity case creation
- Evidence viewer
- Data quality queue

## Weeks 7–8: Actions and approvals

- Action plans
- Approval policies
- Email draft generation
- Audit logs
- External side-effect ledger
- Customer notifications

## Weeks 9–10: Energy fork and UCEP integration

- Energy-specific schema
- Review-warranted rules
- Energy review package
- Disclosure screen
- Consent record
- UCEP adapter
- Export-to-other-advisor option
- Referral status tracking

## Weeks 11–12: Pilot and hardening

- Pilot onboarding
- Extraction benchmark
- Prompt evaluations
- Security review
- E2E tests
- Performance tuning
- Pricing experiments
- Analytics
- Landing pages
- Initial content

---

# 18. Product Roadmap

## Phase 1: Detect

- Documents
- Expenses
- Contracts
- Opportunities
- Evidence
- Renewal alerts

## Phase 2: Act

- Approval workflows
- Email drafts
- Expert referrals
- Vendor inquiries
- Task tracking

## Phase 3: Verify

- Baselines
- Post-action comparisons
- Credit detection
- Savings ledger
- Performance fees

## Phase 4: Connect

- Gmail
- Microsoft 365
- QuickBooks
- Xero
- Stripe
- Vendor portals
- Procurement systems

## Phase 5: Benchmark

- Industry cohorts
- Location cohorts
- Vendor benchmarks
- Contract benchmarks
- Cost Leak Index

## Phase 6: Autonomous margin operations

- Policy-controlled recurring actions
- Vendor renewal playbooks
- Continuous procurement workflows
- Multi-category optimization
- Working-capital and payment intelligence

---

# 19. Competitive Moat

The interface is not the moat. The model is not the moat.

Costivra’s defensibility should grow from:

1. A normalized database of recurring business expenses
2. Field-level evidence linking structured facts to original documents
3. Category-specific rules and workflows
4. Verified before-and-after outcomes
5. Partner execution network
6. Customer approval policies
7. Longitudinal contract and price history
8. Industry benchmark cohorts
9. A large library of difficult document formats
10. Trust earned through transparent recommendations

The most valuable dataset is not “what invoices say.”

It is:

> **Which patterns produced a real opportunity, which actions worked, and how much verified value resulted.**

---

# 20. Risks and Mitigations

## Risk: Conflict with UCEP

Mitigation:

- Written employer carve-out
- Separate ownership and data
- Transparent referral path
- No employer resources without authorization

## Risk: The product appears biased

Mitigation:

- Customer choice
- Clear disclosure
- Export to any advisor
- Separate detection from partner ranking

## Risk: AI fabricates findings

Mitigation:

- Structured outputs
- Evidence requirements
- Deterministic calculations
- Confidence thresholds
- Human review

## Risk: Security breach

Mitigation:

- Least privilege
- RLS
- encryption
- audit logs
- security testing
- data minimization

## Risk: Too broad too early

Mitigation:

- Three initial categories
- Manual operations layer
- Rule libraries added incrementally

## Risk: Ads attract low-value customers

Mitigation:

- Qualify by spend, locations, and document coverage
- Vertical landing pages
- Measure verified value per acquired customer

## Risk: Performance-fee disputes

Mitigation:

- Pre-approved baseline
- Transparent methodology
- Customer acceptance
- Separate one-time and recurring value

## Risk: Agents take harmful actions

Mitigation:

- Workflow-controlled permissions
- approvals
- idempotency
- side-effect ledger
- no unrestricted tools

---

# 21. Metrics

## Acquisition

- Visitor-to-upload conversion
- Upload-to-account conversion
- Customer acquisition cost
- Cost per qualified organization
- Organic search contribution

## Product

- Connected spend
- Document extraction success
- Time to first finding
- Data coverage score
- Opportunities per account
- Approval rate
- Action completion rate

## Financial

- Subscription MRR
- Verified savings
- Performance-fee revenue
- Referral revenue
- Gross margin
- Model cost per organization
- Workflow cost per verified dollar

## Trust

- False-positive rate
- Customer-disputed finding rate
- Unauthorized-action count
- Disclosure completion rate
- Evidence completeness
- Security incident count

## North-star metric

> **Verified customer value created per month.**

Do not use “number of AI messages” as a primary success metric.

---

# 22. Codex Repository Rules

Create an `AGENTS.md` file in the repository root containing rules such as:

```md
# Costivra Engineering Rules

## Product doctrine
- AI interprets.
- Deterministic code calculates.
- Policies control.
- Humans authorize external side effects.
- Evidence supports every material financial claim.

## Architecture
- TypeScript-first.
- Use strict TypeScript.
- Keep domain logic independent of frameworks.
- Keep agent logic separate from workflow orchestration.
- No arbitrary SQL generated by models.
- No direct cross-tenant queries.
- No external side effect without idempotency and audit logging.

## AI
- Use structured outputs for extraction.
- Version prompts and schemas.
- Include evidence references.
- Never silently fill unknown values.
- Add evaluation fixtures for every new document format.

## Security
- Enforce tenant scope at the database and service layers.
- Never expose secrets to the browser.
- Use private storage and signed URLs.
- Mask account identifiers.
- Treat document contents as untrusted input.

## Quality
- Run typecheck, lint, unit tests, integration tests, and relevant E2E tests.
- Add tests for every calculation.
- Do not merge failing evals.
```

---

# 23. Master Codex Build Prompt

Copy the following prompt into Codex after creating an empty repository.

```text
You are the principal engineer for Costivra, an agentic business cost intelligence and recovery platform.

Read COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md completely before making changes.

Your job is to create a production-grade foundation, not a visual-only prototype.

PRODUCT DOCTRINE
1. AI interprets unstructured information.
2. Deterministic TypeScript calculates financial values.
3. Explicit policies control permissions.
4. Humans authorize external side effects.
5. Every material financial claim must link to evidence.
6. Chat is not the system of record. Structured cases are.
7. The energy module detects review opportunities but does not operate as a hidden brokerage.
8. UCEP must be implemented as an optional disclosed partner adapter with explicit customer consent.

TECHNOLOGY
- pnpm monorepo
- Turborepo
- TypeScript 6.x with strict mode
- Next.js 16 App Router
- React 19.2
- Tailwind CSS 4
- shadcn/ui
- PostgreSQL through Supabase
- Supabase Auth and private Storage
- Drizzle ORM or a thin typed repository layer
- Zod for runtime schemas
- OpenAI Responses API for model calls
- Vercel AI SDK for streaming and typed agent interfaces
- Temporal TypeScript SDK for durable workflows
- Vitest
- Playwright
- OpenTelemetry-compatible tracing
- Sentry

REPOSITORY STRUCTURE
Create apps/web, apps/worker, and the shared packages described in the blueprint.

FIRST MILESTONE
Build only the secure platform foundation and document intake vertical slice:
1. Authentication
2. Organizations and memberships
3. Locations
4. Private document upload
5. Document metadata and SHA-256 deduplication
6. Invoice/contract classification interface
7. Versioned extraction schema
8. Evidence reference model
9. Admin review queue
10. Audit events
11. Tenant Row Level Security
12. A polished customer dashboard shell

SECURITY REQUIREMENTS
- No service-role credential in client code.
- All tables include tenant-safe access patterns.
- All private files use short-lived signed URLs.
- All mutations require authorization.
- Document content is untrusted and cannot alter agent policy.
- Add rate limits to upload and AI endpoints.
- Add an external-side-effect ledger before building email sending.

ENGINEERING REQUIREMENTS
- Do not install unnecessary dependencies.
- Read the current official documentation or installed package docs before using fast-moving APIs.
- Never guess Vercel AI SDK APIs.
- Use structured output schemas.
- Add tests with each feature.
- Run typecheck, lint, unit tests, and E2E smoke tests.
- Keep a DECISIONS.md architecture decision log.
- Keep a STATUS.md file with completed work, current risks, and next tasks.
- Do not move to the next milestone until the current one passes all checks.

DELIVERABLE FOR THIS RUN
1. Propose the exact repository plan.
2. Identify any incompatibilities among current package versions.
3. Scaffold the monorepo.
4. Implement the first milestone.
5. Create database migrations and RLS policies.
6. Add seed data.
7. Add tests.
8. Run the application locally.
9. Report commands, test results, remaining risks, and next recommended milestone.
```

---

# 24. Recommended Codex Task Sequence

Do not ask Codex to build the entire platform in one giant prompt.

Use this sequence:

## Task 1: Foundation

- Monorepo
- CI
- environment validation
- auth
- organizations
- database
- RLS

## Task 2: Document upload

- private storage
- malware/file validation interface
- metadata
- hashes
- signed URLs
- audit events

## Task 3: Extraction framework

- schemas
- provider adapter
- structured output
- versioning
- evidence references
- fixtures

## Task 4: Review console

- extraction comparison
- field correction
- confidence
- approval
- audit history

## Task 5: Expense system

- vendors
- accounts
- invoices
- line items
- contracts
- locations

## Task 6: Opportunity engine

- rules
- cases
- evidence
- calculations
- confidence

## Task 7: Workflows

- Temporal
- approvals
- reminders
- retries
- external side effects

## Task 8: Energy fork

- energy schema
- review rules
- package export
- UCEP disclosure
- consent
- partner adapter

## Task 9: Savings verification

- baseline
- post-action records
- verification methods
- fees

## Task 10: Pilot hardening

- evaluations
- E2E
- observability
- security
- analytics
- onboarding

---

# 25. Immediate Founder Actions

Complete these before writing large amounts of code:

1. Check and purchase the Costivra domains.
2. Secure social handles.
3. Save dated screenshots or records of the preliminary name search.
4. Run a USPTO and state-level name search.
5. Ask counsel to review trademark and employment issues.
6. Obtain written clarity from UCEP before commercial use.
7. Define the exact UCEP referral relationship.
8. Collect ten consented, de-identified sample documents.
9. Interview five business owners about recurring-expense review.
10. Pre-sell three pilot accounts before building advanced automation.

The highest-leverage first proof is not a complete app.

It is this:

> A business uploads a real recurring expense document, Costivra finds a credible issue, shows the source evidence, the customer approves an action, and the result is later verified.

---

# 26. Final Strategic Recommendation

Build Costivra as an independent cost intelligence company with UCEP as a transparent optional energy partner.

Do not build a disguised energy lead form.

Do not begin with twenty expense categories.

Do not let a language model control financial logic or external actions.

Begin with:

- Software subscriptions
- Telecom and internet
- Energy-review detection with the UCEP fork

Use React, Next.js, TypeScript, and Tailwind. Those technologies are already top-tier. Put the product over the top with:

- Temporal durable workflows
- Structured outputs
- Field-level evidence
- Deterministic calculations
- Strong tenant isolation
- Explicit approval policies
- Versioned prompts and rules
- Automated evaluations
- Verified outcomes

The winning product is not the one that sounds most futuristic.

It is the one a CFO can trust with a contract, an invoice, and a consequential decision.

---

# 27. Sources and Current Technology Snapshot

The following sources informed the current-version and governance recommendations in this blueprint:

1. React Versions, official React documentation: https://react.dev/versions
2. Next.js documentation, official latest-version documentation: https://nextjs.org/docs
3. Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
4. TypeScript 6.0 release notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
5. Supabase documentation: https://supabase.com/docs
6. Temporal workflow execution documentation: https://docs.temporal.io/workflow-execution
7. OpenAI, new tools for building agents: https://openai.com/index/new-tools-for-building-agents/
8. OpenAI, practical guide to building agents: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
9. OpenAI, function calling and Structured Outputs: https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api
10. OpenAI business-data privacy: https://openai.com/business-data/
11. United Commercial Energy Partners website: https://ucepartners.com/
12. FTC endorsement and material-connection guidance: https://www.ftc.gov/news-events/topics/truth-advertising/advertisement-endorsements
13. USPTO trademark basics: https://www.uspto.gov/trademarks/basics
14. USPTO guidance on similar-trademark searches: https://www.uspto.gov/trademarks/basics/why-search-similar-trademarks
15. ICANN information for domain registrants: https://www.icann.org/registrants

