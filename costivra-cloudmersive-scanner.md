---
description: Activate and harden Costivra's existing Cloudmersive malware-scanning boundary for the supervised pilot. Preserve fail-closed document handling, respect the 800-request monthly allowance and one-request-per-second limit, and prove clean, infected, unavailable, oversized, and rate-limited outcomes.
---

# Costivra Cloudmersive Malware Scanner Implementation

## Antigravity workflow for Gemini Flash

**Repository:** `powerchoosers/costivra`  
**Primary branch:** `main`  
**Recommended workflow location:** `.agents/workflows/costivra-cloudmersive-scanner.md`  
**Suggested command:** `/costivra-cloudmersive-scanner`  
**Prepared:** August 4, 2026  
**Provider:** Cloudmersive Virus Scan API  
**Account limits supplied by the founder:** **800 requests per month** and **1 request per second**

> This is an implementation directive for the existing Costivra platform. It is not permission to replace the document pipeline, weaken quarantine, add a second upload system, expose the API key, or claim that files are safe when Cloudmersive did not return a valid clean result.

---

# 1. Mission

Activate and production-harden Costivra's existing Cloudmersive adapter so that every supported customer source file follows this invariant:

```text
validate file
→ calculate SHA-256
→ Cloudmersive scan
→ clean: continue to private storage and extraction
→ infected: reject and do not analyze
→ unavailable, malformed, oversized-for-plan, rate-limited, or failed: quarantine
```

The implementation must cover every existing ingestion surface that already uses `scanFileForMalware`:

- Customer manual uploads
- Customer chat attachments that reuse manual intake
- Forwarded invoice and contract attachments
- Internal mailbox attachments where scanning is required
- Quarantine release and rescan
- Owner production-readiness probes

The result must remain consistent with Costivra's doctrine:

> **AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.**

Malware scanning is a code and policy boundary. An AI model must never decide that a file is safe.

---

# 2. Read Before Editing

Read these files completely before changing code:

```text
AGENTS.md
COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md
DECISIONS.md
STATUS.md
README.md
docs/EMAIL_INTAKE_SETUP.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
.env.example
package.json

src/lib/security/malware-scanner.ts
src/lib/security/malware-scanner.test.ts
src/lib/documents/manual-upload.ts
src/lib/documents/manual-upload-policy.ts
src/lib/documents/intake.ts
src/lib/email/inbound-intake.ts
src/lib/email/quarantine-release.ts
src/lib/manage/system-readiness.ts
src/lib/manage/system-readiness.test.ts
scripts/ops-readiness.ts
```

Inspect all call sites of:

```text
scanFileForMalware
isMalwareScannerConfigured
manualUploadScanDecision
releaseQuarantinedInboundAttachments
```

Do not assume the paths above are the only call sites. Search the current branch.

---

# 3. Verified Current Repository State

Recheck these observations against the current branch before implementation.

## 3.1 Existing provider adapter

`src/lib/security/malware-scanner.ts` already:

- Recognizes `CLOUDMERSIVE_API_KEY`
- Uses `https://api.cloudmersive.com/virus/scan/file`
- Sends multipart form-data
- Uses Cloudmersive's `inputFile` field
- Sends the key in the `Apikey` header
- Parses `CleanResult`
- Reads the first `VirusName`
- Uses a 30-second timeout
- Returns `clean`, `infected`, `unavailable`, or `failed`

Do not build a second Cloudmersive client in another folder.

## 3.2 Existing fail-closed behavior

The current document flow already has the right safety philosophy:

- `clean` may continue.
- `infected` is rejected.
- `failed` or `unavailable` is quarantined.
- `ingestDocumentBuffer` refuses any file unless its scan status is `clean`.
- Quarantined files cannot be downloaded through the normal customer route.
- Quarantine release performs another scan before extraction.
- SHA-256 is used for provenance and deduplication.
- Originals are stored privately.

Preserve these boundaries.

## 3.3 Existing test gap

Current scanner tests mainly prove:

- Placeholder secrets are treated as unconfigured.
- No configured scanner produces `unavailable`.

They do not sufficiently prove the Cloudmersive request contract, response parsing, failure mapping, rate limits, quota limits, free-tier file limits, timeout behavior, or secret isolation.

## 3.4 Configuration ambiguity that must be fixed

The current adapter can read both:

```text
MALWARE_SCANNER_URL
CLOUDMERSIVE_API_KEY
```

