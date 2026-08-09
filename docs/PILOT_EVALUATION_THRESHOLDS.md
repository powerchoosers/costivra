# Pilot evaluation thresholds

These are release gates, not aspirational targets. A failed gate remains failed until the corpus, extraction, or review policy is corrected and the run is repeated.

## Corpus minimums

| Class or segment | Minimum |
|---|---:|
| Software/SaaS | 20 |
| Telecom/internet | 20 |
| Commercial energy/utility | 20 |
| Scanned or image-heavy | 10 |
| Adversarial/prompt-injection | 10 |

Each case must carry an explicit data classification: `synthetic_smoke`, `deidentified_real`, `consented_real`, `adversarial`, or `scanned_real`. Synthetic smoke cases never count toward the pilot corpus.

## Required quality gates

- Classification accuracy: at least 98%.
- Critical-field precision: at least 97%.
- Critical-field recall: at least 95%.
- Line-item precision: at least 95%.
- Line-item recall: at least 95%.
- Evidence citation recall: at least 90%.
- Evidence-grounded precision: 100%.
- Arithmetic reconciliation accuracy: at least 98%.
- Review-routing accuracy: 100%.
- Extraction errors: zero.
- Unsupported benchmark claims: zero.
- Fabricated citations: zero.
- Cross-category leakage: zero.
- Private invoice data sent to web search: zero.
- Verified-savings claims derived only from estimates: zero.

The evaluator returns a non-zero exit code for any failed threshold or insufficient coverage. Thresholds must not be lowered after a failed run without an explicit Lewis-approved decision record.
