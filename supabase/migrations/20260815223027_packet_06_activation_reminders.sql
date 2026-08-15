-- Packet 06: bounded, durable activation reminders.
-- The onboarding projection remains a service-operated table. Reminder state
-- is only a delivery throttle; activation itself remains derived from source
-- records.

alter table public.organization_onboarding
  add column if not exists activation_reminder_last_sent_at timestamptz,
  add column if not exists activation_reminder_count integer not null default 0;

alter table public.organization_onboarding
  drop constraint if exists organization_onboarding_activation_reminder_count_check;

alter table public.organization_onboarding
  add constraint organization_onboarding_activation_reminder_count_check
  check (activation_reminder_count between 0 and 3);

create index if not exists organization_onboarding_activation_reminder_idx
  on public.organization_onboarding (status, activation_reminder_last_sent_at, activation_reminder_count, created_at);
