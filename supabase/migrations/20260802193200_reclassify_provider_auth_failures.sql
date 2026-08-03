update public.document_extraction_versions
set failure_code = case
  when input_mode = 'pdf_ocr' then 'ocr_unavailable'
  else 'ai_unavailable'
end
where status = 'failed'
  and (
    lower(coalesce(error_message, '')) like '%authentication%'
    or lower(coalesce(error_message, '')) like '%unauthorized%'
    or lower(coalesce(error_message, '')) like '%invalid api key%'
  );
