# Packet 10: Paid Onboarding and Activation

## Current status — August 9, 2026

This packet is **partially implemented**. The durable activation checklist exists, and the direct paid creation handoff is now implemented. Full external payment, activation-email, and recovery proof remain open.

Implemented today:

- `organization_onboarding` exists in Supabase as a durable, tenant-scoped projection.
- `/api/portal/onboarding` can read, derive, and persist onboarding progress.
- The customer `/app` dashboard has a resumable Activation Checklist.
- Document progress counts only clean, durably stored, successfully extracted records in eligible states.
- Activation requires an authoritative reviewed invoice or contract and at least one monitored vendor.
- Activation is derived from authoritative records; operators cannot manually mark a workspace activated.
- Owners/admins can explicitly block or resume onboarding.
- Founder-led onboarding can still use existing Manage account creation and invitation flows.
- Dynamic pricing is now managed from `/manage/settings` and displayed on public pages.
- Public Starter/Growth plan cards carry the selected plan into `/signup?plan=...`; signup, sign-in, OAuth, and email-confirmation redirects preserve the choice and route an authenticated user to `/app/settings?tab=billing&plan=...`.
- The Billing tab preselects that plan and offers the existing authenticated Checkout handoff.
- Checkout returns preserve the selected plan; the Billing tab shows a truthful “waiting for signed webhook” state after success and a no-change message after cancellation.
- A signed `checkout.session.completed` webhook marks an existing internal workspace's onboarding source as `paid_checkout`.
- An unauthenticated Starter/Growth visitor can submit name, company, and work email at `/signup?plan=...`, then open Stripe Test subscription Checkout without a pre-existing Costivra account.
- The signed webhook provisions or reuses one user, one organization, one owner membership, onboarding source `paid_checkout`, and billing customer through the service-only `billing_checkout_intents` record.
- Repeated webhook delivery is idempotent; an email linked to multiple workspaces goes to manual review rather than selecting a tenant silently.
- A failed or retried pre-auth Checkout handoff reuses the saved Stripe customer for that intent instead of creating duplicates.
- The creation form keeps a stable idempotency key for the current plan attempt, so a browser retry does not start a second handoff.
- A successful pre-auth return requests server-side Checkout reconciliation. The server verifies the completed Stripe session and intent metadata before idempotently provisioning and projecting the subscription; signed webhooks remain the normal lifecycle path.
- The real Test-mode Starter Checkout Session now opens successfully in the app-configured `Costivra sandbox` account after disabling Stripe Managed Payments for the pilot merchant-of-record setup.
- Manage billing now displays the actual Stripe account identity used by the server, which makes account alignment a visible setup check rather than an assumption.
- Subscription webhooks now project server-owned limits for monitored vendors, locations, team members, and scheduled reports; those four creation boundaries reject over-limit paid mutations without hiding existing data.

Still open:

- Complete the real Stripe Test Checkout and signed-webhook proof, including delayed delivery. The app-configured `Costivra sandbox` account now has an active Test event destination for the Costivra webhook, and Vercel has the production signing secret; a new deployment is still required before the running function can receive it.
- Browser proof that the Supabase activation email opens `/set-password` with a usable session and lands in `/app`.
- The paid invite now lands at `/auth/invite`, exchanges the Supabase invite token server-side, and then redirects to `/set-password`; this still needs a real-email browser proof.
- Support tooling for the multiple-workspace manual-review case and expired activation links.
- Remaining plan policy: document/upload limits, sequence enrollment/send limits, and premium category coverage still require explicit product decisions before enforcement.
- Paid welcome, reminder, forwarding, review-needed, and activation-complete email triggers.
- Manage account views showing subscription, onboarding progress, blocker, and last customer action.
- Automatic-forwarding test state distinct from manual monitoring state.
- Recovery and browser proof for delayed webhooks, payment failure, duplicate provisioning, and expired invitations.
- Stripe account alignment: the local app currently uses Test account `acct_1U2Mw8GiNqnczA1O` (`Costivra sandbox`), while the connected dashboard is Test account `acct_1U2MvqK7vdNK2m4p` (`Costivra`). The dashboard account must be intentionally selected and its keys/catalog configured before customer activation is considered connected end to end.

