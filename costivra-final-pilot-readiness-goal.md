---
description: Finish Costivra's technical and operational release gate for a supervised pilot across GitHub, Supabase, Vercel, Resend, Cloudmersive, customer UI, internal operations, and end-to-end proof.
---

# Costivra Final Pilot Readiness Goal

## Antigravity Goal Mode execution directive

**Repository:** `powerchoosers/costivra`  
**Target branch:** create a protected working branch from the latest `main`  
**Supabase project:** `skfocjrykyvsaviyhdea`  
**Vercel team:** `team_aAYe8Oai5o7BR0a3F4a6bPMe`  
**Vercel project:** `prj_pMAnjcRnNPD35PyXwNiUVz99N8Zc`  
**Resend domain:** `costivra.ai`  
**Resend webhook:** `https://costivra.ai/api/webhooks/resend`  
**Audited production commit at preparation time:** `667ac949afbb2a90124025ad94d7aed700a1f949`  
**Audited production deployment:** `dpl_7gVwmvHKz8LoqYs5p71SVP1SqShB`  
**Prepared:** August 4, 2026, America/Chicago  
**Goal:** `READY_FOR_SUPERVISED_PILOT`

> This is a release-completion directive, not a new product blueprint. The platform already exists. Do not redesign the company, build new product categories, add speculative integrations, or widen autonomous behavior. Repair, prove, and ship the current supervised-pilot platform.

---

# 1. Goal Mode operating instructions

Run this assignment in Goal Mode and continue through implementation, validation, browser verification, deployment verification, and final evidence.

Do not stop after producing a plan.

Use this operating sequence:

1. Recheck the current branch and live systems before editing.
2. Create a dedicated worktree or branch such as:
   ```text
   goal/final-pilot-readiness
   ```
3. Preserve unrelated work.
4. Make small, reviewable commits grouped by release concern.
5. Keep `STATUS.md` current after each verified vertical slice.
6. Continue around human-only blockers where safe.
7. Never weaken a security boundary to make a test pass.
8. Never claim completion from mocks alone.
9. Never expose, print, commit, screenshot, or echo a secret.
10. Do not push directly to production until the exact commit passes the full release gate.
11. End with one evidence-backed verdict:
    ```text
    READY_FOR_SUPERVISED_PILOT
    INTERNAL_TESTING_ONLY
    BLOCKED
    ```

Ask for human intervention only when the action cannot be performed safely from the repository or connected tooling. Examples include rotating a provider credential in its dashboard, accepting a provider DPA, enabling a plan-gated Supabase feature, or changing organization-level GitHub protection settings without permission.

Do not sit idle at a human checkpoint. Continue all code, schema, test, UI, and documentation work that does not depend on that checkpoint.

---

# 2. Release goal

Costivra is ready for a supervised pilot only when one exact Git commit is proven through this chain:

```text
green GitHub quality gate
→ reviewed Supabase migrations
→ reviewed Vercel environment configuration
→ READY production deployment of that same commit
→ healthy Resend sending and receiving
→ clean and infected scanner proof
→ successful manual document intake
→ successful forwarded document intake
→ accurate customer scan feedback
→ operational Manage recovery controls
→ wired lifecycle emails
→ complete audit and side-effect records
→ no unresolved P0 security finding
```

A Vercel deployment being `READY` is not enough.

A configured API key is not enough.

A unit test is not enough.

A clean-file probe alone is not enough.

A scanner must be proven with both a harmless clean file and the official inert antivirus test fixture, then proven through Costivra's actual upload and forwarding workflows.

---

# 3. Required reading

Read these files completely before editing:

```text
AGENTS.md
DECISIONS.md
STATUS.md
README.md
COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md
costivra-pilot-release.md
costivra-cloudmersive-scanner.md
docs/EMAIL_INTAKE_SETUP.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
.env.example
package.json
vercel.json
.github/workflows/quality.yml
```

Inspect these implementation areas:

```text
src/lib/security/malware-scanner.ts
src/lib/security/malware-scanner.test.ts
scripts/verify-cloudmersive.ts

src/lib/documents/manual-upload.ts
src/lib/documents/manual-upload-policy.ts
src/lib/documents/intake.ts
src/app/api/portal/documents/route.ts

src/lib/email/inbound-intake.ts
src/lib/email/quarantine-release.ts
src/app/api/webhooks/resend/route.ts

src/lib/email/lifecycle.ts
src/lib/email/resend.ts
src/lib/email/brand.ts
src/lib/email/contact-inquiry.ts

src/lib/manage/system-readiness.ts
src/app/api/manage/system-readiness/route.ts
src/components/manage-intake-operations.tsx

src/lib/status/public-status.ts
src/components/portal-pages.tsx
src/components/portal-record-detail.tsx
src/lib/portal/repository.ts
src/lib/portal/types.ts
```

Inspect all call sites for:

```text
scanFileForMalware
getMalwareScannerConfig
checkSystemReadiness
sendLifecycleEmail
sendTransactionalEmail
external_side_effects
inbound_email_attachments
crm_email_attachments
```

Do not assume a file is wired because it exists.

---

# 4. Audited starting state

Recheck every item below. Treat differences on the latest branch as new evidence and update this section in `STATUS.md`.

## 4.1 GitHub

At audit time:

- Latest `main` commit was:
  ```text
  667ac949afbb2a90124025ad94d7aed700a1f949
  ```
- Vercel deployed that commit successfully.
- GitHub Actions run 100 failed.
- `npm ci` passed.
- `npm run typecheck` passed.
- `npm run lint` failed.
- Unit tests, invoice evaluation, integration tests, build, and Playwright were skipped after lint failed.
- The blocking lint error was:
  ```text
  src/lib/security/malware-scanner.ts
  A require() style import is forbidden
  ```
- Two unused-variable warnings also remained:
  ```text
  src/components/portal-pages.tsx
  src/components/client-assistant/client-assistant-provider.tsx
  ```
- `STATUS.md` contained a current note that lint was blocked, but also contained an older section claiming a final green gate and `SHIP SUPERVISED PILOT`.

