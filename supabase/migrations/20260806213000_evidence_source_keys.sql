-- Preserve the stable local key emitted with an extracted line item. This is
-- provenance metadata only; field_path remains the human-readable evidence
-- contract used by existing records and opportunity links.
alter table public.evidence_references
  add column if not exists source_key text;

create index if not exists evidence_references_document_source_key_idx
  on public.evidence_references (document_id, source_key)
  where source_key is not null;

comment on column public.evidence_references.source_key is
  'Stable local key from the extraction output, such as line-1; not a tenant or external identifier.';
