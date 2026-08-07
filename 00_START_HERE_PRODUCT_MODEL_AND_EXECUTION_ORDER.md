---
description: Master execution order for simplifying Costivra's customer application around a central vendor workspace and clearly labeled cross-vendor work queues.
---

# Costivra Customer App Information Architecture: Start Here

## Mission

Make `/app` immediately understandable to a customer who has never seen Costivra.

The customer should not have to understand the difference between a source document, invoice record, normalized expense, finding, action plan, and savings outcome before they can use the product.

The application should communicate one simple model:

```text
Organization
└── Vendor relationship
    ├── Accounts and locations
    ├── Bills and spend
    ├── Contracts
    ├── Findings
    ├── Actions
    └── Results
```

The database may keep its normalized records. The navigation should present the customer's jobs.

## Repository and live system

```text
GitHub repository: powerchoosers/costivra
Supabase project: skfocjrykyvsaviyhdea
Audited main commit: de099c30df521282161370b4f38d4b6834585e34
```

Recheck `main` before editing.

## Current customer navigation

The current customer sidebar presents these as equal destinations:

```text
Command Center
Expenses
Opportunities
Contracts
Documents
Actions
Savings
Vendors
Reports
Settings
```

That exposes the record model rather than the customer workflow.

## Current vendor page

The existing vendor detail page already acts like a partial relationship hub. It currently includes:

```text
Overview
Bills
Contracts
Findings
Actions
Files
Monitoring
History
```

This is the strongest foundation in the current app. Preserve it, but simplify its tabs and make it the canonical home for everything related to one vendor.

## Live data model confirmed

The existing Supabase schema already supports the proposed customer model:

```text
organization_vendors
  central tenant-owned vendor relationship

expense_accounts
  vendor accounts, subscriptions, service accounts, meters, or locations

invoices
  individual bills extracted from source documents

expenses
  normalized spend records

documents
  original private source files

contracts
  vendor agreements and renewal dates

opportunities
  findings

action_plans
  approved or pending work

savings_outcomes
  verified or pending results
```

No destructive database redesign is required.

## Product vocabulary

Use this language consistently.

| Internal concept | Customer-facing language |
|---|---|
| organization_vendor | Vendor relationship |
| expense_account | Vendor account |
| invoice | Bill |
| document | Source file |
| expense | Spend record |
| opportunity | Finding |
| action_plan | Action |
| savings_outcome | Result or verified savings |

Do not rename database tables merely to change customer copy.

## Three levels of navigation

### 1. Vendor directory

```text
/app/vendors
```

Purpose:

> Show every vendor relationship and which ones need attention.

### 2. Vendor workspace

```text
/app/vendors/[vendorId]
```

Purpose:

> Manage everything related to this specific vendor.

This is the central vendor account experience.

### 3. Cross-vendor workspaces

```text
/app/bills
/app/contracts
/app/findings
/app/actions
/app/results
```

Purpose:

> Show a specific type of work across every vendor.

These are not competing vendor pages. They are global queues.

## Required new sidebar

```text
Command Center

MONITOR
Vendors
Bills & Spend
Contracts

OPTIMIZE
Findings
Actions

PROVE
Results

Settings
```

The sidebar should contain eight primary destinations, including Command Center and Settings.

Remove these labels from the primary sidebar:

```text
Expenses
Documents
Opportunities
Savings
Reports
```

Keep their legacy routes working through redirects or internal compatibility.

## Scope language

Every page must clearly communicate its scope.

### Global workspace

```text
Across all vendors
Bills & Spend
```

### Vendor workspace

```text
Vendor
TXU Energy
Bills & Spend
```

Never use an ambiguous link such as:

```text
View all
```

Use:

```text
View all bills across vendors
Back to TXU Energy
Open TXU Energy workspace
```

## Execution order

Run one chunk at a time.

### Chunk 1

```text
01_NAVIGATION_TERMINOLOGY_AND_SIDEBAR.md
```

Change the sidebar, route labels, icons, mobile navigation, and search vocabulary.

### Chunk 2

```text
02_VENDOR_DIRECTORY_AND_CENTRAL_VENDOR_WORKSPACE.md
```

Make Vendors the canonical relationship hub.

### Chunk 3

```text
03_VENDOR_ACCOUNTS_AND_LOCATIONS.md
```

Expose service accounts and locations inside the vendor workspace.

### Chunk 4

```text
04_UNIFIED_BILLS_SPEND_AND_FILES_WORKSPACE.md
```

Combine Expenses and Documents into one customer-facing Bills & Spend workspace.

### Chunk 5

```text
05_FINDINGS_ACTIONS_RESULTS_AND_CONTRACTS.md
```

Rename Opportunities, combine Savings and Reports, and clarify the optimization workflow.

### Chunk 6

```text
06_GLOBAL_VS_VENDOR_SCOPE_LINKING_AND_ROUTES.md
```

Standardize breadcrumbs, context indicators, cross-scope links, redirects, and deep links.

### Chunk 7

```text
07_COMMAND_CENTER_SEARCH_NOTIFICATIONS_AND_ONBOARDING.md
```

Update the rest of the app to use the new mental model.

### Chunk 8

```text
08_TESTING_BROWSER_QA_AND_RELEASE.md
```

Prove the new information architecture and ship the exact green commit.

## Branch sequence

```text
agent/app-ia-01-navigation
agent/app-ia-02-vendor-workspace
agent/app-ia-03-vendor-accounts
agent/app-ia-04-bills-spend
agent/app-ia-05-workflow-pages
agent/app-ia-06-scope-routing
agent/app-ia-07-command-search
agent/app-ia-08-release-proof
```

Start each chunk from the newly updated `main`.

## Standard Goal Mode prompt

```text
Read AGENTS.md, DECISIONS.md, STATUS.md,
00_START_HERE_PRODUCT_MODEL_AND_EXECUTION_ORDER.md, and
<SELECTED_CHUNK_FILE>.md completely.

Execute only this chunk in Goal Mode.

Recheck current main and live Supabase before editing. Preserve normalized data
and existing tenant boundaries. Do not expand into later chunks. Implement,
test, inspect in a real browser, update STATUS.md truthfully, open a focused
pull request, and stop only after this chunk's exit gate is satisfied.
```

## Global guardrails

Do not:

- Delete normalized database records because the navigation is changing.
- Merge invoices, documents, and expenses into one database table.
- Expose the term `expense_account` to ordinary customers.
- Make the customer choose between Expenses and Documents when uploading a bill.
- Remove existing detail routes without compatibility redirects.
- Add more primary sidebar destinations.
- let a vendor-scoped tab silently jump to an all-vendor list.
- label a global list and a vendor tab with identical headings but no scope indicator.
- use color alone to communicate scope.
- rewrite the entire visual design.
- break existing saved links, notifications, search results, or browser history.

## Final product test

A new customer should be able to answer these questions without training:

```text
Where do I manage TXU Energy?
Where do I review every bill waiting for attention?
Where do I see upcoming renewals?
Where do I see what Costivra found?
Where do I approve the next action?
Where do I see verified value?
```

Expected answers:

```text
Vendors
Bills & Spend
Contracts
Findings
Actions
Results
```
