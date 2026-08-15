# Pilot billing runbook

**Owner:** Unassigned — Lewis must assign before paid self-serve launch  
**Support channel:** Unassigned — do not promise a response channel until chosen  
**Mode:** Test-mode proof only until Packet 09 authorizes a live decision

## Guardrails

- Never enable live billing, create live catalog objects, or charge a real card from this runbook.
- A Checkout success URL never grants access. Wait for a signed webhook or use the server-side reconciliation route.
- Never copy Stripe keys, webhook secrets, card data, or invoice contents into tickets or chat.
- Preserve the workspace and its data when billing is delinquent; do not delete it automatically.
- Operators must use the existing billing routes and audit records. Do not edit entitlements directly to bypass payment truth.

## Fast triage

| Symptom | Check | Safe action |
|---|---|---|
| Paid but workspace still waiting | Checkout intent, `billing_events`, subscription projection | Reconcile the Checkout session once; if still pending, open a support task for signed-webhook/account review |
| No activation link | Intent status, user, membership, onboarding source | Keep payment state unchanged; send the customer to the recovery flow or manual review |
| Payment failed/action required | Subscription status and latest invoice | Explain the billing state; customer uses Stripe Checkout/Portal recovery; do not remove data |
| Customer asks to cancel | Current subscription and `cancel_at_period_end` | Use the configured Stripe Portal only after its account/policy is verified; otherwise record a manual-review task |
| Wrong plan/account/catalog | Mode, account ID, Price ID, catalog row | Stop. Do not retry or edit records until the account and catalog are aligned |
| Webhook signature failure | Endpoint and signing-secret deployment | Reject the event, rotate through secure settings if needed, and replay only after the endpoint is verified |

## Operator evidence

Record only safe identifiers: Checkout Session ID, Stripe customer/subscription/event IDs, Costivra organization ID in protected internal systems, event type, mode, status, and timestamps. Link the relevant Manage billing/recovery view when available. Never include raw Stripe responses or payment-method details.

## Escalation

Until an owner and support channel are assigned, every unresolved paid-onboarding case is `manual_review` and blocks paid self-serve launch. Packet 09 must record the owner, support hours, response target, cancellation/refund policy, and live credential rotation plan.

