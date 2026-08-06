---
description: Finish Costivra's internal Manage account ID page with complete editing, ownership, archive/restore, history, related records, and safe deletion.
---

# Chunk 5: Manage Account ID Page

## Goal

Finish:

```text
/manage/accounts/[accountId]
```

Recommended branch:

```text
agent/id-pages-05-account
```

## Prerequisites

Chunks 1 through 4 must be merged.

## Header

Required:

- Back to Accounts
- Account logo or initials
- Account name
- Lifecycle
- Assigned owner
- Last contacted
- Next follow-up
- Primary action
- Transparent three-dot trigger

Three-dot menu:

```text
Edit account
Add contact
Add task
Add internal note
Add vendor
Compose email
Copy account details
Export account data
Manage workspace access
View history
Archive or restore account
Delete account
```

Optional duplicate and merge actions belong to Chunk 8.

## Complete edit sheet

### Identity

```text
Organization name
Legal name
Industry
Website
```

### Operating profile

```text
Employee range
Revenue range
Timezone
Currency
Parent company
```

### Internal relationship

```text
Lifecycle stage
Assigned internal owner
Primary contact
Next follow-up
Next step
Private notes
CRM visibility
```

Use IDs for owner, contact, and parent.

Show enrichment snapshots separately as read-only context.

## True dirty state and concurrency

Do not pass:

```tsx
isDirty={true}
```

Use the shared draft helper.

Send:

```text
expectedUpdatedAt
```

Preserve draft on 409.

## Inline fields

Required:

```text
Lifecycle
Assigned owner
Next follow-up
Next step
Website
Industry
Private notes
```

Copy-only where useful:

```text
Account name
Legal name
Primary email
Account ID
```

Do not show paste for lifecycle, owner, or dates.

## Account ownership

Prominently show:

```text
Assigned owner
Last contacted
Next follow-up
Next step
```

Derive last contacted from approved CRM activity or mail truth.

Do not make `last_contacted_at` a casual free-text edit.

## Primary contact

The edit sheet selects:

```text
crm_contacts.id
```

The operation is atomic.

Only one active primary contact per account.

When no primary exists, show:

```text
No primary contact selected
```

Do not use `organizations.primary_contact_name` as the selection source of truth when CRM contacts exist.

## URL sections

Persist:

```text
overview
vendors
files
activity
work
history
```

Selected vendor:

```text
/manage/accounts/[accountId]?tab=vendors&vendor=[relationshipId]
```

Refresh and browser history must work.

## Overview

Include:

- Company profile
- Recorded-spend trend
- Current vendors
- Primary people
- Parent and child companies
- Locations
- Next-step context
- Open work summary

Avoid repeating the same metric in several cards.

## Vendor tab

Rows link to the selected relationship state.

Provide direct links to:

```text
/app/vendors/[canonicalVendorId]
```

when useful, and keep internal relationship context inside Manage.

## Activity versus history

### Activity

Relationship timeline:

```text
emails
calls
meetings
notes
tasks
```

### History

Record mutations:

```text
field updates
assigned owner changes
primary contact changes
archive
restore
delete attempt
```

Do not use activity as a substitute for history.

## Archive and restore

Account list must provide:

```text
Active
Archived
All
```

Archive preserves the customer workspace.

Archived account detail remains accessible to authorized operators.

Restore action returns it to Active.

## Manage workspace access

Show:

```text
Current memberships
Roles
Invitation state
```

Do not mix account archive with workspace access removal.

## Add actions

Context must be prefilled:

### Add contact

```text
organizationId = accountId
```

### Add task

```text
organizationId = accountId
```

### Add note

```text
organizationId = accountId
```

### Add vendor

```text
organizationId = accountId
```

### Compose email

Preselect primary contact when one exists.

## Delete account

Owner only.

Preview counts every dependency from Chunk 3.

Permit permanent deletion only for an empty disposable lead/test account.

Require:

```text
Typed account name
Reason
Fresh dependency recheck
Atomic deletion and audit
```

Do not delete an active customer account.

## Export

For P0, export may be a safe JSON or CSV package containing:

```text
Account profile
Contacts
Tasks
Vendor relationships
Record IDs and metadata
```

Do not include private source file bytes in a casual export.

If export is not implemented in this chunk, omit the menu item. Do not leave it dead.

## Browser stories

1. Resting header
2. Inline website hover with zero shift
3. Edit complete account
4. Change assigned owner
5. Change primary contact
6. Conflict
7. Add task with context
8. Archive
9. Active filter removal
10. Archived filter presence
11. Restore
12. History
13. Blocked delete
14. Keyboard menu
15. Mobile edit sheet

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
All displayed editable fields save to their true tables
Primary contact is ID-based and atomic
Archive and restore are usable
Account remains reachable when archived
History is true audit history
Delete cannot destroy an active customer tenant
Quick-create actions inherit account context
```

Update `STATUS.md`, open a focused PR, and merge only after the full gate is green.
