-- Packet 05 hardening: keep the database honest even when a future internal
-- route or worker bypasses the current validation helpers.

alter table public.crm_sequences
  add constraint crm_sequences_business_days_values_check
  check (business_days <@ array[0,1,2,3,4,5,6]::smallint[]);

alter table public.crm_sequence_enrollments
  add constraint crm_sequence_enrollments_terminal_action_check
  check (
    state not in ('replied','bounced','unsubscribed','stopped','completed','failed')
    or next_action_at is null
  );

create unique index crm_sequence_events_provider_event_key
  on public.crm_sequence_events (provider_event_id)
  where provider_event_id is not null;

create or replace function public.validate_crm_sequence_event_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_enrollment_sequence uuid;
  v_step_sequence uuid;
begin
  select sequence_id into v_enrollment_sequence
  from public.crm_sequence_enrollments
  where id = new.enrollment_id;
  if v_enrollment_sequence is null or v_enrollment_sequence <> new.sequence_id then
    raise exception 'SEQUENCE_EVENT_ENROLLMENT_MISMATCH';
  end if;
  if new.step_id is not null then
    select sequence_id into v_step_sequence
    from public.crm_sequence_steps
    where id = new.step_id;
    if v_step_sequence is null or v_step_sequence <> new.sequence_id then
      raise exception 'SEQUENCE_EVENT_STEP_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_crm_sequence_event_links on public.crm_sequence_events;
create trigger validate_crm_sequence_event_links
before insert or update on public.crm_sequence_events
for each row execute function public.validate_crm_sequence_event_links();

create or replace function public.guard_crm_sequence_step_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sequence_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_sequence_id := old.sequence_id;
  else
    v_sequence_id := new.sequence_id;
  end if;
  select status into v_status
  from public.crm_sequences
  where id = v_sequence_id;

  if v_status is null then
    raise exception 'SEQUENCE_NOT_FOUND';
  end if;
  if v_status <> 'draft' then
    raise exception 'SEQUENCE_STEPS_LOCKED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_crm_sequence_step_mutation on public.crm_sequence_steps;
create trigger guard_crm_sequence_step_mutation
before insert or update or delete on public.crm_sequence_steps
for each row execute function public.guard_crm_sequence_step_mutation();

create or replace function public.validate_crm_sequence_step()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prior_email boolean;
begin
  if new.position = 1 and new.delay_value <> 0 then
    raise exception 'SEQUENCE_FIRST_STEP_MUST_BE_IMMEDIATE';
  end if;

  if new.step_type in ('manual_email','automatic_email') then
    if new.subject_template is null
       or (new.body_html is null and new.body_text is null)
       or new.task_title_template is not null then
      raise exception 'SEQUENCE_EMAIL_STEP_FIELDS_INVALID';
    end if;
    if new.step_type = 'automatic_email' and new.thread_mode is null then
      raise exception 'SEQUENCE_AUTOMATIC_EMAIL_THREAD_MODE_REQUIRED';
    end if;
  elsif new.step_type in ('call_task','general_task') then
    if new.task_title_template is null
       or new.subject_template is not null
       or new.body_html is not null
       or new.body_text is not null then
      raise exception 'SEQUENCE_TASK_STEP_FIELDS_INVALID';
    end if;
  end if;

  if new.thread_mode = 'reply_to_previous' then
    select exists (
      select 1
      from public.crm_sequence_steps prior
      where prior.sequence_id = new.sequence_id
        and prior.position < new.position
        and prior.step_type in ('manual_email','automatic_email')
        and prior.id <> new.id
    ) into v_prior_email;
    if not v_prior_email then
      raise exception 'SEQUENCE_REPLY_REQUIRES_PRIOR_EMAIL';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_crm_sequence_step on public.crm_sequence_steps;
create trigger validate_crm_sequence_step
before insert or update on public.crm_sequence_steps
for each row execute function public.validate_crm_sequence_step();

create or replace function public.validate_crm_sequence_enrollment_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sequence_org uuid;
  v_step_sequence uuid;
begin
  select organization_id into v_sequence_org
  from public.crm_sequences
  where id = new.sequence_id;
  if v_sequence_org is null or v_sequence_org <> new.organization_id then
    raise exception 'SEQUENCE_SEQUENCE_ORGANIZATION_MISMATCH';
  end if;

  if new.current_step_id is not null then
    select sequence_id into v_step_sequence
    from public.crm_sequence_steps
    where id = new.current_step_id;
    if v_step_sequence is null or v_step_sequence <> new.sequence_id then
      raise exception 'SEQUENCE_CURRENT_STEP_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_crm_sequence_enrollment_links on public.crm_sequence_enrollments;
create trigger validate_crm_sequence_enrollment_links
before insert or update on public.crm_sequence_enrollments
for each row execute function public.validate_crm_sequence_enrollment_links();
