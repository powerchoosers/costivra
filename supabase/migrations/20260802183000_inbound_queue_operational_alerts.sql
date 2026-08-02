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
    'email_delivery_failed',
    'intake_failure'
  ));

comment on column public.internal_notifications.provider_event_id is
  'Stable provider or operational incident key used with recipient_user_id to prevent duplicate alerts.';
