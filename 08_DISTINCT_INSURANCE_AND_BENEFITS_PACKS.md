
# Packet 08: Distinct Insurance and Employee-Benefit Expert Packs

## Mission

Add first-class insurance expertise without treating all insurance markets as one category or presenting Costivra as a licensed broker, actuary, attorney, tax adviser, or claims professional.


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


## Required packs

```text
commercial-property
general-liability-bop
workers-compensation
group-health
stop-loss-pbm-benefits-admin
```

Optional next:

```text
commercial-auto
cyber-insurance
umbrella-excess
dental-vision-life-disability
```

## Shared safety

- Analysis is cost/document intelligence.
- Coverage and binding decisions require licensed professionals.
- Premium alone is not comparable pricing.
- Claims and health information never enter public search.
- Public filings are context, not a quote.
- Costivra cannot cancel, bind, or alter coverage/benefits.

## Pack distinctions

### Commercial property
Use state, locations, values, construction, occupancy, protection, catastrophe exposure, limits, deductibles, business interruption, loss history, carrier status, and term.

### General liability/BOP
Use operations, revenue/payroll/area, locations, limits, SIR, products/completed operations, claims, endorsements, and state.

### Workers compensation
Use state, class codes, payroll, manual/loss-cost rate, carrier multiplier, experience mod, schedule credits/debits, premium discount, expense constant, assessments, audit, and minimum premium.

### Group health
Use state, group size, age/composite rating, plan design, network, funding, claims where lawful, participation, contribution, tiers, renewal, and admin fees.

### Stop-loss/PBM/benefits administration
Use specific and aggregate terms, lasers, contract basis, premium, claims funding, PBM spread/pass-through, rebates, admin/network fees, eligibility, COBRA, and compensation.

## Sources

Register CMS, SERFF, NCCI, state DOI sources, public carrier filings, IRS/EBSA where relevant, and customer policy/renewal documents.

## Privacy

Public search may use state, line, public filing ID, and general market segment.

Never send named insured, policy number, claims, employee identity, diagnosis, medication, PHI, or private loss history.

## Tests

- Property does not use health tiers.
- Workers comp does not use property values.
- Group health does not use property rules.
- Unknown insurance remains review-required.
- Public search payload has no PII/PHI.
- Premium-only comparison is insufficient.
- Pack status remains draft.
- Professional-review caveat appears.
- No automatic binding/cancellation action.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run eval:categories
npm run eval:line-items
npm run build
```

## Definition of done

- Five distinct packs exist.
- Sensitive-data boundaries work.
- No premium-only benchmarking.
- Sources/jurisdiction rules exist.
- Packs are draft.
- Tests prove separation.

## Commit suggestion

```text
feat(insurance-intelligence): add distinct regulated-market expert packs
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

