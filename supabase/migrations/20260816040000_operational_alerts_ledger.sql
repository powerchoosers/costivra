-- Packet 05: Operational alerts ledger for real-time signal collection, deduplication, and escalation.

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  signal_key text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  category text not null check (category in ('security', 'intake', 'extraction', 'billing', 'workflow', 'system')),
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved', 'throttled')),
  first_seen_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  occurrence_count integer not null default 1,
  resolved_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint operational_alerts_signal_key_unique unique (signal_key)
);

create index if not exists operational_alerts_lookup_idx
  on public.operational_alerts (status, severity, last_seen_at desc);

alter table public.operational_alerts enable row level security;

create policy "deny browser access to operational_alerts"
  on public.operational_alerts
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.operational_alerts from anon, authenticated;

comment on table public.operational_alerts is
  'Service-only operational alerts ledger recording deduplicated and throttled system health signals.';
