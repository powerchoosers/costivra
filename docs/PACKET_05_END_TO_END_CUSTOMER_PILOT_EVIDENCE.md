# Packet 05 — End-to-End Customer Pilot Evidence

**Snapshot:** 2026-08-15  
**Project:** Costivra Supabase project `skfocjrykyvsaviyhdea`  
**Environment:** local customer workspace at `http://localhost:3100`  
**Data policy:** disposable synthetic records only; no customer invoice text or customer recipient was used. The separate Packet 06 report proof used only its explicitly authorized test recipients.

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
| Invitation | The current test creates the disposable owner directly; it does not prove an email invitation or provider delivery. Invite-route tests now prove successful token exchange plus safe recovery for expired, reused, and missing tokens. | Supabase Auth user is created with confirmed test email; invite-route negative cases set no password-setup cookie. | **PARTIAL** |
| Activation | Password sign-in and redirect to `/app/findings` passed through the rendered browser. The rendered checklist initially showed `1 of 5`, durable onboarding sync remained `not_started`, later remained truthfully `2 of 5` rather than auto-activating, sign-out redirected to login, `/app/findings` required authentication again, and re-login resumed the workspace. | Auth session, organization membership, and `organization_onboarding` projection were checked. | **PASS for guarded activation/resume; invitation link delivery remains partial** |
| Documents | The browser uploaded three disposable clean invoices through the current Upload document dialog: native text, approved image-heavy public utility-bill PDF, and native text. Each returned HTTP 201 and was verified in Supabase with `security_scan_status = clean`. | Three document rows and their processed extraction/evidence records were created under the disposable organization. | **PASS for native-text and image-heavy PDF/OCR path** |
| Review | Invoice breakdown, line items, data-quality labels, and reconciliation passed. The owner also edited reviewer notes through the rendered invoice page; the PATCH returned HTTP 200 and the audit event was verified. Formal financial correction history and invoice approval remain an internal-review responsibility and are covered by the live invoice-review integration suite. | `documents`, `invoices`, `expenses`, `category_analysis_runs`, `approval_policies`, `savings_outcomes`, and `audit_events` were checked; the browser correction recorded `invoice.field_updated.reviewNotes`. | **PASS for the covered customer path; formal internal correction/approval PASS in live integration** |
| Finding | The browser journey navigates to Findings, confirms an unsupported fixture amount is not shown, and approves the disposable finding through the rendered UI. Separately, the live deterministic workflow created a synthetic telecom increase from source-linked evidence and promoted it only when two matching evidence references, rule inputs, and calculation results were present. | Browser opportunity/action rows are checked; live workflow checked `trust_state = evidence_backed`, `customer_visible = true`, `generated_by = deterministic_rule`, the expected rule/version, and at least two `opportunity_evidence` links. | **PASS for deterministic evidence-backed path; internal trust-review/browser-visible finding slice remains partial** |
| Monitoring | Manual forwarding is selected in the rendered dialog and the API response plus durable row are checked. | `vendor_monitoring_configs.source_method = manual_forwarding`, `state = manual_tracking`, cadence `30`. | **PASS** |
| Report | The authenticated browser test now opens the Reports view and downloads the disposable tenant-scoped CSV. It does not click Email now. Packet 06's current-commit production proof generated a scheduled coverage report and invoked the worker twice. | Browser response was HTTP 200 with `text/csv`; production proof recorded one run with two authorized recipient rows, both Resend `last_event: delivered`, and no duplicate run. | **PASS; outbound browser send intentionally not repeated** |
| Verification | No later period exists in the disposable scenario. | Correct state is `NOT YET ELIGIBLE`, not fabricated. | **NOT YET ELIGIBLE** |
| Isolation | The expanded browser test signs in a second disposable tenant as `viewer` in a separate browser context, confirms the first tenant’s finding is absent, receives HTTP 403 for same-tenant viewer writes, and receives fail-closed 401/403/404 responses for the first tenant’s document, invoice, signed-download, monitoring read/write, report read/email, finding write, action write, savings verification, and Manage probes. | The separate live RLS suite returned tenant-scoped reads and rejected a cross-tenant write; browser responses did not expose the first tenant’s artifact text. | **PASS for the covered customer artifact, role, and write matrix** |
| Cleanup | Cleanup deletes only the exact disposable organization, its generated vendor, and its generated Auth user. | Unexpected organization names cause cleanup to fail closed. | **IMPLEMENTED** |

## Commands and results

The authenticated test uses Node `v24.19.0`, `.env.local`, and `RUN_AUTHENTICATED_E2E=1`. It requires `NEXT_PUBLIC_SUPABASE_URL` plus `E2E_SUPABASE_SECRET_KEY` or the existing `SUPABASE_SECRET_KEY`.

