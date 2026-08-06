alter table public.crm_account_profiles
  add column if not exists phone text
    check (phone is null or char_length(phone) <= 80);

comment on column public.crm_account_profiles.phone is
  'Operator-entered account phone override. Provider enrichment remains preserved separately.';

create or replace function public.manage_update_account_record(
  p_organization_id uuid,
  p_actor_id uuid,
  p_expected_updated_at timestamptz,
  p_updates jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
  v_parent uuid;
  v_primary uuid;
begin
  select updated_at into v_updated_at
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_updated_at <> p_expected_updated_at then raise exception 'RECORD_CONFLICT'; end if;

  v_parent := nullif(p_updates->>'parent_organization_id', '')::uuid;
  if v_parent = p_organization_id or exists (
    with recursive ancestors as (
      select id, parent_organization_id from public.organizations where id = v_parent
      union all
      select o.id, o.parent_organization_id
      from public.organizations o
      join ancestors a on o.id = a.parent_organization_id
    )
    select 1 from ancestors where id = p_organization_id
  ) then raise exception 'INVALID_PARENT'; end if;

  v_primary := nullif(p_updates->>'primary_contact_id', '')::uuid;
  if v_primary is not null and not exists (
    select 1 from public.crm_contacts
    where id = v_primary and organization_id = p_organization_id
  ) then raise exception 'INVALID_PRIMARY_CONTACT'; end if;

  update public.organizations set
    name = coalesce(p_updates->>'name', name),
    legal_name = coalesce(p_updates->>'legal_name', legal_name),
    industry = case when p_updates ? 'industry' then nullif(p_updates->>'industry', '') else industry end,
    employee_count_range = coalesce(p_updates->>'employee_count_range', employee_count_range),
    annual_revenue_range = coalesce(p_updates->>'annual_revenue_range', annual_revenue_range),
    timezone = coalesce(p_updates->>'timezone', timezone),
    currency = coalesce(p_updates->>'currency', currency),
    parent_organization_id = case when p_updates ? 'parent_organization_id' then v_parent else parent_organization_id end,
    updated_at = now()
  where id = p_organization_id
  returning updated_at into v_updated_at;

  insert into public.crm_account_profiles (
    organization_id, lifecycle_stage, assigned_to, next_follow_up_at, next_step,
    private_notes, visible_in_crm, website, phone, updated_at
  ) values (
    p_organization_id,
    coalesce(p_updates->>'lifecycle_stage', 'onboarding'),
    nullif(p_updates->>'assigned_to', '')::uuid,
    nullif(p_updates->>'next_follow_up_at', '')::timestamptz,
    nullif(p_updates->>'next_step', ''),
    nullif(p_updates->>'private_notes', ''),
    coalesce((p_updates->>'visible_in_crm')::boolean, true),
    nullif(p_updates->>'website', ''),
    nullif(p_updates->>'phone', ''),
    now()
  ) on conflict (organization_id) do update set
    lifecycle_stage = coalesce(excluded.lifecycle_stage, public.crm_account_profiles.lifecycle_stage),
    assigned_to = coalesce(excluded.assigned_to, public.crm_account_profiles.assigned_to),
    next_follow_up_at = coalesce(excluded.next_follow_up_at, public.crm_account_profiles.next_follow_up_at),
    next_step = coalesce(excluded.next_step, public.crm_account_profiles.next_step),
    private_notes = coalesce(excluded.private_notes, public.crm_account_profiles.private_notes),
    visible_in_crm = excluded.visible_in_crm,
    website = case when p_updates ? 'website' then nullif(p_updates->>'website', '') else public.crm_account_profiles.website end,
    phone = case when p_updates ? 'phone' then nullif(p_updates->>'phone', '') else public.crm_account_profiles.phone end,
    updated_at = now();

  if p_updates ? 'primary_contact_id' then
    update public.crm_contacts
    set is_primary = false, updated_at = now()
    where organization_id = p_organization_id;
    if v_primary is not null then
      update public.crm_contacts
      set is_primary = true, updated_at = now()
      where id = v_primary;
    end if;
  end if;

  insert into public.crm_activities (organization_id, actor_id, kind, direction, subject)
  values (p_organization_id, p_actor_id, 'status_change', 'internal', 'Account details updated');
  insert into public.internal_audit_events (actor_id, organization_id, action, resource_type, resource_id, safe_metadata)
  values (p_actor_id, p_organization_id, 'crm.account_updated', 'organization', p_organization_id, jsonb_build_object('updated', true));

  return v_updated_at;
end;
$$;

revoke execute on function public.manage_update_account_record(uuid, uuid, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.manage_update_account_record(uuid, uuid, timestamptz, jsonb)
  to service_role;
