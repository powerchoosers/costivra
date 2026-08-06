-- Retain an explicit reason without trusting the browser preview. The old
-- two-argument function is revoked so every new delete intent is auditable.
create or replace function public.manage_delete_empty_account(p_organization_id uuid,p_actor_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.organizations where id=p_organization_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if exists(select 1 from public.organization_memberships where organization_id=p_organization_id) or exists(select 1 from public.crm_contacts where organization_id=p_organization_id) or exists(select 1 from public.documents where organization_id=p_organization_id) or exists(select 1 from public.invoices where organization_id=p_organization_id) or exists(select 1 from public.expenses where organization_id=p_organization_id) or exists(select 1 from public.expense_accounts where organization_id=p_organization_id) or exists(select 1 from public.contracts where organization_id=p_organization_id) or exists(select 1 from public.opportunities where organization_id=p_organization_id) or exists(select 1 from public.action_plans where organization_id=p_organization_id) or exists(select 1 from public.savings_outcomes where organization_id=p_organization_id) or exists(select 1 from public.organization_vendors where organization_id=p_organization_id) or exists(select 1 from public.vendor_monitoring_configs where organization_id=p_organization_id) or exists(select 1 from public.crm_email_threads where organization_id=p_organization_id) or exists(select 1 from public.crm_email_messages where organization_id=p_organization_id) or exists(select 1 from public.crm_tasks where organization_id=p_organization_id) or exists(select 1 from public.crm_activities where organization_id=p_organization_id) or exists(select 1 from public.contact_inquiries where organization_id=p_organization_id) then raise exception 'DEPENDENCIES_PRESENT'; end if;
  insert into public.internal_audit_events(actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values(p_actor_id,null,'crm.account_deleted','organization',p_organization_id,jsonb_build_object('name',left(v_name,160),'reason',left(p_reason,200),'empty_account_deleted',true));
  delete from public.organizations where id=p_organization_id;
end; $$;
revoke execute on function public.manage_delete_empty_account(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_delete_empty_account(uuid,uuid,text) to service_role;

create or replace function public.manage_delete_empty_crm_contact(p_contact_id uuid,p_actor_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_name text;
begin
  select organization_id,full_name into v_org,v_name from public.crm_contacts where id=p_contact_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if exists(select 1 from public.crm_tasks where contact_id=p_contact_id) or exists(select 1 from public.crm_activities where contact_id=p_contact_id) or exists(select 1 from public.crm_email_threads where contact_id=p_contact_id) or exists(select 1 from public.crm_email_messages where contact_id=p_contact_id) or exists(select 1 from public.crm_marketing_consents where contact_id=p_contact_id) or exists(select 1 from public.contact_inquiries where contact_id=p_contact_id) or exists(select 1 from public.crm_contacts where id=p_contact_id and is_primary) then raise exception 'DEPENDENCIES_PRESENT'; end if;
  insert into public.internal_audit_events(actor_id,organization_id,action,resource_type,resource_id,safe_metadata) values(p_actor_id,v_org,'crm.contact_removed','contact',p_contact_id,jsonb_build_object('reason',left(p_reason,200),'contact_name',left(v_name,160),'crm_only',true));
  delete from public.crm_contacts where id=p_contact_id;
end; $$;
revoke execute on function public.manage_delete_empty_crm_contact(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_delete_empty_crm_contact(uuid,uuid,text) to service_role;
