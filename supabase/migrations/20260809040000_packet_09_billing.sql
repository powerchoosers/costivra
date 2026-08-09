-- Packet 09: Stripe billing records and entitlement state.
-- Stripe is the provider of record for payment state; these tables are the
-- tenant-scoped, auditable projection used by the application.

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null unique,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan_key text not null check (plan_key in ('starter', 'growth', 'enterprise')),
  status text not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, stripe_subscription_id)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  livemode boolean not null default false,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  safe_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_key text not null check (plan_key in ('starter', 'growth', 'enterprise')),
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  source_subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, feature_key)
);

create index if not exists billing_subscriptions_org_status_idx
  on public.billing_subscriptions (organization_id, status);
create index if not exists billing_entitlements_org_idx
  on public.billing_entitlements (organization_id, enabled);
create index if not exists billing_events_created_idx
  on public.billing_events (created_at desc);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_entitlements enable row level security;

revoke all on public.billing_customers from anon, authenticated;
revoke all on public.billing_subscriptions from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;
revoke all on public.billing_entitlements from anon, authenticated;

grant all on public.billing_customers to service_role;
grant all on public.billing_subscriptions to service_role;
grant all on public.billing_events to service_role;
grant all on public.billing_entitlements to service_role;

comment on table public.billing_events is 'Idempotency and audit ledger for verified Stripe webhook events; never store payment method data here.';