The present endpoint-selection logic can choose `MALWARE_SCANNER_URL` while still attaching the Cloudmersive `Apikey` header when both are configured.

That creates a secret-routing risk.

**Required correction:** provider selection must be explicit and mutually exclusive. The Cloudmersive key must only ever be sent to the fixed Cloudmersive host.

---

# 4. Source-Verified Cloudmersive Contract

Use Cloudmersive's official documentation as the API source of truth.

## 4.1 Basic scan endpoint

```http
POST https://api.cloudmersive.com/virus/scan/file
Apikey: <server-only API key>
Content-Type: multipart/form-data; boundary=<generated automatically>
```

Multipart field:

```text
inputFile
```

Do not manually set the multipart `Content-Type` header. Let `fetch` generate the boundary.

Expected response shape:

```json
{
  "CleanResult": true,
  "FoundViruses": []
}
```

Infected response shape:

```json
{
  "CleanResult": false,
  "FoundViruses": [
    {
      "FileName": "example.pdf",
      "VirusName": "detected signature"
    }
  ]
}
```

## 4.2 Authentication

The API key header name is exactly:

```text
Apikey
```

Do not use:

```text
Authorization
Bearer
X-API-Key
api-key
```

for the Cloudmersive path.

## 4.3 Basic versus advanced scan

Cloudmersive also documents:

```text
POST /virus/scan/file/advanced
```

The advanced endpoint can inspect additional threat properties and restrict file types.

For this pilot implementation:

- Keep the existing **basic** endpoint.
- Do not silently switch to the advanced endpoint.
- Costivra already validates its supported types before scanning.
- A later evaluated change may adopt advanced scanning after confirming plan access, expected false-positive behavior, and supported document formats.
- Record this decision in `DECISIONS.md` if implementation changes the selected endpoint.

## 4.4 Provider security statements

Cloudmersive states that its public virus-scanning service processes payloads in memory, does not retain the payload, and uses encrypted transport. Treat these as provider statements that still require Costivra's privacy, DPA, subprocessor, and customer-disclosure review. Do not convert a provider marketing statement into a legal guarantee.

## 4.5 Account-limit discrepancy

The founder's Cloudmersive dashboard reports:

```text
800 requests per month
1 request per second
```

Some current public Cloudmersive pages show different free-tier call and file-size limits, while Cloudmersive tutorials also reference 800 calls.

Therefore:

- Treat the founder's authenticated dashboard as authoritative for monthly calls and per-second throughput.
- Do not hardcode public marketing-page limits as universal truth.
- Make plan controls configurable through server-only environment variables.
- Use a conservative default file-size limit until the dashboard's exact maximum file size is confirmed.
- Surface the configured limit in owner readiness without exposing secrets.

Official references are listed at the end of this directive.

---

# 5. Non-Negotiable Security Rules

1. `CLOUDMERSIVE_API_KEY` is server-only.
2. Never prefix it with `NEXT_PUBLIC_`.
3. Never commit the key.
4. Never print the key, a partial key, request headers, multipart body, or full provider response.
5. Never return provider diagnostics directly to a customer.
6. Never send the Cloudmersive key to a configurable or user-supplied URL.
7. Never call Cloudmersive from a browser component.
8. Never continue to OCR, extraction, preview, signed download, or other downstream processing without a valid `CleanResult: true`.
9. Never interpret HTTP `200` alone as clean.
10. Never interpret an empty `FoundViruses` array without `CleanResult: true` as clean.
11. Never treat timeout, `429`, malformed JSON, `401`, `403`, `413`, network failure, or `5xx` as clean.
12. Never shrink, rewrite, convert, or split a file merely to get it under the scanner plan limit.
13. Never use actual malware for verification. Use a harmless clean text probe and the official inert EICAR antivirus test file.
14. Automated CI must never consume the live Cloudmersive allowance.
15. Test fixtures and mocks must never contain the real API key.

---

# 6. Target Configuration

Update `.env.example` with comments only. Do not place real values in the repository.

