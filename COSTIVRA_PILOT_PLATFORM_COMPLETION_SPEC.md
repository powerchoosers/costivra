# Costivra Pilot Platform Completion Specification

**Document type:** Pilot release execution directive, product completion brief, UX contract, trust standard, and Codex implementation plan  
**Prepared:** August 4, 2026  
**Repository:** `powerchoosers/costivra`  
**Production domain:** `https://costivra.ai`  
**Supabase project:** `skfocjrykyvsaviyhdea`  
**Current audited Git head:** `97520a7088b0d65c151e18bbbf6dd7f0a09743e3`  
**Status:** This is not another blueprint. Costivra is a functioning platform. This document controls the work required to tighten, complete, and ship the pilot.

---

# 0. Codex: Start Here

You are the principal product engineer responsible for completing the current Costivra pilot phase.

Do not scaffold a new product. Do not replace working systems with mockups. Do not restart the architecture. Work inside the existing repository and production boundaries.

Before making changes, read these files completely:

1. `AGENTS.md`
2. `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`
3. `DECISIONS.md`
4. `STATUS.md`
5. `README.md`
6. This file

Use this source-of-truth order for the current phase:

1. `AGENTS.md` for non-negotiable engineering, security, product, and design doctrine.
2. This file for pilot completion scope and acceptance criteria.
3. `DECISIONS.md` for established architecture choices.
4. `STATUS.md` for verified implementation state, blockers, and validation history.
5. The original blueprint for long-term strategy only.

The original blueprint remains strategically useful, but it no longer defines what must be built during this release. This release is about shipping the existing platform to real pilot customers, not adding another layer of ambition.

## Operating instruction

Complete the work in small, reviewable vertical slices. For each slice:

1. Inspect the current code, data model, tests, routes, and nearby components.
2. Preserve working behavior and unrelated user changes.
3. Use live Supabase records and real application states. Never substitute prettier fake data.
4. Implement the smallest complete improvement that satisfies the acceptance criteria.
5. Add or update tests.
6. Inspect the result in the browser at desktop, tablet, and mobile widths.
7. Update `STATUS.md`.
8. Add a decision to `DECISIONS.md` only when the change creates a meaningful new architectural or product boundary.
9. Report exact validation commands and results.
10. Do not call a milestone complete while a listed pilot release gate remains open.

---

# 1. Release Mission

Ship a trusted pilot platform that lets a real business:

1. Understand what Costivra does within five seconds.
2. Create a secure workspace.
3. Upload three real bills or contracts.
4. See each document move through security checking, extraction, and human review.
5. Receive at least one credible, evidence-backed finding when the records support it.
6. Understand the source, amount, assumptions, confidence, deadline, and next action.
7. Approve or decline a bounded action.
8. Select one vendor for continuous bill monitoring without granting broad inbox access.
9. Forward future invoices into the private workspace.
10. Later review whether a result was actually verified.

The internal Costivra team must be able to operate this pilot through `/manage` without database-console work for ordinary onboarding, intake review, customer follow-up, invoice correction, and case management.

The release is successful when the product can support a concierge-assisted pilot without pretending the product is fully autonomous.

---

# 2. Pilot Market Test

The immediate market hypothesis is:

> Small and midsized businesses will send Costivra a contained set of recurring bills, understand evidence-backed findings, approve a useful next step, and permit ongoing monitoring for vendors where Costivra proves value.

## Operating target

Use the platform to support:

- 10 pilot businesses
- Approximately 100 real, authorized, de-identified or customer-provided documents
- At least three supported recurring-cost categories across the pilot cohort
- A measurable path from first upload to first credible finding
- At least one monitored vendor per activated pilot
- At least three approved actions
- At least one verified customer outcome before expanding scope

These are market-learning targets, not claims that must be displayed publicly.

## Pilot metrics

Track:

- Visitor-to-secure-workspace conversion
- Workspace-to-first-upload conversion
- Percentage uploading three documents
- Time from signup to first upload
- Time from first upload to first reviewable record
- Time to first credible finding
- Percentage of documents requiring human correction
- Average human review time per document
- Critical-field correction rate
- Percentage enabling continuous monitoring for at least one vendor
- First forwarded-invoice success rate
- Finding acceptance rate
- Action approval rate
- Verified value created
- Qualitative customer trust concerns
- Customer willingness to continue or pay

The north-star metric remains:

> **Verified customer value created per month.**

Do not optimize for AI usage, messages, feature count, dashboard density, or number of records created.

---

# 3. Audited Current State

This section records the starting point verified on August 4, 2026. Re-check it before implementation because the repository and production data may have changed.

## 3.1 GitHub and deployment

- The canonical repository is `powerchoosers/costivra`.
- The default deployment branch is `main`.
- The current audited head is `97520a7088b0d65c151e18bbbf6dd7f0a09743e3`.
- Vercel reports a successful deployment for that commit.
- There were no open pull requests or open issues at the time of this audit.
- The repository uses the existing npm path. Do not switch package managers.
- The application is Next.js 16.2.12, React 19.2.8, TypeScript 6.0.3, Tailwind 4.3.3, Supabase JS 2.111.0, Resend 6.18.1, Vitest 4.1.10, and Playwright 1.62.1.

The repository already contains:

- A complete public marketing surface
- Auth and access routing
- An authenticated customer workspace
- An internal Manage portal
- Private document storage
- Structured extraction and OCR fallback
- Human invoice review
- Deterministic opportunity calculations
- Approval policies
- Savings verification
- Customer email intake
- Internal CRM and mail
- Audit and external-side-effect ledgers
- CI and browser tests
- Operations readiness and smoke commands

This release must tighten those systems rather than build substitutes.

## 3.2 Supabase

The live Costivra Supabase project was healthy at audit time.

All audited public tables had Row Level Security enabled. The current Supabase security advisor returned one account-level warning:

- Leaked-password protection is disabled.

This must remain visible as an external launch dependency. Do not claim it is resolved unless the setting is actually enabled and re-verified.

### Current data snapshot

| Record type | Count |
|---|---:|
| Organizations | 10 |
| Memberships | 5 |
| Locations | 6 |
| Organization-vendor relationships | 13 |
| Documents | 14 |
| Extraction versions | 17 |
| Invoices | 7 |
| Invoice line items | 36 |
| Invoice corrections | 0 |
| Expenses | 12 |
| Contracts | 6 |
| Opportunities | 6 |
| Action plans | 3 |
| Approvals | 3 |
| Savings outcomes | 3 |
| Audit events | 45 |
| CRM account profiles | 7 |
| CRM contacts | 9 |
| CRM tasks | 4 |
| CRM email messages | 45 |
| CRM mailboxes | 5 |
| Inbound email events | 6 |
| Inbound attachments | 4 |
| External side effects | 2 |

