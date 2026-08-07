---
description: Standardize how Costivra distinguishes global cross-vendor pages from vendor-scoped pages, including breadcrumbs, context labels, links, redirects, and browser history.
---

# Chunk 6: Global Versus Vendor Scope, Linking, and Routes

## Goal

Make it impossible to confuse:

```text
All bills across every vendor
```

with:

```text
Bills for TXU Energy
```

Recommended branch:

```text
agent/app-ia-06-scope-routing
```

## Scope component

Create a shared component such as:

```text
PageScopeIndicator
```

Modes:

```text
global
vendor
account
```

### Global example

```text
Across all vendors
Bills & Spend
```

### Vendor example

```text
Vendor workspace
TXU Energy
```

### Account example

```text
TXU Energy
Account ending 5124
```

Use text and hierarchy, not color alone.

## Breadcrumb rules

### Vendor directory

```text
Vendors
```

### Vendor workspace

```text
Vendors / TXU Energy
```

### Vendor account state

```text
Vendors / TXU Energy / Account ending 5124
```

### Global bill detail

```text
Bills & Spend / TXU Energy bill 054654015245
```

Every detail page should also link to the vendor workspace.

## Cross-scope links

Never use:

```text
View all
See more
Open list
```

Use:

```text
View all bills across vendors
Open TXU Energy workspace
View all findings across vendors
Back to TXU Energy
```

Use a scope-change icon only as support, not as the sole cue.

## Same-app links

Do not use external-link semantics for another Costivra page.

Use a subtle `ArrowUpRight` or context icon only when the text clearly describes the scope change.

Do not open these links in a new browser tab.

## Route map

### Canonical global routes

```text
/app
/app/vendors
/app/bills
/app/contracts
/app/findings
/app/actions
/app/results
/app/settings
```

### Canonical vendor route

```text
/app/vendors/[vendorId]
```

Tabs remain query-based:

```text
?tab=overview
?tab=accounts
?tab=bills
?tab=contracts
?tab=findings
?tab=activity
```

### Vendor account selection

```text
?tab=accounts&account=[expenseAccountId]
```

## Legacy redirects

Implement permanent or application redirects where safe:

```text
/app/expenses
  -> /app/bills?view=spend

/app/documents
  -> /app/bills?view=files

/app/opportunities
  -> /app/findings

/app/savings
  -> /app/results?view=verified

/app/reports
  -> /app/results?view=reports
```

For detail routes, preserve compatibility:

```text
/app/expenses/[id]
/app/documents/[id]
/app/opportunities/[id]
/app/savings/[id]
```

Do not break notifications, saved bookmarks, emails, or audit links.

## Active navigation

Legacy detail routes should activate the new parent destination.

Examples:

```text
/app/documents/[id]
  Bills & Spend active

/app/opportunities/[id]
  Findings active

/app/savings/[id]
  Results active
```

## Browser history

Changing:

```text
tabs
views
filters
selected account
```

must update the URL predictably.

Requirements:

- Refresh preserves state
- Back and Forward work
- Unknown values fall back safely
- No duplicate history entry for purely visual hover state
- Modal deep links remain shareable when appropriate

## Record links

A bill row may open a breakdown modal, but the URL should support restoring that state.

Suggested:

```text
/app/bills?view=all&bill=[invoiceId]
```

or a canonical bill detail route.

Choose one pattern and use it consistently.

## Tests

Add tests for:

- Every redirect
- Every active-nav mapping
- Vendor scope indicator
- Global scope indicator
- Account scope indicator
- Explicit cross-scope copy
- Browser Back
- Refresh
- Deep link
- Notification destination
- Search result destination
- No 404 for legacy links

## Exit gate

Accept only when a customer always knows whether they are viewing one vendor or every vendor.
