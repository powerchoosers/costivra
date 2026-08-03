update public.document_extraction_versions
set
  input_mode = case
    when provider = 'openrouter-pdf-ocr' then 'pdf_ocr'
    else 'native_text'
  end,
  failure_code = case
    when lower(coalesce(error_message, '')) like '%no readable text%' then 'no_readable_text'
    when lower(coalesce(error_message, '')) like '%malformed structured data%'
      or lower(coalesce(error_message, '')) like '%invalid document analysis%'
      or lower(coalesce(error_message, '')) like '%incomplete document analysis%'
      then 'invalid_ai_output'
    when provider = 'openrouter-pdf-ocr' then 'ocr_unavailable'
    else 'extraction_failed'
  end
where status = 'failed'
  and (input_mode is null or failure_code is null);