Do not treat a Checkout success redirect as proof of payment or activation. Signed Stripe webhook state remains authoritative.

## Context handoff — current paid-activation truth

- Direct paid creation is implemented at `/signup?plan=starter|growth`; it collects name, company, and work email before opening subscription Checkout.
- The Test-mode Supabase catalog points Starter and Growth at the active Prices in the app-configured `Costivra sandbox` account; live catalog rows remain intentionally unconfigured.
- The webhook, not the browser, provisions or reuses the user, organization, owner membership, onboarding projection, and billing customer.
- The pre-auth handoff migration is already applied to the Costivra Supabase project; do not recreate it or add a second checkout-intent table.
- New users receive a secure Supabase activation link through `/auth/invite`, which exchanges the invite token server-side before `/set-password`.
- Multiple existing workspaces for the same email stop in manual review; the system must not guess which tenant to use.
- The app’s working Stripe Test account is `Costivra sandbox` (`acct_1U2Mw8GiNqnczA1O`). The separately connected dashboard account `Costivra` (`acct_1U2MvqK7vdNK2m4p`) is not yet proven to be the app’s provider account.
- Local and Vercel Stripe credentials still require intentional Lewis-owned alignment; never put secret keys in the packet, source tree, or chat.
- A real Test Checkout Session was completed with Stripe's test card, but no signed webhook → subscription → entitlement → activation chain has been proven end to end because the current deployment predates the webhook secret.
- Production smoke evidence confirms `/signup?plan=starter` renders the selected plan and collects the creation details needed for the direct paid path.
- The current production deployment (`dpl_8esVNXQJxYVmW5wqFFJxbvuP9GYE`, commit `0ed5fac`) successfully opens a Starter Stripe Test Checkout from the public signup path. The request returned `201`, and Supabase recorded the intent as `checkout_open` with a Stripe customer and Checkout Session.
- The Test card was accepted by Stripe, but the app has not yet reconciled the payment into a subscription or activation record. The next proof is the post-deployment signed webhook, provisioning, entitlements, activation link, and Customer Portal check.
- The current local pre-auth route also records a safe `failed` intent state when Stripe rejects session creation, while retaining the customer for retry. Latest focused billing/entitlement/webhook/location/pre-auth tests pass (14 tests), ESLint and TypeScript pass, and the clean production build passes.
- Do not call paid onboarding complete until payment, webhook delivery, activation-link browser proof, duplicate/retry recovery, and intended Stripe-account alignment are verified.

## Mission

Create a guided onboarding flow that connects plan selection, Stripe subscription truth, authentication, workspace provisioning, company setup, first documents, review, and monitoring. Preserve supervised founder-led pilot onboarding.

Do not create a separate disconnected onboarding product. Use the existing customer application and existing Manage workspace.

## Dependencies and current files

Complete the remaining Packet 09 proof gates before enabling paid self-service.

Inspect:

```text
src/app/scan/
src/app/login/
src/app/set-password/
src/app/auth/
src/app/auth/invite/route.ts
src/app/app/
src/app/api/billing/checkout/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/api/portal/onboarding/route.ts
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/components/manage-portal.tsx
src/lib/portal/onboarding.ts
src/lib/portal/activation.ts
src/lib/billing/
src/lib/auth/
src/lib/portal/
supabase/migrations/20260809061921_packet_10_organization_onboarding.sql
```

## Two supported paths

### Path A: Founder-led pilot — currently supported

1. Internal operator creates the organization in Manage.
2. Internal operator invites the owner.
3. Pilot agreement or manual billing is recorded outside self-serve Checkout.
4. Customer sets a password.
5. Customer enters the existing `/app` workspace.
6. The Activation Checklist guides company details, documents, review, and monitoring.

