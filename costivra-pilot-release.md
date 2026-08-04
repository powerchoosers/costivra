---
description: Finish and verify the Costivra pilot release from the current repository state without rebuilding the platform. Repair the release gate, make vendor bill monitoring durable, complete pilot operations and lifecycle emails, and prove the full customer journey.
---

# Costivra Pilot Release Repair and Completion

## Antigravity execution workflow

**Recommended repository path:** `.agents/workflows/costivra-pilot-release.md`  
**Recommended invocation:** `/costivra-pilot-release`  
**Repository:** `powerchoosers/costivra`  
**Primary branch:** create a dedicated branch or Antigravity New Worktree from the latest `main`  
**Prepared:** August 4, 2026

> This is a release-completion workflow for an existing platform. It is not a request to scaffold, redesign, or reimagine Costivra. Inspect the current implementation, preserve working behavior, close the remaining pilot gaps, and do not declare completion until every applicable release gate passes.

---

# 1. Mission

Finish the current Costivra phase so the founder can invite a small, supervised pilot cohort to use the real platform.

The finished release must let a business:

1. Understand what Costivra does within five seconds.
2. Create and enter a secure customer workspace.
3. Upload three recurring bills or contracts.
4. See honest security, extraction, review, and evidence states.
5. Correct and approve uncertain invoice data without losing provenance.
6. View a useful vendor operating page with spend, documents, contracts, findings, actions, and data coverage.
7. Configure one vendor for narrow, continuous invoice monitoring.
8. Send a real test invoice through the existing Costivra intake path.
9. Become active only after the forwarding test is actually proven.
10. Receive useful transactional lifecycle messages.
11. Review a finding and explicitly authorize the next action.
12. Later verify an outcome using deterministic calculation and source evidence.

The internal Costivra team must be able to operate the pilot from `/manage` without depending on routine Supabase-console work.

The release quality should feel calm, deliberate, simple, and trustworthy. Apple is a reference for restraint, hierarchy, motion, and reduction, not a visual template to copy.

---

# 2. How Antigravity must operate

Use **Planning Mode** and produce an implementation-plan Artifact before editing. Use **Request Review** for the plan and for any destructive or production-affecting action.

For this task:

- Prefer **New Worktree Mode** or a dedicated Git branch.
- Do not work directly on `main`.
- Do not deploy production, apply a live migration, modify Resend configuration, or send a live email without explicit approval.
- Use the built-in browser agent for visual and interaction verification.
- Use terminal commands for the repository’s actual test scripts.
- Keep work in small, reviewable vertical slices.
- After each vertical slice, run the narrowest relevant checks.
- Before handoff, run the complete applicable release gate.
- Create screenshots or browser recordings as verification Artifacts.
- Update `STATUS.md` honestly as work proceeds.
- Update `DECISIONS.md` for the durable vendor-monitoring architecture and any meaningful workflow decision.

Before planning, read completely:

- `AGENTS.md`
- `README.md`
- `STATUS.md`
- `DECISIONS.md`
- `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`
- `COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md`
- `COSTIVRA_CLIENT_ASSISTANT_V2_CODEX.md`
- `.agents/skills/costivra-product-design/SKILL.md`
- `.github/workflows/quality.yml`
- `package.json`

Inspect nearby implementation and tests before editing. Never assume a document’s proposed behavior is already installed or deployed.

---

# 3. Verified audit baseline

Re-check this baseline against the current branch before making changes. If `main` has advanced, record the new baseline and adapt the plan.

At the August 4, 2026 audit:

- Latest audited `main` commit: `5eade16352845e31c574bdf9b6d3687e930d57f3`.
- Vercel reported a successful deployment for that commit.
- GitHub Actions **Quality gates** was failing.
- The latest run passed `npm ci` and `npm run typecheck`, then failed at `npm run lint`.
- The blocking lint error was in `src/components/app-shell.tsx`: children were passed as a normal prop instead of being nested.
- Several unused imports and variables were also reported.
- The previous feature commit passed typecheck, lint, unit tests, invoice-evaluation smoke, integration tests, and build, but failed Playwright because tests still expected the old homepage headline and old disabled OAuth controls.
- `STATUS.md` claimed full P0 completion without recording the failed Playwright run or latest lint failure.

The public homepage is now substantially clearer and leads with:

> Find unnecessary costs and renewal risks in your business bills.

