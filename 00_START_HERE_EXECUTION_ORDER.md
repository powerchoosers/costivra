---
description: Master execution order for finishing Costivra vendor, account, and contact ID pages in small verified chunks.
---

# Costivra ID Pages: Start Here

## Purpose

This folder breaks the remaining ID-page work into small vertical slices for Antigravity Goal Mode.

Run **one file at a time**. Do not paste all files into one prompt. Each chunk has an entry gate, a narrow scope, an exit gate, and a recommended branch name.

Primary surfaces:

```text
/app/vendors/[vendorId]
/manage/accounts/[accountId]
/manage/contacts/[contactId]
```

## Audited baseline

Repository:

```text
powerchoosers/costivra
```

Latest `main` observed while preparing this packet:

```text
280e2ddba36dc486a4b0bf35535f05ffa0c4315a
```

Record interaction hardening already merged into `main`:

```text
c5f9d5676e7c57dcb5f9083ac418f6dcadfa1b55
```

The shared overflow menu, inline edit row, edit sheet, and danger dialog have already received a substantial accessibility and interaction pass. Preserve that work.

## Current high-signal gaps

The remaining work is mostly domain and page integration:

1. Account and contact writes still use multiple independent database operations while describing them as transactional.
2. Account and contact edits do not enforce `expectedUpdatedAt` concurrency.
3. Vendor status values in code do not align with the live database enum-like checks.
4. Vendor audit writes target a `safe_metadata` field that does not currently exist on `audit_events`, and omit required `actor_type`.
5. Vendor termination does not atomically pause monitoring.
6. Account hard deletion inserts an audit event after deleting the organization, even though the audit row references that organization.
7. Edit sheets on all three pages still pass `isDirty={true}`.
8. Account and contact history is still assembled from CRM activity rather than the true internal audit trail.
9. Customer vendor history needs a customer-safe audit representation.
10. Archive, inactive, and terminated records need deliberate filters and restore/reactivate paths.
11. Record-page-specific API, integration, and browser coverage remains thin.

## Live schema facts that control the implementation

Treat the live Supabase schema as authoritative until a reviewed migration changes it.

### `organization_vendors`

```text
relationship_status:
  prospect
  active
  inactive
  terminated

spend_cadence:
  monthly
  annual

workspace overrides:
  display_name_override
  category_override
  website_override

termination evidence:
  ended_at
  ended_by
```

Do not write `paused` or `ended` into `relationship_status`.

Pause belongs to:

```text
vendor_monitoring_configs.state = paused
```

End relationship maps to:

```text
organization_vendors.relationship_status = terminated
```

### `crm_contacts`

```text
status:
  active
  inactive
  bounced
  unsubscribed

archive evidence:
  archived_at
  archived_by
```

Do not write `archived` into `status`.

### Audit tables

Customer tenant audit:

```text
audit_events
```

Currently includes:

```text
actor_type
actor_id
action
resource_type
resource_id
before_hash
after_hash
trace_id
created_at
```

It does not currently include `safe_metadata`.

Internal operator audit:

```text
internal_audit_events
```

Includes:

```text
safe_metadata
```

### Account source of truth

`organizations` owns:

```text
name
legal_name
industry
employee_count_range
annual_revenue_range
timezone
currency
parent_organization_id
```

`crm_account_profiles` owns:

```text
lifecycle_stage
assigned_to
last_contacted_at
next_follow_up_at
next_step
private_notes
visible_in_crm
website
```

## Required execution order

### Chunk 1

```text
01_DATA_CONTRACTS_AND_ATOMIC_MUTATIONS.md
```

Finish database-aligned mutation services, transaction boundaries, concurrency, and audit contracts.

### Chunk 2

```text
02_SHARED_RECORD_COMPONENTS_AND_PAGE_STATE.md
```

Wire true dirty state, inline save behavior, page-level error handling, and component tests.

### Chunk 3

```text
03_HISTORY_ARCHIVE_DELETE_PERMISSIONS.md
```

Finish history, archive/reactivate filters, deletion previews, permissions, and fail-closed record lifecycle behavior.

### Chunk 4

```text
04_CUSTOMER_VENDOR_ID_PAGE.md
```

Finish the customer vendor page using the completed contracts.

### Chunk 5

```text
05_MANAGE_ACCOUNT_ID_PAGE.md
```

Finish the internal account page.

### Chunk 6

```text
06_MANAGE_CONTACT_ID_PAGE.md
```

Finish the internal contact page.

### Chunk 7

```text
07_TESTING_BROWSER_QA_AND_RELEASE.md
```

Add complete automated and browser proof, then release.

### Optional P1

```text
08_OPTIONAL_P1_DUPLICATES_MERGE_EXPORT_POLISH.md
```

Run only after the seven core chunks are green and merged.

## Branch strategy

Start each chunk from the latest updated `main`.

Recommended branches:

```text
agent/id-pages-01-data-contracts
agent/id-pages-02-page-state
agent/id-pages-03-lifecycle-history
agent/id-pages-04-vendor
agent/id-pages-05-account
agent/id-pages-06-contact
agent/id-pages-07-release-proof
agent/id-pages-08-p1-polish
```

After each chunk:

1. Run its focused tests.
2. Run typecheck and lint.
3. Open a focused PR.
4. Wait for the full GitHub quality gate.
5. Merge only when green.
6. Start the next chunk from the new `main`.

Do not build a stack of seven unmerged branches.

## Standard Goal Mode prompt

Use this prompt with the selected chunk:

```text
Read AGENTS.md, DECISIONS.md, STATUS.md, and
<SELECTED_CHUNK_FILE> completely.

Execute only this chunk in Goal Mode.

Inspect current main and live Supabase before editing. Preserve unrelated work.
Do not expand scope into later chunks. Implement, test, inspect in a browser
where required, update STATUS.md truthfully, open a focused PR, and stop only
after the chunk's exit gate is satisfied.
```

## Global prohibitions

Do not:

- Replace the existing record component system.
- Modify shared canonical vendors through customer edits.
- Delete an auth profile when removing a CRM contact.
- Delete an active customer organization.
- describe separate database calls as a transaction.
- show success before checking `response.ok`.
- hide an unsafe action instead of enforcing authorization on the server.
- use real customer records for destructive QA.
- weaken RLS or private-storage boundaries.
- change financial values through AI.
- mix optional P1 merge tools into the P0 release.

## Final definition of complete

The ID-page project is complete only when:

```text
Data contracts match live schema
Multi-table changes are atomic
Concurrency conflicts return 409
Three-dot menus are complete
Inline edits never shift resting content
Edit sheets have true dirty state
History uses real audit events
Archive and restore paths are usable
Destructive previews are complete and fail closed
Vendor termination pauses monitoring
Workspace-linked contacts preserve authentication
All three pages pass desktop, mobile, touch, and keyboard QA
Main GitHub quality gate is fully green
Production deployment matches the green commit
```
