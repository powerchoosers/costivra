-- Packet 04 hardening: keep report schedules and delivery runs inside one
-- organization even when a privileged worker writes directly.

alter table public.report_schedules
  add constraint report_schedules_status_next_run_check
  check (
    (status = 'active' and next_run_at is not null)
    or (status in ('paused','archived') and next_run_at is null)
  );

create or replace function public.validate_report_schedule_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_definition_organization_id uuid;
begin
  select organization_id into v_definition_organization_id
  from public.report_definitions
  where id = new.report_definition_id;
  if v_definition_organization_id is null or v_definition_organization_id <> new.organization_id then
    raise exception 'REPORT_SCHEDULE_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_report_schedule_organization on public.report_schedules;
create trigger validate_report_schedule_organization
before insert or update of organization_id, report_definition_id
on public.report_schedules
for each row execute function public.validate_report_schedule_organization();

create or replace function public.validate_report_delivery_run_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_definition_organization_id uuid;
  v_schedule_organization_id uuid;
  v_schedule_definition_id uuid;
begin
  select organization_id into v_definition_organization_id
  from public.report_definitions
  where id = new.report_definition_id;
  if v_definition_organization_id is null or v_definition_organization_id <> new.organization_id then
    raise exception 'REPORT_DELIVERY_RUN_ORGANIZATION_MISMATCH';
  end if;

  if new.report_schedule_id is not null then
    select organization_id, report_definition_id
      into v_schedule_organization_id, v_schedule_definition_id
    from public.report_schedules
    where id = new.report_schedule_id;
    if v_schedule_organization_id is null
       or v_schedule_organization_id <> new.organization_id
       or v_schedule_definition_id <> new.report_definition_id then
      raise exception 'REPORT_DELIVERY_RUN_SCHEDULE_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_report_delivery_run_links on public.report_delivery_runs;
create trigger validate_report_delivery_run_links
before insert or update of organization_id, report_definition_id, report_schedule_id
on public.report_delivery_runs
for each row execute function public.validate_report_delivery_run_links();