The customer workspace now includes:

- clearer command-center metrics,
- an activation checklist,
- a stronger vendor detail page,
- a monitoring card,
- a data-completeness card,
- a new customer assistant,
- vendor-resolution and chat schema work.

However, the audited monitoring endpoint only:

- validates access,
- verifies tenant ownership,
- calculates a response state,
- updates `organization_vendors.relationship_status`,
- writes monitoring details into audit metadata,
- returns the proposed monitoring state in the HTTP response.

It does **not** durably persist the monitoring state, approved forwarding sender, source method, expected cadence, test event, last bill, next expected bill, pause state, or failure reason.

The audited UI generated an intake address from a truncated organization ID. That is not authoritative.

The live Supabase schema already contains:

## `inbound_email_addresses`

- `id`
- `organization_id`
- `local_part`
- `domain`
- `status`
- `trusted_senders`
- audit timestamps and creator

## `inbound_email_events`

- organization and intake-address links
- Resend identifiers
- sender and recipients
- attachment counts
- processing state
- retry and lock state
- receive and processing timestamps

## `inbound_email_attachments`

- event and organization links
- immutable hash
- quarantine path
- document link
- scan state
- processing state
- retention fields

## `organization_vendors`

- organization and vendor links
- relationship status
- annualized spend
- spend cadence
- no durable vendor-monitoring fields at audit time

The implementation must reuse the authoritative intake-address and inbound-event foundation. Do not create a second email-ingestion system and do not display a generated address that has not been loaded from the database.

---

# 4. Non-negotiable Costivra boundaries

These boundaries override speed and visual convenience.

1. **AI interprets.**
2. **Deterministic code calculates.**
3. **Policies control.**
4. **Humans authorize consequential action.**
5. **Evidence proves material claims.**
6. Structured records remain authoritative; chat is not the system of record.
7. Unknown values remain unknown.
8. Potential value is not verified value.
9. Do not weaken RLS, tenant checks, private storage, malware scanning, approval controls, audit history, idempotency, or UCEP boundaries.
10. Do not expose service-role credentials or provider keys to the browser.
11. Do not make the document bucket public.
12. Do not create broad browser writes for customer financial or workflow records.
13. Do not add arbitrary SQL tools to the assistant.
14. Do not send customer data to UCEP, Apollo, or another external party without the required product, legal, consent, and audit boundaries.
15. Do not send live customer email during automated tests.
16. Do not label manual upload as automatic continuous monitoring.
17. Do not call a vendor monitored until the configured source has been proven.
18. Do not invent invoice sender domains, billing cadence, next bill dates, contract dates, savings, or account details.
19. Do not add more broad features, providers, categories, assistant modes, or CRM modules during this release sprint.
20. Preserve unrelated user changes.

---

# 5. Release order

Complete the work in this order. Do not skip ahead to visual polish while a deeper release gate remains false.

1. Establish a truthful baseline.
2. Restore a green non-destructive CI gate.
3. Design and migrate durable vendor monitoring.
4. Connect the forwarding test to the real intake pipeline.
5. Correct activation and data-completeness logic.
6. Add pilot operations to `/manage`.
7. Add the required customer lifecycle emails.
8. Prove malware-scanner readiness and operational health.
9. Apply and verify all pending migrations.
10. Run the complete disposable pilot journey.
11. Perform browser and accessibility QA.
12. Produce a final ship/no-ship report.

---

# 6. Workstream A: restore a green release gate

## Required fixes

1. Fix the `children` lint error in `src/components/app-shell.tsx` by nesting children normally.
2. Remove or use the unused imports and variables reported by lint.
3. Re-run lint and preserve zero errors.
4. Update Playwright assertions to match the intentionally revised public copy.
5. Update OAuth tests so they verify unavailable providers are hidden or honestly unavailable, matching the current product decision.
6. Do not weaken tests merely to turn the build green.
7. Inspect the GitHub Actions Node-version warnings and update official action versions when a compatible current release is available.
8. Update `STATUS.md` with the actual baseline failures and the commands used to repair them.

## Acceptance criteria

