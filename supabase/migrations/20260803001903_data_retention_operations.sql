-- Retention is intentionally server-operated. Customer browsers may see whether
-- an original source is still available, but they cannot change holds, purge
-- files, or inspect global retention runs.

alter table public.documents
  add column if not exists source_purged_at timestamptz,
  add column if not exists retention_hold_until timestamptz;

alter table public.inbound_email_attachments
  add column if not exists quarantine_purged_at timestamptz,
  add column if not exists retention_hold_until timestamptz;

create index if not exists documents_retention_candidates_idx
  on public.documents (created_at, id)
  where source_purged_at is null;

create index if not exists inbound_email_attachments_retention_candidates_idx
  on public.inbound_email_attachments (created_at, id)
  where quarantine_storage_path is not null
    and quarantine_purged_at is null;

create table if not exists public.retention_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('report', 'enforce')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  policy jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '{}'::jsonb,
  purged jsonb not null default '{}'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists retention_runs_started_at_idx
  on public.retention_runs (started_at desc);

alter table public.retention_runs enable row level security;
revoke all privileges on table public.retention_runs from anon, authenticated;
grant select, insert, update, delete on table public.retention_runs to service_role;

comment on table public.retention_runs is
  'Server-only audit ledger for report and enforcement passes over private retained data.';
comment on column public.documents.source_purged_at is
  'When set, the immutable metadata and extracted evidence remain but the private original was removed through the Storage API.';
comment on column public.documents.retention_hold_until is
  'Optional legal or operational hold that prevents automated source-file purging until this instant.';
