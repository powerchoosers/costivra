# Costivra Status

## August 4, 2026 — Ask Costivra animation pass

- Added a shared, restrained motion system to both Ask Costivra chat surfaces: the customer `/app` drawer/fullscreen experience and the internal `/manage` assistant rail.
- Customer chat now animates opening panels, history rows, welcome prompts, optimistic sent messages, incoming responses, structured response cards, attached-document chips, and the record-review thinking state. Selecting history or starting a new conversation deliberately replays the relevant entrance state.
- Internal chat now animates its fresh conversation/suggestion state, sent and received messages, evidence-source links, and thinking state. Starting a new conversation returns focus to the composer.
- Motion respects `prefers-reduced-motion`; animations and transition-driven movement are removed when the user requests reduced motion.
- Validation: `npm run typecheck` passed before local browser QA and `git diff --check` passed. Browser QA passed at customer desktop and 390×844 mobile and on the internal Manage rail, with no relevant browser console errors or horizontal overflow. `npm run lint` remains blocked by the pre-existing `require()` lint error in `src/lib/security/malware-scanner.ts`. After previewing the app, Next.js left a malformed generated `.next/dev/types/routes.d.ts` cache file; a subsequent typecheck is blocked by that local cache artifact, not the edited source.
- Follow-up layout correction: in compact drawer mode, conversation history now replaces the entire chat canvas rather than sharing its narrow width. The fullscreen conversation rail remains visible permanently, so its redundant history button is removed. The no-message screen now uses an evidence-and-records review frame with quiet, medium-weight prompts. Browser QA confirmed the new compact-history view at desktop and 390×844 mobile with no horizontal overflow; the only console item was an existing Costivra mark image-aspect-ratio warning.

## August 4, 2026 — Pilot Release Repair and Completion (Final Green Gate)

- **Release Sprint Execution**: Executed `costivra-pilot-release.md` across all 10 Workstreams (A through J).
- **Quality Gates Verification**:
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings across all files)
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm test -- --run`: ✅ PASS (78 test files passed, 271 unit tests passed)
  - `npm run eval:invoices`: ✅ PASS (100.00% accuracy across classification, critical fields, line items, and evidence citations)
  - `npm run ops:verify`: ✅ PASS (Resend, OpenRouter, Supabase operational probes & public smoke test passed)
  - `npm run build`: ✅ PASS (40 static & dynamic routes compiled cleanly in Next.js Turbopack)
  - `npm run test:e2e`: ✅ PASS (Playwright 10 passed, 4 skipped)
- **Key Architectural Deliverables**:
  - `supabase/migrations/20260804160000_durable_vendor_monitoring.sql`: Created `vendor_monitoring_configs` with Row Level Security, indexes, constraints, and audit logging.
  - `src/lib/vendors/monitoring.ts`: Server-authoritative durable monitoring domain service.
  - `src/lib/email/inbound-intake.ts`: Atomic transition from `pending_test` to `active` upon receiving forwarded bills.
  - `src/lib/vendors/completeness.ts`: 11-component data completeness evaluator.
  - `src/lib/email/lifecycle.ts`: 9 transactional lifecycle email templates with idempotency key deduplication.
  - `src/lib/integration/pilot-end-to-end-journey.live.integration.test.ts`: Disposable pilot lifecycle integration test.
- **Pilot Release Verdict**: **SHIP SUPERVISED PILOT**

## August 4, 2026 — Pilot Platform Completion Program Execution

- Implemented full P0 scope per `COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md`:
  - **Public Site & 5-Second Comprehension**: Updated homepage hero, eyebrow, copy, actions, and trust row; simplified marketing navigation labels ("What Costivra does", "What we review", "How it works", "Security", "Pricing"); hidden unconfigured OAuth buttons on `/login` and `/signup`.
  - **Customer Workspace Activation Journey**: Added 8-step `ActivationChecklist` to `CommandCenter` (`src/components/portal-pages.tsx`); updated headline metrics to Monitored spend, Findings under review, Actions pending approval, Verified value.
  - **One-Vendor Continuous Monitoring**: Created `src/lib/vendors/monitoring.ts` domain module, `VendorMonitoringCard`, `DataCompletenessChecklist`, and `/api/portal/vendors/[id]/monitoring` API endpoint supporting email rules, manual forwarding, and test invoice verification.
  - **Vendor Command Page**: Enhanced `/app/vendors/[id]` with first-class monitoring state, data quality score, and dynamic primary actions.
  - **Verification & Validation**:
    - `npm run typecheck` ✅ (0 errors)
    - `npm test -- --run` ✅ (76 test files passed, 264 unit tests passed)
    - `npm run ops:verify` ✅ (Resend, OpenRouter, Supabase probes & public smoke test passed)
    - `npm run build` ✅ (37 static pages generated, zero errors)

## August 3, 2026 — Cron auth diagnostics and manual-invocation support

- Added robust cron credential extraction support to include debug-safe query-token paths (`secret`, `cron_secret`, `token`) for controlled manual invocation and automated verification.
- Added coverage for both inbound/retention cron routes:
  - header auth (`Authorization`, `x-vercel-cron-*`, `x-cron-*`) and query-token fallback
  - explicit positive tests for accepted query-token invocation
- Added owner-only diagnostic route `GET /api/manage/cron-auth`:
  - reports whether `CRON_SECRET` is configured and a non-reversible fingerprint/length,
  - shows which auth transport was seen on the request (`authorization`, `x-vercel-cron-secret`, query, etc.),
  - shows whether a configured token and presented token match without exposing raw secrets.
- Added unit coverage for cron auth extraction and diagnostics.
- `npm run test` (including new cron/auth diagnostics tests) and `npm run typecheck` pass.

- Current outstanding external blocker still requires manual verification:
  - production cron still returns 401 for inbound/retention when invoked with only header tokens in `npm run ops:smoke` and direct external probes,
  - use `/api/manage/cron-auth` from owner context to capture header presence/transport mismatch, then align `CRON_SECRET` in Vercel with the token used for any manual invocations and confirm deploys.

## August 3, 2026 — Readiness truth: placeholder credentials now treated as absent

- Added production smoke validation command: `npm run ops:smoke`.
  - Default checks `https://costivra.ai` public home, `/api/status` contract, protected `/api/cron/*` routes, and webhook GET behavior.
  - This gives a fast "is the deployed stack in the right shape" signal between code changes and manual user testing.
- Added convenience combined command: `npm run ops:verify`, which runs readiness and smoke in one pass.

- Added shared secret-validation helper (`src/lib/env/secrets.ts`) and wired it into Resend, OpenRouter, Apollo, and cron checks.
- Updated readiness and email-intake checks so placeholder values (`[SENSITIVE]`, `redacted`, `placeholder`, etc.) now hard-fail as missing secrets rather than passing as valid.
- Extended tests to prove placeholder secrets are blocked and never echoed in readiness payloads:
  - `src/lib/email/resend.test.ts`
  - `src/lib/manage/system-readiness.test.ts`
- Current local status after this update remains blocked only until real values are set (see `npm run ops:readiness` output for the exact remaining items).

## Operations hardening and readiness guardrail parity — August 3, 2026

