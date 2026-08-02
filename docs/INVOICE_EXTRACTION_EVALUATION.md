# Invoice extraction release gate

Costivra does not treat a few successful uploads as proof that invoice extraction is production-ready. This evaluator measures the same structured output, native text parser, deterministic arithmetic, and human-review policy used by production intake.

## What the gate measures

- classification accuracy;
- precision and recall for vendor, currency, invoice identifiers, dates, service periods, totals, taxes, fees, credits, and amount due;
- exact line-item precision and recall when line-item truth is supplied;
- whether required evidence citations exist and are copied from the source document;
- deterministic reconciliation status;
- whether questionable invoices are routed to human review;
- extraction errors and minimum dataset coverage.

A wrong non-empty value counts as both a false positive and a false negative. This prevents an invented value from receiving partial credit. Saved model predictions are parsed through the same allowlisted production parser before scoring.

## Required private dataset

Before broad launch, create `tests/golden-private/` with:

- at least 20 de-identified software invoices;
- at least 20 de-identified telecom or internet invoices;
- at least 10 genuinely scanned examples;
- clean, incomplete, contradictory, credit, tax, fee, multi-page, arithmetic-error, and low-quality cases.

Only use documents the business is allowed to test. Remove names, addresses, account numbers, payment details, and other customer information while preserving layout and arithmetic. `tests/golden-private/` and generated reports are ignored by Git.

## Manifest rules

Start from `tests/fixtures/invoices/golden-manifest.smoke.json`, but do not copy its zero coverage requirements into the production manifest. If `coverageRequirements` is omitted, the evaluator enforces the production minimums of 20 software, 20 telecom/internet, and 10 scanned cases.

Every invoice field must be present in expected truth. Use `null` only when the source truly does not show the field. Omitting a field is rejected because it could hide a weak extraction result.

For native-text documents, evidence quotes must occur in the text extracted by the production parser. For scanned documents, each required evidence field must include one or more human-transcribed `evidenceSnippets` because there is no native text layer against which to verify a quote.

Line items are optional. Omit `lineItems` to leave them unscored for that case. Supply an empty array only when the document truly has no line items.

## Commands

Validate the manifest and every source file without using the AI provider:

```powershell
npm run eval:invoices -- --manifest tests/golden-private/manifest.json --validate-only
```

Run the live production extraction path and write ignored prediction/report artifacts:

```powershell
npm run eval:invoices -- --manifest tests/golden-private/manifest.json
```

Replay a saved prediction set without paying for another model run:

```powershell
npm run eval:invoices -- --manifest tests/golden-private/manifest.json --predictions artifacts/invoice-evaluation/<prediction-file>.json
```

The command exits non-zero when any threshold, coverage requirement, or error budget fails, making it suitable for a controlled release gate. Live evaluation needs `OPEN_ROUTER_API_KEY` in the ignored `.env.local` file. Reports may contain de-identified invoice values and must remain private.

## Built-in smoke check

The committed smoke files test the scorer and command wiring only. They do not measure model quality and cannot satisfy the production gate:

```powershell
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
```