### Current workflow state

- Documents: 6 ready and 8 needing review
- Invoices: all 7 need review
- Invoice reconciliation: 4 reconciled and 3 mismatched
- Opportunities: 3 open, 2 under review, and 1 approved
- Actions: 1 draft, 1 pending approval, and 1 approved
- Savings outcomes: 3 verified
- Inbound email events: 1 needing review, 4 quarantined, and 1 rejected
- Inbound attachments: all 4 quarantined
- Malware scan state for all 4 inbound attachments: unavailable

These facts create two immediate release conclusions:

1. Human review is not an edge case in the pilot. It is a core operating surface.
2. Continuous invoice forwarding is not pilot-ready until a supported malware scanner is configured and proven.

Do not weaken fail-closed scanning to make the dashboard look healthier.

## 3.3 Resend

At audit time:

- `costivra.ai` was verified.
- Sending was enabled.
- Receiving was enabled.
- The production webhook at `https://costivra.ai/api/webhooks/resend` was enabled.
- The webhook subscribed to receiving and implemented delivery events.
- Open tracking was disabled.
- Click tracking was disabled.
- No Resend dashboard templates existed.
- Existing transactional messages were generated through application code and the shared Costivra email shell.
- Recent provider activity consisted primarily of authentication, inquiry, delivery, and intake verification messages.

This means transport is proven, but the pilot customer lifecycle email catalog still needs deliberate completion.

Do not migrate working code-native email into Resend dashboard templates merely to create activity. Keep one authoritative email-content system.

## 3.4 Public copy

The public site is visually and structurally mature, but some prominent language remains more sophisticated than instantly understandable.

Examples include:

- “Operating-margin intelligence”
- “Evidence-backed control system”
- “Turn recurring cost data into decisions your team can defend”

These statements are credible after a visitor understands Costivra. They are not the clearest first explanation of the service.

The homepage currently explains the system well, but the first screen should state the practical service even more directly:

- Costivra reviews recurring business bills and contracts.
- It looks for price increases, duplicated or unnecessary costs, and renewal risks.
- It shows the source evidence.
- The customer approves what happens next.
- Future bills can be forwarded for ongoing monitoring.

The deeper doctrine belongs below the first explanation.

## 3.5 Audit limitation

This audit used the connected GitHub repository, live Supabase metadata and aggregate data, Resend configuration, and committed browser-QA evidence. Direct retrieval of the production domain was unavailable in the audit environment.

Before release, Codex must perform a fresh local and production browser audit against `https://costivra.ai`.

---

# 4. Scope Freeze

Until the pilot has produced real customer usage and at least one new verified outcome, do not add:

- New expense categories beyond software, telecom/internet, and energy-review detection
- Full Gmail inbox access
- Full Microsoft mailbox access
- Autonomous vendor negotiation
- Autonomous cancellation
- Automatic contract acceptance
- Customer payment or bank-instruction changes
- A new accounting platform integration
- A second CRM
- Customer-facing Apollo data
- Individual contact enrichment
- More enrichment providers
- A marketplace
- Supplier quote comparison
- Performance-fee billing
- Mobile applications
- Broad benchmarking
- Decorative AI features
- Another navigation redesign unrelated to pilot comprehension
- Another general-purpose agent
- New dashboards that do not support a pilot decision

The work may improve existing CRM, mail, enrichment, and operations surfaces only where necessary to operate the pilot.

---

# 5. Non-Negotiable Product Doctrine

Preserve these rules in copy, code, data, and UI:

1. **AI interprets.**
2. **Code calculates.**
3. **Policies control.**
4. **Humans authorize.**
5. **Evidence proves.**
6. **Structured records are authoritative.**
7. **Unknown means unknown.**
8. **Verified is a protected term.**

Additional pilot rules:

- A polished summary is never a substitute for the source.
- Confidence is not authorization.
- An estimate is not savings.
- A model cannot approve an invoice, action, referral, or verified outcome.
- A browser-provided organization, role, value, status, or redirect is not trusted.
- An external message cannot be sent merely because AI drafted it.
- A missing field must remain visibly missing.
- A quarantined file cannot be downloaded or analyzed.
- UCEP remains an optional, disclosed, consent-gated destination.
- No production path may quietly use demonstration data.

---

# 6. Pilot Users

## 6.1 Public prospect

Usually an owner, controller, CFO, office manager, operations leader, or multi-location operator.

They need to know:

- What Costivra reviews
- What kinds of problems it can flag
- Whether the process is secure
- Whether Costivra can act without permission
- How much work setup requires
- What happens after they upload documents
- How future bills can be monitored

## 6.2 Customer workspace user

They need to:

- See what is monitored
- See what changed
- Understand what needs attention
- Review evidence
- Correct missing or wrong information
- Approve or decline a next step
- Know whether an amount is potential or verified
- Monitor one vendor without granting broad inbox access

## 6.3 Internal Costivra operator

They need to:

- Onboard a pilot customer
- See every pilot’s activation stage
- Find blocked intake quickly
- Review and correct invoices
- Follow up with the right person
- See source documents and customer context together
- Prepare customer communications
- Record tasks and notes
- Know which customers are receiving value
- Avoid database-console work for normal operations

## 6.4 Internal reviewer

They need to:

- See the source beside extracted fields
- Understand why a record is in review
- Correct only allowed fields
- Preserve correction history
- Reconcile arithmetic
- Match the correct vendor and account
- Approve only a complete, reconciled record
- Escalate ambiguity rather than guess

---

# 7. Product Vocabulary

Use one plain-language vocabulary across the public site, customer app, Manage portal, email, help content, and status messages.

| Internal concept | Preferred customer language |
|---|---|
| Opportunity | Finding or savings opportunity |
| Estimated annual value | Potential annual value |
| Extraction | Reading and organizing the bill |
| Evidence reference | Source evidence |
| Organization vendor | Vendor relationship |
| Inbound intake | Automatic bill forwarding |
| Reconciliation mismatch | The bill totals do not match |
| Needs review | A person needs to check this |
| External side effect | Outside action or sent communication |
| Baseline acceptance | Approve how savings will be measured |
| Verified outcome | Verified savings or verified recovery |
| Data coverage | How complete this vendor record is |

Do not rename database columns merely for presentation. Map internal names to clear interface copy.

## Status language

### Monitoring

- Not set up
- Test needed
- Active
- Attention needed
- Paused

### Documents