The status document is therefore internally contradictory.

## 4.2 Credential incident

A real-looking Cloudmersive credential was committed into a unit test and later replaced with a dummy string.

Removing the key from the current file did not remove it from Git history.

The old credential must be treated as compromised until Cloudmersive confirms it was revoked.

Never reproduce the old value in logs, commits, issues, documentation, screenshots, or the final report.

## 4.3 Supabase

Live checks showed:

- `reserve_provider_request_slot(...)` now correctly has:
  ```text
  anon execute: false
  authenticated execute: false
  service_role execute: true
  ```
- The function has a fixed search path.
- Supabase's security advisor no longer reports the scanner RPC exposure.
- The only current security-advisor warning is leaked-password protection being disabled.
- `external_provider_request_budgets` exists with RLS.
- The budget table currently has no rows.
- No live Cloudmersive request has therefore been proven through the distributed budget path.
- The scanner-budget table still has broad SQL grants to browser roles. RLS blocks access, but direct privileges should also be revoked for defense in depth.
- The scanner-budget migration exists in the repository but is not clearly represented in remote migration history under the same version.
- A later remediation migration is represented in remote history.
- Four historical forwarded attachments remain:
  ```text
  processing_status = quarantined
  scan_status = unavailable
  ```
- No live inbound attachment currently records `clean` or `infected`.
- The one-minute inbound worker is healthy and records completed runs.
- Recent worker runs inspect the four unresolved incidents and create no duplicate alerts.
- Supabase performance advice reports:
  - four unindexed foreign keys on `vendor_monitoring_configs`
  - four RLS init-plan warnings on `vendor_monitoring_configs`
  - many low-traffic unused-index notices
- Do not remove unused indexes merely because a new pilot database has not used them yet.

## 4.4 Vercel

Live checks showed:

- Costivra uses Next.js on Node `24.x`.
- The latest production deployment was `READY`.
- The latest deployment had no error or warning logs during the audited window.
- `/api/cron/inbound-email` returned `200` every minute.
- The current GitHub quality gate was still red.
- Production therefore accepted a commit that did not pass the repository's full release gate.
- GitHub CI currently uses Node 22, while Vercel uses Node 24.
- Earlier runtime errors for missing chat-session fields belonged to an older deployment. The current authenticated chat flow still needs an explicit fresh browser verification.

## 4.5 Resend

Live checks showed:

- `costivra.ai` is verified.
- Sending is enabled.
- Receiving is enabled.
- DKIM is verified.
- SPF records are verified.
- Receiving MX is verified.
- The webhook is enabled at:
  ```text
  https://costivra.ai/api/webhooks/resend
  ```
- The webhook subscribes to receiving and delivery lifecycle events.
- Recent provider API requests returned `200`.
- Incoming mail reaches the Costivra owner mailbox.
- Three current Cloudmersive account emails appeared through the owner-mail route, proving the owner-mail receiving path is operating.
- Customer demo intake had previously received invoice attachments.
- The old attachments were quarantined because scanning was unavailable at that time.
- Open tracking and click tracking are disabled.
- Resend has no dashboard templates.
- Dashboard templates are not required if Costivra's code-based transactional email system is complete, branded, tested, and observable.

## 4.6 Scanner architecture

The scanner currently has several good boundaries:

- Fixed Cloudmersive endpoint
- Server-side API key
- `Apikey` header
- Multipart `inputFile`
- File-size check
- Bounded timeout
- Infected rejection
- Failure quarantine
- Extraction refuses files unless the scan result is clean
- Quarantine rescan exists
- Clean and inert antivirus-test scripts exist

The scanner also has unresolved issues:

1. It uses a `require("server-only")` workaround that breaks lint.
2. When the Supabase budget RPC fails, production falls back to an in-memory timer and still calls Cloudmersive.
3. That fallback does not protect the monthly limit across Vercel instances.
4. The Cloudmersive parser accepts generic `clean` and `infected` fields instead of requiring Cloudmersive's exact `CleanResult` contract.
5. The first provider-budget reservation can race during concurrent initialization.
6. A reservation can increment usage before the application decides a wait is too long.
7. Normal owner readiness GET requests can execute a live clean-file scan and consume the limited monthly allowance.
8. The free account's exact maximum file size is not confirmed in repository truth.
9. `.env.example` does not list the scanner limit, reserve, interval, file-size, and timeout variables.
10. The current customer UI advertises 20 MB even when the active scanner plan may support substantially less.

## 4.7 Customer scan feedback

Current customer feedback is partially implemented:

- Upload modal says every file passes a security scan.
- Upload action says `Upload and security check`.
- Documents show general statuses such as processing, quarantined, rejected, needs review, and ready.
- Quarantined documents cannot be downloaded.
- Editors can retry a quarantined security scan.
- Forwarded-email activity shows event-level secure-processing status.

Current customer feedback remains incomplete:

- Processed and quarantined uploads receive the same generic success toast.
- The upload handler does not branch on the API's `outcome`.
- A customer can see a general document state but not a durable scan receipt.
- `documents` and `PortalDocument` do not expose a clear current scan status and scan timestamp.
- Customer inbound activity does not show per-attachment scan results.
- The document detail page does not show:
  ```text
  Security scan passed
  Scanned at
  File integrity verified
  ```
- A file above the Cloudmersive plan limit may be accepted by the 20 MB product limit and then quarantined, which is safe but confusing.

## 4.8 Internal scan feedback

Internal Manage feedback is substantially better:

- Scanner-not-connected state
- Attention, in-progress, quarantined, and completed counts
- Event details
- Per-attachment scan status
- Per-attachment processing status
- Safe error messages
- Rescan controls
- Invoice-review links

Preserve this strength while fixing customer feedback.

## 4.9 Lifecycle email implementation

`src/lib/email/lifecycle.ts` defines nine intended messages, but it is not production-ready.

Problems observed:

