-- A location is a physical service address. A meter/service point is a child
-- of that location; several meters may therefore share one address.
alter table public.locations
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.energy_meters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  meter_identifier text,
  service_identifier text,
  account_number_last4 text,
  utility_territory text,
  display_name text,
  status text not null default 'active' check (status in ('active', 'inactive', 'needs_review')),
  meter_multiplier numeric(18,6) check (meter_multiplier is null or meter_multiplier >= 0),
  first_seen_document_id uuid references public.documents(id) on delete set null,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(btrim(meter_identifier), '') is not null or nullif(btrim(service_identifier), '') is not null),
  check (account_number_last4 is null or account_number_last4 ~ '^[A-Za-z0-9]{2,4}$')
);

create unique index if not exists energy_meters_org_meter_identifier_uidx
  on public.energy_meters (organization_id, lower(meter_identifier))
  where meter_identifier is not null;

create unique index if not exists energy_meters_org_service_identifier_uidx
  on public.energy_meters (organization_id, lower(service_identifier))
  where service_identifier is not null;

create index if not exists energy_meters_location_idx
  on public.energy_meters (organization_id, location_id, status);

alter table public.invoices
  add column if not exists energy_meter_id uuid references public.energy_meters(id) on delete set null;

create index if not exists invoices_energy_meter_idx
  on public.invoices (organization_id, energy_meter_id)
  where energy_meter_id is not null;

alter table public.energy_meters enable row level security;

revoke all on public.energy_meters from anon, authenticated;
grant select on public.energy_meters to authenticated;

create policy "Members read energy meters" on public.energy_meters
  for select to authenticated
  using (exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = energy_meters.organization_id
      and membership.user_id = (select auth.uid())
  ));

comment on table public.energy_meters is
  'Tenant-scoped energy meters/service points. Multiple meters may belong to one physical location.';
comment on column public.energy_meters.meter_identifier is
  'Utility meter identifier as shown on a source document; retained server-side for matching.';
comment on column public.energy_meters.service_identifier is
  'Utility service point identifier such as an ESI ID; retained server-side for matching.';
comment on column public.locations.metadata is
  'Non-authoritative provenance and workflow metadata for the location; the address remains the authoritative location identity.';
