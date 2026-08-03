-- Record every protected inbound worker invocation so readiness checks can
-- distinguish a configured cron secret from a worker that is actually running.

create table if not exists public.inbound_worker_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running', 'completed', 'completed_with_warnings', 'failed')),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  results jsonb not null default '[]'::jsonb,
  monitoring jsonb not null default '{}'::jsonb,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inbound_worker_runs_started_at_idx
  on public.inbound_worker_runs (started_at desc);

alter table public.inbound_worker_runs enable row level security;
revoke all privileges on table public.inbound_worker_runs from anon, authenticated;
grant select, insert, update, delete on table public.inbound_worker_runs to service_role;

comment on table public.inbound_worker_runs is
  'Server-only health and outcome ledger for the one-minute inbound document worker.';
comment on column public.inbound_worker_runs.error_code is
  'Non-sensitive operational failure category; provider responses and secrets are never stored here.';
