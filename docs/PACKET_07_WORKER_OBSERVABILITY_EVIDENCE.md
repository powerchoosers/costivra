# Packet 07 — Worker, Observability, and Support Evidence

**Evidence date:** August 15, 2026  
**Repository:** `powerchoosers/costivra`  
**Supabase project:** `skfocjrykyvsaviyhdea` (Costivra only)  
**Runtime:** Node 24.19.0  
**Verdict:** **BLOCKED for final pilot launch**

## Current production baseline

| Item | Evidence | Result |
|---|---|---|
| Production deployment | Vercel deployment `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK`, created 2026-08-16 02:10 UTC | Ready; current aliases include `https://costivra.ai` |
| Deployment commit | Connected Vercel deployment metadata reports GitHub SHA `9a64bdf80db953bcde671cfc29ab5f509f96a7a9` on `main`; deployment is `READY` | **Verified** for deployment identity; the worktree still contains dirty Packet 07 changes beyond that commit, so those changes are not claimed as deployed |
| Scanner proof provenance | Prior live proof commit `5d2d8b37`; the current production SHA is now independently identified as `9a64bdf80db953bcde671cfc29ab5f509f96a7a9` | Exact current-release scanner proof remains open; the local scanner-budget migration `20260815120000` is still not recorded in the linked remote migration history |
| Public status | `https://costivra.ai/api/status` | 200; `limited` |
| Customer-facing limitation | Intake and extraction remain in private quarantine pending scanner proof | Truthful and fail-closed; the public route intentionally does not spend scanner quota on every GET |
| Vercel production environment names | `CLOUDMERSIVE_API_KEY`, `CRON_SECRET`, Supabase server key, Resend API/webhook secrets, and OpenRouter key are present by name | Configuration is present; prior live clean/inert scanner proof exists in `docs/PACKET_03_LIVE_PROOF.md`, but revalidation against this exact deployment remains pending |
| Vercel preview environment names | Scanner, publishable Supabase, Resend API, and OpenRouter names are present; server-only `CRON_SECRET`, Supabase secret, and Resend webhook secret are absent | Authenticated Preview worker routes are not release evidence |
| Local readiness | `scripts/ops-readiness.ts` with `.env.local` | Passed provider/database probes; this is not proof of matching Vercel production secrets |
| Production worker and support snapshot | Read-only aggregate query against Costivra project `skfocjrykyvsaviyhdea`, window starting `2026-08-15T01:12:38Z` | 100 inbound worker runs observed (query cap), all `completed` with no error codes; 0 inbound events, 0 report-delivery runs, and 1 CRM email message in `received` state in the same window |
| Public smoke | `scripts/ops-smoke.ts` against `https://costivra.ai` | Passed all six checks |
| Runtime error baseline | Vercel production request logs for deployment `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK`, bounded 24-hour window queried 2026-08-16 UTC | **Established: 0 5xx records; 5 distinct status values, with the displayed groups including 167×200, 2×401, 1×400, and 1×405.** The non-2xx records are expected protected-route/webhook boundary probes. No current deployment error-level records were returned by the grouped query. |

### Current read-only Supabase advisor and recovery snapshot

The Supabase connector was queried against Costivra project `skfocjrykyvsaviyhdea` only. No migration was applied and no data was changed.

| Check | Current result | Classification |
|---|---|---|
| Security advisors | 23 findings: 22 `rls_enabled_no_policy` INFO notices on service-only tables and 1 `auth_leaked_password_protection` WARN | The service-only tables are intentional server-boundary designs; leaked-password protection remains an Auth/settings decision and is not silently marked fixed |
| Performance advisors | 143 findings: 49 unindexed foreign keys, 9 RLS init-plan notices, 83 unused-index INFO notices, 1 multiple-permissive-policy WARN, and 1 Auth connection-strategy INFO notice | No new Packet 07 production write was made; pilot-critical findings remain for owner review and targeted remediation |
| Development branches | None returned | Hosted restore cannot be demonstrated without an approved recovery target; no paid branch/project was created |
| Applied migration history | `supabase migration list --linked` returned successfully; local/remote parity remains unresolved. Current explicit mismatches include local scanner-budget `20260815120000`, local provider-status `20260816010409`, and remote `20260816010449` without matching local entries, alongside the older historical drift | Do not claim exact-release database parity |