- Uploading
- Security check
- Reading document
- Needs review
- Ready
- Quarantined
- Rejected

### Invoices

- Needs review
- Totals match
- Totals do not match
- Approved

### Findings

- Open
- Under review
- Approved
- Declined
- In progress
- Verified
- Closed

### Actions

- Draft
- Waiting for approval
- Approved
- In progress
- Completed
- Declined
- Cancelled

### Savings

- Potential
- Measurement review
- Waiting for later evidence
- Ready for verification
- Verified
- Rejected

Every status must include a one-sentence explanation and the next available action.

---

# 8. Public Site Completion

## 8.1 Five-second comprehension requirement

After viewing the first screen of the homepage, a person unfamiliar with Costivra must be able to answer:

1. What does Costivra review?
2. What kinds of issues does it find?
3. Does it show evidence?
4. Does Costivra act without permission?
5. What should I do next?

Do not rely on scrolling to answer the first two questions.

## 8.2 Recommended homepage hero

Use this as the default direction unless browser testing produces a clearly stronger version.

**Eyebrow**

> Recurring bill and contract monitoring for growing businesses

**Headline**

> Find unnecessary costs and renewal risks in your business bills.

**Supporting copy**

> Costivra reviews recurring bills and contracts for unexplained price increases, possible duplicate or unused services, and deadlines that are easy to miss. Every finding shows the source evidence, and your team approves what happens next.

**Primary action**

> Upload 3 bills for a free review

**Secondary action**

> See how monitoring works

**Trust row**

- Only the documents you choose
- No broad inbox access required
- Human approval before any outside action

The brand language “operating-margin intelligence” may remain lower on the page, in metadata, or in product positioning. It must not replace the literal service description.

## 8.3 Homepage structure

Keep the homepage focused:

1. Literal service explanation and CTA
2. Three-step product explanation
   - Send bills and contracts
   - Review findings and evidence
   - Monitor future bills
3. Supported categories
   - Software subscriptions
   - Telecom and internet
   - Commercial energy review
4. Continuous monitoring explanation
   - Upload manually
   - Forward the next bill
   - Create a narrow vendor-specific rule
5. Clearly labeled illustrative product case
6. Security and control
7. Pilot CTA
8. Concise FAQ

Consolidate repeated doctrine sections. The doctrine should appear once, not compete with the service explanation.

## 8.4 Illustrative examples

Any synthetic product preview must say “Illustrative example” near the amount.

Do not show an example amount in a way that can be mistaken for a customer result.

For every example:

- Label potential value as an estimate.
- Show the assumed period.
- Show why the case was flagged.
- Avoid guaranteed-savings language.
- Do not present energy savings without required usage, rate, and context.
- Keep source evidence visible.

## 8.5 Public navigation

Keep the existing routes, but simplify visible labels:

- What Costivra does
- What we review
- How it works
- Security
- Pricing

Keep:

- Sign in
- Upload 3 bills

The primary navigation should not become a mega-menu.

The footer may keep broader routes for industries, partners, help, status, and legal pages.

## 8.6 Route-level copy contract

### `/product`

Answer:

- What records enter Costivra?
- What does Costivra do with them?
- What does the customer receive?
- What does Costivra never do without approval?

Lead with the practical product before the doctrine.

### `/solutions`

Use “What Costivra reviews” as the page label.

For each category, state:

- Supported source documents
- Supported findings
- Important limitations
- Customer next action

### `/how-it-works`

Use one real journey:

1. Create secure workspace
2. Upload three documents
3. Review extracted facts
4. Receive a finding when supported
5. Approve or decline
6. Monitor later bills
7. Verify the outcome

### `/security`

Keep the current strong control language.

Add a plain section:

> What Costivra can see

Explain:

- Files the customer uploads
- Messages sent to the private intake address
- Structured records inside the customer organization
- No broad inbox access in the pilot

Do not imply certification that does not exist.

### `/pricing`

Do not invent new prices.

Preserve current pilot pricing only when clearly marked as provisional. The homepage should link to the pricing page rather than carry a dominant three-tier pricing grid.

Do not add checkout until commercial terms and billing behavior are approved.

### `/scan`

This is the most important public conversion page.

Replace abstract security-first framing with a balanced sequence:

1. What the customer gets
2. Why a secure workspace is required
3. What happens after signup
4. What documents to prepare
5. How long the first review usually takes only when a measured, supportable range exists

Suggested copy:

> Upload three current bills or contracts. Costivra will organize the charges, flag what deserves review, and show the source evidence inside your private workspace.

Then explain:

- Secure account required
- PDF, DOCX, and supported text records
- No vendor contact without approval
- Future monitoring is optional
- No broad inbox access required

### `/signup` and `/login`

- Hide Google or Microsoft controls when the providers are not configured. Do not show disabled “setup required” controls to a prospect.
- Keep the email/password path obvious.
- Explain the next step after confirmation.
- Preserve secure recovery behavior.
- Never expose raw provider errors.

### `/case-studies`

Do not fabricate results.

Until real pilot stories exist:

- Keep the transparent explanation.
- Remove the page from prominent navigation.
- Invite qualified pilot participation.
- Add real stories only when the source, finding, decision, and verified result can be shown with customer authorization.

### `/help`

Prioritize:

- Uploading first documents
- Understanding statuses
- Correcting extracted information
- Setting up one-vendor forwarding
- Understanding estimates
- Approving actions
- Verifying results
- Getting support

### Legal pages

Do not remove draft or counsel-review warnings merely to make the site look finished.

The founder must decide whether the pilot operates under:

- Counsel-approved public terms, or
- A private signed pilot agreement

Codex cannot provide legal clearance.

---

# 9. Customer Activation Journey

Do not send a new customer directly into a crowded general dashboard.

Create or tighten a focused activation journey.

## 9.1 Activation checklist

Show one calm checklist:

1. Create workspace
2. Add company details
3. Add one location when applicable
4. Upload three bills or contracts
5. Review any fields that need attention
6. Select the first vendor to monitor
7. Test a forwarded invoice
8. Invite an approver when needed

Show:

- Current step
- Completed steps
- Why the next step matters
- One primary action

Do not show confetti, fireworks, sparkle icons, or gamified points.

## 9.2 First upload

After upload, show the actual pipeline:

1. File received
2. Security scan
3. Reading document
4. Matching vendor and account
5. Checking totals
6. Ready or needs review

Do not use a generic indefinite spinner.

When a file is quarantined, explain:

- The document remains private.
- It has not been sent to document intelligence.
- What the user or operator can do next.
- Whether scanner configuration is a platform issue rather than a customer mistake.

## 9.3 First finding

