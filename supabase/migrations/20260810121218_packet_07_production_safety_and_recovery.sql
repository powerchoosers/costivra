-- Packet 07 production safety: unsubscribe compliance, worker observability,
-- and retry classification. These tables are service-role-only; public
-- unsubscribe requests are resolved through a hashed opaque token.

create table if not exists public.crm_outreach_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  sequence_id uuid references public.crm_sequences(id) on delete set null,
  email_normalized text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email_normalized = lower(trim(email_normalized)))
);

create index if not exists crm_outreach_unsubscribe_tokens_contact_idx
  on public.crm_outreach_unsubscribe_tokens (contact_id, created_at desc);
create index if not exists crm_outreach_unsubscribe_tokens_expiry_idx
  on public.crm_outreach_unsubscribe_tokens (expires_at)
  where used_at is null and revoked_at is null;

create table if not exists public.crm_sequence_worker_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running','completed','completed_with_errors','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  claimed_count integer not null default 0 check (claimed_count >= 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_sequence_worker_runs_started_idx
  on public.crm_sequence_worker_runs (started_at desc);

alter table public.external_side_effects
  add column if not exists failure_class text check (
    failure_class is null or failure_class in ('safe_retry','provider_ambiguous','permanent','stopped')
  ),
  add column if not exists last_provider_event_at timestamptz;

create index if not exists external_side_effects_sequence_recovery_idx
  on public.external_side_effects (status, updated_at desc)
  where authorization_method = 'sequence_step';

alter table public.crm_outreach_unsubscribe_tokens enable row level security;
alter table public.crm_sequence_worker_runs enable row level security;
revoke all on public.crm_outreach_unsubscribe_tokens, public.crm_sequence_worker_runs from anon, authenticated;
grant all on public.crm_outreach_unsubscribe_tokens, public.crm_sequence_worker_runs to service_role;

alter table public.crm_sequences
  alter column daily_send_limit set default 10;

comment on table public.crm_outreach_unsubscribe_tokens is
  'Opaque, hashed unsubscribe tokens for sequence mail. Service-role-only; no PII is encoded in the token.';
comment on table public.crm_sequence_worker_runs is
  'Bounded sequence worker health and recovery ledger. Service-role-only.';