| Check | Result |
|---|---|
| Static inspection of Packet 05 routes, fixture, and monitoring API | PASS; the server-side unknown bill/document guard now stops foreign or deleted IDs with a normal 404 before detail rendering |
| Disposable fixture cleanup after interrupted runs | PASS; three orphaned synthetic organizations, vendors, and Auth users from timed-out runs were removed by their exact unique naming boundary; remaining matching organizations: `0` |
| Authenticated Playwright run on the current local server | PASS; the latest direct-server run passed at 1440×900 in 6.3m with Node 24.19.0, activation projection and sign-out/resume checks, three browser-uploaded synthetic invoices, the rendered customer-side reviewer-note correction plus verified audit event, a second disposable `viewer` tenant, separate browser isolation contexts, exact cleanup, report CSV download, cross-tenant and role probes, and no captured runtime failures. Earlier matrix runs also passed at 1280×800, 1024×768, 390×844, and 360×800. |
| Live tenant-isolation/integration suite | PASS; current Node 24 live run passed 14 tests across 8 files in 11.03 seconds, including tenant isolation and the disposable pilot workflow slices. The updated atomic workflow test also passes independently with a synthetic evidence-backed deterministic finding. |
| Upload/client and report unit/regression tests | PASS; 6 files and 26 tests passed, including quarantined/rejected upload handling and report delivery idempotency/failure classification |
| Public desktop/mobile smoke suite | **TIMEOUT** in the dev server; not counted as a pass |
| TypeScript check with Node 24 | PASS after the server-side unknown bill/document 404 guard |
| `git diff --check` | Not clean because of one pre-existing trailing-whitespace line in `src/components/manage-portal.tsx`, outside Packet 05's guard |
| Three-document upload and scanner proof | PASS for three browser-uploaded synthetic invoices; each upload returned HTTP 201 and was persisted with a clean security-scan status. The image-heavy PDF/OCR path is also proven by the dedicated PDF run. A separate Cloudmersive synthetic clean probe returned `status=clean`. |
| Image-heavy PDF run (`RUN_AUTHENTICATED_E2E_PDF=1`) | PASS; the approved public utility-bill fixture returned HTTP 201, clean scanner status, completed extraction/review, and the full 1440×900 journey passed in 5.7m with no captured runtime failures. |
| Latest expanded-probe rerun | Not counted: Cloudmersive returned HTTP 202/quarantined during the repeated local run instead of the required processed HTTP 201. Exact disposable cleanup still returned `0` organizations. |
| Fresh authenticated reruns during harness/hydration correction | Two earlier reruns were not counted: one reached the 600-second budget and one completed the journey but exposed hydration mismatches. After the final shared-attribute fixes, the direct-server 1440×900 rerun passed in 5.5m. Exact scoped cleanup returned `0` matching organizations. |
| Report generation and Resend delivery | PASS: browser CSV generation passed in the latest 1440×900 run; Packet 06 current-commit live proof covers one synthetic tenant-scoped report run, two authorized recipients, duplicate invocation protection, and provider `last_event: delivered` for both messages. |
| Internal trust-review route | PASS at route-test level; the owner-only route test covers same-workspace evidence attachment, duplicate evidence de-duplication, audit recording, and rejection of out-of-scope evidence. A disposable Manage-browser attempt reached the owner route but the connected project returned its safe view-loading error before the trust controls rendered; no trust-review mutation was counted. |
| Two-tenant browser/API isolation matrix | PASS; the latest 1440×900 run authenticated the second tenant as `viewer`, verified same-tenant 403 role denials, covered document, invoice, signed download, monitoring read/write, report read/email, finding write, action write, savings verification, and Manage denial probes, and found no first-tenant finding text in the second tenant’s workspace. |
| Required viewport matrix | PASS for the recorded matrix: 1440×900 passed in 6.3m in the latest activation/role run; 390×844 passed in 4.9m and 360×800 passed in 4.8m after the final hydration fixes; earlier completed runs passed at 1280×800 and 1024×768. |
| Commit, push, or deployment | NOT performed |

## Limitations and blockers

1. The browser path proves three clean uploads including an approved image-heavy PDF/OCR fixture and clean scanner gating. The fixture still starts with server-side records for the broader review workflow, so invitation delivery remains unproven. The browser now proves a customer-side audited note correction; formal invoice correction/approval remains an internal-review operation.
2. The test uses manual tracking. It does not prove a real automatic forwarding webhook or provider-delivered inbound bill.
3. Report generation/delivery is proven locally and by Packet 06's current-commit production evidence. The expanded browser two-tenant artifact and role matrix now passes; an unknown bill/document guard returns a normal 404 before detail rendering.
4. No real customer data, customer email address, live vendor action, or live payment was used. Packet 06's report proof is limited to its separately authorized test recipients. The deterministic evidence-backed finding proof is synthetic; the connected project’s Manage browser view returned its safe loading-error state, so the route-level trust-review evidence does not replace a live Manage trace.

## No-fabrication statement

Packet 05 is **not complete**. Invitation delivery and automatic monitoring remain explicitly open. The browser role/artifact isolation matrix now passes, and the live deterministic workflow proves evidence-backed finding promotion from source-linked evidence; a full internal-operator/browser trust-review trace for the pilot tenant remains partial. Native-text and image-heavy PDF/OCR upload/scanner gating and report CSV generation passed; Packet 06 proves scheduled report delivery on the current release. No verified savings outcome is represented as proven for the browser fixture.
