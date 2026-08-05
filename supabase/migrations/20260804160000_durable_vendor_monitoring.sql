-- Migration: 20260804160000_durable_vendor_monitoring.sql
-- Description: Creates vendor_monitoring_configs table with RLS, constraints, indexes, and audit logging.

create table if not exists public.vendor_monitoring_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_vendor_id uuid not null references public.organization_vendors(id) on delete cascade,
  inbound_email_address_id uuid references public.inbound_email_addresses(id) on delete set null,
  source_method text not null check (source_method in ('email_forwarding', 'manual_forwarding', 'manual_upload')),
  state text not null check (state in ('not_configured', 'manual_tracking', 'pending_test', 'review_required', 'active', 'paused', 'attention_needed')),
  approved_sender_address text null,
  expected_cadence_days integer null check (expected_cadence_days > 0),
  grace_period_days integer null default 7 check (grace_period_days >= 0),
  test_event_id uuid references public.inbound_email_events(id) on delete set null,
  last_received_event_id uuid references public.inbound_email_events(id) on delete set null,
  test_completed_at timestamptz null,
  last_received_at timestamptz null,
  next_expected_at timestamptz null,
  paused_at timestamptz null,
  last_failure_code text null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_monitoring_configs_org_vendor_unique unique (organization_vendor_id),
  constraint vendor_monitoring_configs_active_test_check check (
    state != 'active' or source_method != 'email_forwarding' or test_completed_at is not null
  )
);

-- Indexing
create index if not exists idx_vendor_monitoring_configs_org_state on public.vendor_monitoring_configs (organization_id, state);
create index if not exists idx_vendor_monitoring_configs_org_vendor on public.vendor_monitoring_configs (organization_vendor_id);
create index if not exists idx_vendor_monitoring_configs_inbound_addr on public.vendor_monitoring_configs (inbound_email_address_id);
create index if not exists idx_vendor_monitoring_configs_next_expected on public.vendor_monitoring_configs (next_expected_at) where state = 'active';

-- Enable RLS
alter table public.vendor_monitoring_configs enable row level security;

-- RLS Policies
create policy "Users can view vendor monitoring configs for their organization"
  on public.vendor_monitoring_configs
  for select
  using (
    auth.uid() is not null
    and organization_id in (
      select organization_id
      from public.organization_memberships
      where user_id = auth.uid()
    )
  );

create policy "Admins and owners can insert vendor monitoring configs"
  on public.vendor_monitoring_configs
  for insert
  with check (
    auth.uid() is not null
    and organization_id in (
      select organization_id
      from public.organization_memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Admins and owners can update vendor monitoring configs"
  on public.vendor_monitoring_configs
  for update
  using (
    auth.uid() is not null
    and organization_id in (
      select organization_id
      from public.organization_memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Admins and owners can delete vendor monitoring configs"
  on public.vendor_monitoring_configs
  for delete
  using (
    auth.uid() is not null
    and organization_id in (
      select organization_id
      from public.organization_memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Automatically update updated_at timestamp
create or replace function public.update_vendor_monitoring_configs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_vendor_monitoring_configs_updated_at
  before update on public.vendor_monitoring_configs
  for each row
  execute function public.update_vendor_monitoring_configs_updated_at();
