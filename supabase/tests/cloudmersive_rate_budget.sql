-- Packet 03 database assertions. Run against the Costivra project with a
-- privileged SQL connection after applying migrations.
do $$
declare
  table_is_rls boolean;
begin
  select c.relrowsecurity
    into table_is_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'external_provider_request_budgets';
  if coalesce(table_is_rls, false) is not true then
    raise exception 'external_provider_request_budgets must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.external_provider_request_budgets', 'select')
     or has_table_privilege('authenticated', 'public.external_provider_request_budgets', 'select') then
    raise exception 'browser roles must not read the provider budget table';
  end if;
  if has_function_privilege('anon', 'public.reserve_provider_request_slot(text,integer,integer,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.reserve_provider_request_slot(text,integer,integer,integer)', 'execute') then
    raise exception 'browser roles must not execute the provider budget function';
  end if;
end;
$$;

-- The reservation function itself is intentionally exercised by the live
-- integration suite because it requires a clean provider-budget row and
-- concurrent transactions to prove first-use locking and interval spacing.
