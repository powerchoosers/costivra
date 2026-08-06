-- Atomic internal record lifecycle transitions. Browser roles are denied.
create or replace function public.manage_set_account_archive_state(p_organization_id uuid,p_actor_id uuid,p_archived boolean,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.organizations where id=p_organization_id for update) then raise exception 'RECORD_NOT_FOUND'; end if;
  insert into public.crm_account_profiles (organization_id,lifecycle_stage,visible_in_crm,visibility_reason,updated_at)
  values (p_organization_id,case when p_archived then 'inactive' else 'onboarding' end,not p_archived,p_reason,now())
  on conflict (organization_id) do update set lifecycle_stage=case when p_archived then 'inactive' else crm_account_profiles.lifecycle_stage end,visible_in_crm=not p_archived,visibility_reason=p_reason,updated_at=now();
  insert into public.crm_activities (organization_id,actor_id,kind,direction,subject,summary) values (p_organization_id,p_actor_id,'status_change','internal',case when p_archived then 'Account archived' else 'Account restored' end,p_reason);
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,p_organization_id,case when p_archived then 'crm.account_archived' else 'crm.account_restored' end,'organization',p_organization_id,jsonb_build_object('reason',p_reason));
end; $$;
revoke execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) to service_role;

create or replace function public.manage_set_contact_active_state(p_contact_id uuid,p_actor_id uuid,p_active boolean,p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.crm_contacts where id=p_contact_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  update public.crm_contacts set status=case when p_active then 'active' else 'inactive' end,archived_at=case when p_active then null else now() end,archived_by=case when p_active then null else p_actor_id end,is_primary=case when p_active then is_primary else false end,updated_at=now() where id=p_contact_id;
  insert into public.crm_activities (organization_id,contact_id,actor_id,kind,direction,subject,summary) values (v_org,p_contact_id,p_actor_id,'status_change','internal',case when p_active then 'Contact reactivated' else 'Contact deactivated' end,p_reason);
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,v_org,case when p_active then 'crm.contact_reactivated' else 'crm.contact_deactivated' end,'contact',p_contact_id,jsonb_build_object('reason',p_reason));
  return case when p_active then 'active' else 'inactive' end;
end; $$;
revoke execute on function public.manage_set_contact_active_state(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_set_contact_active_state(uuid,uuid,boolean,text) to service_role;
