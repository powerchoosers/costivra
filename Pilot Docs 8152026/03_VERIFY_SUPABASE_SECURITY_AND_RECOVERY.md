# Packet 03: Verify Supabase Security, Migration Parity, and Recovery

**Snapshot date:** August 15, 2026  
**Priority:** Critical  
**Pilot requirement:** Mandatory  
**Production project at snapshot:** `skfocjrykyvsaviyhdea` (`Costivra`)

## Mission

Prove that Costivra's production data layer is the intended project, matches the repository migrations, prevents cross-tenant access, protects private documents, and can recover or delete data through rehearsed procedures.

This packet is not complete because RLS is enabled. It is complete when the actual authorization and recovery behavior is proven.

## Current evidence to re-check

At the latest connected audit:

- the Costivra project was `ACTIVE_HEALTHY`;
- the authenticated production workflow referenced the same Costivra project ID;
- a separate `luxor-event-space` project also existed and must not be confused with Costivra;
- live tenant-isolation tests and a foreign-document download regression already existed;
- security advisors reported:
  - a mutable `search_path` on `public.update_vendor_monitoring_configs_updated_at`;
  - leaked-password protection disabled;
  - several service-oriented tables with RLS enabled and no policies;
- performance advisors reported:
  - several RLS policies repeatedly evaluating auth functions per row;
  - many unindexed foreign keys;
  - multiple permissive read policies on `vendor_categories`;
- restore and deletion exercises remained open.

Re-check the current advisor output and schema. Do not assume every advisor item is still present.

## Required reading and inspection

```text
supabase/config.toml
supabase/migrations/
src/lib/supabase/
src/lib/integration/tenant-isolation.live.integration.test.ts
src/app/api/portal/documents/
src/lib/documents/
src/lib/retention/
src/lib/manage/system-readiness.ts
.github/workflows/authenticated-e2e.yml
docs/PRODUCTION_LAUNCH_CHECKLIST.md
docs/PILOT_OPERATIONS_RUNBOOK.md
docs/PILOT_INCIDENT_RESPONSE.md
```

Also inspect:

- current project URL and ref;
- migration history;
- exposed schemas and Data API settings;
- table grants for `anon` and `authenticated`;
- storage buckets and policies;
- database functions, especially privileged functions;
- current security and performance advisors;
- backup configuration and available restore methods;
- retention and deletion code paths.

Before using Supabase CLI commands, run the relevant `--help` commands. Do not guess changing CLI syntax.

## Workstream A: Establish project identity and environment alignment

Record, without secrets:

- local Supabase project ref;
- Vercel Production Supabase URL;
- Vercel Preview Supabase URL;
- authenticated GitHub workflow Supabase URL;
- intended production project name and region;
- current migration head.

Requirements:

- Production must resolve to the Costivra project;
- test or preview environments must be clearly labeled;
- no environment may silently point to `luxor-event-space`;
- server credentials and browser publishable keys must belong to the same intended project;
- no secret or service-role key may be present in client bundles.

Add a deterministic environment-alignment check if one does not already exist.

## Workstream B: Verify migration parity

Compare repository migrations with production migration history.

Classify:

- applied and matching;
- repository-only;
- production-only;
- superseded;
- intentionally manual;
- unknown.

Do not invent migration history.

For needed schema changes:

1. inspect current Supabase documentation and changelog;
2. use `supabase migration new <descriptive-name>` or the current documented equivalent;
3. write an idempotent and reviewable migration;
4. validate in an isolated local or approved staging target;
5. run advisors after applying;
6. do not apply to production without authorization.

Produce a migration-parity report containing exact versions.

## Workstream C: Classify RLS-with-no-policy tables correctly

Several tables may intentionally be service-role-only. RLS enabled with no browser policies can represent a deliberate deny-all posture.

For each advisor item:

1. identify how the application accesses the table;
2. inspect grants to `anon`, `authenticated`, and `PUBLIC`;
3. identify any server route or privileged function that mutates it;
4. determine whether browser access is required;
5. classify:
   - intentional service-only deny-all;
   - missing tenant-scoped policy;
   - table should move to an unexposed schema;
   - unsafe grant or function;
   - obsolete table.
6. document the decision.

Do not add a broad `TO authenticated USING (true)` policy to silence the advisor.

Pay special attention to:

```text
billing_checkout_intents
billing_customers
billing_entitlements
billing_events
billing_plan_catalog
billing_subscriptions
document_security_scan_attempts
organization_onboarding
report_schedules
report_delivery_runs
report_delivery_recipients
category_eval_cases
category_evaluation_runs
category_research_runs
crm_outreach_suppressions
crm_sequence_worker_runs
```

## Workstream D: Fix real security warnings

### Mutable function search path

Inspect `public.update_vendor_monitoring_configs_updated_at`.

- set an explicit safe `search_path`;
- schema-qualify referenced objects;
- confirm whether it should be `SECURITY INVOKER`;
- review execution grants;
- add a migration and regression test.

Do not add `SECURITY DEFINER` merely to solve a permission problem.

### Leaked-password protection

Determine:

- whether the current Supabase plan exposes the feature;
- whether enabling it changes user experience or pricing;
- whether it can be enabled before the pilot;
- what compensating controls exist if it cannot.

This may remain a documented human risk decision, but it cannot be silently ignored.

### Privileged functions and views

Audit:

