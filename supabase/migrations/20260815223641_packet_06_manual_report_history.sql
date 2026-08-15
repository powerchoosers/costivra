-- Packet 06: make manual "Email now" report sends visible in delivery history.
-- Scheduled runs retain their existing schedule/period uniqueness. Manual runs
-- use a stable delivery key so repeated clicks cannot create duplicate history.

alter table public.report_delivery_runs
  add column if not exists delivery_key text;

alter table public.report_delivery_runs
  drop constraint if exists report_delivery_runs_delivery_key_key;

alter table public.report_delivery_runs
  add constraint report_delivery_runs_delivery_key_key unique (delivery_key);

comment on column public.report_delivery_runs.delivery_key is
  'Stable idempotency key for manual or scheduled report delivery history.';
