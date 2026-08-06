---
description: Make Costivra evidence page-aware, connect line items and findings to exact source quotes, and stop showing "no evidence" when source evidence exists.
---

# Chunk 4: Evidence Page Mapping and Line-Item Provenance

## Goal

Create a traceable chain from every displayed extracted fact or finding to the correct source page.

Recommended branch:

```text
agent/bill-upload-04-evidence
```

## Current defects

### All evidence is stored as page 1

`processDocumentBuffer` currently inserts:

```text
page_number: 1
```

for every evidence quote.

The target bill's charge evidence is visually on page 3, not page 1.

### Line-item evidence IDs are empty

`createInvoiceRecordFromExtraction` intentionally sends:

```text
evidenceIds: []
```

into line-item normalization.

Every classification therefore lacks linked source evidence and requires review.

### Breakdown evidence is truncated and unordered

The route limits evidence to 10 without explicit ordering.

The target document has more than 10 evidence rows.

## Page-aware extraction contract

Extend evidence shape:

```ts
type ExtractedEvidence = {
  field: string;
  quote: string;
  pageNumber: number | null;
  sourceKey?: string | null;
}
```

For PDF OCR, require page number from the model/plugin output.

For native PDF extraction, preserve page boundaries.

Suggested text extraction output:

```ts
{
  text: string;
  pageCount: number | null;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
}
```

For DOCX or TXT:

```text
pageNumber may be null or 1 when the concept of a source page does not exist
```

Do not fabricate page numbers.

## Line-item evidence contract

Each extracted line item needs a stable local key.

Suggested:

```ts
{
  sourceKey: "line-1",
  description: "...",
  amount: "...",
  evidence: [
    {
      pageNumber: 3,
      quote: "Energy Charge 15900 kWh @ $0.081 $1,287.90"
    }
  ]
}
```

On persistence:

1. Insert evidence rows.
2. Map source keys to evidence IDs.
3. Insert invoice line items.
4. Insert classifications with the correct evidence-reference IDs.

Do not match only by loose description after insertion when a stable source key can be carried through the pipeline.

## Evidence for grouped totals

Capture evidence for:

```text
commercial charges total
distribution charges total
current charges
amount due
balance forward
payments
```

This helps explain reconciliation.

## Finding evidence gate

A finding may appear as evidence-backed only when:

```text
required evidence references exist
the relevant source facts are stored
the deterministic rule inputs are stored
```

If a rule is plausible but evidence is missing:

```text
state = needs evidence
not a confirmed finding
```

## Breakdown display

For each line item show:

```text
source page
short quote
Open source page
classification confidence
review state
```

For PDF preview:

```text
Open source page
```

should navigate or scroll to the page when browser support allows.

Do not claim precise bounding-box highlighting unless the stored evidence has real coordinates.

## Evidence count semantics

Separate:

```text
invoice field evidence count
line-item evidence count
opportunity evidence count
```

Do not show a single generic count that implies all displayed claims are supported.

## Existing target record

The target document has invoice-level evidence quotes.

After this chunk:

- page 3 charge evidence should point to page 3
- line-item classifications should link to those evidence rows
- the breakdown should not say "no evidence" for extracted charge lines
- unrelated seeded opportunities should still show zero opportunity evidence

## Evidence repair for existing records

Do not mass-backfill page numbers with guesses.

Options:

```text
reprocess selected source documents
mark legacy evidence page as unknown
operator-assisted relinking
```

For the target disposable/demo document, reprocessing is acceptable after preserving audit history.

## Tests

Use de-identified multi-page fixtures.

Assert:

- Header evidence page 1
- Account-summary evidence page 1 or 2 as appropriate
- Charge evidence page 3
- Stable line-item source keys
- Classification evidence IDs populated
- Evidence ordering
- Pagination
- Cross-tenant isolation
- No raw full account number in customer excerpt
- No fabricated bounding boxes

## Exit gate

Require:

```text
No PDF evidence is hardcoded to page 1
Every classified target line item has linked evidence or explicit needs-evidence state
Breakdown opens the correct source page
Opportunity evidence remains distinct from invoice evidence
Legacy records are not silently falsified
```
