---
description: Clarify Costivra's optimization workflow by renaming Opportunities to Findings, preserving Actions as the work queue, combining Savings and Reports into Results, and sharpening Contracts.
---

# Chunk 5: Contracts, Findings, Actions, and Results

## Purpose

Make the customer workflow read naturally:

```text
Bill
  -> Finding
  -> Action
  -> Result
```

The database keeps its existing normalized names (`opportunities` and `savings_outcomes`). The customer application uses Findings and Results consistently.

## Scope and canonical routes

These are cross-vendor workspaces:

| Customer job | Canonical route | Legacy compatibility |
|---|---|---|
| Contracts & Renewals | `/app/contracts` | Existing contract detail routes remain available |
| Findings | `/app/findings` | `/app/opportunities` renders the Findings workspace; opportunity detail records remain supported |
| Actions | `/app/actions` | Existing action detail routes remain available |
| Results | `/app/results` | `/app/savings` renders Results; `/app/reports` renders the Reports view inside Results |

Every global page must identify that it is across vendors through its title and surrounding workspace context. Vendor pages remain scoped to one relationship and link outward with explicit labels such as `View all findings across vendors`.

## Contracts & Renewals

Page title:

```text
Contracts & Renewals
```

Purpose:

> Show deadlines, notice periods, auto-renewals, and agreement risk across every vendor.

Tabs, backed by the `view` query parameter:

```text
Upcoming       /app/contracts?view=upcoming
All Contracts  /app/contracts?view=all
Needs Details  /app/contracts?view=needs_details
Expired        /app/contracts?view=expired
```

Rules:

- Upcoming means an agreement with an end date within the next 365 days.
- Needs Details includes missing end date, notice period, source contract, or assigned vendor account.
- Expired means the recorded end date is before today.
- Missing values remain `Not recorded`, `Not assigned`, or `Value not recorded`; they are not guessed.
- Every row links to the contract detail, vendor workspace, and assigned account/location when available.
- Annual contract value is the recorded agreement value, not a calculated savings claim.

## Findings

Customer-facing language:

```text
Opportunities -> Findings
Estimated annual value -> Potential value
```

Page purpose:

> Show what Costivra discovered across every vendor, with evidence and limits visible.

Tabs, backed by the `view` query parameter:

```text
Needs Review      /app/findings?view=review
Evidence Backed   /app/findings?view=evidence_backed
Needs Evidence    /app/findings?view=needs_evidence
Dismissed         /app/findings?view=dismissed
```

Each finding row shows:

- Finding title and summary.
- Vendor, account, and location scope.
- Source bill link when the source invoice or normalized spend record is available.
- Trust state and evidence count.
- Potential value, never presented as verified value.
- Current finding status and an authorized status control where supported.

Trust rules:

- `Evidence backed` requires the existing evidence-backed trust state and at least one evidence reference.
- `Needs evidence` includes no evidence, sample records, deprecated records, and records whose trust state is not evidence backed.
- Potential value remains an estimate even when evidence backed. It is not a Result until the verification workflow proves it.
- No model output is treated as a financial calculation or approval.

## Actions

Page purpose:

> Show what requires approval, execution, or follow-up, with ownership and evidence attached.

Tabs, backed by the `view` query parameter:

```text
Needs Approval   /app/actions?view=approval
Assigned to Me   /app/actions?view=assigned
In Progress      /app/actions?view=in_progress
Completed        /app/actions?view=completed
```

Each action links to:

- The action detail.
- Its Finding.
- Its vendor workspace.
- The source bill/evidence when the linked finding has a source record.

Approval and execution behavior remains explicit:

- Approve and decline controls use the existing protected action API.
- Only the configured approval policy can authorize consequential work.
- Viewer users do not receive write controls.
- Starting, completing, or declining work is recorded through the existing action workflow and audit path.

## Results

Customer-facing pages combine the former Savings and Reports destinations:

```text
/app/results
```

Tabs, backed by the `view` query parameter:

```text
Verified Value       /app/results?view=verified
In Progress          /app/results?view=in_progress
Reports              /app/results?view=reports
Executive Summary    /app/results?view=summary
```

### Verified Value

Source: `savings_outcomes`.

Show only outcomes with `status = verified` and a recorded verification timestamp. Display the method, baseline, later comparison, and verified result together.

### In Progress

Show clearly labeled pending states, including:

- Baseline awaiting acceptance.
- Awaiting comparison.
- Awaiting verification.

These amounts are not verified value.

### Reports

Use existing report records and protected report download endpoints. Reports are an output inside Results, not a competing primary destination.

### Executive Summary

Show:

- Recorded annualized spend.
- Potential value, explicitly marked as an estimate.
- Actions in progress.
- Verified value.
- Renewals approaching.

## Vendor-scoped workflow

Inside `/app/vendors/[vendorId]?tab=findings`, keep one relationship-scoped Findings tab with three sections:

```text
Findings
Actions
Results
```

Do not create separate vendor tabs for each. Use explicit cross-vendor links:

```text
View all findings across vendors
View all actions across vendors
View all results across vendors
```

Vendor findings, actions, results, contracts, and bills link back to the same vendor workspace and do not silently switch to a global list.

## Legacy route behavior

Preserve existing record details and APIs while changing customer navigation:

```text
/app/opportunities       -> Findings workspace compatibility view
/app/savings              -> Results, Verified Value view
/app/reports              -> Results, Reports view
```

The internal API and database names remain unchanged until a separate migration is approved.

## Implementation inventory

The current vertical slice spans:

```text
src/components/portal-pages.tsx
  Contracts & Renewals, Findings, Actions, Results, legacy compatibility, and vendor-scoped links

src/components/portal-record-detail.tsx
  Customer-facing Finding and Result detail labels while preserving internal record kinds

src/lib/portal/record-context.ts
  Canonical customer links for Findings, Results, Bills, and source records

src/lib/portal/workflow-workspaces.ts
  Pure tab resolution, classification, deadline, trust, action, and result helpers

src/lib/portal/workflow-workspaces.test.ts
  Tab fallbacks and the deterministic classification rules for each workspace

src/app/globals.css
  Shared tab strip and responsive workflow-row presentation
```

## Required tests

Maintain tests for:

- Customer-facing terminology and legacy compatibility.
- Contract tab resolution, upcoming/expired boundaries, and missing details.
- Finding trust states, evidence counts, and potential-versus-verified value language.
- Action queue classification, assignment, approval, and completion states.
- Results tabs, verified-only display, pending-result labels, and report access.
- Vendor-scoped Findings / Actions / Results links.
- Source bill and evidence links.
- Search labels, notifications, permission-gated mutations, and mobile navigation.

## Completion checklist

- [x] Contracts page is titled `Contracts & Renewals` and has the four required tabs.
- [x] Opportunities are presented to customers as Findings.
- [x] Findings show vendor scope, evidence, trust state, source bill, status, and potential value.
- [x] Actions remain a global approval/execution queue with four tabs.
- [x] Results combines verified value, in-progress outcomes, reports, and an executive summary.
- [x] Potential value and verified value are visibly distinct.
- [x] Vendor workspace keeps Findings, Actions, and Results together with explicit cross-vendor links.
- [x] Legacy `/app/opportunities`, `/app/savings`, and `/app/reports` compatibility views remain available.
- [x] Automated checks and authenticated desktop/mobile browser QA pass for this chunk.

Later route-wide redirect normalization belongs to Chunk 6. Final release evidence belongs to Chunk 8.

## Exit gate

A customer can explain the workflow in one sentence:

> Costivra finds a supported issue, helps us approve the next action, and shows the result only when the evidence proves it.