Advisor remediation links are retained in `docs/SUPABASE_ADVISOR_REVIEW.md`; this snapshot contains counts and classifications only and no private records or secrets.

The public status endpoint does not expose tenant counts, queue sizes, provider credentials, or private error details. An unauthenticated cron request correctly receives 401 and is not classified as a production incident.

The lifecycle-related cron routes, inbound-email worker, and four customer-facing lifecycle routes now sanitize caught email-provider exceptions into stable error codes (`vendor_monitoring_lifecycle_email_failed`, `activation_reminder_failed`, `approval_lifecycle_email_failed`, `inbound_lifecycle_email_failed`, `monitoring_test_lifecycle_email_failed`, `upload_lifecycle_email_failed`, `activation_lifecycle_email_failed`, `monitoring_instructions_lifecycle_email_failed`, and `verification_lifecycle_email_failed`) with the request correlation ID. Raw exception objects are no longer written to those worker logs. The correlation value now also flows into document audit `safe_metadata`, signed Resend delivery-event `safe_metadata`, and lifecycle/report external-side-effect `sanitized_request_metadata`; it is never included in customer-facing email content.

### Route-level baseline classification

The bounded Vercel query returned the following safe request-level groups for the current production deployment. These records contain no tenant identifiers or invoice content.

| Route and status | Count | First occurrence (UTC) | Last occurrence (UTC) | Classification | Pilot impact |
|---|---:|---|---|---|---|
| `GET /api/cron/inbound-email` → 401 | 1 | 2026-08-16 00:07:43 | 2026-08-16 00:07:43 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/cron/retention` → 401 | 1 | 2026-08-16 00:07:43 | 2026-08-16 00:07:43 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/cron/reports` → 401 | 2 | 2026-08-15 23:39:15 | 2026-08-15 23:39:15 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/cron/activation-reminders` → 401 | 2 | 2026-08-15 23:39:14 | 2026-08-15 23:39:15 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/webhooks/resend` → 405 | 1 | 2026-08-16 00:07:43 | 2026-08-16 00:07:43 | Expected method rejection | None; webhook boundary working |
| `POST /api/webhooks/resend` → 400 | 1 | 2026-08-16 00:07:43 | 2026-08-16 00:07:43 | Expected unsigned/invalid-signature rejection | None; signature boundary working |

No 5xx response or Vercel error-level record was returned in the same window. The current deployment is `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK`; the grouped status response reported 167 successful requests and the expected boundary rejections above, while the route-level error group was empty.

### Current top-issues classification

| Issue or signal | Current count/evidence | State | Retry/recovery | Customer impact |
|---|---:|---|---|---|
| Vercel 5xx or route-level error records | 0 | **Clear in the bounded deployment query** | No retry required | None observed |
| Protected cron/webhook boundary rejections | 4 reported non-2xx records: 2×401, 1×400, 1×405 | **Expected unauthenticated, invalid-signature, or method probes** | No operator recovery | None; authentication and signature boundaries are working |
| Inbound worker failures | 0 error-coded failures in the 100 observed worker runs; query was capped | **Clear in the observed Supabase snapshot** | Worker ledger and Intake recovery remain available | No affected tenant inferred from this aggregate query |
| Scanner capability | Public status remains `limited`; prior clean/inert proof predates the current deployment | **Current-release blocker, not a claimed runtime error count** | Retain quarantine; revalidate synthetic clean/inert paths before release | Document processing remains limited for pilot customers |
| Affected-tenant count | Not exposed by Vercel logs or the bounded aggregate evidence | **Unknown by design** | Use protected Manage views for tenant-scoped investigation | No tenant identity is copied into this report |

