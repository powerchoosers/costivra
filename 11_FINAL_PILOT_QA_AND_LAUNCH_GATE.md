# Packet 11: Final Pilot QA and Launch Gate

## Mission

Prove one exact Costivra commit is ready for a small, supervised paid pilot. This packet adds no broad features. It validates the full customer and operator story, records evidence, and produces a truthful ship/no-ship report.

## Required reading

Read every completion report from Packets 01 through 10.

Re-read:

```text
AGENTS.md
STATUS.md
DECISIONS.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
package.json
vercel.json
.github/workflows/quality.yml
```

Inspect current GitHub, Supabase, Vercel, Resend, Cloudmersive, and Stripe state.

## Exact-commit rule

Record:

- Git commit
- Vercel deployment ID
- deployment commit
- Supabase migration versions
- Stripe mode
- Resend webhook
- scanner provider state

Do not combine evidence from different commits and call it one release.

## Full quality gate

From a clean install:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run eval:categories
npm run eval:line-items
npm run eval:benchmarks
npm run eval:market-research
npm run test:integration
npm run test:integration:live
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:readiness
npm run ops:smoke
npm run ops:verify
npm run release:verify
```

Run the approved private pilot evaluation separately:

```bash
npm run eval:pilot -- --manifest <approved-private-manifest>
```

Explain every skip. A required skip blocks the final verdict.

## Production service proof

### Website and auth

- public pages load
- login
- password setup
- password reset
- owner invitation
- customer workspace
- internal Manage authorization
- unauthorized Manage denial

### Manual document journey

- upload clean bill
- scan receipt
- extraction
- review
- correction
- reconciliation
- vendor association
- evidence
- finding
- trust review
- customer visibility
- action approval
- savings verification

### Forwarded document journey

- authoritative intake address
- signed webhook
- trusted sender
- clean attachment
- durable queue
- scan attempt
- extraction
- vendor association
- monitoring activation
- expected next bill

### Scanner negative journey

- official inert test fixture
- blocked or quarantined
- no extraction
- no preview
- no download
- customer feedback
- Manage recovery record

### Lifecycle/report journey

- welcome
- upload status
- review needed
- finding ready
- approval request
- monitoring instructions/result
- missed bill dedupe
- verified savings
- scheduled report
- Resend delivery reconciliation

### Sequence journey

Use disposable internal CRM contacts and permitted test recipients.

- draft sequence
- manual first email
- automatic follow-up
- call/general task
- daily cap
- send window
- Mail Sequence emails tab
- reply stops future sends
- hard bounce stops
- unsubscribe stops and suppresses
- duplicate worker does not double-send
- pause/resume
- failed action recovery
- no cross-tenant access

### Stripe journey

In test mode first:

- checkout
- webhook
- subscription active
- entitlements
- Customer Portal
- failed invoice
- recovery
- cancel at period end
- duplicate webhook
- unauthorized plan change rejection

If live billing is not deliberately enabled, label the result `TEST-MODE BILLING PROVEN`, not `LIVE BILLING PROVEN`.

### Onboarding journey

- founder-led pilot
- paid self-service test
- duplicate prevention
- resume
- three documents
- review
- monitoring selection
- activation
- billing issue state

## Data and security review

Verify:

- RLS on exposed tables
- no broad browser grants
- server-only operational functions
- cross-tenant isolation
- private storage
- signed download paths
- no secrets in source
- no private invoice text in logs
- no fake evaluation data presented as real
- global outreach suppression
- unsubscribe
- side-effect idempotency
- audit events
- restore procedure
- deletion procedure
- retention decision
- backup decision

Run Supabase advisors and classify every warning.

## Browser matrix

Check at minimum:

```text
1440 x 900
1280 x 800
1024 x 768
390 x 844
360 x 800
```

Routes:

- homepage
- pricing
- scan
- login
- customer overview
- documents
- bill breakdown
- vendor detail
- reports
- settings/billing
- Manage overview
- Manage outreach tasks
- Manage sequences
- Manage enrollments
- Manage mail all
- Manage mail sequence emails
- Manage intake
- Manage invoice review

Check:

- no horizontal overflow
- keyboard access
- focus
- reduced motion
- modal containment
- scroll ownership
- empty/loading/error states
- no console errors

## Operational runbook

Create or update:

```text
docs/PILOT_OPERATIONS_RUNBOOK.md
docs/PILOT_INCIDENT_RESPONSE.md
docs/PILOT_SUPPORT_RUNBOOK.md
docs/PILOT_BILLING_RUNBOOK.md
```

Include:

- incident owner
- customer support channel
- failed intake
- failed extraction
- incorrect finding
- provider outage
- sequence pause
- bounce/complaint spike
- Stripe webhook failure
- payment failure
- report delivery failure
- restore
- deletion
- escalation

## Human approval checklist

The final verdict remains blocked until Lewis records decisions for:

- first pilot customers
- price and plan
- pilot agreement
- Terms and Privacy approval
- UCEP relationship disclosure
- performance-fee method
- retention windows
- incident owner
- support channel
- live Stripe mode
- repository privacy
- credential rotation
- evaluation corpus approval

Do not fabricate these approvals.

## Release report

Create:

```text
PILOT_RELEASE_REPORT.md
```

Required sections:

1. Exact commit and deployment
2. Migrations
3. Test results
4. Real evaluation results
5. Scanner proof
6. Intake proof
7. Lifecycle/report proof
8. Sequence proof
9. Stripe proof
10. Onboarding proof
11. Tenant isolation
12. Browser QA
13. Legal/operational approvals
14. Known limitations
15. Pilot operating boundaries
16. Final verdict

Allowed verdicts:

```text
READY_FOR_SUPERVISED_PAID_PILOT
READY_FOR_FREE_DESIGN_PARTNER_PILOT
INTERNAL_TESTING_ONLY
BLOCKED
```

## Pilot boundaries

Even when ready:

- 3 to 5 pilot organizations
- manual qualification
- human review of material findings
- no autonomous vendor action
- no savings guarantee
- direct support
- sequence daily caps
- monitored bounce/complaint rates
- rapid pause control
- every false positive recorded

## Acceptance criteria

- One exact commit passes the required gate.
- Private evaluation thresholds pass.
- Clean and inert scanner paths pass.
- Manual and forwarded document journeys pass.
- Lifecycle and reports deliver and reconcile.
- Sequence reply, bounce, and unsubscribe stops work.
- Stripe test-mode subscription flow passes.
- Onboarding passes.
- Tenant isolation passes.
- Browser matrix passes.
- Human blockers are explicitly recorded.
- `PILOT_RELEASE_REPORT.md` contains one honest verdict.
- No branch, commit, push, merge, or deployment was performed unless Lewis separately instructed it.
