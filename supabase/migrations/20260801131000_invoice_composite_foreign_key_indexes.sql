create index if not exists invoice_line_items_invoice_org_fk_idx
  on public.invoice_line_items (invoice_id, organization_id);

create index if not exists invoice_corrections_invoice_org_fk_idx
  on public.invoice_field_corrections (invoice_id, organization_id);
