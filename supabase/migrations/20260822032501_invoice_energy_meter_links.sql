-- A commercial statement may cover several meters/service points. Keep the
-- legacy invoices.energy_meter_id as the primary meter, and retain every
-- source-backed meter relationship here.
alter table public.energy_meters
  add constraint energy_meters_id_organization_id_key unique (id, organization_id);

create table if not exists public.invoice_energy_meters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  energy_meter_id uuid not null,
  service_index integer not null check (service_index >= 0 and service_index <= 200),
  source_key text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (invoice_id, energy_meter_id),
  unique (invoice_id, service_index),
  foreign key (invoice_id, organization_id)
    references public.invoices(id, organization_id) on delete cascade,
  foreign key (energy_meter_id, organization_id)
    references public.energy_meters(id, organization_id) on delete cascade,
  check (source_key is null or char_length(btrim(source_key)) between 1 and 120)
);

create index if not exists invoice_energy_meters_org_invoice_idx
  on public.invoice_energy_meters (organization_id, invoice_id);

create index if not exists invoice_energy_meters_org_meter_idx
  on public.invoice_energy_meters (organization_id, energy_meter_id);

alter table public.invoice_energy_meters enable row level security;

revoke all on public.invoice_energy_meters from anon, authenticated;
grant select on public.invoice_energy_meters to authenticated;

create policy "Members read invoice energy meter links" on public.invoice_energy_meters
  for select to authenticated
  using (exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = invoice_energy_meters.organization_id
      and membership.user_id = (select auth.uid())
  ));

comment on table public.invoice_energy_meters is
  'Tenant-scoped source relationships between invoices and one or more energy meters/service points.';
