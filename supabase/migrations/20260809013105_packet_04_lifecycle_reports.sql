-- Packet 04: tenant-owned report schedules and delivery history.
-- Customer browser roles never write these tables directly; the portal API
-- validates recipients against organization membership before service-role use.

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_definition_id uuid not null references public.report_definitions(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','archived')),
  cadence text not null check (cadence in ('weekly','monthly')),
  timezone text not null default 'America/Chicago',
  weekday smallint,
  day_of_month smallint,
  send_time_local time not null default '08:00',
  recipient_emails text[] not null default '{}'::text[],
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(recipient_emails) > 0),
  check ((cadence = 'weekly' and weekday between 0 and 6 and day_of_month is null)
      or (cadence = 'monthly' and day_of_month between 1 and 28 and weekday is null))
);

create table if not exists public.report_delivery_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_definition_id uuid not null references public.report_definitions(id) on delete cascade,
  report_schedule_id uuid references public.report_schedules(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'claimed' check (status in ('claimed','pending','accepted','delivered','failed','bounced','suppressed','skipped')),
  external_side_effect_id uuid references public.external_side_effects(id) on delete set null,
  provider_message_id text,
  generated_at timestamptz,
  completed_at timestamptz,
  safe_error text,
  created_at timestamptz not null default now(),
  unique (report_schedule_id, scheduled_for)
);

create index if not exists report_schedules_due_idx
  on public.report_schedules (status, next_run_at) where status = 'active';
create index if not exists report_schedules_org_idx
  on public.report_schedules (organization_id, status);
create index if not exists report_delivery_runs_org_idx
  on public.report_delivery_runs (organization_id, created_at desc);
create index if not exists report_delivery_runs_provider_idx
  on public.report_delivery_runs (provider_message_id) where provider_message_id is not null;

alter table public.report_schedules enable row level security;
alter table public.report_delivery_runs enable row level security;
revoke all on public.report_schedules, public.report_delivery_runs from anon, authenticated;
grant all on public.report_schedules, public.report_delivery_runs to service_role;

comment on table public.report_schedules is 'Tenant-owned lifecycle report schedules; mutations go through the authenticated portal API.';
comment on table public.report_delivery_runs is 'Idempotent report delivery claims and provider delivery truth.';