When the first credible finding exists, the page must show together:

- What changed
- Potential value
- Period
- Confidence
- Source evidence
- Calculation or rule
- Assumptions
- Missing information
- Deadline
- Recommended next step
- Required approval
- Owner

The user must not need to open six tabs to understand one case.

## 9.4 No finding

A document that produces no finding is still useful.

Say:

> Costivra organized this bill and did not create a supported finding from the current evidence.

Then show:

- What was captured
- What remains missing
- Whether another period or contract is needed
- Whether the vendor can be monitored

Never manufacture a finding to avoid an empty state.

---

# 10. Continuous Bill Monitoring

Continuous monitoring is central to retention, but it must be earned after initial value.

## 10.1 Friction ladder

Use this sequence:

1. Manual upload
2. Manual forwarding of one bill
3. Automatic rule for one vendor
4. Additional vendor rules
5. Broader integrations only after the pilot proves a need

Do not begin by asking for all invoices or broad mailbox access.

## 10.2 Customer framing

Use:

> Monitor this vendor

Avoid:

> Give Costivra access to your inbox

Core trust copy:

> Costivra receives only the messages that you or your mailbox rule send to the private workspace address. Costivra does not read the rest of your inbox.

Also state:

- The rule can be paused or removed at any time.
- The customer chooses the vendor and sender.
- Only approved sender addresses are accepted.
- Attachments are security-scanned before extraction.
- Duplicate files are detected.
- No vendor is contacted without approval.

## 10.3 One-vendor setup

From a vendor page, the user should be able to:

1. Select “Monitor this vendor.”
2. Choose:
   - Upload manually
   - Forward the next bill
   - Create an automatic email rule
   - Give the private address directly to the vendor
3. Confirm the work email that will forward invoices.
4. See the private workspace address.
5. See vendor-specific Gmail and Outlook rule guidance.
6. Send one test invoice.
7. See the test move through the intake states.
8. Receive “Monitoring active” only after the test succeeds.

Do not mark monitoring active because an address was copied.

## 10.4 Monitoring state

Every vendor should have a derived or stored monitoring state:

- Not set up
- Test needed
- Active
- Attention needed
- Paused

Show:

- Source method
- Approved sender
- Last bill received
- Expected cadence
- Next expected bill
- Last successful extraction
- Intake issues

Inspect the existing schema first. Add the smallest tenant-scoped, audited record only if current organization-vendor and intake records cannot represent this state honestly.

A possible domain concept is a vendor monitoring source or vendor intake rule. Do not create a parallel vendor system.

## 10.5 Missing bill detection

For monitored vendors with a known cadence:

- Calculate the expected next date deterministically.
- Allow a reasonable grace period.
- Show “Expected bill not received” only after the threshold.
- Create an internal task or notification.
- Do not send repeated customer emails for the same missing period.
- Preserve the expected cadence and calculation basis.

---

# 11. Customer `/app` Completion

## 11.1 Information architecture

Keep all existing routes and deep links. Simplify the visible hierarchy.

Recommended primary navigation:

1. Command Center
2. Vendors
3. Findings
4. Actions
5. Documents
6. Savings

Recommended secondary group:

- Expenses
- Contracts
- Reports
- Ask Costivra
- Team and approvals
- Integrations
- Settings

“Findings” may map to the existing `/app/opportunities` route.

Do not delete routes merely to reduce navigation. Use grouping and progressive disclosure.

## 11.2 Command Center

The Command Center must answer:

1. What is being monitored?
2. What changed?
3. What needs my decision?
4. What data is incomplete?
5. What value has been verified?

Keep no more than four headline metrics:

- Monitored recurring spend
- Findings under review
- Actions waiting for approval
- Verified value

Potential value may appear in the priority-work section rather than competing with verified value as an equal headline.

Add:

- Activation or data-coverage status
- Recent document pipeline activity
- Vendor monitoring health
- Upcoming renewal or notice dates
- One priority work queue
- One primary onboarding action for incomplete accounts

Do not add a chart unless it answers a customer question.

## 11.3 Vendor directory

The directory should support action, not merely list vendors.

Columns or card information:

- Vendor
- Category
- Monitoring state
- Recorded annualized spend
- Last bill received
- Next contract or notice date
- Open findings
- Record completeness
- Primary next action

Clearly distinguish:

- Recorded spend
- Annualized relationship estimate
- Potential value
- Verified value

Do not combine mixed currencies.

## 11.4 Vendor Command Page

The vendor page should become the central customer control surface.

### Header

Show:

- Real vendor identity and logo
- Category
- Relationship status
- Monitoring state
- Website when recorded
- Locations or accounts
- One dynamic primary action

Dynamic primary action:

| Current condition | Primary action |
|---|---|
| No source document | Add first bill |
| Source needs review | Review invoice |
| No monitoring | Monitor this vendor |
| Test pending | Finish monitoring test |
| Active finding | Review finding |
| Approval pending | Review action |
| Stable and complete | View latest bill |

Keep secondary actions in a restrained menu or compact group.

### Summary

Show:

- Latest recorded charge
- Spend period
- Recorded annualized amount and basis
- Recent trend when at least two comparable periods exist
- Last bill received
- Next bill expected
- Contract end
- Notice deadline
- Data completeness
- Open findings
- Verified value related to this vendor

Do not show zero as a substitute for unknown.

### Monitoring card

Add a first-class monitoring card:

- Status
- Source method
- Approved forwarding address
- Private intake address
- Last successful intake
- Expected cadence
- Next expected invoice
- Setup or repair action
- Plain explanation of mailbox scope

This card should not be buried under general Integrations.

### Tabs or sections

Use a small number of task-oriented sections:

1. Overview
2. Bills and invoices
3. Contract and renewals
4. Findings and actions
5. Files and evidence

Savings related to the vendor may appear in Findings and actions or a concise verified-outcomes block.

### Data quality

Show a compact checklist:

- Recent invoice
- Vendor matched
- Totals reconciled
- Contract recorded
- Renewal date recorded
- Location assigned
- Monitoring active

Each missing item should have a direct fix when permitted.

### Files

Preserve the existing protected file workspace.

Do not create duplicate file lists in multiple sections.

Keep original provenance, status, source availability, evidence count, and secure download behavior.

## 11.5 Documents and invoices

The Documents area must make pipeline state obvious.

Filters:

- All
- Needs review
- Ready
- Quarantined
- Rejected

For invoices:

- Vendor
- Invoice number
- Service period
- Total
- Reconciliation
- Review state
- Source document
- Next action

A customer should not need to understand extraction-version internals to know what to do.

## 11.6 Findings

