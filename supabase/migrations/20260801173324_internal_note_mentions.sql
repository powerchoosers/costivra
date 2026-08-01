alter table public.internal_notifications
  add column if not exists recipient_user_id uuid
    references public.internal_staff_users(user_id) on delete cascade;

alter table public.internal_notifications
  drop constraint if exists internal_notifications_kind_check;

alter table public.internal_notifications
  add constraint internal_notifications_kind_check
  check (kind in ('new_inquiry', 'note_mention'));

create index if not exists internal_notifications_recipient_created_idx
  on public.internal_notifications (recipient_user_id, created_at desc)
  where recipient_user_id is not null;

create table public.crm_activity_mentions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.crm_activities(id) on delete cascade,
  mentioned_user_id uuid not null references public.internal_staff_users(user_id) on delete cascade,
  mentioned_by uuid references public.internal_staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (activity_id, mentioned_user_id)
);

create index crm_activity_mentions_recipient_created_idx
  on public.crm_activity_mentions (mentioned_user_id, created_at desc);

alter table public.crm_activity_mentions enable row level security;
revoke all on public.crm_activity_mentions from anon, authenticated;
grant all on public.crm_activity_mentions to service_role;

create policy "No browser access to CRM activity mentions"
  on public.crm_activity_mentions for all to anon, authenticated
  using (false) with check (false);

comment on table public.crm_activity_mentions is
  'Server-only, auditable internal CRM note mentions. Each mention may create one attributed transactional notification and email.';
