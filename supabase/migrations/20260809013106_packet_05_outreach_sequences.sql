-- Packet 05: controlled outreach sequence drafts and pending enrollments.
-- These are internal operator tables. Browser and customer roles receive no
-- privileges; all access is through requireInternalOperator server routes.

create table if not exists public.crm_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  owner_id uuid not null references public.internal_staff_users(user_id) on delete restrict,
  timezone text not null default 'America/Chicago',
  business_days smallint[] not null default '{1,2,3,4,5}'::smallint[],
  send_start_local time not null default '09:00',
  send_end_local time not null default '16:00',
  daily_send_limit integer not null default 25 check (daily_send_limit between 1 and 100),
  stop_on_reply boolean not null default true,
  stop_on_bounce boolean not null default true,
  stop_on_unsubscribe boolean not null default true,
  stop_company_on_reply boolean not null default false,
  execution_enabled boolean not null default false,
  activated_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(business_days) > 0),
  check (send_start_local < send_end_local),
  check (status <> 'active' or execution_enabled = true),
  check (status <> 'archived' or execution_enabled = false)
);

create table if not exists public.crm_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.crm_sequences(id) on delete cascade,
  position integer not null check (position > 0),
  step_type text not null check (step_type in ('manual_email','automatic_email','call_task','general_task')),
  delay_value integer not null default 0 check (delay_value >= 0),
  delay_unit text not null default 'business_days' check (delay_unit in ('minutes','hours','business_days','calendar_days')),
  thread_mode text check (thread_mode is null or thread_mode in ('new_thread','reply_to_previous')),
  subject_template text,
  body_html text,
  body_text text,
  task_title_template text,
  task_notes_template text,
  task_priority text check (task_priority is null or task_priority in ('low','normal','high')),
  pause_until_task_complete boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, position),
  check ((step_type in ('manual_email','automatic_email') and subject_template is not null and (body_html is not null or body_text is not null) and task_title_template is null)
      or (step_type in ('call_task','general_task') and task_title_template is not null and subject_template is null and body_html is null and body_text is null)),
  check (step_type <> 'automatic_email' or thread_mode is not null),
  check (position <> 1 or delay_value = 0)
);

