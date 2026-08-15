# Packet 05 — End-to-End Customer Pilot Evidence

**Snapshot:** 2026-08-15  
**Project:** Costivra Supabase project `skfocjrykyvsaviyhdea`  
**Environment:** local customer workspace at `http://localhost:3100`  
**Data policy:** disposable synthetic records only; no customer invoice text or real recipient was used.

## Scope

The authenticated browser test in `tests/e2e/authenticated-workspace.spec.ts` creates a unique temporary user, organization, vendor relationship, invoice, document, finding candidate, and supporting records through the Supabase admin test fixture. It signs in through the rendered login page, reads the customer workspace, configures manual vendor monitoring through the UI, verifies the durable monitoring record, checks the invoice breakdown endpoint, and removes the organization, vendor, and user in `finally` cleanup.

The test was updated for the current product routes and labels:

- `/app/opportunities` → `/app/findings`;
- the current Findings navigation landmark;
- vendor Bills → Overview for the current monitoring card;
- the current custom forwarding-method selector;
- a browser assertion that the selected method is `manual_forwarding`;
- a browser assertion that the monitoring POST returns HTTP 200 before checking Supabase state.

## Journey evidence

| Step | Browser result | Authoritative record / side effect | Verdict |
|---|---|---|---|
| Invitation | The current test creates the disposable owner directly; it does not prove an email invitation or provider delivery. | Supabase Auth user is created with confirmed test email. | **PARTIAL** |
| Activation | Password sign-in and redirect to `/app/findings` passed through the rendered browser. | Auth session and organization membership are created by the fixture. | **PASS** |
| Documents | The current fixture renders a clean, already-processed synthetic invoice; it does not upload three files through the browser. | Document, invoice, expense, line item, and analysis rows are created as disposable fixture state. | **PARTIAL** |
| Review | Invoice breakdown, line items, data-quality labels, reconciliation, policy creation, baseline review, and audit transitions passed. | `documents`, `invoices`, `expenses`, `category_analysis_runs`, `approval_policies`, `savings_outcomes`, and `audit_events` were checked. | **PASS for the covered synthetic path** |
| Finding | The current test navigates to Findings, confirms the amount is not shown without evidence, and approves the disposable finding through the rendered UI. | Disposable opportunity and action-plan rows are created and checked. | **PASS for the covered synthetic path** |
| Monitoring | Manual forwarding is selected in the rendered dialog and the API response plus durable row are checked. | `vendor_monitoring_configs.source_method = manual_forwarding`, `state = manual_tracking`, cadence `30`. | **PASS** |
| Report | Not covered by the current authenticated browser test. | No report delivery claim is made. | **BLOCKED** |
| Verification | No later period exists in the disposable scenario. | Correct state is `NOT YET ELIGIBLE`, not fabricated. | **NOT YET ELIGIBLE** |
| Isolation | The expanded browser test signs in a second disposable tenant in a separate browser context, confirms the first tenant’s finding is absent, and receives a fail-closed 401/403/404 response for the first tenant’s document/invoice probes. | The separate live RLS suite returned tenant-scoped reads and rejected a cross-tenant write. | **PASS for covered browser/API denial probes; full route matrix OPEN** |
| Cleanup | Cleanup deletes only the exact disposable organization, its generated vendor, and its generated Auth user. | Unexpected organization names cause cleanup to fail closed. | **IMPLEMENTED** |

## Commands and results

The authenticated test uses Node `v24.19.0`, `.env.local`, and `RUN_AUTHENTICATED_E2E=1`. It requires `NEXT_PUBLIC_SUPABASE_URL` plus `E2E_SUPABASE_SECRET_KEY` or the existing `SUPABASE_SECRET_KEY`.

| Check | Result |
|---|---|
| Static inspection of Packet 05 routes, fixture, and monitoring API | PASS |
| Disposable fixture cleanup after interrupted runs | PASS; three orphaned synthetic organizations, vendors, and Auth users from timed-out runs were removed by their exact unique naming boundary; remaining matching organizations: `0` |
| Authenticated Playwright run on the current local server | PASS; 1 desktop test passed in 2.2 minutes with Node 24.19.0, two disposable tenants, separate browser isolation context, exact cleanup, trace-on-failure configuration, and zero captured runtime failures |
| Live tenant-isolation integration suite | PASS; 2 tests passed in 5.56 seconds |
| Upload/client and report unit/regression tests | PASS; 6 files and 26 tests passed, including quarantined/rejected upload handling and report delivery idempotency/failure classification |
| Public desktop/mobile smoke suite | **TIMEOUT** in the dev server; not counted as a pass |
| TypeScript check with Node 24 | **TIMEOUT** after 120 seconds; no compiler result was returned |
| Three-document upload and scanner proof | NOT RUN in this slice |
| Report generation and Resend delivery | NOT RUN in this slice |
| Two-tenant browser/API isolation matrix | NOT RUN in this slice |
| Commit, push, or deployment | NOT performed |

## Limitations and blockers

1. The authenticated test fixture starts after server-side records already exist, so it does not yet prove invitation delivery, three-document browser upload, or scanner gating through the customer UI.
2. The test uses manual tracking. It does not prove a real automatic forwarding webhook or provider-delivered inbound bill.
3. Report generation/delivery, provider delivery truth, and the full browser two-tenant route matrix remain open.
4. No real customer data, customer email address, live vendor action, or live payment was used.

## No-fabrication statement

Packet 05 is **not complete**. Invitation delivery, three-document browser intake/scanning, report delivery, automatic monitoring, and the full browser isolation matrix remain explicitly open. The live RLS/API isolation suite passed, but that narrower result is not represented as full browser isolation proof. No provider delivery, scanner pass, report delivery, or verified savings outcome is represented as proven.
