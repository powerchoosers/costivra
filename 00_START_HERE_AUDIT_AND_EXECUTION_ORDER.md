---
description: Master audit and execution order for repairing Costivra bill upload UX, breakdown readiness, TXU extraction, evidence, and unsupported findings.
---

# Costivra Bill Upload and Breakdown Repair: Start Here

## Mission

Repair the complete customer journey:

```text
Select bill
-> see the selected attachment clearly
-> upload with a modern, honest progress experience
-> close the upload modal automatically
-> refresh the workspace
-> receive one clickable "breakdown ready" toast
-> open a working breakdown
-> see source-backed extracted facts
-> understand why review is required
-> never confuse an unrelated seeded finding with the uploaded bill
```

Run the numbered chunks in order. Use one focused branch and pull request per chunk.

## Repository and live systems

```text
GitHub: powerchoosers/costivra
Supabase: skfocjrykyvsaviyhdea
Vercel project: prj_pMAnjcRnNPD35PyXwNiUVz99N8Zc
Vercel team: team_aAYe8Oai5o7BR0a3F4a6bPMe
```

Audited production deployment during the incident:

```text
Deployment: dpl_6qyWCJQhAUtGHpoD71GbLWCFjLVK
Git commit: b8f0cfdcca7f1811a243b70cdb95a31240168e2f
```

Recheck current `main` before editing.

## Exact uploaded file identified

The production upload was:

```text
FabriClean Supply Dallas TXU Invoice 2026-06-02 054654015245.pdf
SHA-256:
029a8ccd96cd907967c899e8a788c8a7cb9657bb4a65ff40cb7ab1132deaae92
```

Production document:

```text
document_id: 5ff29f82-80af-4ed9-9db8-a90a41a65426
invoice_id: 7c1d116e-deb6-48aa-9866-356fde943491
workspace: Apex Logistics Group
status: needs_review
```

The second supplied Houston-service bill was not the uploaded file:

```text
FabriClean Supply Houston TXU Invoice 2026-06-12 055478883244.pdf
SHA-256:
3f6641379ce4b79f83b2803fad8cafb112575b68ec2f9acd430c6fa39d269854
```

## Incident timeline confirmed in Vercel

```text
03:51:49 UTC
POST /api/portal/documents
201

03:52:13 UTC
GET /api/portal/documents/5ff29f82-80af-4ed9-9db8-a90a41a65426/breakdown
404

03:55 UTC
document download requests
307 signed redirect
```

The source file and extracted record existed. The breakdown route failed separately.

## Root cause of the breakdown 404

The breakdown route selects these document columns:

```text
security_scan_status
security_scanned_at
sha256_digest
```

The live `documents` table currently contains:

```text
sha256
```

but does not contain those three selected columns.

The database query errors. The route then converts both a database error and a genuinely missing document into the same response:

```text
404 Document not found or access denied.
```

This is a schema-contract bug, not an access problem.

## Current upload UX defects

Current `handleDocumentUpload`:

1. Opens an "Analyzing bill" toast.
2. Waits for a synchronous scan, OCR, extraction, persistence, category analysis, and reconciliation request.
3. Calls `setKind(null)`.
4. Creates an actionable success toast.
5. Immediately opens the breakdown anyway.
6. Calls the generic `run()` helper with an already-resolved promise, which refreshes and emits a second success toast.

Consequences:

- No selected attachment card
- No filename or file-type icon after selection
- Long modal wait with vague feedback
- Confusing close and overlay sequence
- Breakdown auto-opens before the customer chooses it
- Duplicate success messaging
- "Bill Processed" is too confident when the record is `needs_review`

## Data-quality findings on the uploaded TXU bill

Correctly extracted:

```text
Vendor: TXU Energy
Invoice: 054654015245
Invoice date: 2026-06-02
Due date: 2026-06-18
Current charges: 2472.37
Amount due: 2472.37
Usage: 15900 kWh
Energy rate: 0.081 per kWh
TDU delivery: 942.54
Service period: 2026-04-24 through 2026-05-25
Vendor match: exact
Extraction confidence: 0.95
```

Incorrectly or incompletely represented:

