
# Packet 03: Remove Fabricated Benchmarks and Add an Honest Benchmark Contract

## Mission

Remove all synthetic “market rate” and “annual savings” calculations that are not supported by comparable data.

This is a release blocker.


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


## Code to remove

Inspect:

```text
src/app/api/portal/documents/[id]/breakdown/route.ts
Bill Breakdown UI components
any helper or card that displays market variance
```

Remove logic that assumes a category-wide ratio such as:

```text
telecom 1.18
software/cloud 1.12
energy/utility 1.24
everything else 1.08
```

Remove labels such as:

```text
Costivra Regional [Category] Intelligence Benchmark
```

unless they are backed by a persisted comparable dataset and sources.

## Safe benchmark result

Use one shared type:

```ts
type BenchmarkResult = {
  status:
    | "comparable"
    | "directional"
    | "quote_required"
    | "insufficient_data"
    | "unsupported";
  metric: string | null;
  currentValue: number | null;
  comparisonRange: {
    low: number;
    median: number;
    high: number;
  } | null;
  percentile: number | null;
  unit: string | null;
  comparableDimensions: Record<string, unknown>;
  missingDimensions: string[];
  sourceIds: string[];
  sources: Array<{
    title: string;
    url: string;
    asOf: string | null;
  }>;
  asOf: string | null;
  confidence: number;
  caveats: string[];
  potentialAnnualSavings: number | null;
};
```

## Default behavior

Until a verified method and comparable data exist, return:

```json
{
  "status": "insufficient_data",
  "metric": null,
  "currentValue": null,
  "comparisonRange": null,
  "percentile": null,
  "unit": null,
  "comparableDimensions": {},
  "missingDimensions": [
    "service specification",
    "geography",
    "usage or volume",
    "contract term",
    "current comparable quotes"
  ],
  "sourceIds": [],
  "sources": [],
  "asOf": null,
  "confidence": 0,
  "potentialAnnualSavings": null
}
```

## Savings rules

Do not calculate annual savings merely by:

```text
invoice difference × 12
assumed ratio × invoice total
public list price minus invoice
government average minus invoice
```

Annual savings may be calculated only when:

- The recurring baseline is established
- The comparison scope is equivalent
- The alternative price is current and supported
- One-time costs are separated
- Contract/switching/implementation costs are considered
- The result is labeled estimated until verified

## Bill Breakdown UI

Replace the fake benchmark panel with an honest state:

### Insufficient data

```text
Market comparison needs more detail

Costivra needs the service specification, location, usage,
contract term, and current comparable offers before estimating
a market range.
```

### Quote required

```text
Live quote required

Public benchmarks are not comparable enough for this service.
Obtain current quotes using the same scope and commercial terms.
```

### Comparable

Only show when real range and sources exist.

## Route correctness

Ensure the route uses actual live invoice fields. Do not reintroduce nonexistent fields. Inspect Supabase through MCP before editing.

## Tests

Add:

- Telecom invoice does not automatically receive an 18% variance.
- Energy invoice does not automatically receive a 24% variance.
- Unknown category does not receive an 8% variance.
- Missing dimensions return `insufficient_data`.
- No potential savings is produced from total bill alone.
- Comparable result requires sources and `asOf`.
- UI renders null amounts without `$0.00`.
- UI never displays “regional benchmark” without a source.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run build
```

Browser-test the Bill Breakdown modal with insufficient, quote-required, and mocked comparable results.

## Definition of done

- Hardcoded benchmark ratios are gone.
- Fake regional benchmark labels are gone.
- Savings are null when unsupported.
- One shared benchmark contract is used.
- Bill Breakdown communicates insufficiency clearly.
- Tests prevent regression.

## Commit suggestion

```text
fix(benchmarks): remove synthetic market rates and require comparable evidence
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