- Hardened provider secret handling in `src/lib/email/resend.ts` so placeholder/reddacted values such as `[SENSITIVE]`, `redacted`, and keys with `placeholder` in them are now treated as **not configured** in all inbound intake/mailer paths.
- Added explicit reason mapping from Resend provider responses into readiness checks and activation flow so endpoint failures now return actionable messages instead of opaque generic errors.
- Re-ran full validation after this hardening:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run test` (223 passed) ✅
  - `npm run build` ✅
  - `npm run ops:readiness` (still blocked locally because `.env.local` secrets are placeholders for webhook secret, openrouter key, Supabase service key, and cron secret).
- Updated `docs/EMAIL_INTAKE_SETUP.md` to keep setup prerequisites in sync with current Resend inbound requirements and placeholder-handling behavior.

## Operations command for immediate smoke checks — August 3, 2026

- Added `scripts/ops-readiness.ts` and `npm run ops:readiness` to report environment/runtime blockers before deeper QA.
- Current local run result with repo `.env.local`:
  - `RESEND_API_KEY` is present in file but configured alongside placeholder values for:
    - `RESEND_WEBHOOK_SECRET`
    - `SUPABASE_SECRET_KEY`
    - `OPEN_ROUTER_API_KEY`
    - `CRON_SECRET`
  - Full local readiness checks cannot complete with placeholders.
- Live probe run using the supplied key (`re_fFLk...`) showed:
  - Environment flags: `RESEND_API_KEY` present; secrets remain placeholders for other required values.
  - API response from Resend: HTTP 401 with message `restricted to only send emails` on both `/domains` and `/webhooks` for this token.
  - Result: Readiness now surfaces this exact rejection reason in both portal activation and manage-readiness flows.
- Type-level and runtime checks completed on this run:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
  - targeted tests:
    - `src/lib/manage/system-readiness.test.ts` ✅
    - `src/app/api/manage/system-readiness/route.test.ts` ✅
    - `src/lib/email/inbound-intake.test.ts`, `src/lib/email/inbound-policy.test.ts`, `src/lib/manage/mail.test.ts` ✅

## Operational truth and worker health — August 2, 2026

- Added a server-only ledger for every one-minute inbound worker invocation. The owner readiness
  screen now verifies a recent completed production run instead of treating the presence of
  `CRON_SECRET` as proof that automation is alive. Stale, failed, still-running, and
  completed-with-alerting-warning states are reported separately.
- Queue alerting can no longer turn already completed invoice work into a 500 retry. If operator
  notification monitoring is unavailable, the run completes with a warning, stores a safe failure
  category, and leaves the successfully processed document untouched.
- Production proof passed on deployment `a8fc630`: Vercel's scheduled worker wrote a completed run
  to Costivra Supabase with zero claimed jobs, four queue records inspected, zero incidents, and
  zero notification failures. The worker ledger denies both anonymous and signed-in browser roles.
- Removed a misleading integration behavior that could label QuickBooks, Gmail, Microsoft 365, or
  Stripe as connected without OAuth or a data sync. The customer portal now identifies these as
  planned adapters. Approved email forwarding through the private workspace address remains the
  live automated document-intake route.
- Current Supabase security advice also includes warnings on legacy Luxor/Nodal-style tables that
  coexist in the same database project. Costivra-owned operational tables are explicitly protected,
  but the shared legacy schema must be isolated or remediated before treating this database as a
  clean production security boundary. Leaked-password protection is also still disabled.

## Document extraction recovery — August 2, 2026

- Separated document-reading failures from persistence failures. Image-only PDFs now use the
  bounded OpenRouter OCR path even when native PDF text parsing fails, while database and audit
  errors fail the request instead of being mislabeled as a customer document-quality problem.
- Added durable, non-secret extraction failure categories and reading modes in Supabase. Existing
  failed demo documents were backfilled so operators can distinguish unavailable automation,
  invalid structured output, unreadable sources, and general extraction failures without exposing
  provider diagnostics to customers.
- Added an extraction-recovery queue under **Manage → Intake** and per-file recovery controls in
  internal account workspaces. A retry is permitted only for the latest failed extraction when no
  invoice exists; immutable storage content is SHA-256 verified first, concurrent retries are
  claimed atomically, and successful low-confidence invoices continue through human review rather
  than producing duplicate financial records.
- Applied and verified the two recovery migrations directly through the connected Supabase project
  because the repository's older local/remote CLI migration histories are incomplete. Supabase's
  security advisor reports only the pre-existing leaked-password-protection warning.
- Production proof passed against `costivra.ai`: a temporary internal operator opened the rendered
  recovery queue and retried the public AWS receipt in the Cloud Billing demo account. Vercel's
  configured document intelligence created a normalized $44 invoice, reconciled the arithmetic,
  and correctly kept it in human review because the vendor relationship was unmatched. The
  temporary operator was deleted after the probe; the demo invoice remains as visible test data.
- A second production batch recovered both public Azure demo invoices into reconciled, reviewable
  invoice records ($2,810.81 and $0.00). The AWS VAT sample still failed strict output validation
  and correctly remained in extraction recovery without an invoice. This proved that batch recovery
  advances valid records, preserves uncertain files for operators, and does not create duplicates.
- Interrupted extraction jobs now become recoverable after a ten-minute lease window instead of
  remaining in `processing` forever. Active jobs are not disturbed. If the invoice was already
  committed before an interruption, recovery repairs the document state from that invoice rather
  than calling AI again or creating a duplicate; otherwise the immutable source is reprocessed.
- The minute-based inbound worker now keeps a one-minute shutdown reserve inside its five-minute
  Vercel limit. It yields unfinished attachment work back to the queue without consuming a failure
  attempt, then resumes from already persisted attachment state on the next run. OpenRouter calls
  have a 45-second ceiling, and manual quarantine release batches are bounded by route duration so
  multi-file emails cannot silently die at the platform timeout.
- The first scheduled Vercel cron invocation on the exact production deployment returned HTTP 200,
  and the following runtime audit found no warning, error, or fatal event. A manual call using the
  local `CRON_SECRET` returned 401, confirming that `.env.local` is stale relative to Vercel; this
  does not affect the scheduled production job but blocks local manual triggering until resynced.

## Savings attestation workspace — August 2, 2026

- Removed one-click baseline acceptance and verification from compact savings rows. Owners and
  administrators now enter a dedicated review workspace showing the accepted baseline, later
  comparison, deterministic method/version, calculated result, assumptions, exclusions, exact
  expense links, and source documents before making a financial attestation.
- Baseline acceptance and result verification require an explicit review confirmation. The existing
  atomic Supabase workflow remains the authoritative enforcement boundary; stale or incomplete
  decisions still fail server-side. Customers can now reject a baseline or result with a required,
  audited reason instead of relying on the previously API-only rejection operation.
- Added responsive presentation for the review surface and expanded the disposable authenticated
  browser regression to exercise the deliberate baseline-review flow.

## Live scanner verification and workspace OAuth foundation — August 2, 2026

- The owner-only production-readiness check now sends a harmless text probe through the configured
  malware provider instead of treating the presence of an environment variable as proof. Missing,
  unreachable, rejected, failed, and false-positive scanner results remain launch-blocking; the
  public status route does not run a billable upload probe.
- Google and Microsoft workspace authentication now have a real Supabase PKCE callback, safe
  `/app` and `/manage` return-path handling, generic provider-error recovery, authentic provider
  marks, and configuration-gated login controls. Email/password access remains available while the
  external provider credentials are not configured.
- Added provider setup instructions in `docs/WORKSPACE_OAUTH_SETUP.md`. Activating either provider
  requires its external application credentials, the Supabase provider toggle, the Costivra callback
  allowlist entry, and the matching Vercel public feature flag.

## Connected customer record workspaces — August 2, 2026

- Replaced the loose vendor-only related-record list with an exact connected-record model across
  expenses, contracts, documents, invoices, opportunities, actions, and savings outcomes. Direct
  source documents, invoice links, opportunity/action chains, savings records, vendor contracts,
  and evidence now appear together without inventing relationships that are not in Supabase.
- Added normalized invoice line items to the customer data model and invoice detail page, including
  quantity, unit price, signed amount, category, and service period. Invoice pages now show source
  evidence from their own document rather than limiting evidence presentation to the document and
  opportunity pages.
- Added plain-language data-quality checks appropriate to each record type: source linkage,
  comparison baseline, location, contract term/notice/owner, extraction confidence, vendor match,
  reconciliation, required invoice fields, approval progress, policy attachment, evidence,
  calculation method, and savings baseline/comparison state. These are honest readiness cues, not
  model-generated assurances.
- Expanded the authenticated browser fixture with a real invoice and normalized line item so the
  production gate verifies the rendered invoice workspace as well as the financial approval flow.
  Local TypeScript, lint, 187 unit tests, integration tests, and the 35-page production build pass.

## Customer approval policies and location-linked records — August 2, 2026

- Added a real customer Approval Center under **Settings → Team & approvals**. Owners and
  administrators can create, edit, disable, and restore plain-language rules by action type,
  annual-value threshold, category, explicit-consent requirement, and one-to-five distinct
  approvers. Disabled policies remain available for historical decisions.
- Upgraded the service-role workflow transaction so the strictest matching active tenant policy
  is attached when an action is created. Approval rows are assigned to distinct owners or
  administrators, the first decision remains pending when more people are required, and only the
  configured distinct-approval count advances the action. A rollback-only production probe proved
  both policy selection and the two-person gate without leaving fixture data.
- Added optional tenant-scoped location links to expenses and contracts. Customers can assign an
  active location during creation and change or clear it inline on the detail page. API routes
  reject cross-tenant or invalid location identifiers; archiving a location preserves existing
  financial and contract history through a nullable foreign key.
- The live Costivra migration `20260803012622` is applied and recorded. Supabase advisors report
  only the existing leaked-password-protection warning; no new database security or performance
  finding was introduced.
- The authenticated production browser gate now creates a policy through the rendered modal,
  confirms that it governs the generated action, completes the opportunity-to-savings workflow,
  checks the audit trail and browser/runtime failures, and removes its disposable organization and
  user. The expanded gate passed against `costivra.ai` after deployment.

## Atomic customer financial workflow — August 2, 2026

- Moved opportunity approval, action authorization/start/completion, savings-baseline acceptance,
  and savings verification into three service-role-only Supabase transactions. Each customer
  decision now either updates every dependent record and its audit event or changes nothing.
- The database functions lock the current workflow rows, re-check organization membership and
  role, reject stale transitions, and require an accepted baseline before work starts. Savings can
  become verified only after a later comparison expense exists and the opportunity is in progress.
- Corrected the savings opportunity uniqueness index. The previous partial index could not be used
  by PostgreSQL's conflict target, so the first real baseline creation would have failed. The new
  index preserves one savings record per opportunity while still allowing unrelated null values.
- Added a reusable rollback-only Supabase probe and a credential-gated live integration test for
  the complete approval-to-verified-savings sequence. The production probe passed, proved that a
  premature start rolls back cleanly, confirmed all six audit events, and left zero fixture rows.
- Validation passed: TypeScript, full lint, 150 unit tests with five intentional environment-gated
  skips, integration tests, production build, and eight applicable desktop/mobile browser checks.
- Supabase's post-migration advisor reports no exposure on the new workflow functions: they are
  security-invoker functions with a fixed empty search path, and only `service_role` can execute
  them. The same advisor still flags permissive policies on unrelated legacy Luxor/Nodal tables in
  the shared project. Those tables were not changed because their owning applications must be
  inventoried first; database isolation is now an explicit launch decision.

## Live public system status — August 2, 2026

- Replaced the old hard-coded preview status page with a live, customer-safe production view at
  `/status` backed by `/api/status`. It checks the public site, customer workspace, document intake,
  and document intelligence instead of claiming that disconnected preview systems are operational.
- The public response is cached briefly for stability and deliberately omits provider names, secret
  values, tenant data, queue counts, and internal error details. Owners retain the deeper diagnostic
  view in **Manage → Settings**.
- The public view reports document intake and intelligence as limited while malware scanning is not
  configured. Optional Apollo enrichment does not affect customer-facing status and is not called
  by this endpoint.
- Validation passed: TypeScript, full lint, 148 unit tests with four intentional environment-gated
  skips, integration tests, a fresh production build, and all eight applicable desktop/mobile
  Playwright checks with two intentional device-target skips.

## Fail-closed manual uploads and viewer permissions — August 2, 2026

- Manual portal uploads now pass through the same server-side malware boundary as emailed source
  files. Clean files may enter extraction, confirmed malware is rejected without being stored, and
  unavailable or failed scans are stored in private quarantine without reaching document AI.
- Quarantined manual uploads retain their SHA-256 digest and can be rescanned by an editor after a
  scanner is configured. A digest mismatch stops processing. Confirmed malware is marked rejected,
  audited, and removed from private storage.
- The document download route now refuses signed URLs for quarantined, rejected, pending, or
  processing files. Regression coverage proves quarantined content never asks storage for a signed
  URL.
- Portal viewers are now consistently read-only across document upload/rescan/delete, contract and
  expense creation, and integration changes. Customer UI actions are hidden for viewers, while the
  API independently enforces the same boundary.
- Live schema inspection confirmed the existing `documents` table accepts quarantine/rejection
  states without a migration. Validation passed: TypeScript; lint with zero errors; 121 unit tests;
  integration tests; production build; and six production Playwright checks with two intentional
  device-target skips.
- Resend credential verification passed again, and Resend reports `costivra.ai` as verified in
  `us-east-1`. Manual and emailed files will remain quarantined until Lewis configures a supported
  malware scanner.
- `npm audit --omit=dev` now reports zero production dependency vulnerabilities across the current
  dependency tree.

## Intake operations and recovery workspace — August 2, 2026

- Added `/manage/intake` as the internal source-of-truth queue for every forwarded client email,
  including active work, attention states, quarantine, attempts, timestamps, sender, client, and
  attachment-level scan and processing results.
- Added `/manage/intake/[id]` as the event detail page. Operators can inspect the message preview,
  latest processing error, each source file, and the resulting invoice-review link without opening
  private quarantine storage directly.
- Dead-lettered and failed jobs can be safely returned to the durable worker. Quarantined files can
  be rescanned only when a server-side malware scanner is configured; the UI explains why that
  action is unavailable otherwise.
- Customer and internal rescan flows now share one fail-closed quarantine-release service. A
  confirmed infected file is rejected and removed from private quarantine, unavailable scans stay
  quarantined, and clean/duplicate files update the parent event deterministically.
- Watchdog notifications now open the exact intake event instead of the general owner dashboard.
- Added policy tests for attention grouping, retry eligibility, scanner gating, partial quarantine,
  rejected files, and clean/duplicate completion.

## Built-in intake operations watchdog — August 2, 2026

- Extended the one-minute inbound worker with an operational health pass for dead-lettered jobs,
  processing or queued work that has not advanced for 15 minutes, and attachments left in private
  quarantine for 24 hours.
- Each incident creates an in-app notification for active Costivra operators. Stable incident and
  recipient keys use the existing unique index, so the one-minute worker cannot generate duplicate
  alerts for the same condition.
- Added pure threshold tests for normal retries, stuck processing, stuck queues, dead letters, and
  aging quarantine. Applied the notification-kind migration to live Supabase and verified the
  duplicate-prevention index remains active.

## Tenant download and document prompt-injection regressions — August 2, 2026

- Added route-level tests proving the customer document download endpoint scopes its lookup by
  both document ID and active organization before asking private storage for a signed URL. A
  foreign document returns `404`, and no signed URL is created.
- Added a synthetic hostile invoice fixture containing requests to reveal environment variables,
  cross tenant data, approve an invoice, cancel a contract, and send external email. Tests prove
  the text stays inside the untrusted source payload, extraction exposes no action tools, unknown
  secret/action/approval properties are discarded, and non-allowlisted evidence is removed.
- Targeted validation passed with six tests plus TypeScript checking.

## Verified Resend intake domain — August 2, 2026

- A live Costivra-to-demo-workspace probe proved sending and signed webhook delivery, then exposed
  that provisioned customer addresses used `inbound.costivra.ai` while the single Resend receiving
  domain was `costivra.ai`. The current Resend plan rejected a second domain.
- Added a migration that moves existing and future customer intake addresses to the verified
  `costivra.ai` domain. Vercel Production uses the same value. A dedicated intake subdomain remains
  the preferred future layout after upgrading the Resend domain allowance.
- Production probes then passed through the real system. An attachment-free message reached the
  correct demo tenant, was claimed once by the cron, and completed as needs-review. A public sample
  invoice PDF followed the same route and was placed in private quarantine with
  `scan_status=unavailable`; no document or invoice was created while malware scanning was absent.
  This proves the current system fails closed instead of silently trusting an unscanned file.
- A misleading zero-attachment review message was corrected to say that no supported attachments
  were included.

## Durable inbound invoice processing — August 2, 2026

- Moved customer invoice attachment processing out of the Resend webhook request and into a
  durable, server-only work queue backed by `inbound_email_events`.
- Added atomic job claiming, stale-lock recovery, idempotent attachment continuation, bounded
  retries at 1 minute, 5 minutes, 30 minutes, and 2 hours, plus a dead-letter/manual-review state
  after five failures.
- Added a protected one-minute Vercel Cron worker. The webhook now returns `202` after routing,
  trusted-sender validation, durable persistence, and audit logging.
- Added plain-language queued, processing, retry, and manual-review states to the customer
  Integrations page.
- Applied `20260802155628_durable_inbound_email_queue.sql` to the live Costivra Supabase project.
  Anonymous and authenticated roles cannot claim jobs; the server role can. A rollback-only live
  database test confirmed the same job was not claimed twice.
- Added a generated `CRON_SECRET` to the Vercel Production environment as a sensitive value.
- Validation passed: `npm run typecheck`; `npm run lint` (four pre-existing warnings, zero errors);
  `npm test -- --run` (23 files, 73 tests); `npm run test:integration` (1 test); `npm run build`
  (33 pages); and `npm run test:e2e` (6 passed, 2 intentionally skipped by project targeting).
- Verified the Vercel team is on the Pro plan, which supports the configured one-minute worker.
- Remaining deployment requirement: run one real forwarded-invoice test after configuring the
  malware scanner.

## Bulk row selector visibility — August 2, 2026

- Fixed the shared Accounts/Contacts row selector CSS so the check icon is hidden for unselected rows and appears only on hover, keyboard focus, or selection.
- Validation: `npm test -- --run` passed (71 tests). The local Playwright CLI could not attach to the authenticated in-app browser session, so visual confirmation should be done by refreshing the open Manage page.

## Realtime Resend events, notifications, and mail attachments — August 2, 2026

- Expanded the production Resend webhook subscription to cover inbound messages, scheduled/sent/delivered/delayed mail, opens, clicks, bounces, complaints, failures, and suppressions. The existing route continues to verify each webhook signature before processing it.
- Added recipient-scoped Supabase Realtime notifications for new inbound mail, opens, clicks, and delivery failures, with a 30-second polling fallback. The shared toast system now supports a direct **View** action, restrained entrance/exit motion, and a soft Web Audio chime that only starts after the browser permits audio.
- Added a persisted **Notification sounds** preference in owner Settings. It defaults on, can be disabled per operator, and updates without overwriting unrelated profile or signature fields.
- Added private storage and server-only metadata for regular mailbox attachments. Inbound Resend attachments are fetched from their short-lived provider URLs, size-limited, hashed, malware-scanned, and stored in the private `costivra-mail-attachments` bucket. Only clean attachments can be opened through the authenticated Manage attachment route; unavailable or infected files remain quarantined.
- Existing invoice-intake attachments continue through the document pipeline, including the same malware boundary, private source storage, extraction, evidence, and review behavior. Outbound compose attachments remain limited to five files, 10 MB each, and 20 MB total before Resend submission.
- Applied `20260802115030_realtime_mail_notifications_and_attachments.sql` to the Costivra Supabase project. The migration adds the sound preference, targeted notification fields and RLS, Realtime publication, the restricted attachment table, and private storage bucket.
- Validation passed: `npm run typecheck`, `npm run lint` (four existing warnings, no errors), and `npx vitest run --reporter=dot` (22 files, 71 tests). A production build was not repeated while the active local development session was being used for review.
- Remaining deployment requirements: configure `MALWARE_SCANNER_URL` or `CLOUDMERSIVE_API_KEY` before inbound attachments can be released from quarantine. Resend still reports domain-level open and click tracking as disabled even after its update API acknowledged the change; those two dashboard toggles must be confirmed before open/click events can arrive. The webhook is already subscribed for them.

## Durable workspace-member CRM contacts — August 2, 2026

- Added `20260802120301_persist_membership_crm_contacts.sql`, which creates a restricted database trigger that persists organization members as `crm_contacts` linked to `profiles.id`.
- Backfilled existing memberships, including Lewis A Patterson for the Gmail account, without duplicating existing CRM contacts.
- Supabase verification passed: Lewis now has a permanent CRM contact ID, and the membership trigger is enabled.
- Remaining follow-up: run the normal typecheck/lint/test/build suite before the next deployment.

## Contextual email drafts and profile signatures — August 2, 2026

- Added optional **Title**, **Phone number**, and **LinkedIn profile** fields beside the owner profile photo in Settings. Blank fields stay out of the signature. The details are validated server-side, write only to the authenticated operator profile, and create an audit event without recording the raw phone or URL.
- Added a `/`-triggered composer prompt: “Describe what you want to write.” It retrieves only the recipient-matched contact/account, related vendors, recent CRM activities, and recent conversations on the server, bounds the context, and asks the AI for a short human email in plain language. The operator still reviews and explicitly sends it; the drafting route cannot send mail or change CRM data.
- Refined the `/` drafting interaction into an editor overlay. The prompt now enters and exits over the message area, hides the editor placeholder while active, transitions into a restrained Costivra progress state during generation, animates the subject and message into place, and respects reduced-motion preferences. Generated drafts are also deterministically framed with the recipient's first name (or `[First name]`) and a natural sign-off followed by the operator's first name.
- Added a sender signature preview in the composer. At delivery, the server appends a canonical signature using the latest profile values. Profile photos stay private and are attached to the email by CID; without one, recipients get a circular initials fallback. Signature fields are omitted when unset.
- Refined the composer’s addressing flow: To, Cc, and Bcc accept multiple removable recipient chips, search contacts by name or email, rank contacts from the selected account first, include active Costivra staff from the existing internal staff relation, and still accept a valid outside address. Cc/Bcc now animate into the fixed-height composer while the message area yields space instead of increasing the modal height. The subject row uses a matching **Sub** label.
- Matched the signature fallback avatar to the CRM’s standard circular person glyph and fixed its centering. The Costivra lockup is larger and sits on an explicit white email-safe tile so the real mark remains legible in clients that force dark mode; the canonical sent signature uses the same treatment.
- Follow-up polish: recipient suggestions now wait for a search term instead of opening on field focus; the sender title is forced onto its own line below the name; and the normal signature lockup is unboxed and enlarged. Supporting email clients apply the protective white treatment only when they render in dark mode.
- Applied `20260802101500_profile_email_signature_fields.sql` to Supabase. Existing profile RLS remains in force. The Supabase security advisor still reports only the pre-existing leaked-password-protection warning; performance advice is existing unused-index information.
- Validation passed: `npm run typecheck`, `npm run lint`, `npx vitest run --reporter=dot` (22 files, 71 tests), and `npm run build` (33 static pages). The in-app browser refused control of the existing localhost tab under its URL policy, so authenticated visual QA was not repeated in this pass; the local development server was restarted for manual refresh.

## Owner navigation hover rail — August 1, 2026

- Reworked the owner navigation into a 72px rail on desktop and compact screens that expands after deliberate mouse hover or keyboard focus, plus the existing mobile drawer. The rail waits 240ms before opening and 460ms before closing to avoid accidental flicker; Escape closes it and the account menu.
- Grouped the primary destinations into **Clients** and **Work**, moved Settings beside the profile area, removed the disconnected expand/collapse controls, kept active icons white, and changed the Mail counter to a blue badge with white text capped at `99+`.
- Kept navigation icons on a stable horizontal anchor while labels, section headings, dividers, spacing, and rows animate during expansion and collapse. Motion is restrained, uses the CRM navigation as a reference, and is disabled when the user requests reduced motion.
- The profile card remains the account-menu trigger, with a circular avatar, profile/photo settings, and sign out. The popup matches the trigger width and opens upward inside the sidebar.
- Reorganized Mail to use the same connected header-tab pattern as Accounts: mailbox selection, Inbox, Starred, Sent, Drafts, Scheduled, Archive, and Trash now sit inside one fixed-height workspace card above the message list/reader. Folder counts appear only when non-zero, Compose is centered in the header, tabs scroll horizontally on narrower screens, and the list, reader, and contact context own their internal scrolling.
- Corrected the Accounts lifecycle-tab underline so it is sized from each active button’s actual label area rather than a fixed width/step. Longer labels such as Onboarding now receive a complete underline while retaining a short entrance animation.
- Matched Mail’s folder tabs to the Accounts tab treatment: plain text labels, identical spacing and typography, and the same label-width underline behavior. The mailbox selector sits to the left of Inbox; the redundant inbound-status card was removed.
- Rebuilt the mail composer as a rich HTML editor with text styles, emphasis, lists, alignment, links, clear formatting, undo/redo, file and image attachment controls, attachment-name feedback, an animated scheduling popover, and animated minimize/maximize behavior. Recipient emails now resolve their CRM account server-side, rich HTML is sanitized and stored beside a plain-text fallback, Resend receives both formats, and closing a non-empty composer saves a draft.
- Lifted the composer into the persistent `/manage` layout so its draft, recipient context, expanded/minimized state, and attachments follow the operator between Mail, Accounts, Contacts, Settings, and other owner pages. Minimize now animates width, vertical body height, opacity, and position together; close runs a dedicated downward fade/scale exit before unmounting. Reduced-motion preferences disable these transitions.
- Fixed the close path so saving a draft or sending a message waits for the composer’s 280ms exit before routing to the resulting mailbox. This prevents the abrupt disappearance that was cutting off the close animation.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (61 tests), and `git diff --check` passed. Browser QA at `/manage/mail` confirmed the connected workspace, full rich-text toolbar, scheduling popover, minimize/maximize interaction, and zero console warnings/errors. A real outbound send was intentionally not triggered during QA.

## Demo invoice import and extraction QA — August 1, 2026

- Created two Supabase Auth demo workspaces with owner memberships so the end-to-end portal can be reviewed without touching a real customer tenant: Cloud Billing Demo and Telecom Software Demo.
- Imported eight public, de-identified PDF fixtures into the private `costivra-documents` bucket. The import uses the same private storage, SHA-256 deduplication, extraction-version, evidence, invoice, line-item, review, and audit paths as a customer upload; the temporary local fixture route and account-creation script were removed after the run.
- Fixed the Node PDF worker configuration so `pdf-parse` loads the installed `pdfjs-dist` worker instead of a missing Turbopack `.next` chunk.
- QA result: four telecom/utility/software fixtures produced completed extraction versions with invoice rows, 4–14 line items, and 10–12 evidence references each. All remain `needs_review` because vendor matching/reconciliation or required fields still need a human decision. AWS/Azure fixtures correctly escalated to review when the model returned an ambiguous multi-invoice or incomplete result; no unvalidated invoice was written.
- This is a test dataset, not proof of production extraction accuracy. Before launch, add golden fixtures and evaluation thresholds, a visible correction console, and a configured malware scanner. Demo credentials are provided in the handoff and should not be reused for customer access.

## Public marketing-page clarity pass — August 1, 2026

- Reviewed all public marketing, category, industry, utility, scan, and legal routes for a clear visitor question: who Costivra helps, what it reviews, what it finds, and what the visitor can do next.
- Rewrote abstract page headlines and ledes on Product, Solutions, How it works, Security, Integrations, Industries, and Pricing; standardized the primary CTA to “Scan three bills free”; gave Case Studies a useful pilot CTA; and made legal-page introductions specific to their subject.
- Browser route audit passed for 30 public routes with visible headings and successful responses. Representative screenshots were captured in `output/playwright/public-product-after-reveal.png`, `output/playwright/public-pricing.png`, `output/playwright/public-case-studies.png`, and `output/playwright/public-energy-mobile.png`.
- Validation: `npm run typecheck`, `npm test` (56 tests), and `npm run build` passed. `npm run lint` remains blocked by one pre-existing error in `src/components/manage-portal.tsx:1461` (`setState` inside effect); the touched marketing files introduce no lint errors.

## Homepage product motion — August 1, 2026

- Added restrained, evidence-led motion to the public homepage: the hero preview cycles through classification, detection, evidence linking, and approval; the evidence viewer animates category changes; and the workflow section reveals on scroll with staggered steps.
- Added reduced-motion handling so these effects are disabled for visitors who request less motion.
- Validation: `npm run typecheck`, `npm run lint`, and `npm test` passed; browser screenshots captured at desktop and mobile sizes in `output/playwright/home-motion-desktop.png` and `output/playwright/home-motion-mobile.png`.

## Structured invoice pipeline v1 — August 1, 2026

- Added live `invoices`, `invoice_line_items`, and append-only `invoice_field_corrections` tables with exact numeric money columns, constraints, tenant-scoped Row Level Security, browser read-only grants, and covering indexes. Supabase now reports zero unindexed foreign keys for the project.
- Expanded document extraction from a summary-only shape to typed invoice identity, dates, service periods, masked account suffix, purchase-order reference, subtotal, tax, fees, credits, total, amount due, and up to 500 line items. Money is accepted only as decimal strings.
- Added deterministic exact-cent reconciliation for line-item totals and invoice components. Missing inputs remain incomplete, and mismatches are preserved rather than silently repaired.
- Added deterministic vendor resolution using organization relationships, canonical vendor names, and curated aliases. Only one exact match attaches automatically; ambiguous or unmatched names require review.
- Manual uploads and Resend email attachments now create structured invoice candidates. A document is only marked ready when required fields exist, vendor resolution succeeds, confidence is at least 85%, and arithmetic reconciles.
- The Documents page now shows invoice number, total, line-item count, reconciliation status, and review status alongside the source document.
- Applied the previously pending vendor-directory metadata migration so aliases and billing cadence now exist in production.
- Validation: `npm test` passed 41 tests across 13 files; `npm run typecheck`, `npm run lint`, and `npm run build` passed. Browser QA covered the authenticated Documents page at 1440×900 and 390×844 with no horizontal overflow, no browser console warnings/errors, and a readable mobile action layout.
- Remaining boundary: OCR, human correction/approval UI, expense-account matching, golden-document accuracy evaluation, and automatic opportunity creation are not part of v1 and must not be represented as complete.

## Authenticated access routing — July 31, 2026

- Fixed the production `NO_ORGANIZATION_MEMBERSHIP` crash triggered when an authenticated owner clicked the public top-bar **Sign in** link.
- Added `/access` as the narrow server-side resolver: active internal staff and configured owner emails go to `/manage`; organization members go to `/app`; accounts with neither authorization receive a clear login message.
- Successful password sign-in now passes through the same resolver, and `/app` safely reroutes missing-membership sessions instead of exposing a Next.js server-error screen.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (20 tests), and `npm run build`.

## Password recovery reliability — July 31, 2026

- Replaced browser-bound PKCE recovery-email links with a server-verified Supabase token-hash route at `/auth/confirm`.
- Password setup now remains disabled unless the browser has a valid recovery session; invalid or expired links fail closed instead of hanging indefinitely.
- Updated the live Supabase recovery template to one clean Costivra-branded email using the correctly proportioned approved logo and the new `costivra.ai` confirmation route.
- Commit `d440812` is deployed to Vercel production and reports **READY**. `npm run typecheck` passed before deployment.
- Production diagnosis confirmed that the newest server-verified link reaches `/set-password`, enables both password fields, and produces no browser console errors. Older `code=` links remain browser-bound and cannot be repaired.
- Added a scanner-safe `/confirm-recovery` step: automated email previews can load the landing page, but only the user's explicit **Continue securely** form submission consumes the one-time token.
- Restored the full email footer across the shared Resend shell and the hosted Supabase recovery template: Costivra promise, website, Privacy, Security, and Contact links. The checked-in template is `docs/SUPABASE_RECOVERY_EMAIL_TEMPLATE.html`.
- Validation for the scanner-safe update passed: `npm run typecheck`, `npm run lint`, `npm test` (17 tests), and `npm run build`.

## Inquiry-to-lead, consent, and brand enforcement — July 31, 2026

- Public inquiries now atomically create or resolve a real CRM account and contact, save the inquiry, set new accounts to **Lead**, add a high-priority follow-up task and inquiry activity, and create an internal owner notification. No sample or demo lead was added.
- The public endpoint is limited to five attempts per network address per hour using server-only HMAC identifiers and seven-day counter cleanup, reducing automated lead and email abuse without storing raw IP addresses.
- The owner portal polls a narrow authenticated endpoint every three seconds and turns unread inquiries into immediate toasts that link to the live account. Cross-tenant notification tables remain unavailable to browser roles.
- The contact form now has an unchecked, explicit email-marketing permission box. Opt-ins are stored as append-only evidence with the exact consent copy, version, source, and timestamp. Account lists and contact inspection show the current opt-in status.
- Inquiry acknowledgments and owner notifications use the existing Resend adapter, stable idempotency keys, the external-side-effect ledger, a shared branded email shell, and the real Costivra circuit-mark asset. A failed email send does not discard the saved lead.
- Vercel Production and Preview now explicitly set `RESEND_FROM_EMAIL=Costivra <hello@costivra.ai>` and `CONTACT_NOTIFICATION_EMAIL=l.patterson@costivra.ai`; the deployed code no longer depends on fallback addresses for inquiry delivery.
- Replaced letter-glyph branding on owner access, owner navigation, and password setup with the real Costivra logo. Added a repository rule in `AGENTS.md` requiring approved logo assets and the shared branded shell for product and marketing email.
- Applied `20260731175000_inquiry_leads_marketing_consent_notifications.sql` to the live Costivra project. A temporary `.invalid` migration check proved lead stage, consent, task, activity, and notification behavior; the exact organization and all cascaded test rows were deleted. Current counts confirm zero inquiry or migration-QA rows.
- Supabase's security advisor reports no new schema issue; its only current warning is leaked-password protection being disabled. New indexes are reported as unused because the feature has not received live customer traffic yet.
- Final validation passed: `npm run typecheck`, `npm run lint`, `npm test` (16 tests), and `npm run build`. Live database checks confirmed RLS is enabled and browser roles have no read grants on consent, notification, notification-read, or public-rate-limit tables. Browser QA covered desktop and 390px mobile contact layouts, unchecked/toggle/reset consent behavior, zero horizontal overflow, the branded confirmation landing, the real password-setup logo, and an empty browser error log.
- Signup now sends email confirmation back to `https://costivra.ai/login` (or the current branded site origin), keeping the visitor-facing flow on Costivra pages.
- Supabase's separate **Custom Domain add-on** is now enabled for project `skfocjrykyvsaviyhdea`. `auth.costivra.ai` is registered, the public CNAME points to `skfocjrykyvsaviyhdea.supabase.co`, and the required ACME TXT record is publicly visible. Supabase currently reports `ssl.status=pending_validation`; do not activate or change `NEXT_PUBLIC_SUPABASE_URL` until SSL is ready. The existing project URL remains configured so authentication is not broken while the certificate issues.

