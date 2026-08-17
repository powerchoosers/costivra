-- Release abandoned reservations so a crashed intake cannot permanently consume
-- one of the three free-review slots. A normal request finalizes much sooner;
-- this is only a bounded recovery path for interrupted work.
update public.free_review_slots
set status = 'released',
    released_at = now()
where status = 'reserved'
  and created_at < now() - interval '30 minutes';

create or replace function public.claim_free_review_slot(
  p_organization_id uuid,
  p_sha256 text,
  p_limit integer default 3
)
returns table (allowed boolean, claim_id uuid, current_usage integer, limit_value integer, reason text, is_new_claim boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.free_review_slots%rowtype;
  usage_count integer;
begin
  if p_organization_id is null or p_sha256 is null or char_length(p_sha256) <> 64 or p_limit < 1 then
    raise exception 'INVALID_FREE_REVIEW_CLAIM';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  update public.free_review_slots
  set status = 'released', released_at = now()
  where organization_id = p_organization_id
    and status = 'reserved'
    and created_at < now() - interval '30 minutes';

  select * into existing
  from public.free_review_slots
  where organization_id = p_organization_id and sha256 = p_sha256;

  if existing.id is not null and existing.status in ('reserved', 'consumed') then
    select count(*)::integer into usage_count
    from public.free_review_slots
    where organization_id = p_organization_id and status in ('reserved', 'consumed');
    return query select true, existing.id, usage_count, p_limit, 'already_claimed', false;
    return;
  end if;

  select count(*)::integer into usage_count
  from public.free_review_slots
  where organization_id = p_organization_id and status in ('reserved', 'consumed');
  if usage_count >= p_limit then
    return query select false, null::uuid, usage_count, p_limit, 'limit_reached', false;
    return;
  end if;

  if existing.id is not null then
    update public.free_review_slots
    set status = 'reserved', created_at = now(), released_at = null, consumed_at = null
    where id = existing.id;
    return query select true, existing.id, usage_count + 1, p_limit, 'reclaimed', true;
    return;
  end if;

  insert into public.free_review_slots (organization_id, sha256, status)
  values (p_organization_id, p_sha256, 'reserved')
  returning id into existing.id;
  return query select true, existing.id, usage_count + 1, p_limit, 'claimed', true;
end;
$$;

revoke all on function public.claim_free_review_slot(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_free_review_slot(uuid, text, integer) to service_role;

comment on function public.claim_free_review_slot(uuid, text, integer) is 'Claims one organization-scoped free-review document and releases reservations abandoned for more than 30 minutes.';
