create index organization_vendor_contacts_created_by_idx
  on public.organization_vendor_contacts (created_by)
  where created_by is not null;

create index organization_vendor_contacts_updated_by_idx
  on public.organization_vendor_contacts (updated_by)
  where updated_by is not null;

create index organization_vendor_contacts_last_verified_by_idx
  on public.organization_vendor_contacts (last_verified_by)
  where last_verified_by is not null;
