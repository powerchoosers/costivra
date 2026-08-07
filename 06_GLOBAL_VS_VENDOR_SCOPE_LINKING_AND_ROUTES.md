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

Scope is communicated through text hierarchy, breadcrumbs, canonical links, and predictable browser history. Color and icons support the explanation but never carry it alone.

## Canonical route map

Global workspaces:

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

Vendor workspace:

```text
/app/vendors/[vendorId]
```

Vendor tabs remain query-based:

```text
?tab=overview
?tab=accounts
?tab=bills
?tab=contracts
?tab=findings
?tab=activity
```

Vendor account selection:

```text
?tab=accounts&account=[expenseAccountId]
```

## Shared scope component

Use the shared `PageScopeIndicator` from `src/components/page-scope-indicator.tsx`.

Supported modes:

```text
global   Across all vendors · Every vendor relationship
vendor   Vendor workspace · TXU Energy
account  Vendor account · Dallas Distribution Hub
```

Each indicator includes readable text and a link when a vendor or account parent exists. The linked text is the scope-changing action; the icon is supporting context only.

## Breadcrumb rules

Use `PageBreadcrumbs` for the current hierarchy:

```text
Vendor directory:
  Vendors

Vendor workspace:
  Vendors / TXU Energy

Vendor account state:
  Vendors / TXU Energy / Account ending 5124

Global bill detail:
  Bills & Spend / TXU Energy / Bill 054654015245

Finding detail:
  Findings / TXU Energy / Finding title
```

Breadcrumb parents are links. The current record is marked as the current page and is not a self-link.

Every detail page also exposes a direct vendor workspace link when the record has a vendor relationship.

## Cross-scope link language

Do not use ambiguous labels:

```text
View all
See more
Open list
```

Use the destination scope in the label:

```text
View all bills across vendors
Open TXU Energy workspace
View all findings across vendors
View all actions across vendors
View all results across vendors
Back to TXU Energy
```

Same-app links use normal in-app navigation and do not open a new tab. An arrow or context icon may reinforce a scope change, but the text must remain understandable without it.

## Legacy redirects

Global legacy list routes redirect to canonical workspaces after the authenticated workspace loads:

```text
/app/expenses       -> /app/bills?view=spend
/app/documents      -> /app/bills?view=files
/app/opportunities  -> /app/findings
/app/savings        -> /app/results?view=verified
/app/reports        -> /app/results?view=reports
```

The redirect mapping is centralized in `src/lib/portal/scope-routing.ts` and tested independently. Legacy detail records are not redirected:

```text
/app/expenses/[id]
/app/documents/[id]
/app/opportunities/[id]
/app/savings/[id]
```

They continue to render the existing detail record while using canonical parent breadcrumbs and related links. This preserves notifications, saved bookmarks, emails, and audit destinations.

## Active navigation

`isRouteActive` in `src/components/app-shell.tsx` keeps the canonical parent active for legacy paths:

```text
/app/expenses or /app/documents       Bills & Spend active
/app/opportunities                    Findings active
/app/savings or /app/reports          Results active
/app/vendors/[vendorId]               Vendors active
```

No legacy label is reintroduced as a primary navigation destination.

## Record-link rules

- Bills and source-file records use the canonical `/app/bills/[id]` detail route whenever the record is an invoice or source document.
- Findings use `/app/findings/[id]`; Actions use `/app/actions/[id]`; Results use `/app/results/[id]`; Contracts use `/app/contracts/[id]`.
- Vendor links use `/app/vendors/[vendorId]` and never silently become a global list.
- Account links use `/app/vendors/[vendorId]?tab=accounts&account=[expenseAccountId]`.
- Source evidence download links remain protected API links; opening a private file is not treated as a public page navigation.
- Detail breadcrumbs and related-record panels expose the same canonical parent paths as the main workspaces.

## Browser history and URL state

URL-backed state includes:

```text
Bills tabs and filters
Contracts tabs and search
Findings tabs and search
Actions tabs and search
Results tabs
Vendor tabs and selected account
```

Requirements:

- Refresh preserves the selected view, filters, and account.
- Back and Forward restore the previous URL state.
- Unknown values fall back safely to the default supported view.
- Purely visual state does not create duplicate history entries.
- Existing navigation-history behavior provides a safe in-app `Back to ...` fallback.
- Modal/deep-link state remains shareable when the route already supports it.

## Implementation inventory

```text
src/components/page-scope-indicator.tsx
  Shared global, vendor, and account scope indicators plus breadcrumbs.

src/lib/portal/scope-routing.ts
  Canonical legacy list redirects and parent-path resolution.

src/lib/portal/scope-routing.test.ts
  Redirect compatibility and canonical parent tests.

src/components/portal-pages.tsx
  Global scope indicators, vendor/account breadcrumbs, canonical links, and legacy list redirects.

src/components/portal-record-detail.tsx
  Detail breadcrumbs, vendor scope indicators, and direct vendor workspace context.

src/lib/portal/record-context.ts
  Canonical related-record links for bills, findings, results, and source records.

src/components/app-shell.tsx
  Canonical navigation and legacy active-parent mapping.
```

## Required tests

Maintain tests for:

- Every legacy list redirect and no redirect for detail routes.
- Every active-navigation mapping.
- Global, vendor, and account scope indicators.
- Breadcrumb labels and parent links.
- Explicit cross-scope copy.
- Browser Back and Forward behavior.
- Refresh preservation for tabs, filters, and selected account.
- Deep links and notification destinations.
- Search result destinations.
- No 404 for legacy links or existing detail records.

## Completion checklist

- [x] Global workspaces display an explicit `Across all vendors` indicator.
- [x] Vendor workspaces display `Vendors / [vendor]` breadcrumbs and a Vendor workspace indicator.
- [x] Account selection displays `Vendors / [vendor] / [account]` context.
- [x] Detail pages expose canonical parent breadcrumbs and vendor workspace context.
- [x] Cross-scope links use explicit destination wording.
- [x] Legacy global list routes redirect to canonical workspaces.
- [x] Legacy detail routes remain compatible.
- [x] Canonical bill, Finding, Action, Result, Contract, vendor, and account links are used across the affected flows.
- [x] URL state and browser Back behavior were verified in the authenticated browser.
- [x] Automated checks and responsive browser QA pass for this chunk.

## Exit gate

A customer always knows whether the current screen represents one vendor, one account, or every vendor in the organization—and can move between those scopes without losing their place.
