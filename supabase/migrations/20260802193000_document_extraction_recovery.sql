alter table public.document_extraction_versions
  add column if not exists input_mode text,
  add column if not exists failure_code text;

alter table public.document_extraction_versions
  drop constraint if exists document_extraction_versions_input_mode_check,
  add constraint document_extraction_versions_input_mode_check
    check (input_mode is null or input_mode in ('native_text', 'pdf_ocr')),
  drop constraint if exists document_extraction_versions_failure_code_check,
  add constraint document_extraction_versions_failure_code_check
    check (failure_code is null or failure_code in (
      'no_readable_text',
      'ocr_unavailable',
      'ai_unavailable',
      'invalid_ai_output',
      'extraction_failed'
    ));

create index if not exists document_extraction_recovery_queue_idx
  on public.document_extraction_versions (status, created_at desc)
  where status = 'failed';

comment on column public.document_extraction_versions.input_mode is
  'Whether the extraction used native text or the PDF OCR path.';
comment on column public.document_extraction_versions.failure_code is
  'Stable, non-secret failure category used by recovery workflows.';