```text
Previous-balance payment 3520.47 was extracted as current invoice creditTotal
subtotal is null
reconciliation status is incomplete
all evidence page numbers are stored as page 1
line-item classification evidence IDs are empty
service address is not stored
ESI ID is not stored
meter ID is not stored
TXU product is not stored
Oncor utility territory is not stored
actual and billed demand are not stored
average cents per kWh is not stored
invoice is not matched to an expense account or location
workspace/customer identity mismatch is not flagged
```

The seven extracted current-charge line items sum exactly to:

```text
2472.37
```

The deterministic reconciler does not currently perform `line_items_to_total` when the bill has no explicit subtotal, so it returns `incomplete`.

## Important identity mismatch

The source bill belongs to:

```text
FABRICLEAN SUPPLY OF HOUSTON LIMITED PAR
```

It was uploaded into:

```text
Apex Logistics Group
```

The bill account last four is:

```text
5124
```

The seeded TXU expense account in the workspace is:

```text
TXU-8849102-DAL
```

The source service address is:

```text
8301 Ambassador Row, Dallas, TX 75247-4707
```

The seeded workspace TXU location is:

```text
Dallas Distribution Hub
7500 John W Carpenter Fwy, Dallas, TX 75247
```

The invoice remains:

```text
expense_account_id = null
location = null
```

The UI should say that the vendor matched but the customer account and location did not.

## The tariff-misclassification finding

The uploaded document did not generate the finding:

```text
TXU Commercial Tariff Misclassification (Meter #4491)
```

The uploaded bill's actual meter ID is:

```text
111118190LG
```

The existing finding was created before this upload and is:

```text
generated_by: manual
evidence_count: 0
source_expense_id: null
baseline_expense_id: null
rule_key: null
rule_version: null
calculation_inputs: {}
calculation_result: {}
```

It is seeded/manual workspace content connected to the same TXU vendor relationship.

The general concept of a utility account being billed under an incorrect rate schedule is real. This specific claim is not proven.

The bill alone does not identify the exact Oncor tariff schedule needed to prove misclassification. The phrase "Demand-Adjusted Industrial Rate" also requires verification against the current official tariff before it is used.

## Private source-file handling

The two real invoices contain customer names, account identifiers, service addresses, ESI IDs, and meter data.

Do not commit either PDF to this public repository.

Use them only through:

```text
ignored local fixtures
private CI secrets/artifacts
a disposable local validation directory
```

Create de-identified synthetic fixtures for committed regression tests.

## Execution order

### Chunk 1

```text
01_BREAKDOWN_API_AND_SECURITY_PROVENANCE.md
```

Repair the route, schema, scan provenance, status vocabulary, and error contract.

### Chunk 2

```text
02_UPLOAD_MODAL_ATTACHMENT_PROGRESS_AND_TOAST.md
```

Implement the selected attachment card, modern loading state, clean close transition, and one actionable toast.

### Chunk 3

```text
03_TXU_EXTRACTION_RECONCILIATION_AND_ACCOUNT_MATCHING.md
```

Correct account-summary semantics, reconciliation, energy fields, and workspace/account matching.

### Chunk 4

```text
04_EVIDENCE_PAGE_MAPPING_AND_LINE_ITEM_PROVENANCE.md
```

Make evidence page-aware and attach source evidence to line items and findings.

### Chunk 5

```text
05_FINDING_TRUST_TARIFF_GUARDRAILS_AND_DEMO_DATA.md
```

Prevent unsupported manual/demo findings from masquerading as evidence-backed results.

### Chunk 6

```text
06_TESTING_LIVE_QA_AND_RELEASE.md
```

Prove the complete flow and ship the exact green commit.

## Branch sequence

```text
agent/bill-upload-01-breakdown-contract
agent/bill-upload-02-upload-ux
agent/bill-upload-03-txu-extraction
agent/bill-upload-04-evidence
agent/bill-upload-05-finding-trust
agent/bill-upload-06-release-proof
```

Start each branch from newly updated `main`.

## Standard Goal Mode prompt

```text
Read AGENTS.md, DECISIONS.md, STATUS.md,
00_START_HERE_AUDIT_AND_EXECUTION_ORDER.md, and
<SELECTED_CHUNK>.md completely.

Execute only the selected chunk in Goal Mode.

Recheck current main, production schema, and relevant runtime behavior before
editing. Preserve unrelated work. Do not commit real customer invoices or
identifiers. Implement, test, inspect in a real browser, update STATUS.md
truthfully, open a focused pull request, and stop only after the chunk's exit
gate is satisfied.
```
