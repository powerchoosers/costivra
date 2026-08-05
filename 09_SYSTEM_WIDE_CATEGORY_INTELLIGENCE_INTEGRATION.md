
# Packet 09: System-Wide Category Intelligence Integration

## Mission

Make every Costivra AI surface use the same category resolution, pack version, line-item ontology, benchmark contract, current research, and evidence rules.


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


## Integration principle

No surface may carry its own hidden market percentages or category prompt. All surfaces call `CategoryIntelligenceService`.

## Required integrations

### Document extraction
Extract candidate category/subcategory, vendor, public domain hints, subtype, units, lines, and evidence. Do not benchmark.

### Invoice persistence
Resolve exact category, persist category/confidence, normalize once, persist pack version/evidence, route uncertainty to review, and remain idempotent.

### Bill Breakdown
Use the shared analyze/benchmark/research methods. Display category/pack status, line explanations, deterministic reconciliation, findings, missing dimensions, sourced market facts, benchmark status, and review requirements.

### Ask Costivra
Select category from attachments/current context/explicit prompt/relevant records. Support multiple packs. Inject only relevant rules and current facts. Persist category keys, pack versions, research run IDs, and source IDs.

### Manage assistant
Use the same service, with access to operational review metadata that customer chat cannot see.

### Monitoring
Use category-specific cadence, fields, inventory, units, rules, and freshness.

### Opportunities
Create only from deterministic overcharge, contract variance, inactive service, usage optimization, or credible quote-required opportunity. Separate verified, estimated, quote-required, and insufficient.

### Savings
Never verify savings from a pack or directional benchmark.

### Reports
Show coverage, versions, findings, unknown spend, stale sources, and estimated versus verified value.

### Manage page
Add `/manage/category-intelligence` with taxonomy, pack/source/eval status, unknowns, unmapped lines, corrections, refresh queue, and unsupported benchmark attempts.

## Traceability

Every material result must record:

```text
customer record IDs
evidence IDs
category key
pack version
rule IDs
calculation version
market source IDs
research as-of
```

## End-to-end test

1. Upload invoice.
2. Resolve vendor/category.
3. Normalize lines.
4. Run bill quality.
5. Return no benchmark when dimensions are missing.
6. Ask explains same lines.
7. Manage shows review.
8. Monitoring uses correct rules.
9. Opportunity remains estimated/quote-required.
10. Report shows correct category.

Assert the same category, pack version, canonical codes, sources, and benchmark status across surfaces.

## Validation

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:integration:live
npm run test:e2e
npm run test:e2e:authenticated
npm run build
```

## Definition of done

- One shared service powers all surfaces.
- No local hardcoded benchmarks remain.
- Pack/version/source trace exists.
- Current context wins.
- Permissions differ correctly.
- E2E covers ingestion through chat.

## Commit suggestion

```text
feat(category-intelligence): connect shared expertise across Costivra
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

