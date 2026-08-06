---
description: Repair Costivra's document breakdown API, persist scan provenance, align document statuses, and stop masking database failures as access errors.
---

# Chunk 1: Breakdown API and Security Provenance

## Goal

Make the document-breakdown endpoint reliable and truthful before changing the upload UX.

Recommended branch:

```text
agent/bill-upload-01-breakdown-contract
```

## Files to inspect

```text
src/app/api/portal/documents/[id]/breakdown/route.ts
src/components/bill-breakdown-modal.tsx
src/components/bill-inspector-provider.tsx

src/app/api/portal/documents/route.ts
src/lib/documents/manual-upload.ts
src/lib/documents/intake.ts
src/lib/email/inbound-intake.ts
src/lib/email/quarantine-release.ts
src/lib/security/malware-scanner.ts

src/lib/portal/repository.ts
src/lib/portal/types.ts
supabase/migrations/*
```

## P0 route bug

The breakdown query currently selects nonexistent live columns:

```text
security_scan_status
security_scanned_at
sha256_digest
```

Live uses:

```text
sha256
```

and has no durable document scan snapshot.

The route converts the resulting database error into:

```text
404 Document not found or access denied.
```

## Required error contract

Use separate branches:

```text
invalid ID:
  400

authorization-scoped record not found:
  404

document processing:
  202 with safe state payload

database query failure:
  500 with safe operational error code

analysis not yet created:
  202 or 200 with analysisReady=false

analysis ready:
  200 breakdown payload
```

Never translate a database error into an access-denied message.

Log safe server diagnostics with:

```text
trace ID
route
document ID
organization ID
database error code
```

Do not log source text, account numbers, signed URLs, or private storage paths.

## Persist security scan provenance

Create a reviewed migration.

### Current document snapshot

Add fields such as:

```text
security_scan_status
security_scanned_at
security_scan_safe_code
security_scan_attempt_count
```

Use internal statuses aligned with the scanner contract:

```text
pending
scanning
clean
infected
unavailable
failed
```

Do not use `passed` internally when the scanner returns `clean`.

### Append-only attempts

Create:

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
provider
status
safe_code
provider_http_status
started_at
completed_at
created_at
```

Rules:

- Server-owned
- RLS enabled
- No browser writes
- Customer sees only safe derived status
- No API key
- No raw provider response
- No file bytes
- No private source text

## Align document status vocabulary

Current code uses:

```text
quarantined
rejected
```

Live `document_status` currently allows only:

```text
pending_upload
uploaded
processing
needs_review
ready
failed
archived
```

Choose and implement one consistent model.

Preferred:

```text
pending_upload
uploaded
processing
quarantined
rejected
needs_review
ready
failed
archived
```

Add enum values through a reviewed forward migration.

Then update:

```text
portal types
portal repository
document cards
download authorization
rescan flows
retention logic
tests
```

Alternative mapping to `failed` is acceptable only if security state remains explicit and customer copy stays clear.

## Persist scan outcome on every ingestion path

Cover:

```text
manual upload
forwarded customer attachment
owner-mail attachment
chat attachment through shared intake
quarantine rescan
duplicate detection
```

Clean file:

```text
document security status = clean
security_scanned_at set
attempt appended
```

Quarantined:

```text
document status = quarantined
security status = unavailable or failed
no extraction
```

Infected:

```text
blocked or rejected
no extraction
no signed download
audit event
```

## Correct breakdown response fields

Use:

```text
sha256
```

or a correctly migrated alias.

Return:

```json
{
  "document": {
    "securityScanStatus": "clean",
    "securityScannedAt": "...",
    "sha256": "...",
    "analysisReady": true
  }
}
```

Update `BillBreakdownModal` to check:

```text
clean
```

not:

```text
passed
```

## Do not recompute category intelligence on every GET

The breakdown GET currently calls category resolution, bill analysis, benchmark analysis, and line-item normalization again.

Prefer persisted records:

```text
category_analysis_runs
invoice_line_item_classifications
vendor_categories
evidence_references
```

The modal should display the stored analysis corresponding to the stored invoice and pack version.

An explicit refresh-analysis action may recompute through a protected server operation.

Opening a modal must not silently create a new analytical truth.

## Processing response

When document status is:

```text
pending_upload
uploaded
processing
```

return a safe processing payload.

Example:

```json
{
  "analysisReady": false,
  "documentId": "...",
  "status": "processing",
  "message": "Costivra is still reading this bill."
}
```

The modal may poll with bounded backoff.

Do not show a not-found error for a real processing document.

## Evidence query

Current endpoint:

- limits evidence to 10
- has no explicit ordering

Change to:

```text
ordered by page_number, field_path, created_at
bounded pagination or a sufficient initial limit
```

The breakdown should not randomly omit different evidence on each open.

## Download URL

Continue using authorized server download routing.

Do not return a permanent public URL.

The signed download request may redirect with 307. That is expected.

## Tests

Add route tests for:

- Existing document with analysis
- Existing processing document
- Existing needs-review document
- Missing document
- Cross-tenant document
- Database query failure
- Clean scan
- Quarantined scan
- Infected scan
- Missing analysis run
- Evidence ordering
- `sha256`, not `sha256_digest`
- No live analysis recomputation on GET

Add live disposable integration tests.

## Incident regression

For document:

```text
5ff29f82-80af-4ed9-9db8-a90a41a65426
```

after the migration and route fix:

```text
GET breakdown must not return the old 404 caused by missing columns
```

Do not mutate the record merely to make the test pass.

## Exit gate

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

With private credentials:

```bash
npm run test:integration:live
```

Require:

```text
No selected nonexistent document column
No database error masked as 404
Scan provenance persists
Status vocabulary aligns with schema
Breakdown GET is read-only
Processing state is truthful
```
