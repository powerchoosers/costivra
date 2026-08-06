---
description: Finish Costivra's customer vendor ID page using authoritative relationship, monitoring, history, and evidence-backed completeness data.
---

# Chunk 4: Customer Vendor ID Page

## Goal

Finish:

```text
/app/vendors/[vendorId]
```

Recommended branch:

```text
agent/id-pages-04-vendor
```

## Prerequisites

Chunks 1 through 3 must be merged.

## Product model

The route uses a canonical vendor ID:

```text
/app/vendors/[vendorId]
```

Mutations operate on the tenant relationship ID:

```text
organization_vendors.id
```

The customer edits only workspace-owned relationship data.

Never mutate:

```text
vendors.canonical_name
vendors.category
vendors.website
```

through this page.

## Display resolution

Use:

```text
name = display_name_override ?? canonical_name
category = category_override ?? canonical category
website = website_override ?? canonical website
```

The edit sheet should show the canonical value as quiet reference text.

## Header

Required:

- Back link
- Vendor logo or initials
- Workspace display name
- Category
- Relationship status
- Dynamic primary action
- Transparent three-dot trigger

Three-dot menu:

```text
Edit vendor relationship
Configure monitoring
Add bill
Add contract
Copy vendor information
Pause or resume monitoring
Terminate or reactivate relationship
View history
Remove vendor from workspace
```

Hide or disable actions based on role and state.

Do not show dead actions.

## Edit sheet

### Workspace identity

```text
Display name override
Category override
Website override
```

Copy:

```text
These changes affect only your Costivra workspace.
```

### Relationship

```text
Relationship status
Annualized spend
Spend cadence
Account owner
```

Valid status options displayed to customers:

```text
Prospect
Active
Inactive
Terminated
```

Valid cadence:

```text
Monthly
Annual
```

Do not offer unsupported quarterly or variable values without a schema migration.

### Read-only operational facts

```text
Canonical vendor name
Canonical category
Canonical website
Created at
Updated at
Terminated at
```

## True dirty state

Use the shared draft comparison.

Do not pass:

```tsx
isDirty={true}
```

Send:

```text
expectedUpdatedAt
```

Handle 409 without losing the draft.

## Monitoring card

Load from:

```text
vendor_monitoring_configs
inbound_email_addresses
```

Show:

```text
Monitoring state
Source method
Approved sender
Actual private intake address
Expected cadence
Grace period
Last test
Last bill received
Next expected bill
Latest failure
```

Do not derive a pretend intake address from the organization UUID.

Do not hardcode monthly cadence.

## Monitoring actions

### Configure

Customer selects:

```text
Manual upload
Manual forwarding
Automatic vendor-specific forwarding
```

### Pause

Set monitoring state paused.

Do not change relationship status.

### Resume

Resume only when the stored configuration remains valid.

### Terminate vendor relationship

Pause monitoring atomically.

## Page sections

Persist in the URL:

```text
overview
bills
contracts
findings
actions
files
monitoring
history
```

Example:

```text
/app/vendors/[vendorId]?tab=monitoring
```

Requirements:

- Refresh preserves tab
- Browser Back and Forward work
- Unknown value falls back to overview
- Mobile tab rail scrolls
- Ask Costivra can link to a tab

## Direct record links

Use direct routes:

```text
/app/expenses/[expenseId]
/app/documents/[documentId]
/app/contracts/[contractId]
/app/opportunities/[opportunityId]
/app/actions/[actionId]
```

Do not link a finding only to a list-page anchor.

## Data completeness

Use real evidence states.

Checks:

```text
Recent source document
Vendor match resolved
Invoice totals reconciled
Normalized expense exists
Contract recorded
Renewal or end date recorded
Location assigned when applicable
Monitoring configured
Forwarding test passed when required
Expected bill not missed
```

Each check supports:

```text
Complete
Needs attention
Unknown
Not applicable
```

Do not treat unknown as complete.

Do not infer reconciliation from the existence of an expense.

## Spend presentation

Clarify:

```text
Recorded spend
Annualized relationship estimate
Latest bill
Prior-period comparison
```

Do not blend manually entered annualized spend with recorded expenses as though they are one source.

## History

Use the customer-safe vendor history endpoint.

Show:

```text
Actor
Action
Safe summary
Timestamp
```

Never show:

- Internal notes
- Raw metadata
- Provider errors
- Account numbers
- Source text

## Terminate versus remove

### Terminate

Everyday lifecycle action.

Preserves:

```text
bills
contracts
documents
findings
actions
monitoring history
audit
```

### Remove

Rare cleanup action for an empty relationship.

Load dependency preview and require typed confirmation plus reason.

When blocked, recommend:

```text
Terminate relationship instead
```

## Role behavior

- Viewer gets no edit controls.
- Member may edit ordinary workspace relationship fields.
- Member may not terminate or remove.
- Owner and admin may terminate.
- Owner and admin may remove only when safe.

## Browser stories

Test:

1. Resting header
2. Hover three-dot trigger
3. Keyboard menu
4. Edit workspace name
5. Save and refresh
6. Concurrency conflict
7. Configure monitoring
8. Pause monitoring
9. Terminate relationship
10. Reactivate relationship
11. Blocked removal
12. History
13. Mobile tab rail
14. Touch inline action

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
Workspace override survives refresh
Canonical vendor remains unchanged
Monitoring data is authoritative
Termination pauses monitoring
Data completeness uses real invoice state
History is customer safe
Unsafe removal is blocked
All roles behave correctly
```

Update `STATUS.md`, open a focused PR, and merge only after the full gate is green.
