begin;

do $$
declare
  v_actor uuid;
  v_organization uuid := gen_random_uuid();
  v_vendor uuid;
  v_relationship uuid;
  v_account uuid;
  v_source_document uuid;
  v_later_document uuid;
  v_source_expense uuid;
  v_later_expense uuid;
  v_opportunity uuid;
  v_action uuid;
  v_savings uuid;
  v_status text;
  v_count integer;
begin
  select m.user_id into v_actor
  from public.organization_memberships m
  join public.profiles p on p.id = m.user_id
  where m.role::text = 'owner'
  order by m.created_at
  limit 1;
  if v_actor is null then raise exception 'PROBE_REQUIRES_OWNER'; end if;

  insert into public.organizations (id, name)
  values (v_organization, 'Costivra atomic workflow rollback probe');
  insert into public.organization_memberships (organization_id, user_id, role, permissions)
  values (v_organization, v_actor, 'owner', '[]'::jsonb);
  insert into public.vendors (canonical_name, category)
  values ('Atomic workflow rollback vendor ' || v_organization::text, 'Telecom')
  returning id into v_vendor;
  insert into public.organization_vendors (organization_id, vendor_id, spend_cadence)
  values (v_organization, v_vendor, 'monthly')
  returning id into v_relationship;
  insert into public.expense_accounts (organization_id, organization_vendor_id, category)
  values (v_organization, v_relationship, 'Telecom')
  returning id into v_account;

  insert into public.documents (
    organization_id, organization_vendor_id, storage_path, original_filename,
    mime_type, byte_size, sha256, status, uploaded_by, document_type
  ) values (
    v_organization, v_relationship, v_organization || '/probe/source.pdf', 'source.pdf',
    'application/pdf', 1, encode(gen_random_bytes(32), 'hex'), 'ready', v_actor, 'invoice'
  ) returning id into v_source_document;
  insert into public.documents (
    organization_id, organization_vendor_id, storage_path, original_filename,
    mime_type, byte_size, sha256, status, uploaded_by, document_type
  ) values (
    v_organization, v_relationship, v_organization || '/probe/later.pdf', 'later.pdf',
    'application/pdf', 1, encode(gen_random_bytes(32), 'hex'), 'ready', v_actor, 'invoice'
  ) returning id into v_later_document;

  insert into public.expenses (
    organization_id, organization_vendor_id, expense_account_id, document_id,
    category, period_start, period_end, amount, currency, status
  ) values (
    v_organization, v_relationship, v_account, v_source_document,
    'Telecom', '2026-02-01', '2026-02-28', 1250, 'USD', 'reviewed'
  ) returning id into v_source_expense;
  insert into public.expenses (
    organization_id, organization_vendor_id, expense_account_id, document_id,
    category, period_start, period_end, amount, currency, status
  ) values (
    v_organization, v_relationship, v_account, v_later_document,
    'Telecom', '2026-04-01', '2026-04-30', 900, 'USD', 'reviewed'
  ) returning id into v_later_expense;
  insert into public.opportunities (
    organization_id, expense_account_id, type, title, summary, status, priority,
    currency, source_expense_id, generated_by
  ) values (
    v_organization, v_account, 'price_increase', 'Atomic workflow probe',
    'Rollback-only verification', 'under_review', 'medium', 'USD',
    v_source_expense, 'deterministic_rule'
  ) returning id into v_opportunity;

  v_action := public.internal_apply_opportunity_operation(
    v_organization, v_opportunity, v_actor, 'approved', null, null, false
  );
  select status into v_status from public.action_plans where id = v_action;
  if v_status <> 'pending_approval' then raise exception 'PROBE_ACTION_NOT_CREATED'; end if;

  perform public.internal_apply_action_operation(
    v_organization, v_action, v_actor, 'approve', 'Rollback probe approval'
  );
  select id into v_savings from public.savings_outcomes where opportunity_id = v_opportunity;
  if v_savings is null then raise exception 'PROBE_SAVINGS_NOT_CREATED'; end if;

  begin
    perform public.internal_apply_action_operation(
      v_organization, v_action, v_actor, 'start', null
    );
    raise exception 'PROBE_PREMATURE_START_WAS_ALLOWED';
  exception when others then
    if sqlerrm not like '%ACTION_BASELINE_ACCEPTANCE_REQUIRED%' then raise; end if;
  end;
  select status into v_status from public.action_plans where id = v_action;
  if v_status <> 'approved' then raise exception 'PROBE_FAILED_OPERATION_DID_NOT_ROLL_BACK'; end if;

  perform public.internal_apply_savings_operation(
    v_organization, v_savings, v_actor, 'accept_baseline', null
  );
  perform public.internal_apply_action_operation(
    v_organization, v_action, v_actor, 'start', null
  );
  perform public.internal_apply_action_operation(
    v_organization, v_action, v_actor, 'complete', null
  );
  update public.savings_outcomes
  set comparison_expense_id = v_later_expense,
      comparison_amount = 900,
      amount = 4258.93,
      method_version = 'annualized-period-comparison-v1',
      calculation_inputs = jsonb_build_object(
        'baselineExpenseId', v_source_expense::text,
        'comparisonExpenseId', v_later_expense::text
      ),
      calculation_result = '{"annualizedRecurringSavings":"4258.93"}'::jsonb,
      status = 'ready_for_review'
  where id = v_savings;
  perform public.internal_apply_savings_operation(
    v_organization, v_savings, v_actor, 'verify', null
  );

  select status into v_status from public.savings_outcomes where id = v_savings;
  if v_status <> 'verified' then raise exception 'PROBE_SAVINGS_NOT_VERIFIED'; end if;
  select status::text into v_status from public.opportunities where id = v_opportunity;
  if v_status <> 'verified' then raise exception 'PROBE_OPPORTUNITY_NOT_VERIFIED'; end if;
  select count(*) into v_count
  from public.audit_events
  where organization_id = v_organization
    and action in (
      'opportunity.approved', 'action_plan.approve', 'savings.accept_baseline',
      'action_plan.start', 'action_plan.complete', 'savings.verify'
    );
  if v_count <> 6 then raise exception 'PROBE_AUDIT_INCOMPLETE:%', v_count; end if;
end;
$$;

rollback;
