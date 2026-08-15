# Packet 07: Harden Production Workers, Observability, and Support

**Snapshot date:** August 15, 2026  
**Priority:** High  
**Pilot requirement:** Mandatory  
**Primary systems:** Vercel, Supabase, Resend, internal Manage operations

## Mission

Make Costivra operable when a provider times out, a cron runs twice, a file gets stuck, a report fails, or a customer says, "Nothing happened." Establish current production health, repair pilot-critical worker defects, add actionable alerts, and document recovery.

A pilot is not ready when the happy path works only while Lewis watches the database manually.

## Current evidence to re-check

At the latest audit:

- the newest Vercel production deployment was ready;
- recent runtime history contained clusters of inbound-worker, outreach, owner-portal, onboarding, and billing errors;
- some errors predated the latest deployment and could already be repaired;
- an internal watchdog and intake recovery surfaces existed;
- `/status` provided a sanitized customer view;
- external error monitoring and complete operating ownership remained open;
- restore and deletion were covered separately in Packet 03.

Re-query logs by deployment and event time. Do not carry old error counts forward as current facts.

## Pilot-critical runtime paths

Treat these as critical:

- public website and authentication;
- manual document upload;
- malware scanning and quarantine;
- inbound Resend webhook;
- inbound email worker;
- extraction and review creation;
- finding and trust-review workflow;
- lifecycle email;
- report schedule worker;
- report delivery;
- customer workspace;
- internal Manage intake and recovery;
- status and readiness routes.

The acquisition sequencer is not required for a service pilot. It must not destabilize critical workers, but incomplete acquisition automation does not block a founder-led pilot unless it shares unsafe infrastructure.

## Required reading and inspection

```text
vercel.json
src/app/api/cron/
src/app/api/webhooks/
src/lib/email/
src/lib/documents/
src/lib/reports/
src/lib/manage/system-readiness.ts
src/components/manage-intake-operations.tsx
src/components/manage-portal.tsx
scripts/ops-readiness.ts
scripts/ops-smoke.ts
docs/PRODUCTION_LAUNCH_CHECKLIST.md
docs/PILOT_OPERATIONS_RUNBOOK.md
docs/PILOT_INCIDENT_RESPONSE.md
docs/PILOT_SUPPORT_RUNBOOK.md
```

Inspect live:

- Vercel deployments and runtime logs;
- cron schedule and invocation history;
- Supabase worker-run, retry, dead-letter, side-effect, and audit tables;
- Resend webhook and delivery failures;
- status/readiness output;
- recent support-relevant error states;
- any connected observability provider.

## Workstream A: Establish a current production error baseline

Use an explicit window, such as:

- since the latest production deployment;
- previous 24 hours;
- previous 7 days for recurrence.

Group by:

- deployment;
- route or worker;
- safe error code;
- count;
- first and last occurrence;
- affected tenant count;
- retry state;
- customer impact;
- resolved, stale, or current.

Do not copy private request bodies or invoice text into the report.

Produce a top-issues table and distinguish:

- current blocker;
- repaired but awaiting regression;
- expected unauthenticated probe;
- test-only noise;
- stale pre-deployment event;
- non-pilot feature;
- unknown.

## Workstream B: Repair pilot-critical current failures

Prioritize by customer harm:

1. security or cross-tenant risk;
2. document loss or duplicate processing;
3. worker failure that leaves data stuck;
4. incorrect customer status;
5. email or report loss;
6. operator recovery failure;
7. non-pilot feature failure.

For each fix:

- identify the authoritative state transition;
- preserve idempotency;
- add a safe error code;
- add regression coverage;
- avoid retry storms;
- avoid logging private payloads;
- verify on the exact deployment.

Do not suppress an error merely to clean the log.

## Workstream C: Worker contracts

For each critical worker, document and test:

- trigger and authentication;
- claim query or function;
- concurrency behavior;
- maximum work per invocation;
- timeout budget;
- retryable versus terminal errors;
- ambiguous external-effect handling;
- idempotency key;
- dead-letter or quarantine state;
- operator retry path;
- alert condition;
- success metric.

At minimum cover:

```text
inbound email worker
malware scan or rescan
extraction worker or invocation
report schedule worker
lifecycle send path
retention watchdog if active
```

A duplicate cron invocation must not duplicate a document, email, report, action, or verified outcome.

## Workstream D: Observability

Use Vercel's current observability capabilities and, when approved, one external error-monitoring destination.

Minimum signals:

- request error rate;
- cron invocation success;
- worker claim and completion counts;
- queue age;
- dead-letter count;
- quarantine age;
- scanner unavailable rate;
- extraction failure rate;
- webhook signature failures;
- report failure and retry count;
- email bounce and complaint rate;
- database connection or timeout errors;
- customer-facing status degradation.

Requirements:

