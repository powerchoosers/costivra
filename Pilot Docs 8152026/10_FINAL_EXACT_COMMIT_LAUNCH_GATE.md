# Packet 10: Final Exact-Commit Pilot Launch Gate

**Snapshot date:** August 15, 2026  
**Priority:** Final  
**Pilot requirement:** Mandatory  
**Rule:** Validate one exact release candidate, not a collage of evidence from different commits

## Mission

Validate one exact Costivra commit, one Vercel deployment, one Supabase migration state, and one provider configuration as a complete pilot release candidate. Produce a truthful `PILOT_RELEASE_REPORT.md` with a ship or no-ship verdict.

This packet should add no broad feature. Fix only narrow release-blocking defects discovered during validation, then restart the affected evidence on the new exact commit.

## Prerequisites

Read the completion reports for Packets 01 through 09.

For a free or manually invoiced design-partner pilot:

- Packets 01 through 07 must pass;
- Packet 08 may be `NOT_REQUIRED_FOR_FREE_DESIGN_PARTNER_PILOT`;
- Packet 09 must pass.

For a Stripe-paid pilot:

- Packets 01 through 09 must pass;
- Packet 08 must say `TEST_MODE_BILLING_PROVEN` at minimum;
- live mode requires separate approval and proof.

If a prerequisite is blocked, produce a blocked release report rather than repeating all work.

## Exact-release record

Before testing, record:

- Git commit SHA;
- working-tree state;
- branch or tag;
- GitHub Actions run;
- Vercel project;
- Vercel deployment ID and URL;
- deployment commit;
- Node version;
- Supabase project ref;
- Supabase migration head;
- Resend domain and webhook endpoint;
- scanner provider and proof date;
- AI or extraction provider configuration;
- Stripe account and mode if applicable;
- pilot-governance decision version.

All evidence must map to this state.

If code, migration, environment, or provider configuration changes, update the release candidate and rerun affected gates.

## Workstream A: Full clean quality gate

From a clean install:

```bash
npm ci
npm run typecheck
npm run lint
npm audit --omit=dev
npm audit
npm run security:secrets
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
npm run test:integration
npm run test:integration:live
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:readiness
npm run ops:smoke
npm run ops:verify
npm run release:verify
```

Run the approved private evaluation separately:

```bash
npm run eval:pilot -- --manifest <approved-private-manifest>
```

Rules:

- no required skip;
- no stale cached result from another commit;
- no `continue-on-error`;
- no hidden failure;
- explain non-applicable commands;
- retain safe logs and artifacts.

## Workstream B: GitHub and deployment match

Verify:

- GitHub quality run is green;
- every required step executed;
- the run commit equals the release commit;
- Vercel deployment commit equals the release commit;
- the deployment is ready;
- production or preview environment variables belong to the intended services;
- `main` protection or the approved release-control alternative is active;
- the deployed app has no unresolved pilot-critical runtime error since deployment.

A successful Vercel build cannot override a red GitHub gate.

## Workstream C: Scanner proof

Reconfirm current-release evidence for:

- clean manual upload;
- inert-test manual upload;
- clean forwarded attachment;
- inert-test forwarded attachment;
- durable scan attempts;
- no extraction or preview before clean;
- status and readiness truth;
- quota and provider health.

Do not consume unnecessary provider quota. Use recent exact-configuration evidence only when still valid and clearly bound to the release.

## Workstream D: Real-data service proof

Record:

- approved corpus version;
- category scope;
- exact evaluation run;
- critical-field metrics;
- category metrics;
- scan-mode metrics;
- safety metrics;
- unsupported categories;
- final category statuses.

Every enabled automated pilot category must pass.

## Workstream E: Customer journey proof

Re-run or verify the exact-release authenticated journey:

- invitation;
- activation or password setup;
- company and location;
- three clean documents;
- scanning;
- extraction;
- review;
- correction;
- reconciliation;
- approval;
- finding;
- trust review;
- customer visibility;
- action;
- monitoring;
- report generation;
- report delivery;
- verification when eligible;
- sign-out and return;
- cross-tenant denial;
- cleanup.

The browser trace and authoritative records must agree.

## Workstream F: Lifecycle and reports

Verify current-release proof for:

- welcome or invitation;
- upload state;
- review needed;
- finding ready;
- approval request;
- monitoring instruction or result;
- expected-bill handling;
- verification ready when eligible;
- immediate report;
- scheduled report;
- duplicate-worker safety;
- Resend delivery reconciliation;
- bounce or failure truth.

## Workstream G: Production reliability and support

Review the current post-deployment observation window:

- critical error count;
- worker success;
- queue age;
- dead letters;
- quarantine age;
- report failures;
- webhook signature failures;
- email bounce and complaint indicators;
- status degradation;
- open recovery actions.

Confirm:

- incident owner;
- support channel;
- pause controls;
- current runbooks;
- no unresolved critical path error.

## Workstream H: Supabase security and recovery

Verify evidence for:

- intended project;
- migration parity;
- security advisor classification;
- privileged-function review;
- two-tenant live isolation;
- private storage and signed-download authorization;
- restore exercise;
- deletion exercise;
- approved retention policy;
- no browser secret exposure.

## Workstream I: Stripe and onboarding, when applicable

For a free or manually invoiced pilot:

- label Stripe self-serve as not required;
- ensure public self-serve is not promoted as generally available;
- ensure founder-led access does not depend on an unproven subscription.