- Production search found no real call sites outside the helper and a live integration test.
- The helper uses column names that do not match the live `external_side_effects` schema.
- It references fields such as:
  ```text
  effect_type
  external_reference_id
  payload
  error_message
  ```
  while the live table uses:
  ```text
  type
  provider_reference
  sanitized_request_metadata
  last_error
  ```
- Its status names do not match the working transactional-email ledger.
- It bypasses Costivra's canonical branded email helper.
- It sends plain text only.
- It hardcodes a sender instead of using the reviewed configured sender.
- Its idempotency key does not include a stable source-record ID.
- Its `verification_ready` copy incorrectly says savings are already verified.
- The existing Resend webhook updates CRM mail delivery events but does not fully reconcile lifecycle-email side effects.
- Live `external_side_effects` contains contact-inquiry sends, but no lifecycle-email sends.

The nine-email file exists. The nine-email operating system does not.

## 4.10 Public status accuracy

At audit time:

```text
GET https://costivra.ai/api/status
```

reported:

```text
All customer-facing systems are operational.
Document intake: operational
Document intelligence: operational
```

That is too confident while:

- the GitHub gate is red
- no live scanner budget row exists
- no clean or infected live attachment result exists
- four attachments remain quarantined
- the scanner credential rotation is unverified

The public status implementation treats a configured-but-unproven scanner warning as operational.

Public status must remain sanitized, but it must not overstate readiness.

---

# 5. Non-negotiable boundaries

1. Never expose a credential.
2. Never reuse the compromised Cloudmersive credential.
3. Never use real malware.
4. Use only a harmless clean fixture and the official inert antivirus test fixture.
5. Never use real customer files for provider verification.
6. Never allow OCR, extraction, preview, download, or AI processing without a valid clean result.
7. Never treat provider timeout, malformed JSON, HTTP failure, quota exhaustion, or rate-control failure as clean.
8. Never bypass RLS or server authorization for convenience.
9. Never let a browser call a security-definer operational function.
10. Never let production silently fall back from distributed quota control to an in-memory timer.
11. Never run a billable scanner probe on an ordinary page GET.
12. Never claim an email was delivered merely because Resend accepted the send request.
13. Never claim savings are verified before the authorized verification workflow completes.
14. Never introduce broad mailbox access for this release.
15. Never activate hidden partner or UCEP sharing.
16. Never change financial values through AI output.
17. Never delete production data to make a test pass.
18. Never reset Supabase migration history.
19. Never remove an index solely because a young database reports it unused.
20. Never deploy a red GitHub commit as the final pilot release.

---

# 6. Workstream A: Secure the credential lifecycle

## A1. Human-required credential rotation

Treat this as a P0 release blocker.

The founder must:

1. Revoke the previously exposed Cloudmersive key.
2. Create a replacement key.
3. Add the replacement key to the intended Vercel environments.
4. Replace the ignored local development value.
5. Confirm the old key is disabled.

Antigravity must never ask the founder to paste the key into chat, a Markdown file, a commit, or a terminal transcript that will be committed.

## A2. Repository secret scanning

Add or verify a redacted secret-scanning gate.

Requirements:

- Scan current files.
- Scan Git history.
- Redact findings.
- Do not print the detected secret.
- Fail CI on newly introduced high-confidence credentials.
- Use a maintained secret-scanning action or tool after verifying its current documentation.
- Keep GitHub token permissions minimal.
- Document how to run the same scan locally.

At minimum, the final proof must state:

```text
Old Cloudmersive credential rotated: yes/no
Current tree secret scan: pass/fail
Git history secret scan: pass/fail
New credential present in repository output: no
```

History rewriting is optional and requires explicit owner approval because it affects every clone. Credential rotation is mandatory regardless of whether history is rewritten.

## A3. Environment separation

Cloudmersive configuration must be server-only.

Production Cloudmersive configuration:

```text
CLOUDMERSIVE_API_KEY
CLOUDMERSIVE_MONTHLY_REQUEST_LIMIT=800
CLOUDMERSIVE_MONTHLY_REQUEST_RESERVE=20
CLOUDMERSIVE_MIN_INTERVAL_MS=1100
CLOUDMERSIVE_MAX_FILE_BYTES=<confirmed account value>
CLOUDMERSIVE_TIMEOUT_MS=30000
```

When Cloudmersive is active, these must be absent or empty:

```text
MALWARE_SCANNER_URL
MALWARE_SCANNER_TOKEN
```

Never use `NEXT_PUBLIC_` for any scanner variable.

Use Vercel CLI or the authenticated Vercel interface to verify variable names and target environments without printing values.

Audit:

- Production
- Preview
- Development, when used

Redeploy after any environment correction.

---

# 7. Workstream B: Restore a green, aligned release gate

## B1. Fix the scanner module architecture

Remove the `require("server-only")` workaround.

Use a structure that allows a static server boundary and a safe CLI verifier without duplicating provider logic.

Recommended shape:

```text
src/lib/security/malware-scanner-core.ts
  Pure request contract, parsing, safe result mapping
  No Next.js server-only import
  No browser exports

src/lib/security/malware-scanner-config.ts
  Typed server configuration parsing
  No secrets in returned diagnostics

src/lib/security/malware-scanner.ts
  import "server-only"
  Production orchestration
  Supabase budget reservation
  Calls the shared core

scripts/verify-cloudmersive.ts
  Script-only orchestration
  Uses the same shared core
  Uses server credentials and the same distributed budget
```

Alternative structures are acceptable if they meet all of these requirements:

- Static `import "server-only"` in application server entry points
- No forbidden `require()`
- No duplicate Cloudmersive request implementation
- No client import path
- Live verification still uses the distributed budget
- Lint passes
- TypeScript passes

Add a test or lint rule that prevents browser components from importing the scanner boundary.

## B2. Remove current lint warnings

Remove or use the current unused variables. Do not suppress the rules globally.

## B3. Align Node versions

At audit time:

```text
Vercel: Node 24.x
GitHub CI: Node 22
```

Align the runtime deliberately.

Recommended:

```text
Vercel: Node 24
GitHub Actions: Node 24
package.json engines.node: compatible Node 24 range
.nvmrc: 24
```

