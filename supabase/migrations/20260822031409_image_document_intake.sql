alter table public.document_extraction_versions
  drop constraint if exists document_extraction_versions_input_mode_check;

alter table public.document_extraction_versions
  add constraint document_extraction_versions_input_mode_check
  check (input_mode is null or input_mode in ('native_text', 'pdf_ocr', 'image_vision'));