The following pass from a clean install:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
```

No required step may be skipped due to an earlier failure.

---

# 7. Workstream B: durable vendor monitoring

## Product truth

A vendor may have one of these honest monitoring modes:

- **Not configured**: no monitoring source is configured.
- **Manual tracking**: the customer uploads or manually forwards documents, but no automatic rule is proven.
- **Pending test**: an automatic email-forwarding setup is saved but has not been proven.
- **Review required**: a test message arrived, but vendor matching or document processing requires a human decision.
- **Active**: a supported test invoice arrived through the configured source and passed the required checks.
- **Paused**: the customer or operator paused monitoring.
- **Attention needed**: the configured source failed, the expected bill is late, or the intake path needs repair.

Do not use `relationship_status` as the monitoring state.

## Data-model decision

Inspect current tables and migrations first. Prefer the smallest durable design that keeps monitoring separate from the general vendor relationship.

A dedicated tenant-owned record is preferred unless an existing table cleanly represents all required behavior.

Suggested shape:

### `vendor_monitoring_configs`

- `id uuid primary key`
- `organization_id uuid not null`
- `organization_vendor_id uuid not null`
- `inbound_email_address_id uuid null`
- `source_method text not null`
- `state text not null`
- `approved_sender_address text null`
- `expected_cadence_days integer null`
- `grace_period_days integer null`
- `test_event_id uuid null`
- `last_received_event_id uuid null`
- `test_completed_at timestamptz null`
- `last_received_at timestamptz null`
- `next_expected_at timestamptz null`
- `paused_at timestamptz null`
- `last_failure_code text null`
- `created_by uuid null`
- `updated_by uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Required invariants:

- one active configuration per organization-vendor relationship,
- organization consistency across every foreign key,
- valid state and source-method constraints,
- no automatic-active state without a successful test reference,
- no next-expected date without a supported cadence,
- RLS enabled,
- tenant members receive only the minimum required read access,
- browser writes remain prohibited unless a narrow policy and server contract justify them,
- mutations use authenticated server routes,
- every material transition creates an audit event.

Record the decision in `DECISIONS.md`, including alternatives and consequences.

## Authoritative intake address

The customer UI must load the organization’s actual active `inbound_email_addresses` record and display:

```text
{local_part}@{domain}
```

Never construct the address from the organization ID.

If no active address exists:

- show a blocked state,
- explain that intake is unavailable,
- offer an authorized repair/provisioning action where appropriate,
- do not present a fake address.

## Trusted sender

Reuse the organization’s trusted-sender foundation.

A vendor-monitoring setup may select an already trusted forwarding sender or request that an owner/admin add one through the existing controlled path. Do not silently broaden accepted senders.

## API contract

Replace the current response-only monitoring behavior with a server-authoritative API that supports explicit operations such as:

- create or update configuration,
- start or restart test,
- pause,
- resume,
- record manual-tracking mode,
- repair sender or intake-address configuration.

Every operation must:

- authenticate the actor,
- authorize the role,
- scope the relationship and intake address to the active organization,
- validate source method and sender,
- enforce allowed transitions,
- persist the result atomically,
- create an audit event,
- return a safe view model.

---

# 8. Workstream C: connect the forwarding test to real intake

## Required test path

An automatic monitoring configuration becomes active only after all applicable checks succeed:

1. A signed Resend inbound webhook identifies the organization’s real intake address.
2. The envelope sender is allowed by the organization’s trusted-sender policy.
3. At least one supported attachment is present.
4. The file enters the existing durable inbound queue.
5. Malware scanning returns clean.
6. Private storage, SHA-256 provenance, and document creation succeed.
7. Extraction completes or enters an honest human-review state.
8. The document or invoice is associated with the selected vendor relationship through deterministic resolution or an explicit human decision.
9. The monitoring test event is recorded.
10. The monitoring state changes atomically to active.
11. `last_received_at` and `next_expected_at` are calculated by deterministic date code.
12. The actor and customer receive the appropriate status notification.

## Failure behavior

- Scanner unavailable: stay pending or attention-needed; quarantine the file; never call monitoring active.
- Malware detected: reject the file and mark the test failed safely.
- Unsupported attachment: show a clear failure reason.
- Untrusted sender: reject or quarantine according to existing policy; do not broaden trust automatically.
- Vendor ambiguous: enter review-required state.
- No invoice produced: do not pretend the test succeeded.
- Duplicate attachment: reconcile safely and avoid duplicate document, invoice, or activation effects.
- Provider timeout: retain a durable state and retry only safe operations.

## Manual modes

