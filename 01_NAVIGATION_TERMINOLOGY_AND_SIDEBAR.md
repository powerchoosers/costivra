---
description: Simplify Costivra's customer navigation, terminology, icons, search labels, and mobile menu without changing the normalized record model.
---

# Chunk 1: Navigation, Terminology, and Sidebar

## Goal

Replace the flat record-type sidebar with a small workflow-based navigation.

Recommended branch:

```text
agent/app-ia-01-navigation
```

## Primary files

```text
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/app/globals.css
src/lib/portal/record-context.ts
src/components/navigation-history.tsx
tests/e2e/*
```

Inspect any additional route-label maps, command palettes, breadcrumbs, and analytics.

## New sidebar

Use this exact customer-facing structure:

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

## Icons

Recommended:

```text
Command Center: LayoutDashboard
Vendors: Building2
Bills & Spend: ReceiptText
Contracts: FileText or CalendarClock
Findings: Target or SearchCheck
Actions: CheckSquare2
Results: ChartNoAxesCombined
Settings: Settings
```

Do not use the same icon for multiple primary destinations.

## Remove from primary navigation

Remove these labels from the sidebar:

```text
Expenses
Documents
Opportunities
Savings
Reports
```

Their routes remain available until Chunk 6 adds compatibility redirects.

## Page label map

Update page names:

```text
home -> Command Center
vendors -> Vendors
bills -> Bills & Spend
contracts -> Contracts
findings -> Findings
actions -> Actions
results -> Results
settings -> Settings
```

Legacy route labels should use the new terminology:

```text
expenses -> Spend record
documents -> Source file
opportunities -> Finding
savings -> Result
reports -> Report
```

## Section headings

Sidebar section headings must remain visible only when the sidebar is expanded.

Collapsed mode:

- Icons remain understandable through tooltips and accessible labels.
- Section labels do not consume horizontal space.
- Active state remains clear.

Expanded mode:

```text
MONITOR
OPTIMIZE
PROVE
```

Use quiet typography, not large navigation banners.

## Mobile navigation

The mobile menu must use the same grouping and order.

Do not expose the old flat list on mobile.

Required behavior:

- Current page visible
- Menu closes after selection
- Focus restored
- Body scroll locked when open
- All labels fit without truncating essential words
- Settings remains last

## Top-level upload action

The application should offer one consistent global action:

```text
Upload bill or document
```

It may live in:

- Command Center
- Bills & Spend page
- Global create menu

Do not use separate primary actions called:

```text
Add expense
Upload document
Upload bill
```

for the same customer intent.

Manual spend entry may remain a secondary action:

```text
Add spend manually
```

## Search vocabulary

Current search groups expose:

```text
Opportunities
Documents
Expenses
```

Update search categories:

```text
Vendors
Bills
Contracts
Findings
Actions
```

Optional secondary groups:

```text
Source files
Spend records
```

These should appear only when directly relevant or under an advanced filter.

## Search result copy

### Vendor result

```text
TXU Energy
Vendor relationship
```

### Bill result

```text
TXU Energy bill 054654015245
$2,472.37 · Needs review
```

### Contract result

```text
TXU Energy electricity agreement
Renews Jun 2027
```

### Finding result

```text
Possible duplicate charge
TXU Energy · Needs evidence
```

Do not label a finding as a Case or Opportunity in the customer app.

## Accessible names

Use:

```text
Open Vendors
Open Bills & Spend
Open Findings
```

Do not expose route names in accessible labels.

## Active navigation rules

```text
/app/vendors and /app/vendors/*
  Vendors active

/app/bills and new bill detail routes
  Bills & Spend active

legacy /app/expenses and /app/documents routes
  Bills & Spend active

/app/contracts/*
  Contracts active

/app/findings and legacy /app/opportunities/*
  Findings active

/app/actions/*
  Actions active

/app/results, legacy /app/savings, and /app/reports
  Results active
```

## Tests

Add tests for:

- Desktop expanded navigation
- Desktop collapsed navigation
- Mobile navigation
- Active route mapping
- Legacy route active mapping
- Keyboard navigation
- Search categories
- Search result labels
- No duplicate primary destinations
- No old terminology in the customer sidebar

## Exit gate

Require the standard quality gate.

Accept only when:

```text
The sidebar has eight primary destinations
Expenses and Documents are not separate primary destinations
Opportunities is no longer customer-facing language
Savings and Reports no longer compete in the sidebar
Desktop and mobile navigation match
Legacy routes still load
```
