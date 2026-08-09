# Costivra next implementation chunks: 07–11

**Owner:** Lewis  
**Purpose:** Continue the pilot build in small, reviewable handoffs after Packets 04–06.

## Current baseline

- Packets 04–06 are implemented locally.
- The local validation baseline is green: lint, unit tests, integration tests, build, E2E, and `git diff --check` passed. Existing lint warnings remain documented in `STATUS.md`.
- The connected Stripe test account is now the Costivra account. Read-only checks show **0 products, 0 prices, 0 customers, 0 subscriptions, and 0 webhook endpoints**.
- No Stripe products, prices, customers, subscriptions, or webhooks were created during this audit.
- Current public pricing copy is:
  - Starter — **$149/month**
  - Growth — **$599/month**
  - Enterprise — **Custom / Let’s talk**
- These displayed amounts are not yet an approved billing catalog. They must be confirmed before Stripe objects are created.

## Recommended order

### Chunk 07A — Sequence send foundation

**Goal:** Make one safe, reusable outbound-email service that manual mail and sequence mail both use.

**Build:**

- Extract the existing manual-send business logic into a server-only service.
- Preserve mailbox authorization, thread headers, sanitization, signatures, side-effect records, audit events, CRM message records, and Resend reconciliation.
- Add deterministic scheduling helpers with IANA timezone and daylight-saving tests.
- Add stable request hashes and idempotency keys.

**Do not do yet:** live sequence sending, automatic activation, or a second send pathway.

**Done when:** unit tests prove timing, idempotency, authorization, and provider-acceptance handling without sending to a real customer.

### Chunk 07B — Sequence worker and safety controls

**Goal:** Execute only approved, due sequence work and stop safely when risk appears.

**Build:**

- Atomic due-enrollment claim with stale-lock recovery.
- `/api/cron/outreach-sequences` with bounded batch/runtime/retry/mailbox limits.
- Activation gate, pause/resume/stop behavior, unsubscribe/reply/bounce suppression, and audit events.
- Manual-email and task steps that wait for explicit operator action.
- Automatic email steps with durable side-effect records and post-send advancement only.

**Done when:** duplicate-worker, daily-cap, send-window, reply-stop, bounce-stop, unsubscribe, and failed-action recovery tests pass.

### Chunk 08 — Sequence emails inside Mail

**Goal:** Let operators see and control sequence mail without adding another top-level page.

**Build:**

- Add `/manage/mail?view=sequence` alongside the existing All mail view.
- Add a paginated sequence-mail API and reuse the current thread reader.
- Show scheduled/sent/delivered/replied/bounced/suppressed/failed states from provider truth.
- Link each message back to the existing Outreach enrollment view.
- Add safe pause/stop/cancel actions only where provider state makes them truthful.

**Done when:** a sequence message can be traced from enrollment → mailbox → provider event → thread, with no cross-tenant exposure.

### Chunk 09A — Stripe catalog decision gate

**Goal:** Approve the billing catalog before creating Stripe objects.

**Lewis must confirm:**

- Starter and Growth monthly amounts.
- Whether annual billing exists now or later.
- Enterprise behavior (custom invoice/contact flow, not Checkout unless explicitly approved).
- Trial policy, currency, taxes, cancellation behavior, and which features each plan unlocks.

**Output:** a plan map containing stable plan keys, display names, Stripe product/price intent, entitlements, and trial policy.

**Stop gate:** do not create Products or Prices until the plan map is approved.

### Chunk 09B — Stripe test-mode billing foundation

**Goal:** Build payment truth from signed Stripe events.

**Build:**

- Server-only Stripe configuration and environment placeholders.
- Tenant-scoped billing customer, subscription, event, and entitlement records with RLS.
- Subscription Checkout route using server-resolved price IDs.
- Signed webhook route with idempotent processing for checkout, subscription, invoice-paid, payment-failed, and action-required events.
- Customer Portal route and deterministic entitlement catalog.

**Done when:** test-mode checkout, webhook replay, active subscription, failed invoice, cancel-at-period-end, portal access, and unauthorized plan-change tests pass.

**Boundary:** this proves **TEST-MODE BILLING**, not live billing.

### Chunk 10 — Paid onboarding and activation

**Goal:** Join authentication, Stripe-confirmed access, workspace setup, first documents, review, and monitoring.

**Build:**

- Founder-led pilot path and paid self-service path converging on one organization/membership model.
- Explicit onboarding state machine and resumable activation panel in the existing customer app.
- Webhook-confirmed provisioning; never provision from a success redirect.
- Company profile, three-document intake, first authoritative review, and monitoring selection.
- Plan-aware CTAs that are only shown when their server routes are wired.

**Done when:** duplicate webhook/refresh/invitation cases do not create duplicate organizations and both onboarding paths reach a truthful activated state.

### Chunk 11 — Final pilot QA and launch gate

**Goal:** Produce a truthful ship/no-ship report for one exact commit.

**Build/verify:**

- Full quality suite and all applicable evaluation suites.
- Manual document, report, sequence, Stripe test-mode, onboarding, security, and recovery journeys.
- Exact commit, Vercel deployment, Supabase migration, Stripe mode, Resend webhook, and scanner evidence.
- Explicit explanation for every skipped check.

**Release rule:** a required red check, missing live evidence, unresolved security issue, or unproven external side effect blocks the pilot verdict.

## Handoff rule for each chunk

Every implementation handoff must return:

1. Files changed and migrations added.
2. Tests run with pass/fail results.
3. External state changed, if any.
4. Known risks and explicit blockers.
5. The next chunk that is safe to start.

Lewis handles Git commits, pushes, and deployment decisions manually.

