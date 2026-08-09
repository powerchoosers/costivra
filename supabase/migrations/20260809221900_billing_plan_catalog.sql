-- Owner-managed billing catalog. Stripe remains the payment provider of record;
-- this table stores the currently published price and the copy shown by Costivra.
create table if not exists public.billing_plan_catalog (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null check (plan_key in ('starter', 'growth', 'enterprise')),
  stripe_mode text not null check (stripe_mode in ('test', 'live')),
  display_name text not null,
  description text not null default '',
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'usd' check (char_length(currency) = 3),
  interval text not null default 'month' check (interval in ('month', 'year', 'custom')),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  stripe_product_id text,
  stripe_price_id text,
  active boolean not null default true,
  updated_by uuid references public.internal_staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, stripe_mode),
  check ((plan_key = 'enterprise' and interval = 'custom') or (plan_key <> 'enterprise' and interval in ('month', 'year')))
);

create index if not exists billing_plan_catalog_mode_active_idx
  on public.billing_plan_catalog (stripe_mode, active, plan_key);

insert into public.billing_plan_catalog (plan_key, stripe_mode, display_name, description, amount_cents, interval, features)
values
  ('starter', 'test', 'Starter', 'Evidence-backed cost review for a focused operating team.', 14900, 'month', '["Up to three active expense accounts", "Monthly monitoring", "Renewal reminders"]'::jsonb),
  ('growth', 'test', 'Growth', 'Broader monitoring and review workflows for a growing business.', 59900, 'month', '["Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports"]'::jsonb),
  ('enterprise', 'test', 'Enterprise', 'A tailored deployment with a reviewed commercial agreement.', null, 'custom', '["SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support"]'::jsonb),
  ('starter', 'live', 'Starter', 'Evidence-backed cost review for a focused operating team.', 14900, 'month', '["Up to three active expense accounts", "Monthly monitoring", "Renewal reminders"]'::jsonb),
  ('growth', 'live', 'Growth', 'Broader monitoring and review workflows for a growing business.', 59900, 'month', '["Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports"]'::jsonb),
  ('enterprise', 'live', 'Enterprise', 'A tailored deployment with a reviewed commercial agreement.', null, 'custom', '["SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support"]'::jsonb)
on conflict (plan_key, stripe_mode) do nothing;

alter table public.billing_plan_catalog enable row level security;
revoke all on public.billing_plan_catalog from anon, authenticated;
grant all on public.billing_plan_catalog to service_role;

comment on table public.billing_plan_catalog is 'Owner-managed Costivra pricing copy and the active Stripe Price for each billing mode.';