## Runtime-path matrix

| Runtime path | Current evidence | Retry/recovery | Alert/operator surface | Pilot verdict |
|---|---|---|---|---|
| Manual intake | Prior Packet 03 live proof covered clean/EICAR manual paths; current public status remains limited and quarantined | Rescan/release only after a current-release clean result; source download is blocked while unsafe | Manage → Intake operations and event recovery view | **CONDITIONAL; exact deployment revalidation pending** |
| Inbound email | Durable queue, bounded claim, retry/dead-letter states, worker-run ledger, and monitor policy exist; bounded current snapshot observed 100 completed worker runs with no error codes | Manage intake event retry/rescan; dead letters remain visible | Manage → Intake operations; readiness checks worker ledger | **CONDITIONAL; scanner gate still blocks release** |
| Scanner | Prior live Cloudmersive clean/EICAR proof is documented for four synthetic paths; current deployment ID was not captured in that proof | Quarantine is retained; operator rescan is gated until current-release proof is attached | Manage scanner notice and quarantine controls | **CONDITIONAL; exact deployment revalidation pending** |
| Extraction | Recovery queue and retry route exist; source availability is checked before retry | Manage → Intake operations → Retry extraction | Recovery queue and safe failure codes | **CONDITIONAL** |
| Lifecycle email | Resend domain/webhook checks pass in local readiness; side-effect/status reconciliation exists; current Vercel window has no 5xx records | Provider events advance delivery state; failures use safe codes | Manage mail/activity surfaces | **CONDITIONAL; post-deployment observation pending** |
| Reports | Delivery-run and recipient claims, bounded retries, and provider-event reconciliation exist | Reclaim due/stale claims; inspect report delivery history | Customer Reports delivery history; Manage activity | **CONDITIONAL** |
| Customer app | Public production deployment is Ready; workspace status is operational | Customer-visible blocked/limited states are sanitized | `/api/status`; authenticated workspace | **CONDITIONAL** |
| Manage recovery | Intake recovery, retention report, system readiness, and outreach recovery routes exist | Operator actions are guarded and auditable | Manage → Intake, Settings, and Outreach recovery | **CONDITIONAL** |

## Worker contracts

| Worker | Trigger/authentication | Claim and concurrency | Bounded work | Failure classification | Idempotency/recovery | Alert condition | Success metric |
|---|---|---|---|---|---|---|---|
| Inbound email | Vercel cron; `CRON_SECRET` | Atomic `claim_inbound_email_events` RPC | Stops before the documented invocation budget | Retry policy ends in `dead_letter`; worker ledger records safe error code | Event/provider identifiers and queue state prevent duplicate processing; Manage retry/rescan | Failed run, dead letter, stuck queue item, or aging quarantine appears in Operations/Intake | Claimed work reaches a terminal state or an explicitly scheduled retry; worker run completes |
| Malware scan/rescan | Authenticated upload or operator rescan | Document/attachment state gate; no downstream release before clean result | Scanner budget and provider file-size/rate limits | Clean, infected, unavailable, quota, and invalid responses remain distinct | Quarantine path is private; release is an explicit state transition | Scanner unavailable/quota/rate-limit state keeps the item quarantined and is visible to the operator | Every accepted file has a durable scan outcome; no unsafe file reaches extraction |
| Extraction | Intake processing or Manage retry | Document state and recovery records | Worker deadline passed into processing | Extraction failure code and source-expired state | Retry route refuses unavailable sources and does not create a second authoritative record | Failed or stale `processing` document appears in Intake/Operations with a recovery action | Each clean source produces one authoritative extraction/review or an explicit recoverable failure |
| Report schedule | Vercel cron; `CRON_SECRET` | Unique delivery run plus recipient side-effect claims | One scheduled set per invocation | Safe error, bounded retry, stale-claim reclaim | Idempotency key includes schedule, scheduled time, and recipient | Failed/bounced run, retry exhaustion, or stale claim appears in Operations/report history | Each due schedule creates at most one delivery run per recipient and reaches provider-reconciled state |
| Lifecycle send | Internal event path and Resend | External side-effect claim before provider send | Provider call is isolated from durable state update | Safe provider status; ambiguous sends are reconciled from webhook/provider reference | Side-effect idempotency key and Resend webhook status reconciliation | Failed, bounced, complained, suppressed, or ambiguous provider state is visible in Mail/Operations | One side-effect claim per event/recipient; accepted status is reconciled to provider outcome |
| Retention watchdog | Vercel cron; `CRON_SECRET` | Retention run ledger | Bounded retention batch | Report-only or explicitly approved enforcement modes | Storage-first behavior and audit retention are documented separately | Failed watchdog run or overdue report appears in readiness/Operations | Each scheduled run records a bounded result; no deletion occurs outside approved policy |

