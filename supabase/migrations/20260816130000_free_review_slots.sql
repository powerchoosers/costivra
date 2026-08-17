-- Server-owned, durable usage claims for the three-document free review.
-- The claim boundary prevents concurrent uploads from exceeding the limit.
create table if not exists public.free_review_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sha256 text not null check (char_length(sha256) = 64),
  status text not null default 'reserved' check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  unique (organization_id, sha256)
);

create index if not exists free_review_slots_usage_idx
  on public.free_review_slots (organization_id, status);

alter table public.free_review_slots enable row level security;
revoke all on public.free_review_slots from anon, authenticated;
grant all on public.free_review_slots to service_role;
drop policy if exists "deny browser access to free review slots" on public.free_review_slots;
create policy "deny browser access to free review slots"
  on public.free_review_slots for all to anon, authenticated using (false) with check (false);

-- Preserve the current free-review usage when the gate is introduced.
insert into public.free_review_slots (organization_id, sha256, status, created_at, consumed_at)
select organization_id, sha256, 'consumed', min(created_at), max(created_at)
from public.documents
where status::text <> 'rejected'
group by organization_id, sha256
on conflict (organization_id, sha256) do nothing;

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

create or replace function public.finalize_free_review_slot(
  p_claim_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('consumed', 'released') then raise exception 'INVALID_FREE_REVIEW_FINAL_STATUS'; end if;
  update public.free_review_slots
  set status = p_status,
      consumed_at = case when p_status = 'consumed' then now() else null end,
      released_at = case when p_status = 'released' then now() else null end
  where id = p_claim_id and status = 'reserved';
end;
$$;

revoke all on function public.claim_free_review_slot(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finalize_free_review_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_free_review_slot(uuid, text, integer) to service_role;
grant execute on function public.finalize_free_review_slot(uuid, text) to service_role;

comment on table public.free_review_slots is 'Server-owned, auditable claims for the limited three-document free review.';