- every `SECURITY DEFINER` function;
- functions in exposed schemas;
- execution grants to `PUBLIC`, `anon`, and `authenticated`;
- views that may bypass RLS;
- functions used for provider budgets, workers, onboarding, billing, and reports.

Prefer `SECURITY INVOKER`. Where `SECURITY DEFINER` is truly required, place it in an appropriate non-exposed schema when practical, set a safe search path, validate the caller, and revoke default execution.

## Workstream E: Re-run tenant-isolation proof

Use two disposable organizations with separate users.

Prove:

- Org A cannot read Org B organizations, memberships, locations, vendors, documents, invoices, line items, findings, reports, onboarding, or billing state;
- Org A cannot insert or update rows into Org B;
- customer roles cannot call internal-only functions;
- a foreign private-document ID returns a safe not-found response;
- a signed storage URL is not generated for a foreign tenant;
- guessed IDs and stale browser sessions do not cross the boundary;
- internal Manage access is denied to an ordinary customer;
- service-only tables are not browser-readable.

Run the existing live suite and expand it only where current schema coverage is missing.

## Workstream F: Storage and private-file review

Verify:

- all source-document buckets are private;
- paths are tenant- or document-scoped;
- normal downloads use an authorized server route or correctly scoped signed URL;
- quarantined and infected sources cannot be downloaded or previewed;
- deleted or expired originals cannot be recovered through an old browser URL;
- storage object metadata does not expose private text;
- no public bucket contains customer documents;
- upload replacement behavior has the necessary storage permissions without broad grants.

## Workstream G: Restore exercise

Use an isolated, approved target. Never overwrite production.

The exercise must prove:

1. the selected database backup can be restored;
2. representative tenant, document, invoice, finding, and audit records are present;
3. private storage objects or the documented storage-backup method can be recovered;
4. tenant isolation remains intact after restore;
5. application migrations and restored schema are compatible;
6. recovery time and manual steps are recorded;
7. secrets are not copied into the report.

If an isolated Supabase branch or project would incur cost, obtain approval before creating it. A local restore can validate part of the procedure, but label its limitations honestly.

## Workstream H: Deletion and retention exercise

Use a disposable organization and synthetic documents.

Prove the approved sequence:

- place or remove any legal hold;
- identify all organization-owned records;
- delete or expire private storage objects first where policy requires;
- delete or anonymize database records according to the approved policy;
- preserve only legally required audit evidence;
- prevent access through old URLs;
- make retry idempotent;
- record a deletion ledger or run;
- verify the organization no longer appears to customer or operator queries;
- document data intentionally retained and why.

Do not invent retention windows. Packet 09 owns human approval of those values.

## Workstream I: Performance advisor triage

Do not perform index gardening merely to reduce advisor count.

Prioritize production paths:

- inbound email claim and retry;
- document scan attempts;
- invoice review queues;
- report scheduling and delivery;
- billing webhooks;
- onboarding;
- tenant-scoped portal reads.

For `auth_rls_initplan` warnings, prefer `(select auth.uid())` or the current documented pattern where behavior remains equivalent.

For unindexed foreign keys:

- add a covering index only when deletion, join, or production query patterns justify it;
- check for an equivalent composite index first;
- measure or explain expected benefit;
- validate write overhead.

For unused indexes:

- do not remove them solely because a young project has not accumulated usage;
- remove only with query and constraint analysis.

## Required commands and checks

Use current documented equivalents when versions differ:

```bash
supabase --version
supabase migration list --local
supabase db advisors
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:integration:live
npm run build
npm run test:e2e:authenticated
npm run ops:readiness
```

Also re-run Supabase security and performance advisors after any DDL change.

## Required evidence

- environment-to-project map;
- migration-parity report;
- advisor classification before and after;
- grants and exposed-schema review;
- two-tenant live-test output;
- foreign-document download proof;
- storage-bucket classification;
- restore exercise report;
- deletion exercise report;
- rollback notes for every migration;
- exact commit and migration head.

## Acceptance criteria

- Every intended environment points to the correct project.
- Repository and production migration histories are reconciled.
- No browser bundle contains a Supabase secret or service-role key.
- RLS-with-no-policy tables are classified rather than blindly changed.
- Mutable `search_path` warnings on pilot-critical functions are fixed.
- Privileged functions and execution grants are reviewed.
- Two-tenant live isolation passes across pilot-critical tables and routes.
- Foreign private-document access is denied without generating a signed URL.
- Restore is demonstrated in an isolated target.
- Deletion and retention behavior are demonstrated with disposable data.
- Remaining advisor items are classified with owner, severity, and launch impact.
- No destructive action touched real customer data.
- All required tests pass or unavailable live proof is reported as blocking.

## Explicitly out of scope

- creating a new paid Supabase project or branch without approval;
- broad database redesign;
- adding browser access to service-only tables;
- deleting unused indexes without evidence;
- setting legal retention windows;
- weakening tenant isolation for convenience;
- committing, pushing, applying production migrations, or deploying without explicit authorization.

## Completion report

Return the shared completion report from Packet 00 and attach or create:

```text
docs/SUPABASE_ENVIRONMENT_AND_MIGRATION_PARITY.md
docs/SUPABASE_ADVISOR_REVIEW.md
docs/PILOT_RESTORE_EXERCISE.md
docs/PILOT_DELETION_EXERCISE.md
```

These documents must contain no secrets, raw customer data, or private invoice text.