Each finding must be a structured case, not a paragraph card.

The default list should prioritize:

1. Deadline
2. Potential value
3. Confidence
4. Evidence completeness
5. Required action

Detail view must place the source, calculation, assumptions, and next action together.

Energy findings must say “Professional review may be warranted” rather than promise savings.

## 11.7 Actions and approvals

Before approval, show:

- Exact action
- Destination or recipient when external
- Data or document scope
- Approval policy
- Required approvers
- Consequence
- Ability to decline

Do not use vague buttons such as “Continue” for consequential decisions.

Use:

- Approve this action
- Decline
- Start approved work
- Mark work complete

Re-check approval immediately before execution.

## 11.8 Savings

Verified value must remain visually distinct from potential value.

The review workspace must show:

- Accepted baseline
- Later comparison
- Method and version
- Inputs
- Assumptions
- Exclusions
- Calculation
- Source expenses and documents
- Reviewer
- Verification decision

Do not compress financial attestation into a one-click row action.

## 11.9 Ask Costivra

Keep Ask Costivra:

- Read-only
- Organization-scoped
- Source-cited
- Bounded
- Unable to approve, send, edit, or calculate authoritative value

Suggested starter questions should be based on live records.

Do not display suggestions that return empty or unsupported answers.

## 11.10 Empty, loading, error, and success states

Every customer route must have:

- Loading state
- Honest empty state
- Safe error state
- Success feedback
- Read-only viewer state
- Mobile state

An empty state must explain the next useful action.

---

# 12. Internal `/manage` Completion

The internal portal is the concierge operating system for the pilot.

Do not turn it into a general CRM product during this release.

## 12.1 Internal navigation

Recommended primary structure:

### Pilot

- Pilot overview
- Accounts

### Operations

- Intake
- Invoice review
- Work
- Mail

### Secondary

- Contacts
- Activity
- Settings

The existing Outreach route may be presented as “Work.”

Apollo enrichment remains in Settings and account context. It must not dominate the navigation.

## 12.2 Pilot Overview

The overview must answer:

1. Which pilots need attention today?
2. Which customers have not completed activation?
3. Which documents are blocked?
4. Which invoices need review?
5. Which findings are waiting for customer action?
6. Which customers enabled continuous monitoring?
7. Which expected bills have not arrived?
8. Which pilot has created verified value?

Recommended sections:

- Accounts needing attention
- Intake incidents
- Invoice review queue
- Findings awaiting customer decision
- Upcoming renewal deadlines
- Monitoring interruptions
- Follow-ups due
- Recent verified outcomes

Avoid generic activity metrics.

## 12.3 Account workspace

The internal account page should contain:

- Account identity and stage
- Primary contact
- Locations
- Parent or child relationships
- Pilot owner
- Next follow-up
- Activation checklist
- Monitored vendors
- Recent documents
- Intake health
- Review exceptions
- Findings
- Actions
- Verified outcomes
- Tasks and notes
- Relevant mail

Use a dynamic primary action:

- Contact customer
- Complete workspace setup
- Review invoice
- Resolve intake
- Prepare finding
- Request customer decision
- Set up first monitored vendor

Do not make operators hunt across unrelated screens for the current blocker.

## 12.4 Contacts

Keep the full contact directory, but make the account relationship primary.

Contact details should provide:

- Account link
- Email
- Phone when recorded
- Role/title
- Consent status
- Last contact
- Open task
- Compose action

Do not send contact data to enrichment providers without purpose-specific consent.

## 12.5 Intake

The existing intake operations queue is a core pilot surface.

Required:

- Queued
- Processing
- Retrying
- Quarantined
- Rejected
- Needs review
- Dead letter
- Completed

Operators must see:

- Customer
- Sender
- Subject
- Received time
- Attachments
- Scan state
- Processing state
- Attempts
- Resulting document or invoice
- Safe retry eligibility
- Exact next action

No operator should need private Storage access for normal recovery.

## 12.6 Invoice review

Because every current invoice needs review, this route is P0.

Required workflow:

1. Open source and fields together.
2. See issue codes.
3. Match vendor and account.
4. Correct allowed fields.
5. Record reason.
6. Recalculate exact arithmetic.
7. Confirm required fields.
8. Approve or leave in review.
9. Create one linked expense idempotently.
10. Preserve all correction and approval history.

Add efficient keyboard behavior for repetitive review, but do not sacrifice explicit decisions.

## 12.7 Work

Use the existing task system for:

- Pilot onboarding
- Missing documents
- Customer corrections
- Intake setup
- Follow-up after findings
- Approval reminders
- Missing expected invoice
- Verification follow-up

Tasks need:

- Account
- Contact
- Owner
- Due date
- Priority
- Status
- Related record
- Next action

## 12.8 Mail

Keep the current account-scoped, auditable mail system.

For the pilot:

- Sending must remain a deliberate human action.
- Every sent message must be tied to a real account, except drafts.
- The side-effect ledger must remain authoritative.
- The composer may use record-grounded drafting.
- The model cannot send.
- Sensitive source files should link to the secure workspace rather than be attached casually.
- Delivery failures must be visible.
- Open and click activity must not be assumed while tracking is disabled.

Do not add more rich-text features unless a real pilot message requires them.

## 12.9 Internal assistant

Keep it read-only and record-grounded.

Useful questions:

- Which pilots are blocked?
- Which invoices need review today?
- Which customers have not enabled monitoring?
- Which follow-ups are overdue?
- Which findings await approval?

Every answer must link to records.

---

# 13. Resend and Customer Email Completion

## 13.1 Email architecture

Keep the existing shared Costivra email shell as the source of truth unless a clear defect requires another approach.

Do not add Resend dashboard templates simply because none exist.

Create a centralized inventory of application emails with:

- Internal name
- Trigger
- Audience
- Sender
- Reply path
- Subject
- Required data
- CTA
- Ledger behavior
- Idempotency key format
- Marketing or transactional classification
- Test coverage

## 13.2 Required pilot transactional email catalog

1. Workspace invitation
2. Email confirmation
3. Password recovery
4. Welcome and first-upload instruction
5. Documents received
6. Document quarantined or customer action required
7. Document ready
8. Invoice needs review
9. Finding ready for review
10. Approval requested
11. Approval recorded
12. Action completed
13. Savings measurement ready
14. Savings verification ready
15. Weekly monitoring digest
16. One-vendor forwarding setup instructions
17. Forwarding test succeeded
18. Forwarding test failed
19. Expected bill not received
20. Intake paused or interrupted
21. Contact inquiry receipt
22. Internal owner inquiry notification
23. Security-sensitive account notifications