- Manual upload may create **manual tracking**, not automatic monitoring.
- Manual email forwarding may create **manual tracking** until a successful message is received and associated.
- The UI must distinguish manual tracking from automatic monitoring.

## Expected invoice monitoring

For active automatic monitoring:

- calculate `next_expected_at` from the confirmed billing cadence and latest accepted record,
- include an explicit grace period,
- run a protected periodic check using existing cron-auth and server-ledger patterns,
- create one deduplicated notification per missed cycle,
- send the expected-bill-missed lifecycle message once,
- provide a repair link to the vendor page,
- do not generate false urgency.

---

# 9. Workstream D: make activation and completeness truthful

## Customer activation

The Command Center should show a short, purposeful activation path. Keep five or six steps, not eight mislabeled steps.

Recommended steps:

1. Workspace created.
2. Company and at least one location added.
3. Three supported documents accepted into the pipeline.
4. At least one invoice or contract reviewed to an authoritative state.
5. First vendor selected for monitoring.
6. Monitoring test completed, or manual tracking clearly selected.

Completion rules must use real states.

Examples:

- Documents do not count as complete when all are quarantined, rejected, failed, or still processing.
- Review is not complete merely because no invoice currently says `needs_review`.
- Monitoring is not complete when the UI only saved a proposed rule.
- Automatic monitoring is complete only in the active state.

## Vendor data completeness

Remove hard-coded truths.

Calculate each component from current records:

- Recent source document
- Latest invoice present
- Vendor match confirmed
- Required invoice fields present
- Totals reconciled
- Account or service identity recorded when available
- Location assigned
- Contract recorded
- Contract end date recorded
- Notice period recorded
- Monitoring source configured
- Monitoring test active

Display component status beside the total.

Prefer:

> 7 of 11 recommended data points complete

over a falsely precise percentage when components are unknown or not applicable.

Never mark “Vendor matched” true simply because the page is a vendor page. Never mark “Totals reconciled” true simply because an expense exists.

## Dynamic primary action

Keep one primary action based on real state:

1. Add first bill
2. Review invoice
3. Complete missing vendor data
4. Configure monitoring
5. Send test invoice
6. Resolve monitoring review
7. Review finding
8. Review pending action
9. Review verification
10. View latest monitored bill

Avoid three competing primary buttons in the header.

---

# 10. Workstream E: make `/manage` pilot-operational

Do not build a second CRM. Use the existing Manage records and add a focused pilot operations view.

## Pilot Overview

The `/manage` overview must answer:

- Which pilot customers are active?
- Which have uploaded fewer than three documents?
- Which have quarantined, failed, or stuck files?
- Which invoices require human review?
- Which customers have no vendor monitoring configured?
- Which monitoring tests are pending or failed?
- Which expected invoices are late?
- Which findings are waiting for the customer?
- Which approvals are pending?
- Which customers have verified value?
- Who owns the next follow-up?

Use a restrained attention queue or table rather than a wall of generic cards.

Recommended columns or facets:

- Account
- Activation stage
- Documents accepted
- Intake health
- Invoice review count
- Monitored vendors
- Monitoring blockers
- Findings awaiting decision
- Pending approvals
- Verified value
- Last customer activity
- Next internal action
- Owner

## Account workspace

On `/manage/accounts/[id]`, show the customer’s pilot state close to the existing account context:

- activation progress,
- current blockers,
- intake address and health,
- pending invoice reviews,
- vendor monitoring states,
- last forwarded invoice,
- next expected invoice,
- current findings and approvals,
- verified value,
- direct links into customer and operator work.

## Operational safeguards

- Do not expose private document bytes or storage paths.
- Keep internal enrichment separate from customer facts.
- Keep cross-tenant reads server-only.
- Keep every operator mutation attributable.
- Preserve existing email, CRM, intake, and review functionality.

---

# 11. Workstream F: complete pilot lifecycle email

Use the existing server-only Resend adapter, shared Costivra email shell, idempotency controls, external-side-effect ledger, webhook reconciliation, and internal/customer authorization boundaries.

Do not create a parallel email system.

Implement the following transactional messages where the trigger does not already exist:

## 1. Welcome and activation

Trigger after customer workspace activation or first successful account entry.

Include:

- what Costivra reviews,
- the three-document first step,
- secure workspace link,
- support/reply path.

## 2. Upload received

Trigger after a manual upload is durably stored or an inbound attachment is accepted into processing.

State honestly:

