alter table public.crm_email_attachments
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists scan_started_at timestamptz,
  add column if not exists scanned_at timestamptz;

alter table public.crm_email_attachments
  drop constraint if exists crm_email_attachments_scan_status_check;

alter table public.crm_email_attachments
  add constraint crm_email_attachments_scan_status_check
  check (scan_status in ('pending', 'scanning', 'clean', 'infected', 'unavailable', 'failed'));

create index if not exists crm_email_attachments_document_idx
  on public.crm_email_attachments (document_id)
  where document_id is not null;
