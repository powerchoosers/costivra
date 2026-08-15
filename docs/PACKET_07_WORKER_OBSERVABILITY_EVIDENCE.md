# Packet 07 — Worker, Observability, and Support Evidence

**Evidence date:** August 15, 2026  
**Repository:** `powerchoosers/costivra`  
**Supabase project:** `skfocjrykyvsaviyhdea` (Costivra only)  
**Runtime:** Node 24.19.0  
**Verdict:** **BLOCKED for final pilot launch**

## Current production baseline

| Item | Evidence | Result |
|---|---|---|
| Production deployment | Vercel deployment `dpl_F7E8Jf9t2XvoETWA2BJgzTkR54Jc`, created 2026-08-15 21:42 UTC | Ready |
| Deployment commit | `782905c` | Exact commit confirmed in Vercel build log |
| Public status | `https://costivra.ai/api/status` | 200; `limited` |
| Customer-facing limitation | Intake and extraction remain in private quarantine pending scanner proof | Truthful and fail-closed; the public route intentionally does not spend scanner quota on every GET |
| Vercel production environment names | `CLOUDMERSIVE_API_KEY`, `CRON_SECRET`, Supabase server key, Resend API/webhook secrets, and OpenRouter key are present by name | Configuration is present; prior live clean/inert scanner proof exists in `docs/PACKET_03_LIVE_PROOF.md`, but revalidation against this exact deployment remains pending |
| Vercel preview environment names | Scanner, publishable Supabase, Resend API, and OpenRouter names are present; server-only `CRON_SECRET`, Supabase secret, and Resend webhook secret are absent | Authenticated Preview worker routes are not release evidence |
| Local readiness | `scripts/ops-readiness.ts` with `.env.local` | Passed provider/database probes; this is not proof of matching Vercel production secrets |
| Production worker ledger | Read-only Supabase query against Costivra project `skfocjrykyvsaviyhdea` | Latest 10 inbound worker runs completed successfully through `2026-08-15T23:28:22Z`; 4 inbound events and 4 attachments remain quarantined pending scanner release |
| Public smoke | `scripts/ops-smoke.ts` against `https://costivra.ai` | Passed all six checks |
| Runtime error baseline | Vercel production request logs, bounded last-24-hour window ending at the query time | **Established: 0 5xx records and 13 4xx records**. The 4xx records are expected unauthenticated probes for protected cron/webhook routes; one separate warning recorded a malformed Server Action request at `/`. No worker 5xx error was returned. |

The public status endpoint does not expose tenant counts, queue sizes, provider credentials, or private error details. An unauthenticated cron request correctly receives 401 and is not classified as a production incident.

### Route-level baseline classification

The bounded Vercel query returned the following safe request-level groups for the current production deployment. These records contain no tenant identifiers or invoice content.