- security check pending, clean, quarantined, or rejected,
- extraction status,
- workspace link.

## 3. Review needed

Trigger when an invoice enters human review.

Send to the correct customer owner/admin or internal operator according to workflow ownership. Do not expose sensitive document content in email.

## 4. Finding ready

Trigger when an evidence-backed opportunity becomes ready for customer review.

Include potential value as an estimate, not verified savings.

## 5. Approval requested

Send only to assigned approvers when a real approval record exists.

Explain what approval authorizes and link to the exact action.

## 6. Forwarding instructions

Trigger after a monitoring configuration is saved.

Include:

- selected vendor,
- actual private intake address,
- approved sender,
- narrow Gmail/Outlook rule concept,
- explicit statement that Costivra does not read the rest of the inbox,
- test instructions.

## 7. Forwarding test result

Support success, review-required, and failed outcomes.

Do not call the setup active unless the database state is active.

## 8. Expected bill missed

Send once per missed cycle after grace-period logic confirms the expected invoice has not arrived.

Use an idempotency key tied to monitoring config and billing cycle.

## 9. Verification ready

Trigger when a savings outcome has accepted baseline, later comparison, deterministic result, and is ready for customer attestation.

## Email rules

- No full account numbers.
- No full invoice body.
- No unsupported urgency.
- No guaranteed savings.
- No decorative “AI magic” language.
- Include why the recipient received the message.
- Link to the authenticated workspace.
- Record provider acceptance and later delivery state.
- Automated tests use provider test recipients or `.invalid` addresses.
- Never send to a real customer during CI.

Add focused tests for trigger conditions, idempotency, recipient scope, safe content, and failure behavior.

---

# 12. Workstream G: scanner and operational readiness

A working malware scanner is a hard gate for automatic forwarding.

## Required work

1. Inspect the existing scanner adapter and owner-readiness probe.
2. Extend `npm run ops:readiness` or its shared service so it runs the same harmless live scanner verification used by the owner readiness surface.
3. Do not log credentials or provider-sensitive diagnostics.
4. Prove:
   - clean files proceed,
   - provider-supported harmless threat fixtures are rejected,
   - unavailable or failed scans remain quarantined,
   - quarantined files do not reach extraction,
   - signed downloads remain denied,
   - retry/release is idempotent,
   - operator and customer status copy is accurate.
5. If the scanner is not configured, keep automatic monitoring unavailable and report the external blocker.

## Operations truth

`ops:verify` must not claim the document pipeline is ready merely because Resend, OpenRouter, Supabase, and cron credentials are present.

It must report separate readiness for:

- public site,
- Supabase,
- Resend sending,
- Resend receiving/webhook,
- inbound worker health,
- malware scanner,
- document intelligence,
- customer monitoring,
- optional providers.

---

# 13. Workstream H: migration and database verification

The repository contains `20260804150000_client_assistant_v2.sql`. Re-check whether it has been applied to the connected Costivra project before relying on the new fields and tables.

## Required verification

- Chat session columns exist.
- Chat message columns exist.
- `chat_message_documents` exists.
- Vendor category and domain tables exist.
- Vendor catalog extensions exist.
- Invoice vendor-resolution fields exist.
- RLS is enabled.
- Browser grants are least privilege.
- Foreign keys are indexed.
- Server-only ledgers remain browser-inaccessible.
- Supabase security and performance advisors introduce no new unresolved issue.

Apply the monitoring migration only after plan review and explicit approval.

Use reviewed migration tooling. Do not reset history or apply ad hoc DDL without recording it.

After application:

- run schema assertions,
- run tenant-isolation tests,
- run rollback-only database regressions,
- record migration versions and advisor results in `STATUS.md`.

---

# 14. Workstream I: complete disposable pilot journey

The current helper-level “pilot integration” test is not an end-to-end release test. Keep it, but add a true gated journey.

Use a disposable organization, user, vendors, documents, and provider test destinations. Refuse remote mutation unless an explicit environment flag is present. Clean up every fixture and prove cleanup.

## Required journey