### Path B: Paid self-service — direct paid creation implemented; proof gates remain

1. Visitor selects a dynamic Starter/Growth plan from public pricing.
2. Visitor submits name, company, and work email at `/signup?plan=...`.
3. `/api/billing/preauth-checkout` creates a short-lived intent and Stripe subscription Checkout Session in the configured mode.
4. Signed Stripe webhook confirms the payment and provisions or reuses exactly one user, organization, owner membership, onboarding projection, and billing customer.
5. A new user follows the secure activation email to set a password; an existing user signs in. Multiple-workspace matches go to support review.
6. Customer completes guided activation; subscription events update billing and entitlements.

Both paths must converge on the same organization, membership, billing, and activation records.

## Provisioning rule

Never provision paid access from:

```text
/success?session_id=...
```

The signed Stripe webhook must confirm the event. The success page may poll for server-confirmed status.

Provisioning must be idempotent when:

- the user refreshes;
- the webhook retries;
- the customer returns later;
- an invited user already exists;
- an internal operator already created the organization;
- a Checkout Session is delivered twice.

Use Stripe metadata and a stable organization/user lookup. Never create a second organization merely because a browser session is new.

## Current onboarding state

The deployed table is:

```text
organization_onboarding
```

It stores:

- organization ID;
- source: `pilot_invite`, `paid_checkout`, or `internal`;
- status: `not_started`, `in_progress`, `activated`, or `blocked`;
- current step;
- company/location, document, review, and monitoring timestamps;
- activation timestamp;
- blocked reason.

Current synchronization derives progress from authoritative records. It does not infer activation from the absence of errors.

Current limitation: the sync route preserves the existing source and defaults new rows to `internal`. The paid Checkout webhook explicitly writes `paid_checkout` for existing and newly provisioned workspaces; the remaining gap is external proof and support recovery, not the provisioning code path.

## Guided steps

Keep the customer flow short and resumable.

### 1. Account confirmed

Show the signed-in user, confirmed subscription/plan status, workspace name, and any payment issue. The current checklist treats workspace creation as complete, but it does not yet show payment-confirmed plan state here.

### 2. Company profile

Collect only useful fields:

- company name;
- industry;
- timezone;
- currency;
- primary location.

The current activation logic requires at least one location. Add explicit company-field completion if the product needs more than that.

### 3. Add documents

Ask for three recent recurring bills or contracts.

Count only documents that are:

- durably stored;
- security-clean;
- supported and not rejected;
- in a successful or reviewable extraction state.

Quarantined or terminally failed documents do not count.

### 4. Review first record

Require at least one authoritative reviewed invoice or contract. An empty review queue is not completion.

### 5. Select monitoring mode

Options should be explicit:

- automatic forwarding, pending a successful real test;
- manual tracking.

The current checklist counts an active or manual-tracking vendor, but does not yet record automatic-forwarding test completion separately. Do not label automatic monitoring complete until the real test succeeds.

### 6. Activation complete

Show:

- records accepted;
- first reviewed vendor;
- monitoring state;
- next action;
- support route;
- current subscription and entitlement state.

## UI placement

Use the existing customer application:

- activation panel on `/app`;
- resumable route-local checklist or sheet;
- existing `/app/settings` Billing tab.

Do not add another top-level customer navigation page. The customer may dismiss the guide, but it must remain resumable until activated.

## Pricing CTA behavior

The public homepage and `/pricing` now display the owner-managed catalog. Starter/Growth plan cards lead to `/signup?plan=...`; the signup form can start direct pre-auth Stripe Checkout. An existing signed-in user can still use the authenticated Billing tab for an existing workspace.

Required behavior for the current handoff:

