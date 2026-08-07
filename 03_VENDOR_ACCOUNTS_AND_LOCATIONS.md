---
description: Use Costivra's existing expense_accounts and locations model to give each vendor a clear accounts-and-locations management surface.
---

# Chunk 3: Vendor Accounts and Locations

## Goal

Make multiple service accounts, subscriptions, meters, and locations understandable inside the vendor workspace.

Recommended branch:

```text
agent/app-ia-03-vendor-accounts
```

## Existing data model

Use:

```text
expense_accounts
organization_vendor_id
location_id
external_account_reference
category
status
service_start_date
service_end_date
```

Related records already connect through:

```text
invoices.expense_account_id
expenses.expense_account_id
contracts.expense_account_id
opportunities.expense_account_id
```

Do not create a duplicate vendor-account table.

## Customer-facing name

Use:

```text
Vendor account
```

Examples:

```text
TXU Energy · Account ending 5124
AT&T Business · Dallas office
Microsoft · Corporate tenant
```

Never display:

```text
Expense account
```

to ordinary customers.

## Accounts tab

Route:

```text
/app/vendors/[vendorId]?tab=accounts
```

Show cards or rows containing:

```text
Account label
Masked external reference
Location
Category
Status
Latest bill
Latest amount
Monitoring state
Contract status
Open findings
```

## Account label priority

Use:

1. Customer-entered account label
2. Location name
3. Category plus masked reference
4. `Vendor account`

Do not reveal a full account number.

## Account detail state

Keep the customer inside the vendor workspace.

Recommended URL:

```text
/app/vendors/[vendorId]?tab=accounts&account=[expenseAccountId]
```

Use a side panel or nested content region.

Do not add Vendor Accounts to the primary sidebar.

## Account detail

Show:

```text
Account identity
Masked account reference
Location
Service dates
Latest bill
Bill history
Contract
Monitoring
Findings
Actions
```

Primary actions:

```text
Upload bill for this account
Edit account
Set monitoring
```

## Unmatched bills

Bills with:

```text
expense_account_id = null
```

must appear in:

```text
Needs account match
```

within the vendor Accounts tab and the global Bills & Spend review queue.

The UI should distinguish:

```text
Vendor matched
Account needs review
Location needs review
```

## Locations

Locations belong to the organization but may be associated with many vendor accounts.

Do not duplicate location records inside each vendor.

Allow:

```text
Assign existing location
Create location
Leave unassigned with review reason
```

## Multiple-account vendor summary

The vendor Overview should show:

```text
3 active accounts
2 locations
1 account needs review
```

Selecting the summary opens the Accounts tab.

## Monitoring

Monitoring may exist at vendor level or account level.

Until account-specific monitoring is fully supported, say:

```text
Monitoring applies to this vendor relationship
```

Do not pretend each account has an independent rule when it does not.

## Tests

Add tests for:

- One-account vendor
- Multi-account vendor
- Account with location
- Account without location
- Unmatched invoice
- Masked reference
- Service ended account
- Account URL persistence
- Cross-tenant isolation
- Viewer permissions
- No full account-number exposure

## Exit gate

Accept only when a customer can understand whether TXU Energy is one relationship with one or several service accounts.
