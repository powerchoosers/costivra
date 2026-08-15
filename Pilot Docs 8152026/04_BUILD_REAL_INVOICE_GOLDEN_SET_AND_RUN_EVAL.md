# Packet 04: Build the Real Invoice Golden Set and Run the Pilot Evaluation

**Snapshot date:** August 15, 2026  
**Priority:** Critical  
**Pilot requirement:** Mandatory  
**Human dependency:** Approved, de-identified or consented documents

## Mission

Prove that Costivra's bill-to-finding service works on the actual document categories offered to the first pilot customers. Keep synthetic tests for engineering coverage, but do not use them as evidence of real extraction accuracy.

This packet owns corpus safety, labeling, reproducible evaluation, category promotion, and the correction loop. It does not fabricate invoices, labels, reviewer approvals, citations, benchmarks, or savings.

## Current evidence to re-check

At the latest audit:

- invoice and category evaluation runners already existed;
- CI replayed a deterministic synthetic smoke evaluation;
- a private real-data evaluation command existed;
- synthetic prompt-injection and safety tests existed;
- the approved real-data corpus and golden manifest were still missing;
- category packs could not honestly be called verified without representative real documents and review;
- the complete browser correction loop still needed current-release proof.

Inspect the current implementation before adding another evaluator.

## Required reading and inspection

```text
scripts/evaluate-invoice-extraction.ts
scripts/evaluate-pilot.ts
scripts/evaluate-category-intelligence.ts
src/lib/ai/invoice-evaluation.ts
src/lib/ai/document-intelligence.ts
src/lib/category-intelligence/
tests/fixtures/invoices/
docs/INVOICE_EXTRACTION_EVALUATION.md
docs/PILOT_EVALUATION_RUNBOOK.md
docs/PILOT_EVALUATION_THRESHOLDS.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
STATUS.md
.gitignore
```

Inspect live evaluation tables if deliberate live credentials are available:

```text
category_evaluation_runs
category_eval_cases
category_analysis_runs
category_feedback
```

## Pilot category rule

Only categories represented in the approved corpus and passing their thresholds may be labeled `verified_for_pilot`.

Every category must have one honest state:

```text
verified_for_pilot
draft
unsupported
```

A category marked `draft` or `unsupported` must either:

- be hidden from automated customer claims;
- route to explicit human review;
- or be excluded from the first pilot scope.

Do not let a passing software-invoice set prove energy, telecom, insurance, waste, or another category by analogy.

## Workstream A: Define the first pilot's category scope

Before collecting files, record:

- the first pilot customer types;
- categories Costivra will accept;
- categories Costivra will analyze automatically;
- categories requiring human-only review;
- categories excluded from the pilot;
- supported file types;
- supported currencies and jurisdictions;
- material fields required for each category.

This is a scope decision, not a marketing wish list.

### Recommended minimum corpus

For a broad software, telecom, and commercial-energy pilot, target:

- 20 software or SaaS invoices;
- 20 telecom or internet invoices;
- 20 commercial energy bills;
- at least 10 scanned or image-heavy documents distributed across enabled categories;
- at least 10 incomplete, contradictory, duplicate, credit-heavy, or arithmetic-error cases;
- at least 10 adversarial or prompt-injection cases.

Documents may satisfy more than one secondary condition, but template diversity must remain meaningful.

For a narrower pilot, a category may be excluded rather than represented by an inadequate sample. Record the limitation prominently.

## Workstream B: Establish a private corpus workflow

Create or verify an ignored layout such as:

```text
private-evaluation/
  invoices/
    software/
    telecom/
    energy/
    scanned/
    anomalies/
    adversarial/
  manifests/
  predictions/
  reports/
```

Requirements:

- the entire private directory is ignored by Git;
- evaluation files cannot be included in a package or test artifact accidentally;
- raw document text is not logged;
- private content is never sent to public web search;
- the runner refuses paths outside the approved private root;
- reports stored in the repository contain aggregate, de-identified results only;
- every real file has a consent or de-identification reference;
- account numbers, addresses, personal names, email addresses, tax IDs, banking details, and other identifiers are removed or handled under explicit consent;
- reviewers receive a clear handling instruction.

Add a pre-commit or release check that fails if known private corpus paths or prohibited file patterns are staged.

## Workstream C: Create the golden manifest

Use or strengthen the existing schema. Each case should include, where applicable:

- safe fixture ID;
- data class: `deidentified_real`, `consented_real`, `scanned_real`, or `adversarial`;
- category and subtype;
- template family;
- expected vendor identity;
- invoice or statement number;
- invoice date and due date;
- service period;
- account identifier suffix only;
- subtotal;
- tax;
- fees;
- credits;
- current charges;
- amount due;
- line items;
- reconciliation expectation;
- review-routing expectation;
- evidence page and excerpt boundaries;
- intentionally unknown fields;
- anomaly or finding eligibility;
- reviewer identity or review reference;
- consent or de-identification reference.

Reject:

- missing classification;
- absolute paths;
- paths outside the approved root;
- missing reviewer reference for real data;
- impossible arithmetic without an explicit anomaly label;
- raw secrets;
- unsupported category keys;
- expected savings unsupported by a deterministic rule and source;
- labels copied directly from the model's prediction without independent review.

Use double review for a meaningful subset and record disagreements.

## Workstream D: Define thresholds before running the release evaluation

Do not lower thresholds after seeing the score.

At minimum report:

### Extraction

- document classification accuracy;
- critical-field exact accuracy;
- normalized-field accuracy;
- line-item precision and recall;
- arithmetic reconciliation rate;
- evidence-grounding rate;
- low-confidence review-routing recall;
- unsafe auto-approval count;
- duplicate detection;
- scanned-document performance.

### Category intelligence

- parent-category accuracy;
- leaf-category accuracy;
- material line-item precision and recall;
- unsupported benchmark claims;
- fabricated citations;
- cross-category leakage;
- private text sent to public search;
- verified-savings claims derived only from estimates.

### Operations

- failure rate by input mode;
- native-text versus scanned performance;
- median and p95 processing time;
- provider failure rate;
- correction rate by field;
- false-positive finding rate;
- false-negative rate for reviewed eligible findings.

Preserve existing safety floors unless a stricter approved threshold replaces them:

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
unsafe auto-approval count = 0
```

Add explicit critical-field and review-routing thresholds appropriate to the first pilot.

## Workstream E: Run the real pilot evaluation

The command should resemble:

```bash
npm run eval:pilot -- --manifest private-evaluation/manifests/<approved-manifest>.json
```

The runner must:

- refuse the synthetic smoke manifest;
- validate corpus paths and classifications;
- use the production parser and model path under the intended configuration;
- produce machine-readable JSON;
- produce a human-readable Markdown report;
- separate metrics by category, scan mode, and data class;
- exit non-zero when a required threshold fails;
- identify unsupported categories;
- avoid printing private text;
- persist only safe metadata when live persistence is explicitly enabled;
- record model/provider versions and configuration safely;
- make repeated runs comparable.

Retain a redacted aggregate report for the release packet. Keep case-level private results outside Git.

## Workstream F: Diagnose failures instead of tuning to the test set

For every failed threshold:

1. classify parsing, OCR, normalization, category, evidence, arithmetic, review-routing, or model failure;
2. identify whether the case is representative;
3. repair a general rule, prompt boundary, parser, or review policy;
4. add a safe regression fixture when possible;
5. rerun held-out cases;
6. avoid vendor-template special cases that merely memorize the golden set;
7. record remaining unsupported patterns.

Do not silently discard difficult cases.

## Workstream G: Prove the correction and review loop

Using disposable data, prove:

1. a low-confidence or mismatched invoice enters review;
2. an authorized human sees source evidence;
3. a correction creates an immutable correction record;
4. the corrected authoritative invoice reconciles;
5. the original extraction version remains available;
6. the correction does not rewrite historical evidence invisibly;
7. a finding remains hidden until trust review passes;
8. approval does not automatically equal verified savings;
9. a later invoice or other approved source is required for verification where applicable.

Add or update authenticated browser coverage.

## Required commands

```bash
npm ci
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
npm run build
npm run test:e2e:authenticated
```

If the approved corpus is missing, complete only the safe infrastructure work and return `BLOCKED` for the real-data proof. Do not generate fake real invoices to close the gate.

## Required evidence

- approved pilot category scope;
- corpus inventory by category, template family, and scan mode;
- consent or de-identification references;
- manifest validation result;
- reviewer process and disagreement count;
- exact evaluation command and commit;
- aggregate metrics;
- threshold pass/fail by category;
- unsupported patterns;
- correction-loop browser artifact;
- statement that raw private data remained outside Git and public search.

## Acceptance criteria

- Synthetic and real evaluations are clearly separated.
- The private corpus cannot be committed accidentally.
- Every real case has approved handling and independent labels.
- The runner rejects unsafe manifests and paths.
- Thresholds were set before the release run.
- Every enabled pilot category passes its required thresholds.
- Non-passing categories are marked draft or unsupported and handled accordingly.
- No unsupported benchmark or fabricated citation appears.
- No estimate is represented as verified savings.
- The correction loop is proven and version-preserving.
- The aggregate report is reproducible on the exact commit.
- No private invoice text appears in source, logs, CI artifacts, or public search.

## Explicitly out of scope

- fabricating an evaluation corpus;
- using customer documents without authorization;
- training a model on the private corpus without a separate decision;
- promoting every category because shared infrastructure passed;
- adding broad new categories during this packet;
- tuning directly to every golden case;
- committing private case-level reports;
- committing, pushing, deploying, or sending data to a new provider without explicit authorization.

## Completion report

Return the shared completion report from Packet 00. Include a category table:

| Category | Real cases | Template families | Scanned cases | Threshold result | Pilot status |
|---|---:|---:|---:|---|---|
| ... | ... | ... | ... | PASS / FAIL / NOT RUN | verified_for_pilot / draft / unsupported |