Verify every dependency and test under that version.

Update GitHub actions to maintained versions when official documentation supports it. Do not guess an action version.

## B4. Make CI authoritative

The exact final release commit must pass:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
```

Do not mark the release ready when later stages were skipped.

## B5. Protect `main`

Production currently deploys pushes to `main` even when GitHub Actions fails.

Configure or document the required manual settings:

- Pull request required for `main`
- Quality gate required
- No direct push for normal release work
- Stale approvals dismissed after material changes
- Production deployment only from reviewed `main`
- Exact commit SHA recorded in the release report

Use GitHub tooling if authorized. Otherwise provide a precise owner checklist.

---

# 8. Workstream C: Harden the Cloudmersive contract

## C1. Provider-specific response parsing

For Cloudmersive, only these outcomes are authoritative:

```text
CleanResult === true  -> clean
CleanResult === false -> infected
```

Do not accept generic:

```text
clean
infected
```

on the fixed Cloudmersive adapter.

The generic scanner adapter may use its generic contract separately.

Cloudmersive rules:

- Fixed HTTPS endpoint
- `POST`
- `Apikey` header
- multipart field `inputFile`
- multipart boundary generated by `fetch`
- no redirect following to another host
- bounded timeout
- bounded safe diagnostics
- no raw response body stored
- no API key in diagnostics

## C2. Fail closed on distributed-budget failure

Production behavior must be:

```text
budget RPC unavailable
→ scanner unavailable
→ file quarantined or manual upload rejected safely
→ operator alert
→ no Cloudmersive call
```

Do not use the current in-memory fallback in production.

A local-only fallback may exist only when all conditions are explicit:

```text
NODE_ENV != production
ALLOW_LOCAL_SCANNER_RATE_FALLBACK=1
```

The fallback must never activate implicitly.

## C3. Fix the first-request race

Make the provider-budget reservation atomic when the row does not yet exist.

A safe pattern:

1. Insert the provider row with `ON CONFLICT DO NOTHING`.
2. Select the provider row `FOR UPDATE`.
3. Reset period if needed.
4. Validate limits.
5. Reserve the scheduled slot.
6. Increment usage.
7. Return the reservation.

An advisory transaction lock keyed by provider is also acceptable if implemented safely.

Test concurrent first requests.

## C4. Validate budget parameters

Reject invalid combinations:

```text
monthly_limit <= 0
monthly_reserve < 0
monthly_reserve >= monthly_limit
min_interval_ms < 1000 for the current plan
provider != cloudmersive
```

Prefer server-owned provider configuration rather than caller-defined arbitrary limits.

The browser must never choose these values.

## C5. Reservation accounting

Decide and document whether a reserved slot counts when the application later declines to wait.

Prefer one of:

- Do not reserve when the calculated wait exceeds the maximum permitted wait.
- Return the long wait without incrementing usage.
- Use a two-step claim and commit model.

Do not silently burn monthly capacity on requests that were never sent.

## C6. Free-plan capacity

The current authenticated plan is:

```text
800 requests per month
1 request per second
```

Keep a reserve for:

- clean readiness checks
- inert antivirus checks
- quarantine recovery
- incident response

Default reserve:

```text
20 requests
```

Warn internal owners at:

```text
80% of usable monthly capacity
```

Block ordinary automated processing at the reserve boundary and keep files safely quarantined.

The Cloudmersive dashboard remains the external billing source of truth. Costivra's counter is an internal protective control.

---

# 9. Workstream D: Fix scanner readiness so it does not consume quota on page load

Current owner readiness can run a live clean scan during a normal GET.

That is unacceptable on an 800-call monthly plan.

## D1. Persist provider health checks

Create a small server-only append-only health-check ledger, or reuse an existing safe operational ledger if it can represent the behavior cleanly.

Suggested fields:

```text
id
provider
check_type          clean_probe | inert_antivirus_probe
status              passed | failed
safe_code
provider_http_status
deployment_sha
environment
started_at
completed_at
created_at
```

Do not store:

- API key
- raw provider response
- file bytes
- customer document content

No browser role may read or write the raw table.

## D2. Readiness GET behavior

`GET /api/manage/system-readiness` must:

- Read configuration state.
- Read the latest persisted clean and inert-antivirus proof.
- Read provider budget usage.
- Read worker state.
- Perform no billable scan.
- Return safe owner-only status.

## D3. Explicit probe actions

Add owner-only explicit actions:

```text
Run clean probe
Run inert antivirus probe
```

Requirements:

- POST, not GET
- CSRF-safe authenticated owner authorization
- idempotent cooldown
- clear notice that one provider request will be consumed
- distributed budget reservation
- persisted result
- no secret response
- no customer document involved

CLI commands may remain:

```bash
npm run ops:cloudmersive
npm run ops:cloudmersive:eicar
```

They must use the same provider contract and budget policy.

## D4. Readiness states

Internal readiness:

```text
ready:
  rotated key configured
  recent clean probe passed
  recent inert antivirus probe passed
  budget below warning threshold

warning:
  configured but one proof is stale or missing
  accepted application size exceeds provider plan size
  budget above 80%

blocked:
  provider missing
  ambiguous provider configuration
  credential rejected
  harmless probe classified infected
  inert antivirus probe classified clean
  quota reserve reached
  provider unreachable
  distributed budget unavailable
