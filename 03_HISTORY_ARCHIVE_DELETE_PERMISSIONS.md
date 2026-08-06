---
description: Finish true record history, archive/reactivate visibility, dependency previews, destructive permissions, and fail-closed lifecycle behavior across Costivra ID pages.
---

# Chunk 3: History, Archive, Delete, and Permissions

## Goal

Complete cross-cutting record lifecycle behavior before polishing the individual pages.

Recommended branch:

```text
agent/id-pages-03-lifecycle-history
```

## Prerequisites

Chunks 1 and 2 must be merged.

## Permission matrices

### Customer vendor relationship

| Role | View | Edit | Configure monitoring | Terminate | Permanent remove |
|---|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes when safe |
| Admin | Yes | Yes | Yes | Yes | Yes when safe |
| Member | Yes | Yes | Yes | No | No |
| Viewer | Yes | No | No | No | No |

### Internal account and contact

| Role | View | Edit | Archive/deactivate | Permanent delete |
|---|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes when safe |
| Operator | Yes | Yes | Yes | No |

Enforce on the server.

## True history sources

### Customer vendor history

Source:

```text
audit_events
```

Customer-visible actions:

```text
vendor_relationship.created
vendor_relationship.updated
vendor_monitoring.configured
vendor_monitoring.paused
vendor_monitoring.resumed
vendor_monitoring.test_passed
vendor_relationship.terminated
vendor_relationship.reactivated
vendor_relationship.removed
```

### Manage account and contact history

Source:

```text
internal_audit_events
```

CRM activity remains a separate relationship timeline.

Do not build change history from `crm_activities` alone.

## History endpoints

Implement or repair:

```text
GET /api/portal/vendors/[relationshipId]/history
GET /api/manage/accounts/[accountId]/history
GET /api/manage/contacts/[contactId]/history
```

Requirements:

- Authorization
- Tenant/internal scope
- Pagination
- Bounded result count
- Actor display name
- Action
- Safe summary
- Timestamp
- Source label
- No raw metadata
- No private internal note in customer history
- No provider secrets
- No document source text

## Field-change metadata

For internal audit, allowlist:

```text
fields_changed
previous lifecycle
new lifecycle
previous assigned owner
new assigned owner
previous account ID
new account ID
primary status change
archive reason
delete reason
```

For customer vendor audit, allowlist:

```text
fields_changed
previous relationship status
new relationship status
monitoring state change
workspace override changed flags
```

Do not store full private notes in history metadata.

## Account archive and restore

Archive:

```text
visible_in_crm = false
lifecycle_stage = inactive
```

Preserve:

- Customer workspace
- Memberships
- Documents
- Financial history
- Mail
- Audit
- Vendor relationships

Add Manage list filters:

```text
Active
Archived
All
```

Restore endpoint:

```text
POST /api/manage/accounts/[id]/restore
```

Restore:

```text
visible_in_crm = true
```

Use a reviewed lifecycle stage, preferably the prior stage stored in audit metadata or a required selection.

Archived records must remain reachable to authorized internal users.

## Contact deactivate and reactivate

Deactivate:

```text
status = inactive
archived_at = now()
archived_by = actor
```

When the contact is primary:

- Require a replacement primary, or
- Clear primary with explicit confirmation

Reactivate:

```text
status = active
archived_at = null
archived_by = null
```

Add Manage filters:

```text
Active
Inactive
All
```

Do not use `status = archived`.

## Vendor terminate and reactivate

Terminate:

```text
relationship_status = terminated
ended_at = now()
ended_by = actor
```

In the same transaction:

```text
vendor_monitoring_configs.state = paused
paused_at = now()
updated_by = actor
```

Reactivate:

```text
relationship_status = active
ended_at = null
ended_by = null
```

Do not automatically reactivate monitoring.

Monitoring needs an explicit resume action and a still-valid configuration.

## Deletion preview contract

Every preview response:

```json
{
  "blocked": true,
  "blockReason": "Human-readable reason",
  "counts": [
    { "key": "documents", "label": "Documents", "count": 3 }
  ],
  "previewVersion": "v1",
  "checkedAt": "ISO timestamp"
}
```

The confirm route must recheck dependencies. The preview is guidance, not authorization.

A preview error means:

```text
No destructive action
```

## Vendor removal dependencies

Count:

```text
expense_accounts
expenses
invoices
contracts
documents
vendor_monitoring_configs
open opportunities through expense accounts
open actions through opportunities
```

Permanent removal is allowed only for an empty relationship with no protected history.

Default action is:

```text
Terminate relationship
```

## Account deletion dependencies

Count:

```text
workspace memberships
contacts
locations
documents
invoices
expenses
expense accounts
contracts
opportunities
actions
savings outcomes
vendor relationships
monitoring configurations
mail threads
mail messages
tasks
CRM activity
retention holds
```

Permanent account delete is limited to an empty disposable lead or test record.

The route must not delete the organization and then attempt to write an audit row referencing the deleted organization.

## Contact removal dependencies

Count:

```text
profile link
workspace memberships
tasks
activities
email threads
email messages
marketing consent records
contact inquiries
primary-contact status
```

Rules:

### CRM-only contact

An operator may remove after preview, reason, and confirmation.

### Profile-linked or workspace-linked contact

Owner only.

The UI must show:

```text
Manage workspace access separately
```

Never delete:

```text
profiles
auth.users
organization_memberships
```

through CRM contact removal.

## Reason requirements

Require a reason for:

```text
Account archive
Account permanent delete
Contact deactivate when primary
Contact permanent remove
Vendor terminate
Vendor permanent remove
```

Persist the reason in the appropriate internal or customer-safe audit event.

## Idempotency

Repeated archive/deactivate/terminate requests should not create contradictory state.

Return a safe no-op result when already in the requested state, while avoiding duplicate audit noise.

## Tests

Add tests for:

- Permission matrix
- Archived account filters
- Account restore
- Inactive contact filters
- Contact reactivate
- Terminated vendor filter or badge
- Vendor monitoring paused atomically
- Preview failure blocks confirm
- Dependency changed after preview
- Account delete audit survives deletion
- Workspace-linked contact preserves auth and membership
- Customer history excludes internal notes
- Internal history shows field changes
- Pagination and tenant scope

## Exit gate

Require:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Accept only when:

```text
Archive is reversible
Deactivate is reversible
Vendor termination preserves history
Every destructive route rechecks dependencies
Every destructive route enforces server permissions
Every destructive action produces durable audit evidence
History uses audit events, not generic activity alone
```

Update `STATUS.md`, open a focused PR, and merge only after the full gate is green.
