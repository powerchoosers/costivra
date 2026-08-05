
# Packet 10: Evaluations, Release Proof, and Merge to Main

## Mission

Prove the category-intelligence system is safe and useful, then merge the completed branch into `main` and verify production.

This packet owns the merge.


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


## Pre-merge audit

Confirm Packets 01–09 are complete.

Search for prohibited remnants:

```bash
git grep -n -E "benchmarkRatio|Regional .* Intelligence Benchmark|estimatedMarketRate.*total|void categoryKey" -- src
git grep -n -E "status: ["']verified["']" -- src/lib/category-intelligence/packs
git grep -n -E "\.\.\.(saasPack|telecomBroadbandPack|solidWastePack|insurancePropertyLiabilityPack)" -- src/lib/category-intelligence/packs
```

Review every result.

## Evaluation scripts

Add or complete:

```text
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
```

## Minimum evaluations per launch pack

- 20 representative cases
- 10 malformed/adversarial cases
- 10 alias variations
- 5 good-bill cases
- 5 anomaly cases
- 5 insufficient-benchmark cases
- Current-source refresh
- Stale-source behavior
- Prompt injection
- Cross-category confusion

## Thresholds

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

## Pack verification

Promote draft to verified only with sources, fresh data, passing thresholds, no prohibited claims, and documented human review where required.

## Full validation

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:integration:live
npm run eval:invoices
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:readiness
npm run ops:smoke
npm run ops:verify
```

Explain every skip.

## Supabase proof

- Migrations recorded
- Taxonomy counts correct
- Insurance leaves present
- RLS/performance advisors reviewed
- No public execution of server-only functions
- No duplicate aliases
- No fixture residue
- Unknown queue visible

## Browser proof

Test upload, Bill Breakdown, line-item chat, current market question with sources, insufficient benchmark behavior, Manage review queue, mobile, and console errors.

## Merge process

1. Fetch latest `main`.
2. Rebase or merge safely.
3. Resolve conflicts with tests/schema.
4. Run full validation again.
5. Open/update PR to `main`.
6. Review full diff.
7. Merge only when blockers clear.
8. Confirm `main` points to merge.
9. Confirm Vercel production green.
10. Run production-safe smoke.

Do not force-push `main`.

## Final verdict

Use one:

```text
CATEGORY INTELLIGENCE VERIFIED FOR THE LISTED PACKS
CATEGORY INTELLIGENCE READY FOR SUPERVISED PILOT
CATEGORY INTELLIGENCE INCOMPLETE
```

List exact verified, draft, and unsupported packs.

## Final report

Include main commits, PR/merge, Vercel deployment, migrations, pack statuses, eval metrics, live source proof, privacy proof, benchmark safety, and remaining licensed/manual needs.

## Commit/PR suggestion

```text
feat(category-intelligence): ship source-backed market expertise foundation
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

