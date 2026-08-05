
# Packet 02: Expert-Pack Registry and Unknown-Category Safety

## Mission

Make pack selection honest. Eliminate market cloning and prevent unverified expertise from appearing verified.


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


## Problem to eliminate

The earlier registry created categories by copying another pack and changing only its label, including:

```text
cloud -> SaaS
AI API -> SaaS
wireless -> broadband
voice/UCaaS -> broadband
WAN -> broadband
workers compensation -> property/liability
group health -> property/liability
hazardous waste -> solid waste
shredding -> solid waste
```

Several source packs explicitly excluded the category they were later cloned into.

Unknown categories also inherited a SaaS-shaped pack.

This must stop.

## Required registry model

Create explicit registry entries:

```ts
type ExpertPackRegistration = {
  categoryKey: string;
  pack: CategoryExpertPackV1;
  exact: true;
};
```

Only exact, materially valid packs belong in `EXPERT_PACKS_REGISTRY`.

Do not use object spread to turn one market pack into another market.

## Pack statuses

A pack may be `verified` only when all of these exist:

- Primary-source registry entries
- Source verification dates
- Category-specific evaluation cases
- Passing evaluation results
- Human review when the market is regulated or high risk
- No unsupported benchmark claims

Until then:

```ts
status: "draft"
```

Change all current packs without this proof to `draft`.

## Unknown pack

Create one neutral unknown pack that contains:

- No category-specific line-item definitions
- No pricing models
- No benchmark metrics
- No anomaly rules that assume a market
- A required human-review caveat
- Prohibited claims preventing category-specific market conclusions

## Resolver behavior

`getExpertPack(categoryKey)` should return:

```ts
{
  pack: exactPackOrUnknown,
  exactMatch: boolean,
  status: exactPackOrUnknown.status
}
```

Do not infer a full pack from substring matching.

Parent-level fallback may return only a tiny **orientation context**, not category-specific anomaly rules, benchmarks, or line-item definitions.

## Category resolution priority

Implement:

1. Active attached invoice/document category
2. Current record-page context category
3. Explicit category or vendor named in prompt
4. Strongly matched relevant record
5. Verified organization-vendor service category
6. Verified vendor catalog primary category
7. Unknown

Do not use the first top-spend vendor as the default category for unrelated questions.

Support multiple resolved categories when a prompt compares markets.

## Assistant behavior

When pack status is `draft`:

- State that the pack is draft in internal trace metadata.
- Never call it verified in customer output.
- Inject required caveats.
- Do not generate market benchmarks unless a separate live comparable result exists.

When pack is unknown:

- Give general record-based analysis only.
- State missing category.
- Suggest human classification.
- Do not attach SaaS, energy, or another market’s rules.

## Tests

Add tests proving:

- Wireless does not receive broadband/DIA line-item rules.
- Workers compensation does not receive property deductible rules.
- Group health does not receive commercial property rules.
- Hazardous waste does not receive normal dumpster rules.
- Unknown category has zero category-specific line items.
- Draft pack is never exposed as verified.
- Current invoice context outranks recent vendor category.
- Attached document category outranks organization top spend.
- Multi-category prompts can return more than one category context.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Definition of done

- No cross-market pack cloning remains.
- No unknown-to-SaaS fallback remains.
- Every unproven pack is draft.
- Unknown category is honest and non-benchmarking.
- Active record/attachment drives pack selection.
- Tests prove the safety boundaries.

## Commit suggestion

```text
fix(category-intelligence): remove cloned packs and harden unknown categories
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

