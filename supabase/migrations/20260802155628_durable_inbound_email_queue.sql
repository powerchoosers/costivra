alter table public.inbound_email_events
  drop constraint if exists inbound_email_events_status_check;

alter table public.inbound_email_events
  add constraint inbound_email_events_status_check
  check (status in (
    'received',
    'queued',
    'processing',
    'retrying',
    'quarantined',
    'processed',
    'needs_review',
    'rejected',
    'failed',
    'dead_letter',
    'duplicate'
  ));

alter table public.inbound_email_events
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists lock_token uuid;

create index if not exists inbound_email_events_work_queue_idx
  on public.inbound_email_events (next_attempt_at, received_at)
  where status in ('queued', 'retrying', 'processing');

create or replace function public.claim_inbound_email_events(
  p_limit integer default 2,
  p_stale_after_seconds integer default 300
)
returns setof public.inbound_email_events
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select event.id
    from public.inbound_email_events as event
    where (
      event.status in ('queued', 'retrying')
      and coalesce(event.next_attempt_at, event.received_at) <= now()
    ) or (
      event.status = 'processing'
      and event.locked_at < now() - make_interval(secs => greatest(60, p_stale_after_seconds))
    )
    order by coalesce(event.next_attempt_at, event.received_at), event.received_at
    for update skip locked
    limit least(greatest(p_limit, 1), 5)
  )
  update public.inbound_email_events as event
  set
    status = 'processing',
    attempt_count = event.attempt_count + 1,
    last_attempt_at = now(),
    locked_at = now(),
    lock_token = gen_random_uuid(),
    error_message = null,
    updated_at = now()
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

comment on function public.claim_inbound_email_events(integer, integer) is
  'Atomically claims a bounded batch of due inbound-email jobs for the trusted server worker.';

revoke all on function public.claim_inbound_email_events(integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_inbound_email_events(integer, integer)
  to service_role;
