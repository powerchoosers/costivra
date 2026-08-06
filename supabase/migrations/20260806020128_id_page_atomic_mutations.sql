-- Atomic, server-only record mutations for the ID-page workflow.
-- Routes authenticate and authorize first; these functions are deliberately not
-- callable by browser roles.

alter table public.audit_events
  add column if not exists safe_metadata jsonb not null default '{}'::jsonb;

create or replace function public.portal_update_vendor_relationship(
  p_relationship_id uuid,
  p_organization_id uuid,
  p_actor_id uuid,
  p_expected_updated_at timestamptz,
  p_updates jsonb,
  p_trace_id uuid default gen_random_uuid()
)
returns table (id uuid, updated_at timestamptz, relationship_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.organization_vendors%rowtype;
  v_after public.organization_vendors%rowtype;
  v_status text;
  v_cadence text;
  v_spend numeric;
begin
  select * into v_before from public.organization_vendors
  where organization_vendors.id = p_relationship_id
    and organization_vendors.organization_id = p_organization_id
  for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_before.updated_at <> p_expected_updated_at then raise exception 'RECORD_CONFLICT'; end if;

  v_status := coalesce(p_updates->>'relationship_status', v_before.relationship_status);
  v_cadence := coalesce(p_updates->>'spend_cadence', v_before.spend_cadence);
  if v_status not in ('prospect', 'active', 'inactive', 'terminated') then raise exception 'INVALID_RELATIONSHIP_STATUS'; end if;
  if v_cadence not in ('monthly', 'annual') then raise exception 'INVALID_SPEND_CADENCE'; end if;
  if p_updates ? 'annualized_spend' then
    begin v_spend := (p_updates->>'annualized_spend')::numeric; exception when others then raise exception 'INVALID_ANNUALIZED_SPEND'; end;
    if v_spend < 0 then raise exception 'INVALID_ANNUALIZED_SPEND'; end if;
  else v_spend := v_before.annualized_spend; end if;

  update public.organization_vendors set
    display_name_override = case when p_updates ? 'display_name_override' then nullif(p_updates->>'display_name_override', '') else display_name_override end,
    category_override = case when p_updates ? 'category_override' then nullif(p_updates->>'category_override', '') else category_override end,
    website_override = case when p_updates ? 'website_override' then nullif(p_updates->>'website_override', '') else website_override end,
    relationship_status = v_status,
    spend_cadence = v_cadence,
    annualized_spend = v_spend,
    ended_at = case when v_status = 'terminated' then now() when v_status = 'active' then null else ended_at end,
    ended_by = case when v_status = 'terminated' then p_actor_id when v_status = 'active' then null else ended_by end,
    updated_at = now()
  where organization_vendors.id = p_relationship_id
  returning * into v_after;

  if v_status = 'terminated' then
    update public.vendor_monitoring_configs
    set state = 'paused', paused_at = now(), updated_by = p_actor_id, updated_at = now()
    where organization_vendor_id = p_relationship_id and organization_id = p_organization_id and state <> 'paused';
  end if;

  insert into public.audit_events (organization_id, actor_type, actor_id, action, resource_type, resource_id, safe_metadata, trace_id)
  values (p_organization_id, 'user', p_actor_id, 'vendor_relationship.updated', 'vendor_relationship', p_relationship_id,
    jsonb_build_object('relationship_status', v_after.relationship_status, 'spend_cadence', v_after.spend_cadence), p_trace_id);
  return query select v_after.id, v_after.updated_at, v_after.relationship_status;
end;
$$;

revoke execute on function public.portal_update_vendor_relationship(uuid, uuid, uuid, timestamptz, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.portal_update_vendor_relationship(uuid, uuid, uuid, timestamptz, jsonb, uuid) to service_role;

create or replace function public.manage_update_account_record(p_organization_id uuid, p_actor_id uuid, p_expected_updated_at timestamptz, p_updates jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_updated_at timestamptz; v_parent uuid; v_primary uuid;
begin
  select updated_at into v_updated_at from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_updated_at <> p_expected_updated_at then raise exception 'RECORD_CONFLICT'; end if;
  v_parent := nullif(p_updates->>'parent_organization_id', '')::uuid;
  if v_parent = p_organization_id or exists (with recursive ancestors as (select id,parent_organization_id from public.organizations where id=v_parent union all select o.id,o.parent_organization_id from public.organizations o join ancestors a on o.id=a.parent_organization_id) select 1 from ancestors where id=p_organization_id) then raise exception 'INVALID_PARENT'; end if;
  v_primary := nullif(p_updates->>'primary_contact_id', '')::uuid;
  if v_primary is not null and not exists (select 1 from public.crm_contacts where id=v_primary and organization_id=p_organization_id) then raise exception 'INVALID_PRIMARY_CONTACT'; end if;
  update public.organizations set name=coalesce(p_updates->>'name',name), legal_name=coalesce(p_updates->>'legal_name',legal_name), industry=coalesce(p_updates->>'industry',industry), employee_count_range=coalesce(p_updates->>'employee_count_range',employee_count_range), annual_revenue_range=coalesce(p_updates->>'annual_revenue_range',annual_revenue_range), timezone=coalesce(p_updates->>'timezone',timezone), currency=coalesce(p_updates->>'currency',currency), parent_organization_id=case when p_updates ? 'parent_organization_id' then v_parent else parent_organization_id end, updated_at=now() where id=p_organization_id returning updated_at into v_updated_at;
  insert into public.crm_account_profiles (organization_id,lifecycle_stage,assigned_to,next_follow_up_at,next_step,private_notes,visible_in_crm,website,updated_at) values (p_organization_id,coalesce(p_updates->>'lifecycle_stage','onboarding'),nullif(p_updates->>'assigned_to','')::uuid,nullif(p_updates->>'next_follow_up_at','')::timestamptz,nullif(p_updates->>'next_step',''),nullif(p_updates->>'private_notes',''),coalesce((p_updates->>'visible_in_crm')::boolean,true),nullif(p_updates->>'website',''),now()) on conflict (organization_id) do update set lifecycle_stage=coalesce(excluded.lifecycle_stage,crm_account_profiles.lifecycle_stage),assigned_to=coalesce(excluded.assigned_to,crm_account_profiles.assigned_to),next_follow_up_at=coalesce(excluded.next_follow_up_at,crm_account_profiles.next_follow_up_at),next_step=coalesce(excluded.next_step,crm_account_profiles.next_step),private_notes=coalesce(excluded.private_notes,crm_account_profiles.private_notes),visible_in_crm=excluded.visible_in_crm,website=coalesce(excluded.website,crm_account_profiles.website),updated_at=now();
  if p_updates ? 'primary_contact_id' then update public.crm_contacts set is_primary=false,updated_at=now() where organization_id=p_organization_id; if v_primary is not null then update public.crm_contacts set is_primary=true,updated_at=now() where id=v_primary; end if; end if;
  insert into public.crm_activities (organization_id,actor_id,kind,direction,subject) values (p_organization_id,p_actor_id,'status_change','internal','Account details updated');
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,p_organization_id,'crm.account_updated','organization',p_organization_id,jsonb_build_object('updated',true));
  return v_updated_at;
end; $$;
revoke execute on function public.manage_update_account_record(uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.manage_update_account_record(uuid,uuid,timestamptz,jsonb) to service_role;

create or replace function public.manage_update_contact_record(p_contact_id uuid,p_actor_id uuid,p_expected_updated_at timestamptz,p_updates jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_old_org uuid; v_org uuid; v_updated_at timestamptz; v_primary boolean;
begin
  select organization_id,updated_at into v_old_org,v_updated_at from public.crm_contacts where id=p_contact_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_updated_at <> p_expected_updated_at then raise exception 'RECORD_CONFLICT'; end if;
  v_org:=coalesce(nullif(p_updates->>'organization_id','')::uuid,v_old_org); if not exists(select 1 from public.organizations where id=v_org) then raise exception 'INVALID_ORGANIZATION'; end if;
  v_primary:=coalesce((p_updates->>'is_primary')::boolean,false);
  if v_primary then update public.crm_contacts set is_primary=false,updated_at=now() where organization_id in (v_old_org,v_org); end if;
  update public.crm_contacts set full_name=coalesce(p_updates->>'full_name',full_name),email=coalesce(lower(p_updates->>'email'),email),phone=coalesce(p_updates->>'phone',phone),title=coalesce(p_updates->>'title',title),organization_id=v_org,is_primary=case when p_updates ? 'is_primary' then v_primary else is_primary end,status=coalesce(p_updates->>'status',status),updated_at=now() where id=p_contact_id returning updated_at into v_updated_at;
  insert into public.crm_activities (organization_id,contact_id,actor_id,kind,direction,subject) values (v_org,p_contact_id,p_actor_id,'status_change','internal','Contact details updated');
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,v_org,'crm.contact_updated','contact',p_contact_id,jsonb_build_object('updated',true));
  return v_updated_at;
end; $$;
revoke execute on function public.manage_update_contact_record(uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.manage_update_contact_record(uuid,uuid,timestamptz,jsonb) to service_role;
