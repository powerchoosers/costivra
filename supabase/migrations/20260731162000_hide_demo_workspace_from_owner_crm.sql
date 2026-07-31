alter table public.crm_account_profiles
  add column if not exists visible_in_crm boolean not null default true,
  add column if not exists visibility_reason text;

comment on column public.crm_account_profiles.visible_in_crm is
  'Explicit owner-CRM visibility switch. Hidden workspaces remain intact in the customer portal.';

insert into public.crm_account_profiles (
  organization_id,
  visible_in_crm,
  visibility_reason
)
select distinct
  membership.organization_id,
  false,
  'Existing Costivra demo workspace'
from public.organization_memberships membership
join public.profiles profile on profile.id = membership.user_id
where lower(profile.email) = 'demo@costivra.com'
on conflict (organization_id) do update
set
  visible_in_crm = excluded.visible_in_crm,
  visibility_reason = excluded.visibility_reason,
  updated_at = now();

