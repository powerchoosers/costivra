-- Internal-only, provider-attributed company enrichment snapshots.
-- Contact enrichment is intentionally out of scope until Costivra has a
-- purpose-specific, customer-visible data-sharing consent flow.

alter table public.crm_account_profiles
  add column if not exists website text
    check (website is null or char_length(website) <= 2048);

comment on column public.crm_account_profiles.website is
  'Operator-entered account lookup URL. It is not proof of company ownership.';

create table if not exists public.crm_account_enrichments (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'apollo' check (provider = 'apollo'),
  provider_organization_id text
    check (provider_organization_id is null or char_length(provider_organization_id) <= 200),
  lookup_domain text check (lookup_domain is null or char_length(lookup_domain) <= 253),
  match_method text not null check (match_method in ('domain', 'website')),
  short_description text check (short_description is null or char_length(short_description) <= 1600),
  industry text check (industry is null or char_length(industry) <= 240),
  website text check (website is null or char_length(website) <= 2048),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 2048),
  location text check (location is null or char_length(location) <= 400),
  employee_count integer check (employee_count is null or employee_count >= 0),
  founded_year integer check (founded_year is null or founded_year between 1700 and 2100),
  status text not null default 'stale'
    check (status in ('fresh', 'stale', 'refreshing', 'no_match', 'rate_limited', 'forbidden', 'unavailable', 'invalid')),
  response_hash text check (response_hash is null or char_length(response_hash) = 64),
  last_error_code text check (
    last_error_code is null or last_error_code in (
      'no_match', 'rate_limited', 'forbidden', 'unavailable', 'invalid'
    )
  ),
  fetched_at timestamptz,
  attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_account_enrichments
  add column if not exists lookup_domain text
    check (lookup_domain is null or char_length(lookup_domain) <= 253);

alter table public.crm_account_enrichments enable row level security;

-- Only server-side internal operators use these snapshots. Browser roles get
-- neither a grant nor an RLS policy.
revoke all on table public.crm_account_enrichments from anon, authenticated;
grant select, insert, update, delete on table public.crm_account_enrichments to service_role;

comment on table public.crm_account_enrichments is
  'Internal-only allowlisted Apollo company snapshots. Never exposed to customer browser roles.';

-- A website change invalidates the existing snapshot in the same transaction,
-- so a short cache can never be reused for a different lookup domain.
create or replace function public.invalidate_crm_account_enrichment_on_website_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.website is distinct from old.website then
    update public.crm_account_enrichments
      set status = 'stale', attempted_at = null, updated_at = now()
      where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists crm_account_profile_website_enrichment_invalidation
  on public.crm_account_profiles;
create trigger crm_account_profile_website_enrichment_invalidation
  after update of website on public.crm_account_profiles
  for each row execute function public.invalidate_crm_account_enrichment_on_website_change();

revoke all on function public.invalidate_crm_account_enrichment_on_website_change()
  from public, anon, authenticated;

-- A short-lived atomic claim prevents duplicate provider credits. A ten-minute
-- lease recovers from interrupted requests; non-fresh outcomes cool down for
-- fifteen minutes rather than spending another credit on every click.
drop function if exists public.claim_internal_crm_enrichment(text, uuid, uuid);
create or replace function public.claim_internal_crm_account_enrichment(
  p_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  insert into public.crm_account_enrichments (
    organization_id, match_method, status, attempted_at, updated_at
  ) values (
    p_organization_id, 'domain', 'refreshing', now(), now()
  )
  on conflict (organization_id) do update
    set status = 'refreshing', attempted_at = now(), last_error_code = null, updated_at = now()
    where (
      public.crm_account_enrichments.status = 'refreshing'
      and coalesce(public.crm_account_enrichments.attempted_at, '-infinity'::timestamptz) < now() - interval '10 minutes'
    ) or (
      public.crm_account_enrichments.status = 'fresh'
      and (
        public.crm_account_enrichments.fetched_at is null
        or public.crm_account_enrichments.fetched_at < now() - interval '30 days'
      )
    ) or (
      public.crm_account_enrichments.status not in ('fresh', 'refreshing')
      and coalesce(public.crm_account_enrichments.attempted_at, '-infinity'::timestamptz) < now() - interval '15 minutes'
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_internal_crm_account_enrichment(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_internal_crm_account_enrichment(uuid)
  to service_role;
