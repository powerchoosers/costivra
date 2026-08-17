-- Service-only delivery ledger for global operations alerts.
-- It is intentionally separate from tenant-scoped external_side_effects.

create table if not exists public.operational_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.operational_alerts(id) on delete cascade,
  idempotency_key text not null unique,
  notification_kind text not null check (notification_kind in ('activation', 'reminder', 'escalation', 'recovery')),
  recipient text not null,
  request_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'suppressed')),
  provider_reference text,
  safe_error text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists operational_alert_deliveries_alert_idx
  on public.operational_alert_deliveries (alert_id, created_at desc);

alter table public.operational_alert_deliveries enable row level security;

create policy "deny browser access to operational alert deliveries"
  on public.operational_alert_deliveries
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.operational_alert_deliveries from anon, authenticated;