```

Do not call a configured-but-unproven scanner fully operational.

---

# 10. Workstream E: Complete Supabase hardening and migration truth

## E1. Defense-in-depth privileges

Even with RLS, revoke browser table privileges from:

```text
public.external_provider_request_budgets
```

Expected:

```text
anon: no table privileges
authenticated: no table privileges
service_role: required privileges
```

Preserve:

```text
anon execute scanner RPC: false
authenticated execute scanner RPC: false
service_role execute scanner RPC: true
```

Add automated SQL assertions.

## E2. Migration reconciliation

The scanner-budget schema exists live, but migration history is not clearly aligned with the repository file.

Do not reset the database.

Procedure:

1. Run:
   ```bash
   supabase migration list
   ```
2. Compare the live function and table definitions with the repository SQL.
3. Determine which migration statements were applied manually.
4. If the schema exactly matches a migration, repair history only after proving equivalence.
5. Otherwise create an idempotent forward remediation migration.
6. Apply through the normal migration workflow.
7. Re-run migration listing.
8. Record the local and remote versions in `STATUS.md`.

Never mark a migration applied merely because a similarly named object exists.

## E3. Vendor monitoring performance advice

Add covering indexes for:

```text
vendor_monitoring_configs.created_by
vendor_monitoring_configs.updated_by
vendor_monitoring_configs.test_event_id
vendor_monitoring_configs.last_received_event_id
```

Update RLS policies to use:

```sql
(select auth.uid())
```

where appropriate so authentication functions are initialized once rather than per row.

Re-run performance advice.

Do not delete current unused indexes during this release.

## E4. Leaked-password protection

Enable Supabase leaked-password protection when available on the current plan.

If unavailable:

- Keep the pilot invite-only.
- Enforce strong password rules in product copy and onboarding.
- Prefer workspace OAuth when configured correctly.
- Record the accepted pilot risk.
- Keep this as a broad-launch blocker if required by the security standard.

## E5. Security advisor target

The final security advisor may contain an explicitly accepted plan limitation, but it must contain no:

- public security-definer function
- cross-tenant policy exposure
- mutable privileged-function search path
- browser access to operational ledgers
- public storage bucket
- service credential exposure

---

# 11. Workstream F: Add durable document scan provenance

Costivra currently enforces scan safety at runtime but does not give customers a durable scan receipt.

Implement the smallest safe model that supports:

- current document scan state
- scan timestamp
- scan attempt count
- safe outcome code
- append-only scan history
- customer-safe display
- internal provider diagnostics

Recommended design:

## F1. Current snapshot on `documents`

Add fields such as:

```text
security_scan_status
security_scanned_at
security_scan_attempt_count
security_scan_safe_code
```

Do not expose provider secrets or raw provider errors.

The provider name may remain internal.

## F2. Append-only scan attempts

Add a server-owned table such as:

```text
document_security_scan_attempts
```

Suggested fields:

```text
id
organization_id
document_id
sha256
source_type
status
safe_code
provider
provider_http_status
signature_summary
started_at
completed_at
created_at
```

Rules:

- No browser writes.
- Tenant members may receive a safe view only if needed.
- Internal operators may read bounded provider diagnostics.
- Never store raw response bodies.
- Never store source bytes.
- Never expose threat signatures to ordinary customers.
- Every rescan appends an attempt.
- Current document snapshot updates from the completed attempt.
- The immutable SHA-256 ties the result to the scanned bytes.

An equivalent model is acceptable when it preserves history and customer-safe state.

## F3. Ingestion integration

Persist scan provenance for:

- clean manual upload
- quarantined manual upload
- rejected manual upload through an audit record
- clean forwarded attachment
- quarantined forwarded attachment
- infected forwarded attachment
- chat attachment through the shared upload path
- owner-mail attachment
- quarantine rescan

`ingestDocumentBuffer` must continue refusing anything except clean.

---

# 12. Workstream G: Correct customer scan feedback

## G1. Upload result handling

The upload API already distinguishes:

```text
processed
quarantined
rejected
duplicate
```

Replace the generic upload submission handler with an upload-specific handler that reads the response.

Customer feedback:

```text
processed:
  Security scan passed. Costivra is reading the document.

quarantined:
  The security scan could not finish. Your file is safely quarantined and has not been analyzed.

rejected:
  The file was blocked by the security scan and was not analyzed.

duplicate:
  This source document is already in your workspace.
```

Use `aria-live` for status changes.

Do not show a success-colored toast for quarantine.

## G2. Upload progress

Show a short, truthful sequence:

```text
Uploading securely
Running security scan
Reading the document
Preparing review
```

Do not show extraction progress before the scan passes.

Do not use fake percentages.

## G3. File-size promise

Resolve the current mismatch between:

```text
Costivra product limit: 20 MB
Cloudmersive plan limit: configured lower value
```

For manual upload:

- Expose the current effective secure upload limit.
- Validate it client-side for convenience.
- Enforce it server-side.
- Reject an oversized manual upload before presenting success.
- Explain that the file was not analyzed.

For forwarded email:

- The platform cannot preflight the sender.
- Store the supported oversized file only in private quarantine when policy allows.
- Tell the customer it requires support or a scanner-plan upgrade.
- Do not extract it.

When the Cloudmersive plan is upgraded, change configuration rather than rewriting the intake pipeline.

## G4. Document cards

Show a quiet security row:

```text
Scan passed
Scanned Aug 4, 2026 at 5:42 PM
```

Other states:

```text
Security scan pending
Safely quarantined and not analyzed

Blocked by security scan
Not analyzed

Security scan unavailable
Retry or contact support
```

Do not show `Cloudmersive` to ordinary customers.

## G5. Document detail

Add a Security section:

```text
Security scan
Status
Scanned at
File integrity
Latest scan attempt
```

Customer copy:

```text
File integrity verified by SHA-256.
Costivra only reads a file after the security scan passes.
```

Keep detailed provider codes internal.

## G6. Customer inbound activity

Expose customer-safe attachment results for each inbound message:

```text
invoice.pdf
Scan passed
Processed