- structured safe error codes;
- correlation IDs across webhook, worker, document, and side effect;
- organization IDs may be included only in protected internal telemetry;
- no raw invoice text;
- no secrets;
- no full provider responses;
- alert links open the relevant Manage recovery view when possible;
- alerts deduplicate and resolve.

If no external provider is approved, create a minimal internal and Vercel-native plan and mark the external-monitoring item pending.

## Workstream E: Readiness and status truth

Internal readiness should answer:

- are required secrets configured;
- is the intended Supabase project reachable;
- is the scanner configured and recently proven;
- are Resend domain and webhook configured;
- are critical cron routes authenticated;
- are queues aging;
- are dead letters present;
- are report schedules progressing;
- is a provider degraded.

Public status should answer only safe service-level questions.

Do not:

- consume paid provider requests on every GET;
- expose queue sizes tied to a tenant;
- expose secret fingerprints publicly;
- claim operational from configuration alone;
- claim an outage when an unauthenticated probe correctly receives 401.

## Workstream F: Failure-injection drills

Using disposable data and safe provider simulations, prove:

- duplicate inbound webhook;
- duplicate cron;
- scanner timeout;
- scanner quota unavailable;
- extraction exception;
- report provider timeout before acceptance;
- report provider acceptance followed by delayed webhook;
- invalid Resend signature;
- stale queue item;
- dead-letter retry;
- customer-facing blocked state;
- operator recovery;
- no duplicate external side effect.

For ambiguous sends, reconcile before retrying.

## Workstream G: Support and incident runbooks

Create or update:

```text
docs/PILOT_OPERATIONS_RUNBOOK.md
docs/PILOT_INCIDENT_RESPONSE.md
docs/PILOT_SUPPORT_RUNBOOK.md
```

Include:

- named owner or a clearly marked unassigned field;
- support channel;
- hours and response target;
- severity levels;
- failed upload;
- quarantined file;
- failed extraction;
- incorrect extraction;
- incorrect finding;
- provider outage;
- missed expected bill;
- report delivery failure;
- email bounce or complaint;
- billing issue when Packet 08 is active;
- data-isolation concern;
- pause controls;
- escalation;
- customer communication template locations;
- post-incident review;
- links to safe dashboards and Manage views.

Do not fabricate the incident owner or support commitments. Packet 09 records the final human decisions.

## Workstream H: Pilot operating dashboard

Create or verify one internal view showing:

- service readiness;
- recent critical errors;
- stuck intake;
- quarantined files;
- extraction failures;
- report failures;
- upcoming and missed monitoring events;
- email bounce and complaint indicators;
- open recovery actions;
- pilot tenant health.

This can be a focused Manage surface or an existing observability dashboard. Do not build a decorative executive dashboard that lacks actionable links.

## Required commands and checks

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
npm run ops:verify
```

Also run focused worker and failure-injection tests and inspect Vercel logs after the candidate deployment.

## Required evidence

- exact production deployment and commit;
- current error baseline by deployment;
- fixed issues and regression tests;
- worker contract table;
- duplicate-invocation proof;
- failure-injection results;
- alert and recovery screenshots or artifacts;
- status/readiness output;
- runbooks;
- unresolved issue register with owner and pilot impact;
- post-deployment observation window.

## Acceptance criteria

- No unresolved critical error affects a mandatory pilot path.
- Historical pre-deployment errors are not confused with current failures.
- Every critical worker is idempotent and has a recovery state.
- Duplicate cron and webhook invocations are safe.
- Stuck, quarantined, failed, and dead-lettered work is visible to operators.
- Alerts contain enough context to act without exposing private data.
- Public status is sanitized and truthful.
- Internal readiness reflects current capability.
- Failure-injection drills produce expected safe states.
- Operations, incident, and support runbooks are usable.
- An owner and support channel are assigned or explicitly block final launch.
- All required tests pass.

## Explicitly out of scope

- building a full enterprise observability platform;
- requiring the acquisition sequencer for the service pilot;
- sending real incident notifications without approval;
- broad UI redesign;
- masking errors rather than fixing them;
- exposing customer data in logs;
- committing, pushing, deploying, or configuring a paid monitoring provider without explicit authorization.

## Completion report

Return the shared completion report from Packet 00. Add:

| Runtime path | Current error rate or count | Retry/recovery | Alert | Pilot verdict |
|---|---:|---|---|---|
| Manual intake | ... | ... | ... | PASS / BLOCKED |
| Inbound email | ... | ... | ... | ... |
| Scanner | ... | ... | ... | ... |
| Extraction | ... | ... | ... | ... |
| Lifecycle email | ... | ... | ... | ... |
| Reports | ... | ... | ... | ... |
| Customer app | ... | ... | ... | ... |
| Manage recovery | ... | ... | ... | ... |