| Route and status | Count | First occurrence (UTC) | Last occurrence (UTC) | Classification | Pilot impact |
|---|---:|---|---|---|---|
| `GET /api/cron/inbound-email` → 401 | 3 | 2026-08-15 22:22:33 | 2026-08-15 23:18:50 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/cron/retention` → 401 | 3 | 2026-08-15 22:22:33 | 2026-08-15 23:18:51 | Expected unauthenticated probe | None; auth boundary working |
| `GET /api/webhooks/resend` → 405 | 3 | 2026-08-15 22:22:34 | 2026-08-15 23:18:51 | Expected method rejection | None; webhook boundary working |
| `POST /api/webhooks/resend` → 400 | 3 | 2026-08-15 22:22:34 | 2026-08-15 23:18:51 | Expected unsigned/invalid-signature rejection | None; signature boundary working |
| `POST /` → 404, warning | 1 | 2026-08-15 23:20:38 | 2026-08-15 23:20:38 | Non-pilot malformed Server Action request; monitor for recurrence | Unknown until recurrence; no customer or worker impact shown |

No 5xx response or Vercel error-level record was returned in the same window. Deployment for every row is `dpl_F7E8Jf9t2XvoETWA2BJgzTkR54Jc`.

## Runtime-path matrix

| Runtime path | Current evidence | Retry/recovery | Alert/operator surface | Pilot verdict |
|---|---|---|---|---|
| Manual intake | Prior Packet 03 live proof covered clean/EICAR manual paths; current public status remains limited and quarantined | Rescan/release only after a current-release clean result; source download is blocked while unsafe | Manage → Intake operations and event recovery view | **CONDITIONAL; exact deployment revalidation pending** |
| Inbound email | Durable queue, bounded claim, retry/dead-letter states, worker-run ledger, and monitor policy exist; latest 10 production runs completed | Manage intake event retry/rescan; dead letters remain visible | Manage → Intake operations; readiness checks worker ledger | **CONDITIONAL; scanner gate still blocks release** |
| Scanner | Prior live Cloudmersive clean/EICAR proof is documented for four synthetic paths; current deployment ID was not captured in that proof | Quarantine is retained; operator rescan is gated until current-release proof is attached | Manage scanner notice and quarantine controls | **CONDITIONAL; exact deployment revalidation pending** |
| Extraction | Recovery queue and retry route exist; source availability is checked before retry | Manage → Intake operations → Retry extraction | Recovery queue and safe failure codes | **CONDITIONAL** |
| Lifecycle email | Resend domain/webhook checks pass in local readiness; side-effect/status reconciliation exists; current Vercel window has no 5xx records | Provider events advance delivery state; failures use safe codes | Manage mail/activity surfaces | **CONDITIONAL; post-deployment observation pending** |
| Reports | Delivery-run and recipient claims, bounded retries, and provider-event reconciliation exist | Reclaim due/stale claims; inspect report delivery history | Customer Reports delivery history; Manage activity | **CONDITIONAL** |
| Customer app | Public production deployment is Ready; workspace status is operational | Customer-visible blocked/limited states are sanitized | `/api/status`; authenticated workspace | **CONDITIONAL** |
| Manage recovery | Intake recovery, retention report, system readiness, and outreach recovery routes exist | Operator actions are guarded and auditable | Manage → Intake, Settings, and Outreach recovery | **CONDITIONAL** |

## Worker contracts

| Worker | Trigger/authentication | Claim and concurrency | Bounded work | Failure classification | Idempotency/recovery |
|---|---|---|---|---|---|
| Inbound email | Vercel cron; `CRON_SECRET` | Atomic `claim_inbound_email_events` RPC | Stops before the documented invocation budget | Retry policy ends in `dead_letter`; worker ledger records safe error code | Event/provider identifiers and queue state prevent duplicate processing; Manage retry/rescan |
| Malware scan/rescan | Authenticated upload or operator rescan | Document/attachment state gate; no downstream release before clean result | Scanner budget and provider file-size/rate limits | Clean, infected, unavailable, quota, and invalid responses remain distinct | Quarantine path is private; release is an explicit state transition |
| Extraction | Intake processing or Manage retry | Document state and recovery records | Worker deadline passed into processing | Extraction failure code and source-expired state | Retry route refuses unavailable sources and does not create a second authoritative record |
| Report schedule | Vercel cron; `CRON_SECRET` | Unique delivery run plus recipient side-effect claims | One scheduled set per invocation | Safe error, bounded retry, stale-claim reclaim | Idempotency key includes schedule, scheduled time, and recipient |
| Lifecycle send | Internal event path and Resend | External side-effect claim before provider send | Provider call is isolated from durable state update | Safe provider status; ambiguous sends are reconciled from webhook/provider reference | Side-effect idempotency key and Resend webhook status reconciliation |
| Retention watchdog | Vercel cron; `CRON_SECRET` | Retention run ledger | Bounded retention batch | Report-only or explicitly approved enforcement modes | Storage-first behavior and audit retention are documented separately |

## Failure-injection and regression evidence

Existing focused tests cover bounded inbound retries, dead-letter classification, stuck processing/quarantine monitoring, duplicate-safe report claims, stale report claim recovery, Resend signature rejection, provider delivery reconciliation, retention route authentication, and Manage recovery authorization. The explicit local failure-injection slice now also covers scanner budget exhaustion, scanner timeout, provider rate limiting, duplicate side-effect claims, delayed-provider-status handling, and dead-letter retry policy. The commands used for this packet are recorded below.

Critical cron and Resend webhook responses now carry a sanitized `x-costivra-request-id` correlation header. Inbound worker ledgers also retain that identifier in safe monitoring metadata, and operational log entries use stable error codes without payloads. The helper prefers an incoming request or Vercel identifier and generates one when absent.

Manage now includes an internal **Operations** view at `/manage/operations`. It presents service readiness plus aggregate pilot-tenant health, intake attention, quarantine, extraction, report, email, monitoring, and side-effect recovery counts, with links to the corresponding operator surfaces. It also shows the ten most recent inbound-worker failures or warning runs using only a safe error code, status, and timestamp. It is authenticated, private/no-store, and intentionally omits document text, organization names, provider payloads, and secrets.

The following drills remain **not demonstrated against the live production deployment**: scanner timeout/quota simulation, duplicate production cron invocation, delayed report webhook after provider acceptance, and operator retry of a real production dead letter. Prior live scanner proof is documented separately in `docs/PACKET_03_LIVE_PROOF.md`; it predates the current deployment and is not silently reused as exact-release evidence. The remaining live drills require a production-safe test hook or an approved disposable production fixture; no real customer data or external notification was used here.

## Observability plan

The current implementation provides safe error fields and internal state ledgers for queue, report, retention, and external side effects. It does not yet provide a verified external error-monitoring destination or a post-deployment observation window for the local changes, which are not deployed in the current production commit.

Required next actions:

1. Recheck the Vercel runtime-log baseline after the next approved deployment and capture the same 24-hour and post-deployment grouping by route, safe code, deployment, and customer impact. The current pre-deployment window has 0 5xx and 13 expected 4xx records; the malformed Server Action warning is tracked as non-pilot request noise unless it recurs.
2. Recheck production `CRON_SECRET` and scanner configuration after the next approved deployment. The latest Costivra worker-run ledger is currently healthy: 10 consecutive completed runs, with four quarantined events awaiting scanner proof.
3. Assign an incident owner, support channel, hours, and response target in Packet 09.
4. Keep acquisition/outreach recovery out of the service-pilot go/no-go unless it shares a failing critical dependency.

No raw invoice text, provider response, secret, or private request body belongs in these logs or this evidence file.

## Commands and results

| Command | Result |
|---|---|
| `node --version` using bundled runtime | PASS — `v24.19.0` |
| `supabase --version` | PASS — CLI `2.76.6`; newer CLI available, but no upgrade performed in this packet |
| `supabase projects list` | PASS — Costivra `skfocjrykyvsaviyhdea` is `ACTIVE_HEALTHY`; Luxor is separate |
| Operations dashboard route test | PASS — aggregate signals and sanitized recent worker errors are covered; no document content is returned |
| Local failure-injection regression slice | PASS — 37 tests across scanner timeout/quota/rate-limit, inbound retry/dead-letter, side-effect idempotency, report retry/delivery, and Operations recovery surfaces |
| `supabase migration list --linked` | PASS inspection; **parity blocker** — remote and local histories contain many mismatches; no migration was pushed |
| `ops-readiness.ts` | PASS locally; Resend, OpenRouter, Supabase, CRON secret, and Cloudmersive configuration detected |
| `ops-smoke.ts` against `https://costivra.ai` | PASS — public site, status, cron auth, and Resend signature rejection |
| Read-only Supabase worker-ledger query | PASS — 10 latest inbound runs completed; 4 events and 4 attachments remain quarantined; no dead-letter result returned |
| `vercel logs --environment production --since 24h --status-code 5xx` | PASS — no production 5xx logs returned |
| `vercel logs --environment production --since 24h --status-code 4xx` | PASS — 13 records; expected protected-route probes, plus one separate malformed Server Action warning at `/` |
| Focused worker and correlation tests | PASS — 39 tests across 11 files; no live provider side effect was triggered |
| Focused ESLint on critical cron/webhook/worker/readiness files | PASS |
| Manage Operations snapshot route/component tests | PASS — aggregate response is private and contains no record content |
| Repository TypeScript check | **UNVERIFIED** — Node 24 `tsc --noEmit` timed out twice without diagnostics; stale compiler processes were stopped |
| `supabase db lint --linked --level warning --fail-on none` | **UNVERIFIED** — linked database lint timed out while connecting; no schema result is claimed |

## Limitations and launch blockers

- Production still reports limited document processing because the current deployment has not been revalidated against the prior live scanner proof. The production scanner secret is configured by name; the public status route deliberately stays limited and does not spend scanner quota on every GET. Prior clean/EICAR evidence is retained in `docs/PACKET_03_LIVE_PROOF.md` but is dated before the current deployment.
- The current pre-deployment Vercel request baseline is now established: 0 5xx records and 13 expected 4xx records in the bounded 24-hour query. The one malformed Server Action warning at `/` is not a worker-path failure but should be rechecked after the next deployment.
- Local and remote Supabase migration histories are not a clean one-to-one match. The mismatch must be reconciled before claiming the local Packet 07 migration is applied to production.
- No approved external error-monitoring destination is configured.
- Incident ownership and support commitments remain unassigned; Packet 09 must supply those human decisions.
