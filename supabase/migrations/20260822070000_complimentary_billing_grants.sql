-- Allow an explicitly recorded complimentary grant without pretending that
-- Stripe collected payment or created a Stripe subscription.
alter table public.billing_subscriptions
  alter column stripe_customer_id drop not null,
  alter column stripe_subscription_id drop not null,
  add column if not exists billing_source text not null default 'stripe';

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_billing_source_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_billing_source_check
  check (billing_source in ('stripe', 'complimentary'));

create unique index if not exists billing_complimentary_subscription_org_idx
  on public.billing_subscriptions (organization_id)
  where billing_source = 'complimentary';

comment on column public.billing_subscriptions.billing_source is
  'Whether access comes from Stripe or an explicitly granted complimentary workspace entitlement.';