```dotenv
# Direct Cloudmersive virus scanning. Server-only.
CLOUDMERSIVE_API_KEY=

# The founder's current authenticated plan allowance.
CLOUDMERSIVE_MONTHLY_REQUEST_LIMIT=800

# Keep a small reserve for readiness and recovery operations.
CLOUDMERSIVE_MONTHLY_REQUEST_RESERVE=20

# The account allows one request per second. Use 1100ms to absorb timing jitter.
CLOUDMERSIVE_MIN_INTERVAL_MS=1100

# Confirm the exact account limit in the Cloudmersive dashboard.
# Until confirmed, use the conservative current public free-tier value.
CLOUDMERSIVE_MAX_FILE_BYTES=3500000

# Provider request timeout. Keep bounded.
CLOUDMERSIVE_TIMEOUT_MS=30000
```

Keep these generic-adapter variables for future provider replacement:

```dotenv
MALWARE_SCANNER_URL=
MALWARE_SCANNER_TOKEN=
```

But require exactly one provider configuration:

```text
Cloudmersive:
  CLOUDMERSIVE_API_KEY is configured
  MALWARE_SCANNER_URL is empty

Generic:
  MALWARE_SCANNER_URL is configured
  CLOUDMERSIVE_API_KEY is empty

Invalid:
  both are configured
```

An invalid dual-provider configuration must fail closed and appear as blocked in owner readiness.

Do not make the Cloudmersive endpoint configurable. Use a fixed constant:

```ts
const CLOUDMERSIVE_SCAN_URL =
  "https://api.cloudmersive.com/virus/scan/file";
```

---

# 7. Workstream A: Establish a Clean Baseline

Before editing:

```bash
git status --short
git log -5 --oneline
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Record existing failures in `STATUS.md`.

Do not hide, delete, or weaken an existing test to make this task green.

Do not run a live Cloudmersive request during the baseline.

---

# 8. Workstream B: Refactor Provider Configuration Safely

Refactor `src/lib/security/malware-scanner.ts` around an explicit configuration union.

Suggested shape:

```ts
type MalwareScannerConfig =
  | {
      provider: "cloudmersive";
      apiKey: string;
      monthlyLimit: number;
      monthlyReserve: number;
      minIntervalMs: number;
      maxFileBytes: number;
      timeoutMs: number;
    }
  | {
      provider: "generic";
      endpoint: URL;
      token?: string;
      timeoutMs: number;
    }
  | {
      provider: "unavailable";
      code:
        | "not_configured"
        | "ambiguous_configuration"
        | "invalid_configuration";
      detail: string;
    };
```

Add:

```ts
getMalwareScannerConfig()
```

Requirements:

- Use the existing placeholder-secret validator.
- Parse integers safely.
- Enforce sensible bounds.
- Reject negative and non-numeric plan values.
- Reject a Cloudmersive max size greater than Costivra's application maximum only as a configuration warning, not as a security failure.
- Return no secret in the result.
- Do not accept a browser-provided provider or endpoint.
- Add `import "server-only";` to the scanner boundary.

`isMalwareScannerConfigured()` should return true only for a single valid provider configuration.

Owner readiness should report ambiguous configuration as blocked.

---

# 9. Workstream C: Strengthen the Scan Result Contract

Extend `MalwareScanResult` with safe machine-readable metadata while preserving current downstream compatibility.

Suggested shape:

```ts
export type MalwareScanResult = {
  status: "clean" | "infected" | "unavailable" | "failed";
  provider?: "cloudmersive" | "generic";
  code?:
    | "not_configured"
    | "ambiguous_configuration"
    | "file_exceeds_provider_limit"
    | "monthly_quota_reserved"
    | "rate_limit_wait_exceeded"
    | "provider_rate_limited"
    | "provider_unauthorized"
    | "provider_rejected_file"
    | "provider_unavailable"
    | "timeout"
    | "invalid_json"
    | "malformed_response"
    | "infected";
  retryable?: boolean;
  signature?: string;
  detail?: string;
  providerHttpStatus?: number;
};
```

Rules:

- Customer-facing code may use only generic safe messages.
- Internal owner tools may show `code`, provider name, HTTP status, and bounded detail.
- Never store or display the API key.
- Never store raw response bodies.
- Bound signature and detail lengths.
- If several viruses are returned, deduplicate names and keep a bounded summary.
- Do not include customer account identifiers or source document text in logs.

---

# 10. Workstream D: Implement the Exact Cloudmersive Request

Use native Node `fetch`, `FormData`, and `File`. Do not add `cloudmersive-virus-api-client` unless the existing platform is insufficient. It is not needed for this endpoint.

Pseudocode:

```ts
const form = new FormData();
form.set(
  "inputFile",
  new File(
    [new Uint8Array(input.buffer)],
    input.filename,
    { type: input.mimeType },
  ),
);

