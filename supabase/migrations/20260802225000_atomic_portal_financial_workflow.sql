create or replace function public.internal_apply_opportunity_operation(
  p_organization_id uuid,
  p_opportunity_id uuid,
  p_actor_id uuid,
  p_status text,
  p_priority text,
  p_deadline_at timestamptz,
  p_update_deadline boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_opportunity public.opportunities%rowtype;
  v_role text;
  v_action_id uuid;
  v_now timestamptz := now();
begin
  select m.role::text into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id and m.user_id = p_actor_id
  limit 1;
  if v_role is null or v_role not in ('owner', 'admin', 'member') then
    raise exception 'WORKFLOW_FORBIDDEN';
  end if;

  select * into v_opportunity
  from public.opportunities
  where id = p_opportunity_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;

  if p_status is not null then
    if not (
      v_opportunity.status::text = p_status
      or (v_opportunity.status::text = 'open' and p_status in ('under_review', 'declined'))
      or (v_opportunity.status::text = 'under_review' and p_status in ('approved', 'declined'))
      or (v_opportunity.status::text = 'approved' and p_status in ('in_progress', 'declined'))
      or (v_opportunity.status::text = 'in_progress' and p_status in ('verified', 'closed'))
      or (v_opportunity.status::text = 'verified' and p_status = 'closed')
    ) then
      raise exception 'OPPORTUNITY_INVALID_TRANSITION:%:%', v_opportunity.status, p_status;
    end if;
    if p_status in ('approved', 'declined') and v_role not in ('owner', 'admin') then
      raise exception 'WORKFLOW_OWNER_REQUIRED';
    end if;
  end if;
  if p_priority is not null and p_priority not in ('high', 'medium', 'low') then
    raise exception 'OPPORTUNITY_INVALID_PRIORITY';
  end if;

  update public.opportunities
  set status = coalesce(p_status::public.opportunity_status, status),
      priority = coalesce(p_priority, priority),
      deadline_at = case when p_update_deadline then p_deadline_at else deadline_at end,
      updated_at = v_now
  where id = p_opportunity_id and organization_id = p_organization_id;

  if p_status = 'approved' then
    select id into v_action_id
    from public.action_plans
    where opportunity_id = p_opportunity_id;
    if v_action_id is null then
      insert into public.action_plans (
        opportunity_id, status, title, description, action_type, priority, due_at, plan_version
      ) values (
        p_opportunity_id,
        'pending_approval',
        'Review and act on: ' || v_opportunity.title,
        'Confirm the baseline and approve the specific internal work before any vendor communication is prepared.',
        case when v_opportunity.type = 'energy_review' then 'prepare_energy_review' else 'review_vendor_cost' end,
        coalesce(p_priority, v_opportunity.priority),
        case when p_update_deadline then p_deadline_at else v_opportunity.deadline_at end,
        'costivra-action-v1'
      ) returning id into v_action_id;
    end if;
    if not exists (
      select 1 from public.approvals
      where resource_type = 'action_plan' and resource_id = v_action_id and decision = 'pending'
    ) then
      insert into public.approvals (
        organization_id, resource_type, resource_id, requested_from, decision
      ) values (
        p_organization_id, 'action_plan', v_action_id, p_actor_id, 'pending'
      );
    end if;
  end if;

  insert into public.audit_events (
    organization_id, actor_type, actor_id, action, resource_type, resource_id
  ) values (
    p_organization_id,
    'user',
    p_actor_id,
    'opportunity.' || coalesce(p_status, 'updated'),
    'opportunity',
    p_opportunity_id
  );
  return v_action_id;
end;
$$;

create or replace function public.internal_apply_action_operation(
  p_organization_id uuid,
  p_action_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_reason text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action public.action_plans%rowtype;
  v_opportunity public.opportunities%rowtype;
  v_approval_id uuid;
  v_role text;
  v_savings_status text;
  v_baseline public.expenses%rowtype;
  v_next_status text;
  v_now timestamptz := now();
begin
  select m.role::text into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id and m.user_id = p_actor_id
  limit 1;
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'WORKFLOW_OWNER_REQUIRED';
  end if;

  select a.* into v_action
  from public.action_plans a
  join public.opportunities o on o.id = a.opportunity_id
  where a.id = p_action_id and o.organization_id = p_organization_id
  for update of a;
  if not found then raise exception 'ACTION_NOT_FOUND'; end if;

  select * into v_opportunity
  from public.opportunities
  where id = v_action.opportunity_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'ACTION_NOT_FOUND'; end if;

  if p_operation in ('approve', 'decline') then
    v_next_status := case when p_operation = 'approve' then 'approved' else 'cancelled' end;
    if v_action.status <> 'pending_approval' then
      raise exception 'ACTION_INVALID_TRANSITION:%:%', v_action.status, v_next_status;
    end if;
    select id into v_approval_id
    from public.approvals
    where resource_type = 'action_plan'
      and resource_id = p_action_id
      and requested_from = p_actor_id
      and decision = 'pending'
    for update;
    if v_approval_id is null then raise exception 'ACTION_APPROVAL_UNAVAILABLE'; end if;

    update public.approvals
    set decision = case when p_operation = 'approve' then 'approved'::public.approval_decision else 'declined'::public.approval_decision end,
        decision_reason = nullif(btrim(coalesce(p_reason, '')), ''),
        decided_at = v_now
    where id = v_approval_id;
    update public.action_plans
    set status = v_next_status, updated_at = v_now
    where id = p_action_id;

    if p_operation = 'decline' then
      update public.opportunities
      set status = 'declined', updated_at = v_now
      where id = v_opportunity.id;
    elsif v_opportunity.type <> 'energy_review' and v_opportunity.source_expense_id is not null then
      select * into v_baseline
      from public.expenses
      where id = v_opportunity.source_expense_id and organization_id = p_organization_id;
      if not found then raise exception 'ACTION_BASELINE_NOT_FOUND'; end if;
      insert into public.savings_outcomes (
        organization_id, opportunity_id, title, value_type, amount, currency, method,
        method_version, status, baseline_expense_id, baseline_amount,
        calculation_inputs, assumptions
      ) values (
        p_organization_id,
        v_opportunity.id,
        'Verify outcome: ' || v_opportunity.title,
        'annual_savings',
        0,
        v_baseline.currency,
        'Baseline awaiting customer acceptance',
        'annualized-period-comparison-v1',
        'baseline_review',
        v_baseline.id,
        v_baseline.amount,
        jsonb_build_object(
          'baselineExpenseId', v_baseline.id::text,
          'baselineAmount', v_baseline.amount::text,
          'currency', v_baseline.currency
        ),
        jsonb_build_array('The accepted invoice represents the recurring pre-action cost.')
      ) on conflict (opportunity_id) do nothing;
    end if;
  elsif p_operation = 'start' then
    if v_action.status <> 'approved' then
      raise exception 'ACTION_INVALID_TRANSITION:%:in_progress', v_action.status;
    end if;
    if v_opportunity.type <> 'energy_review' then
      select status into v_savings_status
      from public.savings_outcomes
      where opportunity_id = v_opportunity.id;
      if v_savings_status not in ('evidence_pending', 'ready_for_review') then
        raise exception 'ACTION_BASELINE_ACCEPTANCE_REQUIRED';
      end if;
    end if;
    update public.action_plans set status = 'in_progress', updated_at = v_now where id = p_action_id;
    update public.opportunities set status = 'in_progress', updated_at = v_now where id = v_opportunity.id;
    v_next_status := 'in_progress';
  elsif p_operation = 'complete' then
    if v_action.status <> 'in_progress' then
      raise exception 'ACTION_INVALID_TRANSITION:%:complete', v_action.status;
    end if;
    update public.action_plans
    set status = 'complete', completed_at = v_now, updated_at = v_now
    where id = p_action_id;
    v_next_status := 'complete';
  else
    raise exception 'ACTION_UNSUPPORTED_OPERATION';
  end if;

  insert into public.audit_events (
    organization_id, actor_type, actor_id, action, resource_type, resource_id
  ) values (
    p_organization_id, 'user', p_actor_id, 'action_plan.' || p_operation, 'action_plan', p_action_id
  );
  return v_next_status;
end;
$$;

create or replace function public.internal_apply_savings_operation(
  p_organization_id uuid,
  p_savings_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_reason text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_outcome public.savings_outcomes%rowtype;
  v_role text;
  v_now timestamptz := now();
  v_updated integer;
  v_next_status text;
begin
  select m.role::text into v_role
  from public.organization_memberships m
  where m.organization_id = p_organization_id and m.user_id = p_actor_id
  limit 1;
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'WORKFLOW_OWNER_REQUIRED';
  end if;

  select * into v_outcome
  from public.savings_outcomes
  where id = p_savings_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'SAVINGS_NOT_FOUND'; end if;

  if p_operation = 'accept_baseline' then
    if v_outcome.status <> 'baseline_review' or v_outcome.baseline_expense_id is null then
      raise exception 'SAVINGS_BASELINE_NOT_READY';
    end if;
    update public.savings_outcomes
    set status = 'evidence_pending',
        baseline_accepted_by = p_actor_id,
        baseline_accepted_at = v_now,
        method = 'Annualized comparison of accepted baseline and later approved invoice'
    where id = p_savings_id;
    v_next_status := 'evidence_pending';
  elsif p_operation = 'verify' then
    if v_outcome.status <> 'ready_for_review'
      or v_outcome.baseline_expense_id is null
      or v_outcome.comparison_expense_id is null
      or v_outcome.method_version is null
      or v_outcome.amount <= 0 then
      raise exception 'SAVINGS_EVIDENCE_REQUIRED';
    end if;
    if v_outcome.opportunity_id is not null then
      update public.opportunities
      set status = 'verified', updated_at = v_now
      where id = v_outcome.opportunity_id
        and organization_id = p_organization_id
        and status = 'in_progress';
      get diagnostics v_updated = row_count;
      if v_updated <> 1 then raise exception 'SAVINGS_ACTION_NOT_IN_PROGRESS'; end if;
    end if;
    update public.savings_outcomes
    set status = 'verified', verified_by = p_actor_id, verified_at = v_now
    where id = p_savings_id;
    v_next_status := 'verified';
  elsif p_operation = 'reject' then
    if v_outcome.status not in ('baseline_review', 'ready_for_review') then
      raise exception 'SAVINGS_DECISION_NOT_READY';
    end if;
    if char_length(btrim(coalesce(p_reason, ''))) < 3 then
      raise exception 'SAVINGS_REJECTION_REASON_REQUIRED';
    end if;
    update public.savings_outcomes
    set status = 'rejected',
        rejected_by = p_actor_id,
        rejected_at = v_now,
        rejection_reason = btrim(p_reason)
    where id = p_savings_id;
    v_next_status := 'rejected';
  else
    raise exception 'SAVINGS_UNSUPPORTED_OPERATION';
  end if;

  insert into public.audit_events (
    organization_id, actor_type, actor_id, action, resource_type, resource_id
  ) values (
    p_organization_id, 'user', p_actor_id, 'savings.' || p_operation, 'savings_outcome', p_savings_id
  );
  return v_next_status;
end;
$$;

revoke all on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.internal_apply_savings_operation(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) to service_role;
grant execute on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.internal_apply_savings_operation(uuid, uuid, uuid, text, text) to service_role;

comment on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) is
  'Atomically updates an opportunity, creates its action and approval when authorized, and records the audit event.';
comment on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) is
  'Atomically applies an authorized action decision or transition, its approval, savings baseline, and audit event.';
comment on function public.internal_apply_savings_operation(uuid, uuid, uuid, text, text) is
  'Atomically accepts, verifies, or rejects a savings outcome together with opportunity state and audit evidence.';
