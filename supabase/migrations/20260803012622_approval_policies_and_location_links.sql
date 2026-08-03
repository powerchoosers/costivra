alter table public.expenses
  add column if not exists location_id uuid references public.locations(id) on delete set null;

alter table public.contracts
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists expenses_location_idx
  on public.expenses (location_id)
  where location_id is not null;

create index if not exists contracts_location_idx
  on public.contracts (location_id)
  where location_id is not null;

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
  v_action_type text;
  v_policy_id uuid;
  v_minimum_approvers integer := 1;
  v_approver uuid;
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
    v_action_type := case
      when v_opportunity.type::text in ('energy_review', 'expert_review')
        and lower(coalesce(v_opportunity.category, '')) = 'energy'
        then 'prepare_energy_review'
      when v_opportunity.type::text = 'expert_review' then 'expert_handoff'
      else 'review_vendor_cost'
    end;

    select ap.id,
           greatest(1, least(5, coalesce(nullif(ap.rule ->> 'minimum_approvers', '')::integer, 1)))
      into v_policy_id, v_minimum_approvers
    from public.approval_policies ap
    where ap.organization_id = p_organization_id
      and ap.is_active
      and (not (ap.rule ? 'action_type') or ap.rule ->> 'action_type' = v_action_type)
      and (not (ap.rule ? 'category') or lower(ap.rule ->> 'category') = lower(coalesce(v_opportunity.category, '')))
      and (
        not (ap.rule ? 'annual_value_gte')
        or coalesce(v_opportunity.estimated_annual_value, 0) >= (ap.rule ->> 'annual_value_gte')::numeric
      )
    order by
      greatest(1, least(5, coalesce(nullif(ap.rule ->> 'minimum_approvers', '')::integer, 1))) desc,
      (select count(*) from jsonb_object_keys(ap.rule)) desc,
      ap.created_at asc
    limit 1;

    select id into v_action_id
    from public.action_plans
    where opportunity_id = p_opportunity_id;
    if v_action_id is null then
      insert into public.action_plans (
        opportunity_id, status, required_approval_policy_id, title, description,
        action_type, priority, due_at, plan_version
      ) values (
        p_opportunity_id,
        'pending_approval',
        v_policy_id,
        'Review and act on: ' || v_opportunity.title,
        'Confirm the baseline and approve the specific internal work before any vendor communication is prepared.',
        v_action_type,
        coalesce(p_priority, v_opportunity.priority),
        case when p_update_deadline then p_deadline_at else v_opportunity.deadline_at end,
        'costivra-action-v2'
      ) returning id into v_action_id;
    else
      update public.action_plans
      set required_approval_policy_id = coalesce(required_approval_policy_id, v_policy_id),
          updated_at = v_now
      where id = v_action_id;
    end if;

    for v_approver in
      select m.user_id
      from public.organization_memberships m
      where m.organization_id = p_organization_id
        and m.role::text in ('owner', 'admin')
      order by case when m.user_id = p_actor_id then 0 else 1 end, m.created_at, m.user_id
      limit v_minimum_approvers
    loop
      insert into public.approvals (
        organization_id, resource_type, resource_id, requested_from, decision
      )
      select p_organization_id, 'action_plan', v_action_id, v_approver, 'pending'
      where not exists (
        select 1 from public.approvals a
        where a.resource_type = 'action_plan'
          and a.resource_id = v_action_id
          and a.requested_from = v_approver
      );
    end loop;
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
  v_required_approvers integer := 1;
  v_approved_count integer := 0;
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

  if v_action.required_approval_policy_id is not null then
    select greatest(1, least(5, coalesce(nullif(ap.rule ->> 'minimum_approvers', '')::integer, 1)))
    into v_required_approvers
    from public.approval_policies ap
    where ap.id = v_action.required_approval_policy_id
      and ap.organization_id = p_organization_id;
    v_required_approvers := coalesce(v_required_approvers, 1);
  end if;

  if p_operation in ('approve', 'decline') then
    if v_action.status <> 'pending_approval' then
      raise exception 'ACTION_INVALID_TRANSITION:%:%', v_action.status,
        case when p_operation = 'approve' then 'approved' else 'cancelled' end;
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

    if p_operation = 'decline' then
      update public.action_plans set status = 'cancelled', updated_at = v_now where id = p_action_id;
      update public.opportunities set status = 'declined', updated_at = v_now where id = v_opportunity.id;
      v_next_status := 'cancelled';
    else
      select count(distinct a.requested_from)::integer into v_approved_count
      from public.approvals a
      where a.resource_type = 'action_plan'
        and a.resource_id = p_action_id
        and a.decision = 'approved';

      if v_approved_count < v_required_approvers then
        v_next_status := 'pending_approval';
      else
        update public.action_plans set status = 'approved', updated_at = v_now where id = p_action_id;
        v_next_status := 'approved';
        if v_opportunity.type::text not in ('energy_review', 'expert_review') and v_opportunity.source_expense_id is not null then
          select * into v_baseline
          from public.expenses
          where id = v_opportunity.source_expense_id and organization_id = p_organization_id;
          if not found then raise exception 'ACTION_BASELINE_NOT_FOUND'; end if;
          insert into public.savings_outcomes (
            organization_id, opportunity_id, title, value_type, amount, currency, method,
            method_version, status, baseline_expense_id, baseline_amount,
            calculation_inputs, assumptions
          ) values (
            p_organization_id, v_opportunity.id, 'Verify outcome: ' || v_opportunity.title,
            'annual_savings', 0, v_baseline.currency,
            'Baseline awaiting customer acceptance', 'annualized-period-comparison-v1',
            'baseline_review', v_baseline.id, v_baseline.amount,
            jsonb_build_object(
              'baselineExpenseId', v_baseline.id::text,
              'baselineAmount', v_baseline.amount::text,
              'currency', v_baseline.currency
            ),
            jsonb_build_array('The accepted invoice represents the recurring pre-action cost.')
          ) on conflict (opportunity_id) do nothing;
        end if;
      end if;
    end if;
  elsif p_operation = 'start' then
    if v_action.status <> 'approved' then
      raise exception 'ACTION_INVALID_TRANSITION:%:in_progress', v_action.status;
    end if;
    if v_opportunity.type::text not in ('energy_review', 'expert_review') then
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
    p_organization_id, 'user', p_actor_id,
    case
      when p_operation = 'approve' and v_next_status = 'pending_approval'
        then 'action_plan.approval_recorded'
      else 'action_plan.' || p_operation
    end,
    'action_plan', p_action_id
  );
  return v_next_status;
end;
$$;

revoke all on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) to service_role;
grant execute on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) to service_role;

comment on column public.expenses.location_id is
  'Optional operating location served by this normalized expense.';
comment on column public.contracts.location_id is
  'Optional operating location governed by this contract.';
comment on function public.internal_apply_opportunity_operation(uuid, uuid, uuid, text, text, timestamptz, boolean) is
  'Creates an action with the strictest matching tenant approval policy and assigns the required approvers atomically.';
comment on function public.internal_apply_action_operation(uuid, uuid, uuid, text, text) is
  'Records one attributable decision and advances the action only after the configured number of distinct approvals.';