- the free scan and contact paths remain honest;
- a paid plan CTA carries a stable plan key into signup/sign-in;
- an authenticated owner/admin can review that plan and open Checkout for the existing organization, or a new visitor can continue directly to Checkout;
- a signed-in non-owner cannot start billing for another organization;
- Checkout cancellation/success return to `/app/settings?tab=billing&plan=...` with an explicit outcome message, without granting access from the redirect alone;
- no paid button appears for an inactive or unconfigured plan.

Required behavior for the implemented direct path:

- an unauthenticated visitor may complete Checkout before a workspace exists;
- the signed webhook provisions or reuses exactly one user, organization, and membership idempotently;
- the webhook sets `organization_onboarding.source = paid_checkout` for that new/reused workspace;
- no access is granted from the success URL or from an unsigned client request.

## Entitlement enforcement

The central entitlement helper from Packet 09 now gates server-authorized mutations for monitored vendors, locations, team seats, and scheduled reports. Continue the same pattern for:

- uploads beyond the plan limit;
- monitored vendors;
- seats;
- scheduled reports;
- sequences if included in a plan;
- premium category coverage.

Do not hide existing customer data when billing lapses. Prefer read-only access and a clear billing message.

## Email wiring

Use the existing lifecycle email system, not a new onboarding subsystem:

- subscription/workspace welcome;
- onboarding reminder;
- upload received;
- review needed;
- forwarding instructions;
- activation complete;
- payment failure and recovery notice.

Deduplicate each message with the external-side-effect ledger and provider event identity.

## Internal Manage context

On account records, show:

- onboarding source;
- current plan and subscription state;
- activation progress;
- blocked step/reason;
- last customer action;
- safe support action.

Allow internal owners/operators to:

- resend an invitation;
- copy a secure activation link;
- inspect blockers;
- record manual pilot terms;
- support a paid account without bypassing payment truth;
- record any manual override as an audited owner action.

## Recovery cases

Handle and test:

- paid but user not created;
- user created but webhook delayed;
- duplicate organization candidate;
- duplicate webhook;
- expired invitation;
- failed document scan;
- failed extraction;
- no authoritative review;
- automatic-monitoring test failure;
- failed payment during onboarding.

Every blocker needs a clear next action and must not silently grant paid access.

## Tests

Local paid-flow testing needs a reachable signed webhook. Stripe Checkout can open on `localhost`, but Stripe cannot call the local webhook unless Stripe CLI forwards it to `http://localhost:3000/api/webhooks/stripe`; do not treat a successful browser return alone as activation proof.

The current production deployment has passed the valid selected-plan signup → Test Checkout opening check. The Test webhook destination and Vercel secret are configured, but the secret takes effect only after the next deployment. Complete the remaining test-card, signed-webhook, activation-link, and recovery checks before enabling paid self-service.

Unit and integration:

- idempotent provisioning;
- invited user with Checkout;
- existing organization reuse;
- webhook delayed or duplicated;
- non-owner billing rejection;
- activation completion rules;
- quarantined document does not count;
- authoritative review required;
- monitoring truth;
- entitlement gating;
- payment failure and recovery.

Browser:

- founder-led invitation path;
- paid Checkout test path;
- resume onboarding;
- mobile;
- keyboard access;
- payment failure state;
- correct return to `/app/settings`.

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

## Acceptance criteria

- Founder-led and paid customers converge on the same system of record.
- Signed Stripe webhook controls paid access.
- Provisioning is idempotent and reuses existing users/organizations.
- Existing and direct pre-auth paid Checkout set onboarding source to `paid_checkout` for the newly created/reused workspace.
- Onboarding is short, honest, and resumable.
- Activation uses real authoritative states.
- Automatic monitoring is not claimed complete without a successful test.
- Entitlements gate paid actions server-side.
- Existing data remains accessible when billing has an issue.
- Manage shows onboarding and billing context.
- Public paid CTAs carry the selected plan into either direct pre-auth Checkout or the authenticated Billing flow for an existing workspace.
- No unnecessary top-level app page is added.
- No branch, commit, push, merge, or deployment is performed by the coding agent.
