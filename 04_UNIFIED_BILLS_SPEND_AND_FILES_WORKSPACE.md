---
description: Combine bills, normalized spend, and private source files into one customer-facing workspace without merging their authoritative records.
---

# Chunk 4: Unified Bills, Spend, and Files Workspace

## Purpose

Give a customer one clear answer to:

> Where do I upload, review, and understand bills?

The answer is:

```text
Bills & Spend
```

This is a customer-facing workspace, not a new database entity. Invoices, normalized spend records, and source files remain separate authoritative records and retain their existing organization boundary, evidence links, audit history, and permissions.

## Scope

### In scope

- Global route `/app/bills`.
- Four URL-addressable views: Needs Review, All Bills, Spend, and Source Files.
- One primary upload action for bills and documents.
- Plain-language review reasons.
- Vendor, account, location, status, date, amount, document-type, and text filtering.
- Links from every bill or spend record to its vendor relationship and source bill where available.
- A vendor-scoped Bills tab that keeps the same mental model without jumping to the global list.
- Viewer/read-only behavior and organization-scoped reads.
- Empty, unknown, processing, review, and source-unavailable states.

### Not in scope

- Merging `invoices`, `expenses`, and `documents` into one table.
- Redesigning the extraction or reconciliation model.
- Changing the private Storage bucket or making source files public.
- Final permanent redirects and all cross-application deep-link cleanup; those belong to Chunk 6.
- New savings calculations, findings logic, contract intelligence, or external vendor actions.

## Customer navigation and scope

Global page heading:

```text
Across all vendors
Bills & Spend
```

Vendor links must say what happens when the customer follows them:

```text
Open TXU Energy workspace
View all bills across vendors
```

Do not use an ambiguous `View all` link. A vendor-scoped Bills tab must never silently become an all-vendor list.

## Route and view contract

Canonical route:

```text
/app/bills
```

Views:

```text
/app/bills?view=review
/app/bills?view=all
/app/bills?view=spend
/app/bills?view=files
```

The supported view values are `review`, `all`, `spend`, and `files`. Unknown values fall back safely.

When no view is provided:

1. Show `Needs Review` when any invoice has an unresolved matching, reconciliation, extraction, or security state.
2. Otherwise show `All Bills`.

Legacy list routes remain functional during this chunk:

```text
/app/expenses  -> Bills & Spend with view=spend
/app/documents -> Bills & Spend with view=files
```

Legacy detail URLs remain operational until the canonical detail and redirect work in Chunk 6 is complete. New bill and source-file links should prefer `/app/bills/[id]`; the existing detail renderer decides whether the identifier is an invoice or source file.

Changing the view uses browser history. Search and filters are URL-backed so refresh, copy/paste, and back/forward preserve the customer's working context.

## Authoritative data mapping

| Customer view | Authoritative source | Required joins and rules |
|---|---|---|
| Needs Review | `invoices` | Join the source `documents`, vendor relationship, vendor account, and location. Include unresolved identity, reconciliation, extraction, or security states. |
| All Bills | `invoices` | Join `documents`, `organization_vendors`, `expense_accounts`, and `locations`. Do not substitute a source file for a bill record. |
| Spend | `expenses` | Label the section `Spend ledger`. Preserve period, amount, prior period, status, account, location, and source bill link. Do not call it Employee Expenses. |
| Source Files | `documents` | Show original private files and supporting documents. Include document type, vendor, upload date, security status, extraction status, and evidence count. |

The service/repository layer remains responsible for organization-scoped reads and normalization. The client must not trust a browser-supplied organization ID, vendor ID, account ID, amount, status, or permission.

### Financial display rules

- `currentCharges` means source-labeled current-period charges.
- `amountDue` means the final amount requested from the customer.
- Do not display `totalAmount` as `Amount Due` when `amountDue` is missing; show `Not recorded` instead of silently substituting a different financial fact.
- Do not calculate missing totals in the UI.
- Preserve currency metadata. Do not assume every record is USD in domain logic.
- A missing period, account, location, amount, or status is shown as `Not recorded`, `Not assigned`, or another clear unknown—not as a fabricated default.

## Needs Review

An invoice belongs in the review queue when any of these are true:

```text
review_status = needs_review
vendor match is not exact
workspace customer match is not matched
expense account match is not matched
service location match is not matched
reconciliation status is not reconciled
document extraction failed or needs review
document security is pending, scanning, or quarantined
```

Use these customer-facing reasons instead of machine codes:

```text
Vendor needs confirmation
Workspace customer needs confirmation
Account needs matching
Location needs matching
Totals need confirmation
Extraction needs review
Security scan pending
```

Each review row shows:

```text
Vendor
Invoice number or Bill
Billing period
Current charges
Amount due
Due date
Account
Location
Review status and plain-language reasons
```

The main action is `Review bill`, which opens the bill-oriented detail experience. It must not send the customer to a generic source-file record before showing the bill facts.

## All Bills

The bill table shows:

```text
Vendor
Invoice / Bill
Billing period
Current charges
Amount due
Due date
Account
Location
Review status
```

The vendor name links to the vendor workspace. The bill identifier links to `/app/bills/[invoiceId]`. The detail experience may expose the source file, line items, reconciliation, evidence, and related records after the bill identity is clear.

## Spend

Use the heading:

```text
Spend ledger
```

Each row shows:

```text
Vendor
Account
Location
Period
Amount
Prior period
Source bill
Status
```

When `invoiceId` or `documentId` exists, `Source bill` links to `/app/bills/[id]`. A manually entered spend record may have no source bill; show an em dash and do not imply that a source document exists.

## Source Files

