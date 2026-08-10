# Packet 10: Paid Onboarding and Activation

## Current status — August 9, 2026

This packet remains the correct next milestone, but it is **partially implemented**. The durable activation checklist exists for already-created workspaces. True paid self-service onboarding does not exist yet.

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
- A signed `checkout.session.completed` webhook marks an existing internal workspace's onboarding source as `paid_checkout`.

Still open:

- Direct pre-auth Checkout before an organization exists.
- Signed-webhook-confirmed creation or reuse of the user, organization, and membership.
- Idempotent reuse of an invited user or an already-created organization in the new paid path.
- Preserving `paid_checkout` when the onboarding sync runs after the webhook.
- Plan entitlements enforced during onboarding and later paid actions.
- Paid welcome, reminder, forwarding, review-needed, and activation-complete email triggers.
- Manage account views showing subscription, onboarding progress, blocker, and last customer action.
- Automatic-forwarding test state distinct from manual monitoring state.
- Recovery and browser proof for delayed webhooks, payment failure, duplicate provisioning, and expired invitations.

Do not treat a Checkout success redirect as proof of payment or activation. Signed Stripe webhook state remains authoritative.

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

### Path B: Paid self-service — partial handoff implemented; provisioning is not complete

1. Visitor selects a dynamic plan from public pricing.
2. Visitor creates or signs into a Costivra account; the selected plan survives the auth/email-confirmation handoff.
3. An authenticated owner/admin opens `/app/settings?tab=billing&plan=...` and starts Stripe Checkout for the existing workspace.
4. Signed Stripe webhook confirms the Checkout/subscription and marks the existing onboarding row `paid_checkout`.
5. Customer completes guided activation.
6. Entitlements control paid actions.

The missing future step is direct pre-auth Checkout with signed-webhook provisioning or reuse of exactly one user/workspace. Do not describe the current flow as if Stripe can create a Costivra workspace by itself.

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

Current limitation: the sync route preserves the existing source and defaults new rows to `internal`. The Stripe webhook now explicitly writes `paid_checkout` for an existing workspace, but there is still no pre-auth provisioning path for a visitor who has no workspace row yet.

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

The public homepage and `/pricing` now display the owner-managed catalog. Starter/Growth plan cards lead to `/signup?plan=...`, preserve the selection through authentication, and hand the customer to the existing Billing tab. They do not start Stripe Checkout directly for an unauthenticated visitor.

Required behavior for the current handoff:

- the free scan and contact paths remain honest;
- a paid plan CTA carries a stable plan key into signup/sign-in;
- an authenticated owner/admin can review that plan and open Checkout for the existing organization;
- a signed-in non-owner cannot start billing for another organization;
- Checkout cancellation/success return to `/app/settings?tab=billing` without granting access from the redirect alone;
- no paid button appears for an inactive or unconfigured plan.

Required behavior for the future full self-service path:

- an unauthenticated visitor may complete Checkout before a workspace exists;
- the signed webhook provisions or reuses exactly one user, organization, and membership idempotently;
- the webhook sets `organization_onboarding.source = paid_checkout` for that new/reused workspace.

## Entitlement enforcement

Use the central entitlement helper from Packet 09 once it exists. Gate only server-authorized mutations, including:

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
- Existing paid Checkout sets onboarding source to `paid_checkout`; the future pre-auth provisioning path must do the same for a newly created/reused workspace.
- Onboarding is short, honest, and resumable.
- Activation uses real authoritative states.
- Automatic monitoring is not claimed complete without a successful test.
- Entitlements gate paid actions server-side.
- Existing data remains accessible when billing has an issue.
- Manage shows onboarding and billing context.
- Public paid CTAs carry the selected plan into the authenticated Billing flow; direct pre-auth Checkout remains an explicit follow-up milestone.
- No unnecessary top-level app page is added.
- No branch, commit, push, merge, or deployment is performed by the coding agent.
