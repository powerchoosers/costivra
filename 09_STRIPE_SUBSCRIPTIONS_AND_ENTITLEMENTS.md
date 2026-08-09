# Packet 09: Stripe Subscriptions and Entitlements

## Mission

Install Costivra's recurring subscription foundation using Stripe Billing, Stripe Checkout, webhooks, and the Stripe Customer Portal. Payment truth must come from signed Stripe events, not from the success redirect.

The connected Stripe account was empty at audit time. Re-check before creating anything.

## Required reading and files

Inspect:

```text
package.json
.env.example
src/components/marketing-pages.tsx
src/components/home-page.tsx
src/app/pricing/
src/app/api/
src/lib/supabase/
src/lib/auth/
src/lib/portal/repository.ts
src/components/portal-pages.tsx
```

Read current Stripe Billing, Checkout, webhook, and Customer Portal documentation before implementation.

## Pricing decision gate

Do not invent prices or plan names.

Before creating Stripe products:

1. Inspect the current Costivra pricing page.
2. Compare it with Lewis's current pricing decision.
3. Produce a plan mapping for approval:
   - stable internal plan key
   - display name
   - monthly or annual
   - Stripe product
   - Stripe price
   - entitlements
   - trial policy
4. If pricing is unresolved, complete the integration with test placeholder IDs in environment configuration and report the human blocker.

Do not hardcode Stripe price IDs in client code.

## Stripe architecture

Use:

- Stripe Billing
- Stripe Checkout Sessions with `mode: "subscription"`
- Stripe Customer Portal
- signed webhooks
- pinned current Stripe SDK
- restricted API key where supported

Do not build recurring payments with raw PaymentIntents.

Do not pass `payment_method_types` for web Checkout. Let Stripe use dynamically configured eligible methods.

Use an `integration_identifier` on current supported API versions.

## Environment variables

Add safe placeholders to `.env.example`:

```text
STRIPE_RESTRICTED_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_<PLAN_KEY>_MONTHLY=
STRIPE_PRICE_<PLAN_KEY>_ANNUAL=
STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Only add the publishable key to the browser. All other keys are server-only.

Do not print keys.

## Data model

Create tenant-owned billing tables.

### `billing_customers`

- organization_id
- stripe_customer_id
- email
- created_at
- updated_at

One Stripe customer per organization.

### `billing_subscriptions`

- id
- organization_id
- stripe_subscription_id
- stripe_customer_id
- stripe_price_id
- plan_key
- status
- cancel_at_period_end
- current_period_start
- current_period_end
- trial_start
- trial_end
- canceled_at
- ended_at
- latest_invoice_id
- created_at
- updated_at

### `billing_events`

- stripe_event_id unique
- event_type
- livemode
- status
- processed_at
- safe_error
- created_at

### `billing_entitlements`

- organization_id
- plan_key
- feature_key
- enabled
- limit_value
- source_subscription_id
- effective_at
- expires_at
- updated_at

Requirements:

- RLS enabled.
- Customer users may read safe billing state for their own organization.
- Browser writes are prohibited.
- Webhook uses server credentials.
- Event processing is idempotent.
- Do not store full payment method data.

## Checkout route

Create a server route such as:

```text
POST /api/billing/checkout
```

It must:

- authenticate the user;
- require organization owner/admin role;
- validate a stable plan key;
- resolve the server-side price ID;
- create or reuse the Stripe customer;
- attach organization/user metadata;
- create a subscription Checkout Session;
- use safe success and cancel URLs;
- return the Checkout URL;
- create an audit event.

Do not grant access based on the redirect.

## Webhook route

Create:

```text
POST /api/webhooks/stripe
```

Verify the raw body and Stripe signature.

Handle at minimum:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Persist the Stripe event before or during processing with idempotent state.

Subscription status mapping must be deterministic.

## Entitlement policy

Define plan entitlements in one server-owned catalog.

Examples of feature keys, only if they match current product decisions:

- document upload limit
- monitored vendors
- team seats
- scheduled reports
- sequence enrollments
- sequence daily sends
- category packs
- support level

Do not scatter plan checks across components.

Create a helper such as:

```text
src/lib/billing/entitlements.ts
```

Customer access must degrade gracefully:

- read-only access to existing records when a subscription lapses
- no destructive data deletion
- no new paid action when entitlement is absent
- owner receives billing notice
- internal owner remains able to support the account

## Customer Portal

Create:

```text
POST /api/billing/portal
```

The organization owner can:

- update payment method
- view invoices
- change plan where allowed
- cancel according to policy

Use Stripe's hosted Customer Portal.

## Settings UI

Use the existing customer Settings route.

Add a Billing tab or section with:

- current plan
- subscription status
- renewal date
- trial end
- payment issue
- manage billing button
- plan entitlements
- invoice link through Customer Portal

Do not add a new top-level app navigation page.

## Tax boundary

Do not enable automatic tax merely because the API supports it.

Before enabling Stripe Tax, Lewis must confirm:

- registrations
- jurisdictions
- product tax code
- business address
- tax policy

Until then, keep the setting explicit and documented.

## Test mode

Complete test-mode proof first.

Use Stripe test clocks or test events where appropriate.

Prove:

1. successful checkout
2. duplicate webhook
3. subscription active
4. failed invoice
5. recovery after payment
6. cancellation at period end
7. immediate cancellation if supported by policy
8. Customer Portal
9. unauthorized checkout rejection
10. wrong price ID rejection
11. tenant isolation

Do not create live products or prices without Lewis's explicit pricing decision.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Add Stripe CLI or signed-fixture webhook tests without exposing secrets.

## Acceptance criteria

- Checkout creates a real Stripe subscription in test mode.
- Signed webhooks are the source of subscription truth.
- Duplicate events are safe.
- Entitlements update deterministically.
- Customer Portal works.
- Billing is visible in existing Settings.
- No payment method data is stored in Costivra.
- Tax is not falsely represented as enabled.
- Existing pilot accounts are not locked out accidentally.
- No branch, commit, push, merge, or deployment was performed.
