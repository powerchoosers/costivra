-- Packet 03: harden the vendor-monitoring timestamp trigger.
-- This trigger is invoked by PostgreSQL and is not a browser-callable API.

create or replace function public.update_vendor_monitoring_configs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke execute on function public.update_vendor_monitoring_configs_updated_at() from public, anon, authenticated;
grant execute on function public.update_vendor_monitoring_configs_updated_at() to postgres, service_role;
