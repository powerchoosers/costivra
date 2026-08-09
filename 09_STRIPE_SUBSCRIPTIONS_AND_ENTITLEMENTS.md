# Packet 09: Stripe Subscriptions, Dynamic Pricing, and Entitlements

## Current status — August 9, 2026

This packet is **partially implemented**. The subscription foundation exists, but the complete paid self-service proof and plan-specific entitlement enforcement are still open.

Implemented today:

- Supabase billing tables: `billing_customers`, `billing_subscriptions`, `billing_events`, and `billing_entitlements`.
- Service-role-only database access with RLS enabled; browser writes are prohibited.
- `POST /api/billing/checkout` using Stripe Checkout with `mode: "subscription"`.
- `POST /api/billing/portal` using Stripe Customer Portal.
- Signed webhook handling at `POST /api/webhooks/stripe`.
- Idempotent customer creation, Checkout Sessions, and webhook event ledgering.
- Test-mode Starter and Growth recurring Prices exist in the Costivra Stripe account.
- Owner-managed pricing at `/manage/settings` → **Billing & pricing**.
- Dynamic pricing now feeds the homepage, public pricing page, customer billing selector, Checkout, and webhook plan lookup.

Still open:

- Full test subscription proof: Checkout → signed webhook → subscription record → entitlement → Customer Portal.
- A central entitlement helper and actual plan-limit enforcement.
- Production webhook configuration and live-mode proof.
- Correct customer return URLs (`/app/settings` is the customer route; the current Checkout/Portal helpers still use `/portal/settings`).
- Stripe Customer Portal configuration policy and tax/legal approval.

Do not treat this packet as permission to create live products, prices, customers, subscriptions, or webhooks without Lewis's explicit approval and a mode check.

## Mission

Use Stripe Billing, Stripe Checkout, webhooks, and the Stripe Customer Portal for recurring subscriptions. Stripe's signed events are the source of payment truth; a success redirect never grants access by itself.

The current Costivra pricing source of truth is the server-side Supabase table `billing_plan_catalog`, with one row per plan and Stripe mode (`test` or `live`). Environment Price IDs are only a legacy bootstrap fallback.

## Required reading and files

Inspect:

```text
package.json
.env.example
src/lib/billing/catalog.ts
src/lib/billing/stripe.ts
src/lib/billing/entitlements.ts       # create before plan-limit enforcement
src/app/api/billing/checkout/route.ts
src/app/api/billing/status/route.ts
src/app/api/billing/portal/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/api/manage/billing/catalog/route.ts
src/components/home-page.tsx
src/components/marketing-pages.tsx
src/components/portal-pages.tsx
src/lib/supabase/
supabase/migrations/20260809040000_packet_09_billing.sql
supabase/migrations/20260809221900_billing_plan_catalog.sql
```

Read current Stripe Billing, Checkout, webhook, and Customer Portal documentation before changing integration behavior.

## Pricing architecture

Do not scatter prices through components or hardcode Stripe Price IDs in client code.

The catalog contains:

- stable internal plan key: `starter`, `growth`, or `enterprise`;
- display name and description;
- amount in integer cents and currency;
- monthly, annual, or custom cadence;
- feature copy;
- active/inactive state;
- Stripe product and Price IDs;
- separate `test` and `live` rows.

The owner editor creates a replacement Stripe Price and archives the previous Price when the amount or cadence changes. Existing subscriptions retain their historical Price. Public pages receive display fields only; provider identifiers remain server-side.

Enterprise remains assisted-sales only unless Lewis explicitly enables a self-serve Price.

## Stripe architecture

Use:

- Stripe Billing;
- Stripe Checkout Sessions with `mode: "subscription"`;
- Stripe Customer Portal;
- signed webhooks;
- a server-only restricted/secret key;
- idempotency keys for external mutations.

Do not use raw PaymentIntents for recurring subscriptions. Do not accept a browser-supplied amount or Price ID without resolving it against the server catalog.

## Environment variables

```text
STRIPE_RESTRICTED_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_BILLING_LIVEMODE_ENABLED=0
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_STARTER_MONTHLY=       # legacy bootstrap fallback only
STRIPE_PRICE_GROWTH_MONTHLY=        # legacy bootstrap fallback only
```

