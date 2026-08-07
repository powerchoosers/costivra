---
description: Verify Costivra's simplified customer information architecture through route, component, accessibility, browser, and production tests.
---

# Chunk 8: Testing, Browser QA, and Release

## Goal

Prove the customer can navigate Costivra without understanding the database model.

Recommended branch:

```text
agent/app-ia-08-release-proof
```

## Prerequisites

Chunks 1 through 7 must be merged.

## Automated route tests

Test:

```text
/app
/app/vendors
/app/vendors/[vendorId]
/app/bills
/app/contracts
/app/findings
/app/actions
/app/results
/app/settings
```

Legacy:

```text
/app/expenses
/app/documents
/app/opportunities
/app/savings
/app/reports
```

Detail routes must remain valid.

## Component tests

### Sidebar

- New order
- Group headings
- Collapsed labels
- Mobile menu
- Active route mapping
- Legacy active mapping

### Scope indicator

- Global
- Vendor
- Account
- Accessible text
- No color-only meaning

### Vendor workspace

- Six tabs
- URL state
- Explicit cross-vendor links
- Account selection
- Dynamic action

### Bills & Spend

- Needs Review
- All Bills
- Spend
- Source Files
- Upload
- Vendor link
- Legacy redirect

### Findings and Results

- New terminology
- Potential versus verified
- Report access
- Vendor-scoped sections

## New-customer browser story

Use a disposable workspace.

1. Sign in.
2. Identify where to manage a vendor.
3. Open a vendor.
4. Find its accounts.
5. Find its bills.
6. Return to all bills across vendors.
7. Find upcoming contracts.
8. Find Costivra findings.
9. Find pending actions.
10. Find verified results.

The story should succeed without using search.

## Upload story

1. Open Bills & Spend.
2. Upload a bill.
3. Open the bill.
4. Open the vendor workspace.
5. See the bill under that vendor.
6. See account or location review status.
7. Return to all bills across vendors.

## Browser evidence

Capture:

```text
01-sidebar-expanded.png
02-sidebar-collapsed.png
03-mobile-navigation.png
04-vendor-directory.png
05-vendor-overview.png
06-vendor-accounts.png
07-vendor-bills.png
08-global-bills-review.png
09-global-bills-spend.png
10-global-source-files.png
11-contracts-renewals.png
12-findings.png
13-actions.png
14-results.png
15-global-scope.png
16-vendor-scope.png
17-account-scope.png
18-command-center.png
19-search-results.png
20-legacy-redirect.png
```

Store:

```text
output/playwright/customer-app-ia/
```

Do not commit authentication state or private customer documents.

## Viewports

```text
1440 x 900
1024 x 768
820 x 1180
390 x 844
375 x 812
```

## Accessibility

Verify:

- Sidebar keyboard navigation
- Mobile menu focus trap
- Tab semantics
- Scope labels announced
- Active state announced
- Breadcrumbs labelled
- Search grouped accessibly
- No duplicate page title
- Visible focus
- Reduced motion
- No horizontal overflow

## Copy audit

Customer-facing app should not use these primary labels:

```text
Opportunities
Expenses
Documents
Savings
Reports
Expense account
Organization vendor
```

They may appear only in internal or technical contexts.

## Full quality gate

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

## Production verification

Record:

```text
Main commit SHA
GitHub Actions run
Vercel deployment ID
Production URL
Supabase migration versions, if any
```

Verify:

- Production deploy uses exact green SHA
- No runtime route errors
- Legacy redirects work
- Search links work
- Notifications work
- Vendor context remains tenant-scoped
- No data records were lost during navigation changes

## Final verdict

Choose one:

```text
CUSTOMER_APP_IA_READY
INTERNAL_TESTING_ONLY
BLOCKED
```

Use `CUSTOMER_APP_IA_READY` only when a first-time customer can explain:

```text
Vendors are where I manage a relationship.
Bills & Spend is where I work across all bills.
Contracts shows renewals.
Findings shows what Costivra found.
Actions shows what I need to do.
Results shows verified value.
```