contract.pdf
Scan pending
Quarantined
```

Do not expose the Resend attachment URL, private storage path, provider signature, or raw error.

## G7. Notifications

Notify customer owners or administrators when:

- a file is quarantined
- a file is blocked
- a retry succeeds
- a forwarding test succeeds
- an expected bill is missed

Use in-product notifications and the reviewed lifecycle email policy.

---

# 13. Workstream H: Preserve and improve internal recovery UX

Preserve the existing Manage intake strengths.

Add:

- last clean probe time
- last inert antivirus proof time
- configured effective file limit
- current monthly scanner count
- remaining usable calls before reserve
- budget warning threshold
- last scanner error code
- link to unresolved quarantines
- deployment SHA associated with proof

Do not display:

- API key
- reversible fingerprint
- raw provider body
- raw private document text

After the rotated key is live and both explicit probes pass:

1. Rescan the four historical quarantined attachments.
2. Confirm each immutable source still matches its stored digest.
3. Confirm no duplicate document or expense is created.
4. Confirm clean items re-enter the normal document-review path.
5. Confirm any remaining unsupported item stays quarantined with a clear reason.
6. Confirm deduplicated operator alerts remain deduplicated.

---

# 14. Workstream I: Replace the lifecycle-email placeholder with a real operating system

## I1. Use the canonical transactional sender

Replace or refactor `src/lib/email/lifecycle.ts` to use:

```text
sendTransactionalEmail
brandedEmailHtml
emailRequestHash
external_side_effects
```

Follow the working `contact-inquiry.ts` side-effect pattern.

Use the configured verified sender, not an unreviewed hardcoded address.

Send both:

- branded HTML
- plain text

Keep the emails transactional and scoped to the requested service.

## I2. Correct the ledger schema

Use the live columns:

```text
organization_id
type
destination
idempotency_key
request_hash
status
provider
provider_reference
authorized_at
authorization_method
sanitized_request_metadata
last_error
retry_count
trace_id
updated_at
completed_at
```

Do not write nonexistent columns.

State flow:

```text
approved
→ sent
→ delivered | delayed | bounced | complained | failed | suppressed
```

A provider-accepted send is not yet delivery.

## I3. Stable idempotency

Build keys from stable resource IDs and recipient identity.

Example:

```text
lifecycle/<kind>/<resource_id>/<recipient_user_id>/v1
```

Do not use vendor names or filenames as the primary identity.

Store the exact lifecycle version in safe metadata.

## I4. Wire all nine lifecycle triggers

| Email | Production trigger | Primary recipient |
|---|---|---|
| Welcome / activation | New pilot membership or invited customer activation | New user |
| Upload received | Document accepted into processed or quarantined intake | Uploader or workspace owner |
| Review needed | Document or invoice enters human review | Workspace owners/admins |
| Finding ready | Evidence-backed opportunity created | Workspace owners/admins |
| Approval requested | Approval row assigned | Assigned approver |
| Forwarding instructions | Monitoring config enters pending test | Configuring owner/admin |
| Forwarding test result | First clean trusted forwarded bill activates monitoring | Workspace owners/admins |
| Expected bill missed | Monitoring watchdog confirms missed cadence | Workspace owners/admins |
| Verification ready | Savings outcome enters ready-for-review state | Authorized reviewers |

Do not send all messages to every workspace member.

Respect roles and assignments.

## I5. Correct financial language

`verification_ready` must say:

```text
A savings result is ready for your review.
```

It must not say:

```text
Savings verified
```

until the customer has completed the protected verification decision.

Potential value must remain potential.

## I6. Delivery webhooks

Extend the Resend webhook reconciliation so lifecycle side effects update by:

```text
provider_reference = event.data.email_id
```

Record:

- sent
- delivered
- delayed
- bounced
- complained
- failed
- suppressed

Do not depend on open or click events because tracking is disabled.

The webhook may remain subscribed to those events, but pilot metrics must not assume they exist.

## I7. Resend templates

Resend currently has no dashboard templates.

Choose one operating model:

### Preferred for current codebase

Code-owned branded transactional email components and tests.

### Optional later

Published Resend templates with reviewed variables.

Do not build both systems for this release.

## I8. Email verification

Use:

- provider test destinations
- `.invalid` where no delivery is expected
- explicitly gated test recipients
- no real pilot customers

Prove:

- accepted
- delivered
- bounced or failed
- webhook reconciliation
- idempotent duplicate suppression
- no sensitive invoice text in email
- authenticated workspace links
- reply path
- why the recipient received the message

---

# 15. Workstream J: Make public status honest

Public status must be customer-safe and truthful.

## J1. Scanner state mapping

A scanner that is merely configured but lacks recent proof should produce:

```text
Document intake: limited
Document intelligence: limited
```

It should not produce:

```text
All customer-facing systems are operational.
```

Operational secure processing requires:

- valid single-provider configuration
- recent clean proof
- recent inert antivirus proof
- distributed budget available
- usable quota remaining
- worker healthy

## J2. Public wording

When scanning is unproven or unavailable:

```text
Files can be received into private quarantine, but automatic document processing is temporarily limited.
```

Do not mention:

- Cloudmersive
- API key
- quota number
- internal error code
- scanner signature
- customer incidents

## J3. Public status must not consume provider calls

`GET /api/status` must read persisted readiness only.

It must never run a live scan.

## J4. Status acceptance

Verify:

```bash
curl -fsS https://costivra.ai/api/status
```

The response must match the actual live state at the time of the request.

---

# 16. Workstream K: Vercel production alignment

## K1. Environment audit

Use authenticated Vercel tooling to confirm required variable names exist in the intended targets without displaying values.

Required production groups include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
OPEN_ROUTER_API_KEY
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
RESEND_INBOUND_DOMAIN
RESEND_FROM_EMAIL
CRON_SECRET
CLOUDMERSIVE_API_KEY
CLOUDMERSIVE_MONTHLY_REQUEST_LIMIT
CLOUDMERSIVE_MONTHLY_REQUEST_RESERVE
CLOUDMERSIVE_MIN_INTERVAL_MS
CLOUDMERSIVE_MAX_FILE_BYTES
CLOUDMERSIVE_TIMEOUT_MS
```

Confirm mutually exclusive generic scanner variables.

## K2. Deployment order

1. Green local gate.
2. Green GitHub Actions on the exact commit.
3. Reviewed Preview deployment.
4. Apply reviewed Supabase migration.
5. Verify Preview behavior.
6. Merge reviewed commit.
7. Confirm Production deployment uses exact SHA.
8. Verify runtime logs.
9. Run safe live probes.
10. Run actual synthetic intake journeys.
11. Record deployment ID and SHA.

## K3. Runtime checks

Verify:

