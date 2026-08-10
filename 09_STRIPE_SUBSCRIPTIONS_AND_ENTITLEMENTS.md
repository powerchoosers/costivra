# Packet 09: Stripe Subscriptions, Dynamic Pricing, and Entitlements

## Current status — August 10, 2026

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
- Public Starter/Growth plan CTAs now carry the selected plan through `/signup?plan=...`; signup, sign-in, and email-confirmation redirects preserve that selection and land an authenticated user on `/app/settings?tab=billing&plan=...`.
- The customer Billing tab preselects the requested plan and starts Checkout from the existing workspace context.
- Checkout and Customer Portal return to `/app/settings?tab=billing` (not the retired `/portal/settings` route); Checkout also preserves the selected plan and reports `billing=success` or `billing=cancelled`.
- A successful return is explicitly shown as waiting for signed webhook confirmation when the subscription record is not present yet; a cancelled return says that no subscription or access change was applied.
- A completed Checkout webhook marks an existing workspace's onboarding source as `paid_checkout` when it was previously `internal`.
- An unauthenticated Starter/Growth signup can now open Stripe Test Checkout directly from `/signup?plan=...` after collecting name, company, and work email.
- `billing_checkout_intents` is a service-role-only, short-lived handoff record. It stores no browser session and grants no access.
- A signed `checkout.session.completed` webhook now idempotently creates or reuses the auth user, one organization, one owner membership, onboarding projection, and billing customer. An email with multiple existing workspaces is sent to manual review instead of being guessed into a tenant.

Still open:

- Full test subscription proof: real Test Checkout → signed webhook → subscription record → entitlement → Customer Portal. The code path and focused tests exist, but this external proof has not been run in this turn.
- A central entitlement helper and actual plan-limit enforcement.
- Production webhook configuration and live-mode proof.
- Activation-link browser proof, delayed webhook recovery, and support handling for the manual-review case.
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
src/app/api/billing/preauth-checkout/route.ts
src/app/api/billing/checkout-status/route.ts
src/app/api/billing/status/route.ts
src/app/api/billing/portal/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/api/manage/billing/catalog/route.ts
src/app/api/portal/onboarding/route.ts
src/components/home-page.tsx
src/components/marketing-pages.tsx
src/components/portal-pages.tsx
src/proxy.ts
src/lib/supabase/
supabase/migrations/20260809040000_packet_09_billing.sql
supabase/migrations/20260809221900_billing_plan_catalog.sql
supabase/migrations/20260810004950_packet_09_pre_auth_checkout_intents.sql
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

The authenticated route remains the existing-workspace path. For a visitor without an organization, `/api/billing/preauth-checkout` creates a short-lived intent and subscription Checkout Session using the same server-side catalog and mode checks.

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

For a Checkout Session carrying `checkout_intent_id`, the webhook first marks the intent payment-confirmed and provisions or reuses the user, organization, owner membership, onboarding projection, and billing customer. This provisioning is idempotent and does not run from a browser redirect.

For an existing organization, `checkout.session.completed` also upserts `organization_onboarding.source = paid_checkout` when the row is new or still marked `internal`. Ambiguous emails with multiple workspaces are recorded as `manual_review`.

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

The Customer Portal route exists and returns to `/app/settings?tab=billing`. Production proof is still required.

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
- Public plan selection survives signup/sign-in and opens the requested plan in the existing Billing tab.
- Checkout success/cancel returns preserve the selected plan and never grant access from the redirect alone.
- Entitlements update deterministically and are enforced at paid actions.
- Billing remains visible in existing Settings.
- No payment method data is stored in Costivra.
- Tax is not falsely represented as enabled.
- Existing pilot accounts are not locked out accidentally.
- Test subscription proof passes before live billing is considered.
- No branch, commit, push, merge, or deployment is performed by the coding agent.