Do not send every status change by email. Use emails only for a clear customer job.

## 13.3 Email content standard

Every email must:

- Use the real Costivra logo
- Use the shared email shell
- Have one clear purpose
- Have one primary CTA
- Include plain-text content
- Use an honest subject
- Use an accessible preheader where supported
- Avoid sensitive account identifiers
- Avoid full invoice content in the message body
- Link to the authenticated workspace
- Explain why the recipient received the message
- Include a reply path when appropriate
- Record provider acceptance and later delivery state
- Avoid unsupported urgency
- Avoid guaranteed-savings language
- Avoid decorative AI language

## 13.4 Marketing separation

Transactional messages do not require marketing opt-in when they are necessary to provide the requested service.

Marketing messages require:

- Explicit, unchecked consent
- Consent evidence
- Unsubscribe path
- Topic or suppression handling
- No use of transactional urgency to conceal marketing

## 13.5 Open and click tracking

Open and click tracking were disabled at audit time.

For the pilot:

- Do not enable tracking merely to populate CRM activity.
- Treat delivered, bounced, complained, failed, and suppressed states as operational.
- Hide or label open/click features unavailable while tracking remains disabled.
- Any future decision to enable tracking requires a privacy and product rationale.

## 13.6 Test safety

Automated tests must not send to real customers.

Use:

- Provider test addresses
- `.invalid` addresses where appropriate
- Explicitly gated manual production probes
- Stable idempotency keys
- Cleanup for created records

---

# 14. Supabase and Data Completion

## 14.1 Preserve the current foundation

Do not:

- Create replacement tables for existing authoritative records
- Bypass RLS with a generic service helper
- Grant broad browser writes
- Store important financial facts only in JSON or vectors
- Let the browser write protected workflow states
- Delete real records to simplify UI
- Reset migration history
- Run destructive probes against production

## 14.2 Schema changes

Before adding a table or field:

1. Prove the existing schema cannot represent the behavior.
2. Choose the smallest domain change.
3. Add tenant ownership.
4. Add constraints.
5. Add RLS.
6. Add least-privilege grants.
7. Add indexes for foreign keys and expected access.
8. Add audit behavior.
9. Add tests.
10. Run Supabase security and performance advisors.

Potential pilot need:

- Vendor monitoring source or rule state

Inspect current organization-vendor, inbound email, integration, and document metadata first. Do not add this concept if it can be derived honestly.

## 14.3 Malware scanner

A working scanner is a hard release gate for automatic forwarding.

Required:

- Configure one supported scanner credential in Production, Preview where appropriate, and local development as appropriate.
- Run the live harmless readiness probe.
- Prove clean files proceed.
- Prove infected files are rejected.
- Prove unavailable or failed scans remain quarantined.
- Prove quarantined files do not reach extraction.
- Prove signed download is denied.
- Prove retry and release are idempotent.
- Prove operator messaging is clear.

If no scanner credential is available, report the external blocker and keep automatic monitoring unavailable.

Never weaken the boundary.

## 14.4 Invoice corrections

The current correction table was empty at audit time.

Before the pilot:

- Exercise corrections through the real review UI.
- Prove original values remain preserved.
- Prove actor, time, reason, and source remain attributable.
- Prove correction recalculates reconciliation.
- Prove approval writes one expense.
- Prove repeated approval does not duplicate the expense.

## 14.5 Data completeness

Calculate a plain-language coverage score for each vendor from supported facts, not AI opinion.

Possible components:

- Recent bill
- Reconciled amount
- Vendor matched
- Account known
- Location known
- Contract present
- End date known
- Notice period known
- Monitoring active

Do not collapse unknown fields into a falsely precise score. Show component status beside the total.

---

# 15. Apple-Inspired Simplicity Standard

Apple simplicity here means disciplined reduction, not visual imitation.

## 15.1 One-screen rule

Every screen must have:

- One clear purpose
- One primary action
- A visible state
- A visible next step
- No redundant summary cards

## 15.2 Visual system

Use:

- Clean white or quiet translucent surfaces
- Subtle 1px neutral borders
- Soft 16px to 22px corners where appropriate
- Precise typography
- Generous whitespace
- Quiet status dots and pills
- Strong alignment
- restrained shadows
- Short, purposeful motion
- Real Costivra brand assets

Avoid:

- Heavy colored left borders
- Loud tinted card fills
- Random gradients
- Decorative bento layouts
- Repeated rounded cards for every sentence
- Excessive pills
- Generic sparkle or magic-wand icons
- AI robot mascots
- Neon effects
- Empty charts
- Hidden actions
- Multiple competing primary buttons

## 15.3 Progressive disclosure

Show the decision first.

Place details behind:

- Tabs
- Expanders
- Inspectors
- Secondary panels

Do not hide:

- Financial basis
- Source evidence
- Uncertainty
- Approval consequence
- Data-sharing scope

## 15.4 Metrics

A metric must answer a business question.

Good:

- How much recurring spend is monitored?
- What needs approval?
- Which bill changed?
- Which contract is approaching notice?
- What value is verified?

Bad:

- Number of AI runs
- Number of messages
- Number of records with no decision context
- Decorative percentages without a denominator

## 15.5 Motion

- Use restrained 160ms to 240ms interactions where appropriate.
- Preserve reduced-motion behavior.
- Do not delay work behind decorative animation.
- Do not animate financial values in a way that implies volatility or urgency.
- Avoid full-screen route fades.

## 15.6 Responsive behavior

Design desktop, tablet, and mobile deliberately.

Mobile requirements:

- 44px minimum touch targets
- No horizontal page overflow
- Tables scroll inside their own container or transform into purposeful cards
- Primary action remains reachable
- Evidence and fields stack in a reviewable order
- Side rails become sections or drawers
- No desktop navigation squeezed into a tiny column

## 15.7 Accessibility

Meet WCAG 2.2 AA expectations:

- Keyboard navigation
- Visible focus
- Dialog focus trapping and restoration
- Correct labels
- Error association
- Sufficient contrast
- Screen-reader status announcements
- Reduced motion
- Descriptive links and actions
- No status conveyed by color alone

---

# 16. Trust Standard

The pilot must feel trustworthy because it behaves honestly.

## 16.1 Trust is created by

- Plain service description
- Private documents
- Narrow email forwarding
- Visible evidence
- Clear status
- Honest unknowns
- Explicit approval
- Traceable corrections
- Clear partner disclosure
- Safe failure
- Real support contact
- No fabricated social proof
- No fabricated savings
- No fake integrations
- No hidden external sharing

## 16.2 Trust copy near forwarding

Display:

> Costivra receives only messages sent to your private workspace address. A forwarding rule can be limited to one vendor. Costivra does not read the rest of your inbox.

Display:

> Every file is security-scanned before Costivra reads it.

Display:

> Costivra will not contact this vendor without an approved action.

## 16.3 Trust copy near findings

Display:

> Potential value is an estimate based on the records shown. It is not verified savings.

## 16.4 Trust copy near verification

Display:

> Verified means the accepted method and later source evidence support the result.

## 16.5 UCEP

Do not implement or activate commercial UCEP data sharing until the founder has written legal and employment clarity.

Any future UCEP path must:

- Present neutral alternatives
- Show the disclosure
- Obtain purpose-specific consent
- Record disclosure version
- Record exact data scope
- Allow another advisor
- Allow export without referral
- Keep identities and data access separate

---

# 17. Pilot Analytics and Feedback

Use existing audit and application events where practical. Do not create a surveillance system.

Track server-side product events with no raw document text:

- Workspace created
- First location added
- First vendor added
- First document uploaded
- Third document uploaded
- Extraction completed
- Review required
- Invoice approved
- First finding created
- Finding viewed
- Action approved
- Monitoring setup started
- Monitoring test completed
- First forwarded bill received
- Expected bill missed
- Savings baseline accepted
- Savings verified

Include:

- Organization ID
- Actor ID when appropriate
- Event type
- Related safe record ID
- Timestamp
- Source
- Trace ID

Exclude:

- Full account numbers
- Document text
- Secret values
- Private email content
- Sensitive provider payloads

## Feedback

Add a lightweight feedback path:

- “Was this finding clear?”
- “What would stop you from acting?”
- “Was forwarding setup easy?”

Store feedback with the related record and pilot account, or create an internal follow-up task. Do not build a large feedback platform.

---

# 18. Implementation Priorities

## P0: Required before onboarding real pilot customers

### P0.1 Establish baseline

- Pull latest `main`.
- Confirm clean working tree.
- Read required documents.
- Run the full current non-destructive gate.
- Capture existing production and local screenshots.
- Record baseline failures in `STATUS.md`.
- Do not hide pre-existing failures.

### P0.2 Activate document security

- Configure and verify malware scanner.
- Prove upload and forwarding paths.
- Keep fail-closed behavior.
- Add clear customer and operator status copy.

### P0.3 Make the public promise literal

- Rewrite homepage first screen.
- Align public page ledes.
- Label examples.
- Hide unconfigured OAuth controls.
- Make `/scan` explain the result and next steps.
- Keep legal and pricing claims honest.
- Run the five-second comprehension test.

### P0.4 Complete activation

- Add focused customer onboarding.
- Route signup into activation rather than a general document list.
- Make the three-document path obvious.
- Show pipeline states.
- Offer continuous monitoring only after initial value or document setup.

### P0.5 Complete one-vendor monitoring

- Add “Monitor this vendor.”
- Support manual forwarding and one-vendor automatic rule setup.
- Store or derive honest monitoring state.
- Require a successful test before active status.
- Show last and next expected bill.
- Add repair paths.

### P0.6 Finish the Vendor Command Page

- Add monitoring card.
- Add dynamic primary action.
- Add data completeness.
- Keep source records, contract, findings, actions, and files connected.
- Make mobile layout intentional.
- Preserve mixed-currency and unknown-value safeguards.

### P0.7 Make Manage pilot-operational

- Add or refine Pilot Overview.
- Show activation and blockers by account.
- Keep Intake and Invoice Review prominent.
- Make account page the operating hub.
- Ensure ordinary pilot work does not require Supabase console access.

### P0.8 Complete core lifecycle emails

At minimum:

- Welcome
- Upload received
- Review needed
- Finding ready
- Approval requested
- Forwarding instructions
- Forwarding test result
- Expected bill missed
- Verification ready

### P0.9 Pilot release test

Prove one complete disposable journey:

1. Create customer
2. Sign in
3. Upload three supported documents
4. Security scan passes
5. Extraction versions are created
6. At least one invoice enters review
7. Reviewer corrects and approves it
8. Expense is created once
9. Supported rule creates a finding
10. Customer reviews and approves an action
11. Baseline is accepted
12. One vendor monitoring rule is configured
13. Test invoice is forwarded
14. Intake completes
15. Later record supports verification
16. Customer verifies the outcome
17. Audit and side-effect records are complete
18. Test data is cleaned up

The test may use supported fixtures and explicitly gated provider test addresses. It must not email a real customer.

## P1: Required during the first pilot cohort

- Weekly monitoring digest
- Expected-invoice reminders
- Pilot feedback capture
- Data-coverage improvements
- Review keyboard efficiency
- Better account prioritization
- Real pilot funnel reporting
- First customer-authorized case study
- Extraction evaluation expansion with real de-identified documents

## P2: Only after pilot evidence

- Broader mailbox OAuth
- Accounting integrations
- Additional categories
- Customer-facing enrichment
- Automated partner routing
- Performance billing
- Benchmark products
- More autonomous execution

---

# 19. Route Acceptance Matrix

## Public

| Route | Pilot requirement |
|---|---|
| `/` | Literal service explanation, supported categories, monitoring path, trust, one CTA |
| `/product` | Clear input, process, output, control, and limitations |
| `/solutions` | Plain category support and boundaries |
| `/how-it-works` | One end-to-end customer journey |
| `/security` | What Costivra sees, what it does not see, controls |
| `/pricing` | Honest pilot pricing, no checkout fiction |
| `/scan` | Secure first step, three-document expectation, clear result |
| `/signup` | Lowest practical friction, no dead provider buttons |
| `/login` | Reliable auth and recovery |
| `/help` | Upload, review, monitoring, approval, verification |
| `/status` | Customer-safe live status |
| `/privacy` | Accurate and counsel-reviewed before public commercial use |
| `/terms` | Accurate and counsel-reviewed before public commercial use |
| `/ucep-disclosure` | Explicit relationship and customer choice |
| `/contact` | Useful qualification and secure-file warning |

## Customer

| Route | Pilot requirement |
|---|---|
| `/app` | Activation, monitored spend, attention, approval, verified value |
| `/app/vendors` | Monitoring, latest bill, next date, completeness |
| `/app/vendors/[id]` | Complete Vendor Command Page |
| `/app/documents` | Clear intake and security states |
| `/app/documents/[id]` | Source, extraction, evidence, status, next action |
| `/app/expenses` | Recorded periods and changes |
| `/app/contracts` | End dates, notice, owner, source |
| `/app/opportunities` | Prioritized evidence-backed findings |
| `/app/actions` | Explicit approval and execution state |
| `/app/savings` | Protected verification workflow |
| `/app/integrations` | Narrow forwarding and honest planned providers |
| `/app/team` | Roles and approval readiness |
| `/app/ask` | Source-grounded, read-only answers |
| `/app/settings` | Organization, locations, approvals, export, monitoring controls |

