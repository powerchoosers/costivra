-- Keep document processing and security state explicit. These enum additions are
-- forward-only so existing documents remain readable during deployment.
alter type public.document_status add value if not exists 'quarantined' after 'processing';
alter type public.document_status add value if not exists 'rejected' after 'quarantined';

alter table public.documents
  add column if not exists security_scan_status text not null default 'pending',
  add column if not exists security_scanned_at timestamptz,
  add column if not exists security_scan_safe_code text,
  add column if not exists security_scan_attempt_count integer not null default 0;

alter table public.documents
  drop constraint if exists documents_security_scan_status_check;

alter table public.documents
  add constraint documents_security_scan_status_check
  check (security_scan_status in ('pending', 'scanning', 'clean', 'infected', 'unavailable', 'failed'));

alter table public.documents
  add constraint documents_security_scan_attempt_count_check
  check (security_scan_attempt_count >= 0);

-- Existing clean ingestion events are safe provenance for the current snapshot.
-- This does not invent scan results for documents without a clean event.
with latest_clean_scan as (
  select distinct on (resource_id)
    resource_id as document_id,
    created_at
  from public.audit_events
  where resource_type = 'document'
    and action in (
      'document.uploaded_and_extracted',
      'document.quarantine_released_and_extracted',
      'document.inbound_attachment_processed'
    )
  order by resource_id, created_at desc
)
update public.documents as document
set
  security_scan_status = 'clean',
  security_scanned_at = latest_clean_scan.created_at,
  security_scan_safe_code = 'clean',
  security_scan_attempt_count = greatest(document.security_scan_attempt_count, 1)
from latest_clean_scan
where document.id = latest_clean_scan.document_id
  and document.security_scan_status = 'pending';

update public.documents
set
  security_scan_status = 'unavailable',
  security_scan_safe_code = 'quarantined'
where status::text = 'quarantined'
  and security_scan_status = 'pending';

create table if not exists public.document_security_scan_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  sha256 text not null check (char_length(sha256) = 64),
  source_type text not null check (source_type in ('manual_upload', 'email_forwarding', 'provider_integration', 'quarantine_rescan', 'duplicate_detection')),
  provider text not null default 'unavailable',
  status text not null check (status in ('pending', 'scanning', 'clean', 'infected', 'unavailable', 'failed')),
  safe_code text,
  provider_http_status integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create index if not exists document_security_scan_attempts_document_idx
  on public.document_security_scan_attempts (organization_id, document_id, created_at desc);

comment on table public.document_security_scan_attempts is
  'Append-only server-owned malware scan provenance. Raw provider responses, file bytes, and source text are intentionally excluded.';

create or replace function public.apply_document_security_scan_attempt()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.documents
  set
    security_scan_status = new.status,
    security_scanned_at = coalesce(new.completed_at, now()),
    security_scan_safe_code = new.safe_code,
    security_scan_attempt_count = security_scan_attempt_count + 1,
    updated_at = now()
  where id = new.document_id
    and organization_id = new.organization_id;
  return new;
end;
$$;

drop trigger if exists document_security_scan_attempt_snapshot
  on public.document_security_scan_attempts;

create trigger document_security_scan_attempt_snapshot
after insert on public.document_security_scan_attempts
for each row execute function public.apply_document_security_scan_attempt();

alter table public.document_security_scan_attempts enable row level security;
revoke all on public.document_security_scan_attempts from anon, authenticated;
grant select, insert on public.document_security_scan_attempts to service_role;
revoke update, delete on public.document_security_scan_attempts from service_role;
revoke all on function public.apply_document_security_scan_attempt() from public, anon, authenticated;
