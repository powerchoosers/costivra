create table public.internal_staff_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'operator' check (role in ('owner', 'operator')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_account_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  lifecycle_stage text not null default 'onboarding'
    check (lifecycle_stage in ('lead', 'onboarding', 'active', 'at_risk', 'inactive', 'closed')),
  assigned_to uuid references public.internal_staff_users(user_id) on delete set null,
  source text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  next_step text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  title text,
  phone text,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive', 'bounced', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index crm_contacts_org_email_key
  on public.crm_contacts (organization_id, lower(email));

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  assigned_to uuid references public.internal_staff_users(user_id) on delete set null,
  title text not null,
  task_type text not null default 'follow_up'
    check (task_type in ('email', 'call', 'meeting', 'follow_up', 'review')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  actor_id uuid references public.internal_staff_users(user_id) on delete set null,
  kind text not null check (kind in (
    'email_inbound', 'email_outbound', 'call', 'meeting', 'note',
    'task_created', 'task_completed', 'account_created', 'status_change'
  )),
  direction text check (direction is null or direction in ('inbound', 'outbound', 'internal')),
  subject text not null,
  summary text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.crm_email_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  subject text not null default '(no subject)',
  normalized_subject text not null default '',
  participants text[] not null default '{}'::text[],
  snippet text,
  status text not null default 'open' check (status in ('open', 'archived', 'trashed')),
  is_starred boolean not null default false,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.crm_email_threads(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  actor_id uuid references public.internal_staff_users(user_id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  folder text not null check (folder in ('inbox', 'sent', 'draft', 'scheduled', 'archive', 'trash')),
  from_address text not null,
  to_addresses text[] not null default '{}'::text[],
  cc_addresses text[] not null default '{}'::text[],
  bcc_addresses text[] not null default '{}'::text[],
  reply_to_addresses text[] not null default '{}'::text[],
  subject text not null default '(no subject)',
  text_body text,
  html_body text,
  provider_message_id text unique,
  provider_status text not null default 'pending' check (provider_status in (
    'draft', 'pending', 'scheduled', 'sent', 'delivered', 'delayed',
    'bounced', 'complained', 'failed', 'suppressed', 'received'
  )),
  internet_message_id text,
  in_reply_to text,
  message_references text[] not null default '{}'::text[],
  attachments jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_email_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  provider_message_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.internal_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.internal_staff_users(user_id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  safe_metadata jsonb not null default '{}'::jsonb,
  trace_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.external_side_effects
  add column if not exists actor_id uuid references public.internal_staff_users(user_id) on delete set null,
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists authorized_at timestamptz,
  add column if not exists authorization_method text,
  add column if not exists sanitized_request_metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_error text,
  add column if not exists retry_count integer not null default 0 check (retry_count >= 0),
  add column if not exists trace_id uuid not null default gen_random_uuid(),
  add column if not exists updated_at timestamptz not null default now();

create index crm_account_profiles_stage_idx
  on public.crm_account_profiles (lifecycle_stage, next_follow_up_at);
create index crm_account_profiles_assigned_idx
  on public.crm_account_profiles (assigned_to) where assigned_to is not null;
create index crm_contacts_org_name_idx
  on public.crm_contacts (organization_id, full_name);
create index crm_contacts_profile_idx
  on public.crm_contacts (profile_id) where profile_id is not null;
create index crm_tasks_due_idx
  on public.crm_tasks (status, due_at);
create index crm_tasks_org_idx
  on public.crm_tasks (organization_id, created_at desc);
create index crm_tasks_contact_idx
  on public.crm_tasks (contact_id) where contact_id is not null;
create index crm_tasks_assigned_idx
  on public.crm_tasks (assigned_to) where assigned_to is not null;
create index crm_activities_org_occurred_idx
  on public.crm_activities (organization_id, occurred_at desc);
create index crm_activities_contact_idx
  on public.crm_activities (contact_id) where contact_id is not null;
create index crm_activities_actor_idx
  on public.crm_activities (actor_id) where actor_id is not null;
create index crm_email_threads_latest_idx
  on public.crm_email_threads (last_message_at desc);
create index crm_email_threads_org_idx
  on public.crm_email_threads (organization_id, last_message_at desc);
create index crm_email_threads_contact_idx
  on public.crm_email_threads (contact_id) where contact_id is not null;
create index crm_email_messages_thread_created_idx
  on public.crm_email_messages (thread_id, created_at);
create index crm_email_messages_folder_idx
  on public.crm_email_messages (folder, created_at desc);
create index crm_email_messages_org_idx
  on public.crm_email_messages (organization_id, created_at desc);
create index crm_email_messages_contact_idx
  on public.crm_email_messages (contact_id) where contact_id is not null;
create index crm_email_messages_actor_idx
  on public.crm_email_messages (actor_id) where actor_id is not null;
create index crm_email_events_provider_message_idx
  on public.crm_email_events (provider_message_id, occurred_at desc);
create index internal_audit_events_org_created_idx
  on public.internal_audit_events (organization_id, created_at desc);
create index internal_audit_events_actor_idx
  on public.internal_audit_events (actor_id) where actor_id is not null;
create index external_side_effects_actor_idx
  on public.external_side_effects (actor_id) where actor_id is not null;

alter table public.internal_staff_users enable row level security;
alter table public.crm_account_profiles enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_email_threads enable row level security;
alter table public.crm_email_messages enable row level security;
alter table public.crm_email_events enable row level security;
alter table public.internal_audit_events enable row level security;

revoke all on public.internal_staff_users, public.crm_account_profiles,
  public.crm_contacts, public.crm_tasks, public.crm_activities,
  public.crm_email_threads, public.crm_email_messages, public.crm_email_events,
  public.internal_audit_events from anon, authenticated;

grant all on public.internal_staff_users, public.crm_account_profiles,
  public.crm_contacts, public.crm_tasks, public.crm_activities,
  public.crm_email_threads, public.crm_email_messages, public.crm_email_events,
  public.internal_audit_events to service_role;

create policy "No browser access to internal staff"
  on public.internal_staff_users for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM account profiles"
  on public.crm_account_profiles for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM contacts"
  on public.crm_contacts for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM tasks"
  on public.crm_tasks for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM activities"
  on public.crm_activities for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM email threads"
  on public.crm_email_threads for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM email messages"
  on public.crm_email_messages for all to anon, authenticated using (false) with check (false);
create policy "No browser access to CRM email events"
  on public.crm_email_events for all to anon, authenticated using (false) with check (false);
create policy "No browser access to internal audit events"
  on public.internal_audit_events for all to anon, authenticated using (false) with check (false);

comment on table public.internal_staff_users is
  'Explicit allowlist for Costivra internal operators. Customer membership never grants this access.';
comment on table public.crm_account_profiles is
  'Internal lifecycle and follow-up fields layered onto authoritative customer organizations.';
comment on table public.crm_email_messages is
  'Server-only inbound, outbound, scheduled, and draft mailbox records backed by Resend.';
comment on table public.crm_email_events is
  'Idempotent, sanitized Resend delivery and receiving webhook event records.';
comment on table public.internal_audit_events is
  'Append-only internal operator audit trail; never exposed through browser database roles.';
