---
description: Make Vendors the central relationship-management area and simplify each vendor detail page into one coherent workspace.
---

# Chunk 2: Vendor Directory and Central Vendor Workspace

## Goal

Make this the obvious answer to:

> Where do I manage everything related to one vendor?

```text
/app/vendors/[vendorId]
```

Recommended branch:

```text
agent/app-ia-02-vendor-workspace
```

## Product distinction

### Vendor directory

```text
/app/vendors
```

Answers:

> Who are we spending money with and which relationships need attention?

### Vendor workspace

```text
/app/vendors/[vendorId]
```

Answers:

> What is happening with this specific vendor?

### Cross-vendor workspace

Examples:

```text
/app/bills
/app/contracts
/app/findings
```

Answers:

> Show this type of work across every vendor.

Do not mix these purposes.

## Vendor directory

Each row or card should show:

```text
Vendor
Category
Relationship status
Annualized or recorded spend
Account count
Latest bill
Monitoring state
Open findings
Pending actions
Next contract deadline
```

The entire row opens the vendor workspace.

Primary page action:

```text
Add vendor
```

Secondary action:

```text
Upload bill
```

## Attention sorting

Default sort:

1. Bills needing review
2. Monitoring attention
3. Contract deadlines
4. Open high-priority findings
5. Pending actions
6. Remaining active vendors
7. Inactive or terminated vendors

Allow filters:

```text
Needs attention
Active
Monitored
Inactive
All
```

## Simplified vendor tabs

Replace the current long tab strip with:

```text
Overview
Accounts
Bills
Contracts
Findings
Activity
```

Do not keep separate tabs for:

```text
Actions
Files
Monitoring
History
```

Move them into the simpler model:

```text
Actions -> Findings page section
Files -> Bills page source-files view
Monitoring -> Overview and Accounts
History -> Activity
Results -> Overview and Findings summary
```

## Vendor header

Show:

```text
Vendor name
Category
Relationship status
Recorded or annual spend
Account count
Monitoring state
Next deadline
```

Primary action changes by context:

```text
No bills -> Upload first bill
Needs review -> Review bill
No monitoring -> Set up monitoring
Open finding -> Review finding
Pending approval -> Review action
Healthy -> Upload bill
```

Secondary actions:

```text
Add contract
Ask Costivra
More actions
```

## Overview

The Overview tab should answer:

```text
What is this relationship?
What changed recently?
What needs attention?
What happens next?
```

Recommended sections:

### Relationship summary

```text
Spend
Active accounts
Latest bill
Next contract deadline
Monitoring
```

### Needs attention

Maximum five ordered items:

```text
Bill needs review
Account not matched
Monitoring test required
Contract deadline approaching
Finding needs evidence
Action waiting for approval
```

### Recent activity

Maximum five events.

### Value summary

```text
Potential value
Actions in progress
Verified results
```

Potential value must remain clearly distinct from verified value.

## Findings tab

Use sections:

```text
Findings
Pending actions
Results
```

This keeps the vendor workflow together without adding three more tabs.

Links:

```text
View all findings across vendors
View all actions across vendors
View all results across vendors
```

These links must explicitly say that they leave vendor scope.

## Bills tab

The vendor Bills tab is scoped only to the selected vendor.

It may contain internal subviews:

```text
Bills
Spend
Source files
```

Chunk 4 builds the shared global version.

## Activity tab

Combine:

```text
Relationship history
Monitoring activity
Uploads
Reviews
Approvals
Actions
```

Use filters rather than separate top-level tabs.

## Breadcrumbs

Use:

```text
Vendors / TXU Energy
```

Do not use:

```text
Bills / TXU Energy
```

when opening the central vendor workspace.

## Scoped context indicator

Near the page title show:

```text
Vendor workspace
```

or:

```text
Scoped to TXU Energy
```

Do not rely on color alone.

## Tests

Add tests for:

- Vendor row opens central workspace
- Six-tab vendor navigation
- No separate Files, Monitoring, Actions, or History tabs
- Dynamic primary action
- Scope indicator
- Explicit cross-vendor links
- Browser history
- Mobile tab behavior
- Viewer permissions
- Inactive and terminated vendor states

## Exit gate

Accept only when a customer can manage the full relationship without bouncing through unrelated global pages.
