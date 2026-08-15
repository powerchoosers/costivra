# Packet 08 — Stripe test-mode and activation evidence

**Audit date:** 2026-08-15  
**Verdict:** `PARTIAL`  
**Mode:** Test only; no live billing action was performed

## Current account and catalog alignment

The application server key resolves to the test account `acct_1U2Mw8GiNqnczA1O` (`Costivra sandbox`). The connected Stripe app view resolves to `acct_1U2MvqK7vdNK2m4p` (`Costivra`). These are different accounts, so the connected dashboard must not be treated as proof for the account used by the application.

Read-only inspection of the app-configured test account found:

| Item | Result |
|---|---|
| Starter product/price | `prod_V2kJNDQdjSwiEL` / `price_1U2eoWGiNqnczA1Og9pC0EdR`, active, USD 149/month, test mode |
| Growth product/price | `prod_V2kJHD0rkcyDIQ` / `price_1U2eoXGiNqnczA1ObRi2Aztj`, active, USD 599/month, test mode |
| Webhook endpoint | `https://costivra.ai/api/webhooks/stripe`, enabled |
| Webhook events | Checkout completion, subscription create/update/delete, invoice paid/failed/action-required |
| Customer Portal configuration | No configuration returned by the app-account read-only audit |
| App-account Test objects | 7 customers, 2 subscriptions, 2 PaymentIntents, 2 charges; all `livemode=false` |
| Live objects or charges | None |

The Supabase catalog in project `skfocjrykyvsaviyhdea` matches the two app-account test prices. Enterprise remains custom and has no self-serve price.

## Existing proof

The app has server-side safeguards and regression coverage for:

- test/live mode matching and live-mode opt-in;
- signed Stripe webhook verification;
- duplicate event ledger handling;
- delayed Checkout reconciliation after a successful return;
- idempotent customer, user, organization, owner membership, onboarding, subscription, and entitlement projection;
- payment failure/action-required projection to `past_due` without deleting workspace data;
- cancellation projection;
- owner/admin-only Customer Portal session creation;
- server-enforced Starter/Growth limits for monitored vendors, locations, team seats, and scheduled reports.

Fresh read-only Supabase counts were: 7 checkout intents, 2 billing customers, 2 subscriptions, 10 entitlement rows, 3 billing events, and 4 onboarding rows. The three most recent billing events were non-live and processed: `invoice.paid`, `customer.subscription.created`, and `checkout.session.completed`. The Stripe Test account had 7 customers, 2 subscriptions, 2 PaymentIntents, and 2 charges; every inspected object was non-live.

## Code change in this packet

Both Checkout paths now send Stripe's `integration_identifier` with a Costivra flow label and an eight-letter correlation suffix. This gives Stripe-side Checkout records a safe, searchable flow marker without storing secrets or payment details.

## Open proof and blockers

The following are not claimed complete:

1. The Stripe dashboard connector and application server key refer to different accounts and need an intentional account decision.
2. No Customer Portal configuration was discoverable on the app-connected test account, so Portal browser proof is blocked.
3. A clean-browser activation trace for a newly provisioned disposable user, including password setup and repeated/expired-link recovery, is not present in this audit.
4. Payment-failed, payment-action-required, recovery, cancellation, stale/out-of-order, and wrong-mode events have unit coverage but have not all been replayed against a deployed test endpoint in this turn.
5. Vercel environment inspection did not return: the CLI command hung until terminated. Deployment environment alignment therefore remains unverified here.

No live product, Price, customer, subscription, payment method, charge, or live webhook action was created.

## Verification commands

- Node 24.19.0 was used.
- `node node_modules/vitest/vitest.mjs run src/lib/billing src/app/api/billing src/app/api/webhooks/stripe src/lib/portal/activation.test.ts --reporter=dot` — **37 passed**.
- Read-only Stripe API inspection through the application test key — **passed**.
- Read-only Supabase billing/catalog inspection for project `skfocjrykyvsaviyhdea` — **passed**.
