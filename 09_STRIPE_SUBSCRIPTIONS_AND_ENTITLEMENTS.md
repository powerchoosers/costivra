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
- Pre-auth retries reuse a customer already saved on the checkout intent, so a failed Checkout attempt cannot multiply Stripe customer records.
- The signup page keeps one idempotency key for the current plan attempt, so a lost browser response can safely retry the same handoff.
- Test-mode Starter and Growth recurring Prices exist in the **app-configured** Stripe Test account, whose Stripe account name is `Costivra sandbox`.
- The Supabase Test catalog rows now store those verified provider IDs: Starter `price_1U2eoWGiNqnczA1Og9pC0EdR` / `prod_V2kJNDQdjSwiEL`; Growth `price_1U2eoXGiNqnczA1ObRi2Aztj` / `prod_V2kJHD0rkcyDIQ`.
- Owner-managed pricing at `/manage/settings` → **Billing & pricing**.
- Manage → Billing & pricing now shows the server key's Stripe account name and account ID, so Test-account mismatches are visible before changing prices.
- Dynamic pricing now feeds the homepage, public pricing page, customer billing selector, Checkout, and webhook plan lookup.
- Public Starter/Growth plan CTAs now carry the selected plan through `/signup?plan=...`; signup, sign-in, and email-confirmation redirects preserve that selection and land an authenticated user on `/app/settings?tab=billing&plan=...`.
- The customer Billing tab preselects the requested plan and starts Checkout from the existing workspace context.
- Checkout and Customer Portal return to `/app/settings?tab=billing` (not the retired `/portal/settings` route); Checkout also preserves the selected plan and reports `billing=success` or `billing=cancelled`.
- A successful return is explicitly shown as waiting for signed webhook confirmation when the subscription record is not present yet; a cancelled return says that no subscription or access change was applied.
- A completed Checkout webhook marks an existing workspace's onboarding source as `paid_checkout` when it was previously `internal`.
- An unauthenticated Starter/Growth signup can now open Stripe Test Checkout directly from `/signup?plan=...` after collecting name, company, and work email.
- `billing_checkout_intents` is a service-role-only, short-lived handoff record. It stores no browser session and grants no access.
- Migration `20260810004950_packet_09_pre_auth_checkout_intents.sql` is applied to the Costivra Supabase project and RLS is enabled; no browser role can read or write this handoff table.
- A signed `checkout.session.completed` webhook now idempotently creates or reuses the auth user, one organization, one owner membership, onboarding projection, and billing customer. An email with multiple existing workspaces is sent to manual review instead of being guessed into a tenant.
- Both Checkout paths explicitly disable Stripe Managed Payments for the pilot; otherwise Stripe rejects the current products because no Managed Payments tax code is configured.
- If Stripe rejects Checkout after the intent is created, the current route records `status=failed` with the non-sensitive marker `STRIPE_CHECKOUT_SESSION_CREATE_FAILED`; the saved Stripe customer remains reusable for a retry.
- Subscription webhooks now synchronize the server-owned entitlement projection for workspace access, monitored vendors, locations, team seats, and scheduled reports. The current pilot limits are Starter: 3 vendors / 1 location / 3 team members / 1 scheduled report; Growth: 25 / 10 / 10 / 5. Enterprise remains custom.
- The entitlement helper is enforced at vendor, location, team-invite, and scheduled-report creation boundaries. Existing founder-led pilot workspaces remain usable until a paid subscription exists; a paid subscription with missing entitlement rows fails closed.

Still open:

- Full test subscription proof: complete the opened Test Checkout with a Stripe test card, then verify signed webhook → subscription record → entitlement → Customer Portal. The application successfully opened a real Test-mode Starter Checkout Session after the Managed Payments fix; payment/webhook proof is still pending.
- Remaining entitlement enforcement: document/upload limits, sequence enrollment/send limits, and premium category coverage still need explicit product policy before they can be safely gated.
- Production webhook configuration and live-mode proof.
- Activation-link browser proof, delayed webhook recovery, and support handling for the manual-review case.
- Stripe Customer Portal configuration policy and tax/legal approval.
- Credential alignment: the local app key currently resolves to Stripe Test account `acct_1U2Mw8GiNqnczA1O` (display name `Costivra sandbox`), while the connected Stripe dashboard account is `acct_1U2MvqK7vdNK2m4p` (display name `Costivra`). These are different accounts. Replace the app/Vercel Test-mode keys and catalog rows, or intentionally use the sandbox account; do not describe the dashboard account as connected until this is aligned.

Do not treat this packet as permission to create live products, prices, customers, subscriptions, or webhooks without Lewis's explicit approval and a mode check.

## Context handoff — facts that must not be lost

- The dynamic catalog in Supabase is the application pricing source of truth. Stripe Price IDs are provider references, not client-editable values.
- The Test-mode Starter/Growth catalog rows are populated with the active Prices used by the app; the separate live rows intentionally remain unconfigured until live billing is approved.
- The public paid path is `/signup?plan=starter|growth` → `/api/billing/preauth-checkout` → Stripe subscription Checkout → signed Stripe webhook → idempotent user/organization/membership provisioning.
- A Checkout success redirect is only a status screen. It never grants access or proves payment.
- Stripe Managed Payments is explicitly disabled in both subscription Checkout routes because the current pilot products do not have Managed Payments tax codes configured. Do not re-enable it without a separate tax/product-code decision.
- The app currently points at `Costivra sandbox` Test mode. The separate Stripe dashboard account `Costivra` is not connected to the app yet.
- Vercel/local credential alignment is still a Lewis-owned configuration step; no secret key should be copied into this repository or chat.
- A real Starter Test Checkout Session was opened successfully, but no test payment, signed webhook, Customer Portal proof, or activation-email browser proof has been completed.
- The deployed production signup page renders the selected Starter plan and the “Continue to secure checkout” creation flow; the deployed pre-auth endpoint also rejects malformed requests before touching Stripe.
- Production valid-request smoke testing currently fails on deployment `dpl_64Txez67K223bSUAsgwXL5c16oVG` because that deployment predates the local `managed_payments.enabled = false` fix; Stripe returns the Managed Payments product-tax-code error. The fix is present in the working tree and must be deployed before production Checkout can open.
- Latest local validation after the failed-state hardening: the pre-auth route test passes (4 tests), focused ESLint passes, TypeScript validation passes, and `git diff --check` passes. A fresh `npm run build` timed out in the existing multi-process environment; the prior build passed after the Managed Payments fix, and no deployment was performed.
- Never paste secret keys or webhook secrets into chat. Lewis must align the keys/catalog in local and Vercel settings before account-specific proof is valid.

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

The server-owned entitlement helper now synchronizes and enforces:

- monitored vendors;
- locations;
- team seats;
- scheduled reports.

Before calling billing complete, add explicit product policy and enforcement for:

- document/upload limits;
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

For local development, Stripe cannot deliver a signed webhook to `localhost` by itself. Run Stripe CLI with the Test-mode key and forward events to:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the signing secret printed by Stripe CLI into local `STRIPE_WEBHOOK_SECRET` for that session. Production proof requires a deployed HTTPS webhook endpoint with its own Dashboard webhook secret.

After Lewis deploys the current working tree, repeat one valid Test-mode POST to `/api/billing/preauth-checkout`. It must return a Checkout URL rather than 500, and the Vercel log must no longer contain the Managed Payments tax-code error. Only then proceed to the test-card and signed-webhook checks.

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
