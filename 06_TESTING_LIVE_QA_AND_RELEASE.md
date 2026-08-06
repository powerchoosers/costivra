---
description: Prove and release Costivra's repaired bill upload, breakdown, extraction, evidence, and finding-trust journey.
---

# Chunk 6: Testing, Live QA, and Release

## Goal

Verify the full repaired workflow on the exact release commit.

Recommended branch:

```text
agent/bill-upload-06-release-proof
```

## Prerequisites

Chunks 1 through 5 must be merged.

## Private test-source policy

Use the two real TXU PDFs only in an ignored local or private test directory.

Never commit them to the public repository.

Committed fixtures must be de-identified.

## Automated test matrix

### Upload UI

- Select PDF
- Selected attachment card appears
- Filename displayed
- Correct file icon
- Size displayed
- Remove file
- Replace file
- Reduced motion
- Progress state
- Modal close
- One toast
- No automatic breakdown
- Toast action opens breakdown
- Duplicate handling
- Quarantine handling
- Rejection handling
- Error recovery

### Breakdown API

- Ready document
- Needs-review document
- Processing document
- Missing document
- Cross-tenant access
- Database error
- Clean scan
- Quarantined scan
- Evidence order
- Persisted analysis
- No GET recomputation

### Extraction and reconciliation

- Prior balance paid
- Prior balance carried
- Current charges
- Amount due
- Account-level payments
- Current-period credits
- Line-item sum
- Balance-forward equation
- Exact cents
- Usage
- Demand
- Utility territory
- Product
- Service address
- Account match
- Location match

### Evidence

- Page-aware header evidence
- Page-aware charge evidence
- Line-item links
- Opportunity evidence separated
- No account-number exposure
- Legacy unknown page behavior

### Finding trust

- Zero-evidence manual note
- Demo finding
- Deterministic finding
- Missing tariff source
- Same vendor different account
- Same vendor different meter
- No unsupported dollar claim

## Live incident replay

Using a disposable workspace:

1. Upload the de-identified Dallas-layout PDF.
2. Confirm POST success.
3. Confirm selected file UI.
4. Confirm modal closes.
5. Confirm one actionable toast.
6. Confirm breakdown endpoint returns 200 or bounded processing response.
7. Click toast.
8. Confirm breakdown opens.
9. Confirm current charges and amount due.
10. Confirm review reason is precise.
11. Confirm source page links.
12. Confirm no Meter #4491 finding appears as part of this bill.
13. Confirm customer/account/location mismatch if fixture intentionally mismatches.
14. Clean up disposable records.

Repeat with the carried-balance layout.

## Expected Vercel sequence

Good synchronous flow:

```text
POST /api/portal/documents
201

GET /api/portal/documents/{id}/breakdown
200
```

Good bounded processing flow:

```text
POST /api/portal/documents
202 or 201 with analysisReady=false

GET breakdown
202 processing

later GET breakdown
200
```

Forbidden regression:

```text
POST 201
immediate breakdown 404 due to schema error
```

## Browser evidence

Capture:

```text
01-file-selected-desktop.png
02-upload-progress-desktop.png
03-modal-closed-toast.png
04-breakdown-ready.png
05-breakdown-needs-review.png
06-source-page-evidence.png
07-account-match-review.png
08-demo-finding-labelled.png

09-file-selected-mobile.png
10-upload-progress-mobile.png
11-toast-mobile.png
12-breakdown-mobile.png
```

Store:

```text
output/playwright/bill-upload-release/
```

Do not commit auth state or private PDFs.

## Viewports

```text
1440 x 900
1024 x 768
820 x 1180
390 x 844
375 x 812
```

## Runtime checks

Review Vercel:

```text
4xx and 5xx on document routes
breakdown route
upload duration
function timeout risk
console errors
deployment SHA
```

Review Supabase:

```text
document status
security status
scan attempts
extraction version
invoice
line items
classifications
evidence references
category analysis run
opportunity evidence
notifications
audit events
```

## Full repository gate

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

With ignored credentials:

```bash
npm run test:integration:live
```

## Release identity

Record:

```text
main commit SHA
GitHub Actions run
Vercel deployment ID
Supabase migration versions
private live test timestamp
```

## Final verdict

Choose one:

```text
BILL_UPLOAD_FLOW_READY
INTERNAL_TESTING_ONLY
BLOCKED
```

`BILL_UPLOAD_FLOW_READY` requires:

```text
No breakdown schema 404
One clear upload toast
No automatic modal collision
Correct paired-balance extraction
Exact-cent reconciliation
Page-aware evidence
Line-item provenance
Unsupported tariff record clearly separated
Main quality gate green
Production deployment exact SHA
```
