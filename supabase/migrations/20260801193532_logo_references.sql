-- Logo.dev references are provider URLs only. Tokens remain server-only and are
-- attached only while the authenticated image proxy retrieves an image.
alter table public.organizations
  add column if not exists logo_url text,
  add column if not exists logo_provider text,
  add column if not exists logo_resolved_at timestamptz;

alter table public.vendors
  add column if not exists logo_url text,
  add column if not exists logo_provider text,
  add column if not exists logo_resolved_at timestamptz;

comment on column public.organizations.logo_url is
  'Provider logo URL without credentials; fetched through Costivra authenticated proxy.';
comment on column public.vendors.logo_url is
  'Provider logo URL without credentials; fetched through Costivra authenticated proxy.';
