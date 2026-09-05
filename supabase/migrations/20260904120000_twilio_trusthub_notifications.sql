alter table public.internal_notifications
  drop constraint if exists internal_notifications_kind_check;

alter table public.internal_notifications
  add constraint internal_notifications_kind_check check (kind in ('new_inquiry', 'twilio_trusthub_status'));
