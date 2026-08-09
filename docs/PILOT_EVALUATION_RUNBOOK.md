# Pilot evaluation runbook

## Before adding files

Lewis or an authorized reviewer must provide only de-identified or consented documents. Keep them under the ignored `private-evaluation/` directory:

```text
private-evaluation/
  invoices/software/
  invoices/telecom/
  invoices/energy/
  invoices/scanned/
  invoices/adversarial/
  manifests/
  predictions/
  reports/
```

Do not place customer files in `tests/fixtures/`, do not paste extracted text into source code, and do not send private invoice content to public search.

## Manifest requirements

Every case requires a classification, review reference, source file, expected truth, reconciliation state, review state, and evidence rules. Scanned cases require human-transcribed evidence snippets. The pilot runner rejects synthetic smoke cases, paths outside `private-evaluation/`, missing coverage, and unsafe manifest values.

## Commands

Validate the approved private manifest without calling the model:

```powershell
npm run eval:invoices -- --manifest private-evaluation/manifests/approved.json --validate-only
```

Run the real production extraction path and write private JSON/Markdown reports:

```powershell
npm run eval:pilot -- --manifest private-evaluation/manifests/approved.json
```

Run deterministic category safety suites separately; these remain structural synthetic checks until a representative category corpus is supplied:

```powershell
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
```

The pilot report is evidence for the named corpus only. It does not promote every category, prove customer savings, or replace human review. A category may be marked `verified_for_pilot` only after its own corpus, thresholds, current sources, and human review reference are documented; otherwise it remains `draft` or `unsupported`.

The authenticated correction/approval foundation is covered by `src/lib/integration/invoice-review.live.integration.test.ts`. It proves a mismatched invoice is blocked, corrections are immutable and attributable, reconciliation is recalculated, the original extraction remains available, and repeated approval is idempotent. Run it only with deliberate live-test opt-in and disposable data.
