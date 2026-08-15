# Packet 08: Optional Paid Pilot, Stripe, and Activation Proof

**Snapshot date:** August 15, 2026  
**Priority:** Conditional  
**Required for:** Stripe-paid pilot or paid self-serve launch  
**Not required for:** Free or manually invoiced founder-led pilot

## Mission

Complete the remaining test-mode billing and activation proof before Costivra uses Stripe to onboard or entitle real pilot customers. Verify the intended Stripe account, Customer Portal, invitation or activation link, delayed-webhook recovery, payment failure, cancellation, and duplicate-event safety.

Do not enable live mode, create live products, or charge a real card in this packet unless Lewis gives a separate explicit instruction after the legal and commercial decisions are complete.

## Skip rule

This packet may be marked:

```text
NOT_REQUIRED_FOR_FREE_DESIGN_PARTNER_PILOT
```

when all first pilot customers are manually invited and payment is handled outside Costivra or waived.

Do not let optional self-serve billing delay a safe free pilot.

## Current evidence to re-check

Older packet status reported:

- Checkout, signed webhooks, subscription projection, entitlements, and direct paid provisioning were substantially implemented;
- a fresh test-mode Starter checkout and signed events had succeeded;
- Customer Portal browser proof remained open;
- activation-link browser proof remained open;
- delayed webhook, failed payment, recovery, cancellation, and support cases needed fuller proof;
- the app-configured test account and a separately connected Stripe dashboard account may have been different.

Treat the account identity as a historical warning, not a current fact. Re-check it before any account-specific action.

## Required reading and inspection

```text
09_STRIPE_SUBSCRIPTIONS_AND_ENTITLEMENTS.md
10_PAID_ONBOARDING_AND_ACTIVATION.md
src/lib/billing/
src/app/api/billing/
src/app/api/webhooks/stripe/route.ts
src/app/signup/
src/app/auth/
src/app/set-password/
src/app/app/
src/app/api/portal/onboarding/route.ts
src/lib/portal/onboarding.ts
src/lib/portal/activation.ts
src/components/portal-pages.tsx
src/components/manage-portal.tsx
supabase/migrations/
.env.example
docs/PILOT_BILLING_RUNBOOK.md
```

Inspect current Stripe test-mode:

- account ID and display name used by server credentials;
- products and prices referenced by `billing_plan_catalog`;
- active webhook endpoint and subscribed events;
- Customer Portal configuration;
- recent test events;
- current test subscriptions;
- no live-mode side effects.

Inspect Supabase billing and onboarding tables.

## Billing truth invariant

- The browser may request Checkout.
- Stripe's signed event, or a server-side reconciliation that retrieves and validates the completed Checkout Session, establishes payment truth.
- A success URL never grants access by itself.
- Duplicate events are safe.
- Wrong-mode events are rejected.
- Existing customer data is not deleted when billing lapses.
- Entitlements are server-owned.
- No card or payment-method details are stored in Costivra.

## Workstream A: Align the intended Stripe account

Record safely:

- configured mode;
- server key's account ID and display name;
- connected dashboard account ID and display name;
- catalog product and Price IDs;
- webhook endpoint account;
- Customer Portal account.

All must intentionally refer to the same test account for proof.

If they differ:

- do not copy secret keys into source or chat;
- choose the intended account;
- update Vercel and local credentials through secure settings;
- update test-mode catalog references through the authorized server path;
- verify webhook signing secret for that account;
- redeploy only when authorized;
- repeat all test-mode proof.

Do not describe a dashboard account as connected merely because the connector can see it.

## Workstream B: Test Checkout and provisioning

Using Stripe test mode and a disposable email:

1. select Starter or Growth;
2. submit the pre-auth signup details;
3. open Checkout;
4. use Stripe's official test payment method;
5. receive signed webhook events;
6. create or reuse exactly one user;
7. create or reuse exactly one organization;
8. create one owner membership;
9. write one billing customer;
10. project one subscription and entitlement set;
11. mark onboarding source correctly;
12. show a truthful waiting state before webhook confirmation;
13. prevent duplicate provisioning on refresh or webhook retry.

Capture test IDs only. Do not use live payment details.

## Workstream C: Activation email and browser proof

For a newly provisioned user:

- activation or invite email is accepted and delivered;
- link opens `/auth/invite` or the current intended route;
- token exchange occurs server-side where designed;
- user reaches `/set-password` with a usable session;
- password can be set;
- user lands in the correct `/app` workspace;
- the selected plan and confirmed subscription are visible;
- reused or expired links provide a safe recovery path;
- repeated activation does not create another user or tenant.

Prove in a clean browser and mobile viewport.

