# Packet 03: Security Scanner Provenance and Customer Feedback

## Mission

Complete the malware-scanning proof chain for manual uploads and forwarded email attachments. Every processed file must have a durable scan attempt, an honest customer-visible state, and an operator recovery path.

Do not weaken fail-closed behavior to make files process faster.

## Required files to inspect

```text
src/lib/security/malware-scanner-core.ts
src/lib/security/document-scan-provenance.ts
src/lib/documents/manual-upload.ts
src/lib/documents/intake.ts
src/lib/email/inbound-intake.ts
src/lib/email/quarantine-release.ts
src/app/api/portal/documents/route.ts
src/app/api/webhooks/resend/route.ts
src/components/manage-intake-operations.tsx
src/components/portal-pages.tsx
src/components/portal-record-detail.tsx
src/lib/portal/types.ts
src/lib/manage/system-readiness.ts
scripts/verify-cloudmersive.ts
.env.example
docs/PRODUCTION_LAUNCH_CHECKLIST.md
```

Inspect the live tables:

```text
documents
document_security_scan_attempts
inbound_email_attachments
external_provider_request_budgets
inbound_worker_runs
```

## Non-negotiable scan states

Use one consistent state contract:

- `pending`
- `scanning`
- `clean`
- `infected`
- `unavailable`
- `failed`

Only `clean` may proceed to extraction, preview, or normal download.

`unavailable`, timeout, malformed response, provider error, quota exhaustion, ambiguous configuration, and rate-control failure must never be treated as clean.

## Workstream A: Durable scan attempts

Every scanner invocation must insert a `document_security_scan_attempts` record with:

- organization
- document
- SHA-256
- source type
- provider
- status
- safe code
- provider HTTP status when safe
- start time
- completion time

Sources must include:

- manual upload
- forwarded email
- quarantine rescan
- provider integration when later supported

Do not create fake historical clean attempts for old records.

For legacy documents:

- preserve their existing state;
- label them as legacy or unproven where needed;
- rescan only when the original source is still available;
- never infer clean from successful historical extraction.

## Workstream B: Distributed Cloudmersive budget

The production scanner must use the distributed database reservation path.

Requirements:

- One durable monthly counter per provider and billing period.
- Minimum interval enforcement across serverless instances.
- Reserve capacity for operator verification and recovery.
- No production fallback to a process-local timer when the database reservation fails.
- A database reservation failure results in `unavailable` and quarantine.
- Browser roles cannot execute the reservation function.
- Use `SECURITY INVOKER` where possible.
- Revoke execute from `PUBLIC`, `anon`, and `authenticated`.
- Grant only the server role required by the application.
- Add concurrency tests for first-use initialization and simultaneous claims.

Keep the free-plan defaults configurable:

```text
CLOUDMERSIVE_MONTHLY_REQUEST_LIMIT
CLOUDMERSIVE_MONTHLY_REQUEST_RESERVE
CLOUDMERSIVE_MIN_INTERVAL_MS
CLOUDMERSIVE_MAX_FILE_BYTES
CLOUDMERSIVE_TIMEOUT_MS
```

Add them to `.env.example` without values that expose a credential.

## Workstream C: Strict provider response parsing

For Cloudmersive:

- Require the documented Cloudmersive result field.
- Do not accept an unrelated generic response shape as proof of clean.
- Preserve the provider-neutral adapter separately if it is still needed.
- Reject malformed JSON.
- Bound all error detail before persistence or display.
- Never store provider secrets or full raw responses.

## Workstream D: Manual upload customer feedback

Expose safe scan fields in the customer document view model:

- current scan status
- scanned timestamp
- safe code
- attempt count
- whether source integrity matched the stored digest
- whether the source is currently quarantined

Customer UI states:

### Clean

```text
Security scan passed
Scanned <timestamp>
File integrity verified
```

### Pending or scanning

```text
Security check in progress
Costivra has not analyzed this file yet.
```

### Quarantined

```text
Safely quarantined
The security check could not complete. No extraction or preview occurred.
```

### Infected

```text
File blocked
The file failed the security check and was not analyzed.
```

Do not reveal virus-signature detail to customers beyond a safe high-level message.

The upload toast must branch on the actual API outcome. Preserve the existing differentiated toast helper.

## Workstream E: Forwarded email feedback

For each forwarded attachment, show:

- filename
- scan status
- processing status
- document link when clean and processed
- quarantine reason when safe
- retry eligibility

The monitoring setup must not become active merely because an email arrived. Activation requires a supported clean attachment and the required vendor/document association.

## Workstream F: Operator recovery

Preserve and improve Manage intake controls:

- inspect event
- inspect each attachment
- rescan quarantined source
- retry safe extraction after clean scan
- reject infected source
- show immutable scan history
- show quota or provider-health state
- no download or preview before clean

All operator actions require internal authorization and audit events.

## Workstream G: Live proof

Use only:

- a harmless clean fixture
- the official inert antivirus test fixture

Prove all four paths:

1. Clean manual upload
2. Inert-test manual upload
3. Clean forwarded attachment
4. Inert-test forwarded attachment

For each, verify:

- provider result
- durable scan attempt
- document or quarantine state
- extraction allowed or blocked
- customer feedback
- Manage feedback
- audit event
- no duplicate records on retry

Never use real malware.

## Workstream H: Readiness and status

The internal readiness check may report:

- ready
- warning
- blocked

It must not consume a provider request during an ordinary GET.

The public status route must remain sanitized and must not say document intelligence is fully operational when the scanner is configured but unproven or blocked.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run ops:cloudmersive
npm run ops:cloudmersive:eicar
npm run ops:readiness
npm run ops:smoke
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

The inert-test command may require explicit local configuration. Explain rather than fake any skipped live test.

## Acceptance criteria

- Every new scanner invocation creates a durable attempt.
- No unscanned or non-clean source reaches extraction or preview.
- Distributed quota control fails closed.
- Manual and email intake both pass clean/inert proof.
- Customer scan feedback is specific and truthful.
- Manage recovery remains operational.
- Public status no longer overstates scanner readiness.
- No secret or private file content appears in logs.
- No branch, commit, push, merge, or deployment was performed.
