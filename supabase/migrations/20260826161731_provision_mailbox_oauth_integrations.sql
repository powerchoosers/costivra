-- Applied migration version: 20260826161731.
create or replace function public.provision_mailbox_oauth_integrations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.integrations (
    organization_id,
    provider,
    display_name,
    description,
    status,
    configuration
  )
  values
    (
      new.id,
      'gmail',
      'Gmail',
      'Authorize read-only Gmail access, then choose the vendors Costivra may monitor. Organization admins control vendor rules and revocation.',
      'available',
      '{}'::jsonb
    ),
    (
      new.id,
      'microsoft-365',
      'Microsoft 365',
      'Authorize read-only Outlook access, then choose the vendors Costivra may monitor. Organization admins control vendor rules and revocation.',
      'available',
      '{}'::jsonb
    )
  on conflict (organization_id, provider) do nothing;

  return new;
end;
$$;

revoke all on function public.provision_mailbox_oauth_integrations()
  from public, anon, authenticated;

drop trigger if exists organizations_provision_mailbox_oauth_integrations
  on public.organizations;

create trigger organizations_provision_mailbox_oauth_integrations
after insert on public.organizations
for each row execute function public.provision_mailbox_oauth_integrations();

insert into public.integrations (
  organization_id,
  provider,
  display_name,
  description,
  status,
  configuration
)
select
  organization.id,
  provider.provider,
  provider.display_name,
  provider.description,
  'available',
  '{}'::jsonb
from public.organizations as organization
cross join (
  values
    (
      'gmail',
      'Gmail',
      'Authorize read-only Gmail access, then choose the vendors Costivra may monitor. Organization admins control vendor rules and revocation.'
    ),
    (
      'microsoft-365',
      'Microsoft 365',
      'Authorize read-only Outlook access, then choose the vendors Costivra may monitor. Organization admins control vendor rules and revocation.'
    )
) as provider(provider, display_name, description)
on conflict (organization_id, provider) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  updated_at = now();
