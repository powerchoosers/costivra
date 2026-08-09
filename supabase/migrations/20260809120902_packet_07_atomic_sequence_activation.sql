-- Packet 07 hardening: activate a sequence and all pending enrollments in one
-- transaction. The application still performs draft validation and operator
-- authorization; this function prevents a partial state transition if the
-- second write or event creation fails.

create or replace function public.activate_crm_sequence(
  p_sequence_id uuid,
  p_actor_id uuid,
  p_now timestamptz default now()
)
returns table (
  sequence_id uuid,
  organization_id uuid,
  activated_at timestamptz,
  activated_enrollments integer
)
language plpgsql
set search_path = ''
as $$
declare
  v_sequence public.crm_sequences%rowtype;
  v_activated_at timestamptz;
  v_activated_enrollments integer;
begin
  select * into v_sequence
  from public.crm_sequences
  where id = p_sequence_id
    and status in ('draft', 'paused')
  for update;

  if not found then
    return;
  end if;

  v_activated_at := coalesce(v_sequence.activated_at, p_now);

  update public.crm_sequences
  set status = 'active',
      execution_enabled = true,
      activated_at = v_activated_at,
      paused_at = null,
      updated_at = p_now
  where id = p_sequence_id;

  with activated as (
    update public.crm_sequence_enrollments
    set state = 'active',
        current_step_id = null,
        current_step_position = 0,
        next_action_at = p_now,
        started_at = p_now,
        paused_at = null,
        updated_at = p_now
    where sequence_id = p_sequence_id
      and state = 'pending'
    returning id, sequence_id
  ), inserted_events as (
    insert into public.crm_sequence_events (
      sequence_id,
      enrollment_id,
      event_type,
      safe_metadata,
      occurred_at
    )
    select
      activated.sequence_id,
      activated.id,
      'step_scheduled',
      jsonb_build_object('next_action_at', p_now, 'activation', true),
      p_now
    from activated
    returning id
  )
  select count(*) into v_activated_enrollments from inserted_events;

  insert into public.internal_audit_events (
    actor_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    safe_metadata,
    created_at
  ) values (
    p_actor_id,
    v_sequence.organization_id,
    'crm.sequence_activated',
    'crm_sequence',
    p_sequence_id,
    jsonb_build_object(
      'execution_enabled', true,
      'activated_enrollments', v_activated_enrollments
    ),
    p_now
  );

  return query
  select p_sequence_id,
         v_sequence.organization_id,
         v_activated_at,
         v_activated_enrollments;
end;
$$;

revoke all on function public.activate_crm_sequence(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_crm_sequence(uuid, uuid, timestamptz)
  to service_role;

comment on function public.activate_crm_sequence(uuid, uuid, timestamptz)
  is 'Atomically activates a validated internal sequence, pending enrollments, scheduling events, and audit record.';
