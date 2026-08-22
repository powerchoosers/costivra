-- Customer-owned contact points for a vendor relationship. This is deliberately
-- separate from the internal CRM contact directory: a vendor's billing desk,
-- implementation lead, broker, or consultant is part of the customer's
-- relationship record, not a Costivra sales contact.
alter table public.organization_vendors
  add constraint organization_vendors_organization_id_id_key
  unique (organization_id, id);

create table public.organization_vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_vendor_id uuid not null,
  contact_type text not null default 'vendor'
    check (contact_type in ('vendor', 'billing', 'support', 'broker', 'consultant', 'other')),
  company_name text,
  contact_name text not null,
  title text,
  email text,
  phone text,
  phone_extension text,
  website_url text,
  preferred_channel text not null default 'email'
    check (preferred_channel in ('email', 'phone', 'portal', 'other')),
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  notes text,
  last_verified_at timestamptz,
  last_verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_vendor_contacts_vendor_scope_fk
    foreign key (organization_id, organization_vendor_id)
    references public.organization_vendors(organization_id, id)
    on delete cascade,
  constraint organization_vendor_contacts_name_check
    check (length(trim(contact_name)) between 1 and 160),
  constraint organization_vendor_contacts_contact_method_check
    check (
      nullif(trim(email), '') is not null
      or nullif(trim(phone), '') is not null
      or nullif(trim(website_url), '') is not null
    ),
  constraint organization_vendor_contacts_notes_length_check
    check (notes is null or length(notes) <= 2000)
);

create index organization_vendor_contacts_relationship_idx
  on public.organization_vendor_contacts (organization_id, organization_vendor_id, status, contact_type);

create unique index organization_vendor_contacts_primary_type_idx
  on public.organization_vendor_contacts (organization_vendor_id, contact_type)
  where is_primary and status = 'active';

alter table public.organization_vendor_contacts enable row level security;

-- Browser access is read-only. Costivra's authenticated server routes enforce
-- editor/admin permissions for writes, while this policy still protects direct
-- Data API reads with the same organization boundary.
revoke all on public.organization_vendor_contacts from anon, authenticated;
grant select on public.organization_vendor_contacts to authenticated;

create policy "Members read organization vendor contacts"
  on public.organization_vendor_contacts
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = organization_vendor_contacts.organization_id
        and membership.user_id = (select auth.uid())
    )
  );

comment on table public.organization_vendor_contacts is
  'Tenant-scoped vendor, billing, support, broker, and consultant contact points for a customer vendor relationship.';
comment on column public.organization_vendor_contacts.contact_type is
  'Relationship role, not a Costivra CRM contact classification. Broker and consultant records remain customer-controlled and disclosed.';
comment on column public.organization_vendor_contacts.last_verified_at is
  'Optional customer verification timestamp; absence means the contact is unverified, not that it is invalid.';