- no current grouped runtime errors
- no scanner secret in logs
- no provider response body in logs
- `/api/cron/inbound-email` returns 200
- latest worker runs complete
- `/api/webhooks/resend` receives signed events
- authenticated `/api/portal/chat/sessions` no longer reports schema errors
- customer upload and Manage intake routes return expected statuses

## K4. Canonical domains

Use:

```text
https://costivra.ai
```

as the canonical production origin unless a reviewed decision says otherwise.

Ensure alternate custom and Vercel domains do not create ambiguous canonical links, auth redirects, or duplicate public indexing.

Use redirects or canonical metadata appropriately.

---

# 17. Workstream L: End-to-end supervised pilot proof

Use a disposable pilot organization and synthetic, non-customer files.

Do not use real customer bills.

## L1. Scanner proof

Run explicitly:

```bash
npm run ops:cloudmersive
npm run ops:cloudmersive:eicar
```

Expected:

```text
clean probe -> clean
inert antivirus probe -> infected
```

Confirm:

- two budget reservations are recorded
- no secret appears
- result ledger records both
- public status changes according to persisted proof
- readiness GET did not consume extra calls

## L2. Manual upload proof

Exercise:

1. Clean supported file
2. Duplicate clean file
3. Mocked or preview infected file
4. Over-provider-limit file
5. Provider timeout or forced unavailable state
6. Quarantine rescan

Verify:

- clean proceeds
- duplicate does not rescan unnecessarily when safe provenance allows reuse
- infected is blocked
- oversized manual file receives clear feedback
- unavailable is quarantined or rejected safely
- no AI sees unclean bytes
- customer receives correct toast
- document detail shows scan receipt
- audit records exist
- no duplicate expense appears

## L3. Forwarded-email proof

1. Use an approved synthetic sender.
2. Send one supported synthetic invoice to a disposable intake address.
3. Confirm Resend receives it.
4. Confirm the signed webhook records it.
5. Confirm the one-minute worker claims it.
6. Confirm the attachment is downloaded before its URL expires.
7. Confirm the distributed budget reserves a slot.
8. Confirm the scan passes.
9. Confirm the document is stored privately.
10. Confirm extraction begins only after the scan.
11. Confirm the vendor monitoring test activates when appropriate.
12. Confirm customer inbound activity shows per-file security status.
13. Confirm the forwarding-test lifecycle email is sent and reconciled.
14. Clean up disposable records without touching shared fixtures.

## L4. Quarantine recovery proof

Rescan the four historical quarantined attachments after:

- credential rotation
- clean probe
- inert antivirus proof
- migration verification

Verify source hashes and idempotency.

## L5. Lifecycle email proof

For each of the nine email kinds:

- trigger from its actual domain event
- create one side-effect row
- send once
- suppress duplicate trigger
- reconcile provider event
- render branded HTML and text
- link to an authenticated route
- avoid sensitive details

## L6. Financial workflow proof

Re-run the existing disposable pilot journey:

```text
upload
→ scan
→ extract
→ review
→ approve invoice
→ create expense once
→ create finding
→ request approval
→ authorize action
→ accept baseline
→ receive later comparison
→ review verification
→ verify outcome
```

Confirm audit events and protected transitions.

## L7. Tenant isolation proof

Run live tenant-isolation tests with disposable users.

Prove:

- tenant A cannot read tenant B's scan receipt
- tenant A cannot read tenant B's document
- tenant A cannot access tenant B's inbound attachment
- browser cannot access provider budget
- browser cannot execute scanner reservation RPC
- browser cannot read provider health raw records
- private downloads use authorized signed access only

---

# 18. Browser and product QA

Use a real browser.

Critical routes:

```text
/
 /login
 /signup
 /scan
 /status

 /app
 /app/documents
 /app/documents/[documentId]
 /app/vendors/[vendorId]
 /app/settings?tab=integrations

 /manage
 /manage/intake
 /manage/intake/[eventId]
 /manage/settings
```

Viewport set:

```text
1440 x 900
1024 x 768
820 x 1180
390 x 844
375 x 812
```

Check:

- no console errors
- no failed network calls
- no horizontal overflow
- no clipped status
- keyboard access
- visible focus
- reduced motion
- accurate loading state
- accurate clean state
- accurate quarantine state
- accurate blocked state
- accurate empty state
- accurate operator recovery controls
- correct customer-safe scan copy
- no raw internal slug
- no provider secret
- no provider-specific customer error
- no false operational claim

Store evidence in:

```text
output/playwright/final-pilot-readiness/
```

Do not commit authentication state or customer files.

---

# 19. Required automated tests

## Scanner contract

- Cloudmersive fixed endpoint
- exact `Apikey` header
- exact `inputFile` field
- no manual multipart content-type
- clean `CleanResult`
- infected `CleanResult`
- multiple bounded signatures
- invalid JSON
- missing `CleanResult`
- wrong `CleanResult` type
- 401
- 403
- 413
- 429
- 500
- 503
- network error
- timeout
- generic response rejected by Cloudmersive adapter
- Cloudmersive key never sent to generic URL

## Budget

- first reservation
- concurrent first reservation
- one-request-per-second spacing
- monthly reset in UTC
- reserve boundary
- invalid parameters
- long-wait behavior
- no increment for unsent request
- RPC failure causes production quarantine
- local fallback requires explicit flag
- browser RPC denial
- browser table denial

## Intake

- clean manual upload
- infected manual upload
- unavailable manual upload
- over-plan manual upload
- duplicate manual upload
- clean forwarded attachment
- infected forwarded attachment
- unavailable forwarded attachment
- clean quarantine release
- infected quarantine release
- idempotent release
- blocked quarantined download

## Customer UI

- processed toast
- quarantined warning
- infected error
- duplicate notice
- effective file-size copy
- security receipt
- per-attachment inbound status
- accessible live regions

## Lifecycle email

- each message renderer
- correct financial language
- stable resource idempotency
- side-effect schema
- one send per trigger
- delivery reconciliation
- bounce and failure reconciliation
- no open/click dependency
- no sensitive text
- verified sender and reply-to

