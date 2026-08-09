-- Packet 07B: bounded, service-role-only sequence claims.
-- This migration does not activate sequences. The application activation gate
-- and worker feature flag must both be enabled before any claim is attempted.

create or replace function public.claim_due_sequence_enrollments(
  p_limit integer default 10,
  p_now timestamptz default now(),
  p_lock_ttl_seconds integer default 900
)
returns setof public.crm_sequence_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_token uuid := gen_random_uuid();
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_SEQUENCE_CLAIM_LIMIT';
  end if;
  if p_lock_ttl_seconds < 60 or p_lock_ttl_seconds > 3600 then
    raise exception 'INVALID_SEQUENCE_LOCK_TTL';
  end if;

  -- A worker that died after claiming work must not permanently block it.
  update public.crm_sequence_enrollments
  set lock_token = null,
      locked_at = null,
      updated_at = p_now
  where locked_at is not null
    and locked_at < p_now - make_interval(secs => p_lock_ttl_seconds)
    and state in ('pending', 'active');

  return query
  with due as (
    select e.id
    from public.crm_sequence_enrollments e
    join public.crm_sequences s on s.id = e.sequence_id
    where e.state in ('pending', 'active')
      and e.next_action_at is not null
      and e.next_action_at <= p_now
      and s.status = 'active'
      and s.execution_enabled = true
      and (e.locked_at is null or e.locked_at < p_now - make_interval(secs => p_lock_ttl_seconds))
    order by e.next_action_at asc, e.created_at asc, e.id asc
    for update of e skip locked
    limit p_limit
  ), claimed as (
    update public.crm_sequence_enrollments e
    set lock_token = v_lock_token,
        locked_at = p_now,
        attempt_count = e.attempt_count + 1,
        updated_at = p_now
    from due
    where e.id = due.id
    returning e.*
  )
  select claimed.* from claimed order by claimed.next_action_at asc, claimed.created_at asc, claimed.id asc;
end;
$$;

create or replace function public.release_sequence_enrollment_claim(
  p_enrollment_id uuid,
  p_lock_token uuid,
  p_state text default null,
  p_next_action_at timestamptz default null,
  p_last_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.crm_sequence_enrollments
  set lock_token = null,
      locked_at = null,
      state = coalesce(p_state, state),
      next_action_at = case when p_state in ('completed', 'failed', 'stopped', 'replied', 'bounced', 'unsubscribed') then null else coalesce(p_next_action_at, next_action_at) end,
      last_error_code = p_last_error_code,
      updated_at = now()
  where id = p_enrollment_id
    and lock_token = p_lock_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.claim_due_sequence_enrollments(integer, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.release_sequence_enrollment_claim(uuid, uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.claim_due_sequence_enrollments(integer, timestamptz, integer) to service_role;
grant execute on function public.release_sequence_enrollment_claim(uuid, uuid, text, timestamptz, text) to service_role;

comment on function public.claim_due_sequence_enrollments(integer, timestamptz, integer)
  is 'Claims a bounded, due sequence batch with a worker lock. Service-role only; activation remains application-gated.';
