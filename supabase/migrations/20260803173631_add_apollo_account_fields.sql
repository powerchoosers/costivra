-- Apollo company snapshots keep provider-sourced fields separate from the
-- operator-maintained account record. They are read by the internal server
-- repository only; browser roles remain revoked by the original migration.
alter table public.crm_account_enrichments
  add column if not exists name text
    check (name is null or char_length(name) <= 240),
  add column if not exists logo_url text
    check (logo_url is null or char_length(logo_url) <= 2048),
  add column if not exists technology_names text[] not null default '{}'::text[];

comment on column public.crm_account_enrichments.name is
  'Apollo company name used when the provider selected the account match.';
comment on column public.crm_account_enrichments.logo_url is
  'Provider logo URL; fetched only through the authenticated Costivra logo proxy.';
comment on column public.crm_account_enrichments.technology_names is
  'Apollo-reported technology names, retained as provider snapshot data.';
