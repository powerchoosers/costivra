---
description: Correct Costivra's TXU invoice extraction semantics, exact-cent reconciliation, energy-specific fields, and vendor/account/location identity matching.
---

# Chunk 3: TXU Extraction, Reconciliation, and Account Matching

## Goal

Make both supplied TXU bill layouts produce correct, explainable records.

Recommended branch:

```text
agent/bill-upload-03-txu-extraction
```

## Privacy rule

The real PDFs are private test sources.

Do not commit:

```text
customer name
full account number
service address
ESI ID
meter ID
original PDF bytes
```

Create de-identified synthetic fixtures preserving layout and arithmetic.

## Paired regression cases

### Case A: prior balance paid before current bill

Expected semantics:

```text
previousBalance: 3520.47
paymentsAndCredits: 3520.47
balanceForward: 0.00
currentCharges: 2472.37
amountDue: 2472.37
```

Current extraction incorrectly stores:

```text
creditTotal: 3520.47
```

That payment belongs to account-history context, not current-period invoice credits.

### Case B: prior balance carried forward

Expected semantics:

```text
previousBalance: 2472.37
paymentsAndCredits: 0.00
balanceForward: 2472.37
currentCharges: 2050.80
amountDue: 4523.17
```

This fixture protects the distinction between:

```text
current charges
amount due
balance forward
current-period credits
```

## Extend the candidate schema

Update `DocumentIntelligence` and `InvoiceCandidate`.

Suggested fields:

```text
previousBalance
paymentsAndCredits
balanceForward
currentCharges
currentPeriodCredits
```

Keep existing fields while defining semantics clearly:

```text
totalAmount:
  current bill charges, not prior balance

amountDue:
  final amount requested for payment

creditTotal:
  credits reducing current-period charges only
```

Add exact source evidence for every new field.

## Extraction instructions

Explicitly tell the model:

- Previous-balance payments are not invoice credits.
- Account-summary balance activity must remain separate from current service charges.
- Do not calculate missing totals.
- When a bill labels "Current Charges," use that value as current charges.
- When amount due includes a balance forward, keep both values.
- Use null when uncertain.

## Energy-specific service details

Add a validated optional energy structure.

Suggested shape:

```ts
energyService: {
  customerName: string | null;
  serviceAddress: string | null;
  serviceIdentifier: string | null;
  meterId: string | null;
  productName: string | null;
  utilityTerritory: string | null;
  billingDays: number | null;
  usageKwh: string | null;
  actualDemandKw: string | null;
  billedDemandKw: string | null;
  meterMultiplier: string | null;
  averagePricePerKwh: string | null;
  readDateStart: string | null;
  readDateEnd: string | null;
}
```

Each material field requires page-aware evidence.

For the two synthetic TXU fixtures, preserve these semantic expectations:

### Dallas-service layout

```text
utility territory: Oncor
product: Business Sure
usage: 15900 kWh
actual demand: 72
billed demand: 73
average price: 0.141 per kWh
```

### Houston-service layout

```text
utility territory: CenterPoint
product: Business Flex Rewards
usage: 8766 kWh
actual demand: 54
billed demand: 54
average price: 0.212 per kWh
```

Do not infer annual usage from one bill.

## Exact-cent reconciliation

Current reconciliation only runs:

```text
line_items_to_subtotal
components_to_total
```

Add safe checks:

```text
line_items_to_current_charges
balance_forward_plus_current_charges_to_amount_due
previous_balance_minus_payments_to_balance_forward
```

Rules:

- Use integer minor units
- No floating point
- Preserve signed credits
- Run a check only when required source fields exist
- Store exact inputs and result
- Keep incomplete when semantics are genuinely missing

For Case A:

```text
line-item current charges must equal 2472.37
balance forward plus current charges must equal 2472.37
```

For Case B:

```text
line-item current charges must equal 2050.80
2472.37 + 2050.80 = 4523.17
```

## Current target invoice

After reprocessing the target bill, the record should not remain merely:

```text
reconciliation_incomplete
```

because the layout lacks a subtotal.

It should either:

```text
reconcile through line items and current charges
```

or show a precise issue such as:

```text
account_summary_credit_classification_needs_review
```

## Workspace, account, and location matching

Current state:

```text
vendor matched: TXU Energy
expense account: null
location: null
workspace: Apex Logistics Group
source customer: Fabriclean Supply
```

Add distinct review dimensions:

```text
vendor identity
customer/workspace identity
expense account identity
service location identity
```

Suggested issue codes:

```text
workspace_customer_name_mismatch
expense_account_unmatched
service_location_unmatched
service_identifier_unmatched
```

Do not call vendor matching "exact" as though the entire bill relationship is exact.

Customer copy:

```text
Vendor matched: TXU Energy
Account match: Needs review
Location match: Needs review
```

## Expense-account matching

Match using allowlisted evidence:

```text
account number last four
service identifier
meter ID
service address
known external account reference
```

Do not match by vendor alone when multiple accounts exist.

Never display a full account number to ordinary customer views.

## Location matching

Normalize addresses safely.

A difference between:

```text
8301 Ambassador Row
```

and:

```text
7500 John W Carpenter Fwy
```

must not be silently treated as the same location because both are in Dallas.

## Page count

The target OCR record currently has no page count even though the source is three pages.

Preserve page count through the OCR path.

If the OCR provider does not return it, derive it from the PDF parser before OCR when safe.

## Tests

Create synthetic three-page fixtures covering both cases.

Assert:

- Current charges
- Amount due
- Prior balance
- Payments
- Balance forward
- Current credits
- All line items
- Usage
- Demand
- Utility territory
- Product
- Service address
- Account/location mismatch
- Exact-cent reconciliation
- No invented annual usage
- No full account number exposure

## Exit gate

Require:

```text
Case A reconciles correctly
Case B reconciles correctly
Prior payment is not current credit
Current charges and amount due remain distinct
Energy fields are source-backed
Account/location mismatch is visible
No real customer PDF is committed
```
