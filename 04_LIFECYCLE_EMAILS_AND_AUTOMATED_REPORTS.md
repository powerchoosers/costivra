# Packet 04: Lifecycle Emails and Automated Reports

## Mission

Turn Costivra's existing email templates and report definitions into a real event-driven customer communication system. Wire the business events, add scheduled report delivery, reconcile Resend events, and keep every message evidence-safe.

This packet is for customer lifecycle and service reports. It is not the acquisition sequencer.

## Required files to inspect

```text
src/lib/email/lifecycle.ts
src/lib/email/resend.ts
src/lib/email/brand.ts
src/lib/email/contact-inquiry.ts
src/app/api/webhooks/resend/route.ts
src/app/api/portal/reports/[id]/route.ts
src/lib/category-intelligence/report-summary.ts
src/lib/documents/
src/lib/vendors/monitoring.ts
src/lib/domain/
src/lib/portal/repository.ts
src/components/portal-pages.tsx
vercel.json
```

Inspect live:

```text
external_side_effects
report_definitions
crm_email_events
savings_outcomes
opportunities
approvals
vendor_monitoring_configs
```

## Part A: Repair the lifecycle sender

The existing lifecycle kinds are a useful starting point:

- welcome activation
- upload received
- review needed
- finding ready
- approval requested
- forwarding instructions
- forwarding test result
- expected bill missed
- verification ready

Refactor the sender so it:

- uses Costivra's canonical branded HTML and text renderer;
- uses the configured sender rather than a hardcoded sender;
- writes the live `external_side_effects` schema correctly;
- uses stable source-record IDs in idempotency keys;
- records `pending`, provider acceptance, delivery, bounce, failure, and suppression;
- never claims delivery because Resend merely accepted the request;
- stores only sanitized metadata;
- returns a safe result;
- is testable without live email.

Do not depend on Resend dashboard templates. Code-based templates are acceptable and preferable when tested and observable.

## Part B: Business-event wiring

Create one event map and wire real call sites.

### `welcome_activation`

Trigger only after:

- the customer workspace exists;
- the user is authorized for the workspace;
- the welcome event has not already been sent.

### `upload_received`

Trigger after durable document creation, not before storage succeeds.

Copy must reflect the actual scan outcome:

- processing
- quarantined
- duplicate
- rejected

### `review_needed`

Trigger when a customer-actionable review state is created. Deduplicate by document and review version.

### `finding_ready`

Trigger only when:

- the finding has passed required trust review;
- it is customer-visible;
- it is not a demo example or unsupported manual note;
- evidence exists.

Say `potential value`, not `savings`, unless the value has been verified.

### `approval_requested`

Trigger only after a durable approval record exists and the recipient is authorized to decide it.

### `forwarding_instructions`

Trigger when a real vendor-monitoring configuration enters pending-test state and an authoritative intake address exists.

### `forwarding_test_result`

Trigger only after the real intake path proves the supported clean document and the monitoring transition commits.

### `expected_bill_missed`

Trigger once per missed billing cycle. Use a stable cycle key.

### `verification_ready`

Trigger only when the savings outcome status is actually `verified`.

## Part C: Report generation service

Extract report data generation from the download route into a reusable server service.

Recommended files:

```text
src/lib/reports/generate-report.ts
src/lib/reports/render-report-email.ts
src/lib/reports/schedule.ts
```

Support the current report types:

- executive value
- vendor concentration
- data coverage
- renewal calendar
- findings digest

Outputs for v1:

- branded HTML summary
- plain-text fallback
- CSV attachment where useful
- secure deep link to the customer workspace

Do not build PDF generation in this packet unless it already exists and is reliable.

## Part D: Report schedules

Add a tenant-owned schedule model, preferably a dedicated table.

Suggested `report_schedules` fields:

- id
- organization_id
- report_definition_id
- status: active, paused, archived
- cadence: weekly, monthly
- timezone
- weekday for weekly
- day_of_month for monthly
- send_time_local
- recipient_emails
- next_run_at
- last_run_at
- created_by
- updated_by
- created_at
- updated_at

Suggested `report_delivery_runs` fields:

- id
- organization_id
- report_definition_id
- report_schedule_id
- scheduled_for
- status
- external_side_effect_id
- provider_message_id
- generated_at
- completed_at
- safe_error
- created_at

Requirements:

- RLS enabled.
- Customer organization consistency enforced.
- Browser writes go through authenticated server routes.
- Recipient emails must belong to authorized workspace users for pilot v1.
- No arbitrary external distribution.
- Stable idempotency per schedule and period.
- Pausing a schedule prevents future claims.
- Editing a schedule recalculates `next_run_at` deterministically.

## Part E: Existing Reports UI

Do not add a new customer navigation page.

Extend the existing Reports surface with:

- `Download`
- `Email now`
- `Schedule`
- `Delivery history`

Schedule editor:

- weekly or monthly
- timezone
- day
- time
- authorized recipients
- pause/resume

Keep the UI compact and consistent with the customer canvas.

## Part F: Cron worker

Add a protected cron route such as:

```text
/api/cron/reports
```

Add it to `vercel.json`.

The worker must:

- authenticate with the existing cron pattern;
- atomically claim due schedules;
- generate the report from authoritative data;
- create the side-effect ledger entry before sending;
- send through Resend;
- persist provider acceptance;
- update next run deterministically;
- retry only safe failures;
- never duplicate a period's report;
- bound work per invocation.

## Part G: Delivery reconciliation

Extend the Resend webhook so delivery events reconcile both:

- CRM mailbox messages
- lifecycle/report side effects

Map at least:

- sent
- delivered
- delayed
- bounced
- complained
- failed
- suppressed

A bounce or complaint should not be shown as delivered.

## Part H: Preferences and noise control

Add customer communication preferences for:

- immediate finding alerts
- review alerts
- approval requests
- missed-bill alerts
- weekly digest
- monthly executive report

Security and account-critical emails may remain mandatory. Explain this clearly.

Do not send a weekly digest with no meaningful changes unless the customer explicitly enables empty reports.

## Tests

Add unit tests for every trigger and idempotency key.

Add integration tests for:

1. Finding trust review to finding-ready email
2. Approval creation to approval-requested email
3. Verified savings to verification email
4. Report schedule claim to delivery run
5. Duplicate cron invocation
6. Resend delivery update
7. Bounce/failure state
8. Paused schedule
9. Unauthorized recipient rejection

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

## Acceptance criteria

- Lifecycle templates have real production call sites.
- Every send is idempotent and auditable.
- Report schedules persist and run.
- The existing Reports page controls schedules.
- Resend events reconcile delivery truth.
- Potential and verified value remain separate.
- No unauthorized external recipient may be added during pilot.
- No new customer navigation page was added.
- No branch, commit, push, merge, or deployment was performed.
