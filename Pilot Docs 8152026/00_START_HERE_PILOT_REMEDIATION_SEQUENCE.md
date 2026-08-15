# Costivra Pilot Remediation Packets: Start Here

**Snapshot date:** August 15, 2026  
**Repository:** `powerchoosers/costivra`  
**Current audit baseline:** approximately 65% ready for a controlled, founder-led pilot  
**Target:** a supervised pilot with 3 to 5 real organizations, human review of material findings, and no autonomous vendor action

## Purpose

This folder breaks Costivra's remaining pilot work into independent packets that can be given to Codex one at a time. The packets are intentionally narrower than the older implementation documents already in the repository. They focus only on the evidence and reliability gaps that remain after the latest production audit.

The product surface is mostly built. The remaining work is less about adding shiny rooms to the house and more about proving the wiring, locks, smoke alarms, and exits all work under real conditions.

## How to use these packets

For each packet:

1. Start a fresh Codex task in the Costivra repository.
2. Tell Codex to read the packet completely before editing.
3. Allow it to inspect the current repository, connected services, logs, migrations, and official provider documentation.
4. Require it to re-check every dated statement in the packet. The repository and production systems are the source of truth.
5. Complete and validate one packet before beginning a dependent packet.
6. Save the completion report in the repository only when that is useful and contains no secrets or customer data.
7. Review changes before committing or deploying.

Suggested opening instruction:

```text
Read <PACKET_FILENAME> completely. Inspect the current Costivra repository and connected production systems before changing anything. Complete the packet, run every available validation step, and return the required completion report. Do not fabricate evidence, weaken a safety gate, expose secrets, use real customer data without approval, or commit/push/deploy unless I explicitly instruct you to.
```

## Pilot tracks

### Track A: Free or manually invoiced design-partner pilot

Packets **01 through 07**, **09**, and **10** are required.

Packet 08 is not required when:

- the first customers are invited manually;
- payment is handled outside the application or the pilot is free;
- self-serve signup is not advertised;
- Stripe does not control access during the pilot.

### Track B: Paid pilot through Stripe or paid self-serve launch

All packets are required, including Packet 08.

Live Stripe mode must not be enabled merely because the test path works. Live billing also requires an explicit commercial, tax, refund, and legal decision.

## Recommended execution order

### Wave 1: Remove the two largest technical blockers

Run these in parallel only if separate agents will not edit the same files:

1. `01_ENABLE_AND_PROVE_MALWARE_SCANNING.md`
2. `02_RESTORE_GREEN_CI_AND_PROTECT_MAIN.md`

Expected outcome: document processing is no longer intentionally paused, and one exact commit has a truthful release gate.

### Wave 2: Prove the data foundation

3. `03_VERIFY_SUPABASE_SECURITY_AND_RECOVERY.md`
4. `04_BUILD_REAL_INVOICE_GOLDEN_SET_AND_RUN_EVAL.md`

Packet 04 requires human-supplied, approved, de-identified or consented documents. Code cannot manufacture that evidence.

### Wave 3: Finish customer communication and production operations

5. `06_COMPLETE_LIFECYCLE_EMAILS_AND_AUTOMATED_REPORTS.md`
6. `07_HARDEN_PRODUCTION_WORKERS_OBSERVABILITY_AND_SUPPORT.md`

These can overlap if schema and cron changes are coordinated.

### Wave 4: Rehearse the complete service

7. `05_PROVE_END_TO_END_CUSTOMER_PILOT_JOURNEY.md`

This packet depends on the scanner, database, evaluation, email, and worker paths being ready enough to exercise honestly.

### Wave 5: Choose the commercial track

8. `08_OPTIONAL_PAID_PILOT_STRIPE_AND_ACTIVATION_PROOF.md`
9. `09_HUMAN_LEGAL_AND_PILOT_OPERATIONS_DECISIONS.md`

Packet 09 should begin early, even though it is listed here. Legal review, customer selection, and operating decisions can take longer than code changes.

### Wave 6: Produce one release verdict

10. `10_FINAL_EXACT_COMMIT_LAUNCH_GATE.md`

Packet 10 is last. It should not fix broad features. It validates one exact release candidate and produces a ship or no-ship report.

## Packet map

