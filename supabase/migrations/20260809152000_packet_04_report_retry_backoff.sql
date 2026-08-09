-- Packet 04: bound scheduled-report retries so provider failures do not
-- cause an email storm on every cron invocation.

alter table public.report_delivery_runs
  add column if not exists attempt_count integer not null default 1,
  add column if not exists next_retry_at timestamptz;

alter table public.report_delivery_runs
  drop constraint if exists report_delivery_runs_attempt_count_check;

alter table public.report_delivery_runs
  add constraint report_delivery_runs_attempt_count_check
  check (attempt_count between 1 and 4);

create index if not exists report_delivery_runs_retry_idx
  on public.report_delivery_runs (next_retry_at)
  where status = 'failed' and next_retry_at is not null;
