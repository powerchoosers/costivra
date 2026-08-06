create or replace function public.manage_set_account_archive_state(p_organization_id uuid,p_actor_id uuid,p_archived boolean,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_prior_stage text; v_next_stage text;
begin
  if not exists (select 1 from public.organizations where id=p_organization_id for update) then raise exception 'RECORD_NOT_FOUND'; end if;
  select lifecycle_stage into v_prior_stage from public.crm_account_profiles where organization_id=p_organization_id for update;
  if p_archived then v_next_stage := 'inactive';
  else
    select safe_metadata->>'previous_lifecycle' into v_next_stage from public.internal_audit_events where organization_id=p_organization_id and action='crm.account_archived' order by created_at desc limit 1;
    if coalesce(v_next_stage not in ('lead','onboarding','active','at_risk','inactive','closed') or v_next_stage = 'inactive', true) then v_next_stage := 'onboarding'; end if;
  end if;
  insert into public.crm_account_profiles (organization_id,lifecycle_stage,visible_in_crm,visibility_reason,updated_at) values (p_organization_id,v_next_stage,not p_archived,p_reason,now()) on conflict (organization_id) do update set lifecycle_stage=excluded.lifecycle_stage,visible_in_crm=excluded.visible_in_crm,visibility_reason=excluded.visibility_reason,updated_at=now();
  insert into public.crm_activities (organization_id,actor_id,kind,direction,subject,summary) values (p_organization_id,p_actor_id,'status_change','internal',case when p_archived then 'Account archived' else 'Account restored' end,p_reason);
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,p_organization_id,case when p_archived then 'crm.account_archived' else 'crm.account_restored' end,'organization',p_organization_id,jsonb_build_object('reason',p_reason,'previous_lifecycle',case when p_archived then coalesce(v_prior_stage,'onboarding') else 'inactive' end,'new_lifecycle',v_next_stage));
end; $$;
revoke execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) to service_role;
