create table public.crm_mailboxes (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (
    char_length(btrim(display_name)) between 1 and 100
    and display_name !~ E'[\\r\\n]'
  ),
  local_part text not null check (
    local_part = lower(local_part)
    and char_length(local_part) between 1 and 64
    and local_part ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
  ),
  domain text not null default 'costivra.ai' check (domain = 'costivra.ai'),
  address text generated always as (local_part || '@' || domain) stored,
  mailbox_type text not null default 'personal'
    check (mailbox_type in ('personal', 'shared')),
  assigned_to uuid references public.internal_staff_users(user_id) on delete set null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  can_send boolean not null default true,
  can_receive boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references public.internal_staff_users(user_id) on delete set null,
  updated_by uuid references public.internal_staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index crm_mailboxes_address_key
  on public.crm_mailboxes (lower(address));
create unique index crm_mailboxes_one_default_key
  on public.crm_mailboxes (is_default) where is_default;
create index crm_mailboxes_assigned_idx
  on public.crm_mailboxes (assigned_to) where assigned_to is not null;
create index crm_mailboxes_active_idx
  on public.crm_mailboxes (status, can_receive, can_send);

alter table public.crm_email_threads
  add column mailbox_id uuid references public.crm_mailboxes(id) on delete set null;
alter table public.crm_email_messages
  add column mailbox_id uuid references public.crm_mailboxes(id) on delete set null;
alter table public.external_side_effects
  add column mailbox_id uuid references public.crm_mailboxes(id) on delete set null;

create index crm_email_threads_mailbox_idx
  on public.crm_email_threads (mailbox_id, last_message_at desc);
create index crm_email_messages_mailbox_idx
  on public.crm_email_messages (mailbox_id, created_at desc);
create index external_side_effects_mailbox_idx
  on public.external_side_effects (mailbox_id) where mailbox_id is not null;

alter table public.crm_mailboxes enable row level security;
revoke all on public.crm_mailboxes from anon, authenticated;
grant all on public.crm_mailboxes to service_role;

create policy "No browser access to CRM mailboxes"
  on public.crm_mailboxes for all to anon, authenticated
  using (false) with check (false);

insert into public.crm_mailboxes (
  display_name,
  local_part,
  domain,
  mailbox_type,
  status,
  can_send,
  can_receive,
  is_default
)
values (
  'Lewis Patterson',
  'l.patterson',
  'costivra.ai',
  'personal',
  'active',
  true,
  true,
  true
)
on conflict ((lower(address))) do nothing;

comment on table public.crm_mailboxes is
  'Server-only Costivra mailbox allowlist. Resend accepts domain-wide addresses; only active rows are routed or allowed to send.';
comment on column public.crm_mailboxes.assigned_to is
  'Optional internal operator assignment. Owners can administer all seats; operators may use assigned and shared seats.';