const response = await fetch(CLOUDMERSIVE_SCAN_URL, {
  method: "POST",
  headers: {
    Apikey: config.apiKey,
  },
  body: form,
  signal: AbortSignal.timeout(config.timeoutMs),
  cache: "no-store",
  redirect: "error",
});
```

Do not manually set `Content-Type`.

Before the request:

1. Confirm a valid Cloudmersive configuration.
2. Confirm the buffer is non-empty.
3. Confirm the file does not exceed `CLOUDMERSIVE_MAX_FILE_BYTES`.
4. Claim a provider request slot.
5. Wait only for the bounded scheduled interval.
6. Then make one provider request.

Parse JSON only after reading the status safely.

Response mapping:

| Condition | Costivra result |
|---|---|
| `200` and `CleanResult === true` | `clean` |
| `200` and `CleanResult === false` | `infected` |
| `200` and missing/non-boolean `CleanResult` | `failed / malformed_response` |
| Invalid JSON | `failed / invalid_json` |
| `401` or `403` | `failed / provider_unauthorized`, not retryable |
| `413` | `failed / provider_rejected_file`, not retryable |
| `429` | `failed / provider_rate_limited`, retryable |
| `408`, `425`, `502`, `503`, `504` | `failed / provider_unavailable`, retryable |
| Other `5xx` | `failed / provider_unavailable`, retryable |
| Timeout | `failed / timeout`, retryable |
| Network failure | `failed / provider_unavailable`, retryable |

Do not automatically retry inside the low-level scanner for this free-tier integration. The durable intake and quarantine-recovery workflows already provide bounded recovery paths. Immediate hidden retries waste the monthly allowance and make provider usage harder to understand.

---

# 11. Workstream E: Enforce the Free-Tier File Limit

Costivra currently supports files up to 20 MB. The Cloudmersive free account may have a smaller maximum.

Do not lower Costivra's general `MAX_DOCUMENT_SIZE` merely to match one provider plan.

Instead:

```text
file <= Costivra maximum and <= Cloudmersive maximum:
  scan normally

file <= Costivra maximum but > Cloudmersive maximum:
  do not call Cloudmersive
  return unavailable with code file_exceeds_provider_limit
  quarantine privately
  show a clear safe message
  do not extract