## Public status

- unconfigured scanner -> limited
- configured but unproven -> limited
- clean only -> limited
- clean plus inert antivirus proof -> operational when all other dependencies are healthy
- quota reserve reached -> limited
- worker down -> outage or limited according to intake capability
- no live provider call during GET

---

# 20. Full final validation

Run on the exact release commit:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
```

With explicitly supplied ignored credentials:

```bash
npm run test:integration:live
npm run ops:cloudmersive
npm run ops:cloudmersive:eicar
npm run ops:verify
```

Run secret scanning.

Run Supabase migration checks.

Run Supabase security advice.

Run Supabase performance advice.

Run Vercel runtime-error and runtime-log checks.

Run Resend domain, webhook, sent-email, received-email, and delivery-event checks.

Do not group all commands under a vague statement such as `everything passed`.

Record each command and result.

---

# 21. P0 acceptance matrix

The release verdict may be `READY_FOR_SUPERVISED_PILOT` only when every row is green.

| Gate | Required evidence |
|---|---|
| Exposed scanner key | Old credential revoked and replacement configured |
| Repository secrets | Current tree and history scanned with redacted output |
| GitHub CI | Full quality workflow passes on exact SHA |
| Runtime alignment | CI, local standard, and Vercel use reviewed Node version |
| Supabase scanner RPC | Browser denied, service role allowed |
| Supabase budget table | Browser privileges revoked, RLS enabled |
| Migration history | Local and remote migration truth reconciled |
| Scanner contract | Strict provider parsing and fail-closed behavior |
| Distributed budget | Concurrency, spacing, reserve, and failure behavior proven |
| Clean probe | Live pass with rotated key |
| Inert antivirus probe | Live infected detection pass |
| Manual upload | Clean, quarantine, block, duplicate, and oversize proven |
| Forwarded upload | Trusted sender through Resend, worker, scan, storage, extraction |
| Budget evidence | Live `cloudmersive` budget row with expected usage |
| Customer UI | Outcome-specific feedback and durable scan receipt |
| Manage UI | Recovery, provider health, quota, and errors visible safely |
| Public status | Matches actual secure-processing state |
| Lifecycle email | Nine real triggers wired and idempotent |
| Resend delivery | Delivery and failure events reconcile side effects |
| Worker | Recent one-minute production runs complete |
| Runtime logs | No current P0 error cluster |
| Tenant isolation | Live disposable cross-tenant tests pass |
| Financial workflow | Complete disposable journey passes |
| Exact deployment | Production deployment SHA equals green release SHA |
| Status document | No contradictory readiness claim |

---

# 22. Human and policy checkpoints

These actions cannot be solved honestly by code alone.

## Required before supervised pilot

- Confirm old Cloudmersive key revoked.
- Confirm replacement key in intended Vercel environments.
- Confirm exact Cloudmersive account file-size limit.
- Confirm pilot customer list and invite-only access.
- Confirm incident owner and support address.
- Confirm no real customer source is used in QA.

## Required before charging or broad launch

- Counsel approval of Terms and Privacy.
- Cloudmersive subprocessor and DPA review.
- UCEP relationship and consent review.
- Retention and deletion policy approval.
- Restore exercise.
- Real de-identified extraction evaluation set.
- Any required Supabase plan security control.
- Broad external monitoring and incident response.

Do not hide these behind a technical `ready` badge.

---

# 23. Status-document correction

Add a new top section to `STATUS.md` with:

```text
Current audited commit
Current GitHub Actions result
Current production deployment
Cloudmersive rotation state
Clean probe state
Inert antivirus probe state
Live manual upload state
Live forwarded upload state
Scanner budget usage
Resend domain/webhook state
Supabase advisor state
Pilot verdict
Remaining human blockers
```

Do not delete historical sections.

Clearly supersede older readiness claims when current evidence changes.

Example:

```text
The August 4 green-gate entry described an earlier commit. The current release commit must pass its own complete gate before the pilot verdict remains valid.
```

---

# 24. Final handoff format

The final Antigravity response must contain these sections.

## A. Verdict

One of:

```text
READY_FOR_SUPERVISED_PILOT
INTERNAL_TESTING_ONLY
BLOCKED
```

## B. Exact release identity

```text
Git commit SHA
GitHub Actions run
Vercel deployment ID
Production URL
Supabase migration version
```

## C. Changed files

Group by:

- GitHub/CI
- scanner
- Supabase
- customer UI
- Manage UI
- Resend/lifecycle
- status/readiness
- tests
- documentation

## D. Credential safety

State only:

```text
Old credential revoked: yes/no
Replacement configured: yes/no
Secret scan passed: yes/no
Secret printed or committed: no
```

Never include the credential.

## E. Live scanner proof

```text
Clean probe result
Inert antivirus result
Manual upload result
Forwarded invoice result
Quarantine recovery result
Budget used and remaining
```

## F. Supabase proof

```text
RPC privileges
Table privileges
RLS
Migration alignment
Security advisor
Relevant performance advisor
Tenant isolation
```

## G. Vercel proof

```text
Environment names verified
Node version
Latest deployment
Cron health
Runtime errors
Exact SHA alignment
```

## H. Resend proof

```text
Domain verification
Sending capability
Receiving capability
Webhook status
Synthetic inbound result
Lifecycle send result
Delivery reconciliation
Failure reconciliation
```

## I. Customer experience proof

Include screenshots and describe:

- clean upload
- quarantined upload
- blocked upload
- document scan receipt
- forwarded attachment scan status
- mobile layout

## J. Remaining manual actions

Only real unresolved items.

## K. Rollback

Provide:

- last known good deployment
- database migration rollback limitations
- feature-disable path that preserves quarantine
- secret rotation recovery
- no destructive data rollback

---

# 25. Final instruction

Do not optimize for the appearance of completion.

Optimize for a system that can truthfully tell a pilot customer:

> Your bill was received, security-scanned, processed into traceable records, and kept under your control.

The task is done only when the repository, database, deployment, email provider, scanner, customer interface, and internal operations all tell the same story.
