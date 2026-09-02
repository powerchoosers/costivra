-- Service-only ledger for Costivra-owned Twilio provisioning effects.
-- These actions are not tenant actions, so they must not be written to the
-- tenant-scoped external_side_effects table (which requires organization_id).
create table if not exists public.internal_voice_side_effects (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('twilio_number_purchase')),
  destination text not null,
  idempotency_key text not null unique,
  request_hash text not null,
  status text not null check (status in ('claimed', 'sent', 'failed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  actor_id uuid references public.internal_staff_users(user_id) on delete set null,
  provider text not null default 'twilio' check (provider = 'twilio'),
  provider_reference text,
  authorized_at timestamptz,
  authorization_method text not null check (authorization_method = 'explicit_purchase_action'),
  sanitized_request_metadata jsonb not null default '{}'::jsonb,
  last_error text,
  retry_count integer not null default 0 check (retry_count >= 0),
  failure_class text,
  trace_id uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.internal_voice_side_effects enable row level security;
revoke all on table public.internal_voice_side_effects from anon, authenticated;
grant all on table public.internal_voice_side_effects to service_role;
create policy "deny browser access to internal voice side effects"
  on public.internal_voice_side_effects
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.internal_voice_side_effects is
  'Service-only ledger for Costivra-owned Twilio number provisioning. It is intentionally separate from tenant-scoped external_side_effects.';