## Owner CRM and Resend mailbox — July 31, 2026

- Added server-only mailbox seats and the **Mailboxes** owner page. `l.patterson@costivra.ai` is the active default owner seat; owners can create additional personal or shared `@costivra.ai` addresses, and disable non-default seats without deleting their history.
- Added `hello@costivra.ai`, `privacy@costivra.ai`, and `security@costivra.ai` as active send/receive mailboxes assigned to the Costivra owner. General inquiries are shared; privacy and security are owner-only so future operators do not inherit sensitive mail. Resend domain receiving and the production inbound webhook are enabled; all three mailbox changes have internal audit records.
- Compose now requires an authorized active sender seat. Inbound messages route by exact active mailbox address, threads and side-effect records retain the mailbox identity, and operators can use only assigned or shared seats while owners administer all seats.
- Added the owner-only `/manage` portal with Overview, Accounts, Contacts, Outreach, Mail, and Activity views. It reads live Supabase organizations and workspace members; there is no frontend demo data.
- The live Supabase account check found one Auth user and one organization, both belonging to the existing `demo@costivra.com` / Northstar Hospitality test workspace. That workspace is now explicitly hidden from `/manage` without deleting or changing its customer-portal records. The CRM will stay honestly empty until a real organization is created.
- Added account/contact creation, lifecycle stage, next follow-up, private notes, internal activity notes, and assignable outreach tasks. Customer workspace financial records remain authoritative and tenant-isolated.
- Added a Gmail-style Resend mailbox with Inbox, Starred, Sent, Drafts, Scheduled, Archive, and Trash; conversation reading; compose, reply, forward, Cc/Bcc, attachments, plain-text rendering, search, provider status, and client context.
- Added explicit internal authorization through `internal_staff_users` plus `COSTIVRA_INTERNAL_ADMIN_EMAILS`. Customer organization roles never grant cross-tenant owner-portal access.
- Added an external-side-effect ledger around every send, including human authorization, idempotency, request hash, provider reference, retries, trace ID, sanitized metadata, CRM activity, and internal audit history.
- Extended the signed Resend webhook to keep delivery states current and route exact active `crm_mailboxes` recipients while preserving the separate customer document-intake path.
- Applied the owner CRM, mailbox-seat, and mailbox audit-index migrations to the live Costivra project. All new tables have RLS enabled and deny browser roles. Supabase security review found only the existing leaked-password-protection warning; the follow-up performance review found no unindexed foreign keys.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (14 tests), and `npm run build`. Browser QA covered the real owner seat, seat-creation dialog, empty live inbox, and sender selection; the review added a narrower-desktop navigation breakpoint and purpose-built mobile mailbox cards. The temporary QA route was removed afterward.
- The latest `main` deployment is READY and aliased to `costivra.ai`. Vercel Production now uses `RESEND_INBOUND_DOMAIN=costivra.ai`, allowlists `l.patterson@costivra.ai` as the internal owner, and has valid server-only Resend API, Resend webhook, and Supabase secret credentials. The initial inherited Resend values were placeholders and the Supabase server secret was absent; both problems were found by the first live inbound event and corrected before customer mail was used.
- Resend sending and receiving are enabled and fully verified for `costivra.ai`; Vercel DNS publishes the root MX `inbound-smtp.us-east-1.amazonaws.com` at priority 10. The production webhook is enabled for inbound and all implemented outbound delivery events.
- Created a Supabase Auth owner invitation for `l.patterson@costivra.ai`, redirected to `/manage`; it is awaiting Lewis's acceptance. The invitation was received by Resend and persisted in the live `l.patterson@costivra.ai` CRM inbox through a signed, successful `200` webhook. On first authenticated visit, the production allowlist records the user as an internal owner.
- Added and deployed `/set-password` for the owner activation link. It accepts Supabase PKCE or implicit invite sessions, removes tokens from the visible URL, refuses sessions without the one-time owner-invite metadata, requires a 12-character password, clears the invite flag, and routes the completed owner to `/manage`.
- Sent the auditable owner-only message **Set your Costivra owner password** from `hello@costivra.ai` to `l.patterson@costivra.ai`. Resend reports it delivered, and the signed inbound webhook stored the same message in the CRM inbox.
- Remaining production check: open the newest owner-password message in Resend Receiving, set the password, sign in, then send one deliberately authorized message linked to a real client account. No customer email was sent during setup or testing.
- Dependency audit follow-up: the affected Next.js dependency tree has since been upgraded, and the
  August 2 production audit reports zero known vulnerabilities.

