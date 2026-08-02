-- Give every organization member a durable CRM contact record. The owner/member
-- relationship is the source of truth for workspace access; crm_contacts is the
-- durable CRM representation used by the owner portal.

create or replace function private.sync_membership_to_crm_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile public.profiles%rowtype;
  member_email text;
  member_name text;
begin
  select * into member_profile
  from public.profiles
  where id = new.user_id;

  member_email := lower(nullif(btrim(coalesce(member_profile.email, '')), ''));
  if member_email is null then
    return new;
  end if;

  member_name := coalesce(
    nullif(btrim(coalesce(member_profile.full_name, '')), ''),
    member_email
  );

  if not exists (
    select 1
    from public.crm_contacts contact
    where contact.organization_id = new.organization_id
      and (
        contact.profile_id = new.user_id
        or lower(contact.email) = member_email
      )
  ) then
    insert into public.crm_contacts (
      organization_id,
      profile_id,
      full_name,
      email,
      title,
      is_primary,
      status
    ) values (
      new.organization_id,
      new.user_id,
      member_name,
      member_email,
      case when new.role::text = 'owner' then 'Owner' else initcap(new.role::text) end,
      new.role::text = 'owner',
      'active'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_membership_to_crm_contact() from public, anon, authenticated;

drop trigger if exists on_membership_created_sync_crm_contact
  on public.organization_memberships;
create trigger on_membership_created_sync_crm_contact
  after insert on public.organization_memberships
  for each row execute procedure private.sync_membership_to_crm_contact();

-- Repair memberships created before the trigger existed. Match by profile first,
-- then email, so an existing hand-created CRM contact is not duplicated.
insert into public.crm_contacts (
  organization_id,
  profile_id,
  full_name,
  email,
  title,
  is_primary,
  status
)
select
  membership.organization_id,
  profile.id,
  coalesce(nullif(btrim(profile.full_name), ''), lower(btrim(profile.email))),
  lower(btrim(profile.email)),
  case when membership.role::text = 'owner' then 'Owner' else initcap(membership.role::text) end,
  membership.role::text = 'owner',
  'active'
from public.organization_memberships membership
join public.profiles profile on profile.id = membership.user_id
where nullif(btrim(profile.email), '') is not null
  and not exists (
    select 1
    from public.crm_contacts contact
    where contact.organization_id = membership.organization_id
      and (
        contact.profile_id = membership.user_id
        or lower(contact.email) = lower(btrim(profile.email))
      )
  );