| Packet | Required for free pilot | Required for Stripe pilot | Primary outcome |
|---|---:|---:|---|
| 01 Malware scanning | Yes | Yes | Clean and inert-test files prove the fail-closed scan chain |
| 02 CI and main protection | Yes | Yes | One exact commit passes every required release gate |
| 03 Supabase security and recovery | Yes | Yes | Tenant isolation, migration parity, restore, and deletion are proven |
| 04 Real invoice evaluation | Yes | Yes | Enabled categories pass an approved real-data golden set |
| 05 Customer pilot journey | Yes | Yes | A disposable customer completes the whole service journey |
| 06 Lifecycle emails and reports | Yes | Yes | Customer events and scheduled reports send once and reconcile |
| 07 Reliability and support | Yes | Yes | Workers, alerts, recovery paths, and runbooks are operational |
| 08 Stripe and activation | No | Yes | Test-mode billing, portal, activation, and recovery are proven |
| 09 Human decisions | Yes | Yes | Legal, retention, support, pricing, and pilot boundaries are approved |
| 10 Final launch gate | Yes | Yes | One exact commit receives an honest release verdict |

## Shared rules for every packet

### Evidence rules

- Re-check current state before editing.
- Never present synthetic fixtures as real-customer accuracy evidence.
- Never call an estimate, potential value, or avoided charge "verified savings" without the required proof.
- Never treat a successful Vercel deployment as proof that the release is ready.
- Never treat Resend provider acceptance as proof of delivery.
- Never treat a Stripe success redirect as proof of payment or entitlement.
- Never treat the presence of RLS as proof that tenant isolation works.
- Never treat historical extraction success as proof that a file passed malware scanning.
- Explain every skipped validation. A skipped required gate blocks the packet.
- Use exact commit IDs, deployment IDs, migration versions, and provider modes in evidence.

### Security rules

- Do not print, log, commit, or paste secrets.
- Do not expose Supabase service-role or secret keys to browser code.
- Do not place customer invoices, extracted private text, or private evaluation manifests in Git.
- Keep source files private and signed-download authorization tenant-scoped.
- Preserve fail-closed behavior for malware scanning, billing truth, approvals, and external side effects.
- Do not add broad RLS policies merely to silence an advisor.
- Do not use real malware. Use the official inert antivirus test fixture.
- Do not run destructive database or storage drills against real customer data.

### Change-control rules

Unless Lewis explicitly authorizes it, the coding agent must not:

- create or switch branches;
- commit;
- push;
- merge;
- change repository visibility;
- enable live Stripe billing;
- create live Stripe products or prices;
- deploy;
- rotate credentials;
- delete production data;
- onboard a real customer;
- send unsolicited production email.

The agent may prepare exact instructions for human-controlled actions and clearly mark them as pending.

## Shared completion report

Every packet must end with this report:

```markdown
# Packet XX Completion Report

## Verdict
PASS | PARTIAL | BLOCKED

## Exact state
- Git commit:
- Working tree:
- Vercel deployment:
- Supabase project:
- Supabase migration head:
- Resend environment:
- Stripe mode, if relevant:
- Scanner provider, if relevant:

## Work completed
- ...

## Files changed
- ...

## Database changes
- Migration files:
- Applied environments:
- Rollback or reversal notes:

## Tests and checks
| Command or proof | Result | Evidence |
|---|---|---|
| ... | PASS / FAIL / SKIPPED | ... |

## Live proof
- ...

## Security and privacy review
- ...

## Remaining blockers
- ...

## Human actions still required
- ...

## Readiness impact
- Previous readiness:
- New evidence-backed readiness:
- Reason for change:

## No-fabrication statement
State whether any required evidence was unavailable, and confirm that no unavailable evidence was represented as passing.
```

## Stop conditions

Stop the packet and report `BLOCKED` rather than improvising when:

- a required secret is unavailable;
- a provider account or environment cannot be identified safely;
- the approved real-data corpus is missing;
- a schema change would require guessing the production model;
- a destructive drill lacks an isolated target;
- legal or commercial approval is required;
- a live charge, customer email, or production deletion would occur without explicit permission;
- a test fails and the only apparent fix is weakening a safety invariant.

## Readiness checkpoints

These are planning ranges, not guaranteed arithmetic:

- Current controlled-pilot baseline: about **65%**
- After scanner proof and green CI: about **77% to 80%**
- After database, real-data evaluation, lifecycle, and operations proof: about **84% to 88%**
- After the full customer rehearsal and human approvals: enough evidence to consider a 3-to-5-customer supervised pilot
- Paid self-serve readiness remains separate until Packet 08 and live-mode approvals are complete

## Final pilot boundary

Even after a passing final gate:

- begin with 3 to 5 invited organizations;
- require human review before material findings become customer-visible;
- do not guarantee savings;
- do not autonomously cancel vendors, change payment methods, accept contracts, select suppliers, or send vendor instructions;
- maintain a direct support route;
- record false positives, incorrect extractions, missed bills, and customer confusion;
- preserve a rapid pause control for intake, reports, and outbound communication.
