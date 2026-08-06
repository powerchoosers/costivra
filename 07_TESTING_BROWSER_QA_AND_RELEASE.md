---
description: Add complete automated, live, browser, CI, and production proof for Costivra ID pages, then release the verified main commit.
---

# Chunk 7: Testing, Browser QA, and Release

## Goal

Prove the entire ID-page system and release the exact verified commit.

Recommended branch:

```text
agent/id-pages-07-release-proof
```

## Prerequisites

Chunks 1 through 6 must be merged.

## Test inventory

Create a clear record-page test inventory in:

```text
docs/testing/id-pages.md
```

Map every acceptance criterion to:

```text
unit
route
integration
live integration
Playwright
manual browser proof
```

## Unit tests

### Shared components

```text
RecordOverflowMenu
EditableFieldRow
EditRecordSheet
RecordDangerDialog
RecordChangeHistory
```

### Draft state

Test:

- Null normalization
- Date normalization
- Numeric normalization
- Clean versus dirty
- Save baseline reset

### Validation

Test:

- Account fields
- Contact email and status
- Vendor status and cadence
- URL normalization
- Concurrency payload

## Route tests

Required:

```text
PATCH portal vendor
terminate/reactivate vendor
vendor deletion preview
DELETE vendor

PATCH manage account
archive account
restore account
account deletion preview
DELETE account

PATCH manage contact
make-primary contact
move contact
deactivate contact
reactivate contact
contact deletion preview
DELETE contact

vendor history
account history
contact history
```

Assert schema-authoritative names.

Add a static regression test preventing these strings in active route code:

```text
crm_mail_threads
assigned_owner_id
job_title for crm_contacts
relationship_status = ended
relationship_status = paused
contact status = archived
```

## Integration tests

Use disposable records.

### Vendor

- Override save and reload
- Canonical vendor unchanged
- Termination pauses monitoring
- Reactivation does not automatically resume monitoring
- Dependency preview complete
- Empty safe removal
- Conflict
- History

### Account

- Atomic full edit
- Forced failure rollback
- Primary contact change
- Archive
- Archived filter
- Restore
- Active customer deletion blocked
- Empty disposable account deletion
- Audit survives deletion
- Conflict
- History

### Contact

- Full edit
- Invalid email
- Make primary
- Move account
- Deactivate primary handling
- Reactivate
- Workspace-linked remove blocked or owner-gated
- Profile and membership preserved
- Conflict
- History

## Tenant and role isolation

Prove:

- Tenant A cannot edit Tenant B vendor relationship
- Viewer cannot mutate
- Member cannot terminate or remove vendor
- Customer cannot call Manage APIs
- Operator cannot permanently delete account
- Operator cannot remove workspace-linked contact when owner-only
- Browser cannot execute service-role RPCs
- History endpoints are scoped

## Playwright projects

Run:

```text
desktop-chromium
mobile-chromium
```

Add an authenticated record-page project when credentials are available.

## Browser stories and evidence

Store:

```text
output/playwright/id-pages-final/
```

Required screenshots:

```text
vendor-resting.png
vendor-menu.png
vendor-edit.png
vendor-monitoring.png
vendor-history.png
vendor-blocked-remove.png

account-resting.png
account-inline-hover.png
account-edit.png
account-history.png
account-archive.png
account-archived-filter.png
account-blocked-delete.png

contact-resting.png
contact-inline-hover.png
contact-edit.png
contact-move.png
contact-history.png
contact-workspace-remove.png

mobile-vendor.png
mobile-account.png
mobile-contact.png
```

Do not commit auth state or real customer files.

## Viewports

```text
1440 x 900
1024 x 768
820 x 1180
390 x 844
375 x 812
```

## Browser checks

Verify:

- No horizontal overflow
- Dots visible
- Trigger container quiet at rest
- Inline actions hidden at rest
- Zero layout shift
- Keyboard navigation
- Touch reveal
- Focus trap
- Focus restoration
- URL tabs
- Back and Forward
- Correct conflict message
- Correct archive state
- Correct deletion block
- No false success toast
- No console error
- No failed request

## Supabase checks

Run:

```text
migration list
security advisor
performance advisor
```

Verify:

- RPCs service-role only
- RLS intact
- No public privileged function
- No duplicate primary contact
- No unreviewed schema drift
- Audit history columns and policies correct

## Complete quality gate

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

With ignored privileged credentials:

```bash
npm run test:integration:live
```

## GitHub release flow

1. Open focused PR.
2. Require full quality gate.
3. Review diff for unrelated files.
4. Merge.
5. Wait for `main` quality gate.
6. Confirm Vercel production deployment uses exact main SHA.
7. Check runtime logs.
8. Run smoke journeys.
9. Update `STATUS.md`.

## Production smoke journeys

Use disposable records only.

### Vendor

```text
Open vendor
Edit override
Refresh
Pause monitoring
Resume monitoring
Terminate
Reactivate
View history
```

### Account

```text
Open account
Edit next step
Change owner
Archive
Find in Archived
Restore
View history
```

### Contact

```text
Open contact
Edit title
Make primary
Create task
Deactivate
Find in Inactive
Reactivate
View history
```

Restore all disposable edits or remove the disposable records safely.

## Release report

Record:

```text
Main commit SHA
GitHub Actions run
Vercel deployment ID
Supabase migration versions
Unit result
Integration result
Live result
Playwright result
Runtime smoke result
Known limitations
```

## Final verdict

Choose one:

```text
ID_PAGES_COMPLETE
INTERNAL_TESTING_ONLY
BLOCKED
```

Do not use `ID_PAGES_COMPLETE` unless:

```text
All seven chunks merged
Main quality gate green
Production deployment exact SHA
Live schema aligned
All three smoke journeys pass
No P0 destructive-action or tenant-isolation gap
```
