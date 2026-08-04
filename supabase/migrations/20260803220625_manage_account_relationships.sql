alter table public.organizations
  add column if not exists parent_organization_id uuid references public.organizations(id) on delete set null;

create index if not exists organizations_parent_organization_idx
  on public.organizations (parent_organization_id)
  where parent_organization_id is not null;

comment on column public.organizations.parent_organization_id is
  'Optional parent company relationship used to group a multi-entity account hierarchy.';