create table if not exists public.crm_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.crm_sequences(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  mailbox_id uuid not null references public.crm_mailboxes(id) on delete restrict,
  enrolled_by uuid not null references public.internal_staff_users(user_id) on delete restrict,
  state text not null default 'pending' check (state in ('pending','active','paused','waiting_for_task','replied','bounced','unsubscribed','stopped','completed','failed')),
  current_step_id uuid references public.crm_sequence_steps(id) on delete set null,
  current_step_position integer not null default 0 check (current_step_position >= 0),
  next_action_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  stopped_at timestamptz,
  completed_at timestamptz,
  stop_reason text,
  reply_detected_at timestamptz,
  bounce_detected_at timestamptz,
  unsubscribed_at timestamptz,
  personalization jsonb not null default '{}'::jsonb,
  lock_token uuid,
  locked_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists crm_sequence_enrollments_one_open_contact
  on public.crm_sequence_enrollments (organization_id, contact_id)
  where state in ('pending','active','paused','waiting_for_task');

create table if not exists public.crm_sequence_events (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.crm_sequences(id) on delete cascade,
  enrollment_id uuid not null references public.crm_sequence_enrollments(id) on delete cascade,
  step_id uuid references public.crm_sequence_steps(id) on delete set null,
  event_type text not null check (event_type in ('enrolled','step_scheduled','task_created','task_completed','email_queued','email_sent','email_delivered','reply_received','bounced','unsubscribed','paused','resumed','stopped','completed','failed')),
  email_message_id uuid references public.crm_email_messages(id) on delete set null,
  email_thread_id uuid references public.crm_email_threads(id) on delete set null,
  task_id uuid references public.crm_tasks(id) on delete set null,
  external_side_effect_id uuid references public.external_side_effects(id) on delete set null,
  provider_event_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.crm_outreach_suppressions (
  id uuid primary key default gen_random_uuid(),
  email_normalized text,
  domain_normalized text,
  reason text not null check (reason in ('unsubscribed','bounced','complained','manual','legal')),
  source text not null,
  provider_reference text,
  created_by uuid references public.internal_staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  check (email_normalized is not null or domain_normalized is not null),
  check (email_normalized is null or email_normalized = lower(trim(email_normalized))),
  check (domain_normalized is null or domain_normalized = lower(trim(domain_normalized)))
);

create unique index if not exists crm_outreach_suppressions_email_active_key
  on public.crm_outreach_suppressions (email_normalized, reason)
  where email_normalized is not null;
create unique index if not exists crm_outreach_suppressions_domain_active_key
  on public.crm_outreach_suppressions (domain_normalized, reason)
  where domain_normalized is not null;

alter table public.crm_email_messages
  add column if not exists origin text not null default 'manual' check (origin in ('manual','sequence')),
  add column if not exists sequence_id uuid references public.crm_sequences(id) on delete set null,
  add column if not exists sequence_enrollment_id uuid references public.crm_sequence_enrollments(id) on delete set null,
  add column if not exists sequence_step_id uuid references public.crm_sequence_steps(id) on delete set null,
  add column if not exists external_side_effect_id uuid references public.external_side_effects(id) on delete set null;

alter table public.crm_tasks
  add column if not exists origin text not null default 'manual' check (origin in ('manual','sequence')),
  add column if not exists sequence_id uuid references public.crm_sequences(id) on delete set null,
  add column if not exists sequence_enrollment_id uuid references public.crm_sequence_enrollments(id) on delete set null,
  add column if not exists sequence_step_id uuid references public.crm_sequence_steps(id) on delete set null;

create index if not exists crm_sequences_status_idx on public.crm_sequences (organization_id, status, updated_at desc);
create index if not exists crm_sequence_steps_sequence_idx on public.crm_sequence_steps (sequence_id, position);
create index if not exists crm_sequence_enrollments_due_idx on public.crm_sequence_enrollments (state, next_action_at) where state in ('pending','active','waiting_for_task');
create index if not exists crm_sequence_enrollments_contact_idx on public.crm_sequence_enrollments (organization_id, contact_id, state);
create index if not exists crm_sequence_events_enrollment_idx on public.crm_sequence_events (enrollment_id, occurred_at desc);
create index if not exists crm_email_messages_sequence_idx on public.crm_email_messages (sequence_id, sequence_enrollment_id) where sequence_id is not null;
create index if not exists crm_tasks_sequence_idx on public.crm_tasks (sequence_id, sequence_enrollment_id) where sequence_id is not null;
create index if not exists crm_outreach_suppressions_email_lookup on public.crm_outreach_suppressions (email_normalized) where email_normalized is not null;
create index if not exists crm_outreach_suppressions_domain_lookup on public.crm_outreach_suppressions (domain_normalized) where domain_normalized is not null;

-- Enforce organization and mailbox consistency at the database boundary.
create or replace function public.validate_crm_sequence_enrollment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_contact_org uuid;
begin
  select organization_id into v_contact_org from public.crm_contacts where id = new.contact_id;
  if v_contact_org is null or v_contact_org <> new.organization_id then
    raise exception 'SEQUENCE_CONTACT_ORGANIZATION_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_crm_sequence_enrollment on public.crm_sequence_enrollments;
create trigger validate_crm_sequence_enrollment
before insert or update on public.crm_sequence_enrollments
for each row execute function public.validate_crm_sequence_enrollment();

alter table public.crm_sequences enable row level security;
alter table public.crm_sequence_steps enable row level security;
alter table public.crm_sequence_enrollments enable row level security;
alter table public.crm_sequence_events enable row level security;
alter table public.crm_outreach_suppressions enable row level security;
revoke all on public.crm_sequences, public.crm_sequence_steps, public.crm_sequence_enrollments,
  public.crm_sequence_events, public.crm_outreach_suppressions from anon, authenticated;
grant all on public.crm_sequences, public.crm_sequence_steps, public.crm_sequence_enrollments,
  public.crm_sequence_events, public.crm_outreach_suppressions to service_role;

comment on table public.crm_sequences is 'Internal operator sequence drafts and reviewed execution settings; activation is disabled until Packet 07.';
