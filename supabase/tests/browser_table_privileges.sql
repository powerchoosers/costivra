do $$
declare
  unexpected record;
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
  ) then
    raise exception 'anon must not have direct privileges on public tables';
  end if;

  select table_name, privilege_type
  into unexpected
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'authenticated'
    and privilege_type <> 'SELECT'
    and not (
      table_name = 'profiles'
      and privilege_type = 'UPDATE'
    )
  limit 1;

  if found then
    raise exception 'unexpected authenticated privilege %.% ',
      unexpected.table_name,
      unexpected.privilege_type;
  end if;

  if not has_table_privilege('authenticated', 'public.organizations', 'select')
    or not has_table_privilege('authenticated', 'public.documents', 'select')
    or not has_table_privilege('authenticated', 'public.internal_notifications', 'select') then
    raise exception 'required authenticated read privilege is missing';
  end if;

  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update')
    or has_column_privilege('authenticated', 'public.profiles', 'email', 'update')
    or has_column_privilege('authenticated', 'public.profiles', 'id', 'update') then
    raise exception 'profile column privileges are incorrect';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.organizations',
    'select,insert,update,delete'
  ) then
    raise exception 'service_role privileges were reduced';
  end if;
end;
$$;

select 'browser_table_privileges_passed' as result;