## Failure-injection and regression evidence

Existing focused tests cover bounded inbound retries, dead-letter classification, stuck processing/quarantine monitoring, duplicate-safe report claims, stale report claim recovery, Resend signature rejection, provider delivery reconciliation, retention route authentication, and Manage recovery authorization. The explicit local failure-injection slice now also covers scanner budget exhaustion, scanner timeout, provider rate limiting, duplicate side-effect claims, delayed-provider-status handling, and dead-letter retry policy. The commands used for this packet are recorded below.

Critical cron and Resend webhook responses now carry a sanitized `x-costivra-request-id` correlation header. Inbound worker ledgers also retain that identifier in safe monitoring metadata, and operational log entries use stable error codes without payloads. The helper prefers an incoming request or Vercel identifier and generates one when absent.

Manage now includes an internal **Operations** view at `/manage/operations`. It presents service readiness plus aggregate pilot-tenant health, intake attention, quarantine, extraction, report, email, monitoring, and side-effect recovery counts, with links to the corresponding operator surfaces. It also shows up to twenty recent inbound-worker, report-delivery, provider-email, extraction, and malware-scanner failures or warning states using only a safe error code, source, status, timestamp, and recovery link. A separate current-worker-health section reports bounded 24-hour worker failures, completions, scanner-unavailable items, and report failures so historical backlog is not mistaken for current degradation. Repeated identical current states deduplicate into one open signal with an occurrence count and latest timestamp; a signal disappears when its source ledger no longer reports the failure. The summary's **Open signals** value now counts those deduplicated current signals rather than summing unrelated operational metrics, and shows `Unavailable` when the snapshot is incomplete. If an operational ledger is unavailable, its metrics are shown as `Unavailable` with a safe incomplete-snapshot warning rather than as zero or a misleading success response. It is authenticated, private/no-store, and intentionally omits document text, organization names, provider payloads, and secrets. The operations, incident, and support runbooks now link directly to safe Manage routes and the draft customer communication template location; ownership and SLA commitments remain explicitly unassigned pending Packet 09.

The following drills remain **not demonstrated against the live production deployment**: scanner timeout/quota simulation, delayed report webhook after provider acceptance, and operator retry of a real production dead letter. Local regressions now prove that duplicate inbound webhook delivery is acknowledged without re-queueing and duplicate inbound cron invocations process the claimed synthetic job exactly once. Prior live scanner proof is documented separately in `docs/PACKET_03_LIVE_PROOF.md`; it predates the current deployment and is not silently reused as exact-release evidence. The remaining live drills require a production-safe test hook or an approved disposable production fixture; no real customer data or external notification was used here.

## Observability plan

The current implementation provides safe error fields and internal state ledgers for queue, report, retention, and external side effects. It does not yet provide a verified external error-monitoring destination or a post-deployment observation window tied to the local changes: connected Vercel metadata identifies production at SHA `9a64bdf80db953bcde671cfc29ab5f509f96a7a9`, but the dirty Packet 07 worktree is not claimed as deployed.

