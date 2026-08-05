
# Packet 04: Pack-Driven Line-Item Normalization

## Mission

Replace the global substring chain with category-specific line-item interpretation driven by the selected expert pack.


## Operating rules

- Read `AGENTS.md`, `STATUS.md`, and `DECISIONS.md` before editing.
- Inspect the latest branch and live Supabase schema rather than trusting the static SHAs in this packet.
- Preserve unrelated product work.
- Work on `agent/category-intelligence-hardening` when it exists. Otherwise create it from the latest `main`.
- At the start, rebase or merge the latest `main` only when the worktree is clean and conflicts can be reviewed safely.
- Do not merge into `main` during this packet unless this packet explicitly says to.
- Use Supabase MCP for schema inspection and reviewed migrations.
- Never place credentials, customer data, or private invoice text in source, tests, logs, or public web-search requests.
- AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.
- Unknown means unknown. Do not invent a category, line-item meaning, benchmark, market price, citation, or savings number.
- Run the packet’s validation commands and repair failures before reporting completion.
- Commit and push the packet as one or a few reviewable commits.


## Current failure pattern

The earlier normalizer accepted `categoryKey` but discarded it, then globally mapped strings such as:

```text
access fee -> telecom
regulatory recovery -> telecom
seat -> SaaS
class code -> workers comp
energy charge -> electricity
```

An unknown line defaulted to a fixed charge with high confidence.

That behavior is not acceptable.

## Required normalizer

Suggested input:

```ts
type NormalizeLineItemsInput = {
  categoryKey: string | null;
  documentType: string | null;
  vendorName: string | null;
  items: Array<{
    id?: string;
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
    unit?: string | null;
    nearbyText?: string | null;
    evidenceIds?: string[];
  }>;
};
```

Suggested output:

```ts
type NormalizedLineItem = {
  lineItemId?: string;
  originalDescription: string;
  canonicalCode: string | null;
  label: string;
  chargeClass: ChargeClass;
  explanation: string;
  confidence: number;
  matchedAlias: string | null;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  unit?: string | null;
  evidenceIds: string[];
  reviewRequired: boolean;
  packVersion: string | null;
};
```

## Matching order

1. Load exact expert pack.
2. Normalize punctuation, whitespace, casing, common OCR errors, and units.
3. Match exact aliases.
4. Match token-safe aliases.
5. Use category, document type, unit, vendor, quantity, and nearby lines to disambiguate.
6. Permit bounded model classification only among the selected pack’s canonical definitions.
7. Require evidence for material findings.
8. Return unknown when confidence is insufficient.

## Unknown default

Use:

```ts
{
  canonicalCode: null,
  label: originalDescription || "Unclassified line item",
  chargeClass: "unknown",
  explanation: "This line item has not been confidently classified.",
  confidence: 0,
  matchedAlias: null,
  reviewRequired: true
}
```

Never default to fixed with 0.85 confidence.

## Pack isolation

A line can match only:

- The active exact pack
- Explicitly declared adjacent shared definitions such as generic tax, credit, late fee, or adjustment

Create a small global shared pack for genuinely cross-category items. Do not use it for domain-specific charges.

## Evidence and persistence

Carry extraction evidence IDs into classification.

Persist in `invoice_line_item_classifications` or an equivalent reviewed schema:

```text
invoice_line_item_id
category_id/category_key
canonical_code
confidence
expert_pack_version
evidence_reference_ids
review_status
reviewed_by
reviewed_at
```

## Human correction

A reviewer can change category, canonical line item, or mark unknown. Save new aliases as candidates; do not automatically promote them into a verified pack.

## Tests

- `access fee` in broadband maps to local loop/access.
- `access fee` in insurance does not map to telecom.
- `class code` in workers comp maps correctly.
- `class code` in freight does not map to workers comp.
- `seat` in SaaS maps to license seat.
- `seat` in vehicle lease remains unknown.
- Unknown line has confidence 0 and requires review.
- Negative amount can map to generic credit.
- Pack version is persisted.
- Cross-category definitions are blocked.

## Integration

Connect normalization to:

```text
document extraction
invoice line-item persistence
Bill Breakdown
Ask Costivra
```

Do not let each surface reclassify independently.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run build
```

## Definition of done

- `categoryKey` is used.
- Global domain-specific substring chain is removed.
- Unknown is safe.
- Pack isolation works.
- Evidence and pack version are preserved.
- Classifications persist and can be reviewed.
- Tests cover ambiguity.

## Commit suggestion

```text
feat(line-items): normalize invoice charges through exact category packs
```


## Required completion report

Return:

1. Starting branch and commit
2. Ending branch and commit
3. Files changed
4. Database migrations applied, if any
5. Tests and exact pass/fail results
6. Screens or browser flows verified, if applicable
7. Any remaining blocker
8. A clear verdict: `PACKET COMPLETE` or `PACKET INCOMPLETE`

