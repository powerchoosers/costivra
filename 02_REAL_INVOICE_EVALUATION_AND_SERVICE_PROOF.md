# Packet 02: Real Invoice Evaluation and Service Proof

## Mission

Prove that Costivra's bill-to-finding service works on an approved, de-identified evaluation corpus. Keep synthetic tests, but stop treating synthetic structural coverage as proof of production accuracy.

This packet owns evaluation infrastructure and evidence. It must not fabricate customer documents, labels, metrics, citations, savings, or human approvals.

## Required files to inspect

```text
scripts/evaluate-invoice-extraction.ts
scripts/evaluate-category-intelligence.ts
src/lib/ai/invoice-evaluation.ts
src/lib/ai/document-intelligence.ts
src/lib/category-intelligence/
tests/fixtures/invoices/
docs/INVOICE_EXTRACTION_EVALUATION.md
10_EVALUATIONS_RELEASE_AND_MERGE_TO_MAIN.md
STATUS.md
```

Inspect the live evaluation tables and current evaluation-run records before changing schemas.

## Evaluation classes

Maintain separate labels for:

1. `synthetic_smoke`
2. `deidentified_real`
3. `consented_real`
4. `adversarial`
5. `scanned_real`

Never merge these into one accuracy score.

## Private corpus layout

Create or confirm an ignored layout such as:

```text
private-evaluation/
  invoices/
    software/
    telecom/
    energy/
    scanned/
    adversarial/
  manifests/
  predictions/
  reports/
```

Requirements:

- Add the directory to `.gitignore`.
- Do not commit invoice files or extracted private text.
- Do not send private invoice content to public search.
- Do not log raw invoice text in CI.
- Store only safe aggregate metrics in normal test artifacts.
- The evaluation runner must refuse a manifest that points outside the approved private directory.

## Minimum pilot corpus

The code cannot create this evidence. Lewis or an authorized reviewer must supply de-identified or consented files.

Target minimum:

- 20 software or SaaS invoices
- 20 telecom or internet invoices
- 20 commercial energy bills
- 10 scanned or image-heavy documents across those categories
- 10 incomplete, contradictory, duplicate, or arithmetic-error cases
- 10 adversarial or prompt-injection cases

Use representative vendor variation. Do not build the set from near-duplicate templates alone.

## Golden manifest

Define a strict manifest schema containing, where applicable:

- fixture identifier
- data classification
- category and subtype
- expected vendor identity
- expected invoice number
- invoice date
- due date
- service period
- account identifier suffix
- subtotal
- tax
- fees
- credits
- current charges
- amount due
- line items
- expected reconciliation state
- expected review state
- expected category
- expected evidence page and excerpt boundaries
- fields intentionally unknown
- expected anomaly or finding eligibility
- reviewer identity or review reference
- consent/de-identification reference

Reject manifests with:

- missing classification
- missing review reference for real data
- impossible totals
- unsupported category keys
- absolute file paths
- raw secrets
- expected savings that are not supported by a defined deterministic rule

## Evaluation metrics

Report at least:

### Extraction

- document classification accuracy
- critical-field exact accuracy
- normalized-field accuracy
- line-item precision
- line-item recall
- arithmetic reconciliation rate
- evidence-grounding rate
- low-confidence review-routing recall
- unsafe auto-approval count

### Category intelligence

- parent-category accuracy
- leaf-category accuracy
- material line-item precision
- material line-item recall
- unsupported benchmark claims
- fabricated citations
- private data sent to web search
- cross-category leakage
- verified-savings claims derived only from estimates

### Operational

- failed extraction rate by input mode
- native-text versus OCR performance
- median and p95 processing time
- provider failure rate
- correction frequency by field
- false-positive finding rate
- false-negative finding rate for reviewed cases

## Required thresholds

Use the existing Packet 10 safety thresholds as the minimum baseline:

```text
parent category accuracy >= 98%
leaf category accuracy >= 94%
material line-item precision >= 95%
material line-item recall >= 90%
arithmetic reconciliation = 100%
unsupported benchmark claims = 0
fabricated citations = 0
cross-tenant leakage = 0
private data in web search = 0
verified-savings claim from estimate = 0
```

Add explicit pilot thresholds for critical invoice fields and review routing. Do not silently lower a threshold after a failed run.

## Real-data evaluation command

Add one explicit command, for example:

```bash
npm run eval:pilot
```

It must:

- require an explicit private manifest path;
- refuse to run on the synthetic smoke manifest;
- produce machine-readable JSON and a human-readable Markdown report;
- store the run classification;
- return non-zero when a required threshold fails;
- identify unsupported or unevaluated categories;
- avoid printing private text;
- persist safe run metadata to `category_evaluation_runs` only when live credentials are deliberately enabled.

## Correction-loop proof

Use the existing correction and review foundations.

Prove:

1. A low-confidence or mismatched invoice enters review.
2. A human correction creates an immutable correction record.
3. The corrected authoritative invoice reconciles.
4. The original extraction version remains available.
5. Re-evaluation uses the corrected record where policy permits.
6. A finding is not customer-visible until trust review passes.
7. A finding does not become verified savings merely because it was approved.

Add an authenticated browser test for this flow using disposable data.

## Pack status

Every category pack must have one of these honest states:

- `verified_for_pilot`
- `draft`
- `unsupported`

Only promote a pack when:

- the real corpus covers it;
- thresholds pass;
- sources are current;
- no prohibited claim remains;
- human review is documented.

Do not promote all packs because shared infrastructure passed.

## Output artifacts

Create:

```text
docs/PILOT_EVALUATION_RUNBOOK.md
docs/PILOT_EVALUATION_THRESHOLDS.md
```

The actual real-data report should stay in the ignored private directory unless Lewis explicitly approves a redacted aggregate copy.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
npm run eval:pilot -- --manifest <approved-private-manifest>
npm run test:integration
npm run test:e2e:authenticated
```

Explain any live test that cannot run because the approved corpus is not present.

## Acceptance criteria

- Synthetic and real evaluation results are clearly separated.
- The private corpus cannot be committed accidentally.
- The runner rejects unsafe or incomplete manifests.
- Real evaluation metrics are reproducible.
- Findings and verified savings remain distinct.
- Each launch category has an honest status.
- The full correction loop is proven.
- No private invoice text appears in logs, source, or public search.
- No branch, commit, push, merge, or deployment was performed.
