
# Packet 06: Current-Market Research and Trusted Source Registry

## Mission

Implement actual current web research for changing prices, rates, tariffs, assessments, filings, and rules. Listing source URLs in a pack is not enough.


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


## Required components

Create or complete:

```text
src/lib/category-intelligence/source-registry.ts
src/lib/category-intelligence/current-market-research.ts
src/lib/category-intelligence/market-research-schema.ts
```

Create reviewed Supabase tables when absent:

```text
category_source_registry
category_market_snapshots
category_research_runs
```

## Source registry fields

Store category, source name/URL/type, authority, access type, jurisdiction, update frequency, freshness, verification dates, license notes, allowed uses, and status.

## Source hierarchy

1. Customer contract/tariff/quote/invoice
2. Regulator or government
3. Official vendor pricing/rate guide
4. Standards body
5. Licensed industry dataset
6. Reputable industry publication
7. General web only when primary sources are unavailable

## Mandatory research triggers

Search current sources for current/latest/best-price questions and changing tariffs, filings, assessments, fuel surcharges, cloud prices, SaaS prices, insurance rates, shipping rates, and regulations.

Also research when a pack rule requires it, cache is stale, sources disagree, or a high-dollar finding depends on a changing fact.

## Privacy boundary

Public research may receive only public-safe category/vendor/jurisdiction/service descriptors.

Never send customer name, account or policy numbers, service address, employee/claim/health data, private usage, contract text, or customer-specific financial amounts.

## Search implementation

Use the verified OpenRouter web-search adapter pattern or another approved provider.

Require real source annotations.

Reject model-suggested URLs without citations, private/local hosts, IP literals, credentials, and unsupported schemes.

## Research result

Every fact must contain:

```text
fact
value/unit when applicable
scope/dimensions
as-of date
comparability status
source IDs
```

Every source must contain:

```text
title
URL
publisher
effective date
retrieved date
short excerpt
```

## Cache

Cache by category, jurisdiction, vendor/service, metric, and comparison dimensions. Enforce pack freshness.

## Initial sources

Seed primary sources for launch packs:

```text
EIA
ERCOT/PUCT
FCC
USAC
FOCUS
AWS
Azure
Google Cloud
Federal Reserve Regulation II
Visa
Mastercard
EPA
EIA diesel
CMS
SERFF
NCCI
IRS
BLS
```

## Tests

- Search payload excludes private data.
- No annotation means no fact.
- Expired cache triggers refresh.
- Fresh cache avoids repeated search.
- Current USF question triggers research.
- Unknown source domain is rejected.
- Unsupported result is unavailable, not guessed.
- Every fact has a source ID.
- Conflicting sources reduce confidence.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:integration:live
npm run build
```

Use safe public queries for live proof.

## Definition of done

- Research executes.
- Sources are annotated and cached.
- Freshness is enforced.
- Privacy is tested.
- Current claims are cited.
- Search failure produces unavailable results.

## Commit suggestion

```text
feat(market-research): add source-backed current category intelligence
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