## Manage

| Route | Pilot requirement |
|---|---|
| `/manage` | Pilot health and attention queue |
| `/manage/accounts` | Activation and value status by customer |
| `/manage/accounts/[id]` | Full concierge operating context |
| `/manage/contacts` | Customer relationships and direct actions |
| `/manage/outreach` | Due follow-up work |
| `/manage/mail` | Account-linked, auditable communication |
| `/manage/intake` | Queue, quarantine, retries, result |
| `/manage/invoice-review` | Fast, safe human verification |
| `/manage/activity` | Audit-supporting operational history |
| `/manage/settings` | Readiness, identities, enrichment, operator settings |

---

# 20. Browser and UX Audit

Codex must inspect:

- Local application
- Vercel preview
- Production after deployment

Viewport set:

- 1440 x 900
- 1024 x 768
- 820 x 1180
- 390 x 844
- 375 x 812

For each critical route:

- Capture screenshot
- Check console
- Check network failures
- Check horizontal overflow
- Check keyboard navigation
- Check focus
- Check empty state
- Check populated state
- Check error state when practical
- Check reduced motion
- Check touch target size
- Check primary action visibility
- Check no content is clipped
- Check no raw internal slug is displayed
- Check no unsupported claim appears

Store final screenshots in a clearly named pilot QA directory such as:

`output/playwright/pilot-final/`

Do not commit authentication state, secrets, or customer documents.

---

# 21. Testing and Validation

Use the repository’s actual npm scripts.

Baseline and final applicable gate:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run ops:verify
npm audit --omit=dev
git diff --check
```

Use:

```bash
npm run test:integration:live
```

only when:

- Valid local privileged credentials are present
- The test’s production guard is enabled intentionally
- The test is self-cleaning
- The target is correct
- The operation is safe
- No real customer communication occurs

Run the invoice evaluation in the modes supported and documented by the repository. Do not guess CLI flags.

Required test coverage:

- Public copy and CTA routes
- Signup-to-activation route
- Viewer read-only behavior
- Cross-tenant denial
- Manual upload
- Clean scan
- Scanner unavailable
- Malware rejection
- SHA-256 deduplication
- Extraction versioning
- Invoice correction
- Reconciliation
- Idempotent approval
- Vendor monitoring setup
- Forwarding sender validation
- Test invoice intake
- Missing expected bill
- Opportunity calculation
- Approval policy
- Savings baseline
- Savings verification
- External-side-effect idempotency
- Email delivery failure
- Prompt injection
- UCEP consent boundary
- Mobile navigation
- Vendor page
- Manage pilot overview
- Intake and review operations

No release with:

- Failing tenant-isolation test
- Unsupported material financial claim
- Broken evidence link
- Unscanned file reaching extraction
- Unauthorized external action
- Failing typecheck, lint, build, required test, or relevant browser check

---

# 22. Founder and External Dependencies

Codex must report these separately from code work.

Potential dependencies:

- Malware scanner account and credential
- Supabase plan or setting for leaked-password protection
- Counsel-approved Privacy Policy
- Counsel-approved Terms
- Counsel-approved UCEP disclosure
- Written employment and IP clarity
- Valid local Supabase server credential for live tests
- Production OAuth credentials if Google or Microsoft sign-in will be shown
- Pilot customer documents and authorization
- Customer consent for case-study publication

Do not hide these dependencies behind a green build.

---

# 23. Definition of Pilot Ready

The pilot is ready only when all are true:

## Public

- A new visitor understands the service within five seconds.
- The first screen says bills, contracts, findings, evidence, and approval in plain language.
- The primary CTA works.
- Examples are clearly illustrative.
- No planned integration appears connected.
- No unsupported certification or savings claim appears.

## Customer

- A real customer can create a workspace and upload three documents.
- Every document has a clear state.
- Security scanning works.
- Human-review states are understandable.
- A finding shows source evidence and limitations.
- An action requires explicit approval.
- Verified value is protected.
- A customer can activate monitoring for one vendor.
- Forwarding requires no broad inbox access.
- A successful test is required before monitoring becomes active.
- The Vendor Command Page provides the current state and next action.
- Viewer accounts remain read-only.
- Mobile usage is viable.

## Internal

- An operator can see every pilot and its blocker.
- Intake and invoice review are efficient.
- An account page contains the context needed for follow-up.
- An operator can correct and approve an invoice safely.
- An operator can help a customer configure forwarding.
- Email is account-linked, auditable, and deliberate.
- Ordinary pilot operation does not require direct database edits.

## Operations

- Vercel deployment is healthy.
- Supabase advisors have no unresolved table or RLS exposure caused by this release.
- The scanner is live.
- The inbound worker is live.
- Resend sending, receiving, and webhook delivery are verified.
- Required emails are tested.
- Full applicable validation passes.
- `STATUS.md` reflects reality.
- External blockers are plainly reported.

---

# 24. Required Codex Final Report

At the end of the implementation, provide:

## What changed

Group by:

- Public site
- Customer app
- Vendor page
- Continuous monitoring
- Manage portal
- Email
- Database
- Tests
- Documentation

## Validation

List every exact command:

- Command
- Pass or fail
- Test counts
- Skips and why
- Browser routes and viewports inspected
- Production checks performed
- Provider checks performed

## Production data changes

List:

- Migration files
- Tables or columns changed
- Policies changed
- Indexes changed
- Backfills
- Production probes
- Cleanup performed

## Remaining blockers

Separate:

- Code blocker
- Provider blocker
- Founder decision
- Legal blocker
- Pilot-data blocker

## Pilot recommendation

State whether the platform is:

- Not ready
- Ready for internal QA
- Ready for invited pilot
- Ready for broader public acquisition

Do not label it ready for a broader stage merely because the build passed.

---

# 25. Final Implementation Directive

Execute this specification as a pilot completion program, not as an invitation to brainstorm.

Prioritize in this order:

1. Trust and security
2. Plain comprehension
3. First upload
4. Human review
5. Vendor usefulness
6. One-vendor monitoring
7. Customer decision
8. Internal pilot operations
9. Lifecycle communication
10. Measurement

The correct product is not the one with the most surfaces.

It is the one that lets a business send three real bills, understand one real issue, safely approve one useful next step, and keep the next bill from disappearing into the inbox.
