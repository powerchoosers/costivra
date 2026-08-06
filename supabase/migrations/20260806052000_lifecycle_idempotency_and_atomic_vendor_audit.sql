-- Lifecycle requests are safely repeatable: an unchanged state does not create
-- another activity or audit event. Vendor lifecycle evidence is written in the
-- same transaction as the status update and monitoring pause.

create or replace function public.manage_set_account_archive_state(p_organization_id uuid,p_actor_id uuid,p_archived boolean,p_reason text)
returns void language plpgsql security definer set search_path = '' as $function$
declare v_prior_stage text; v_next_stage text; v_visible boolean;
begin
  if not exists (select 1 from public.organizations where id=p_organization_id for update) then raise exception 'RECORD_NOT_FOUND'; end if;
  select lifecycle_stage,visible_in_crm into v_prior_stage,v_visible from public.crm_account_profiles where organization_id=p_organization_id for update;
  if found and v_visible = not p_archived then return; end if;
  if p_archived then v_next_stage := 'inactive';
  else
    select safe_metadata->>'previous_lifecycle' into v_next_stage from public.internal_audit_events where organization_id=p_organization_id and action='crm.account_archived' order by created_at desc limit 1;
    if coalesce(v_next_stage not in ('lead','onboarding','active','at_risk','inactive','closed') or v_next_stage = 'inactive', true) then v_next_stage := 'onboarding'; end if;
  end if;
  insert into public.crm_account_profiles (organization_id,lifecycle_stage,visible_in_crm,visibility_reason,updated_at) values (p_organization_id,v_next_stage,not p_archived,p_reason,now()) on conflict (organization_id) do update set lifecycle_stage=excluded.lifecycle_stage,visible_in_crm=excluded.visible_in_crm,visibility_reason=excluded.visibility_reason,updated_at=now();
  insert into public.crm_activities (organization_id,actor_id,kind,direction,subject,summary) values (p_organization_id,p_actor_id,'status_change','internal',case when p_archived then 'Account archived' else 'Account restored' end,p_reason);
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,p_organization_id,case when p_archived then 'crm.account_archived' else 'crm.account_restored' end,'organization',p_organization_id,jsonb_build_object('reason',p_reason,'previous_lifecycle',case when p_archived then coalesce(v_prior_stage,'onboarding') else 'inactive' end,'new_lifecycle',v_next_stage));
end; $function$;

create or replace function public.manage_set_contact_active_state(p_contact_id uuid,p_actor_id uuid,p_active boolean,p_reason text)
returns text language plpgsql security definer set search_path = '' as $function$
declare v_org uuid; v_status text;
begin
  select organization_id,status into v_org,v_status from public.crm_contacts where id=p_contact_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_status = (case when p_active then 'active' else 'inactive' end) then return v_status; end if;
  update public.crm_contacts set status=case when p_active then 'active' else 'inactive' end,archived_at=case when p_active then null else now() end,archived_by=case when p_active then null else p_actor_id end,is_primary=case when p_active then is_primary else false end,updated_at=now() where id=p_contact_id;
  insert into public.crm_activities (organization_id,contact_id,actor_id,kind,direction,subject,summary) values (v_org,p_contact_id,p_actor_id,'status_change','internal',case when p_active then 'Contact reactivated' else 'Contact deactivated' end,p_reason);
  insert into public.internal_audit_events (actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values (p_actor_id,v_org,case when p_active then 'crm.contact_reactivated' else 'crm.contact_deactivated' end,'contact',p_contact_id,jsonb_build_object('reason',p_reason));
  return case when p_active then 'active' else 'inactive' end;
end; $function$;

create or replace function public.portal_update_vendor_relationship(p_relationship_id uuid,p_organization_id uuid,p_actor_id uuid,p_expected_updated_at timestamptz,p_updates jsonb,p_trace_id uuid default gen_random_uuid())
returns table (id uuid, updated_at timestamptz, relationship_status text) language plpgsql security definer set search_path = '' as $function$
declare v_before public.organization_vendors%rowtype; v_after public.organization_vendors%rowtype; v_status text; v_cadence text; v_spend numeric; v_action text;
begin
  select * into v_before from public.organization_vendors where organization_vendors.id=p_relationship_id and organization_vendors.organization_id=p_organization_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_before.updated_at <> p_expected_updated_at then raise exception 'RECORD_CONFLICT'; end if;
  v_status:=coalesce(p_updates->>'relationship_status',v_before.relationship_status); v_cadence:=coalesce(p_updates->>'spend_cadence',v_before.spend_cadence);
  if v_status not in ('prospect','active','inactive','terminated') then raise exception 'INVALID_RELATIONSHIP_STATUS'; end if;
  if v_cadence not in ('monthly','annual') then raise exception 'INVALID_SPEND_CADENCE'; end if;
  if p_updates ? 'annualized_spend' then begin v_spend:=(p_updates->>'annualized_spend')::numeric; exception when others then raise exception 'INVALID_ANNUALIZED_SPEND'; end; if v_spend<0 then raise exception 'INVALID_ANNUALIZED_SPEND'; end if; else v_spend:=v_before.annualized_spend; end if;
  if p_updates ? 'relationship_status' and v_status=v_before.relationship_status and (p_updates - 'relationship_status' - 'reason')='{}'::jsonb then return query select v_before.id,v_before.updated_at,v_before.relationship_status; return; end if;
  update public.organization_vendors set display_name_override=case when p_updates ? 'display_name_override' then nullif(p_updates->>'display_name_override','') else display_name_override end,category_override=case when p_updates ? 'category_override' then nullif(p_updates->>'category_override','') else category_override end,website_override=case when p_updates ? 'website_override' then nullif(p_updates->>'website_override','') else website_override end,relationship_status=v_status,spend_cadence=v_cadence,annualized_spend=v_spend,ended_at=case when v_status='terminated' then now() when v_status='active' then null else ended_at end,ended_by=case when v_status='terminated' then p_actor_id when v_status='active' then null else ended_by end,updated_at=now() where organization_vendors.id=p_relationship_id returning * into v_after;
  if v_status='terminated' then update public.vendor_monitoring_configs set state='paused',paused_at=now(),updated_by=p_actor_id,updated_at=now() where organization_vendor_id=p_relationship_id and organization_id=p_organization_id and state<>'paused'; end if;
  v_action:=case when v_before.relationship_status <> 'terminated' and v_status='terminated' then 'vendor_relationship.terminated' when v_before.relationship_status='terminated' and v_status='active' then 'vendor_relationship.reactivated' else 'vendor_relationship.updated' end;
  insert into public.audit_events (organization_id,actor_type,actor_id,action,resource_type,resource_id,safe_metadata,trace_id) values (p_organization_id,'user',p_actor_id,v_action,'vendor_relationship',p_relationship_id,jsonb_build_object('relationship_status',v_after.relationship_status,'spend_cadence',v_after.spend_cadence),p_trace_id);
  return query select v_after.id,v_after.updated_at,v_after.relationship_status;
end; $function$;

revoke execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_set_account_archive_state(uuid,uuid,boolean,text) to service_role;
revoke execute on function public.manage_set_contact_active_state(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_set_contact_active_state(uuid,uuid,boolean,text) to service_role;
revoke execute on function public.portal_update_vendor_relationship(uuid,uuid,uuid,timestamptz,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.portal_update_vendor_relationship(uuid,uuid,uuid,timestamptz,jsonb,uuid) to service_role;