## Automatic email document intake — July 31, 2026

- Added one private generated intake address per organization, automatic provisioning for every new customer workspace, tenant-scoped inbound event and attachment records, Row Level Security, audit events, and required foreign-key indexes in the live Costivra Supabase project.
- Added a signed Resend `email.received` webhook. It resolves the exact organization address, rejects unknown senders, retrieves short-lived attachments, permits only PDF/DOCX/TXT up to 20 MB, scans before extraction, deduplicates by SHA-256, and reuses the same versioned document/evidence pipeline as manual upload.
- Added a fail-closed malware boundary. Clean files proceed; infected files are rejected; scanner failures or missing configuration put originals in private quarantine and never send them to AI extraction.
- Added owner/admin customer controls under Integrations: copy address, approve/remove forwarding senders, activate/pause intake, retry quarantined files, and review recent accepted/rejected/quarantined activity. Non-admin members have read-only visibility.
- Added client setup guidance in `docs/EMAIL_INTAKE_SETUP.md` and server configuration keys in `.env.example`.
- The production Resend webhook at `https://costivra.ai/api/webhooks/resend` is enabled for `email.received` plus scheduled, sent, delivered, delayed, bounced, complained, failed, and suppressed delivery events.
- DNS inspection found no existing MX provider on the root `costivra.ai` domain. The verified Resend domain can therefore be used for CRM mailbox seats without displacing an existing mailbox host; receiving activation is tracked in the owner-mailbox setup above.
- A production malware-scanning provider and its server credential are still required. A direct Cloudmersive adapter is included for the simplest setup, while a provider-neutral HTTP adapter remains available. Until configured, the system safely quarantines files instead of pretending intake completed.
- Validation: `npm test` (3 inbound-policy tests), `npm run typecheck`, `npm run lint`, and `npm run build` passed. Supabase security advisor reported no new RLS findings; the three new unindexed-foreign-key findings were corrected in a follow-up migration.