Use the heading:

```text
Original files and supporting documents
```

Each source-file row shows:

```text
Filename
Document type
Vendor
Upload date
Security status
Extraction status
Evidence count
Source availability
```

The source file is evidence, not a competing bill workflow. A missing security scan snapshot must be labeled `Not recorded`; it must never be presented as clean merely because the document row exists. A purged source must remain visible as a record with the unavailable state rather than a broken download link.

## Primary and secondary actions

Use exactly one primary action:

```text
Upload bill or document
```

The existing upload flow may ask what type of document was supplied and may infer the type after upload. It must preserve its real states:

```text
Idle
Selected
Submitting
Complete and ready
Duplicate
Quarantined
Rejected
Still processing
Error
```

The overflow menu may contain:

```text
Add spend manually
Upload contract
Export bill list
```

`Add spend manually` is never the primary upload action. Export must use the currently authorized workspace data and must not include private Storage paths or source-file bytes.

Viewers can read the workspace but cannot upload, add spend, upload contracts, edit protected records, or trigger consequential mutations. Server-side authorization remains the final control.

## Filters and URL state

The workspace supports these filters:

```text
Vendor
Account
Location
Status
From / To date
Minimum / Maximum amount
Document type
Search text
```

URL keys:

```text
view   q   vendor   account   location   status   from   to   min   max   type
```

Rules:

- Filter changes use URL state and preserve the active view.
- Tab changes preserve active filters unless the customer clears them.
- Empty or unknown values fall back to the unfiltered state.
- `Clear filters` removes filter keys but does not unexpectedly move the customer to another view.
- Date filters use the record's relevant period/date; source files use upload date.
- Amount filters use the authoritative amount for that record type and exclude records where the amount is unknown when an amount boundary is requested.

## Vendor-scoped Bills tab

Inside `/app/vendors/[vendorId]?tab=bills`, show only records for that vendor relationship. Keep the internal subviews:

```text
Bills & Spend
Source Files
```

The scoped view uses the same terminology and financial rules as the global workspace. It must include explicit links back to the bill detail and source evidence, and it must not display another vendor's account, location, bill, or file.

## Security, evidence, and provenance

- All reads remain organization-scoped through the existing portal repository and RLS-backed Supabase access.
- Private files are opened only through the existing protected document routes and short-lived access behavior.
- Upload validation, malware scanning, SHA-256 deduplication, private Storage, extraction versioning, and evidence references remain in the existing intake pipeline.
- Document text and extracted values are untrusted data. They cannot change permissions, approval requirements, or tool access.
- The workspace may display extracted facts and evidence state, but it does not calculate authoritative savings, approve actions, or contact vendors.
- Financial claims remain distinct from findings and verified results. This chunk does not introduce a savings claim.

## Implementation inventory

The current implementation is intentionally a focused vertical slice across these areas:

```text
src/components/portal-pages.tsx
  BillsWorkspace, legacy view mapping, vendor-scoped bill links, actions, empty states

src/lib/portal/bills-workspace.ts
  pure view-resolution and plain-language review-reason helpers

src/lib/portal/types.ts
  PortalInvoice and PortalDocument customer-facing fields

src/lib/portal/repository.ts
  tenant-scoped normalization, security/extraction state, evidence counts

src/components/app-shell.tsx
  Bills & Spend navigation and active state for legacy routes

src/app/globals.css
  tab strip, filter controls, responsive workspace rows, focus states

src/components/bills-workspace.test.ts
  review reasons, default view, URL view fallback, and legacy mapping
```

Existing protected APIs remain the source of truth for upload, source-file download, breakdown, and record detail behavior. Do not add a parallel upload or download path for this chunk.

## Required tests

Add or maintain tests for:

- Needs Review default when unresolved items exist.
- All Bills default when no review items exist.
- Plain-language reasons, including workspace customer mismatch and security pending.
- All Bills, Spend, and Source Files mappings.
- Current charges versus amount due display semantics.
- URL view state, search state, all filters, clear filters, refresh, and back/forward behavior.
- Upload action and its viewer restriction.
- Manual spend and upload-contract secondary actions.
- Vendor workspace links and source-bill links.
- Source-file security status, extraction status, evidence count, and purged-source state.
- Empty states for no bills, no review items, no normalized spend, and no source files.
- Mobile tab overflow, keyboard focus, labels, and touch targets.
- Tenant isolation and permission behavior on the underlying APIs.
- No duplicate bill/source-file confusion and no full account-number exposure.

## Completion status and exit gate

Chunk 4 is functionally complete in the current worktree when all of the following are true:

```text
[x] /app/bills exists as the canonical global workspace route.
[x] Needs Review, All Bills, Spend, and Source Files are distinct URL-backed views.
[x] Needs Review is the default only when review items exist.
[x] Upload bill or document is the single primary action.
[x] Review reasons use plain language.
[x] Bill rows show billing period, current charges, amount due, due date, account, location, and status.
[x] Spend rows link back to their source bill when one exists.
[x] Source-file rows show security, extraction, and evidence state without inventing clean status.
[x] Vendor, account, location, status, date, amount, type, and text filters are URL-backed.
[x] Viewer permissions and tenant-scoped reads remain enforced.
[x] Legacy list routes still render the correct Bills & Spend view.
[x] Focused tests, typecheck, and lint pass.
```

The following are intentionally later release gates:

```text
Chunk 6: final redirects, shared scope indicators, and every legacy deep link.
Chunk 8: complete browser QA and release proof across the primary customer journey.
```

The customer should now have one answer to the question:

> Where do I upload and review bills?

```text
Bills & Spend
```
