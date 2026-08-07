---
description: Update Costivra's Command Center, search, notifications, quick actions, and onboarding so every entry point reinforces the simplified vendor-centered model.
---

# Chunk 7: Command Center, Search, Notifications, and Onboarding

## Goal

Make every entry point reinforce the same mental model.

Recommended branch:

```text
agent/app-ia-07-command-search
```

## Command Center purpose

The Command Center should answer:

```text
What needs attention today?
What changed?
What value is moving?
```

It should not summarize every database table.

## Recommended Command Center sections

### Attention

Four primary queues:

```text
Bills needing review
Vendors needing attention
Renewals approaching
Actions waiting
```

Each card links to the correct global workspace with filters applied.

### Recent activity

Show:

```text
Bill uploaded
Bill reviewed
Finding created
Action approved
Monitoring issue
Result verified
```

### Value

Show separately:

```text
Potential value
Actions in progress
Verified value
```

### Vendors

Show:

```text
Top spend
Needs attention
Recently active
```

Each vendor opens the central vendor workspace.

## Quick actions

Use:

```text
Upload bill or document
Add vendor
Add contract
Ask Costivra
```

Do not use:

```text
Add expense
Upload document
Create opportunity
```

as primary customer actions.

## Search

Search groups:

```text
Vendors
Bills
Contracts
Findings
Actions
```

Secondary:

```text
Source files
Spend records
Results
```

Search results should communicate destination scope.

Example:

```text
TXU Energy
Vendor workspace

Invoice 054654015245
TXU Energy · Bill · Needs review

Possible duplicate charge
TXU Energy · Finding · Needs evidence
```

## Notifications

Map notification types:

```text
Bill ready
  -> Bill detail or breakdown

Bill needs review
  -> Bills & Spend review queue

Vendor monitoring issue
  -> Vendor workspace monitoring section

Contract deadline
  -> Contract detail

Finding ready
  -> Finding detail

Approval requested
  -> Action detail

Result ready
  -> Results
```

Do not send customers to the hidden legacy list when a canonical route exists.

## Ask Costivra links

Structured assistant responses should link using the new labels:

```text
Open vendor workspace
Open bill
Open finding
Review action
View result
```

Do not say:

```text
Open opportunity
Open expense record
```

unless discussing internal data structure.

## Onboarding

Teach the product in three steps:

```text
1. Add or select a vendor
2. Upload bills and contracts
3. Review findings and approve actions
```

Do not teach the customer to create normalized expenses manually as the default workflow.

## Empty states

### Vendors

```text
Add your first vendor
Start with a company you receive recurring bills from.
```

### Bills

```text
Upload your first bill
Costivra will preserve the source, extract the details, and show what needs review.
```

### Findings

```text
No findings yet
Findings appear only when Costivra has enough evidence to support a review.
```

### Results

```text
No verified results yet
Verified value appears after an approved action and comparison.
```

## Analytics

Add privacy-safe product events:

```text
sidebar_destination_opened
vendor_workspace_opened
global_queue_opened
scope_changed
bill_uploaded
cross_vendor_link_clicked
legacy_redirect_used
```

Do not record private bill content.

Use analytics to verify that customers stop bouncing between Vendors, Expenses, and Documents.

## Tests

Add tests for:

- Command Center links
- Quick actions
- Search labels and routes
- Notification destinations
- Assistant card destinations
- Onboarding language
- Empty states
- Legacy terminology absence
- Analytics payload safety

## Exit gate

Accept only when every major entry point teaches the same vendor-centered workflow.