## Transactional contact email — July 31, 2026

- Verified the `costivra.ai` domain is active for sending and receiving in Resend, with every sending and receiving DNS record fully verified.
- Added a server-only Resend adapter for contact-inquiry receipts and internal notifications from `hello@costivra.ai`.
- Added stable idempotency keys and a database delivery ledger that records request hashes and provider outcomes without storing message bodies. RLS is enabled and both browser roles are denied access.
- Contact inquiries are saved before email is attempted. A provider outage is recorded but does not discard the inquiry or falsely report that the inquiry itself failed.
- Corrected the public contact addresses and API fallback from `costivra.com` to the canonical `costivra.ai` domain.
- This does not enable vendor communication or other consequential external actions; those still require the later approval-policy and durable-workflow milestone.

## Blueprint alignment review — July 31, 2026

The implementation was checked against the original `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`, especially the essential product loop, product surfaces, MVP definition, twelve-week plan, roadmap, and recommended Codex task order.

### Aligned and operational

- The positioning, homepage promise, initial categories, evidence-first language, human-approval doctrine, and neutral UCEP disclosure match the blueprint.
- Authentication, organizations, tenant memberships, private document intake, extraction versions, evidence references, expenses, contracts, opportunity cases, action plans, approvals, audit events, savings outcomes, notifications, reports, and grounded chat are backed by the live Supabase project rather than UI-only placeholders.
- All 26 current public tables have Row Level Security enabled. The external-side-effect ledger exists and is intentionally empty until an authorized provider action is implemented.
- The customer navigation matches the blueprint and Ask Costivra remains an exploration surface rather than the system of record.

### Not yet the full promised MVP

- The product still needs a human extraction review and correction console with preserved correction history.
- Deterministic software, telecom, and energy-review rules need versioned calculations, reconciliation tests, and complete evidence presentation. Seeded findings are not a substitute for this engine.
- Expense and contract detail views still need invoice history, line items, normalized contract terms, data quality, active cases, actions, and savings history in one record.
- Approval-policy configuration needs explicit role, threshold, two-approver, external-communication, cancellation, and consent rules—not only stored policies and action status controls.
- The neutral energy fork still needs referral-consent, partner/referral, package-export, destination-choice, and revocation workflows. Marketing disclosure alone is not implementation.
- Savings verification still needs approved baselines, post-action comparisons, deterministic methods, confounding-factor review, and fee support before “verified value” is a complete product claim.
- Durable workflow retries, idempotency reconciliation, automated evaluations, tenant-isolation integration tests, and end-to-end release gates remain launch blockers.

### Correct next build order

1. Extraction review/correction console and deterministic reconciliation.
2. Expense and contract detail records with invoice, line-item, and term models.
3. Versioned opportunity rules and calculation evidence.
4. Approval-policy configuration and durable action orchestration.
5. Energy referral consent and neutral advisor export.
6. Baseline-driven savings verification, followed by pilot hardening and automated release gates.

## Slopless product polish — July 31, 2026

- Restored Costivra lime to the portal's true creation and upload actions while keeping routine operational controls quiet. Extended the portal's soft-corner geometry to selected public frames, grids, and editorial panels without rounding full-bleed sections or every content block.
- Reduced the public hero texture to a near-silent structural grid and removed the decorative scanline so the headline and product proof carry the composition.
- Quieted the customer workspace: neutral active navigation, ink-colored primary actions, consistent 10px topbar controls, softer surfaces, and one restrained status-color system.
- Added a global toast system with success, error, warning, and information states; accessible live announcements; labeled dismiss controls; stacking; timed dismissal; entrance/exit motion; mobile-safe positioning; and reduced-motion support.
- Connected toasts to real portal mutations and notification actions. Successful operations refresh Supabase-backed data; failed operations show the server error instead of a false success message.
- Browser QA passed for the public home and portal at desktop and 390px mobile widths. No horizontal page overflow was found. The command palette and create/upload dialogs remained visible and unclipped; mobile modal width was tightened to avoid fractional-edge clipping.
- Live behavior check passed: a Supabase-backed settings save produced the expected success toast. Browser console contained no warnings or errors beyond normal Next.js development messages.

## Operational now

- Supabase authentication, signup organization provisioning, protected `/app/*` routes, session refresh, and sign-out.
- Tenant-scoped Supabase repositories for organizations, members, locations, vendors, expenses, contracts, documents, extraction versions, evidence, opportunities, actions, approvals, savings, integrations, reports, notifications, settings, chat sessions, and chat messages.
- Real command-center metrics and every portal list rendered from Supabase. The former hard-coded customer workspace was removed.
- Private PDF, DOCX, and text upload to `costivra-documents`, SHA-256 duplicate detection, text extraction, OpenRouter document analysis, evidence records, signed downloads, and deletion.
- Evidence-grounded Ask Costivra chat with persisted sessions and clickable source-document citations.
- Working expense, vendor, and contract creation; opportunity status changes; action approval/decline/start/complete; organization settings; notifications; team invitations; integration state controls; and live CSV reports.
- Public contact inquiries persist server-side. The free-scan path now creates a secure account before accepting private documents instead of simulating an upload.
- Portal dialogs render through a top-level portal, animate in and out, close on Escape/backdrop, and stay within desktop and mobile viewports.
- Custom blue scrollbars, responsive mobile/tablet navigation, restrained colors, compact typography, loading/empty/error/success states, and reduced-motion support.

## Live connections

- Supabase project: `skfocjrykyvsaviyhdea` (`us-east-2`).
- Private Storage bucket: `costivra-documents`.
- AI: OpenRouter through the server-only adapter in `src/lib/ai/openrouter.ts`.
- GitHub deployment route: `https://github.com/powerchoosers/costivra.git`, `main` branch to Vercel.
- Local secrets are in ignored `.env.local`; deploy environments need the variables listed in `.env.example`.

## Validation completed August 1, 2026

- Vendor intelligence — replaced the centered add-vendor dialog with a persistent, non-blocking right panel; added canonical vendor search and autofill for category and website; added dollar/decimal spend entry with monthly or annual annualization; and created tenant-scoped vendor detail pages for saved spend, contract terms, findings, actions, documents, and expense history. The live Supabase migration added search aliases, suggestion flags, spend cadence, and a curated 40-vendor MVP catalog. RLS remains enabled. Viewer creation is blocked in both the interface and API.
- Vendor validation — `npm run typecheck`, `npm run lint`, all 41 Vitest tests, and `npm run build` passed. Authenticated browser QA passed at desktop and 390×844 mobile, confirming Google Workspace autofill, a draft that survives navigation, the populated Verizon detail page, and permission-aware controls.

- Manage settings — added a dedicated owner Settings page, moved Resend-backed email identity administration out of the main navigation and into Settings, retained `/manage/mailboxes` as a compatibility redirect, and added private Supabase-backed operator profile-photo upload with type/size/signature validation, audit logging, and short-lived signed rendering. The `costivra-avatars` private bucket and `profiles.avatar_path` migration were deployed to the Costivra Supabase project. `npm run typecheck`, `npm run lint`, all 30 Vitest tests, and `npm run build` passed. Protected-page browser QA reached the expected sign-in boundary but could not inspect the new authenticated screen without an active local session.
- Owner CRM tables — converted `/manage/accounts` and `/manage/contacts` into fixed-height workspaces with independently scrolling table and inspector regions. Added horizontally scrollable data tables with sticky row numbers and sticky account/contact identity columns, hover-revealed accessible row selectors, visible-page selection, restrained selected-row states, selected-record export, single-record follow-up/email actions, table footers, and pagination arrows. Marketing consent/status now has its own column. Contacts now includes an account-style detail inspector. Redundant page headings and standalone export/count controls were removed. `npm run typecheck`, targeted ESLint, and all 28 Vitest tests passed. Authenticated local browser QA remains unavailable because the local session redirects to sign-in.
- Owner mail UI — widened the mailbox folder rail so full addresses stay inside the selector, removed the duplicate rail-level Compose button, added animated per-message expand/collapse cards with message-specific Reply actions, and removed framed containers from sidebar toggle controls in both `/manage` and `/app`. `npm run typecheck` and targeted ESLint passed. Authenticated local browser QA remains unavailable because the local session redirects to sign-in; production cannot show these uncommitted changes.
- Password recovery — diagnosed the production failure as a stale, rotated Supabase refresh token rather than a password-length failure. `/set-password` now participates in session-cookie refresh, removes invalid Supabase auth cookies, and renders a dedicated reset-link screen when no valid session exists.
- Password entry — the form reads the values actually present in the browser instead of using hidden React state as a submit gate. Password-manager autofill can no longer leave a filled-looking form disabled; both visibility controls and match/length feedback remain available, and the server returns a specific reason for every rejected save.
- Password update — the authenticated route updates only the current Supabase user, validates both 12-character entries on the server, rejects cross-origin requests, supports a normal HTML form fallback, and contains no owner-email or admin-user fallback.
- Production verification — a temporary `example.invalid` Supabase Auth user completed token verification (`307`), rendered the active form (`200`), saved a password (`200`), and signed in with the new password. The temporary user was deleted immediately. Vercel production deployment `dpl_Dgnz1vUhN27nF8qXFeGd2rctnV8C` is READY on commit `d49d941`.
- Owner recovery — sent one fresh **Reset your Costivra password** email after the verified deployment; Resend reports it delivered to the owner mailbox. Older reset links remain single-use and should be ignored.
- Marketing header stickiness — changed root horizontal overflow containment from `hidden` to `clip`, preserving horizontal clipping without creating the scroll container that caused the homepage header to scroll away. Browser QA confirmed the header remains at its configured 20px offset after a 675px scroll, with no horizontal overflow or console errors.
- Route transitions — removed the root-level opacity/translate entrance that briefly exposed the dark document background during navigation. Pages now paint immediately, while the existing section-level portal and scroll-reveal motion provides restrained content movement without a full-screen flash.
- Unified application motion — `/app` and `/manage` now share lightweight timing and easing tokens, keyed page-section entrances, restrained staggering, responsive panel feedback, smoother sidebar content collapse, and consistent container transitions. The former `/manage` animation referenced a missing keyframe and never ran; it now uses the same working section-level system as the customer workspace without reintroducing a full-screen fade.

## Validation completed July 31, 2026