The Price ID variables are not the long-term catalog. They are used only when the matching mode's catalog row has no saved Stripe Price yet. Never put secret keys or webhook secrets in browser-visible variables.

The app currently uses Stripe Test mode locally. Production must use separate live credentials and live catalog rows. A Stripe connector showing live mode is not proof that the app is configured for live billing.

## Data model

Existing tables:

- `billing_customers`: one Stripe customer per organization;
- `billing_subscriptions`: provider subscription projection and status;
- `billing_events`: unique Stripe event ledger;
- `billing_entitlements`: organization feature state;
- `billing_plan_catalog`: owner-managed display data and active Price per plan/mode.

All are service-role-only from the database. Customer users read safe billing state through authenticated server routes, not direct browser table access. Do not store full payment method data.

## Checkout route

`POST /api/billing/checkout` currently:

- authenticates the customer;
- requires owner/admin role in an existing organization;
- validates a stable plan key;
- resolves the active Price from `billing_plan_catalog`;
- verifies the Price is active and belongs to the configured Stripe mode;
- creates or reuses one Stripe customer per organization;
- attaches organization metadata;
- creates a subscription Checkout Session;
- records an audit event;
- returns the Checkout URL.

The remaining paid-onboarding work is to support a visitor who does not yet have an organization. Until that exists, Checkout is for an already-created workspace.

## Webhook route

`POST /api/webhooks/stripe`:

- verifies the raw body and Stripe signature;
- rejects mode mismatches and disabled live billing;
- persists an idempotent event ledger;
- handles `checkout.session.completed`;
- handles all `customer.subscription.*` events;
- handles `invoice.paid`, `invoice.payment_failed`, and `invoice.payment_action_required`;
- writes subscription state and the current Stripe Price ID;
- syncs the current `paid_workspace` entitlement.

The webhook currently does **not** provision a new organization after Checkout. That belongs to Packet 10.

## Entitlement policy

Only the basic `paid_workspace` entitlement is currently synchronized. Before calling billing complete, add a server-owned entitlement helper and enforce it at the relevant mutation boundaries for:

- document/upload limits;
- monitored vendors;
- team seats;
- scheduled reports;
- sequence enrollment and daily sends;
- premium category coverage;
- support level.

When billing lapses, preserve existing customer data and prefer read-only access plus a clear billing message. Never delete customer data because of payment state.

## Customer Portal and settings

Customer billing appears in the existing `/app/settings` Billing tab. The owner billing catalog appears in `/manage/settings` and is internal-only.

The Customer Portal route exists, but its return URL must be corrected from `/portal/settings` to `/app/settings` before production proof.

Do not add a new top-level customer navigation page.

## Tax boundary

Do not enable automatic tax merely because Stripe supports it. Before enabling Stripe Tax, confirm registrations, jurisdictions, product tax code, business address, and tax policy with Lewis.

## Test-mode proof still required

Prove with signed test events or Stripe CLI fixtures:

1. successful Checkout;
2. duplicate webhook;
3. active subscription;
4. failed invoice;
5. payment recovery;
6. cancellation at period end;
7. Customer Portal;
8. unauthorized checkout rejection;
9. wrong-mode or inactive-Price rejection;
10. tenant isolation;
11. entitlement behavior at each plan boundary.

Never use live payment details for proof. Never create live products or prices as a test of the integration.

## Acceptance criteria

- Dynamic catalog is the source of truth for display and Checkout.
- Owner-only pricing edits create replacement Stripe Prices and archive old Prices.
- Signed webhooks remain the source of subscription truth.
- Duplicate events are safe.
- Customer Portal works and returns to `/app/settings`.
- Entitlements update deterministically and are enforced at paid actions.
- Billing remains visible in existing Settings.
- No payment method data is stored in Costivra.
- Tax is not falsely represented as enabled.
- Existing pilot accounts are not locked out accidentally.
- Test subscription proof passes before live billing is considered.
- No branch, commit, push, merge, or deployment is performed by the coding agent.