## Workstream D: Customer Portal

Prove:

- only an authorized owner or admin can open a Portal session;
- the session belongs to the correct Stripe customer;
- return URL lands at the current Billing tab;
- customer can view the intended subscription;
- permitted changes match the approved portal policy;
- customer cannot switch to an inactive or wrong-mode plan;
- a user from another tenant cannot open the session;
- portal session creation is audited safely.

Document the configured Portal policy. Do not enable plan changes or cancellation behavior without a product decision.

## Workstream E: Webhook lifecycle and recovery

Using signed test events, prove:

- `checkout.session.completed`;
- duplicate checkout event;
- `customer.subscription.created`;
- subscription update;
- `invoice.paid`;
- `invoice.payment_failed`;
- `invoice.payment_action_required`;
- payment recovery;
- cancellation at period end;
- immediate cancellation if the approved policy permits it;
- duplicate events;
- out-of-order events;
- wrong-mode event rejection;
- unknown customer or subscription safe handling.

Reconciliation must be deterministic. A stale event must not overwrite newer authoritative state.

## Workstream F: Delayed webhook and browser recovery

Simulate:

- Checkout completes;
- redirect returns before webhook projection;
- UI shows waiting, not active;
- server-side reconciliation retrieves the session;
- metadata and intended plan are validated;
- idempotent provisioning occurs only when allowed;
- later webhook reconciles without duplication;
- timeout produces a support action rather than infinite polling.

## Workstream G: Manual-review and support cases

Prove operator handling for:

- email linked to multiple existing workspaces;
- paid but no usable activation link;
- expired invitation;
- user created but membership missing;
- organization created but subscription projection delayed;
- failed payment during onboarding;
- catalog or account mismatch;
- webhook signature failure;
- customer asks to cancel.

Manage must not let an operator bypass payment truth silently. Every override or correction requires authorization and audit.

## Workstream H: Entitlements

Verify current enforced limits at minimum for:

- monitored vendors;
- locations;
- team seats;
- scheduled reports.

For document limits, sequence limits, premium categories, and support level:

- enforce only after explicit product policy exists;
- otherwise document them as unimplemented rather than guessing limits.

When payment is delinquent:

- preserve existing data;
- prefer read-only or reduced access according to policy;
- show a clear billing state;
- do not delete data automatically.

## Workstream I: Live-mode decision boundary

Do not perform live-mode work in the same proof run.

Before live mode, Packet 09 must record:

- approved prices and plan terms;
- refund and cancellation policy;
- tax treatment and product code;
- business address and registrations;
- legal approval;
- support owner;
- webhook and credential rotation plan;
- live catalog;
- explicit go-live authorization.

The final report may say `TEST_MODE_BILLING_PROVEN`. It must not say `LIVE_BILLING_PROVEN` without separate evidence.

## Required commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

Use Stripe CLI or current official test tooling where appropriate. Never put a webhook secret into committed files.

## Required evidence

- intended test account identity;
- catalog alignment;
- webhook endpoint and event list;
- Checkout Session ID;
- test customer, subscription, and event IDs;
- Supabase billing projection IDs;
- activation email provider message ID and delivered state;
- browser trace for password setup;
- Customer Portal session proof;
- delayed-webhook result;
- payment-failure and recovery result;
- cancellation result;
- duplicate and out-of-order event tests;
- entitlement boundary tests;
- confirmation that no live object or charge was created.

## Acceptance criteria

- All application billing components use the intended test account.
- Checkout and signed webhooks produce one customer, organization, membership, subscription, and entitlement set.
- Activation email opens a usable password-setup flow.
- Customer Portal works for the correct authorized tenant.
- Delayed webhook and browser retry are safe.
- Payment failure, recovery, and cancellation project correctly.
- Duplicate, stale, wrong-mode, and out-of-order events are safe.
- Entitlement boundaries are server-enforced where policy exists.
- Existing data is preserved during billing issues.
- Support cases have an operator path.
- The verdict is labeled test mode unless live mode is separately authorized and proven.
- No live card, product, price, subscription, or charge was created.

## Explicitly out of scope

- enabling live Stripe mode;
- creating live products or Prices;
- charging a real card;
- enabling Stripe Tax without approval;
- inventing plan limits;
- locking founder-led pilot users out;
- broad onboarding redesign;
- committing, pushing, deploying, or modifying provider credentials without explicit authorization.

## Completion report

Return the shared completion report from Packet 00 and use one verdict:

```text
NOT_REQUIRED_FOR_FREE_DESIGN_PARTNER_PILOT
TEST_MODE_BILLING_PROVEN
PARTIAL
BLOCKED
```
