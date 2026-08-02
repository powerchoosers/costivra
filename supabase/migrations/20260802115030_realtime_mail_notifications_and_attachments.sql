alter table public.profiles
  add column if not exists notification_sound_enabled boolean not null default true;

alter table public.internal_notifications
  add column if not exists provider_event_id text;

alter table public.internal_notifications
  drop constraint if exists internal_notifications_kind_check;

alter table public.internal_notifications
  add constraint internal_notifications_kind_check
  check (kind in (
    'new_inquiry',
    'note_mention',
    'email_received',
    'email_opened',
    'email_clicked',
    'email_delivery_failed'
  ));

create unique index if not exists internal_notifications_provider_recipient_key
  on public.internal_notifications (provider_event_id, recipient_user_id)
  where provider_event_id is not null and recipient_user_id is not null;

drop policy if exists "No browser access to internal notifications"
  on public.internal_notifications;

grant select on public.internal_notifications to authenticated;

create policy "Internal staff read own realtime notifications"
  on public.internal_notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'internal_notifications'
  ) then
    alter publication supabase_realtime add table public.internal_notifications;
  end if;
end
$$;

create table if not exists public.crm_email_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.crm_email_messages(id) on delete cascade,
  mailbox_id uuid not null references public.crm_mailboxes(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  provider_attachment_id text not null unique,
  filename text not null,
  content_type text not null,
  content_disposition text not null default 'attachment'
    check (content_disposition in ('inline', 'attachment')),
  content_id text,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text,
  scan_status text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'infected', 'unavailable', 'failed')),
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_email_attachments_message_idx
  on public.crm_email_attachments (message_id, created_at);
create index if not exists crm_email_attachments_mailbox_idx
  on public.crm_email_attachments (mailbox_id, created_at desc);
create index if not exists crm_email_attachments_organization_idx
  on public.crm_email_attachments (organization_id)
  where organization_id is not null;

alter table public.crm_email_attachments enable row level security;
revoke all on public.crm_email_attachments from anon, authenticated;
grant all on public.crm_email_attachments to service_role;

create policy "No browser access to CRM email attachments"
  on public.crm_email_attachments for all to anon, authenticated
  using (false) with check (false);

insert into storage.buckets (id, name, public, file_size_limit)
values ('costivra-mail-attachments', 'costivra-mail-attachments', false, 20971520)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

comment on table public.crm_email_attachments is
  'Private, scan-gated files received by Costivra owner mailboxes. Downloads require server-side mailbox authorization.';
comment on column public.profiles.notification_sound_enabled is
  'Operator preference for audible in-app notifications. Visual notifications remain enabled.';