Required next actions:

1. Recheck the Vercel runtime-log baseline after the next approved deployment and capture the same 24-hour and post-deployment grouping by route, safe code, deployment, and customer impact. The current deployment grouping has 0 5xx, 167 reported 200 responses, and expected 400/401/405 boundary rejections; the route-level error group was empty.
2. Recheck production `CRON_SECRET` and scanner configuration after the next approved deployment. The current bounded Costivra worker-run snapshot is healthy: 100 observed completed runs (query cap), with no error codes; it is not proof that the scanner gate is cleared.
3. Assign an incident owner, support channel, hours, and response target in Packet 09.
4. Keep acquisition/outreach recovery out of the service-pilot go/no-go unless it shares a failing critical dependency.

No raw invoice text, provider response, secret, or private request body belongs in these logs or this evidence file.

## Commands and results

| Command | Result |
|---|---|
| `node --version` using bundled runtime | PASS — `v24.19.0` |
| `supabase --version` | PASS — CLI `2.76.6`; newer CLI available, but no upgrade performed in this packet |
| `supabase projects list` | PASS — Costivra `skfocjrykyvsaviyhdea` is `ACTIVE_HEALTHY`; Luxor is separate |
| Operations dashboard route test | PASS — aggregate signals plus sanitized recent worker/report/email errors are covered; no document content is returned |
| Operations partial-ledger regression | PASS — 2 route tests; an unavailable report ledger returns `operations_snapshot_incomplete`, a null metric, and an unavailable open-signal total instead of zero or HTTP 500 |
| Operations extraction/scanner signal regression | PASS — route test verifies safe recent extraction and scanner codes with `/manage/intake` recovery links and no document identifiers |
| Alert deduplication regression | PASS — 4 tests across the dedupe helper and Operations route; repeated safe states retain occurrence count/latest time and empty current ledgers produce no open signals |
| Local failure-injection regression slice | PASS — 37 tests across scanner timeout/quota/rate-limit, inbound retry/dead-letter, side-effect idempotency, report retry/delivery, and Operations recovery surfaces |
| Full unit suite under Node 24 | PASS — Vitest with `--pool=threads --maxWorkers=2 --reporter=dot`: 184 test files passed, 4 skipped; 727 tests passed, 6 skipped. Expected safe-error stderr from provider-failure and worker-monitoring regression cases was emitted; the command exited 0 |
| `npm run test:integration` under Node 24 | PASS — latest run: 4 test files passed, 4 credential-gated files skipped; 8 tests passed and 6 were intentionally skipped |
| `npm run test:e2e` under Node 24 | **UNVERIFIED** — the full local Playwright run remains bounded by the shared multi-process environment and produced no diagnostic result |
| Production public smoke under Node 24 | PASS — against `https://costivra.ai` with no local web server: 27 tests passed and 3 expected project skips across desktop/mobile public navigation, sanitized status, sign-in provider honesty, and worker-boundary rejection checks |
| Targeted public smoke `npm run test:e2e -- tests/e2e/public-smoke.spec.ts` | **UNVERIFIED** — the bounded 180-second targeted run also produced no diagnostics before timing out; no assertion failure is claimed |
| `npm run lint` under Node 24 | PASS — repository-wide `eslint .` completed with no diagnostics after the open-signal UI correction |
| `npm run build` under Node 24 | **PARTIAL / UNVERIFIED** — isolated real-source Webpack `compile` mode completed successfully in 3.3 minutes and listed all routes; a follow-up generated all 57 static pages but hit a temporary-output `proxy.js` → `middleware.js` rename race during finalization. A fresh default Webpack build then stalled for ten minutes without a diagnostic. The repository's default build remains unverified; no remaining application compile error is claimed |
| `supabase migration list --linked` / Supabase migration-history connector | PASS inspection; **parity blocker** — remote and local histories contain many mismatches, including the current scanner-budget migration; no migration was pushed |
| Supabase security/performance advisors and branch inventory | PASS read-only inspection — 23 security findings (22 service-only RLS INFO, 1 leaked-password WARN), 143 performance findings (10 WARN, 133 INFO), and 0 development branches; no production write was performed |
| Scanner code/provenance comparison | PASS for the prior deployment — `src/lib/security/malware-scanner-core.ts` and `scripts/verify-cloudmersive.ts` had identical Git blobs at prior proof commit `5d2d8b37` and superseded deployment commit `782905c`; current deployment identity is now verified as `9a64bdf80db953bcde671cfc29ab5f509f96a7a9`, and **database parity remains open** |
| `ops-readiness.ts` | PASS — latest Node 24 run found Resend, OpenRouter, Supabase, CRON secret, and Cloudmersive configuration; Supabase probe reports 9 inbound events total. `MALWARE_SCANNER_URL` is absent because the configured Cloudmersive boundary is the active scanner path |
| `ops-smoke.ts` against `https://costivra.ai` | PASS — latest retest passed public site, status, cron auth, and Resend signature rejection; manual authenticated cron execution was skipped because `COSTIVRA_VERIFY_CRON_TOKEN` is unset |
| Latest direct Node 24 readiness/smoke refresh | PASS — readiness found aligned Resend/domain/webhook, Supabase, OpenRouter, CRON, and Cloudmersive configuration; all six public smoke checks passed; manual cron-token execution remains intentionally skipped because `COSTIVRA_VERIFY_CRON_TOKEN` is unset |
| `npm run ops:verify` under Node 24 | PASS — readiness and all six public smoke checks passed; manual cron-token execution was intentionally skipped because `COSTIVRA_VERIFY_CRON_TOKEN` is not set |
| Prior read-only Supabase worker-ledger query | PASS — earlier snapshot showed 10 latest inbound runs completed; its 4 quarantined events/attachments are historical evidence and are superseded for current counts by the bounded aggregate snapshot below |
| Read-only production aggregate snapshot | PASS — bounded 24-hour query returned 100 observed worker runs (cap), all completed with null error codes; 0 inbound events, 0 report runs, and 1 received CRM email message; no private identifiers or content emitted |
| Vercel runtime logs for `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK`, grouped by status/level/route | PASS — 0 5xx; reported groups include 167×200, 2×401, 1×400, and 1×405; the route-level error group is empty |
| Focused worker and correlation tests | PASS — prior correlation slice passed 39 tests across 11 files; the current Packet 07 single-worker rerun passed 24 tests across 8 files; no live provider side effect was triggered |
| Sanitized critical-worker logging regression suite | PASS — 37 tests across the focused inbound/monitoring/cron and Operations slices; targeted ESLint passed for all newly changed worker and customer lifecycle routes. The broader multi-file lint retry timed out without diagnostics in the existing workspace. |
| Duplicate inbound webhook regression | PASS — `src/app/api/webhooks/resend/route.test.ts` now proves a unique-constraint duplicate is acknowledged without re-queueing; 4 route tests passed |
| Duplicate inbound cron regression | PASS — `src/app/api/cron/inbound-email/route.test.ts` proves two invocations with claim results `[job]` then `[]` call processing once; 8 route tests passed |
| Packet 07 critical regression subset | PASS — 6 test files and 25 tests passed across inbound cron, Resend webhook, Operations snapshot/deduplication, inbound monitoring, and external side-effect claims |
| Latest Packet 07 worker/lifecycle regression subset | PASS — 9 test files and 28 tests passed across inbound cron, Resend webhook, Operations, activation/approval/vendor-monitoring cron paths, vendor-monitoring portal setup, inbound intake, and alert deduplication |
| Correlation propagation regression subset | PASS — latest focused run passed 36 tests across 5 core files, including the direct internal-metadata/no-customer-content assertion; the broader 11-file correlation subset passed 49 tests, and Node 24 typecheck also passed |
| Report side-effect correlation regression | PASS — Node 24 typecheck plus report-cron, lifecycle, and side-effect claim tests passed 21/21; scheduled and manual report claims now persist the request ID in sanitized metadata |
| Resend delivery-event correlation regression | PASS — Node 24 typecheck plus Resend webhook and lifecycle tests passed 20/20; signed delivery-event records now retain the request ID in safe metadata |
| Critical-path log safety scan | PASS — all cron, Resend webhook, portal lifecycle, inbound, document, report, and security log calls are either stable-code JSON or explicitly bounded internal trace/code fields; no raw provider exception object was found |
| Current worker-health dashboard regression | PASS — focused Operations route tests passed 3/3 and targeted ESLint passed; the private dashboard exposes bounded 24-hour worker completion/failure, scanner-unavailable, and report-failure metrics with recovery links |
| Open-signal summary correctness | **IMPLEMENTED / FOCUSED VALIDATION PASS** — dashboard now counts the deduplicated current error list and shows `Unavailable` for incomplete snapshots instead of summing unrelated metric cards; targeted ESLint passed, while no separate rendered-component test is present |
| Client/server bundle boundary | PASS — sequence validation now imports the browser-safe sanitizer directly instead of importing `src/lib/manage/mail.ts` and its `node:crypto` dependency; the isolated Webpack build no longer reached the prior `node:crypto` error before stalling |
| Focused ESLint on critical cron/webhook/worker/readiness files | PASS |
| Manage Operations snapshot route/component tests | PASS — aggregate response is private and contains no record content |
| `vitest run src/app/api/manage/pilot-operations/route.test.ts --pool=threads --maxWorkers=1` | PASS — 3 tests; single-worker mode avoids the shared-workspace Vitest contention |
| Sequence validation and mail sanitizer regression tests | PASS — 15 tests across `src/lib/manage/sequences/validation.test.ts` and `src/lib/manage/mail.test.ts` after the client/server import-boundary correction |
| Combined Operations/client-boundary regression rerun | PASS — 18 tests across the Operations route, sequence validation, and mail sanitizer suites after the latest correction |
| Isolated Next Webpack compile | PASS — `next build --webpack --experimental-build-mode compile` completed in 3.3 minutes and enumerated the full App Router surface, including Packet 07 Operations and worker routes |
| Isolated Next static generation | PARTIAL — 57/57 static pages generated successfully; finalization encountered a temporary-output rename race after the prior compile phase |
| Repository TypeScript check | PASS — latest Node 24 `tsc --noEmit --pretty false` completed after the open-signal and client-boundary corrections with no diagnostics |
| `supabase db lint --linked --level warning --fail-on none` | PASS — linked Costivra database lint completed for `extensions`, `private`, and `public`; no schema errors found. CLI `2.76.6` reported a newer version is available; no upgrade was performed |

