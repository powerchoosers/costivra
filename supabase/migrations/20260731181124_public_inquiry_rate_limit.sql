create table public.public_inquiry_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index public_inquiry_rate_limits_updated_idx
  on public.public_inquiry_rate_limits (updated_at);

alter table public.public_inquiry_rate_limits enable row level security;
revoke all on public.public_inquiry_rate_limits from public, anon, authenticated;
grant all on public.public_inquiry_rate_limits to service_role;

create policy "No browser access to public inquiry rate limits"
  on public.public_inquiry_rate_limits for all to anon, authenticated
  using (false) with check (false);

create or replace function public.claim_public_inquiry_rate_limit(
  p_key_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  if length(p_key_hash) <> 64 or p_limit < 1 or p_window_seconds < 60 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENT';
  end if;

  delete from public.public_inquiry_rate_limits
  where updated_at < now() - interval '7 days';

  insert into public.public_inquiry_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_key_hash,
    now(),
    1,
    now()
  )
  on conflict (key_hash) do update set
    window_started_at = case
      when public.public_inquiry_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then now()
      else public.public_inquiry_rate_limits.window_started_at
    end,
    request_count = case
      when public.public_inquiry_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then 1
      else least(public.public_inquiry_rate_limits.request_count + 1, p_limit + 1)
    end,
    updated_at = now()
  returning request_count <= p_limit into v_allowed;

  return v_allowed;
end;
$$;

revoke all on function public.claim_public_inquiry_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_public_inquiry_rate_limit(text, integer, integer)
  to service_role;

comment on table public.public_inquiry_rate_limits is
  'Server-only, short-retention hashed counters protecting the public inquiry email and lead-creation path.';