1. Create a disposable customer and organization.
2. Sign in through the real login flow.
3. Add company and location details.
4. Upload three supported source documents.
5. Prove the malware scan passes for clean fixtures.
6. Prove extraction versions and evidence are created.
7. Route at least one invoice into human review.
8. Correct the invoice through the real review UI or database function.
9. Preserve original values and correction history.
10. Approve the invoice.
11. Prove exactly one expense is created.
12. Run a supported deterministic rule and create a finding.
13. Review and approve the finding/action through the customer UI.
14. Accept the deterministic baseline.
15. Configure one vendor for automatic monitoring.
16. Load the actual intake address and approved sender.
17. Send a provider-test invoice through Resend or the approved test harness.
18. Prove signed webhook delivery and durable queue creation.
19. Prove clean scanning and ingestion.
20. Associate the invoice with the configured vendor.
21. Prove the monitoring state becomes active only after success.
22. Prove last-received and next-expected dates are recorded.
23. Add a later supported comparison record.
24. Prove the savings calculation is deterministic.
25. Review and verify the result through the dedicated workspace.
26. Confirm audit events, notifications, and external-side-effect records.
27. Confirm no duplicate document, invoice, expense, action, email, or verification effect exists.
28. Delete the disposable customer and all test records safely.
29. Assert cleanup completed.

Capture the test result as a durable report Artifact.

---

# 15. Workstream J: visual, copy, responsive, and accessibility QA

The public-site clarity work is mostly complete. Do not rewrite it again without evidence.

## Public consistency fixes

- Choose one primary CTA phrase and use it consistently.
- Prefer literal action/outcome language such as “Upload 3 bills for a free review.”
- Keep examples clearly labeled as examples.
- Keep pilot pricing honest.
- Hide unavailable OAuth providers rather than showing dead controls.
- Ensure tests match intentional product copy.

## Assistant containment

The new customer assistant must not break the rest of `/app`.

Verify:

- drawer push behavior at wide desktop,
- no horizontal overflow at laptop/tablet widths,
- full-screen or sheet behavior on mobile,
- preserved conversation state,
- no clipped top bar or content,
- keyboard close and focus restoration,
- reduced-motion behavior,
- no route flash,
- no unauthorized record access.

## Browser matrix

Use the Antigravity browser agent at:

- 1440 × 900
- 1280 × 800
- 1024 × 768
- 820 × 1180
- 390 × 844
- 375 × 812

Inspect at minimum:

### Public

- `/`
- `/product`
- `/how-it-works`
- `/security`
- `/pricing`
- `/scan`
- `/signup`
- `/login`
- `/status`

### Customer

- `/app`
- `/app/vendors`
- `/app/vendors/[fixture-id]`
- `/app/documents`
- `/app/opportunities`
- `/app/actions`
- `/app/savings`
- `/app/settings`
- `/app/ask`

### Manage

- `/manage`
- `/manage/accounts`
- `/manage/accounts/[fixture-id]`
- `/manage/intake`
- `/manage/invoice-review`
- `/manage/mail`
- `/manage/settings`

For each critical flow:

- check console errors,
- check failed network requests,
- check horizontal overflow,
- check keyboard access,
- check visible focus,
- check dialog focus trapping and restoration,
- check 44px mobile touch targets,
- check loading, empty, error, attention, and success states,
- check no status is communicated by color alone,
- check no unsupported claim appears,
- check the primary action is obvious,
- check source evidence and uncertainty remain visible.

Store screenshots and recordings under:

```text
output/antigravity/pilot-final/
```

Do not commit secrets, sessions, private documents, or customer data.

---

# 16. Route acceptance criteria

## `/`

A first-time visitor can say:

> Costivra reviews recurring business bills and contracts, finds costs and renewal risks that deserve attention, shows the evidence, and keeps action under human approval.

The first CTA has one clear outcome.

## `/app`

Shows activation progress, monitored spend, findings needing review, approvals, verified value, and one next action.

## `/app/vendors/[id]`

Shows:

- authoritative vendor identity,
- real monitoring state,
- actual intake address when configured,
- approved sender,
- last accepted bill,
- next expected bill when supported,
- monitoring failure/repair state,
- data coverage components,
- spend and expense periods,
- contract and notice dates,
- findings,
- actions,
- source files,
- one dynamic primary action.

## `/manage`

Shows pilot health and blockers by customer, not merely general CRM activity.

## `/manage/intake`

Shows queue, scan state, processing state, retry state, related customer, related vendor when known, and clear operator action.

## `/manage/invoice-review`

Supports safe correction, reconciliation, approval, provenance, and idempotent expense creation.

## Lifecycle email

