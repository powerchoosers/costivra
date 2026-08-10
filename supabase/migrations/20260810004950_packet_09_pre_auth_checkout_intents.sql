-- Packet 09/10: a short-lived, service-only handoff between an anonymous
-- plan selection, Stripe Checkout, and signed webhook provisioning.
-- This table intentionally contains the minimum contact details needed to
-- create or reuse the Costivra owner after payment confirmation. It is never
-- exposed through the browser Data API.

create table if not exists public.billing_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  email text not null,
  full_name text not null,
  company_name text not null,
  plan_key text not null check (plan_key in ('starter', 'growth', 'enterprise')),
  stripe_mode text not null check (stripe_mode in ('test', 'live')),
  status text not null default 'created' check (status in ('created', 'checkout_open', 'payment_confirmed', 'provisioned', 'manual_review', 'failed', 'expired')),
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  next_action text check (next_action in ('activate_password', 'sign_in', 'contact_support')),
  safe_error text,
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create index if not exists billing_checkout_intents_email_idx
  on public.billing_checkout_intents (lower(email), created_at desc);
create index if not exists billing_checkout_intents_status_idx
  on public.billing_checkout_intents (status, updated_at desc);
create index if not exists billing_checkout_intents_org_idx
  on public.billing_checkout_intents (organization_id, updated_at desc);

alter table public.billing_checkout_intents enable row level security;
revoke all on public.billing_checkout_intents from anon, authenticated;
grant all on public.billing_checkout_intents to service_role;

comment on table public.billing_checkout_intents is 'Service-only, idempotent bridge from pre-auth Stripe Checkout to signed paid workspace provisioning; never grant access from this row alone.';
