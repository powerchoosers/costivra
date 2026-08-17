-- Keep monthly and annual prices on the same published plan without making
-- the public pricing page guess which Stripe Price is active.
alter table public.billing_plan_catalog
  add column if not exists annual_amount_cents integer,
  add column if not exists annual_stripe_price_id text;

alter table public.billing_plan_catalog
  drop constraint if exists billing_plan_catalog_annual_amount_cents_check;

alter table public.billing_plan_catalog
  add constraint billing_plan_catalog_annual_amount_cents_check
  check (annual_amount_cents is null or annual_amount_cents >= 0);

update public.billing_plan_catalog
set annual_amount_cents = round(amount_cents * 12 * 0.8)::integer
where plan_key <> 'enterprise'
  and annual_amount_cents is null
  and amount_cents is not null;

comment on column public.billing_plan_catalog.annual_amount_cents is 'Annual subscription amount in cents, billed once per year.';
comment on column public.billing_plan_catalog.annual_stripe_price_id is 'Active Stripe Price for the annual subscription option.';

update public.billing_plan_catalog
set features = case plan_key
  when 'starter' then '["Up to three active expense accounts", "Monthly monitoring", "Renewal reminders", "Source-linked findings", "Evidence stays attached", "Human approval controls"]'::jsonb
  when 'growth' then '["Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports", "Source-linked findings", "Human approval controls"]'::jsonb
  when 'enterprise' then '["SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support", "Audit history", "Reviewed commercial agreement"]'::jsonb
  else features
end
where plan_key in ('starter', 'growth', 'enterprise');
