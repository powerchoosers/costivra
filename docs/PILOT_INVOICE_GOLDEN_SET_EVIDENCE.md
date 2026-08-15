# Packet 04 — Pilot Invoice Golden-Set Evidence

**Snapshot date:** August 15, 2026
**Status:** **BLOCKED — approved real corpus not supplied**
**Repository:** `powerchoosers/costivra`

## Honest scope decision

The first pilot evaluation scope is defined as:

| Category | Intended state | Evidence required before promotion |
|---|---|---|
| Software/SaaS | Draft | At least 20 approved real cases across meaningful templates |
| Telecom/internet | Draft | At least 20 approved real cases across meaningful templates |
| Commercial energy/utility | Draft | At least 20 approved real cases across meaningful templates |
| Other categories | Unsupported | Separate corpus and thresholds; no promotion by analogy |

The evaluator also requires 10 scanned/image-heavy cases and 10 adversarial cases. No category is `verified_for_pilot` in this packet because no approved de-identified or consented corpus was present.

## Current inventory

- Approved private corpus directory: absent.
- Approved manifest: absent.
- Private prediction/report artifacts: absent.
- Real cases: 0.
- Received candidate documents pending approval: 2 commercial-energy documents supplied by Lewis (one Reliant PDF and one TXU image). They are not counted as real cases until a consent/de-identification reference, safe private-corpus placement, independent labels, and reviewer reference are recorded.
- Local intake scan: the known supplied invoice folders contain no additional usable invoice documents; the remaining PDF is an analysis artifact with no extractable invoice text.
- Public template samples downloaded for local parser coverage: 16 total (5 energy examples plus 11 software/telecom/internet examples, including Adobe and AT&T); these do not count as real cases.
- Independent reviewer references: 0.
- Double-reviewed disagreements: not applicable.
- Raw invoice text in Git or public search: none found in the repository audit.

The committed files under `tests/fixtures/invoices/` are public sample documents or synthetic safety fixtures. They are explicitly not real-data evidence.

## Safe infrastructure completed

- `private-evaluation/` is ignored by Git.
- The pilot wrapper rejects synthetic smoke cases, absolute paths, paths outside the private root, insufficient category/scan/adversarial coverage, and invalid manifest values.
- The manifest parser rejects likely secrets/private keys, missing classification, missing reviewer/provenance references, invalid money/date values, impossible totals, and ungrounded required evidence configuration.
- `npm run security:private-evaluation` fails if a private corpus or private case directory is staged.
- The evaluator writes case-level reports only under ignored private storage and prints aggregate metrics rather than source text.

## Thresholds set before a real run

The release thresholds are recorded in `docs/PILOT_EVALUATION_THRESHOLDS.md` and must not be lowered after seeing results. They include classification, critical-field precision/recall, line-item precision/recall, evidence grounding, arithmetic reconciliation, review routing, zero extraction errors, and zero unsafe or unsupported claims.

## Checks run

| Check | Result |
|---|---|
| Deterministic smoke evaluation using committed synthetic prediction | **PASS** — 1 case, all reported metrics 100%, 0 extraction errors; not real-data evidence |
| Public sample download/parser validation | **PASS** — 16 official/public PDFs across energy, software, telecom, and internet formats; all readable by the production PDF parser |
| Real manifest validation | **NOT RUN — no approved manifest exists** |
| Real pilot evaluation | **BLOCKED — no approved corpus exists** |
| Category promotion | **NOT RUN — all categories remain draft/unsupported** |
| Private corpus staging guard | Implemented; must pass in CI and release checks |

The structural category suites also passed under Node 24.19.0: `categories`, `line_items`, `benchmarks`, and `market_research`. These are synthetic safety/contract checks and do not promote a real invoice category.

## Required owner input

Provide an approved, de-identified or consented corpus under the ignored layout below. Do not paste documents or extracted text into chat or commit them:

```text
private-evaluation/
  invoices/software/
  invoices/telecom/
  invoices/energy/
  invoices/scanned/
  invoices/anomalies/
  invoices/adversarial/
  manifests/approved.json
```

Every case needs a provenance/de-identification or consent reference, independent expected labels, evidence boundaries, reconciliation state, review-routing expectation, and a reviewer reference. Once supplied, validate first, run the held-out evaluation, diagnose failures without discarding difficult cases, and publish only aggregate de-identified metrics.

No fake invoices, copied model predictions, invented reviewer approvals, fabricated citations, or estimated savings claims were added to close this gate.
