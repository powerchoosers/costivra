# Packet 10: Paid Onboarding and Activation

## Mission

Create a guided onboarding flow that connects plan selection, Stripe subscription truth, authentication, workspace provisioning, company setup, first documents, review, and monitoring. Preserve the ability to onboard supervised pilot customers manually.

Do not create a separate disconnected onboarding product.

## Dependencies

Complete Packet 09 first.

Inspect:

```text
src/app/scan/
src/app/login/
src/app/set-password/
src/app/auth/
src/app/app/
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/lib/auth/
src/lib/portal/
src/lib/billing/
src/app/api/billing/
```

Inspect existing invitation and team-member flows.

## Two supported paths

### Path A: Founder-led pilot

1. Internal operator creates the account in Manage.
2. Internal operator invites the owner.
3. Pilot agreement or manual billing is recorded.
4. Customer sets password.
5. Customer enters the existing workspace.
6. Activation checklist guides the first documents and monitoring setup.

### Path B: Paid self-service

1. Visitor selects a plan.
2. Visitor starts Stripe Checkout.
3. Stripe webhook confirms the subscription.
4. Visitor authenticates or creates an account.
5. Costivra provisions the workspace once.
6. Customer completes guided activation.
7. Entitlements control paid actions.

Both paths must converge on the same organization, membership, billing, and activation records.

## Provisioning rule

Do not provision paid access from:

```text
/success?session_id=...
```

The signed Stripe webhook creates or marks the billing customer/subscription. The success page may poll for server-confirmed status.

Avoid duplicate organizations when:

- the user refreshes;
- the webhook retries;
- the customer returns later;
- an invited user already exists;
- an internal operator already created the account.

## Onboarding state

Create a dedicated tenant-owned state or an equally explicit structure.

Suggested `organization_onboarding` fields:

- organization_id
- source: pilot_invite, paid_checkout, internal
- status: not_started, in_progress, activated, blocked
- current_step
- company_completed_at
- location_completed_at
- documents_completed_at
- review_completed_at
- monitoring_selected_at
- monitoring_completed_at
- activated_at
- blocked_reason
- created_at
- updated_at

Do not infer activation from the absence of errors.

## Guided steps

Keep the customer flow short.

### 1. Account confirmed

Show:

- signed-in user
- plan
- subscription/trial status
- company name

### 2. Company profile

Collect only useful fields:

- company name
- industry
- timezone
- currency
- primary location

### 3. Add documents

Ask for three recent recurring bills or contracts.

Count only documents that are:

- supported
- durably stored
- not rejected
- not terminally failed

Quarantined documents do not count as analyzed documents.

### 4. Review first record

Require at least one authoritative reviewed invoice or contract.

Do not mark complete because the review queue is empty.

### 5. Select monitoring mode

Options:

- automatic forwarding pending test
- manual tracking

Automatic monitoring is not complete until the real test succeeds.

### 6. Activation complete

Show:

- records accepted
- first reviewed vendor
- monitoring state
- first next action
- support route

## UI placement

Use the existing customer application.

Options:

- activation panel on `/app`
- resumable activation sheet
- route-local onboarding state

Do not add multiple new top-level nav pages.

The customer may dismiss the guide, but it remains resumable until activated.

## Pricing CTA behavior

Update marketing and pricing CTAs:

- free scan or contact path remains honest
- paid plan CTA opens checkout
- existing signed-in owners reuse their organization
- signed-in non-owners cannot start billing for another organization
- cancellation returns to pricing without creating access

Do not show a paid button that is not wired.

## Entitlement enforcement

Use the central entitlement helper from Packet 09.

Gate:

- uploads beyond limit
- monitored vendors
- seats
- scheduled reports
- sequences if included in a plan
- premium category coverage

Do not hide existing customer data because a plan lapses. Prefer read-only plus a clear billing message.

## Email wiring

Use Packet 04 lifecycle emails:

- subscription/workspace welcome
- onboarding reminder
- upload received
- review needed
- forwarding instructions
- activation complete

Deduplicate every message.

Do not create a separate onboarding email subsystem.

## Internal Manage context

On account records, show:

- onboarding source
- plan
- subscription state
- activation progress
- blocked step
- last customer action
- support action

Allow internal operators to:

- resend invitation
- copy secure activation link
- inspect blocker
- record manual pilot terms
- avoid bypassing payment truth for a paid account without an audited owner action

## Recovery

Handle:

- paid but user not created
- user created but webhook delayed
- duplicate organization
- expired invitation
- failed document scan
- failed extraction
- no authoritative contact
- automatic monitoring test failure
- failed payment during onboarding

Every blocker should give a clear next action.

## Tests

Unit and integration:

- idempotent provisioning
- invited user with checkout
- existing organization reuse
- webhook delayed
- duplicate webhook
- non-owner billing rejection
- activation completion rules
- quarantined document does not count
- review required
- monitoring truth
- entitlement gating

Browser:

- founder-led invitation path
- paid checkout test path
- resume onboarding
- mobile
- keyboard
- payment failure state

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
- Provisioning is idempotent.
- Onboarding is short and resumable.
- Activation uses real states.
- Existing data remains accessible when billing has an issue.
- Manage shows onboarding and billing context.
- No unnecessary top-level app page was added.
- No branch, commit, push, merge, or deployment was performed.
