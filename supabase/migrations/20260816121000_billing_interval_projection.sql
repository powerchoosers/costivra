alter table public.billing_checkout_intents
  add column if not exists billing_interval text not null default 'month'
  check (billing_interval in ('month', 'year'));

alter table public.billing_subscriptions
  add column if not exists billing_interval text not null default 'month'
  check (billing_interval in ('month', 'year'));

comment on column public.billing_checkout_intents.billing_interval is 'Billing cadence selected before Stripe Checkout.';
comment on column public.billing_subscriptions.billing_interval is 'Billing cadence confirmed by the Stripe subscription price.';