## Limitations and launch blockers

- Production still reports limited document processing because the current deployment has not been revalidated against the prior live scanner proof. The production scanner secret is configured by name; the public status route deliberately stays limited and does not spend scanner quota on every GET. Prior clean/EICAR evidence is retained in `docs/PACKET_03_LIVE_PROOF.md` but is dated before the current deployment.
- The current Vercel request baseline for deployment `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK` is established: 0 5xx records, 167 reported successful responses, and expected 400/401/405 protected-route or webhook-boundary rejections in the bounded 24-hour grouped query. The route-level error group was empty.
- Local and remote Supabase migration histories are not a clean one-to-one match. In particular, local scanner-budget migration `20260815120000` is not recorded remotely; the prior live scanner proof cannot be promoted to exact-current-release proof until that database boundary is reconciled or a current-release scan is independently evidenced.
- No approved external error-monitoring destination is configured.
- Incident ownership and support commitments remain unassigned; Packet 09 must supply those human decisions.

### Unresolved issue register

| Issue | Status | Owner | Pilot impact | Evidence/next action |
|---|---|---|---|---|
| Exact current-release scanner proof | Open | Unassigned | Document processing remains limited and quarantined | Revalidate clean/inert synthetic paths against a deployment with an independently identified source SHA and reconciled scanner-budget database state |
| Supabase migration parity, including scanner budget | Open | Unassigned | Current-release scanner behavior cannot be proven from code alone | Reconcile local/remote history before applying or promoting migrations |
| Current deployment source SHA | Verified, but Packet 07 worktree drift is not deployed | Vercel metadata identifies `9a64bdf80db953bcde671cfc29ab5f509f96a7a9`; release owner unassigned in this packet | Production identity is known, but current local worker/dashboard changes are not exact-release evidence | Deliberately release the reviewed Packet 07 changes, then capture the matching deployment SHA and post-deployment observation |
| Post-deployment observation window | Pending | Unassigned | Local worker/Operations changes lack exact-release runtime observation | Observe the next approved deployment and repeat the route/error grouping |
| External error-monitoring destination | Pending decision | Lewis/owner decision required | Internal Operations and Vercel logs remain the available alert surfaces | Approve one provider or retain the documented internal/Vercel plan |
| Incident owner, support channel, hours, response target | Unassigned | Packet 09 | Final pilot support commitment is not established | Record the human decisions before calling the pilot fully supported |
| Default production build and full/authenticated browser E2E | Unverified | Workspace/process owner | Release gates are incomplete, although compile/static/public checks pass | Run the default build in a clean single-process environment and run authenticated E2E only with explicit disposable-fixture permission |

