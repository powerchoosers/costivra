create index if not exists billing_plan_catalog_updated_by_idx
  on public.billing_plan_catalog (updated_by)
  where updated_by is not null;
