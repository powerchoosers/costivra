create index if not exists invoice_energy_meters_invoice_org_fk_idx
  on public.invoice_energy_meters (invoice_id, organization_id);

create index if not exists invoice_energy_meters_meter_org_fk_idx
  on public.invoice_energy_meters (energy_meter_id, organization_id);