```

Customer message:

> This file is larger than the current security-scanning plan can process. It has been quarantined and has not been analyzed.

Owner message may additionally show:

- File size
- Configured provider maximum
- Required next action: upgrade the scanner plan or use an approved alternate scanner

Do not expose plan details to customers unless product copy explicitly intends to do so.

Add a readiness warning when Costivra's accepted maximum exceeds Cloudmersive's configured maximum.

---

# 12. Workstream F: Add a Cross-Instance Rate and Quota Gate

The account allows one request per second. Vercel may run concurrent server instances, so an in-memory mutex is insufficient.

Implement a small server-only Supabase-backed provider budget.

## 12.1 Migration

Create a reviewed migration with a table similar to:

```sql
create table if not exists public.external_provider_request_budgets (
  provider text primary key,
  period_start date not null,
  used_count integer not null default 0 check (used_count >= 0),
  next_allowed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Requirements:

- Enable RLS.
- Grant no browser read or write access.
- Explicitly deny `anon` and `authenticated`.
- Keep service-role access.
- Add no customer-identifying columns.
- Do not store API keys.
- Do not store file names or document content.

Create a service-role-only function that atomically:

1. Locks the provider row.
2. Resets the monthly count when the calendar month changes.
3. Refuses a reservation when:

```text
used_count >= monthly_limit - monthly_reserve
```

4. Schedules the request at:

```text
max(now(), next_allowed_at)
```

5. Advances `next_allowed_at` by the configured minimum interval.
6. Increments `used_count`.
7. Returns:

```text
allowed
scheduled_at
wait_ms
used_count
remaining_count
period_start
```

Use UTC month boundaries.

Set a fixed empty `search_path` for any security-definer function.

Grant function execution only to `service_role`.

Verify the function and grants with SQL assertions.

## 12.2 Runtime behavior

Before a Cloudmersive call:

- Reserve a slot.
- If monthly customer-call capacity is exhausted, do not call the provider.
- Return `unavailable / monthly_quota_reserved`.
- Allow the caller to quarantine the file.
- If the scheduled wait is reasonable, wait.
- If the wait exceeds a bounded ceiling such as 15 seconds, return `unavailable / rate_limit_wait_exceeded` and quarantine.
- Use `1100ms` as the default interval for a nominal one-request-per-second account.

The internal budget is a protective estimate. The Cloudmersive dashboard remains the billing source of truth.

## 12.3 Readiness display

Owner readiness should show safe operational data:

```text
Cloudmersive configured
Configured monthly limit: 800
Internal requests reserved this month: N
Remaining before operational reserve: N
Configured throughput: 1 request per 1100ms
Configured file maximum: N MB
```

Do not show the key or a reversible fingerprint.

Warn at 80% of usable capacity.

Block new automatic processing at the configured reserve boundary.

---

# 13. Workstream G: Preserve All Existing Intake Outcomes

## 13.1 Manual upload

Keep this behavior:

```text
duplicate known document:
  return duplicate before a new provider call where existing provenance supports it

clean:
  ingest and extract

infected:
  reject
  do not store as an available source
  audit rejection

unavailable or failed:
  store only in private quarantine
  no extraction
  no signed download
```

Do not change `ingestDocumentBuffer` to accept anything other than `clean`.

## 13.2 Forwarded email

Keep provider calls outside the signed Resend webhook request. The durable worker is the correct execution boundary.

For each supported attachment:

- Download from the short-lived Resend URL.
- Validate size and type.
- Calculate SHA-256.
- Scan.
- Continue only when clean.
- Quarantine provider failures.
- Reject infected files.
- Preserve attachment and event status.
- Notify operators when recovery is required.

The one-request-per-second gate must work across attachments and concurrent worker/manual-upload instances.

## 13.3 Quarantine release

Rescan the immutable quarantined bytes.

Before release:

- Verify the stored object is still present.
- Recalculate and compare SHA-256 where the current record has a digest.
- Recheck type and size.
- Reserve a provider slot.
- Require `CleanResult: true`.

If the result is still unavailable or failed, keep the object quarantined.

If infected:

- Mark rejected.
- Preserve the audit record.
- Remove the private object only after the database state is safely updated.
- Record whether deletion succeeded.

If clean:

- Run the normal ingestion path.
- Do not create duplicate documents or expenses.
- Remove the quarantine object only after the durable source record exists.

## 13.4 Chat attachments

Do not create a chat-specific scanner. Chat attachments must continue through the shared manual document intake path.

---

# 14. Workstream H: Expand Automated Tests

Mock `fetch`. Unit and CI tests must not call Cloudmersive.

## 14.1 Configuration tests

Add tests for:

- No provider configured
- Placeholder key
- Valid Cloudmersive key
- Valid generic scanner
- Both providers configured
- Invalid numeric plan settings
- Conservative defaults
- Secret never appears in returned config or error text

## 14.2 Request-contract tests

Prove:

- Fixed host is `api.cloudmersive.com`
- Fixed path is `/virus/scan/file`
- Method is `POST`
- Header is `Apikey`
- Multipart field is `inputFile`
- File name and MIME type are preserved
- Multipart `Content-Type` is not manually set
- Generic URL never receives the Cloudmersive key
- Browser code cannot import the server-only module

## 14.3 Response tests

Add tests for:

- Clean response
- Infected response
- Multiple virus names
- Missing `CleanResult`
- Wrong `CleanResult` type
- Invalid JSON
- `401`
- `403`
- `413`
- `429`
- `500`
- `503`
- Network rejection
- Timeout
- Bounded signature and detail

## 14.4 Plan-limit tests

Add tests proving:

- An under-limit file may call the provider.
- An over-limit file never calls the provider.
- Over-limit files return the correct code.
- Monthly capacity stops at the reserve boundary.
- The month resets in UTC.
- Two concurrent reservations receive different scheduled times.
- The minimum interval is at least 1100ms by default.
- Browser roles cannot access the provider-budget table or function.

## 14.5 Intake-policy tests

Prove:

- Clean manual upload may process.
- Infected manual upload is rejected.
- Failed or unavailable manual upload is quarantined.
- Over-provider-limit manual upload is quarantined.
- Clean forwarded attachment may process.
- Infected forwarded attachment is rejected.
- Rate-limited forwarded attachment remains quarantined.
- Clean rescan releases the quarantined file.
- Repeated release does not duplicate the document.
- Quarantined download remains denied.

---

# 15. Workstream I: Add Explicit Live Verification

Add a manual script:

```text
scripts/verify-cloudmersive.ts
```

Suggested commands:

```json
{
  "ops:cloudmersive": "tsx --env-file-if-exists=.env.local scripts/verify-cloudmersive.ts",
  "ops:cloudmersive:eicar": "tsx --env-file-if-exists=.env.local scripts/verify-cloudmersive.ts --eicar"
}
```

## 15.1 Default clean probe

The default command:

- Verifies configuration without printing the key.
- Displays configured rate, quota, reserve, and file limit.
- Sends one harmless small text file.
- Requires `CleanResult: true`.
- Reports safe elapsed time and result code.
- Exits non-zero on failure.

## 15.2 Infected-file exercise

The explicit `--eicar` mode:

- Uses the official inert EICAR antivirus test content.
- Does not use real malware.
- Requires an infected result.
- Never runs automatically in CI.
- Requires a deliberate command.
- Does not store the test file in production documents.
- Exits non-zero if the scanner incorrectly returns clean.

## 15.3 Safety

The live verification script must:

- Refuse placeholder keys.
- Never print the key.
- Never print request headers.
- Never upload a customer document.
- Consume no more than one request per selected probe.
- Respect the same provider rate gate.
- Explain that a live call consumes the account allowance.

---

# 16. Workstream J: Readiness and Operator UX

Update owner readiness so scanner states are truthful.

## Ready enough for a supervised pilot

```text
Valid single provider configuration
Clean probe passed
EICAR exercise recorded as passed
Current budget below warning threshold
No unresolved scanner-auth failure
```

## Warning

```text
Configured but clean probe not run
Clean probe passed but EICAR exercise not recorded
Costivra accepts files larger than the configured provider plan
Budget above 80%
```

## Blocked

```text
No scanner
Both provider configurations set
Invalid plan settings
Provider rejected key
Provider unreachable
Harmless file classified infected
EICAR classified clean
Quota reserve reached
```

Do not make the public `/status` endpoint perform a billable provider probe.

The public status page may show only a sanitized state such as:

```text
Document security checks operational
Document security checks limited
```

No provider name, quota, key state, or internal error should appear publicly.

---

# 17. Workstream K: Documentation and Deployment

Update:

```text
.env.example
docs/EMAIL_INTAKE_SETUP.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
STATUS.md
DECISIONS.md only if architecture decisions change
```

Document:

- Exact environment names
- The founder's 800-call and one-request-per-second plan
- Configurable free-tier file-size limit
- The difference between Costivra's 20 MB application limit and Cloudmersive's plan limit
- Fail-closed quarantine behavior
- Manual clean and EICAR verification commands
- Monthly allowance tracking
- What happens when quota is exhausted
- How to upgrade the scanner plan without changing the document pipeline
- Cloudmersive as a subprocessor requiring privacy/legal review
- How to rotate the key

## Vercel setup

The real API key must be added manually or through an authenticated Vercel secret-management flow:

```text
CLOUDMERSIVE_API_KEY
```

Add it separately to intended environments:

- Production
- Preview, if provider calls are permitted there
- Development, if used

Also add the non-secret plan controls.

Keep these empty when using Cloudmersive:

```text
MALWARE_SCANNER_URL
MALWARE_SCANNER_TOKEN
```

After changing Vercel environment variables:

1. Redeploy.
2. Run owner readiness.
3. Run the clean probe.
4. Run the explicit EICAR probe once.
5. Send one synthetic supported invoice through the real forwarding path.
6. Confirm the file becomes a private document only after a clean scan.
7. Confirm no secret appears in runtime logs.
8. Confirm the provider request count increased only as expected.

Do not place the key in this workflow, a commit, issue, screenshot, chat transcript, test fixture, or `STATUS.md`.

---

# 18. Required Validation

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Then, only from an environment containing the real ignored key:

```bash
npm run ops:cloudmersive
npm run ops:cloudmersive:eicar
npm run ops:verify
```

Run the live probes deliberately. Do not add them to ordinary CI.

If privileged Supabase credentials are available:

```bash
npm run test:integration:live
```

Inspect Supabase security and performance advisors after the migration.

Perform browser verification for:

- Manual clean upload
- Quarantined over-plan-limit upload
- Forwarded clean invoice
- Intake event with scanner failure
- Operator quarantine rescan
- Customer blocked download
- Owner readiness scanner panel

Inspect at:

```text
1440 × 900
820 × 1180
390 × 844
```

Check console and network errors.

---

# 19. Acceptance Criteria

This task is complete only when all statements below are true.

## Provider contract

- [ ] Costivra sends Cloudmersive requests only to the fixed official endpoint.
- [ ] The key is sent only in the `Apikey` header.
- [ ] The multipart field is exactly `inputFile`.
- [ ] Only `CleanResult: true` produces `clean`.
- [ ] `CleanResult: false` produces `infected`.
- [ ] Malformed and failed responses never produce `clean`.

## Secret safety

- [ ] Cloudmersive and generic scanner configurations are mutually exclusive.
- [ ] A generic scanner URL can never receive the Cloudmersive key.
- [ ] The key never reaches browser code.
- [ ] The key never appears in logs, API responses, tests, documentation, or audit payloads.

## Free-tier controls

- [ ] The configured monthly limit is 800.
- [ ] The configured throughput is one request per at least 1100ms.
- [ ] Rate control works across Vercel instances.
- [ ] A monthly reserve is preserved.
- [ ] File-size limits are checked before provider calls.
- [ ] Files larger than the Cloudmersive plan limit remain quarantined.
- [ ] Quota exhaustion remains fail-closed.

## Document safety

- [ ] Manual uploads scan before extraction.
- [ ] Forwarded files scan before extraction.
- [ ] Chat attachments use the shared intake path.
- [ ] Infected files are rejected.
- [ ] Provider failures and timeouts are quarantined.
- [ ] Quarantined files cannot receive signed download URLs.
- [ ] Rescan is idempotent and verifies immutable bytes.
- [ ] No downstream AI sees a file without a clean result.

## Verification

- [ ] Mocked scanner tests pass without live calls.
- [ ] The clean live probe passes.
- [ ] The official inert EICAR exercise passes.
- [ ] Full applicable CI is green.
- [ ] Supabase browser-access assertions pass.
- [ ] `STATUS.md` reports exact commands and results.
- [ ] No real customer document was used for the provider test.

---

# 20. Do Not Expand Scope

Do not add:

- Another upload pipeline
- A browser Cloudmersive SDK
- Cloudmersive OCR
- Cloudmersive phishing analysis
- Content Disarm and Reconstruction
- Advanced scan mode without a separate evaluated decision
- Customer-facing provider branding
- Automatic deletion of customer files outside existing retention policy
- Unlimited automatic retries
- A generic security dashboard
- New document categories
- A replacement queue or workflow engine

Finish the malware boundary and prove it.

---

# 21. Final Handoff Format

At completion, report:

## Changed

List every modified or added file.

## Cloudmersive contract

State:

- Endpoint used
- Header used
- Multipart field used
- Response fields accepted
- Timeout
- File-size behavior
- Rate behavior
- Quota behavior

Do not include the key.

## Validation

Provide exact commands and outcomes.

## Live proof

Report:

- Clean probe result
- EICAR probe result
- Synthetic forwarded-file result
- Quarantine result
- Approximate provider calls consumed during verification

## Database

Report:

- Migration name
- RLS/grant verification
- Rate-budget row status
- Advisor findings

## Remaining external actions

State any remaining founder action, such as:

- Confirming the authenticated account's maximum file size
- Adding the secret to another Vercel environment
- Provider DPA/privacy approval
- Upgrading from free tier before broader production use

## Release verdict

Choose one:

```text
Ready for supervised pilot
Internal testing only
Blocked
```

Do not claim pilot readiness when the scanner key is merely present. Pilot readiness requires both clean and infected-file proof plus fail-closed integration behavior.

---

# 22. Official Cloudmersive References

Use these official sources while implementing:

- Virus Scan API reference:  
  `https://api.cloudmersive.com/docs/virus.asp`

- Cloudmersive Node.js client documentation:  
  `https://api.cloudmersive.com/nodejs-client.asp`

- Small-business pricing and plan limits:  
  `https://cloudmersive.com/pricing-small-business`

- Cloudmersive FAQ, including request accounting and concurrency:  
  `https://cloudmersive.com/faq`

- Virus Scan product and security statements:  
  `https://cloudmersive.com/lp_virusscanapi`

The founder's authenticated account dashboard is the source of truth for this specific key's **800 requests per month** and **one request per second**. Keep the remaining plan properties configurable until verified.