- Password recovery entry — `/login?mode=recovery` is now a durable recovery route and remains reachable when a valid session cookie already exists; ordinary authenticated visits to `/login` still resolve to the authorized owner or customer workspace.
- Password recovery confirmation — the intermediate “Continue securely” control now forces a full same-site browser navigation to the server confirmation endpoint. This avoids blocked form submissions and Next.js client-routing redirects that can change the address while leaving the old screen visible. Supabase verification still requires a second-page `confirm=1` signal that is absent from the email link, preserving the scanner-safe boundary.
- Mobile homepage header — restored the hero's 112px mobile top spacing so the floating navigation no longer overlaps the headline. The menu now opens as an animated overlay without moving the hero, and the hamburger/close control uses a borderless icon treatment with a keyboard-only focus ring. Verified at 375×812 with a stable hero position and no browser console warnings or errors.
- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run build` — passed; all application and API routes compiled.
- Browser QA — all 13 portal routes loaded with real records and no horizontal overflow.
- Responsive QA — desktop, 820px tablet, and 390×844 mobile; no page overflow. All five create/upload dialogs and command search were opened and closed against live portal data. The tallest contract sheet remained reachable on mobile with an independently scrolling body and sticky actions; Escape, backdrop close, focus restoration, body scroll locking, entrance/exit motion, reduced-motion handling, and console health passed.
- Authentication — password sign-in reached the intended protected route.
- Account entry UI — sign-in and sign-up now use a responsive rounded-card layout with honest, disabled Google and Outlook placeholders for future OAuth work; email/password auth remains unchanged.
- Motion system — public routes now share a light route-entry and scroll-reveal rhythm; portal sections, buttons, surfaces, command search, and modals use the same restrained easing with reduced-motion fallbacks.
- Demo workspace — `demo@costivra.com` is confirmed in Supabase with an owner membership for Northstar Hospitality and seeded records for expenses, contracts, documents, and opportunities.
- Motion system — public routes now share a light route-entry and scroll-reveal rhythm; portal sections, buttons, surfaces, command search, and modals use the same restrained easing with reduced-motion fallbacks.
- Account entry UI — sign-in and sign-up now use a responsive rounded-card layout with honest, disabled Google and Outlook placeholders for future OAuth work; email/password auth remains unchanged.
- Persistence — settings saved and reloaded from Supabase; public contact inquiry persisted (QA row removed afterward).
- Reports — a current CSV generated and downloaded from Supabase records.
- AI — answered the highest-value open-opportunity question and linked the supporting `direct-energy-june-2026.txt` source citation.
- Supabase — all missing foreign-key indexes fixed; current domain row counts verified; no missing-RLS or unindexed-FK findings remain.

## Honest boundaries

## Invoice review operations — August 1, 2026

- Added `/manage/invoice-review` as a real Supabase-backed exception queue. The default view includes only invoices that require human attention; clean, high-confidence, fully reconciled invoices remain available under **All invoices** without creating routine review work.
- Owners can select up to 100 invoices and delegate them in bulk to active internal reviewers with a priority and optional deadline. Every assignment is recorded in the internal audit ledger.
- Added `/manage/invoice-review/[id]` as the individual verification workspace with a secure React PDF viewer, source navigation, editable structured fields, vendor/account matching, exact reconciliation status, line items, evidence excerpts, reviewer notes, and append-only correction history.
- Human corrections run through a narrowly scoped server-only database function, recalculate invoice arithmetic, preserve the original and corrected values with the actor and reason, and cannot edit arbitrary columns.
- Approval is intentionally fail-closed. A matched vendor, invoice number/date, service period, category, currency, total, and reconciled arithmetic are required. Approval idempotently creates or updates the linked client expense and records the decision in the audit ledger.
- The live Supabase migration `invoice_review_queue` is applied. `react-pdf` 10.4.1 is installed and dynamically loaded only on invoice detail screens.
- Validation passed: `npm run typecheck`, `npm run lint`, all 43 Vitest tests, and `npm run build`. Browser QA passed at desktop and 390×844 mobile; the queue has no page-level horizontal overflow, the table scrolls inside its own rounded container on mobile, the detail layout collapses to one column, and the React viewer rendered a real 14-page PDF canvas.

### Remaining boundary

- The production database currently contains six source documents and zero invoice rows because those documents predate the invoice-record pipeline. New invoice uploads and forwarded attachments will populate the queue. A reviewed backfill tool for historical documents remains a separate task; records should not be fabricated simply to make the queue look populated.

- Password recovery — a Supabase recovery link establishes a short-lived authenticated session by design. Costivra now marks that session as password-setup-only and blocks `/app` and `/manage` until the new password is successfully saved. The requirement cookie expires after 15 minutes and is cleared only by a successful server-side password update.

- Supabase leaked-password checking is unavailable on the current plan. Password minimum length is 10, recent authentication is required for password changes, and password-change notifications are enabled. Upgrade to Supabase Pro to enable HaveIBeenPwned protection.
- Integration controls safely manage Costivra-side connection state; provider OAuth/API credentials still need to be configured before external synchronization can occur.
- Uploaded files are validated by type, size, hash, tenant, and private storage. A dedicated malware-scanning provider and OCR for image-only scans are not connected yet; these require external vendor selection.
- Team invitations use Supabase email delivery. Production SMTP should be configured before launch.
- Billing, supplier communication, cancellation, and other external financial actions remain intentionally unavailable until provider adapters and explicit authorization workflows exist.
- Legal and UCEP drafts still require qualified counsel before commercial launch.

## Next launch work

Configure Vercel environment variables, production SMTP, domain/redirect URLs, and selected provider OAuth credentials. Then add automated tenant-isolation, upload, workflow, and browser regression suites to CI.

## Deterministic value loop and release hardening — August 1, 2026

- Approved invoices now run through versioned, exact-cent software/telecom price-change rules. Matching prior-period expenses establish the evidence-backed baseline; qualifying findings idempotently create or update the tenant opportunity instead of relying on model-generated savings.
- Energy changes may create a professional-review case, but the engine intentionally assigns no savings value without usage, weather, and rate evidence.
- Opportunity and action mutations now enforce legal state transitions and owner/admin authorization. Approving an opportunity creates one action/approval record; price actions cannot start before an owner accepts the deterministic savings baseline.
- A later approved invoice can populate the post-action comparison. The Savings workspace shows baseline, later invoice, method, calculation version, and protected accept/verify/reject controls. Only human verification can move the linked opportunity to `verified`.
- Scanned PDFs now fall back to OpenRouter PDF parsing only when native text is absent. The same structured candidate, evidence, reconciliation, and human-review boundaries still apply. Malware scanning remains separate and fail-closed.
- Applied the deterministic opportunity/savings migration and follow-up actor indexes to live Supabase. The security advisor reports only the existing leaked-password-protection warning; the performance advisor reports no warnings or missing foreign-key indexes, only expected low-traffic unused-index information.
- Added GitHub Actions quality gates, 53 unit tests, a financial-loop integration test, and responsive Chromium smoke tests. The dependency tree was upgraded/pinned to patched compatible Playwright, PostCSS, and Sharp releases; `npm audit --omit=dev` reports zero known vulnerabilities.
- Current launch boundary: the code and database can execute the contained invoice-to-opportunity-to-verification loop, but general availability still requires a malware-scanner account, a real de-identified invoice evaluation set, authenticated tenant-isolation/upload/workflow end-to-end tests, production monitoring and incident ownership, production email/auth delivery review, and counsel-approved legal/UCEP terms.
- Owner actions are tracked in `docs/PRODUCTION_LAUNCH_CHECKLIST.md`.
## 2026-08-01 — Portal record detail and inline editing pass

- Added complete customer detail routes for vendors, expenses, contracts, documents, extracted invoices, opportunities, action plans, and savings outcomes. List and card titles now open their corresponding detail record rather than ending at a summary screen.
- Added a shared, responsive detail-page system with overview tabs, related records, evidence excerpts where applicable, recent audit history, mobile stacking, protected-field indicators, and accessible edit/copy controls.
- Added field-by-field editing with Save/Cancel controls, visible success/error toasts, role enforcement, strict resource/field allowlists, type validation, tenant checks, stale-record detection through `updated_at`, and hashed audit events. Viewer accounts remain copy-only.
- Kept authoritative fields protected: source identity, extracted/reconciled invoice totals, deterministic opportunity value, workflow/approval state, and verified savings cannot be rewritten by the general editor.
- Expanded portal reads to include invoice review facts, source provenance, evidence references, relationship cadence, related record identifiers, update timestamps, and tenant-scoped audit activity. No production path was changed to use placeholder data.
- Validation passed: `npm run typecheck`; `npm run lint` (0 errors, two pre-existing-now-unused vendor-detail helper warnings); `npm test -- --run` (18 files, 56 tests); `npm run test:integration` (1 test); `npm run test:e2e` (4 passed, 2 intentionally skipped by project targeting); and `npm run build` (30 pages generated). Supabase security review reports only leaked-password protection being unavailable/disabled; performance review reports expected unused-index information on the low-traffic project, not missing indexes.
- Authenticated browser QA used a temporary development-only magic session for the existing Northstar demo account; that helper was removed before handoff. Vendor, expense, contract, document, opportunity, action, and savings detail routes rendered with zero horizontal overflow; the invoice detail renderer compiled but could not be populated visually because the live demo workspace currently has no `invoices` rows. Desktop and 390px mobile vendor layouts were inspected, Edit/Cancel worked, a same-value cadence save completed through the real API, and the resulting attributed audit entry appeared. No reusable demo password or auth bypass was added.

## 2026-08-01 — Consistent action cursors

- Added one shared cursor rule for public pages, the customer workspace, and the owner portal. Links, enabled buttons, select controls, checkboxes/radios, and custom button controls now use the hand cursor; disabled controls show that they are unavailable.
- Validation passed: `npm run typecheck`, `npx eslint src/app/globals.css`, and `npm test` (18 files, 56 tests).

## 2026-08-01 — Owner account workspace refinement

- Owner account and contact rows now link to dedicated internal detail pages. The account inspector supports inline lifecycle, follow-up, next-step, and private-note updates through the existing server-authorized CRM API.
- Added account-scoped task and note actions, moving tab/content motion, and deliberate row-number selection behavior: the checkbox appears only when the number cell itself is hovered.
- Internal notes can notify selected active Costivra teammates. Each mention is stored in a server-only relation, creates a recipient-specific in-app notification, records its Resend side effect, and sends a branded internal email that links to the account. The live Supabase migration is applied with RLS and no browser access.
- Validation passed: `npm run typecheck`, targeted ESLint, and `npm test` (18 files, 56 tests). A local `npm run build` could not start because another Next build process already held the build lock; Vercel production build remains the deployment gate.

## 2026-08-01 — Public invoice evaluation fixtures

- Added four public sample PDFs under `tests/fixtures/invoices/` for local extraction and review-queue evaluation: two telecom/VoIP samples, one utility bill, and one generic software invoice.
- Each fixture is documented with its source URL. These are templates/sample documents only, not customer records or production evidence.
- Verified all four downloads begin with the PDF signature (`%PDF-`). Full extraction scoring remains a follow-up once the golden-data harness is connected.
- Expanded the set with official Microsoft Azure MSDN/PAYG sample invoices and official AWS VAT invoice/receipt samples. The fixture directory now covers recognizable cloud, telecom, utility, and software billing layouts without importing private customer bills.

## 2026-08-01 — Grounded owner assistant and overview table refinement

- Added the push-layout Ask Costivra rail with live Supabase-derived suggestions, bounded server-side AI answers, allowlisted record citations, loading/error/empty states, and a responsive mobile overlay.
- The assistant reads recent inbound-delivery webhook records for operational context but cannot fire webhooks, send messages, mutate CRM data, approve work, or calculate financial value.
- Updated the owner overview account table to match the Accounts workspace with visible row numbers, aligned columns, an internal bottom scrollbar, and a paginated footer. Removed the redundant overview follow-up button.
- Synchronized the assistant rail and workspace width/max-width transitions so opening and closing use the same 320ms motion curve without the initial hard reflow.
- Validation passed: `npm run typecheck`, targeted ESLint, two assistant suggestion tests, desktop browser QA, 390×844 mobile QA, and a live account-grounded assistant response with three record citations.
- `OPEN_ROUTER_API_KEY` is configured as a sensitive Vercel variable for Production and Preview. The current local `.env.local` value is a redacted placeholder, so live local extraction evaluation requires Lewis to add a valid local key; production remains separately configured.

## 2026-08-02 — Measurable invoice-extraction release gate

- Added a strict golden-invoice manifest, prediction parser, and scorer for classification, critical-field precision/recall, optional exact line items, grounded evidence citations, deterministic reconciliation, review routing, extraction errors, and minimum software/telecom/scanned coverage.
- The evaluator reuses the exact production text parser and model extraction functions. Native-document evidence must exist in source text; scanned cases require human-transcribed evidence snippets. Wrong non-empty values count as both false positives and false negatives, and malformed or incomplete truth manifests fail before a paid model call.
- Added `npm run eval:invoices` with live, validate-only, and saved-prediction replay modes. Private source sets and generated prediction/report artifacts are ignored by Git. The production default requires 20 software, 20 telecom/internet, and 10 scanned cases.
- Added a deterministic hostile-invoice smoke manifest and prediction. GitHub Actions now executes the smoke gate on every pull request and `main` push without using an AI secret or spending model credits.
- Validation passed: TypeScript; full ESLint; 98 unit tests with two intentional live-environment skips; the integration suite with two intentional credential-gated skips; production build; Playwright browser smoke (`status: passed`); manifest validation; and deterministic evaluator replay with every metric at 100%. This proves the gate works; it does not prove production extraction accuracy. A live local probe correctly failed before launch-quality scoring because `.env.local` contains a redacted OpenRouter placeholder. Lewis still needs to supply the de-identified set and a valid local OpenRouter key to run the real gate.

## 2026-08-02 — Live invoice-review database regression

- Added a reusable credential-gated Supabase integration test for the actual `internal_update_invoice_review` and `internal_approve_invoice` functions. It creates isolated temporary records, verifies unmatched-vendor and arithmetic rejection, persists two field corrections, recalculates reconciliation, approves twice idempotently, creates exactly one linked expense, attributes the reviewer, and records both approval audit attempts before cleanup.
- Ran the equivalent assertions against the live Supabase project inside one explicit transaction followed by `ROLLBACK`. The database returned `invoice_review_database_regression_passed`; no fixture rows were retained.
- Documented the exact local secrets, command, cleanup boundary, and remaining coverage in `docs/LIVE_DATABASE_REGRESSION_TESTS.md`. The broader end-to-end gate remains open for real upload/malware/extraction versioning and the complete customer opportunity-to-verified-savings browser sequence.

## 2026-08-02 — Fresh Resend production verification

- Revalidated the newly supplied local Resend key without exposing it. Resend accepted the key, reported `costivra.ai` verified in `us-east-1`, and delivered an idempotency-protected smoke message from `hello@costivra.ai` to Resend's delivery-test inbox.
- Sent a second live message with a PDF attachment to the Northstar dummy workspace intake address. Resend received it, the production webhook returned `202`, the minute worker returned `200`, and live Supabase recorded the queued and quarantined audit events. The attachment object exists in private storage and no document row was created because a malware scanner is not configured; that is the intended fail-closed boundary.
- The webhook remains signature-protected, the production email/cron routes had no runtime errors during the test, and all 33 email-focused unit tests passed. The local Resend key and webhook secret are present, but the local Supabase server credential and `CRON_SECRET` do not match production; production itself has valid working credentials.

## 2026-08-02 — Authenticated customer-workflow browser gate

- Added an explicitly gated Playwright regression for the real customer login and financial workflow. It creates a disposable confirmed Supabase Auth user and organization, signs in through `/login`, approves an opportunity, approves its generated action, accepts the evidence baseline, starts and completes the action, and verifies the resulting opportunity, action, savings, attribution, and audit records directly in Supabase.
- The fixture is randomized and self-cleaning. Remote execution is refused unless `E2E_ALLOW_PRODUCTION=1`; placeholders and build-only keys are rejected; cleanup checks the exact organization prefix before deletion. Normal CI and ordinary local Playwright runs remain non-mutating and skip this test.
- Added a manual GitHub Actions workflow so the production regression can be repeated without keeping a reusable demo password or adding an authentication bypass. It remains unavailable until the documented `E2E_SUPABASE_SECRET_KEY` GitHub Actions secret is configured.

## 2026-08-02 — Least-privilege browser database grants

- Audited every public table, RLS policy, and browser-role grant in the dedicated Costivra Supabase project. No unrelated Luxor or Nodal tables are present. The only external security-advisor warning is Supabase Auth leaked-password protection, which remains a dashboard/plan action for Lewis.
- Replaced bootstrap-era ownership-style table grants with explicit browser privileges. `anon` receives no public-table access. `authenticated` receives only tenant-policy-protected reads, the recipient-scoped internal notification read needed by Realtime, and updates to five non-authoritative self-profile columns. All customer business mutations continue through the Costivra server APIs; `service_role` is unchanged.
- Added a repeatable SQL assertion for anonymous grants, authenticated writes, required reads, profile column boundaries, and retained server access. The migration passed a transaction-scoped production dry run, was applied as Supabase migration `20260802234849`, and passed the same assertion against the live schema.

## 2026-08-02 — Fail-safe retention operations

- Added a protected daily retention worker with a server-only run ledger, bounded policies, batch limits, retention holds, sanitized failure codes, and a report-only default. No original source file is eligible until an explicit approved window exists, and no file is deleted unless the production enforcement switch is deliberately enabled. The live schema migration is `20260803001903`.
- Enforcement removes private files through the Supabase Storage API before marking database metadata. Extracted records and provenance remain, and both customer and internal file workspaces clearly show when an original reached its retention limit instead of presenting a broken download.
- Hardened inbound quarantine cleanup so a failed Storage deletion keeps its recoverable private path. The attachment is marked rejected or processed first, the path is cleared only after Storage confirms deletion, and regression tests cover both success and failure ordering.
- Added operator readiness reporting, public-route rejection coverage, policy/runner regressions, and an activation runbook that calls out the separate off-platform Storage backup required by Supabase.
- Added explicit deny-all browser policies for the server-only retention and enrichment ledgers as migration `20260803002048`. Supabase's security advisor now reports no table/RLS findings; leaked-password protection is the only remaining dashboard warning.

## 2026-08-02 — Workspace administration and safe failure handling

- Added real organization-location management under customer Settings. Owners and administrators can create, edit, archive, and restore locations; all mutations are tenant-scoped and audited, while archival preserves historical bill and contract context.
- Completed the invited-member lifecycle. Owners and administrators can change non-owner roles and remove workspace membership without deleting the person's profile or audit history. Self-removal and owner removal are blocked, and invitations now create an audit event.
- Added an owner/admin structured workspace export with private no-store headers. It includes the customer-visible organization records, evidence references, decisions, and audit history without exposing private Storage paths or bundling source-file bytes.
- Replaced raw shared portal API failures with safe customer messages. Intentional field-validation errors remain specific, while unexpected database and provider details are logged server-side and never returned to the browser.
- Added branded application, root, and not-found recovery screens with clear retry and navigation choices. The full local gate passed with 180 unit tests, integration tests, lint, TypeScript, the 34-page production build, and public desktop/mobile browser coverage.

## Record workspace and internal CRM polish — August 2, 2026

- Rebuilt internal account and contact record pages into one shared, task-oriented workspace: identity and highlights first, then Overview, People/Shared files, Activity, and Work tabs. The account and contact views now make the next action, relationship details, internal context, and evidence easier to scan without turning the page into a form.
- Activated the stronger dedicated vendor record page in the customer App and added the same protected document-library experience to vendor and generic record pages. The library has virtual collections, search, list/grid view, status states, a selected-file inspector, and secure download actions. Collections are metadata views only; original storage paths and provenance remain immutable.
- Made the customer App rail use the same compact, expand-on-hover/focus geometry as Manage. The desktop rails now share dark surface, widths, active-state treatment, tooltips, and keyboard expansion behavior while keeping their customer/internal destinations distinct.
- Added the internal-only, account-only Apollo enrichment foundation: normalized public account lookup website, separate provider snapshots, an operator-triggered refresh route, a 30-day cache, a time-bounded atomic claim, provider URL validation, safe audit events, and a private internal document-download route. Provider redirects are blocked; a website change invalidates the saved snapshot; incomplete/quarantined documents cannot be signed; and signed links force a safe download name. Apollo-derived content is intentionally absent from `/app` pending the required Apollo data-sharing permission.
- Individual contact enrichment is deliberately not enabled. Sending a contact’s work email to an external provider needs a purpose-specific data-sharing consent and authorization feature; marketing consent is not treated as that permission.
- Visual QA used temporary local preview fixtures at desktop and 390×844 mobile for Manage account/contact and App vendor records. The selected file library, mobile action stack, record tabs, and rails rendered without browser console errors. Those temporary preview routes were removed before handoff.
- Applied `20260802194859_add_internal_crm_enrichment_records.sql` to the linked Costivra Supabase project and registered the exact migration version. Direct verification proves RLS is enabled, there are no browser policies or browser grants, only `service_role` has CRUD/claim access, the security-definer function has an empty search path, the invalidation trigger exists, and the atomic claim returns `true` once then `false` for a duplicate request inside a rolled-back transaction.
- Validation passed: `npm run typecheck`; `npm run lint` (0 errors, 0 warnings); `npm test` (37 files passed, 2 skipped; 137 tests passed, 4 skipped); `npm run test:integration` (1 passed, 2 credential-gated suites skipped); `npm run test:e2e` (6 passed, 2 intentionally skipped); and `npm run build`. The Supabase advisor reports one account-level warning: leaked-password protection is disabled. Focused adapter/download/cache coverage also passes. No live Apollo request was made and no provider credits were spent.
- Added a scoped internal account vendor workspace backed by the existing Supabase `organization_vendors`, `vendors`, `expenses`, `contracts`, and `documents` records. Account overview now shows recorded weekly/monthly/yearly cost history plus linked vendor logos; the Vendors tab supports selecting any linked vendor to inspect its real recorded spend, contract records, cadence, dates, and associated source-document count. The view excludes mixed currencies from a combined chart and makes no projected-savings claim.
- Focused validation passed: `npx next typegen`, `npm run typecheck`, and `npx vitest run src/lib/manage/vendor-costs.test.ts src/lib/manage/assistant.test.ts` (4 tests).
- Follow-up polish moved account and contact website/LinkedIn destinations into compact, keyboard-accessible icons beside the record name, removed duplicate text links and the manual Apollo refresh/list controls, and renamed the Apollo-facing panel to `Short Description`. The current production build passed after replacing the unavailable Lucide LinkedIn export with the existing Link2 icon.
- Browser QA passed against a fresh production build at desktop and 390×844 mobile sizes. Supabase verification confirmed the selected account’s website and `updated_at` fields are present in the live project. Cross-session live updates should continue through the existing server-authorized soft revalidation path; direct browser subscriptions to privileged CRM tables remain intentionally avoided.
- Production browser QA on commit `dde133e` proved the Apex account loads four account-scoped vendors and their real Supabase expense totals, switches vendor detail and weekly/monthly/yearly history, serves safe logo fallbacks without console errors, and renders at 390×844 with no horizontal overflow. Raw category slugs are now converted to readable labels in the operator UI.
- The full non-destructive release gate passed: `npm run typecheck`; `npm run lint`; `npm test` (63 files passed, 3 environment-gated files skipped; 217 tests passed, 5 skipped); `npm run test:integration` (1 passed, 3 live-credential suites skipped); `npm run test:e2e` (10 passed, 4 intentionally project/environment-gated); and `npm run build`. The separate live Supabase browser-grant assertion passed and the security advisor reports only leaked-password protection disabled.
- `npm run test:integration:live` now loads `.env.local` deliberately and rejects Vercel redaction placeholders before attempting privileged test setup. The local `SUPABASE_SECRET_KEY` is still a redacted/invalid placeholder, so Lewis must replace that one local value before the three self-cleaning live database suites can be rerun from this machine. Production Vercel credentials remain valid and the deployed runtime reports no errors.

### Remaining release work

- Add `APOLLO_API_KEY` as a server-only Vercel Production/Preview variable before operators use the manual company-profile refresh. The UI stays explicit about the missing provider configuration until then.
- Enable Supabase Auth leaked-password protection when the project plan supports it; this is the only current database-advisor warning.
- Apollo's terms must be cleared in writing before any provider-derived summary appears in the customer App. Until then, only organization-controlled facts may appear there.
- A separate consent, authorization, and audit design is required before any individual contact data is sent to Apollo or another enrichment provider.
- The broad Manage data loader still fetches more email data than an individual record page needs. A follow-up should add scoped server-side record view models and pagination before very large CRM datasets are expected.

## 2026-08-02 — Owner production-readiness controls

- Added an owner-only **Production readiness** check to Manage Settings. It verifies that the required Supabase operational tables are reachable, reports dead-letter intake work, validates the live Resend domain and signed production webhook, confirms the protected worker and server-only AI configuration, reports malware-scanner readiness, and checks optional Apollo authentication.
- Provider checks use fixed HTTPS endpoints, a six-second timeout, no redirects, and no response caching. API keys remain server-only and are never included in the response. Operators cannot call the route; failed authorization uses the existing protected Manage API boundary.
- Re-ran the live Resend flow with the supplied key. The production contact endpoint created a Supabase lead and delivered both the customer receipt and owner notification. A separate Azure PDF reached the Northstar dummy intake address, produced a signed `202` webhook and successful minute-worker run, and was stored privately with `scan_status=unavailable`, `processing_status=quarantined`, and no document row. That remains the correct result until a malware scanner is configured.
- Validation passed: TypeScript; full ESLint; 143 unit tests with four intentional environment-gated skips; integration suite with four credential-gated skips; production build; and Playwright smoke with no failed tests. The two new readiness test files cover owner authorization, private/no-store responses, missing configuration, rejected provider credentials, disabled webhook, dead-letter work, database failure, and serialized secret redaction.

## 2026-08-03 — Resend and scheduled intake verification

- Revalidated the configured Resend API key through the provider and the application readiness probe. The verified `costivra.ai` domain and signed webhook remain aligned; the key was never returned, logged, or added to source control.
- Targeted Resend/intake tests passed (10 tests), cron authorization/readiness tests passed (25 tests), and the complete automated suite passed (246 tests passed; 3 intentionally skipped). TypeScript and the optimized production build both passed.
- Live Vercel runtime logs for deployment `dpl_9xxUEtrMzZfUXxZWEJwkBkdZFb6t` confirm `/api/cron/inbound-email` is receiving successful `200` scheduled invocations every minute. This is the authoritative production-worker proof.
- The prior `ops:smoke` warning was a false operational signal: it sent the local development `CRON_SECRET` to production, where the deployed Vercel secret is intentionally independent. The smoke script now verifies unauthenticated rejection by default and only performs a protected manual invocation when `COSTIVRA_VERIFY_CRON_TOKEN` is explicitly supplied. The launch checklist explains the distinction.

## 2026-08-03 — Apollo account discovery and company profile fields

- Added a server-only Apollo company search route for internal operators. It accepts a company name
  or public domain, waits until three characters are entered, returns bounded candidates, and marks
  exact domain/name matches without automatically creating a record.
- Account creation can now select a candidate and review its name, industry, and website before
  saving. The restricted Apollo snapshot stores the provider ID, logo, LinkedIn URL, location,
  employee count, founded year, and technology names. Apollo logos use an allowlisted provider
  host with Logo.dev fallback; operator-entered account data remains canonical.
- Applied migration `20260803173631_add_apollo_account_fields` to the Costivra Supabase project.
  Live verification confirms `name`, `logo_url`, and `technology_names` exist on the restricted
  enrichment table. Security and performance advisors show no new finding from this migration;
  the existing Auth leaked-password-protection warning remains.
- Validation passed: focused Apollo and account-search tests (11 passed), TypeScript, ESLint, and
  `git diff --check`. After the server restart, a live probe using the configured server-side key
  returned HTTP 200 from `mixed_companies/search` with one company result; the key itself was never
  exposed or logged. The `crm-platform/network` reference directory is not present in this
  repository, so implementation follows the current Costivra Apollo adapter and the official
  Apollo endpoint contract.
- The lookup now auto-selects a high-confidence exact website match, keeps exact name matches
  operator-selectable to avoid same-name collisions, and accepts Apollo's `primary_domain` response
  field when a full website URL is absent.

## 2026-08-03 — Contact workspace interaction refinement

- Fixed the Manage contact inspector status-pill layout so its small status dot remains a dot instead
  of inheriting the inspector's generic block treatment. Account names now open their account record
  from the contact inspector and the contact-detail highlight, where the approved company logo is
  displayed alongside the account name.
- Contact email addresses now open the existing contextual composer from the contacts table,
  inspector, contact detail, and account people view. The composer request carries the selected
  contact and account identifiers, so draft context resolves the intended CRM relationship rather
  than relying only on the recipient address.
- Replaced the full-text contact-page compose action with a labeled icon control and added a
  phone icon/link only when a phone number is recorded. Inspector task/note forms now expand and
  collapse with a bounded transition; the note action uses the document icon.
- Validation: ESLint, `git diff --check`, and live browser verification of the contacts page,
  contextual email composer, account link, status pills, and task expansion passed. TypeScript is
  currently blocked by pre-existing Apollo nullability errors in `src/lib/integrations/apollo.ts`
  (lines 390 and 393), outside this contact-workspace change.

## 2026-08-03 — Apollo company profile presentation

- Added Apollo corporate phone capture to the restricted `crm_account_enrichments` snapshot and applied migration `20260803183758_add_apollo_company_phone` to the linked Supabase project.
- Account detail headers now show only existing location, website, phone, and LinkedIn values. The overview rail repeats the website and places the company phone directly beneath it; Apollo context shows status, founded year, team size, update time, and a collapsed technology list with an explicit “Show all” control.
- Add-account and add-contact flows now use right-side drawers with focus handling, backdrop dismissal, Escape support, and enter/exit animations.
- Created `Apollo QA - HubSpot Profile`, enriched it through the normal refresh flow, and verified the live page with Apollo location, website, phone, LinkedIn, founded year, team size, description, and technology data.
- Validation passed: focused Apollo/enrichment tests (14 passed), `npm run typecheck`, `npm run lint` (0 errors; two existing warnings remain), and `git diff --check`.

## 2026-08-03 — Add-account ingestion completeness

- Fixed Apollo mixed-company parsing so a non-empty `accounts` result is not discarded when the provider also returns an empty `organizations` array. Exact public-domain searches now use Apollo's direct organization enrichment endpoint first, while name-search candidates are hydrated through that endpoint before selection.
- Account creation now re-enriches the normalized website on the server before persistence. The browser preview is no longer the authority for provider data, and the restricted snapshot now carries the description, phone, location, employee count, founded year, LinkedIn URL, logo, and technologies even when the original search candidate was partial.
- Added a compact review block in the account drawer with conditional company details and explicit searching/loaded feedback. Operator edits to canonical name or industry no longer silently discard the selected provider snapshot; changing to a different website still clears it.
- Live browser verification found `ccmcdermott.org`, populated its full preview, created `Church of Christ On McDermott Road`, and verified the saved account detail page with its website, phone, LinkedIn, Frisco location, 17-person team, description, logo, and 30 technologies. A separate `HubSpot` name search returned eight candidates and hydrated the exact company to a complete profile without creating a duplicate test record.
- Validation passed: 14 focused Apollo/search/create tests; the complete unit suite (254 passed, 5 intentionally skipped); TypeScript; ESLint with zero errors and one unrelated existing Resend-test warning; integration tests (1 passed, 5 credential-gated skips); Playwright (10 passed, 4 intentionally skipped); and the 37-page production build.
- Company discovery is now explicitly submitted: typing does not call Apollo, and only pressing Enter starts a lookup. The drawer states this credit boundary before submission. Apollo's current documentation confirms organization search costs one credit per results page and organization enrichment costs one credit per organization; the authenticated workspace reported 3,346 of 5,000 lead credits remaining for the July 11–August 11 cycle when checked.

## 2026-08-03 — Enrichment settings and Apollo usage

- Added General and Enrichment tabs to Manage Settings. The owner-only Enrichment tab introduces a provider layout that can accept additional enrichment services later while keeping Apollo as the only provider shown today.
- Added an owner-only, private/no-store Apollo settings route. It reads the documented zero-credit current-profile endpoint with the server-side key and returns only connection state, check time, and normalized lead-credit totals. API keys and Apollo identity fields never reach the browser.
- The Apollo panel shows the live remaining balance, used/total progress, refresh state, provider-access errors, and the current Costivra credit model: organization search is one credit per results page and organization enrichment is one credit per company. The live check reported 3,346 remaining and 1,654 used of 5,000.
- Validation passed: focused adapter/route coverage (13 tests); full unit suite (258 passed, 5 intentionally skipped); TypeScript; ESLint with zero errors and one unrelated existing Resend-test warning; integration suite (1 passed, 5 credential-gated skips); Playwright (10 passed, 4 intentionally skipped); and the 37-page production build. Browser QA also passed at desktop and 390×844 mobile with no horizontal overflow or console errors. The mobile test used a temporary viewport override and restored the browser afterward.

## 2026-08-03 — Vercel PDF.js build repair

- Vercel failures on deployments `dpl_FESK95Byh1MpiDcCsS2sTfUq3RXC` and the three preceding
  deployments were traced to the accidental `pnpm-lock.yaml`/`pnpm-workspace.yaml` switch and two
  direct imports of undeclared `pdfjs-dist` modules.
- Removed the accidental pnpm metadata, added `pdfjs-dist@5.4.296` as a direct locked dependency,
  and preserved the existing npm deployment path. This addresses the dependency-resolution cause,
  not just the two visible import errors.
- `git diff --check` passes. A fresh local npm install was attempted, but the OneDrive-backed
  `node_modules` directory repeatedly failed with Windows `ENOTEMPTY`/tar extraction races; the
  local dependency tree is therefore not a trustworthy build environment at this moment. The
  production build had passed before the package-manager switch, and the next clean Vercel/npm
  build is the authoritative confirmation.
## 2026-08-03 — Account/contact relationship rail and locations

- Reworked account and contact overview pages around a right-side independently scrollable context rail.
- Removed People from the account tab list; the rail now sorts primary CRM contacts first and exposes explicit email and call actions.
- Added Supabase-backed manage locations with map links/previews, multi-site location lists, and a parent/child account relationship editor.
- Added migration `20260803220625_manage_account_relationships.sql` for `organizations.parent_organization_id`.
- Browser QA passed locally on the account, contact, and client Settings pages at desktop width. `npm run typecheck` passed. The migration was applied to project `skfocjrykyvsaviyhdea` and verified with an information-schema query. Supabase advisors returned one existing Auth warning and existing unused-index notices; the new parent index is listed as unused until hierarchy data is created.
# 2026-08-04 — Full HTML email reading in Manage

- The Manage mail reader now renders stored HTML email in an isolated iframe instead of reducing every message to its plain-text fallback. Email layout, tables, inline styling, and links remain visible without being able to alter the CRM page.
- Remote images are blocked by default to prevent invisible tracking requests. Operators can explicitly load them for an individual message, and links open in a separate tab with no referrer.
- Added focused viewer-document tests covering content isolation, external-image policy, text fallback, and removal of email-provided document-control tags.
- Validation passed: `npm run typecheck`, `npm run lint`, focused Manage mail/viewer tests (12 passing), and `git diff --check`. The local app started on port 3000, but in-app browser attachment timed out before visual QA could run; a browser read-through remains the only uncompleted check.
