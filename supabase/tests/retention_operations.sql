do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'source_purged_at'
  ) then
    raise exception 'documents.source_purged_at is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inbound_email_attachments'
      and column_name = 'quarantine_purged_at'
  ) then
    raise exception 'inbound attachment retention fields are missing';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'retention_runs'
      and c.relrowsecurity
  ) then
    raise exception 'retention_runs must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.retention_runs', 'select')
    or has_table_privilege('authenticated', 'public.retention_runs', 'select')
    or has_table_privilege('authenticated', 'public.retention_runs', 'insert') then
    raise exception 'browser roles must not access retention_runs';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.retention_runs',
    'select,insert,update,delete'
  ) then
    raise exception 'service_role retention access is incomplete';
  end if;
end;
$$;

select 'retention_operations_passed' as result;