For a Stripe-paid pilot:

- intended account alignment;
- test Checkout;
- signed webhook;
- activation link;
- Customer Portal;
- delayed-webhook recovery;
- payment failure and recovery;
- cancellation;
- duplicate and out-of-order events;
- entitlements;
- billing support runbook.

Label the result `TEST_MODE_BILLING_PROVEN` unless live mode has separate proof.

## Workstream J: Browser matrix

Check at minimum:

```text
1440 x 900
1280 x 800
1024 x 768
390 x 844
360 x 800
```

Routes and surfaces relevant to the pilot:

- homepage;
- pricing or pilot CTA;
- scan;
- login;
- signup or invitation;
- password setup;
- customer overview;
- documents;
- document detail;
- bill breakdown;
- vendor detail;
- findings and actions;
- reports;
- settings;
- billing when applicable;
- Manage overview;
- Manage intake;
- Manage invoice review;
- Manage account;
- readiness;
- recovery views.

Check:

- no horizontal overflow;
- keyboard access;
- visible focus;
- reduced motion;
- modal containment;
- scroll ownership;
- loading, empty, blocked, and error states;
- no material console errors;
- truthful mobile status;
- no tenant data in another session.

## Workstream K: Human approvals

Confirm Packet 09's decision record has:

- pilot customers or selection criteria;
- pricing or free terms;
- approved agreement;
- Privacy and Terms approval;
- UCEP disclosure;
- document consent;
- savings and fee method;
- retention;
- incident owner;
- support channel;
- provider decisions;
- pause criteria;
- exit criteria;
- live Stripe approval or not applicable.

Do not infer approval from draft documents.

## Release report

Create:

```text
PILOT_RELEASE_REPORT.md
```

Required sections:

1. Executive verdict
2. Pilot track and boundaries
3. Exact commit and deployment
4. Environment and provider map
5. GitHub and local quality gates
6. Supabase migrations and security
7. Restore and deletion proof
8. Scanner proof
9. Real invoice evaluation
10. Customer journey
11. Lifecycle email and reports
12. Worker reliability and observability
13. Stripe and onboarding, or not applicable
14. Browser and accessibility QA
15. Legal and operating approvals
16. Known limitations
17. Launch-day checklist
18. Pause and rollback plan
19. First-week monitoring plan
20. Final verdict

## Allowed final verdicts

Use exactly one:

```text
READY_FOR_SUPERVISED_PAID_PILOT
READY_FOR_FREE_DESIGN_PARTNER_PILOT
INTERNAL_TESTING_ONLY
BLOCKED
```

### `READY_FOR_SUPERVISED_PAID_PILOT`

Requires all mandatory packets, Packet 08, commercial approval, and the chosen billing mode's proof.

### `READY_FOR_FREE_DESIGN_PARTNER_PILOT`

Allows Packet 08 to be not required. Requires invite-only onboarding, free or manual billing, and all service, security, legal, and operating gates.

### `INTERNAL_TESTING_ONLY`

Use when the product can be tested by the team but customer-facing evidence or approvals remain incomplete.

### `BLOCKED`

Use when a critical security, data, scanner, release, legal, or operating gate fails.

Do not invent another softer verdict to blur a blocker.

## Launch-day checklist

The report must contain an executable launch checklist:

- [ ] Freeze the exact release candidate
- [ ] Confirm GitHub green
- [ ] Confirm deployment commit
- [ ] Confirm Supabase migration head
- [ ] Confirm scanner operational
- [ ] Confirm Resend webhook and sender
- [ ] Confirm AI provider
- [ ] Confirm status and readiness
- [ ] Confirm queues clear
- [ ] Confirm support owner online
- [ ] Confirm pilot agreement
- [ ] Confirm customer consent
- [ ] Invite only the first launch-wave tenant
- [ ] Observe first upload, scan, extraction, review, and report
- [ ] Record issues
- [ ] Decide whether to invite the next tenant

## First-week operating boundary

Even with a ready verdict:

- maximum 3 to 5 organizations;
- staged onboarding;
- manual qualification;
- human review of material findings;
- no autonomous vendor actions;
- no savings guarantee;
- direct support;
- daily review of failed intake and extraction;
- daily review of report delivery;
- daily review of bounce and complaint events;
- every false positive and correction recorded;
- rapid pause control available.

## Acceptance criteria

- One exact commit and deployment are validated.
- Every required quality step passes without skip.
- GitHub, Vercel, Supabase, Resend, scanner, and Stripe mode are mapped correctly.
- Real evaluation passes for enabled categories.
- Clean and inert scanner paths pass.
- The complete customer journey passes.
- Tenant isolation passes.
- Lifecycle and report delivery pass and reconcile.
- Current production reliability is acceptable.
- Restore and deletion are proven.
- Human approvals are complete.
- Browser matrix passes.
- `PILOT_RELEASE_REPORT.md` contains one allowed verdict.
- No evidence from another commit is used without explicit justification.
- No customer is onboarded automatically by this validation.

## Explicitly out of scope

- broad feature development;
- acquisition sequencing as a launch requirement;
- autonomous vendor action;
- expanding category scope during final validation;
- live Stripe enablement without approval;
- rewriting failed evidence as a pass;
- committing, pushing, deploying, or inviting real customers without explicit authorization.

## Completion report

The `PILOT_RELEASE_REPORT.md` is the primary completion report. Also return the shared Packet 00 report with links or paths to all evidence artifacts.
