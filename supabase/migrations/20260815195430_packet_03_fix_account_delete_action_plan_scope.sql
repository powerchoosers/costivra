-- action_plans is scoped through opportunities; it has no organization_id column.

create or replace function public.manage_delete_empty_account(p_organization_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select o.name into v_name from public.organizations as o where o.id = p_organization_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if exists(select 1 from public.organization_memberships as om where om.organization_id = p_organization_id)
     or exists(select 1 from public.crm_contacts as cc where cc.organization_id = p_organization_id)
     or exists(select 1 from public.documents as d where d.organization_id = p_organization_id)
     or exists(select 1 from public.invoices as i where i.organization_id = p_organization_id)
     or exists(select 1 from public.expenses as e where e.organization_id = p_organization_id)
     or exists(select 1 from public.expense_accounts as ea where ea.organization_id = p_organization_id)
     or exists(select 1 from public.contracts as c where c.organization_id = p_organization_id)
     or exists(select 1 from public.opportunities as o where o.organization_id = p_organization_id)
     or exists(select 1 from public.action_plans as ap join public.opportunities as o on o.id = ap.opportunity_id where o.organization_id = p_organization_id)
     or exists(select 1 from public.savings_outcomes as so where so.organization_id = p_organization_id)
     or exists(select 1 from public.organization_vendors as ov where ov.organization_id = p_organization_id)
     or exists(select 1 from public.vendor_monitoring_configs as vmc where vmc.organization_id = p_organization_id)
     or exists(select 1 from public.crm_email_threads as cet where cet.organization_id = p_organization_id)
     or exists(select 1 from public.crm_email_messages as cem where cem.organization_id = p_organization_id)
     or exists(select 1 from public.crm_tasks as ct where ct.organization_id = p_organization_id)
     or exists(select 1 from public.crm_activities as ca where ca.organization_id = p_organization_id)
     or exists(select 1 from public.contact_inquiries as ci where ci.organization_id = p_organization_id)
  then raise exception 'DEPENDENCIES_PRESENT'; end if;
  insert into public.internal_audit_events(actor_id, organization_id, action, resource_type, resource_id, safe_metadata)
  values (p_actor_id, null, 'crm.account_deleted', 'organization', p_organization_id, jsonb_build_object('name', left(v_name, 160), 'empty_account_deleted', true));
  delete from public.organizations as o where o.id = p_organization_id;
end;
$$;

create or replace function public.manage_delete_empty_account(p_organization_id uuid, p_actor_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select o.name into v_name from public.organizations as o where o.id = p_organization_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if exists(select 1 from public.organization_memberships as om where om.organization_id = p_organization_id)
     or exists(select 1 from public.crm_contacts as cc where cc.organization_id = p_organization_id)
     or exists(select 1 from public.locations as l where l.organization_id = p_organization_id)
     or exists(select 1 from public.documents as d where d.organization_id = p_organization_id)
     or exists(select 1 from public.invoices as i where i.organization_id = p_organization_id)
     or exists(select 1 from public.expenses as e where e.organization_id = p_organization_id)
     or exists(select 1 from public.expense_accounts as ea where ea.organization_id = p_organization_id)
     or exists(select 1 from public.contracts as c where c.organization_id = p_organization_id)
     or exists(select 1 from public.opportunities as o where o.organization_id = p_organization_id)
     or exists(select 1 from public.action_plans as ap join public.opportunities as o on o.id = ap.opportunity_id where o.organization_id = p_organization_id)
     or exists(select 1 from public.savings_outcomes as so where so.organization_id = p_organization_id)
     or exists(select 1 from public.organization_vendors as ov where ov.organization_id = p_organization_id)
     or exists(select 1 from public.vendor_monitoring_configs as vmc where vmc.organization_id = p_organization_id)
     or exists(select 1 from public.crm_email_threads as cet where cet.organization_id = p_organization_id)
     or exists(select 1 from public.crm_email_messages as cem where cem.organization_id = p_organization_id)
     or exists(select 1 from public.crm_tasks as ct where ct.organization_id = p_organization_id)
     or exists(select 1 from public.crm_activities as ca where ca.organization_id = p_organization_id)
     or exists(select 1 from public.contact_inquiries as ci where ci.organization_id = p_organization_id)
  then raise exception 'DEPENDENCIES_PRESENT'; end if;
  insert into public.internal_audit_events(actor_id, organization_id, action, resource_type, resource_id, safe_metadata)
  values (p_actor_id, null, 'crm.account_deleted', 'organization', p_organization_id, jsonb_build_object('name', left(v_name, 160), 'reason', left(p_reason, 200), 'empty_account_deleted', true));
  delete from public.organizations as o where o.id = p_organization_id;
end;
$$;
