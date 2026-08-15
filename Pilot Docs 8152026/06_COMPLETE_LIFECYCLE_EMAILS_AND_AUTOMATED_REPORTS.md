# Packet 06: Complete Lifecycle Emails and Automated Reports

**Snapshot date:** August 15, 2026  
**Priority:** High  
**Pilot requirement:** Mandatory  
**Primary systems:** Resend, Supabase, Vercel cron, customer Reports UI

## Mission

Prove that Costivra communicates important customer events and scheduled reports exactly once, with truthful delivery status and evidence-safe language. Repair missing call sites, idempotency, scheduling, or reconciliation only where current inspection shows a gap.

This packet covers customer lifecycle and service reports. It does not cover acquisition sequencing.

## Current evidence to re-check

At the latest audit:

- `costivra.ai` was verified for sending and receiving;
- the production Resend webhook was enabled for delivery, bounce, complaint, failure, suppression, click, open, and inbound events;
- authentication, invitation, intake, and monitoring messages had delivered;
- lifecycle templates and report-scheduling foundations existed;
- current-release proof for every business-event trigger was incomplete;
- activation, onboarding, review, and certain billing-related messages remained open;
- provider acceptance needed to remain distinct from delivery;
- scheduled report UI and tables existed, but the exact current worker path still needed end-to-end proof.

Re-check Resend domains, webhooks, recent logs, routes, tables, and current commit.

## Required reading and inspection

```text
src/lib/email/lifecycle.ts
src/lib/email/resend.ts
src/lib/email/brand.ts
src/lib/email/contact-inquiry.ts
src/app/api/webhooks/resend/route.ts
src/lib/reports/
src/app/api/portal/reports/
src/app/api/cron/
src/lib/category-intelligence/report-summary.ts
src/lib/documents/
src/lib/vendors/monitoring.ts
src/lib/domain/
src/lib/portal/repository.ts
src/components/portal-pages.tsx
vercel.json
.env.example
docs/PRODUCTION_LAUNCH_CHECKLIST.md
```

Inspect live tables:

```text
external_side_effects
crm_email_messages
crm_email_events
report_definitions
report_schedules
report_delivery_runs
report_delivery_recipients
report_communication_preferences
opportunities
approvals
savings_outcomes
vendor_monitoring_configs
```

Inspect Resend without exposing API keys:

- domain state;
- webhook endpoint;
- subscribed event types;
- recent message states;
- bounce and complaint events;
- inbound webhook events;
- suppression behavior.

## Core delivery invariant

A lifecycle or report message must have:

1. a real authoritative source event;
2. an authorized recipient;
3. a stable idempotency key;
4. a pending side-effect ledger entry before send;
5. provider acceptance recorded separately;
6. delivery, bounce, complaint, suppression, delay, or failure reconciled from signed provider events;
7. no duplicate send when the worker or webhook retries;
8. safe, evidence-aware copy.

## Workstream A: Build the event matrix

Create one current source-of-truth map containing:

| Event | Authoritative trigger | Recipient rule | Idempotency key | Suppression rule | Deep link |
|---|---|---|---|---|---|

At minimum include:

- workspace or invitation welcome;
- upload received;
- upload quarantined or rejected;
- review needed;
- finding ready;
- approval requested;
- forwarding instructions;
- forwarding test passed or failed;
- expected bill missed;
- verification ready;
- activation reminder;
- activation complete;
- report sent;
- payment failed and recovered only if Packet 08 is active.

Remove or deprecate orphan templates only after proving they have no intended call site.

## Workstream B: Verify each trigger

### Welcome or activation

Send only after:

- the workspace and membership exist;
- the recipient is authorized;
- the activation or invitation state is durable;
- the message has not already been sent.

### Upload received

Trigger only after durable document creation.

Copy must match the actual state:

- processing;
- quarantined;
- duplicate;
- rejected.

Do not say analysis started when the scanner has not passed.

### Review needed

Trigger when a customer-actionable review item exists. Deduplicate by document and review version.

### Finding ready

Trigger only when:

- required trust review passed;
- the finding is customer-visible;
- evidence exists;
- it is not a demo item;
- potential value is not described as verified savings.

### Approval requested

Trigger after the approval record commits and only to a user authorized to decide.

### Forwarding instructions and test result

Instructions require a real monitoring configuration and authoritative inbound address. Test success requires a supported clean attachment and a committed monitoring transition.

### Expected bill missed

Send once per vendor and billing cycle. A worker retry must not create another message.

### Verification ready

Trigger only when a savings outcome is actually `verified`.

### Activation complete

Trigger from the durable activation state, not from a browser celebration screen.

## Workstream C: Verify report generation

Use one reusable server-side report service. Avoid embedding authoritative logic only in a download route.

For current report types, verify:

- source records are tenant-scoped;
- generated values use correct currency and periods;
- potential and verified values are separated;
- unsupported claims are omitted;
- report links require authentication;
- CSV attachments do not expose another tenant;
- HTML and plain-text variants contain the same material truth;
- empty reports follow the user's communication preference.

Do not add PDF generation merely for decoration if the current PDF path is not reliable.

## Workstream D: Verify schedules and recipients

For `report_schedules` and related tables:

- tenant ownership is enforced;
- only authorized workspace users can be recipients during pilot;
- cadence, timezone, day, and local time are deterministic;
- editing recalculates `next_run_at`;
- paused schedules cannot be claimed;
- one schedule-period pair creates at most one delivery run;
- schedule deletion or archive does not erase delivery history;
- entitlement limits are enforced when paid billing is active;
- founder-led pilot workspaces are not accidentally locked out.

Customer Reports UI should provide:

- Download;
- Email now;
- Schedule;
- Pause or resume;
- Delivery history;
- clear pending, delivered, bounced, and failed states.

Do not create another top-level navigation page.

## Workstream E: Cron and worker reliability

Verify the protected report worker:

- uses the established cron-auth pattern;
- atomically claims due schedules;
- bounds work per invocation;
- generates from authoritative data;
- creates the side-effect ledger before provider send;
- handles provider timeout safely;
- updates `next_run_at` deterministically;
- retries only safe failures;
- does not send a second copy after an ambiguous provider outcome without reconciliation;
- records safe errors;
- emits useful logs and alerts without private report content.

Test duplicate invocation and concurrent claims.

## Workstream F: Resend webhook reconciliation

Verify signed events reconcile:

- lifecycle messages;
- scheduled reports;
- customer mailbox messages where applicable;
- inbound document events.

Map at least:

```text
sent
delivered
delayed
bounced
complained
failed
suppressed
```

Rules:

- provider acceptance is not delivery;
- bounce, complaint, failure, and suppression cannot remain displayed as delivered;
- unknown provider message IDs are logged safely and do not mutate unrelated records;
- duplicate webhook delivery is idempotent;
- signature failures are rejected and alerted;
- provider events cannot cross tenants through an incorrect lookup.

## Workstream G: Communication preferences and noise control

Verify preferences for:

- immediate finding alerts;
- review alerts;
- approval requests;
- missed-bill alerts;
- weekly digest;
- monthly executive report.

Security and account-critical messages may be mandatory. Explain this in the UI.

Do not send empty recurring reports unless the customer explicitly enables them.

## Workstream H: Current-commit live proof

Using permitted test recipients and a disposable organization, prove:

1. welcome or invitation;
2. upload state;
3. review needed;
4. finding ready;
5. approval requested;
6. monitoring instructions or result;
7. verified outcome when eligible;
8. `Email now` report;
9. scheduled report;
10. bounce or failure reconciliation using a safe test method;
11. duplicate worker invocation;
12. unauthorized recipient rejection.

Record provider message IDs, side-effect IDs, delivery-run IDs, and final states. Do not expose recipient addresses in public artifacts.

## Required commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:readiness
npm run ops:smoke
```

Add or run focused lifecycle and report verification commands if they exist. Do not rely exclusively on a manual dashboard check.

## Required evidence

- current Resend domain and webhook status;
- event matrix;
- call-site coverage;
- idempotency-key tests;
- report schedule claim test;
- duplicate-worker test;
- signed webhook reconciliation test;
- live message matrix with provider and internal IDs;
- customer delivery-history screenshot or Playwright artifact;
- proof that potential and verified values remain separate;
- proof that unauthorized external recipients are rejected.

## Acceptance criteria

- Every required lifecycle template has a real, tested call site.
- Every send is idempotent and auditable.
- Scheduled reports claim, generate, and send once.
- Authorized recipients and tenant boundaries are enforced.
- Delivery history reflects signed provider events.
- Bounce, complaint, failure, and suppression are truthful.
- Customer preferences suppress optional noise correctly.
- No unsupported claim or unverified savings language is sent.
- Current-commit live proof covers the pilot-critical matrix.
- No acquisition sequence is required for the service pilot.
- All required tests pass.

## Explicitly out of scope

- customer-acquisition sequencing;
- unsolicited prospect email;
- arbitrary external report distribution;
- a new customer navigation page;
- broad email-template redesign;
- live billing messages when Packet 08 is not active;
- exposing raw provider responses;
- committing, pushing, deploying, or sending to real customers without explicit authorization.

## Completion report

Return the shared completion report from Packet 00 and include:

| Message or report | Source event | Internal side-effect ID | Provider message ID | Final state | Duplicate test |
|---|---|---|---|---|---|
| ... | ... | ... | ... | delivered / bounced / failed / suppressed | PASS / FAIL |
