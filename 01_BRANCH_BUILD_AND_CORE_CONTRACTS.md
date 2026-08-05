
# Packet 01: Branch, Build, and Category-Intelligence Core Contracts

## Mission

Make the existing category-intelligence work reproducible, complete at the module level, and green before adding more expertise.

At the time this packet was prepared:

- `main` had advanced beyond the original category branch.
- `agent/category-intelligence-hardening` contained nine partial hardening commits.
- An earlier branch failed Vercel because `@/lib/category-intelligence/service` was imported without being committed.

Inspect the current repository and preserve any newer fixes.


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


## Scope

This packet may edit only:

```text
src/lib/category-intelligence/
src/lib/client-assistant/
package.json
tsconfig files when genuinely required
tests directly related to module integrity
STATUS.md
DECISIONS.md
```

Do not add new market packs in this packet.

## Required module inventory

Ensure these modules exist, are committed, and have valid exports:

```text
src/lib/category-intelligence/types.ts
src/lib/category-intelligence/pack-schema.ts
src/lib/category-intelligence/service.ts
src/lib/category-intelligence/category-resolver.ts
src/lib/category-intelligence/context-builder.ts
src/lib/category-intelligence/line-item-normalizer.ts
src/lib/category-intelligence/bill-quality.ts
src/lib/category-intelligence/benchmark-engine.ts
src/lib/category-intelligence/current-market-research.ts
src/lib/category-intelligence/packs/index.ts
```

A module may be intentionally minimal, but it must not pretend to provide functionality that does not exist.

## Runtime schemas

Create or finish runtime validation for:

```text
CategoryExpertPackV1
CategoryResolution
NormalizedLineItem
CategoryBillAnalysis
BenchmarkResult
MarketResearchResult
CategoryAiContext
```

Use the repository’s existing validation pattern. Do not rely only on TypeScript interfaces for model or database-derived JSON.

## Service contract

`categoryIntelligence` must expose stable methods:

```ts
resolveCategory(input)
getExpertPack(categoryKey)
normalizeLineItems(input)
analyzeBill(input)
benchmark(input)
researchCurrentMarket(input)
buildAiContext(input)
```

Methods may return safe unavailable results where later packets have not implemented the capability.

Example safe placeholder:

```ts
{
  status: "unsupported",
  reason: "Current market research is not implemented for this category."
}
```

Do not return fabricated results.

## Import audit

Run:

```bash
git grep -n "category-intelligence" -- src
```

For every import:

- Confirm the target file exists.
- Confirm the named export exists.
- Confirm it is server-only where appropriate.
- Confirm no client component imports server-only code.
- Confirm there is no circular import through pack registry and service.

## Branch reconciliation

1. Inspect `main`, `agent/category-intelligence-hardening`, and any active Antigravity branch.
2. Preserve newer record-page and application changes already on `main`.
3. Rebase or merge the hardening branch onto the latest `main`.
4. Resolve conflicts by schema and tests, not by choosing “ours” or “theirs” blindly.
5. Confirm the worktree is clean after commit.

## Tests

Add a module-integrity test that imports:

```text
categoryIntelligence
pack runtime schema
pack registry
benchmark engine
market research service
line-item normalizer
```

The test should fail if a referenced module or export disappears.

Add pack-schema tests:

- Valid draft pack passes.
- Missing schema version fails.
- Invalid status fails.
- Unsupported charge class fails.
- Negative freshness fails.
- Empty category key fails.

## Validation

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
git diff --check
```

Confirm Vercel is green for the pushed commit when preview deployment is configured.

## Definition of done

- Every category-intelligence import resolves.
- The branch includes all required files.
- No missing-module build error remains.
- Runtime pack validation exists.
- The service returns honest unavailable results for unimplemented capabilities.
- Lint, typecheck, unit tests, and build pass.
- Branch is rebased or merged with the latest `main`.
- The pushed preview is green.

## Commit suggestion

```text
fix(category-intelligence): complete core contracts and restore green build
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