## Acceptance audit

| Packet 07 criterion | Current verdict | Evidence and limitation |
|---|---|---|
| No unresolved critical error affects a mandatory pilot path | **CONDITIONAL** | Current deployment has 0 Vercel 5xx records and the current Supabase worker snapshot is healthy; document processing remains deliberately limited until exact scanner proof is revalidated |
| Historical errors are separated from current failures | **PASS** | Current deployment `dpl_3Kizem3mwKaEbnFJ3eaHhd3xgMTK` has its own grouped 0-5xx baseline and empty route-level error group |
| Every critical worker is idempotent and recoverable | **CONDITIONAL** | Worker contracts, durable ledgers, recovery views, and local tests are present; live duplicate/recovery drills remain open |
| Duplicate cron and webhook invocations are safe | **PASS locally / LIVE OPEN** | Local inbound cron and Resend duplicate regressions pass; no production fixture was used |
| Stuck, quarantined, failed, and dead-lettered work is visible | **PASS** | Operations and Intake surfaces expose bounded counts, safe recent signals, and recovery links; unavailable ledgers render as unavailable rather than zero |
| Alerts contain actionable safe context | **PASS** | Correlation IDs, safe codes, occurrence counts, latest timestamps, and Manage recovery links are implemented; no external provider is configured |
| Public status is sanitized and truthful | **PASS** | `/api/status` returns `limited` while intake/extraction remain quarantined and does not expose tenant, queue, or secret data |
| Internal readiness reflects current capability | **CONDITIONAL** | Readiness probes pass configured services, but scanner capability remains limited until exact-release proof and database parity are established |
| Failure-injection drills produce expected safe states | **CONDITIONAL** | Local scanner, retry, idempotency, delayed-provider, and recovery tests pass; production-safe live drills remain open |
| Operations, incident, and support runbooks are usable | **PASS** | Required scenarios, pause controls, escalation, communication-template location, and closure/review guidance are documented |
| Owner and support channel are assigned or explicitly block launch | **BLOCKED BY DECISION** | Owner, channel, hours, and response target remain explicitly unassigned pending Packet 09 |
| All required tests pass | **INCOMPLETE** | Full unit suite, repository lint, integration tests, compile/static/public browser checks pass; default production build and full/authenticated E2E remain unverified |