Each required lifecycle transition has one tested, idempotent, branded transactional message or a documented reason why an existing message already satisfies it.

---

# 17. Tests required with the implementation

Add or update tests for:

- monitoring state transitions,
- unauthorized roles,
- cross-tenant relationship IDs,
- inactive or foreign intake addresses,
- sender validation,
- active state requiring a successful test,
- duplicate test events,
- scan unavailable and malware rejection,
- ambiguous vendor routing,
- manual tracking labels,
- expected date calculations and boundaries,
- missed-cycle idempotency,
- activation checklist states,
- data-completeness components,
- lifecycle email triggers and safe content,
- external-side-effect idempotency,
- migration/RLS assertions,
- assistant drawer responsive behavior,
- updated public copy and OAuth states,
- full disposable pilot journey.

Use exact-cent money arithmetic and explicit UTC/timezone behavior where applicable.

---

# 18. Documentation truth

Update `STATUS.md` throughout the work.

Before completion, it must state:

- current commit,
- migrations applied,
- exact validation commands,
- pass/fail results,
- browser routes and viewports inspected,
- provider readiness,
- scanner readiness,
- full pilot journey result,
- remaining external blockers,
- legal/UCEP limitations,
- launch recommendation.

Remove or correct claims such as “full P0 complete” when a required gate is still open.

Update `README.md` only where the actual run or validation instructions changed.

Update `DECISIONS.md` for:

- durable vendor-monitoring storage and state machine,
- relationship between vendor monitoring and organization intake,
- expected-invoice calculation and missed-cycle handling,
- any new lifecycle email trigger architecture.

---

# 19. Final release gate

Do not call the pilot ready unless all applicable items are true.

## Code and CI

- clean working tree after committed changes,
- typecheck passes,
- lint passes with zero errors,
- unit tests pass,
- invoice-evaluation smoke passes,
- integration tests pass,
- build passes,
- Playwright passes,
- GitHub Actions is green,
- Vercel preview is ready.

## Security and data

- RLS and tenant isolation verified,
- latest migrations applied and checked,
- scanner live probe passes,
- clean/unavailable/rejected scan behavior proven,
- no public document access,
- no browser service credentials,
- monitoring cannot activate without a real test,
- external emails are idempotent and attributable.

## Product

- public promise is immediately understandable,
- three-document activation works,
- Vendor Command Page uses real data,
- monitoring is durable and repairable,
- Manage shows pilot blockers,
- required lifecycle emails work,
- full disposable pilot journey passes,
- mobile and desktop critical flows are verified.

## Business boundaries

- legal pages remain clearly marked as requiring counsel where applicable,
- no commercial UCEP data sharing is activated,
- no unsupported savings or social proof,
- no fake integration state.

If any hard gate remains open, issue a **NO-SHIP** recommendation with the exact blocker and the smallest next action.

---

# 20. Required final Artifact

At completion, create a final release report containing:

## Executive verdict

- Ship supervised pilot
- Ship internal demo only
- No ship

## Changes completed

Group by:

- release gate,
- monitoring,
- activation and vendor page,
- Manage operations,
- lifecycle email,
- security and operations,
- database,
- testing and browser QA.

## Validation table

| Command or check | Result | Notes |
|---|---|---|

## Migration table

| Migration | Environment | Result | Advisor status |
|---|---|---|---|

## Browser QA table

| Route | Viewports | Result | Artifact |
|---|---|---|---|

## Pilot journey

List every completed step and cleanup proof.

## Remaining risks

Separate:

- code risk,
- provider/configuration risk,
- legal/business risk,
- pilot-learning risk.

## Recommended founder actions

Only actions that truly require the founder, such as provider credentials, legal review, approval of production migration, pilot recruitment, or customer communication.

---

# 21. Start instruction

Begin by producing a baseline Audit Artifact that includes:

1. current branch and commit,
2. working-tree state,
3. current GitHub Actions failure,
4. current local command results,
5. current Supabase migration state,
6. current scanner readiness,
7. current Resend receiving health,
8. monitoring implementation gaps,
9. proposed vertical slices,
10. files expected to change,
11. migrations expected,
12. risks and rollback plan.

Do not edit code until the plan is coherent and reviewable. After plan approval, implement the release in the ordered workstreams above. Do not stop after surface-level UI fixes. The job is complete only when the product behavior, database state, operational controls, lifecycle communication, and full pilot journey agree.
