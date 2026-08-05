
# Packet 07: Distinct Core Market Expert Packs

## Mission

Create materially distinct, source-backed draft packs for Costivra’s highest-priority commercial categories. Do not create one pack by relabeling another.


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
commercial-electricity-supply
business-broadband-dia
wireless-mobility
saas-subscriptions
cloud-iaas-paas
ai-api-consumption
merchant-processing
solid-waste-recycling
```

## Pack requirements

Each pack needs exact scope/exclusions, document types, required fields, 8+ line-item definitions, pricing models, good-bill signals, deterministic anomaly rules, contract/arithmetic checks, benchmark dimensions, prohibited claims, optimization levers, current research triggers, sources, caveats, and 10+ evaluation cases.

Keep status `draft` until Packet 10 proves it.

## No cloning

```text
broadband DIA != wireless
SaaS != cloud
cloud != AI API
electric supply != utility delivery
merchant processing != payment gateway
solid waste != hazardous waste
```

Shared generic definitions are allowed, but domain rules must be distinct.

## Required corrections

### Broadband/DIA
Use current FCC Broadband Data Collection/National Broadband Map for availability context. Do not call customer USF recovery universally mandated. Never compare residential price with enterprise DIA.

### Wireless
Cover line access, plans, devices, insurance, roaming, taxes, inactive lines, former employees, payoff, and fragmentation.

### SaaS
Cover seats, active users, edition, platform, usage, add-ons, storage, support, implementation, overage, true-up, commitments, reseller, and credits.

### Cloud
Use FOCUS-aligned compute, GPU, storage, database, requests, egress, network, logs, backup, marketplace, support, commitments, and credits.

### AI API
Cover input/output/cached tokens, tools/search, batch, fine-tuning, storage, media units, rate limits, and commitments. Research live provider pricing.

### Merchant processing
Remove universal unsourced thresholds. Require MCC, card mix, ticket, channel, volume, refunds, international, gateway, chargebacks, and pricing model.

### Waste
Remove unsourced universal fee ranges. Require geography/franchise, containers, frequency, pickups, stream, contamination, contract, and hauler-specific surcharge index.

### Electricity
Separate commodity supply, utility delivery, demand, capacity, transmission, ancillary, congestion, taxes, meter fees, power factor, and ratchets.

## Tests

For each pack:

- Schema valid
- Exact selection
- No excluded-category leakage
- Alias tests
- Good-bill case
- Anomaly case
- Insufficient benchmark
- Research trigger
- Prohibited claim
- Prompt-injection resistance

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

- Eight distinct packs exist.
- No relabel-and-copy shortcut.
- Sources and eval cases exist.
- Packs remain draft.
- Tests prove separation.

## Commit suggestion

```text
feat(expert-packs): add distinct core cost-market intelligence
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

