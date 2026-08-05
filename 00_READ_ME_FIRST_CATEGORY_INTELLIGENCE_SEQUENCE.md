
# Costivra Category Intelligence: Sequential Antigravity Packets

**Repository:** `powerchoosers/costivra`  
**Snapshot when prepared:** `main` at `14df37aece41b7f8bed11baded94f3535e22100d`  
**Existing work branch when prepared:** `agent/category-intelligence-hardening` at `3952dacf3f923cb67b88c64fc8e5009d0241c820`

Use **one packet at a time**. Do not paste all packets into Antigravity at once. Each packet has its own definition of done and should leave the branch green before the next packet begins.

## Why the work is split

The first category-intelligence attempt had the right idea but mixed several unfinished layers:

- Missing or partially committed core files
- Unverified packs labeled verified
- Different markets created by relabeling another market’s pack
- An unknown-category fallback based on SaaS
- A global keyword normalizer that ignored the selected category
- Category selection from an unrelated recent vendor
- Source URLs listed without a live research service
- A fabricated Bill Breakdown benchmark based on hardcoded percentages

These packets separate architecture, safety, taxonomy, research, individual expertise, integration, and release proof.

## Execution order

### Packet 01
`01_BRANCH_BUILD_AND_CORE_CONTRACTS.md`

Make the branch reproducible and green. Confirm every imported category-intelligence core module exists and is committed.

### Packet 02
`02_PACK_REGISTRY_AND_UNKNOWN_CATEGORY_SAFETY.md`

Stop cross-market cloning, change unverified packs to draft, and make unknown categories honest.

### Packet 03
`03_REMOVE_FAKE_BENCHMARKS_AND_ADD_SAFE_CONTRACT.md`

Delete the hardcoded 8%, 12%, 18%, and 24% benchmark logic and replace it with an honest benchmark result contract.

### Packet 04
`04_PACK_DRIVEN_LINE_ITEM_NORMALIZATION.md`

Replace the global substring chain with category-pack-driven line-item classification and safe unknown results.

### Packet 05
`05_SUPABASE_TAXONOMY_AND_INSURANCE_CATEGORIES.md`

Seed the canonical hierarchy, normalize legacy category labels, add insurance and benefits, and support record-specific service categories.

### Packet 06
`06_CURRENT_MARKET_RESEARCH_AND_SOURCE_REGISTRY.md`

Implement source-backed, privacy-safe live market research with freshness, caching, and citations.

### Packet 07
`07_DISTINCT_CORE_MARKET_EXPERT_PACKS.md`

Build distinct packs for electricity, broadband, wireless, SaaS, cloud/AI, merchant processing, and solid waste. No cloning.

### Packet 08
`08_DISTINCT_INSURANCE_AND_BENEFITS_PACKS.md`

Build separate property/liability, workers’ compensation, and group health/benefits packs with regulated-market guardrails.

### Packet 09
`09_SYSTEM_WIDE_CATEGORY_INTELLIGENCE_INTEGRATION.md`

Connect the shared service to extraction, invoice persistence, Bill Breakdown, Ask Costivra, monitoring, opportunities, Manage, and reports.

### Packet 10
`10_EVALUATIONS_RELEASE_AND_MERGE_TO_MAIN.md`

Add evaluation suites, prove safety and correctness, then merge and deploy to `main`.

## Gate between packets

Do not begin the next packet unless:

```text
lint: pass
typecheck: pass
unit tests: pass
build: pass
branch pushed: yes
packet verdict: PACKET COMPLETE
```

Credential-gated or live tests may be deferred only when the packet does not require them. Every deferral must be listed.

## Branch strategy

Preferred:

```bash
git checkout agent/category-intelligence-hardening
git fetch origin
git rebase origin/main
```

Use a merge instead when rebase would rewrite shared work or create unsafe conflict resolution. Do not force-push a shared branch without explicit approval.

Keep category work isolated until Packet 10. The final packet owns the merge into `main`.

## Current safety reminder

The existing Bill Breakdown route must not continue presenting a synthetic “Costivra Regional Benchmark.” Packet 03 is a release blocker and should be completed before building additional pricing expertise.
