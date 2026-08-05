-- Migration: Record Pages Completion Overrides & Archive Support

alter table public.organization_vendors
  add column if not exists display_name_override text,
  add column if not exists category_override text,
  add column if not exists website_override text,
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid references auth.users(id) on delete set null;

alter table public.crm_contacts
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

-- Partial index to enforce unique primary contact per organization among active contacts
create unique index if not exists crm_contacts_one_primary_per_org
  on public.crm_contacts (organization_id)
  where is_primary = true and archived_at is null;
