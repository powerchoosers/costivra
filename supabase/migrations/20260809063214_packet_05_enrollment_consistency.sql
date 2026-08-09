-- Packet 05 hardening: keep direct service-role writes tenant-consistent.
-- API validation is useful, but durable sequence records must enforce the same
-- invariants when workers or repair tooling write them later.

create or replace function public.validate_crm_sequence_enrollment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_contact_org uuid;
  v_sequence_org uuid;
  v_step_sequence uuid;
  v_mailbox_status text;
  v_mailbox_can_send boolean;
begin
  select organization_id into v_contact_org
  from public.crm_contacts
  where id = new.contact_id;

  if v_contact_org is null or v_contact_org <> new.organization_id then
    raise exception 'SEQUENCE_CONTACT_ORGANIZATION_MISMATCH';
  end if;

  select organization_id into v_sequence_org
  from public.crm_sequences
  where id = new.sequence_id;

  if v_sequence_org is null or v_sequence_org <> new.organization_id then
    raise exception 'SEQUENCE_ORGANIZATION_MISMATCH';
  end if;

  if new.current_step_id is not null then
    select sequence_id into v_step_sequence
    from public.crm_sequence_steps
    where id = new.current_step_id;
    if v_step_sequence is null or v_step_sequence <> new.sequence_id then
      raise exception 'SEQUENCE_STEP_MISMATCH';
    end if;
  end if;

  select status, can_send into v_mailbox_status, v_mailbox_can_send
  from public.crm_mailboxes
  where id = new.mailbox_id;
  if v_mailbox_status is distinct from 'active' or coalesce(v_mailbox_can_send, false) is not true then
    raise exception 'SEQUENCE_MAILBOX_NOT_SEND_CAPABLE';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_crm_sequence_enrollment on public.crm_sequence_enrollments;
create trigger validate_crm_sequence_enrollment
before insert or update on public.crm_sequence_enrollments
for each row execute function public.validate_crm_sequence_enrollment();
